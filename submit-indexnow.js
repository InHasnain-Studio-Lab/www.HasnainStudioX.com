#!/usr/bin/env node
/* HASNAIN STUDIO X - IndexNow submission

   Pushes every URL in sitemap.xml to Bing, Yandex, Seznam and Naver in one
   request. Bing usually crawls within minutes instead of waiting for its own
   schedule, so run this after each deploy.

       node submit-indexnow.js          (or double-click submit-indexnow.bat)

   The key file b0acc9d970954ca19f3d76421331a14d.txt must stay in the site root -
   that is how the engines verify you own the domain. */
const fs = require('fs'), path = require('path'), https = require('https');
const ROOT = __dirname;
const KEY  = 'b0acc9d970954ca19f3d76421331a14d';
const HOST = 'hasnainstudiox.com';

/* sitemap.xml is an index: its entries are the other sitemaps, not pages.
   Submitting those tells the engines nothing, so follow them down a level
   and collect the pages themselves. */
const locs = file => [...fs.readFileSync(path.join(ROOT, file), 'utf8')
    .matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

const local = url => url.replace(`https://${HOST}/`, '');
const seen = new Set();

for (const entry of locs('sitemap.xml')) {
  const name = local(entry);
  if (!name.endsWith('.xml')) { seen.add(entry); continue; }
  if (!fs.existsSync(path.join(ROOT, name))) {
    console.error(`  ${name} is listed in sitemap.xml but not on disk`);
    continue;
  }
  locs(name).forEach(u => seen.add(u));
}

const urlList = [...seen];
if (!urlList.length) { console.error('No page URLs found in the sitemaps'); process.exit(1); }

const body = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList
});

const req = https.request({
  hostname: 'api.indexnow.org', path: '/IndexNow', method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const ok = res.statusCode === 200 || res.statusCode === 202;
    console.log();
    console.log(`  IndexNow  ->  HTTP ${res.statusCode} ${ok ? '(accepted)' : ''}`);
    console.log(`  ${urlList.length} URLs submitted for ${HOST}`);
    if (!ok) console.log('  response:', d.slice(0, 400));
    console.log();
    if (res.statusCode === 403) console.log('  403 means the key file is not reachable yet. Deploy b0acc9d970954ca19f3d76421331a14d.txt first.');
  });
});
req.on('error', e => console.error('  request failed:', e.message));
req.write(body); req.end();
