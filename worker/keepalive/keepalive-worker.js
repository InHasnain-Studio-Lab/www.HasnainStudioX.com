/* The REST root rejects the anon key: it is service_role only. This path
   accepts the anon key. Override with SUPABASE_PING_PATH to point at a real
   table instead, e.g. /rest/v1/posts?select=id&limit=1, which reaches
   Postgres rather than only the auth service. */
const DEFAULT_PATH = '/auth/v1/health';

async function ping(env) {
  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY;
  if (!base || !key) {
    console.log('keepalive: SUPABASE_URL or SUPABASE_ANON_KEY is not set');
    return { ok: false, status: 0, detail: 'not configured' };
  }

  const path = env.SUPABASE_PING_PATH || DEFAULT_PATH;
  const url = base.replace(/\/+$/, '') + path;

  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { apikey: key, Authorization: 'Bearer ' + key },
    });
  } catch (e) {
    console.log('keepalive: request failed', e.message);
    return { ok: false, status: 0, path, detail: e.message };
  }

  const body = (await res.text()).slice(0, 200);
  if (!res.ok) {
    console.log('keepalive: supabase answered', res.status, body);
    return { ok: false, status: res.status, path, detail: body };
  }

  console.log('keepalive: ok', res.status, path);
  return { ok: true, status: res.status, path };
}

export default {
  /* the cron fires this. without it, every scheduled run errors */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(ping(env));
  },

  async fetch(request, env) {
    const result = await ping(env);
    return new Response(JSON.stringify({ service: 'supabase-keepalive', ...result }, null, 2), {
      status: result.ok ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
