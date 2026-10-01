/* fetch-store-facts.js
   Asks the Microsoft Store what it holds for each published product: the
   release date, the publisher shown to customers, the download size and the
   system requirements. Written to store-facts.json and used by the ownership
   record and the app pages, so those facts come from Microsoft rather than
   from the studio's own notes.

   Run by CI before every build, and by hand any time: node fetch-store-facts.js */
const fs = require('fs');
const path = require('path');

const P = f => path.join(__dirname, f);
const API = id => `https://storeedgefd.dsx.mp.microsoft.com/v9.0/products/${id}` +
  '?market=GB&locale=en-gb&deviceFamily=Windows.Desktop';

/* Minimum and recommended specs as the Store page shows them, minus rows that
   say nothing ("Not specified") or apply to every app (device, architecture). */
const SKIP = new Set(['dvc', 'X86', 'X64', 'kbd', 'mse']);
function requirements(r) {
  if (!r) return null;
  const rows = g => (r[g] && r[g].Items || [])
    .filter(i => !SKIP.has(i.ItemCode) && i.Description && !/^not specified/i.test(i.Description.trim()))
    .map(i => [i.Name, i.Description.trim().replace(/\s+/g, ' ').replace(/ ,/g, ',')]);
  return { min: rows('Minimum'), rec: rows('Recommended') };
}

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
    size: p.ApproximateSizeInBytes || null,
    req: requirements(p.SystemRequirements),
  };
}

(async () => {
  const apps = require('./gen-ownership.js').siteApps();
  const ids = apps.filter(a => a.p).map(a => ({ key: a.i, id: a.p, name: a.n }));
  /* a product the Store does not answer for keeps its last known facts */
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(P('store-facts.json'), 'utf8')).products || {}; } catch (e) { /* first run */ }
  const out = {};
  let ok = 0, failed = 0;

  for (const app of ids) {
    try {
      out[app.key] = { id: app.id, ...await one(app.id) };
      ok++;
    } catch (e) {
      failed++;
      if (prev[app.key]) out[app.key] = prev[app.key];
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
