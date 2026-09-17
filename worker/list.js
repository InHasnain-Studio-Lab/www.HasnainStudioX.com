/* Release notes list: subscribe, confirm, unsubscribe.
 *
 * Double opt-in, because an address only counts as consent once the person
 * holding it has acted. Nothing here tracks anybody: no pixel, no rewritten
 * links, no IP address. The list lives in this account's own D1 database and
 * is never handed to a marketing platform.
 */

const SITE = 'https://hasnainstudiox.com';
const CONFIRMED_PAGE = SITE + '/list/confirmed.html';
const GONE_PAGE = SITE + '/list/unsubscribed.html';
const EXPIRED_PAGE = SITE + '/list/expired.html';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PENDING_DAYS = 7;

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const redirect = to => new Response(null, { status: 302, headers: { Location: to } });

/* One shell for both emails, so they look like the contact notification the
   studio already sends. Tables and inline styles only: email clients drop
   almost everything else. */
function shell(heading, bodyHtml, footerHtml) {
  return '<div style="background:#f4f3ef;padding:28px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ' +
    'style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e3e0d8;border-radius:6px">' +
    '<tr><td style="height:3px;background:#16705c;font-size:0;line-height:0">&nbsp;</td></tr>' +
    '<tr><td style="padding:24px 26px 0">' +
    '<div style="color:#6b6b78;font-size:11px;letter-spacing:.1em;text-transform:uppercase">Hasnain Studio X</div>' +
    '<div style="color:#16151c;font-size:20px;font-weight:600;padding-top:5px">' + esc(heading) + '</div>' +
    '</td></tr>' +
    '<tr><td style="padding:16px 26px 0;color:#2c2b35;font-size:15px;line-height:1.65">' + bodyHtml + '</td></tr>' +
    '<tr><td style="padding:24px 26px 24px">' +
    '<div style="border-top:1px solid #eeebe4;padding-top:14px;color:#8a8896;font-size:12px;line-height:1.6">' +
    footerHtml + '</div></td></tr></table></div>';
}

const button = (href, text) =>
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 6px">' +
  '<tr><td style="background:#16705c;border-radius:5px">' +
  '<a href="' + href + '" style="display:inline-block;padding:11px 24px;color:#ffffff;' +
  'font-size:15px;font-weight:600;text-decoration:none">' + text + '</a>' +
  '</td></tr></table>';

function confirmEmail(link) {
  return {
    subject: 'Confirm your email address',
    html: shell('Confirm your email address',
      '<p style="margin:0">You asked for release notes from Hasnain Studio X: an email when a new ' +
      'app is published, when one you own gets a real update, or when something changes that affects ' +
      'software you already paid for. Nothing else, and never on a schedule.</p>' +
      '<p style="margin:14px 0 0">Click to confirm and you are on the list.</p>' +
      button(link, 'Confirm') +
      /* the address is shown in full: a button that hides where it goes is what a
         phishing email looks like, and filters score it that way too */
      '<p style="margin:10px 0 0;color:#6b6b78;font-size:12px;word-break:break-all">' +
      'Or paste this into your browser:<br>' + link + '</p>' +
      '<p style="margin:14px 0 0;color:#6b6b78;font-size:13px">If you did not ask for this, ignore it. ' +
      'Nothing happens, and the link stops working in seven days.</p>',
      'Hasnain Studio X, England &middot; hasnainstudiox.com'),
    text: 'You asked for release notes from Hasnain Studio X. Confirm your address here:\n\n' + link +
      '\n\nIf you did not ask for this, ignore it. The link stops working in seven days.\n\n' +
      'Hasnain Studio X, England',
  };
}

function welcomeEmail(unsubscribe) {
  const body =
    '<p style="margin:0 0 14px">Thank you for confirming.</p>' +
    '<p style="margin:0 0 14px">This list exists because of a gap. Everything I make reaches you ' +
    'through Microsoft and Google, and neither of them gives me a way to contact the people who buy ' +
    'my software. If a store changes its terms, withdraws an app, or something happens to an account, ' +
    'I have no way to tell you. Now I do.</p>' +
    '<p style="margin:0 0 6px"><strong>You will hear from me when</strong></p>' +
    '<p style="margin:0 0 14px;color:#2c2b35">a new app is published, an app you own gets a real update, ' +
    'or something changes that affects software you already paid for.</p>' +
    '<p style="margin:0 0 6px"><strong>You will not hear from me otherwise.</strong></p>' +
    '<p style="margin:0 0 14px;color:#2c2b35">There is no schedule. Nothing is sent for the sake of ' +
    'sending something.</p>' +
    '<p style="margin:0 0 6px"><strong>What this list does not do</strong></p>' +
    '<p style="margin:0;color:#2c2b35">There is no tracking pixel, so I cannot tell whether you opened ' +
    'this. There is no link tracking, so the links are the real ones. Your address sits on my own ' +
    'server, never on a marketing platform, and is never sold, shared or passed on.</p>';
  return {
    subject: 'You are on the list',
    html: shell('You are on the list', body,
      '<a href="' + unsubscribe + '" style="color:#16705c">Unsubscribe</a> at any time, one click, no questions.<br>' +
      'Hasnain Butt Akhtar &middot; Hasnain Studio X, England &middot; hasnainstudiox.com'),
    text: 'Thank you for confirming.\n\n' +
      'This list exists because of a gap. Everything I make reaches you through Microsoft and Google, ' +
      'and neither gives me a way to contact the people who buy my software. If a store changes its ' +
      'terms, withdraws an app, or something happens to an account, I have no way to tell you. Now I do.\n\n' +
      'You will hear from me when a new app is published, an app you own gets a real update, or ' +
      'something changes that affects software you already paid for. Otherwise you will not.\n\n' +
      'No tracking pixel, no link tracking, and your address is never sold, shared or passed on.\n\n' +
      'Unsubscribe: ' + unsubscribe + '\n\n' +
      'Hasnain Butt Akhtar, Hasnain Studio X, England',
  };
}

