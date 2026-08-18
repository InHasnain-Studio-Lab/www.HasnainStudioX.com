#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   HASNAIN STUDIO X — Site sync

   Run this after adding, removing or renaming an app.
   It reads the APPS list inside Windows-apps.html and android-apps.html
   (the single source of truth) and then updates everything that depends
   on it, so you never edit a number by hand:

     1. Every visible app count on every page
     2. The SoftwareApplication structured data Google reads
     3. sitemap.xml — adds new pages, drops deleted ones, refreshes dates

   Double-click update-site.bat. Nothing else to remember.
   ═══════════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const P = f => path.join(ROOT, f);
const read = f => fs.readFileSync(P(f), 'utf8');
const write = (f, s) => fs.writeFileSync(P(f), s, 'utf8');
const today = new Date().toISOString().slice(0, 10);

const WORDS = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
               'Eleven','Twelve'];

/* schema.org category per app id — extend when you add an app.
   Anything not listed falls back to UtilitiesApplication. */
const SCHEMA_CAT = {
  pcguardx:'SecurityApplication', browsex:'SecurityApplication', xcipher:'SecurityApplication',
  spatiaxultra:'MultimediaApplication', hypersonusultra:'MultimediaApplication',
  vaudioelite:'MultimediaApplication', medialucent:'MultimediaApplication',
  primecut:'MultimediaApplication', photovidix:'MultimediaApplication',
  glowlab:'MultimediaApplication', image3dx:'MultimediaApplication',
  sensecapture:'MultimediaApplication', castvisuality:'MultimediaApplication',
  hsxstudioflow:'MultimediaApplication', fototensor:'MultimediaApplication',
  spatiaxmobile:'MultimediaApplication',
  workxsuite:'BusinessApplication', docmento:'BusinessApplication',
  pocktium:'BusinessApplication', docclarity:'BusinessApplication',
  docsmining:'BusinessApplication',
  creatorxstudio:'DesignApplication', webxstudio:'DesignApplication', drop2qr:'DesignApplication',
  forgexpro:'DeveloperApplication', vdroidx:'DeveloperApplication',
  planetx:'EducationalApplication', planetxinfinity:'EducationalApplication',
  planetxearthexplorer:'EducationalApplication', terraorbitix:'EducationalApplication',
  infinityjungle:'GameApplication',
  conjureai:'DesignApplication', dreammintai:'MultimediaApplication',
  quantumxai:'MultimediaApplication', pcscreenrecorderpro:'MultimediaApplication',
  mediatidyultra:'MultimediaApplication', earthos:'EducationalApplication',
  titanmlstudio:'DeveloperApplication', mobileservicelab:'UtilitiesApplication',
  convertmasterultra:'MultimediaApplication', workxsuiteandroid:'BusinessApplication',
};

/* ── read the APPS array out of a page ── */
function readApps(file) {
  const s = read(file);
  const m = s.match(/const APPS = \[([\s\S]*?)\n        \];/);
  if (!m) { console.log(`  ! could not find the APPS list in ${file}`); return []; }
  const body = m[1].replace(/icon: ico\((?:'[^']*')\),/g, '');
  // eslint-disable-next-line no-eval
  return eval('[' + body + ']');
}

const win = readApps('Windows-apps.html');
const and = readApps('android-apps.html');
if (!win.length && !and.length) { console.log('\n  Nothing to do — no apps found.\n'); process.exit(1); }

const live = a => a.filter(x => x.status === 'live');
const soon = a => a.filter(x => x.status === 'soon');

const COUNTS = {
  'total':      win.length + and.length,
  'win-total':  win.length,
  'win-live':   live(win).length,
  'win-soon':   soon(win).length,
  'and-total':  and.length,
  'and-live':   live(and).length,
  'and-soon':   soon(and).length,
};

/* ── 1. rewrite every <span data-count="x">…</span> across the site ── */
const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !f.startsWith('_'));
let countEdits = 0;
for (const f of PAGES) {
  let s = read(f), before = s;
  s = s.replace(/(<(?:span|b|div)[^>]*\bdata-count="([a-z-]+)"[^>]*>)([^<]*)(<\/(?:span|b|div)>)/g,
    (full, open, key, old, close) => {
      if (!(key in COUNTS)) return full;
      const n = COUNTS[key];
      // keep word-form if the page was written that way ("Five applications")
      const val = /^[A-Z][a-z]+$/.test(old.trim()) && n <= 12 ? WORDS[n] : String(n);
      return open + val + close;
    });
  if (s !== before) { write(f, s); countEdits++; }
}

/* ── 2. regenerate the SoftwareApplication structured data ── */
function syncSchema(file, apps, listName, osName) {
  let s = read(file);
  const block = s.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!block) { console.log(`  ! no structured data block in ${file}`); return 0; }
  let data;
  try { data = JSON.parse(block[1]); }
  catch (e) { console.log(`  ! structured data in ${file} is not valid JSON — skipped`); return 0; }
  if (!data['@graph']) return 0;

  const items = apps
    // only real product pages go into Google's data — placeholder/publisher
    // links are skipped so nothing is claimed before it has a store listing
    .filter(a => a.status === 'live' &&
                 /apps\.microsoft\.com\/detail|play\.google\.com\/store/.test(a.storeUrl || ''))
    .map((a, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: {
        '@type': 'SoftwareApplication',
        name: a.name,
        applicationCategory: SCHEMA_CAT[a.id] || 'UtilitiesApplication',
        operatingSystem: osName,
        description: a.description,
        isAccessibleForFree: true,
        offers: { '@type':'Offer', price:'0', priceCurrency:'GBP',
                  availability:'https://schema.org/InStock' },
        publisher: { '@id': 'https://www.hasnainstudiox.com/#organization' },
        url: a.storeUrl,
      }
    }));

  let found = false;
  for (const node of data['@graph']) {
    if (node['@type'] === 'ItemList') {
      node.name = listName; node.numberOfItems = items.length;
      node.itemListElement = items; found = true;
    }
  }
  if (!found) {
    data['@graph'].push({ '@type':'ItemList', name:listName,
                          numberOfItems:items.length, itemListElement:items });
  }
  s = s.slice(0, block.index) + '<script type="application/ld+json">\n'
    + JSON.stringify(data, null, 2) + '\n    </script>'
    + s.slice(block.index + block[0].length);
  write(file, s);
  return items.length;
}
const nWin = syncSchema('Windows-apps.html', win, 'Windows Apps by Hasnain Studio X', 'Windows 10, Windows 11');
const nAnd = syncSchema('android-apps.html', and, 'Android Apps by Hasnain Studio X', 'Android');

