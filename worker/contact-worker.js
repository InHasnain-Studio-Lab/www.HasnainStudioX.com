import { handleList } from './list.js';

const ALLOWED_ORIGINS = [
  'https://hasnainstudiox.com',
  'https://www.hasnainstudiox.com',
];

/* defaults so a missing dashboard variable cannot silently misdeliver */
const DEFAULT_TO = 'contact@hasnainstudiox.com';
const DEFAULT_FROM = 'HSX Website <noreply@send.hasnainstudiox.com>';

const MAX_FIELDS = 25;
const MAX_VALUE = 5000;
const MAX_SUBJECT = 150;
const MIN_CONTENT = 4;

/* not shown in the message body: control fields and the bot trap.
   'company' was the old trap name. Browsers autofill it, which silently
   dropped real messages, so it is now an ordinary ignored field. */
const SKIP = new Set(['_subject', 'company', 'hsx_ref']);
const TRAP = 'hsx_ref';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const corsHeaders = origin => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
});

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const label = k => k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

/* The website posts multipart form data. HSX Apps Hub posts JSON. Both are
   read into the same list of pairs. */
async function read(request) {
  const type = (request.headers.get('Content-Type') || '').toLowerCase();
  if (type.includes('application/json')) {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('not an object');
    return Object.entries(body);
  }
  return [...(await request.formData()).entries()];
}

function collect(entries) {
  const fields = [];
  for (const [k, v] of entries) {
    if (fields.length >= MAX_FIELDS) break;
    if (typeof v !== 'string' && typeof v !== 'number') continue;
    const value = String(v).trim().slice(0, MAX_VALUE);
    if (value) fields.push([k, value]);
  }
  return fields;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    /* identifies this worker, so a wrong one on the route is obvious */
    if (request.method === 'GET' && url.pathname === '/contact') {
      return json({ ok: false, service: 'hsx-contact', error: 'POST only.' }, 405, origin);
    }
    if (!url.pathname.startsWith('/list/') &&
        (request.method !== 'POST' || url.pathname !== '/contact')) {
      return json({ ok: false, error: 'Not found.' }, 404, origin);
    }
    if (!env.RESEND_API_KEY) {
      console.log('RESEND_API_KEY is not set on this worker');
      return json({ ok: false, error: 'Not configured.' }, 500, origin);
    }
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      console.log('rejected origin:', origin);
      return json({ ok: false, error: 'Origin not allowed.' }, 403, origin);
    }

    /* the release notes list lives on its own paths */
    if (url.pathname.startsWith('/list/')) {
      const handled = await handleList(request, env, url, json, origin);
      if (handled) return handled;
      return json({ ok: false, error: 'Not found.' }, 404, origin);
    }

    let entries;
    try {
      entries = await read(request);
    } catch (e) {
      return json({ ok: false, error: 'Malformed submission.' }, 400, origin);
    }

    const fields = collect(entries);

    /* The trap is hidden and carries a name no browser autofills, so a value
       in it means a bot. Logged rather than dropped in silence, so a real
       person caught by it is visible in the worker log. */
    const trapped = fields.find(([k, v]) => k === TRAP && v);
    if (trapped) {
      console.log('trap filled, dropping:', JSON.stringify(fields.slice(0, 6)));
      return json({ ok: true }, 200, origin);
    }
    const get = k => (fields.find(f => f[0] === k) || [, ''])[1];

    const name = get('name');
    const email = get('email');
    if (!name) return json({ ok: false, error: 'A name is required.' }, 400, origin);
    if (!EMAIL_RE.test(email)) {
      return json({ ok: false, error: 'A valid email address is required.' }, 400, origin);
    }

    const content = fields
      .filter(([k]) => !SKIP.has(k) && k !== 'name' && k !== 'email')
      .map(([, v]) => v).join(' ');
    if (content.length < MIN_CONTENT) {
      return json({ ok: false, error: 'The message is too short.' }, 400, origin);
    }

    const declared = get('_subject').slice(0, MAX_SUBJECT);
    const subject = declared || 'Website contact: ' + (get('topic') || 'General enquiry');

    /* Email clients strip most CSS, so this is tables and inline styles only,
       on a light ground because a dark one gets inverted unpredictably. The
       message always sits apart from the details, whatever its length. */
    const shown = fields.filter(([k]) => !SKIP.has(k));
    const details = shown.filter(([k, v]) => k !== 'message' && v.length <= 120);
    const bodies = shown.filter(([k, v]) => k === 'message' || v.length > 120);

    const row = ([k, v]) =>
      '<tr>' +
      '<td style="padding:7px 18px 7px 0;color:#6b6b78;font-size:13px;white-space:nowrap;vertical-align:top">' +
      esc(label(k)) + '</td>' +
      '<td style="padding:7px 0;color:#16151c;font-size:14px">' + esc(v) + '</td>' +
      '</tr>';

    const block = ([k, v]) =>
      '<tr><td style="padding:22px 0 6px;color:#6b6b78;font-size:11px;letter-spacing:.08em;' +
      'text-transform:uppercase">' + esc(label(k)) + '</td></tr>' +
      '<tr><td style="padding:0;color:#16151c;font-size:15px;line-height:1.6;white-space:pre-wrap">' +
      esc(v) + '</td></tr>';

    const html =
      '<div style="background:#f4f3ef;padding:28px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ' +
      'style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e3e0d8;border-radius:6px">' +
      '<tr><td style="height:3px;background:#16705c;font-size:0;line-height:0">&nbsp;</td></tr>' +
      '<tr><td style="padding:22px 26px 0">' +
      '<div style="color:#6b6b78;font-size:11px;letter-spacing:.1em;text-transform:uppercase">Hasnain Studio X</div>' +
      '<div style="color:#16151c;font-size:19px;font-weight:600;padding-top:4px">' + esc(subject) + '</div>' +
      '</td></tr>' +
      '<tr><td style="padding:14px 26px 0">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">' +
      details.map(row).join('') + '</table></td></tr>' +
      (bodies.length
        ? '<tr><td style="padding:0 26px">' +
          '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">' +
          bodies.map(block).join('') + '</table></td></tr>'
        : '') +
      '<tr><td style="padding:24px 26px 22px">' +
      '<div style="border-top:1px solid #eeebe4;padding-top:14px;color:#8a8896;font-size:12px">' +
      'Reply to this email to answer ' + esc(name) + ' directly.</div>' +
      '</td></tr></table></div>';

    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.MAIL_FROM || DEFAULT_FROM,
        to: [env.MAIL_TO || DEFAULT_TO],
        reply_to: email,
        subject,
        html,
        text: shown.map(([k, v]) => label(k) + ': ' + v).join('\n'),
      }),
    });

    if (!sent.ok) {
      console.log('resend rejected', sent.status, await sent.text());
      return json({ ok: false, error: 'Delivery failed.' }, 502, origin);
    }
    return json({ ok: true }, 200, origin);
  },
};