async function send(env, to, mail, unsubscribeUrl) {
  const headers = unsubscribeUrl
    ? {
        'List-Unsubscribe': '<' + unsubscribeUrl + '>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      }
    : undefined;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.LIST_FROM || 'Hasnain Studio X <notes@send.hasnainstudiox.com>',
      to: [to],
      reply_to: env.MAIL_TO || 'contact@hasnainstudiox.com',
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      headers,
    }),
  });
  if (!res.ok) console.log('list send failed', res.status, await res.text());
  return res.ok;
}

const linkFor = (kind, token) => 'https://api.hasnainstudiox.com/list/' + kind + '?t=' + token;

export async function handleList(request, env, url, json, origin) {
  const db = env.LIST;
  if (!db) {
    console.log('LIST binding missing');
    return json({ ok: false, error: 'Not configured.' }, 500, origin);
  }
  const now = new Date().toISOString();

  if (url.pathname === '/list/subscribe' && request.method === 'POST') {
    let entries;
    try {
      const type = (request.headers.get('Content-Type') || '').toLowerCase();
      entries = type.includes('application/json')
        ? Object.entries(await request.json())
        : [...(await request.formData()).entries()];
    } catch (e) {
      return json({ ok: false, error: 'Malformed submission.' }, 400, origin);
    }
    const get = k => String((entries.find(e => e[0] === k) || [, ''])[1] || '').trim();

    /* same trap as the contact form */
    if (get('hsx_ref')) return json({ ok: true }, 200, origin);

    const email = get('email').toLowerCase().slice(0, 254);
    if (!EMAIL_RE.test(email)) {
      return json({ ok: false, error: 'That does not look like an email address.' }, 400, origin);
    }
    const source = get('source').slice(0, 120) || 'website';

    /* pending rows that were never confirmed are not consent, so they go */
    const cutoff = new Date(Date.now() - PENDING_DAYS * 864e5).toISOString();
    await db.prepare("DELETE FROM subscribers WHERE status = 'pending' AND created_at < ?")
      .bind(cutoff).run();

    const existing = await db.prepare('SELECT status FROM subscribers WHERE email = ?')
      .bind(email).first();

    /* Already on the list: say the same thing as a new signup rather than
       confirming to a stranger who is or is not subscribed. */
    if (existing && existing.status === 'confirmed') {
      return json({ ok: true }, 200, origin);
    }

    const token = crypto.randomUUID();
    await db.prepare(
      'INSERT INTO subscribers (email, status, token, source, created_at) VALUES (?, ?, ?, ?, ?) ' +
      'ON CONFLICT(email) DO UPDATE SET status = ?, token = ?, source = ?, created_at = ?, ' +
      'unsubscribed_at = NULL'
    ).bind(email, 'pending', token, source, now, 'pending', token, source, now).run();

    /* the unsubscribe header goes on this one too: a confirmation without it can be
       scored as bulk, and it gives anyone who did not ask for it a way out */
    await send(env, email, confirmEmail(linkFor('confirm', token)), linkFor('unsubscribe', token));
    return json({ ok: true }, 200, origin);
  }

  if (url.pathname === '/list/confirm' && request.method === 'GET') {
    const token = url.searchParams.get('t') || '';
    const row = token && await db.prepare('SELECT email FROM subscribers WHERE token = ? AND status = ?')
      .bind(token, 'pending').first();
    if (!row) return redirect(EXPIRED_PAGE);

    const fresh = crypto.randomUUID();
    await db.prepare("UPDATE subscribers SET status = 'confirmed', confirmed_at = ?, token = ? WHERE email = ?")
      .bind(now, fresh, row.email).run();

    const unsubscribe = linkFor('unsubscribe', fresh);
    await send(env, row.email, welcomeEmail(unsubscribe), unsubscribe);
    return redirect(CONFIRMED_PAGE);
  }

  /* GET for the link in the email, POST for the one-click header */
  if (url.pathname === '/list/unsubscribe') {
    const token = url.searchParams.get('t') || '';
    if (token) {
      await db.prepare("UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = ?, token = NULL WHERE token = ?")
        .bind(now, token).run();
    }
    if (request.method === 'POST') return new Response(null, { status: 200 });
    return redirect(GONE_PAGE);
  }

  return null;
}
