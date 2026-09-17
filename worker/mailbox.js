/* The mailbox behind HSX Control Center.
 *
 * Cloudflare Email Routing hands every message addressed to the studio to this
 * worker. The worker stores it in D1 and forwards it on, so the Outlook copy
 * keeps arriving exactly as before and nothing depends on this code to receive
 * mail. Replies go out through Resend carrying the threading headers, which is
 * what puts them back in the reader's own conversation rather than starting a
 * new one.
 *
 * Reading and sending are for the studio only. Every request carries a key that
 * exists nowhere on the public site, and none of these paths allow an origin.
 */

import PostalMime from 'postal-mime';

const MAX_TEXT = 200000;
const MAX_HTML = 500000;
const PREVIEW = 180;
const PAGE = 50;

const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const trim = (value, limit) => (value ? String(value).slice(0, limit) : '');

const address = list => (Array.isArray(list) ? list : list ? [list] : [])
  .map(a => a.address).filter(Boolean).join(', ');

/* Timing safe: a key checked with === leaks its length and its prefix through
   how long the comparison takes. */
function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function preview(text, html) {
  const source = text || String(html || '').replace(/<[^>]+>/g, ' ');
  return source.replace(/\s+/g, ' ').trim().slice(0, PREVIEW);
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

  const files = (parsed.attachments || [])
    .map(a => ({ name: a.filename || 'attachment', type: a.mimeType || '', bytes: (a.content || {}).byteLength || 0 }));

  await env.MAIL.prepare(
    'INSERT INTO messages (id, message_id, in_reply_to, refs, sender, sender_name, recipient, ' +
    'subject, body_text, body_html, files, received_at, state, unread, replied) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    crypto.randomUUID(),
    trim(headers.get('Message-ID'), 400),
    trim(headers.get('In-Reply-To'), 400),
    trim(headers.get('References'), 2000),
    trim(message.from, 320),
    trim((parsed.from || {}).name, 200),
    trim(message.to, 320),
    trim(parsed.subject, 400) || '(no subject)',
    trim(parsed.text, MAX_TEXT),
    trim(parsed.html, MAX_HTML),
    JSON.stringify(files),
    new Date().toISOString(),
    'inbox',
    1,
    0,
  ).run();
}

async function send(env, { to, subject, html, text, inReplyTo, references }) {
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
      to: [to],
      reply_to: env.MAIL_TO || 'contact@hasnainstudiox.com',
      subject,
      html,
      text,
      headers: Object.keys(headers).length ? headers : undefined,
    }),
  });

  if (res.ok) return { ok: true };

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

  if (path === '/mail/list' && request.method === 'GET') {
    const state = url.searchParams.get('state') || 'inbox';
    const limit = Math.min(Number(url.searchParams.get('limit')) || PAGE, 200);

    const where = state === 'all' ? '' : 'WHERE state = ?';
    const statement = db.prepare(
      'SELECT id, sender, sender_name, subject, received_at, state, unread, replied, files, ' +
      "substr(replace(replace(coalesce(nullif(body_text, ''), body_html), char(10), ' '), char(13), ' '), 1, 180) AS preview " +
      'FROM messages ' + where + ' ORDER BY received_at DESC LIMIT ?'
    );

    const rows = await (state === 'all' ? statement.bind(limit) : statement.bind(state, limit)).all();
    const unread = await db.prepare("SELECT COUNT(*) AS n FROM messages WHERE state = 'inbox' AND unread = 1").first();

    return reply({ ok: true, unread: (unread || {}).n || 0, messages: rows.results || [] });
  }

  if (path === '/mail/message' && request.method === 'GET') {
    const id = url.searchParams.get('id') || '';
    const row = id && await db.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();
    if (!row) return reply({ ok: false, error: 'No such message.' }, 404);

    await db.prepare('UPDATE messages SET unread = 0 WHERE id = ?').bind(id).run();
    return reply({ ok: true, message: { ...row, unread: 0 } });
  }

  if (path === '/mail/state' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const state = body.state === 'archived' ? 'archived' : 'inbox';
    if (!body.id) return reply({ ok: false, error: 'No message given.' }, 400);

    await db.prepare('UPDATE messages SET state = ? WHERE id = ?').bind(state, body.id).run();
    return reply({ ok: true, state });
  }

  if (path === '/mail/reply' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const row = body.id && await db.prepare('SELECT * FROM messages WHERE id = ?').bind(body.id).first();
    if (!row) return reply({ ok: false, error: 'No such message.' }, 404);
    if (!body.html || !body.text) return reply({ ok: false, error: 'The reply was empty.' }, 400);

    /* References carries the whole chain, oldest first, so every client can
       rebuild the thread even when it never saw the middle of it */
    const chain = [row.refs, row.message_id].filter(Boolean).join(' ').trim();

    const sent = await send(env, {
      to: row.sender,
      subject: body.subject || ('Re: ' + row.subject),
      html: body.html,
      text: body.text,
      inReplyTo: row.message_id || undefined,
      references: chain || undefined,
    });
    if (!sent.ok) return reply(sent, 502);

    await db.prepare('UPDATE messages SET replied = 1, unread = 0 WHERE id = ?').bind(body.id).run();
    return reply({ ok: true });
  }

  if (path === '/mail/send' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    if (!body.to) return reply({ ok: false, error: 'No recipient.' }, 400);
    if (!body.html || !body.text) return reply({ ok: false, error: 'The message was empty.' }, 400);

    const sent = await send(env, {
      to: body.to,
      subject: body.subject || 'Hasnain Studio X',
      html: body.html,
      text: body.text,
    });
    return sent.ok ? reply({ ok: true }) : reply(sent, 502);
  }

  if (path === '/mail/health' && request.method === 'GET') {
    const counts = await db.prepare(
      "SELECT COUNT(*) AS total, " +
      "SUM(CASE WHEN state = 'inbox' THEN 1 ELSE 0 END) AS inbox, " +
      "SUM(CASE WHEN unread = 1 AND state = 'inbox' THEN 1 ELSE 0 END) AS unread FROM messages"
    ).first();

    return reply({
      ok: true,
      service: 'hsx-mailbox',
      sender: env.REPLY_FROM || 'Hasnain Studio X <contact@hasnainstudiox.com>',
      total: (counts || {}).total || 0,
      inbox: (counts || {}).inbox || 0,
      unread: (counts || {}).unread || 0,
    });
  }

  return null;
}
