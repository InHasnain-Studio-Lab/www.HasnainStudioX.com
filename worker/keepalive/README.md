# Supabase keepalive worker

Not part of the website. It lives here so the source is in version control:
the worker ran for a long time in a state nobody could inspect, because the
only copy of its code was in the Cloudflare dashboard.

Supabase pauses a free project after about a week without activity. This worker
makes one request a day to keep it awake.

Deployed as **`tiny-feather-61db`** (a dashboard-generated name, kept because
renaming a worker is not possible and the name is only ever seen here).

## What it does

`scheduled()` runs on the cron. `fetch()` does the same thing on demand and
reports the result, so the worker can be checked at any time:

```bash
curl https://tiny-feather-61db.hasnainbutt2011.workers.dev/
```

```json
{ "service": "supabase-keepalive", "ok": true, "status": 200, "path": "/auth/v1/health" }
```

A non-200 means the ping is failing, and the body says why.

## Two faults this replaced

The previous version exported only `fetch()`. A cron invokes `scheduled()`, so
every run errored before reaching Supabase: 288 failures a day against a
`*/5 * * * *` schedule. The cron is now daily, which is ample for a weekly
deadline.

It also discarded the response and returned "Supabase keepalive ping sent"
whatever happened. It was pinging `/rest/v1/`, which only accepts the
`service_role` key, so the request was being refused with 401 the whole time.
Nothing surfaced it. The worker now checks the status and says what came back.

## The ping target

`/auth/v1/health` accepts the anon key, which `/rest/v1/` does not.

It proves the project answers, but it reaches the auth service rather than
Postgres. To touch the database instead, set `SUPABASE_PING_PATH` to a real
table that anon may read:

```bash
npx wrangler secret put SUPABASE_PING_PATH   # or add it as a plain var
# /rest/v1/<table>?select=<column>&limit=1
```

No code change needed; the worker reads the path from the environment.

## Deploying

```bash
cd worker/keepalive
npx wrangler deploy
```

`SUPABASE_ANON_KEY` is a secret and is not in this repo:

```bash
npx wrangler secret put SUPABASE_ANON_KEY
```

`wrangler deploy` makes the remote config match this file, so check the diff it
prints before confirming. Observability and `preview_urls` are declared here
precisely because leaving them out turns them off.

## The anon key

The key this worker uses is the `anon` key, which Supabase intends to be public
and ships inside browser clients. It is safe only while row level security is
enabled on every table. Worth confirming in Supabase under Authentication ->
Policies.