/* ── 3. sync sitemap.xml with what is actually on disk ── */
const BASE = 'https://www.hasnainstudiox.com/';
// Landing pages are reached by scanning a code, not by search. Redirect stubs
// exist only so URLs registered before a rename keep resolving; indexing either
// would compete with the real page.
const SKIP = new Set(['card.html', 'qx-link.html']);
PAGES.forEach(f => { if (read(f).includes('redirect-stub')) SKIP.add(f); });
const PRIORITY = { 'index.html':'1.0', 'Windows-apps.html':'0.9', 'android-apps.html':'0.9',
                   'HSXAIstudio.html':'0.8', 'contact.html':'0.7' };
const FREQ = { 'index.html':'weekly', 'Windows-apps.html':'weekly', 'android-apps.html':'weekly',
               'HSXAIstudio.html':'monthly', 'contact.html':'monthly' };

let sitemapMsg = 'sitemap.xml not found — skipped';
if (fs.existsSync(P('sitemap.xml'))) {
  const sm = read('sitemap.xml');
  const existing = {};
  for (const m of sm.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g))
    existing[m[1].replace(/^https?:\/\/(www\.)?hasnainstudiox\.com\//, '')] = m[2];

  const onDisk = PAGES.filter(f => !SKIP.has(f)).sort((a, b) => {
    const pa = +(PRIORITY[a] || 0.3), pb = +(PRIORITY[b] || 0.3);
    return pb - pa || a.localeCompare(b);
  });

  const added = onDisk.filter(f => !(f in existing));
  const gone  = Object.keys(existing).filter(f => !onDisk.includes(f));

  const urls = onDisk.map(f => {
    const stat = fs.statSync(P(f));
    const mod  = new Date(stat.mtime).toISOString().slice(0, 10);
    const last = (f in existing) ? (mod > existing[f] ? mod : existing[f]) : today;
    return `  <url>\n    <loc>${BASE}${f}</loc>\n    <lastmod>${last}</lastmod>\n`
         + `    <changefreq>${FREQ[f] || 'yearly'}</changefreq>\n`
         + `    <priority>${PRIORITY[f] || '0.3'}</priority>\n  </url>`;
  }).join('\n\n');

  write('sitemap.xml',
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n'
    + urls + '\n\n</urlset>\n');
  sitemapMsg = `${onDisk.length} URLs` +
    (added.length ? `, ${added.length} added` : '') +
    (gone.length  ? `, ${gone.length} removed` : '');
}

/* ── report ── */
console.log(`
  Site synced.

    Windows apps      ${COUNTS['win-total']}  (${COUNTS['win-live']} live, ${COUNTS['win-soon']} coming soon)
    Android apps      ${COUNTS['and-total']}  (${COUNTS['and-live']} live, ${COUNTS['and-soon']} coming soon)
    Total published   ${COUNTS['total']}

    Counts updated    ${countEdits} page${countEdits === 1 ? '' : 's'}
    Google app data   ${nWin} Windows + ${nAnd} Android entries
    Sitemap           ${sitemapMsg}
`);
