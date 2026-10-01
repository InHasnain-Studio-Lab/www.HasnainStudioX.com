/* The community board on hasnainstudiox.com: the favourite app vote, app feedback,
   ideas for new apps and improvements, and the Bug Hunt reports.

   Everything is stored in D1 and a copy of each written submission is mailed to the
   studio. Votes carry no name, email or IP address: a voter is a random id the
   browser keeps, and the only network trace is a salted hash that changes every
   month, kept so one connection cannot fill the poll. */

const CATALOGUE = 'https://hasnainstudiox.com/hub-catalog.json';
const EXTRA_APPS = ['HSX Apps Hub'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const VOTER_RE = /^[A-Za-z0-9-]{16,64}$/;

const LIMITS = { vote: 6, feedback: 8, bug: 6 };   // per network per day; votes per network per month
const MAX = { short: 80, line: 160, text: 4000 };

let appCache = { at: 0, names: null };

/* the live catalogue decides what can be voted for, so a renamed or retired app
   cannot be stuffed in by hand */
async function appNames() {
  if (appCache.names && Date.now() - appCache.at < 3600_000) return appCache.names;
  try {
    const r = await fetch(CATALOGUE, { cf: { cacheTtl: 900 } });
    const d = await r.json();
    const names = new Set([...d.ps.filter(p => p.st === 'live').map(p => p.n), ...EXTRA_APPS]);
    appCache = { at: Date.now(), names };
    return names;
  } catch (e) {
    console.log('catalogue fetch failed', String(e));
    return appCache.names || new Set(EXTRA_APPS);
  }
}

const month = () => new Date().toISOString().slice(0, 7);
const day = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* the salt rotates with the period, so last month's hash says nothing about this month's */
const netHash = (request, env, period) =>
  sha(env.VOTE_SALT + '|' + period + '|' + (request.headers.get('CF-Connecting-IP') || 'unknown'));

const clip = (v, n) => (typeof v === 'string' || typeof v === 'number') ? String(v).trim().slice(0, n) : '';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function tallies(env) {
  const m = month();
  const [cur, all, total] = await Promise.all([
    env.MAIL.prepare('SELECT app, COUNT(*) AS votes FROM votes WHERE month = ? GROUP BY app ORDER BY votes DESC, app LIMIT 20').bind(m).all(),
    env.MAIL.prepare('SELECT app, COUNT(*) AS votes FROM votes GROUP BY app ORDER BY votes DESC, app LIMIT 20').all(),
    env.MAIL.prepare('SELECT COUNT(*) AS n FROM votes WHERE month = ?').bind(m).first(),
  ]);
  return { ok: true, month: m, total: total ? total.n : 0, thisMonth: cur.results, allTime: all.results };
}

async function notify(env, subject, rows, longRows, replyTo) {
  if (!env.RESEND_API_KEY) { console.log('RESEND_API_KEY missing, stored without a copy:', subject); return; }
  const row = ([k, v]) => '<tr><td style="padding:6px 16px 6px 0;color:#6b6b78;font-size:13px;vertical-align:top;white-space:nowrap">' +
    esc(k) + '</td><td style="padding:6px 0;color:#16151c;font-size:14px">' + esc(v) + '</td></tr>';
  const block = ([k, v]) => '<p style="margin:18px 0 4px;color:#6b6b78;font-size:11px;letter-spacing:.08em;text-transform:uppercase">' +
    esc(k) + '</p><div style="color:#16151c;font-size:15px;line-height:1.6;white-space:pre-wrap">' + esc(v) + '</div>';
  const html = '<div style="background:#f4f3ef;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">' +
    '<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e3e0d8;border-radius:6px;padding:22px 26px">' +
    '<div style="color:#6b6b78;font-size:11px;letter-spacing:.1em;text-transform:uppercase">Hasnain Studio X community</div>' +
    '<div style="color:#16151c;font-size:19px;font-weight:600;padding:4px 0 12px">' + esc(subject) + '</div>' +
    '<table role="presentation" cellpadding="0" cellspacing="0">' + rows.filter(r => r[1]).map(row).join('') + '</table>' +
    longRows.filter(r => r[1]).map(block).join('') + '</div></div>';
  const text = [...rows, ...longRows].filter(r => r[1]).map(([k, v]) => k + ': ' + v).join('\n');
  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM || 'HSX Website <noreply@send.hasnainstudiox.com>',
      to: [env.MAIL_TO || 'contact@hasnainstudiox.com'],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject, html, text,
    }),
  });
  if (!sent.ok) console.log('resend rejected', sent.status, await sent.text());
}

