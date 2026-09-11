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

## This needs its own worker

Give this a worker of its own. Do not attach the route to a worker that already
does something else: the route sends every request to that worker's code, so the
contact form gets whatever that worker replies, and the form reads a 200 as
delivery. A keepalive worker answering `200 Supabase keepalive ping sent` looks
exactly like a sent message from the outside.

`site.js` now requires `{"ok":true}` in the response body rather than trusting the
status code, so a wrong worker fails visibly instead of silently. That is a
backstop, not a substitute for pointing the route at the right worker.

A quick way to confirm the route reaches this code:

```bash
curl https://api.hasnainstudiox.com/contact
```

The answer should name itself: `{"ok":false,"service":"hsx-contact","error":"POST only."}`.
Anything else means the route is on the wrong worker.

## One-time setup

**1. Verify the domain for sending, in Resend**

Add **`send.hasnainstudiox.com`**, not the bare domain, and create the records
Resend gives you.

The subdomain is the point. The apex already carries Cloudflare Email Routing:

```
MX   route1/2/3.mx.cloudflare.net
TXT  v=spf1 include:_spf.mx.cloudflare.net ~all
```

A domain may hold only one SPF record, so verifying the apex would mean editing
that line and risking inbound mail. Sending from a subdomain keeps the two apart:
inbound on the apex, outbound on `send.`, neither touching the other.

TXT and MX records cannot be proxied, so there is nothing to switch off. If any
record Resend asks for is a CNAME, set that one to DNS only.

The address mail is sent from has to be on the verified subdomain, which is why
`MAIL_FROM` is `noreply@send.hasnainstudiox.com`. Mail still arrives at
`contact@hasnainstudiox.com`; that is the recipient, not the sender.

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

In the Cloudflare dashboard: Workers and Pages -> hsx-contact -> Domains ->
**Add Domain** -> `api.hasnainstudiox.com`.

Add Domain, not Add Route. A route only matches traffic that already reaches
Cloudflare; it does not create the hostname, so a route on a subdomain with no
DNS record never fires and the request fails to resolve. Add Domain creates the
record as well.

A subdomain is deliberate. It leaves the apex DNS and the GitHub Pages setup
untouched, so publishing the site cannot break mail and a worker mistake cannot
take the site down.

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
