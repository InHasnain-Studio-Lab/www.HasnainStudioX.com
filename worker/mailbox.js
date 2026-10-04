/* The mailbox behind HSX Control Center.
 *
 * Cloudflare Email Routing hands every message addressed to the studio to this
 * worker. The worker stores it in D1 and forwards it on, so the Outlook copy
 * keeps arriving exactly as before and nothing depends on this code to receive
 * mail. Replies go out through Resend carrying the threading headers, which is
 * what puts them back in the reader's own conversation rather than starting a
 * new one. Everything sent is kept as a sent copy beside what was received.
 *
 * Reading and sending are for the studio only. Every request carries a key that
 * exists nowhere on the public site, and none of these paths allow an origin.
 */

import PostalMime from 'postal-mime';

const MAX_TEXT = 200000;
const MAX_HTML = 500000;
const PREVIEW = 180;
const PAGE = 50;
const MAX_RECIPIENTS = 50;
const STUDIO = 'contact@hasnainstudiox.com';

const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const trim = (value, limit) => (value ? String(value).slice(0, limit) : '');

/* Timing safe: a key checked with === leaks its length and its prefix through
   how long the comparison takes. */
function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const EMAIL = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

/* "a@x.com, Name <b@y.com>; c@z.com" or an array of the same, as bare addresses */
function addresses(value) {
  const parts = Array.isArray(value) ? value : String(value || '').split(/[,;\n]/);
  const out = [];
  for (const part of parts) {
    const raw = String(part || '').trim();
    if (!raw) continue;
    const angled = /<([^>]+)>/.exec(raw);
    const addr = (angled ? angled[1] : raw).trim().toLowerCase();
    if (EMAIL.test(addr) && !out.includes(addr)) out.push(addr);
  }
  return out;
}

function invalid(value) {
  const parts = Array.isArray(value) ? value : String(value || '').split(/[,;\n]/);
  return parts.map(p => String(p || '').trim()).filter(Boolean)
    .filter(p => !EMAIL.test(((/<([^>]+)>/.exec(p) || [])[1] || p).trim()));
}

/* the subject a conversation is known by, without its Re: and Fwd: prefixes */
function topicOf(subject) {
  let t = String(subject || '').trim().toLowerCase();
  for (let i = 0; i < 5; i++) {
    const next = t.replace(/^(re|fw|fwd|aw|sv|antw)\s*(\[\d+\])?\s*:\s*/i, '');
    if (next === t) break;
    t = next;
  }
  return t.slice(0, 400);
}

const studioAddress = env =>
  ((/<([^>]+)>/.exec(env.REPLY_FROM || '') || [])[1] || env.MAIL_TO || STUDIO).toLowerCase();

/* Which conversation a message belongs to: the one holding the message it
   answers, then a recent one with the same subject and the same other person,
   then a new one of its own. */
async function threadFor(db, { inReplyTo, refs, topic, counterpart }) {
  const ids = [inReplyTo, ...String(refs || '').split(/\s+/)].map(s => String(s || '').trim()).filter(Boolean).slice(0, 40);
  if (ids.length) {
    const hit = await db.prepare(
      'SELECT thread FROM messages WHERE thread IS NOT NULL AND message_id IN (' + ids.map(() => '?').join(',') + ') LIMIT 1'
    ).bind(...ids).first();
    if (hit && hit.thread) return hit.thread;
  }
  if (topic && counterpart) {
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const hit = await db.prepare(
      "SELECT thread FROM messages WHERE thread IS NOT NULL AND state <> 'draft' AND topic = ? " +
      'AND (sender = ? OR instr(lower(recipient), ?) > 0) AND received_at > ? ORDER BY received_at DESC LIMIT 1'
    ).bind(topic, counterpart, counterpart, since).first();
    if (hit && hit.thread) return hit.thread;
  }
  return null;
}

export async function receive(message, env) {
  try {
    if (env.MAIL) await store(message, env);
  } catch (e) {
    /* storage is the copy, not the delivery: a failure here must never cost
       the message, so it is logged and the forward still runs */
    console.log('mailbox store failed', e && e.message);
  }

  const onward = env.MAIL_FALLBACK;
  if (!onward) return;

  try {
    await message.forward(onward);
  } catch (e) {
    console.log('mailbox forward failed', e && e.message);
  }
}

