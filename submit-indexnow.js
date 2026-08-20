#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   HASNAIN STUDIO X — IndexNow submission

   Pushes every URL in sitemap.xml to Bing, Yandex, Seznam and Naver in one
   request. Bing usually crawls within minutes instead of waiting for its own
   schedule, so run this after each deploy.

       node submit-indexnow.js          (or double-click submit-indexnow.bat)

   The key file b0acc9d970954ca19f3d76421331a14d.txt must stay in the site root —
   that is how the engines verify you own the domain.
   ═══════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path'), https = require('https');
const ROOT = __dirname;
const KEY  = 'b0acc9d970954ca19f3d76421331a14d';
const HOST = 'hasnainstudiox.com';

const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
if (!urlList.length) { console.error('No URLs found in sitemap.xml'); process.exit(1); }

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
