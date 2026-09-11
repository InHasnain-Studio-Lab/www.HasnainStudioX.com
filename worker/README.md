# Contact form worker

The website is static and hosted on GitHub Pages, so it cannot send mail by
itself. Cloudflare Email Routing only forwards mail that arrives at the domain;
it has no HTTP endpoint and cannot receive a form submission. This worker is the
piece in between: it accepts the form POST and hands the message to an email API,
which delivers it to `contact@hasnainstudiox.com`.

```
visitor -> api.hasnainstudiox.com/contact (this worker) -> Resend -> contact@hasnainstudiox.com
```

The form on the site posts `multipart/form-data` and only checks the response
status, so the worker is a drop-in for the old third-party endpoint. No change to
`site.js` was needed.

## One-time setup

**1. Verify the domain for sending, in Resend**

Add the domain in the Resend dashboard and create the DKIM records it gives you.

**SPF gotcha.** Cloudflare Email Routing already publishes an SPF record on the
apex:

```
v=spf1 include:_spf.mx.cloudflare.net ~all
```

A domain may hold only one SPF record. Do not add a second. Merge the sender's
include into the existing record:

```
v=spf1 include:_spf.mx.cloudflare.net include:amazonses.com ~all
```

Two SPF records is the single most common reason mail starts landing in spam
after a change like this.

Inbound routing is unaffected: sending uses TXT records, receiving uses MX.

**2. Publish the worker**

```bash
cd worker
npx wrangler deploy
```

**3. Give it the API key**

```bash
npx wrangler secret put RESEND_API_KEY
```

**4. Put it on the domain**

In the Cloudflare dashboard: Workers and Pages -> hsx-contact -> Settings ->
Domains and Routes -> Add -> Custom Domain -> `api.hasnainstudiox.com`.

A custom domain on a subdomain is deliberate. It leaves the apex DNS and the
GitHub Pages setup untouched, so publishing the site cannot break mail and a
worker mistake cannot take the site down.

## Checking it works

```bash
curl -X POST https://api.hasnainstudiox.com/contact \
  -H "Origin: https://hasnainstudiox.com" \
  -F "name=Test" -F "email=you@example.com" \
  -F "topic=General" -F "platform=Other" \
  -F "message=Checking the contact route end to end."
```

`{"ok":true}` means it was accepted and handed to the sender. Read the worker log
with `npx wrangler tail` if it is not.

## What it rejects

- Any origin other than the site itself
- Anything that is not `POST /contact`
- A missing name, an invalid email address, or a message under 10 characters
- Submissions that fill the hidden `company` field, which only a bot does. These
  get `{"ok":true}` and are dropped, so the bot has nothing to learn from.

Field lengths are capped before the message is built, so an oversized submission
cannot be used to inflate what gets sent.

## If you ever need more

The worker has no rate limiting of its own. If it starts attracting spam, the
cheapest fix is a Cloudflare rate-limiting rule on `api.hasnainstudiox.com`.
Cloudflare Turnstile is the next step after that, and would need a widget adding
to the form.
