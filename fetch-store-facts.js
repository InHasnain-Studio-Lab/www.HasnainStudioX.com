/* fetch-store-facts.js
   Asks the Microsoft Store what it holds for each published product: the
   release date and the publisher shown to customers. Written to
   store-facts.json and used by the ownership record, so the dates there come
   from Microsoft rather than from the studio's own notes.

   Run by hand after a release: node fetch-store-facts.js */
const fs = require('fs');
const path = require('path');

const P = f => path.join(__dirname, f);
const API = id => `https://storeedgefd.dsx.mp.microsoft.com/v9.0/products/${id}` +
  '?market=GB&locale=en-gb&deviceFamily=Windows.Desktop';

async function one(id) {
  const res = await fetch(API(id), { headers: { 'User-Agent': 'hasnainstudiox.com build' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  const p = body.Payload || body;
  return {
    released: (p.ReleaseDateUtc || '').slice(0, 10) || null,
    updated: (p.LastUpdateDateUtc || '').slice(0, 10) || null,
    publisher: p.PublisherName || null,
    title: p.Title || null,
  };
}

(async () => {
  const apps = JSON.parse(fs.readFileSync(P('hub-catalog.json'), 'utf8')).ps || [];
  const ids = apps.filter(a => a.p).map(a => ({ key: a.i, id: a.p, name: a.n }));
  const out = {};
  let ok = 0, failed = 0;

  for (const app of ids) {
    try {
      out[app.key] = { id: app.id, ...await one(app.id) };
      ok++;
    } catch (e) {
      failed++;
      console.log(`  ! ${app.name} (${app.id}): ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 120));
  }

  const odd = Object.values(out).filter(v => v.publisher && v.publisher !== 'Hasnain Studio X');
  fs.writeFileSync(P('store-facts.json'),
    JSON.stringify({ built: new Date().toISOString(), products: out }, null, 1), 'utf8');

  console.log(`  store facts           ${ok} products read, ${failed} unavailable`);
  if (odd.length) console.log(`  ! publisher mismatch on ${odd.length}: ${odd.map(o => o.id).join(', ')}`);
})();
