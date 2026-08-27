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
/* must stay identical to slug() in gen-app-pages.js */
const baseSlug = n => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
let DUPE_SLUGS = new Set();          // filled once both catalogues are read
const appSlug = (name, platform) => {
  const b = baseSlug(name);
  return (platform === 'Android' && DUPE_SLUGS.has(b)) ? b + '-android' : b;
};

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
  artgenstudio:'DesignApplication', dreammintai:'MultimediaApplication',
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
DUPE_SLUGS = (() => {
  const w = new Set(win.map(a => baseSlug(a.name))), d = new Set();
  for (const a of and) if (w.has(baseSlug(a.name))) d.add(baseSlug(a.name));
  return d;
})();
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

  /* Each application now has its own canonical page carrying the full
     SoftwareApplication entity. Repeating all of it here would duplicate those
     entities across two URLs and add ~70 KB to the page, so the catalogue
     publishes the Google-documented summary pattern instead: a list that points
     at the detail pages. */
  const platform = /android/i.test(file) ? 'Android' : 'Windows';
  const items = apps
    .filter(a => a.status === 'live')
    .map((a, i) => ({
      '@type': 'ListItem', position: i + 1,
      name: a.name,
      url: 'https://hasnainstudiox.com/apps/' + appSlug(a.name, platform) + '.html'
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


/* ── 3. pre-render the catalogue, then rebuild the sitemap ──────────────
   The catalogue is written into the HTML as static markup, because Bing,
   DuckDuckGo and the AI crawlers do not execute JavaScript. Then the sitemap
   is regenerated from what is actually on disk. */
let sitemapMsg = '';
{
  const _log = console.log;
  console.log = (...a) => { sitemapMsg += '    ' + a.join(' ').trim() + '\n'; };
  try {

    /* ── app landing pages (apps/<slug>.html), one per live application ── */
    require('./gen-app-pages.js');

    (function(){
    /* HSX pre-render: emits the app grid + a full text app directory as static HTML
       so non-JS crawlers (Bing, GPTBot, ClaudeBot, PerplexityBot) see the catalogue. */
    const fs = require('fs');
    const ROOT = __dirname;
    const P = f => ROOT + '/' + f;

    function grab(src, startRe, endLiteral) {
      const m = src.match(startRe);
      if (!m) throw new Error('block not found: ' + startRe);
      const from = m.index + m[0].length;
      const end = src.indexOf(endLiteral, from);
      if (end < 0) throw new Error('end not found for ' + startRe);
      return src.slice(from, end);
    }
    function ico(d){ return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+d+'</svg>'; }
    const esc = s => String(s).replace(/&(?![a-zA-Z#0-9]+;)/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const escAttr = s => String(s).replace(/&(?![a-zA-Z#0-9]+;)/g,'&amp;').replace(/"/g,'&quot;');
    // internal privacy links must be relative + on the canonical host
    const rel = u => !u ? '' : String(u).replace(/^https?:\/\/(www\.)?hasnainstudiox\.com\//,'');

    function build(file) {
      let src = fs.readFileSync(P(file), 'utf8');

      const APPS  = eval('[' + grab(src, /const APPS = \[/, '\n        ];') + ']');
      const CATS  = eval('[' + grab(src, /var CATS = \[/, '\n        ];') + ']');
      const CATMAP= eval('({' + grab(src, /var CATMAP = \{/, '\n        };') + '})');
      const MOTIF = eval('({' + grab(src, /var MOTIF = \{/, '\n        };') + '})');
      const MF = '<svg viewBox="0 0 40 40" class="m-gen" aria-hidden="true">'
               + '<rect class="s" x="7" y="7" width="26" height="26" rx="3"/>'
               + '<circle class="sf gl px" cx="20" cy="20" r="4"/></svg>';
      const STORE_FALLBACK = 'https://apps.microsoft.com/search/publisher?name=Hasnain+Studio+X';

      APPS.forEach((a,i)=>{ if(!a.storeUrl){a.storeUrl=STORE_FALLBACK;} a.cat=CATMAP[a.id]||'system'; a.no=('00'+(i+1)).slice(-3); });

      const viz = a => '<div class="app-logo ">' + (MOTIF[a.id]||MF) + '</div>';

      /* Static tile: byte-identical to the JS tile, except the Details control is a
         real anchor to the app's privacy page so it works without JS and so the
         79 policy pages stop being orphans. JS re-renders it to a modal button. */
      function tile(a){
        const soon = a.status === 'soon';
        const ext  = a.storeUrl.indexOf('http') === 0;
        const priv = rel(a.privacyUrl);
        return '<article class="app-tile c-'+a.cat+'" role="listitem" tabindex="0" data-id="'+a.id+'"'
          + ' aria-label="'+escAttr(a.name+' — '+a.tagline)+'">'
          + '<div class="tile-in">'
          +   '<div class="tile-top">'+viz(a)
          +     '<div class="tile-name">'+esc(a.name)+(soon?' <span class="badge-soon">Soon</span>':'')+'</div>'
          +     '<div class="tile-num">'+a.no+'</div>'
          +   '</div>'
          +   '<div class="tile-tagline">'+esc(a.tagline)+'</div>'
          +   '<div class="tile-footer">'
          +     '<i class="tile-dot'+(soon?' soon':'')+'"></i>'+(soon?'In development':'Available')
          +     '<span class="tile-acts">'
          +       (priv ? '<a class="tile-btn tile-btn-details" href="'+priv+'" aria-label="'+escAttr('Details and privacy policy for '+a.name)+'">Details</a>' : '')
          +       '<a class="tile-btn tile-btn-get" href="'+a.storeUrl+'"'+(ext?' target="_blank" rel="noopener"':'')
          +         ' aria-label="'+escAttr(a.storeLabel+' — '+a.name)+'">'+(soon?'Notify':'Get')+' &rarr;</a>'
          +     '</span>'
          +   '</div>'
          + '</div></article>';
      }

      const FLAT = APPS.length < 8;
      let grid;
      if (FLAT) {
        grid = '<div class="apps-grid" role="list">'+APPS.map(tile).join('')+'</div>';
      } else {
        let shown = 0;
        grid = CATS.map((c,ci)=>{
          const items = APPS.filter(a=>a.cat===c.k);
          if(!items.length) return '';
          shown++;
          return '<section class="cat-sec">'
            + '<div class="cat-head"><span class="cat-idx">'+('00'+(ci+1)).slice(-3)+'</span>'
            + '<h2>'+esc(c.t)+'</h2><span class="cat-rule"></span><span class="cat-cnt">'+items.length+'</span></div>'
            + '<div class="apps-grid" role="list">'+items.map(tile).join('')+'</div>'
            + '</section>';
        }).join('');
      }

      /* ---- full-text directory: permanent, JS never touches it ---- */
      const platform = file.indexOf('android') === 0 ? 'Android' : 'Windows';
      const store = platform === 'Android' ? 'Google Play' : 'the Microsoft Store';
      const byCat = CATS.map(c=>({c, items: APPS.filter(a=>a.cat===c.k)})).filter(x=>x.items.length);
      const dirBody = byCat.map(({c,items})=>
          '<div class="dir-group">'
        + '<h2 class="dir-cat">'+esc(c.t)+'</h2>'
        + '<p class="dir-cat-desc">'+esc(c.d||'')+'</p>'
        + items.map(a=>{
            const priv = rel(a.privacyUrl);
            const soon = a.status === 'soon';
            return '<article class="dir-app" id="app-'+a.id+'">'
              + '<h3 class="dir-app-name">'+esc(a.name)+(soon?' <span class="dir-soon">In development</span>':'')+'</h3>'
              + '<p class="dir-tagline">'+esc(a.tagline)+'</p>'
              + '<p class="dir-desc">'+esc(a.description||'')+'</p>'
              + (a.features&&a.features.length ? '<ul class="dir-features">'+a.features.map(f=>'<li>'+esc(f)+'</li>').join('')+'</ul>' : '')
              + '<p class="dir-links">'
              +   ((()=>{ const s = appSlug(a.name, platform);
                      return fs.existsSync(P('apps/'+s+'.html'))
                        ? '<a href="apps/'+s+'.html">'+esc(a.name)+' details</a> <span class="dir-sep">·</span> ' : ''; })())
              +   '<a href="'+a.storeUrl+'" target="_blank" rel="noopener">'+esc(a.storeLabel||'View on store')+'</a>'
              +   (priv ? ' <span class="dir-sep">·</span> <a href="'+priv+'">'+esc(a.name)+' privacy policy</a>' : '')
              + '</p></article>';
          }).join('')
        + '</div>').join('');

      const directory =
          '\n            <!--APPS_DIRECTORY_START-->\n'
        + '            <section class="section app-directory" id="app-directory" aria-labelledby="app-directory-title">\n'
        + '              <h2 id="app-directory-title">Full '+platform+' app directory</h2>\n'
        + '              <p class="dir-intro">Every '+platform+' application published by Hasnain Studio X on '+store+', with what it does and a direct link to its privacy policy. All '+APPS.length+' entries below are plain text and always available — no JavaScript required.</p>\n'
        + '              ' + dirBody + '\n'
        + '            </section>\n'
        + '            <!--APPS_DIRECTORY_END-->\n';

      /* ---- inject ---- */
      // wipe any previous static block so re-running never nests output
      src = src.replace(/<!--APPS_STATIC_START-->[\s\S]*?<!--APPS_STATIC_END-->\s*/g, '');
      const gridRe = /(<div id="apps-grid"[^>]*>)\s*(<\/div>)/;
      if(!gridRe.test(src)) throw new Error('grid host not found (or not empty) in '+file);
      src = src.replace(gridRe, (m,openTag,closeTag)=>
          openTag + '\n<!--APPS_STATIC_START-->' + grid + '<!--APPS_STATIC_END-->\n            ' + closeTag);

      // remove any previous directory then insert before </main>
      src = src.replace(/\n?\s*<!--APPS_DIRECTORY_START-->[\s\S]*?<!--APPS_DIRECTORY_END-->\n?/,'\n');
      src = src.replace('</main>', directory + '        </main>');

      fs.writeFileSync(P(file), src, 'utf8');
      const staticText = (()=> {
        const b = src.split('<body')[1].replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'');
        return b.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().length;
      })();
      console.log(file+': '+APPS.length+' apps pre-rendered, static body text now '+staticText+' chars');
      return APPS;
    }

    build("Windows-apps.html");
    build("android-apps.html");

    })();

    (function(){
    /* One sitemap. Pages + the AI Studio gallery images, in a single file.
       85 URLs — the sitemap limit is 50,000, so an index file would add nothing. */
    const fs = require('fs'), path = require('path');
    const ROOT = __dirname, P = f => path.join(ROOT, f);
    const BASE = 'https://hasnainstudiox.com/';
    const read = f => fs.readFileSync(P(f), 'utf8');
    const iso  = f => new Date(fs.statSync(P(f)).mtime).toISOString().slice(0, 10);

    const SKIP = new Set(['card.html', 'qx-link.html', '404.html',
  // search engine ownership-verification pages - must exist, must not be indexed
  'naverebef151fc79df23c57d36c70e3b933cf.html', 'yandex_ec0348fbe6310d9f.html']);
    const PRIORITY = { 'index.html':'1.0','Windows-apps.html':'0.9','android-apps.html':'0.9',
                       'HSXAIstudio.html':'0.8','about.html':'0.8','contact.html':'0.7','privacy-policies.html':'0.6','contest-rules.html':'0.5' };
    const FREQ = { 'index.html':'weekly','Windows-apps.html':'weekly','android-apps.html':'weekly',
                   'HSXAIstudio.html':'monthly','about.html':'monthly','contact.html':'monthly','privacy-policies.html':'monthly','contest-rules.html':'monthly' };

    const rootPages = fs.readdirSync(ROOT)
      .filter(f => f.endsWith('.html') && !f.startsWith('_') && !SKIP.has(f))
      .filter(f => !/name="robots"[^>]*noindex/i.test(read(f)))
      .sort((a,b) => (+(PRIORITY[b]||0.3)) - (+(PRIORITY[a]||0.3)) || a.localeCompare(b));

    /* the policies live in privacy/; the root files are redirect stubs */
    let privPages = [];
    try {
      privPages = fs.readdirSync(path.join(ROOT, 'privacy'))
        .filter(f => f.endsWith('.html')).map(f => 'privacy/' + f)
        .filter(f => !/name="robots"[^>]*noindex/i.test(read(f))).sort();
    } catch (e) { /* no privacy/ folder */ }


    /* the dedicated application pages under apps/ */
    let appPages = [];
    try {
      appPages = fs.readdirSync(path.join(ROOT, 'apps'))
        .filter(f => f.endsWith('.html'))
        .map(f => 'apps/' + f)
        .filter(f => !/name="robots"[^>]*noindex/i.test(read(f)))
        .sort();
    } catch (e) { /* no apps/ folder yet */ }

    const pages = rootPages.concat(privPages, appPages);

    const esc = s => String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    /* gallery images ride along on the AI Studio URL */
    let imgs = [];
    try {
      const gd = read('gallery-data.js');
      imgs = JSON.parse(gd.slice(gd.indexOf('['), gd.lastIndexOf(']') + 1)).filter(i => i && i.src);
    } catch (e) { console.log('  ! gallery-data.js not parsed:', e.message); }

    const urls = pages.map(f => {
      const extra = (f === 'HSXAIstudio.html')
        ? imgs.map(i => `    <image:image>\n      <image:loc>${BASE}${esc(i.src)}</image:loc>\n`
            + `      <image:title>${esc(i.title || '')}</image:title>\n    </image:image>`).join('\n') + (imgs.length ? '\n' : '')
        : '';
      const isApp = f.startsWith('apps/');
      return `  <url>\n    <loc>${BASE}${f}</loc>\n    <lastmod>${iso(f)}</lastmod>\n`
           + `    <changefreq>${FREQ[f] || (isApp ? 'monthly' : 'yearly')}</changefreq>\n    <priority>${PRIORITY[f] || (isApp ? '0.7' : '0.3')}</priority>\n`
           + extra + `  </url>`;
    }).join('\n\n');

    fs.writeFileSync(P('sitemap.xml'),
      '<?xml version="1.0" encoding="UTF-8"?>\n'
      + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
      + '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n\n'
      + urls + '\n\n</urlset>\n', 'utf8');

    console.log(`  sitemap.xml   ${pages.length} pages (${appPages.length} app, ${privPages.length} policy), ${imgs.length} images`);

    })();
  } catch (e) {
    sitemapMsg += '    ! build step failed: ' + e.message + '\n';
  }
  console.log = _log;
}
sitemapMsg = '\n' + sitemapMsg.replace(/\n$/, '');




/* ── 3b. privacy policy index: rebuild from the files on disk ─────────────
   Add a policy page and it appears here, in the count, and in the page's
   ItemList structured data, with no hand editing. */
function syncPolicyIndex() {
  const file = 'privacy-policies.html';
  if (!fs.existsSync(P(file))) return '';
  let s = read(file);
  if (!/<!--POLICIES_START-->/.test(s)) return '  ! privacy-policies.html markers not found';

  const pages = fs.readdirSync(path.join(ROOT, 'privacy'))
    .filter(f => f.endsWith('.html'))
    .filter(f => !/HSX:RENAME-REDIRECT/.test(read('privacy/' + f)))
    .map(f => {
      const t = (read('privacy/' + f).match(/<title>([\s\S]*?)<\/title>/) || [, f])[1];
      return { file: 'privacy/' + f, name: t.replace(/\s+/g, ' ').replace(/\s*-\s*Privacy Policy.*$/i, '').trim() };
    })
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  const items = pages
    .map(p2 => `\n                    <li><a href="${p2.file}">${p2.name}</a></li>`)
    .join('') + '\n                ';
  s = s.replace(/(<!--POLICIES_START-->)[\s\S]*?(<!--POLICIES_END-->)/, (m, a, b) => a + items + b);
  s = s.replace(/(<!--PCOUNT-->)\d*(<!--\/PCOUNT-->)/, (m, a, b) => a + pages.length + b);
  s = s.replace(/(Choose the app you are using[\s\S]{0,400}?)/, m => m);

  // keep the ItemList structured data in step
  const block2 = s.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (block2) {
    try {
      const d = JSON.parse(block2[1]);
      for (const node of (d['@graph'] || [])) {
        if (node.mainEntity && node.mainEntity['@type'] === 'ItemList') {
          node.mainEntity.numberOfItems = pages.length;
          node.mainEntity.itemListElement = pages.map((p2, i) => ({
            '@type': 'ListItem', position: i + 1,
            name: p2.name + ' privacy policy',
            url: 'https://hasnainstudiox.com/' + p2.file
          }));
        }
      }
      s = s.slice(0, block2.index) + '<script type="application/ld+json">\n'
        + JSON.stringify(d, null, 2) + '\n    </script>'
        + s.slice(block2.index + block2[0].length);
    } catch (e) { /* leave the schema alone if it will not parse */ }
  }
  write(file, s);
  return `  policy index          ${pages.length} policies`;
}
/* ── 3b. app id -> landing page map, consumed by the catalogue modal ──── */
function syncAppPages() {
  const map = {};
  for (const [apps, platform] of [[win, 'Windows'], [and, 'Android']])
    for (const a of apps) {
      const s = appSlug(a.name, platform);
      if (fs.existsSync(P('apps/' + s + '.html'))) map[a.id] = 'apps/' + s + '.html';
    }
  let n = 0;
  for (const file of ['Windows-apps.html', 'android-apps.html']) {
    let s = read(file);
    const re = /\/\*APPPAGES_START\*\/[\s\S]*?\/\*APPPAGES_END\*\//;
    if (!re.test(s)) { console.log('  ! ' + file + ' APPPAGES marker not found'); continue; }
    const own = {};
    for (const a of (file === 'Windows-apps.html' ? win : and)) if (map[a.id]) own[a.id] = map[a.id];
    s = s.replace(re, '/*APPPAGES_START*/ var APPPAGES = ' + JSON.stringify(own) + '; /*APPPAGES_END*/');
    write(file, s);
    n += Object.keys(own).length;
  }
  return '  app page links       ' + n + ' modal buttons';
}
const appPagesMsg = syncAppPages();
if (appPagesMsg) sitemapMsg += '\n' + appPagesMsg;

/* ── 3c. static gallery, so non-JavaScript crawlers read the artwork ───── */
function syncGalleryStatic() {
  const file = 'HSXAIstudio.html';
  if (!fs.existsSync(P(file))) return '';
  let s = read(file);
  if (!/<!--GALLERY_STATIC_START-->/.test(s)) return '  ! HSXAIstudio.html gallery marker not found';

  let items = [];
  try {
    const gd = read('gallery-data.js');
    items = JSON.parse(gd.slice(gd.indexOf('['), gd.lastIndexOf(']') + 1)).filter(i => i && i.src);
  } catch (e) { return '  ! gallery-data.js not parsed: ' + e.message; }

  let REG = {};
  try {
    const m = s.match(/var APPREG = \{/);
    const from = m.index + m[0].length;
    REG = eval('({' + s.slice(from, s.indexOf('\n        };', from)) + '})');
  } catch (e) { console.log('  ! APPREG not parsed: ' + e.message); }

  const e = t => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const altFor = (i, appName) => {
    const bits = [i.title, i.desc].filter(Boolean).join(' - ');
    return bits ? `${bits}, generated with ${appName}` : `AI artwork generated with ${appName}`;
  };

  const cards = items.map(i => {
    const app = REG[String(i.tag || '').toLowerCase()];
    const name = app ? app.name : 'Hasnain Studio X';
    const webp = i.src.replace(/\.[a-z0-9]+$/i, '.webp');
    return `
                <li class="gs-item">
                    <figure>
                        <picture>
                            <source srcset="${e(webp)}" type="image/webp"/>
                            <img src="${e(i.src)}" width="${i.w || ''}" height="${i.h || ''}" loading="lazy" decoding="async"
                                 alt="${e(altFor(i, name))}"/>
                        </picture>
                        <figcaption>
                            <h3>${e(i.title || 'Untitled')}</h3>
                            <p class="gs-desc">${e(i.desc || '')}</p>
                            <p class="gs-app">Made with ${app && app.store
                              ? `<a href="${e(app.store)}" target="_blank" rel="noopener">${e(name)}</a>`
                              : e(name)}${app && app.blurb ? ' &mdash; ' + e(app.blurb) : ''}</p>
                        </figcaption>
                    </figure>
                </li>`;
  }).join('');

  const block = `<!--GALLERY_STATIC_START-->
            <div class="gal-static" id="gal-static">
              <h3 class="gs-head">Every piece in this gallery</h3>
              <p class="gs-sub">${items.length} artworks, each generated on a Windows PC with a Hasnain Studio X application. No cloud render, no external service, no upload.</p>
              <ul class="gs-list">${cards}
              </ul>
            </div>
            <!--GALLERY_STATIC_END-->`;
  s = s.replace(/<!--GALLERY_STATIC_START-->[\s\S]*?<!--GALLERY_STATIC_END-->/, block);

  /* ImageObject nodes so the artwork can be understood, not just crawled */
  const blk = s.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (blk) {
    try {
      const d = JSON.parse(blk[1]);
      const g = d['@graph'] || [];
      const keep = g.filter(n => n['@type'] !== 'ImageObject');
      for (const i of items) {
        const app = REG[String(i.tag || '').toLowerCase()];
        keep.push({
          '@type': 'ImageObject',
          '@id': 'https://hasnainstudiox.com/HSXAIstudio.html#' + i.src.replace(/[^a-z0-9]+/gi, '-'),
          contentUrl: 'https://hasnainstudiox.com/' + i.src,
          name: i.title, description: i.desc,
          width: i.w || undefined, height: i.h || undefined,
          license: 'https://hasnainstudiox.com/HSXAIstudio.html#image-licence',
          creditText: 'Hasnain Studio X',
          creator: { '@id': 'https://hasnainstudiox.com/#organization' },
          copyrightNotice: 'Hasnain Studio X',
          acquireLicensePage: 'https://hasnainstudiox.com/contact.html',
          isPartOf: { '@id': 'https://hasnainstudiox.com/HSXAIstudio.html#webpage' },
          creativeWorkStatus: app ? 'Generated with ' + app.name : undefined
        });
      }
      d['@graph'] = keep;
      s = s.slice(0, blk.index) + '<script type="application/ld+json">\n'
        + JSON.stringify(d, null, 2) + '\n    </script>' + s.slice(blk.index + blk[0].length);
    } catch (err) { /* leave the schema alone if it will not parse */ }
  }

  /* keep the visible subhead truthful about which apps produced the artwork */
  const usedApps = [...new Set(items.map(i => (REG[String(i.tag || '').toLowerCase()] || {}).name).filter(Boolean))];
  if (usedApps.length) {
    const list = usedApps.length === 1 ? usedApps[0]
      : usedApps.slice(0, -1).join(', ') + ' and ' + usedApps[usedApps.length - 1];
    s = s.replace(/(<p class="gal-sub">)[\s\S]*?(<\/p>)/,
      (m, a, b2) => a + 'Generated locally with ' + list + '. No cloud render, no external service, no upload.' + b2);
  }

  write(file, s);
  return '  gallery (static)      ' + items.length + ' artworks pre-rendered';
}
const galStaticMsg = syncGalleryStatic();
if (galStaticMsg) sitemapMsg += '\n' + galStaticMsg;

/* ── 3d. prompt guide, rendered as a tabbed panel on the AI Studio page ── */
function syncPromptGuide() {
  const file = 'HSXAIstudio.html';
  const src  = 'articles-src/prompt-guide.html';
  if (!fs.existsSync(P(file)) || !fs.existsSync(P(src))) return '';
  let s = read(file);
  if (!/<!--PROMPTGUIDE_START-->/.test(s)) return '  ! HSXAIstudio.html prompt-guide marker not found';

  const body = read(src);
  const e = t => String(t == null ? '' : t).replace(/&(?![a-z#0-9]+;)/gi, '&amp;')
                   .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* split on the section headings; each becomes one tab */
  const parts = [];
  const re = /<h2 id="([^"]+)" data-tab="([^"]+)">([\s\S]*?)<\/h2>/g;
  let m, last = null;
  while ((m = re.exec(body))) {
    if (last) last.html = body.slice(last.end, m.index).trim();
    last = { id: m[1], tab: m[2], title: m[3].trim(), end: re.lastIndex };
    parts.push(last);
  }
  if (last) last.html = body.slice(last.end).trim();
  if (!parts.length) return '  ! prompt-guide.html has no tabbed sections';

  const tabs = parts.map((p2, i) => `
                    <button type="button" role="tab" class="pg-tab" id="pgt-${e(p2.id)}"
                            aria-controls="pgp-${e(p2.id)}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">
                        <span class="pg-tab-n">${String(i + 1).padStart(2, '0')}</span>
                        <span class="pg-tab-l">${e(p2.tab)}</span>
                    </button>`).join('');

  const panels = parts.map((p2, i) => `
                <div role="tabpanel" class="pg-panel" id="pgp-${e(p2.id)}"
                     aria-labelledby="pgt-${e(p2.id)}">
                    <h3>${p2.title}</h3>
${p2.html.split('\n').map(l => '                    ' + l).join('\n')}
                </div>`).join('\n');

  const block = `<!--PROMPTGUIDE_START-->
        <section class="section reveal" id="prompt-guide" aria-labelledby="pg-title">
            <div class="section-header">
                <div class="hero-eyebrow">Making images</div>
                <h2 id="pg-title">How to write better prompts</h2>
                <p class="gal-sub">Eight things that make the difference, one at a time. Pick a topic.</p>
            </div>
            <div class="pg-wrap">
                <script>document.currentScript.parentNode.classList.add('pg-js');</script>
                <div class="pg-tabs" role="tablist" aria-label="Prompt guide topics">${tabs}
                </div>
                <div class="pg-body art-body">${panels}
                </div>
            </div>
        </section>
        <!--PROMPTGUIDE_END-->`;

  s = s.replace(/<!--PROMPTGUIDE_START-->[\s\S]*?<!--PROMPTGUIDE_END-->/, block);
  write(file, s);
  return '  prompt guide          ' + parts.length + ' topics';
}
const pgMsg = syncPromptGuide();
if (pgMsg) sitemapMsg += '\n' + pgMsg;

/* ── 3e. terminal `apps` command, generated from the catalogue ─────────── */
function syncTerminalApps() {
  const file = 'effects.js';
  if (!fs.existsSync(P(file))) return '';
  let s = read(file);
  if (!/\/\*TERMAPPS_START\*\//.test(s)) return '  ! effects.js TERMAPPS marker not found';

  const q = t => "'" + String(t).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  const nameList = a => a.map(x => x.name).sort((x, y) => x.localeCompare(y)).join(', ');
  const line = (t, cls) => "                print(" + q(t) + ", " + q(cls || '') + ");";

  const wl = live(win), ws = soon(win), al = live(and), as = soon(and);
  const CATN = { system: 'System & performance', media: 'Audio & video', creative: 'Creative & documents',
                 ai: 'AI tools', explore: 'Games & explore', files: 'Files & transfer' };
  let CM = {};
  try {
    const src = read('Windows-apps.html');
    const m = src.match(/var CATMAP = \{/);
    CM = eval('({' + src.slice(m.index + m[0].length, src.indexOf('\n        };', m.index)) + '})');
  } catch (e) { /* fall back to one flat list */ }

  const groups = {};
  for (const a of wl) (groups[CATN[CM[a.id]] || 'Other'] = groups[CATN[CM[a.id]] || 'Other'] || []).push(a.name);

  const out = [
    line('Hasnain Studio X - ' + (wl.length + al.length) + ' applications live, '
         + (ws.length + as.length) + ' in development', 'ok'),
    line(''),
    line('WINDOWS (' + wl.length + ')', 'warn'),
    ...Object.keys(groups).sort().map(g =>
      line('  ' + g + ': ' + groups[g].sort((x, y) => x.localeCompare(y)).join(', '))),
    line(''),
    line('ANDROID (' + al.length + ')', 'warn'),
    line('  ' + al.map(x => x.name).sort((x, y) => x.localeCompare(y)).join(', ')),
    line(''),
    line('In development: ' + (ws.length + as.length) + ' more. Full catalogue at hasnainstudiox.com', '')
  ].filter(Boolean).join('\r\n');

  const nl = s.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
  s = s.replace(/\/\*TERMAPPS_START\*\/[\s\S]*?\/\*TERMAPPS_END\*\//,
    '/*TERMAPPS_START*/' + nl + out.split('\r\n').join(nl) + nl + '                /*TERMAPPS_END*/');
  write(file, s);
  return '  terminal catalogue    ' + (wl.length + al.length) + ' live, ' + (ws.length + as.length) + ' coming';
}
const termMsg = syncTerminalApps();
if (termMsg) sitemapMsg += '\n' + termMsg;

/* ── 3f. one footer product list on every page, and no retired app names ── */
function syncFooters() {
  const WANT = ['Windows-apps.html|Windows Apps', 'android-apps.html|Android Apps', 'HSXAIstudio.html|AI Studio'];
  /* names that used to appear in hand-written copy and are not real products */
  const RETIRED = ['HSX PC Tune', 'HSX PC Guard', 'HSX Seasons', 'HSX Spatia', 'HSX VAudio',
                   'HSX FlipStudio', 'HSX NimbusDock', 'HSX QuantumDrop', 'SpatiaX Mobile',
                   'InHasnain Studio X'];
  let fixed = 0, flagged = [];
  const walkDir = d => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      if (ent.name.startsWith('_') || ['.git', '.github', 'articles-src'].includes(ent.name)) continue;
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) { walkDir(p); continue; }
      if (!ent.name.endsWith('.html')) continue;
      let s = fs.readFileSync(p, 'utf8');
      if (s.includes('HSX:PRIVACY-REDIRECT')) continue;
      const up = path.relative(ROOT, d) ? '../' : '';
      const want = WANT.map(x => { const [h, l] = x.split('|');
        return '<li><a href="' + up + h + '">' + l + '</a></li>'; })
        .join('\n                            ');
      const re = /(<h2 class="footer-heading">Products<\/h2>\s*<ul class="footer-links">)([\s\S]*?)(<\/ul>)/;
      const m = s.match(re);
      if (m && m[2].trim() !== want) {
        s = s.replace(re, (_, a, b, c) => a + '\n                            ' + want + '\n                        ' + c);
        fs.writeFileSync(p, s, 'utf8'); fixed++;
      }
      for (const bad of RETIRED)
        if (s.includes(bad)) flagged.push(path.relative(ROOT, p) + ' -> "' + bad + '"');
    }
  };
  walkDir(ROOT);
  let msg = '  footers               ' + (fixed ? fixed + ' normalised' : 'consistent');
  if (flagged.length) msg += '\n  ! RETIRED APP NAME    ' + flagged.slice(0, 5).join('; ')
                           + (flagged.length > 5 ? ' (+' + (flagged.length - 5) + ' more)' : '');
  return msg;
}
const footerMsg = syncFooters();
if (footerMsg) sitemapMsg += '\n' + footerMsg;

/* ── 3g. the studio's trademark register, on the About page ───────────── */
function syncTrademarks() {
  const file = 'about.html';
  if (!fs.existsSync(P(file))) return '';
  let s = read(file);
  if (!/<!--TRADEMARKS_START-->/.test(s)) return '  ! about.html trademark marker not found';

  const COINED = ['NovaDiffux', 'NanoCodify', 'NanoVisuality', 'PhotoVidix', 'Pocktium',
    'Promptalon', 'TerraOrbitix', 'Hypersonus', 'VisionBulwark', 'Pixumbra', 'QuantumDrop',
    'SpatiaX', 'XSeasons', 'Automafy', 'CastVisuality', 'FotoTensor', 'GameFabrix',
    'InfiniteGen', 'MediaLucent', 'DocClarity', 'DreamVivid', 'LaunchHarbor', 'SenseCapture',
    'KatanicOS', 'MoneyHalo', 'VectalonOS', 'SolsticeOS', 'XCipher', 'NimbusDock', 'DocMento',
    'ExeCrafter', 'SpillFrame', 'EarthShell', 'AstraMorph', 'VDroidX', 'DreamMint'];
  const nm = t => String(t).toLowerCase().replace(/[^a-z0-9]/g, '');
  const apps = win.concat(and);
  const other = [...new Set(apps
    .filter(a => !COINED.some(c => nm(a.name).includes(nm(c))))
    .map(a => a.name))].sort((a, b) => a.localeCompare(b));
  const coined = COINED.slice().sort((a, b) => a.localeCompare(b));
  const e = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const block = `<!--TRADEMARKS_START-->
        <section class="section" aria-labelledby="tm-title">
            <div class="section-header">
                <h2 id="tm-title">Trademarks</h2>
                <p>The following marks are used by Hasnain Studio X in relation to its software.</p>
            </div>

            <h3 class="tm-sub">Coined marks</h3>
            <p class="tm-lead">Invented terms originated by the studio. Each is used as a trademark in
            product names and is claimed as an unregistered mark of Hasnain Studio X.</p>
            <ul class="tm-list">${coined.map(c => `
                <li>${e(c)}&trade;</li>`).join('')}
            </ul>

            <h3 class="tm-sub">Product marks</h3>
            <p class="tm-lead">Product names used as trademarks of Hasnain Studio X.</p>
            <ul class="tm-list tm-list--wide">${other.map(o => `
                <li>${e(o)}&trade;</li>`).join('')}
            </ul>

            <p class="tm-note"><strong>Hasnain Studio X&reg;</strong> is a registered trademark.
            All other marks shown on this page are unregistered trademarks used
            by the studio; the &trade; symbol asserts those rights and does not indicate registration.
            Any third-party names mentioned elsewhere on this site are the property of their
            respective owners.</p>
        </section>
        <!--TRADEMARKS_END-->`;
  s = s.replace(/<!--TRADEMARKS_START-->[\s\S]*?<!--TRADEMARKS_END-->/, block);

  /* the same register, machine-readable, on the Organization node */
  const blk = s.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (blk) {
    try {
      const d = JSON.parse(blk[1]);
      for (const node of d['@graph'] || [])
        if (node['@type'] === 'Organization')
          node.brand = coined.concat(other).map(n => ({ '@type': 'Brand', name: n }));
      s = s.slice(0, blk.index) + '<script type="application/ld+json">\n'
        + JSON.stringify(d, null, 2) + '\n    </script>' + s.slice(blk.index + blk[0].length);
    } catch (e) { /* leave the schema alone if it will not parse */ }
  }
  write(file, s);
  return '  trademark register    ' + coined.length + ' coined + ' + other.length + ' product marks';
}
const tmMsg = syncTrademarks();
if (tmMsg) sitemapMsg += '\n' + tmMsg;

/* ── 3h. every policy also answers at its root URL ─────────────────────────
   Store listings point at the root form (hasnainstudiox.com/XPrivacy.html).
   Those URLs serve the full policy text plus an instant redirect to the
   canonical copy in privacy/, so a certification checker that does not follow
   the redirect still reads a complete policy. Regenerated every build so a new
   or renamed policy can never be missing its root URL. ─────────────────── */
function syncPrivacyStubs() {
  const dir = path.join(ROOT, 'privacy');
  if (!fs.existsSync(dir)) return '';
  const MARK = '<!--HSX:PRIVACY-REDIRECT-->';
  let written = 0, skipped = 0;

  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.html'))) {
    const full = read('privacy/' + f);
    if (/HSX:RENAME-REDIRECT/.test(full)) { skipped++; continue; }   // retired name
    const target = 'privacy/' + f;
    const title = (full.match(/<title>([^<]*)<\/title>/) || [, f])[1];
    const m = full.match(/<main[\s\S]*?<\/main>/);
    const inner = m ? m[0].replace(/(href|src)="\.\.\//g, '$1="') : '';
    const stub = `<!DOCTYPE html>
<html lang="en-GB">
<head>
${MARK}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="https://hasnainstudiox.com/${target}">
<meta http-equiv="refresh" content="0; url=https://hasnainstudiox.com/${target}">
<link rel="stylesheet" href="site.css"/>
<script>location.replace('https://hasnainstudiox.com/${target}');</script>
</head>
<body>
<p style="font-family:sans-serif;padding:1rem">
  This policy now lives at <a href="https://hasnainstudiox.com/${target}">https://hasnainstudiox.com/${target}</a>.
  The full text is reproduced below.
</p>
${inner}
</body>
</html>
`;
    const at = P(f);
    if (!fs.existsSync(at) || fs.readFileSync(at, 'utf8') !== stub) { fs.writeFileSync(at, stub, 'utf8'); written++; }
  }
  return '  policy root URLs      ' + written + ' written'
       + (skipped ? ', ' + skipped + ' retired name' + (skipped === 1 ? '' : 's') + ' left redirecting' : '');
}
const stubMsg = syncPrivacyStubs();
if (stubMsg) sitemapMsg += '\n' + stubMsg;

/* ── 3i. dateModified must be a full ISO 8601 datetime ──────────────────
   Google reported "Invalid datetime value for 'dateModified'" because the
   value was date-only (2026-08-20). Schema date properties accept a bare
   date, but ProfilePage and Article types want a datetime with an offset.
   Rewritten here for every page, and only when the date actually changes,
   so a rebuild on the same day produces no diff. ────────────────────── */
function syncDateModified() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = now.getUTCFullYear() + '-' + pad(now.getUTCMonth() + 1) + '-' + pad(now.getUTCDate())
    + 'T' + pad(now.getUTCHours()) + ':' + pad(now.getUTCMinutes()) + ':00+00:00';
  const today = stamp.slice(0, 10);
  let fixed = 0, ok = 0;

  const visit = d => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      if (ent.name.startsWith('_') || ['.git', '.github', 'articles-src'].includes(ent.name)) continue;
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) { visit(p); continue; }
      if (!ent.name.endsWith('.html')) continue;
      let s = fs.readFileSync(p, 'utf8');
      if (!/"dateModified"/.test(s)) continue;

      let changed = false;
      s = s.replace(/"dateModified"\s*:\s*"([^"]*)"/g, (m, v) => {
        /* already a valid datetime for today -> leave it alone */
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(v) && v.slice(0, 10) === today) { ok++; return m; }
        changed = true;
        return '"dateModified": "' + stamp + '"';
      });
      if (changed) { fs.writeFileSync(p, s, 'utf8'); fixed++; }
    }
  };
  visit(ROOT);
  return '  dateModified          ' + (fixed ? fixed + ' page' + (fixed === 1 ? '' : 's') + ' stamped ' + stamp
                                             : 'all ' + ok + ' already current');
}
const dateMsg = syncDateModified();
if (dateMsg) sitemapMsg += '\n' + dateMsg;

const policyMsg = syncPolicyIndex();
if (policyMsg) sitemapMsg += '\n' + policyMsg;

/* ── 4. contact form: rebuild the app list from the catalogue ─────────────
   The topic dropdown used to be hand-maintained and had drifted badly:
   pre-rename names, only 19 of 69 Windows apps, and two Windows titles
   filed under Android. It is now generated from the same APPS arrays as
   everything else, alphabetically, so it cannot go stale again. */
function syncContactTopics() {
  const file = 'contact.html';
  if (!fs.existsSync(P(file))) return '';
  let s = read(file);
  const re = /(<!--TOPICS_START-->)[\s\S]*?(<!--TOPICS_END-->)/;
  if (!re.test(s)) return '  ! contact.html markers not found';

  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const group = (label, apps) => {
    if (!apps.length) return '';
    const opts = apps
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(a => `                                        <option>${esc(a.name)}`
                + `${a.status === 'soon' ? ' (coming soon)' : ''}</option>`)
      .join('\n');
    return `                                    <optgroup label="${label}">\n${opts}\n`
         + `                                    </optgroup>\n`;
  };

  const body = '\n' + group('Windows Apps', win) + group('Android Apps', and)
             + '                                    ';
  s = s.replace(re, (m, open, close) => open + body + close);
  write(file, s);
  return `  contact topics        ${win.length} Windows + ${and.length} Android`;
}
const topicsMsg = syncContactTopics();
if (topicsMsg) sitemapMsg += '\n' + topicsMsg;


/* ── 3c. Made With HSX: app picker in the contest entry form ──────────── */
function syncContestApps() {
  const file = 'HSXAIstudio.html';
  if (!fs.existsSync(P(file))) return '';
  let s = read(file);
  const re = /(<!--MWAPPS_START-->)[\s\S]*?(<!--MWAPPS_END-->)/;
  if (!re.test(s)) return '';
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const live = a => a.status === 'live';
  const grp = (label, apps) => apps.length
    ? `                                    <optgroup label="${label}">\n`
      + apps.slice().sort((a, b) => a.name.localeCompare(b.name))
            .map(a => `                                        <option>${esc(a.name)}</option>`).join('\n')
      + `\n                                    </optgroup>\n` : '';
  const body = '\n' + grp('Windows Apps', win.filter(live)) + grp('Android Apps', and.filter(live))
    + '                                    <optgroup label="Other">\n'
    + '                                        <option>More than one app</option>\n'
    + '                                    </optgroup>\n                                ';
  write(file, s.replace(re, (m, a, b) => a + body + b));
  return `  contest app picker    ${win.filter(live).length + and.filter(live).length} live apps`;
}
const contestMsg = syncContestApps();
if (contestMsg) sitemapMsg += '\n' + contestMsg;

/* ── 4. AI Studio gallery: refresh the app registry ──────────────────────
   The showcase filters images by the app that produced them. The names and
   Store links come from the same APPS array as everything else, so a rename
   or a new Store listing propagates here with no second edit. */
function syncGalleryApps() {
  const file = 'HSXAIstudio.html';
  if (!fs.existsSync(P(file))) return '';
  // Explicit list. A loose regex drags in PC TuneX and NimbusDock, which have
  // nothing to do with generated artwork. Add an id here when you ship a new
  // creative tool.
  const AI_APPS = new Set([
    'hsxstudioflow', 'fototensor', 'photovidix', 'novadiffux', 'quantumxai',
    'artgenstudio', 'infinitegenai', 'dreamgenaiultra', 'dreammintai',
    'screenaistudio', 'glowlab', 'image3dx', 'aiscenexultra',
    'astramorphstudio', 'forgexpro', 'pocktium'
  ]);
  const reg = {};
  for (const a of win) {
    if (!AI_APPS.has(a.id)) continue;
    reg[a.id] = {
      name: a.name,
      store: /^https?:/.test(a.storeUrl || '') ? a.storeUrl : '',
      blurb: (a.tagline || '') + '.'
    };
  }
  let s = read(file);
  const re = /(\/\*APPREG_START\*\/)[\s\S]*?(\/\*APPREG_END\*\/)/;
  if (!re.test(s)) return '  ! APPREG markers not found in ' + file;
  s = s.replace(re, (m, open, close) =>
    open + '\n        var APPREG = ' + JSON.stringify(reg, null, 2).replace(/\n/g, '\n        ') + ';\n        ' + close);
  write(file, s);
  return `  gallery app registry  ${Object.keys(reg).length} AI apps`;
}
const galleryMsg = syncGalleryApps();
if (galleryMsg) sitemapMsg += '\n' + galleryMsg;

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