async function store(message, env) {
  const parsed = await PostalMime.parse(message.raw);
  const headers = message.headers;
  const db = env.MAIL;

  const files = (parsed.attachments || [])
    .map(a => ({ name: a.filename || 'attachment', type: a.mimeType || '', bytes: (a.content || {}).byteLength || 0 }));

  const id = crypto.randomUUID();
  const subject = trim(parsed.subject, 400) || '(no subject)';
  const sender = trim(message.from, 320).toLowerCase();
  const topic = topicOf(subject);
  const cc = (parsed.cc || []).map(a => a.address).filter(Boolean).join(', ');

  const thread = await threadFor(db, {
    inReplyTo: headers.get('In-Reply-To'),
    refs: headers.get('References'),
    topic,
    counterpart: sender,
  }).catch(() => null) || id;

  await db.prepare(
    'INSERT INTO messages (id, message_id, in_reply_to, refs, sender, sender_name, recipient, cc, ' +
    'subject, body_text, body_html, files, received_at, state, unread, replied, flagged, thread, topic) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id,
    trim(headers.get('Message-ID'), 400),
    trim(headers.get('In-Reply-To'), 400),
    trim(headers.get('References'), 2000),
    sender,
    trim((parsed.from || {}).name, 200),
    trim(message.to, 320),
    trim(cc, 2000),
    subject,
    trim(parsed.text, MAX_TEXT),
    trim(parsed.html, MAX_HTML),
    JSON.stringify(files),
    new Date().toISOString(),
    'inbox',
    1,
    0,
    0,
    thread,
    topic,
  ).run();
}

/* Resend takes base64 file content. Anything unnamed, oversized or beyond ten
   files is dropped rather than failing the whole send. */
function files(list) {
  if (!Array.isArray(list) || !list.length) return undefined;
  const out = [];
  let total = 0;
  for (const f of list.slice(0, 10)) {
    if (!f || typeof f.filename !== 'string' || typeof f.content !== 'string') continue;
    total += Math.ceil(f.content.length * 0.75);
    if (total > 15 * 1024 * 1024) break;
    out.push({ filename: f.filename.slice(0, 160), content: f.content });
  }
  return out.length ? out : undefined;
}

/* what the sent copy records of the attachments: names and sizes, never bytes */
const fileNotes = list => (files(list) || [])
  .map(f => ({ name: f.filename, type: '', bytes: Math.ceil(f.content.length * 0.75) }));

async function send(env, { to, cc, bcc, subject, html, text, inReplyTo, references, attachments }) {
  const headers = {};
  if (inReplyTo) headers['In-Reply-To'] = inReplyTo;
  if (references) headers['References'] = references;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.REPLY_FROM || 'Hasnain Studio X <contact@hasnainstudiox.com>',
      to,
      cc: cc && cc.length ? cc : undefined,
      bcc: bcc && bcc.length ? bcc : undefined,
      reply_to: env.MAIL_TO || STUDIO,
      subject,
      html,
      text,
      headers: Object.keys(headers).length ? headers : undefined,
      attachments: files(attachments),
    }),
  });

  if (res.ok) {
    const done = await res.json().catch(() => ({}));
    return { ok: true, resendId: (done && done.id) || '' };
  }

  /* the provider's own words, because "it did not send" has cost enough time */
  const detail = await res.text();
  console.log('reply send failed', res.status, detail);
  let reason = 'Resend refused the message';
  try {
    const parsed = JSON.parse(detail);
    if (parsed && parsed.message) reason = parsed.message;
  } catch (e) {
    /* not JSON, keep the plain reason */
  }
  return { ok: false, error: reason };
}

/* the sent copy, filed in the same conversation as what it answers */
async function keepSent(db, env, { to, cc, bcc, subject, html, text, attachments, inReplyTo, refs, thread, resendId }) {
  const id = crypto.randomUUID();
  const topic = topicOf(subject);
  const key = thread || await threadFor(db, { inReplyTo, refs, topic, counterpart: to[0] }).catch(() => null) || id;

  await db.prepare(
    'INSERT INTO messages (id, message_id, in_reply_to, refs, sender, sender_name, recipient, cc, bcc, ' +
    'subject, body_text, body_html, files, received_at, state, unread, replied, flagged, thread, topic, resend_id) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, '', trim(inReplyTo, 400), trim(refs, 2000),
    studioAddress(env), 'Hasnain Studio X',
    trim(to.join(', '), 2000), trim((cc || []).join(', '), 2000), trim((bcc || []).join(', '), 2000),
    trim(subject, 400) || '(no subject)', trim(text, MAX_TEXT), trim(html, MAX_HTML),
    JSON.stringify(fileNotes(attachments)), new Date().toISOString(),
    'sent', 0, 0, 0, key, topic, trim(resendId, 120),
  ).run();
  return id;
}

