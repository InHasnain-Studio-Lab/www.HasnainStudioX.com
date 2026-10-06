/* fetch-store-reviews.js
   Collects the written reviews customers have left on the Microsoft Store, for
   the "What buyers say" section and each app page. Reviews are only ever shown
   as the Store holds them: the words, stars, first name and country are the
   reviewer's own, and the studio's reply is the one published on the Store.

   The Store files a review under the reviewer's country and answers only for
   the country asked, so every published app is asked about each market below.
   A run that cannot reach the Store keeps the reviews already saved.

   Run by CI before every build, and by hand any time: node fetch-store-reviews.js */
const fs = require('fs');
const path = require('path');

const P = f => path.join(__dirname, f);
const MARKETS = ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'IN', 'PK', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH',
  'SE', 'NO', 'DK', 'FI', 'PL', 'PT', 'GR', 'CZ', 'HU', 'RO', 'TR', 'UA', 'JP', 'KR', 'TW', 'HK', 'SG', 'MY',
  'PH', 'ID', 'TH', 'VN', 'BR', 'MX', 'AR', 'CL', 'CO', 'ZA', 'NG', 'KE', 'AE', 'SA', 'EG', 'IL', 'QA', 'KW'];
const API = (id, m) => `https://storeedgefd.dsx.mp.microsoft.com/v9.0/ratings/product/${id}?market=${m}&locale=en-${m}`;
const PARALLEL = 24;

async function ask(id, market) {
  const res = await fetch(API(id, market), { headers: { 'User-Agent': 'hasnainstudiox.com build' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  return ((body.Payload || {}).Reviews || []).filter(r =>
    r.IsPublished !== false && !r.IsTakenDown && !r.ViolationsFound &&
    String(r.ReviewText || r.Title || '').trim().length > 0);
}

const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

(async () => {
  const apps = require('./gen-ownership.js').siteApps().filter(a => a.p);
  let prev = [];
  try { prev = JSON.parse(fs.readFileSync(P('store-reviews.json'), 'utf8')).reviews || []; } catch (e) { /* first run */ }

  const jobs = apps.flatMap(a => MARKETS.map(m => ({ app: a, market: m })));
  const found = new Map();
  let failed = 0, next = 0;

  async function worker() {
    while (next < jobs.length) {
      const { app, market } = jobs[next++];
      try {
        for (const r of await ask(app.p, market)) {
          found.set(r.ReviewId, {
            id: r.ReviewId,
            app: app.i,
            product: app.p,
            name: clean(r.ReviewerName) || 'A customer',
            rating: Number(r.Rating) || 0,
            title: clean(r.Title),
            text: clean(r.ReviewText),
            market: r.Market || market,
            /* written on the free trial: shown on the app's page, never as a buyer's review */
            trial: r.IsProductTrial === true,
            date: String(r.SubmittedDateTimeUtc || '').slice(0, 10),
            reply: r.UserResponse && !r.UserResponse.IsTakenDown && clean(r.UserResponse.Text)
              ? { text: clean(r.UserResponse.Text), date: String(r.UserResponse.SubmittedDateTime || '').slice(0, 10) }
              : null,
          });
        }
      } catch (e) {
        failed++;
      }
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker));

  /* most of the Store unreachable: the saved reviews stand rather than vanish */
  if (failed > jobs.length / 2) {
    console.log(`  store reviews         ${failed} of ${jobs.length} requests failed, kept ${prev.length} saved reviews`);
    return;
  }

  const reviews = [...found.values()].sort((a, b) => b.date.localeCompare(a.date));
  fs.writeFileSync(P('store-reviews.json'),
    JSON.stringify({ built: new Date().toISOString(), reviews }, null, 1), 'utf8');
  console.log(`  store reviews         ${reviews.length} written reviews across ${apps.length} apps` +
    (failed ? `, ${failed} requests unanswered` : ''));
})();
