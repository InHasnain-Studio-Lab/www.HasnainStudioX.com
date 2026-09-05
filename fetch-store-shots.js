#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   Collect the store screenshots for every live application.

   The screenshots on your Store listings are the ones you uploaded, so
   this reads the product ID out of each catalogue entry, asks Microsoft's
   public catalogue service what images that product has, and saves the
   ones marked as screenshots.

     node fetch-store-shots.js            every live Windows app
     node fetch-store-shots.js pixunica   one app, by its catalogue id

   Output: store-shots/<slug>/01.jpg upwards. Already downloaded apps are
   skipped, so it is safe to stop it and run it again.
   ═══════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path'), https = require('https');
const ROOT = __dirname, OUT = path.join(ROOT, 'store-shots');
const MARKET = 'GB', LANG = 'en-gb';

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const baseSlug = n => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function apps() {
  const src = read('Windows-apps.html');
  const block = src.slice(src.indexOf('const APPS = ['), src.indexOf('\n        ];', src.indexOf('const APPS = [')));
  const out = [];
  for (const chunk of block.split(/\n\s*\{\s*\n/)) {
    const id = (chunk.match(/id:\s*'([^']+)'/) || [])[1];
    const name = (chunk.match(/name:\s*'([^']+)'/) || [])[1];
    const store = (chunk.match(/apps\.microsoft\.com\/detail\/([A-Z0-9]+)/) || [])[1];
    const live = /status:\s*'live'/.test(chunk);
    if (id && name && store && live) out.push({ id, name, store, slug: baseSlug(name) });
  }
  return out;
}

const get = (url, binary) => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'HSX-site-build/1.0' } }, res => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      res.resume(); return get(res.headers.location, binary).then(resolve, reject);
    }
    if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
    const parts = [];
    res.on('data', d => parts.push(d));
    res.on('end', () => resolve(binary ? Buffer.concat(parts) : Buffer.concat(parts).toString('utf8')));
  }).on('error', reject);
});

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const only = process.argv[2];
  const list = apps().filter(a => !only || a.id === only || a.slug === only);
  if (!list.length) return console.log('  no matching live application');
  fs.mkdirSync(OUT, { recursive: true });

  let done = 0, skipped = 0, files = 0, failed = [];
  for (const a of list) {
    const dir = path.join(OUT, a.slug);
    if (fs.existsSync(dir) && fs.readdirSync(dir).length) { skipped++; continue; }
    try {
      const url = `https://displaycatalog.mp.microsoft.com/v7.0/products/${a.store}`
                + `?market=${MARKET}&languages=${LANG}&fieldsTemplate=Details`;
      const data = JSON.parse(await get(url, false));
      const imgs = [];
      for (const sku of (data.Product?.LocalizedProperties || [])) {
        for (const im of (sku.Images || [])) {
          if (im.ImagePurpose === 'Screenshot' && im.Uri) {
            imgs.push({ uri: im.Uri.startsWith('//') ? 'https:' + im.Uri : im.Uri, w: im.Width, h: im.Height });
          }
        }
      }
      if (!imgs.length) { failed.push(a.name + ' (no screenshots on the listing)'); continue; }
      fs.mkdirSync(dir, { recursive: true });
      let n = 0;
      for (const im of imgs) {
        n++;
        const buf = await get(im.uri, true);
        fs.writeFileSync(path.join(dir, String(n).padStart(2, '0') + '.jpg'), buf);
        files++;
        await wait(150);
      }
      done++;
      console.log(`  ${a.name}  ${n} screenshot${n === 1 ? '' : 's'}`);
    } catch (e) {
      failed.push(a.name + ' (' + e.message + ')');
    }
    await wait(300);
  }

  console.log(`\n  ${done} application${done === 1 ? '' : 's'} collected, ${files} images`
    + (skipped ? `, ${skipped} already had images` : ''));
  if (failed.length) {
    console.log('\n  not collected:');
    for (const f of failed) console.log('    ' + f);
  }
  console.log('\n  Images are in store-shots/. Tell Claude when this has finished.\n');
})();