/* recipients for a send: at least one To, every address valid, a sane total */
function recipients(body) {
  const bad = [...invalid(body.to), ...invalid(body.cc), ...invalid(body.bcc)];
  if (bad.length) return { error: 'Not an email address: ' + bad.slice(0, 3).join(', ') };
  const to = addresses(body.to);
  const cc = addresses(body.cc).filter(a => !to.includes(a));
  const bcc = addresses(body.bcc).filter(a => !to.includes(a) && !cc.includes(a));
  if (!to.length) return { error: 'No recipient.' };
  if (to.length + cc.length + bcc.length > MAX_RECIPIENTS) return { error: 'Too many recipients, ' + MAX_RECIPIENTS + ' at most.' };
  return { to, cc, bcc };
}

const LIST_FIELDS =
  'id, sender, sender_name, recipient, cc, subject, received_at, state, unread, replied, flagged, files, thread, ' +
  "substr(replace(replace(coalesce(nullif(body_text, ''), body_html), char(10), ' '), char(13), ' '), 1, 180) AS preview";

export async function handleMail(request, env, url) {
  if (!env.MAILBOX_KEY) {
    console.log('MAILBOX_KEY is not set on this worker');
    return reply({ ok: false, error: 'Not configured.' }, 500);
  }
  if (!same(request.headers.get('X-HSX-Key') || '', env.MAILBOX_KEY)) {
    return reply({ ok: false, error: 'Not allowed.' }, 401);
  }
  if (!env.MAIL) {
    console.log('MAIL binding missing');
    return reply({ ok: false, error: 'Not configured.' }, 500);
  }

  const db = env.MAIL;
  const path = url.pathname;

  /* folders: inbox, archived, sent, draft, flagged, all (everything but drafts).
     q searches who, subject and words; before pages back from a received_at. */
  if (path === '/mail/list' && request.method === 'GET') {
    const state = url.searchParams.get('state') || 'inbox';
    const limit = Math.min(Number(url.searchParams.get('limit')) || PAGE, 200);
    const q = (url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 120);
    const before = (url.searchParams.get('before') || '').trim();

    const where = [];
    const args = [];
    if (state === 'flagged') where.push("flagged = 1 AND state <> 'draft'");
    else if (state === 'all') where.push("state <> 'draft'");
    else { where.push('state = ?'); args.push(['inbox', 'archived', 'sent', 'draft'].includes(state) ? state : 'inbox'); }

    if (q) {
      where.push("(instr(lower(sender), ?) > 0 OR instr(lower(coalesce(sender_name, '')), ?) > 0 OR " +
        "instr(lower(coalesce(recipient, '')), ?) > 0 OR instr(lower(subject), ?) > 0 OR " +
        "instr(lower(coalesce(body_text, '')), ?) > 0)");
      args.push(q, q, q, q, q);
    }
    if (before) { where.push('received_at < ?'); args.push(before); }

    const rows = await db.prepare(
      'SELECT ' + LIST_FIELDS + ', (SELECT COUNT(*) FROM messages t WHERE t.thread = messages.thread AND t.state <> \'draft\') AS thread_count ' +
      'FROM messages WHERE ' + where.join(' AND ') + ' ORDER BY received_at DESC LIMIT ?'
    ).bind(...args, limit + 1).all();

    const list = rows.results || [];
    const more = list.length > limit;
    const unread = await db.prepare("SELECT COUNT(*) AS n FROM messages WHERE state = 'inbox' AND unread = 1").first();

    return reply({ ok: true, unread: (unread || {}).n || 0, more, messages: more ? list.slice(0, limit) : list });
  }

  if (path === '/mail/message' && request.method === 'GET') {
    const id = url.searchParams.get('id') || '';
    const row = id && await db.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();
    if (!row) return reply({ ok: false, error: 'No such message.' }, 404);

    if (row.unread) await db.prepare('UPDATE messages SET unread = 0 WHERE id = ?').bind(id).run();
    return reply({ ok: true, message: { ...row, unread: 0 } });
  }

  /* every message in a conversation, oldest first */
  if (path === '/mail/thread' && request.method === 'GET') {
    const id = url.searchParams.get('id') || '';
    const row = id && await db.prepare('SELECT thread FROM messages WHERE id = ?').bind(id).first();
    if (!row) return reply({ ok: false, error: 'No such message.' }, 404);

    const rows = await db.prepare(
      'SELECT ' + LIST_FIELDS + " FROM messages WHERE thread = ? AND state <> 'draft' ORDER BY received_at ASC LIMIT 100"
    ).bind(row.thread || id).all();
    return reply({ ok: true, messages: rows.results || [] });
  }

  /* move, mark read or unread, flag or unflag: one message or many */
  if (path === '/mail/state' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const ids = [...new Set([].concat(body.ids || [], body.id || []).map(String))].filter(Boolean).slice(0, 200);
    if (!ids.length) return reply({ ok: false, error: 'No message given.' }, 400);

    const sets = [];
    const args = [];
    if (body.state === 'archived' || body.state === 'inbox') {
      /* only received mail moves; a sent copy or a draft keeps its folder */
      sets.push("state = CASE WHEN state IN ('inbox', 'archived') THEN ? ELSE state END");
      args.push(body.state);
    }
    if (body.unread === true || body.unread === false) { sets.push('unread = ?'); args.push(body.unread ? 1 : 0); }
    if (body.flagged === true || body.flagged === false) { sets.push('flagged = ?'); args.push(body.flagged ? 1 : 0); }
    if (!sets.length) return reply({ ok: false, error: 'Nothing to change.' }, 400);

    await db.prepare('UPDATE messages SET ' + sets.join(', ') + ' WHERE id IN (' + ids.map(() => '?').join(',') + ')')
      .bind(...args, ...ids).run();
    return reply({ ok: true, state: body.state || null });
  }

  /* the row is the only copy this service keeps, so deleting it is final.
     conversation: true takes every message in the same conversations, sent
     copies included. */
  if (path === '/mail/delete' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const ids = [...new Set([].concat(body.ids || [], body.id || []).map(String))].filter(Boolean).slice(0, 200);
    if (!ids.length) return reply({ ok: false, error: 'No message given.' }, 400);

    const marks = ids.map(() => '?').join(',');
    const result = body.conversation === true
      ? await db.prepare(
          'DELETE FROM messages WHERE id IN (' + marks + ') OR thread IN (SELECT thread FROM messages WHERE id IN (' + marks + ') AND thread IS NOT NULL)'
        ).bind(...ids, ...ids).run()
      : await db.prepare('DELETE FROM messages WHERE id IN (' + marks + ')').bind(...ids).run();
    return reply({ ok: true, deleted: (result.meta && result.meta.changes) || 0 });
  }

  /* a reply goes to the sender; Reply all passes everyone else as Cc */
  if (path === '/mail/reply' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const row = body.id && await db.prepare('SELECT * FROM messages WHERE id = ?').bind(body.id).first();
    if (!row) return reply({ ok: false, error: 'No such message.' }, 404);
    if (!body.html || !body.text) return reply({ ok: false, error: 'The reply was empty.' }, 400);

    const people = recipients({ to: body.to || row.sender, cc: body.cc, bcc: body.bcc });
    if (people.error) return reply({ ok: false, error: people.error }, 400);

    /* References carries the whole chain, oldest first, so every client can
       rebuild the thread even when it never saw the middle of it */
    const chain = [row.refs, row.message_id].filter(Boolean).join(' ').trim();
    const subject = body.subject || ('Re: ' + row.subject);

    const sent = await send(env, {
      ...people, subject, html: body.html, text: body.text,
      inReplyTo: row.message_id || undefined, references: chain || undefined, attachments: body.attachments,
    });
    if (!sent.ok) return reply(sent, 502);

    await db.prepare('UPDATE messages SET replied = 1, unread = 0 WHERE id = ?').bind(body.id).run();
    const sentId = await keepSent(db, env, {
      ...people, subject, html: body.html, text: body.text, attachments: body.attachments,
      inReplyTo: row.message_id, refs: chain, thread: row.thread || row.id, resendId: sent.resendId,
    }).catch(e => { console.log('sent copy failed', e && e.message); return null; });
    if (body.draft) await db.prepare("DELETE FROM messages WHERE id = ? AND state = 'draft'").bind(String(body.draft)).run();

    return reply({ ok: true, sent: sentId });
  }

  /* a new message, or a forward when `of` names the message it carries on */
  if (path === '/mail/send' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    if (!body.html || !body.text) return reply({ ok: false, error: 'The message was empty.' }, 400);

    const people = recipients(body);
    if (people.error) return reply({ ok: false, error: people.error }, 400);

    const of = body.of && await db.prepare('SELECT id, thread FROM messages WHERE id = ?').bind(String(body.of)).first();
    const subject = body.subject || 'Hasnain Studio X';

    const sent = await send(env, { ...people, subject, html: body.html, text: body.text, attachments: body.attachments });
    if (!sent.ok) return reply(sent, 502);

    const sentId = await keepSent(db, env, {
      ...people, subject, html: body.html, text: body.text, attachments: body.attachments,
      thread: of ? (of.thread || of.id) : null, resendId: sent.resendId,
    }).catch(e => { console.log('sent copy failed', e && e.message); return null; });
    if (body.draft) await db.prepare("DELETE FROM messages WHERE id = ? AND state = 'draft'").bind(String(body.draft)).run();

    return reply({ ok: true, sent: sentId });
  }

  /* a draft: created without an id, saved over with one. Nothing is sent. */
  if (path === '/mail/draft' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const fields = [
      trim(addresses(body.to).join(', ') || String(body.to || ''), 2000),
      trim(String(body.cc || ''), 2000),
      trim(String(body.bcc || ''), 2000),
      trim(body.subject, 400) || '(no subject)',
      trim(body.text, MAX_TEXT),
      trim(body.html, MAX_HTML),
      trim(typeof body.meta === 'string' ? body.meta : JSON.stringify(body.meta || {}), MAX_HTML),
      new Date().toISOString(),
    ];

    const existing = body.id && await db.prepare("SELECT id FROM messages WHERE id = ? AND state = 'draft'").bind(String(body.id)).first();
    if (existing) {
      await db.prepare(
        'UPDATE messages SET recipient = ?, cc = ?, bcc = ?, subject = ?, body_text = ?, body_html = ?, draft = ?, received_at = ? WHERE id = ?'
      ).bind(...fields, existing.id).run();
      return reply({ ok: true, id: existing.id });
    }

    const id = crypto.randomUUID();
    await db.prepare(
      'INSERT INTO messages (id, message_id, sender, sender_name, recipient, cc, bcc, subject, body_text, body_html, ' +
      "draft, received_at, files, state, unread, replied, flagged, thread, topic) VALUES (?, '', ?, 'Hasnain Studio X', ?, ?, ?, ?, ?, ?, ?, ?, '[]', 'draft', 0, 0, 0, ?, ?)"
    ).bind(id, studioAddress(env), ...fields, id, topicOf(fields[3])).run();
    return reply({ ok: true, id });
  }

  if (path === '/mail/health' && request.method === 'GET') {
    const counts = await db.prepare(
      'SELECT COUNT(*) AS total, ' +
      "SUM(CASE WHEN state = 'inbox' THEN 1 ELSE 0 END) AS inbox, " +
      "SUM(CASE WHEN unread = 1 AND state = 'inbox' THEN 1 ELSE 0 END) AS unread, " +
      "SUM(CASE WHEN state = 'sent' THEN 1 ELSE 0 END) AS sent, " +
      "SUM(CASE WHEN state = 'draft' THEN 1 ELSE 0 END) AS drafts, " +
      "MAX(CASE WHEN state = 'inbox' THEN received_at END) AS newest FROM messages"
    ).first();

    return reply({
      ok: true,
      service: 'hsx-mailbox',
      sender: env.REPLY_FROM || 'Hasnain Studio X <contact@hasnainstudiox.com>',
      total: (counts || {}).total || 0,
      inbox: (counts || {}).inbox || 0,
      unread: (counts || {}).unread || 0,
      sent: (counts || {}).sent || 0,
      drafts: (counts || {}).drafts || 0,
      newest: (counts || {}).newest || null,
    });
  }

  return null;
}
