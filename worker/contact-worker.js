const ALLOWED_ORIGINS = [
  'https://hasnainstudiox.com',
  'https://www.hasnainstudiox.com',
];

/* defaults so a missing dashboard variable cannot silently misdeliver */
const DEFAULT_TO = 'contact@hasnainstudiox.com';
const DEFAULT_FROM = 'HSX Website <noreply@hasnainstudiox.com>';

const MAX_FIELDS = 25;
const MAX_VALUE = 5000;
const MAX_SUBJECT = 150;
const MIN_CONTENT = 10;

/* not shown in the message body: control fields and the bot trap */
const SKIP = new Set(['_subject', 'company']);

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

function collect(form) {
  const fields = [];
  for (const [k, v] of form.entries()) {
    if (fields.length >= MAX_FIELDS) break;
    if (typeof v !== 'string') continue;
    const value = v.trim().slice(0, MAX_VALUE);
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
    if (request.method !== 'POST' || url.pathname !== '/contact') {
      return json({ ok: false, error: 'Not found.' }, 404, origin);
    }
    if (!env.RESEND_API_KEY) {
      console.log('RESEND_API_KEY is not set on this worker');
      return json({ ok: false, error: 'Not configured.' }, 500, origin);
    }
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json({ ok: false, error: 'Origin not allowed.' }, 403, origin);
    }

    let form;
    try {
      form = await request.formData();
    } catch (e) {
      return json({ ok: false, error: 'Malformed submission.' }, 400, origin);
    }

    /* hidden field: a real visitor never fills it, so anything here is a bot */
    if ((form.get('company') || '').toString().trim()) {
      return json({ ok: true }, 200, origin);
    }

    const fields = collect(form);
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

    const shown = fields.filter(([k]) => !SKIP.has(k));
    const long = ([, v]) => v.length > 120;
    const rows = shown.filter(f => !long(f));
    const blocks = shown.filter(long);

    const html =
      '<table style="border-collapse:collapse;font:14px system-ui,sans-serif">' +
      rows.map(([k, v]) =>
        '<tr><td style="padding:2px 12px 2px 0;color:#667;vertical-align:top">' + esc(label(k)) +
        '</td><td style="padding:2px 0"><strong>' + esc(v) + '</strong></td></tr>').join('') +
      '</table>' +
      blocks.map(([k, v]) =>
        '<hr style="border:none;border-top:1px solid #dde;margin:16px 0">' +
        '<div style="font:12px system-ui,sans-serif;color:#667;margin-bottom:6px">' + esc(label(k)) + '</div>' +
        '<div style="font:14px/1.6 system-ui,sans-serif;white-space:pre-wrap">' + esc(v) + '</div>').join('');

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
      }),
    });

    if (!sent.ok) {
      console.log('resend rejected', sent.status, await sent.text());
      return json({ ok: false, error: 'Delivery failed.' }, 502, origin);
    }
    return json({ ok: true }, 200, origin);
  },
};