async function overLimit(env, table, hash, since, limit) {
  const r = await env.MAIL.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE net_hash = ? AND created_at >= ?`).bind(hash, since).first();
  return r && r.n >= limit;
}

async function vote(body, request, env) {
  const app = clip(body.app, MAX.short);
  const voter = clip(body.voter, 64);
  if (!VOTER_RE.test(voter)) return [400, { ok: false, error: 'Malformed vote.' }];
  if (!(await appNames()).has(app)) return [400, { ok: false, error: 'That app is not in the catalogue.' }];

  const m = month();
  const hash = await netHash(request, env, m);
  const existing = await env.MAIL.prepare('SELECT app FROM votes WHERE month = ? AND voter = ?').bind(m, voter).first();
  if (!existing) {
    const used = await env.MAIL.prepare('SELECT COUNT(*) AS n FROM votes WHERE month = ? AND net_hash = ?').bind(m, hash).first();
    if (used && used.n >= LIMITS.vote) return [429, { ok: false, error: 'This connection has already voted the most times allowed this month.' }];
  }
  /* one vote per voter per month; voting again moves it rather than adding one */
  await env.MAIL.prepare(
    'INSERT INTO votes (month, voter, net_hash, app, created_at) VALUES (?, ?, ?, ?, ?) ' +
    'ON CONFLICT (month, voter) DO UPDATE SET app = excluded.app, created_at = excluded.created_at')
    .bind(m, voter, hash, app, now()).run();
  return [200, { ...(await tallies(env)), yours: app, moved: !!existing && existing.app !== app }];
}

async function feedback(body, request, env) {
  const kind = body.kind === 'idea' ? 'idea' : 'feedback';
  const app = clip(body.app, MAX.short);
  const liked = clip(body.liked, MAX.text);
  const improve = clip(body.improve, MAX.text);
  const name = clip(body.name, MAX.short);
  const email = clip(body.email, MAX.line);

  const names = await appNames();
  if (kind === 'feedback' && !names.has(app)) return [400, { ok: false, error: 'Choose an app from the list.' }];
  if (kind === 'idea' && app && app !== 'A new app' && !names.has(app)) return [400, { ok: false, error: 'Choose an app from the list.' }];
  if (improve.length < 10 && liked.length < 10) return [400, { ok: false, error: 'Please write a little more, at least a sentence.' }];
  if (email && !EMAIL_RE.test(email)) return [400, { ok: false, error: 'That email address does not look right.' }];

  const hash = await netHash(request, env, day());
  if (await overLimit(env, 'feedback', hash, day(), LIMITS.feedback))
    return [429, { ok: false, error: 'Thanks, we have plenty from this connection today. Please try again tomorrow.' }];

  const id = crypto.randomUUID();
  await env.MAIL.prepare('INSERT INTO feedback (id, kind, app, liked, improve, name, email, net_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, kind, app || 'A new app', liked, improve, name, email, hash, now()).run();

  const what = kind === 'idea' ? 'Idea' : 'Feedback';
  await notify(env, `${what}: ${app || 'A new app'}`,
    [['App', app || 'A new app'], ['Name', name], ['Email', email], ['Reference', id.slice(0, 8)]],
    kind === 'idea' ? [['The idea', improve], ['Why it matters', liked]] : [['What works', liked], ['What to improve', improve]],
    email || null);
  return [200, { ok: true, reference: id.slice(0, 8).toUpperCase() }];
}

async function bug(body, request, env) {
  const f = {
    app: clip(body.app, MAX.short), version: clip(body.version, 40), windows: clip(body.windows, MAX.short),
    severity: ['low', 'medium', 'high', 'critical'].includes(body.severity) ? body.severity : 'medium',
    title: clip(body.title, MAX.line), steps: clip(body.steps, MAX.text), expected: clip(body.expected, MAX.text),
    actual: clip(body.actual, MAX.text), name: clip(body.name, MAX.short), email: clip(body.email, MAX.line),
    credit: clip(body.credit, MAX.short),
  };
  if (!(await appNames()).has(f.app)) return [400, { ok: false, error: 'Choose an app from the list.' }];
  if (f.title.length < 6) return [400, { ok: false, error: 'Give the problem a short title.' }];
  if (f.steps.length < 20) return [400, { ok: false, error: 'Describe the steps that lead to the problem.' }];
  if (!f.actual) return [400, { ok: false, error: 'Say what actually happened.' }];
  if (!f.name) return [400, { ok: false, error: 'A name is required, so a reward can reach you.' }];
  if (!EMAIL_RE.test(f.email)) return [400, { ok: false, error: 'A valid email address is required, so we can reply.' }];
  if (body.agree !== true) return [400, { ok: false, error: 'Please confirm you accept the Bug Hunt rules.' }];

  const hash = await netHash(request, env, day());
  if (await overLimit(env, 'bug_reports', hash, day(), LIMITS.bug))
    return [429, { ok: false, error: 'That is the most reports one connection can send in a day. Please send the rest tomorrow.' }];

  const id = crypto.randomUUID();
  await env.MAIL.prepare(
    'INSERT INTO bug_reports (id, app, version, windows, severity, title, steps, expected, actual, name, email, credit, net_hash, created_at) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, f.app, f.version, f.windows, f.severity, f.title, f.steps, f.expected, f.actual, f.name, f.email, f.credit, hash, now()).run();

  const ref = 'BH-' + id.slice(0, 8).toUpperCase();
  await notify(env, `Bug Hunt ${ref}: ${f.app}, ${f.title}`,
    [['App', f.app], ['Version', f.version], ['Windows', f.windows], ['Severity', f.severity], ['Reporter', f.name],
     ['Email', f.email], ['Credit as', f.credit || f.name], ['Reference', ref]],
    [['Steps', f.steps], ['Expected', f.expected], ['What happened', f.actual]], f.email);
  return [200, { ok: true, reference: ref }];
}

/* answers /community/* paths; json() and origin checks come from the main worker */
export async function handleCommunity(request, env, url, json, origin, allowed) {
  if (!env.VOTE_SALT) {
    console.log('VOTE_SALT is not set on this worker');
    return json({ ok: false, error: 'Not configured.' }, 500, origin);
  }
  const path = url.pathname.replace(/\/+$/, '');
  try {
    if (request.method === 'GET' && path === '/community/votes') {
      const res = json(await tallies(env), 200, origin);
      res.headers.set('Cache-Control', 'public, max-age=30');
      return res;
    }
    if (request.method !== 'POST') return json({ ok: false, error: 'Not found.' }, 404, origin);
    if (!allowed) return json({ ok: false, error: 'Origin not allowed.' }, 403, origin);

    let body;
    try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'Malformed submission.' }, 400, origin); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ ok: false, error: 'Malformed submission.' }, 400, origin);
    /* the hidden trap only a bot fills */
    if (body.hsx_ref) { console.log('community trap filled'); return json({ ok: true, reference: 'OK' }, 200, origin); }

    const handler = { '/community/vote': vote, '/community/feedback': feedback, '/community/bug': bug }[path];
    if (!handler) return json({ ok: false, error: 'Not found.' }, 404, origin);
    const [status, out] = await handler(body, request, env);
    return json(out, status, origin);
  } catch (e) {
    console.log('community error', path, String(e && e.stack || e));
    return json({ ok: false, error: 'Something went wrong on our side. Please try again later.' }, 500, origin);
  }
}
