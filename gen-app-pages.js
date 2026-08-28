#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   HSX app landing pages — one per live application, generated from the
   APPS arrays that already drive the catalogue, schema and sitemap.

   Output:  apps/<slug>.html
   Privacy policies stay at the site root, untouched, because those URLs
   are registered with the stores and built into shipped software.
   ═══════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const ROOT = __dirname, P = f => path.join(ROOT, f);
const read = f => fs.readFileSync(P(f), 'utf8');
const BASE = 'https://hasnainstudiox.com/';

function grab(src, startRe, endLit) {
  const m = src.match(startRe); if (!m) throw new Error('block not found');
  const from = m.index + m[0].length;
  return src.slice(from, src.indexOf(endLit, from));
}
function ico() { return ''; }

const WIN = eval('[' + grab(read('Windows-apps.html'), /const APPS = \[/, '\n        ];') + ']');
const AND = eval('[' + grab(read('android-apps.html'), /const APPS = \[/, '\n        ];') + ']');
WIN.forEach(a => a.platform = 'Windows');
AND.forEach(a => a.platform = 'Android');
const ALL = WIN.concat(AND);
const LIVE = ALL.filter(a => a.status === 'live');
/* Pre-release apps get a page too, but only once they have genuine copy - a
   placeholder page is worse than no page. They are marked as not yet available
   everywhere it matters, and never carry a download link. */
const hasRealCopy = a => Array.isArray(a.features)
  && a.features.length >= 3
  && !a.features.some(f => /to be announced/i.test(f));
const SOON  = ALL.filter(a => a.status === 'soon' && hasRealCopy(a));
const PAGES = LIVE.concat(SOON);

const baseSlug = n => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/* A few titles ship on both platforms (FlipX Studio). The Windows page keeps the
   plain slug; the Android twin gets -android, so no page ever overwrites another
   and no already-published URL changes. */
const DUPES = (() => {
  const w = new Set(WIN.map(a => baseSlug(a.name))), d = new Set();
  for (const a of AND) if (w.has(baseSlug(a.name))) d.add(baseSlug(a.name));
  return d;
})();
const slug = a => {
  if (typeof a === 'string') return baseSlug(a);
  const b = baseSlug(a.name);
  return (a.platform === 'Android' && DUPES.has(b)) ? b + '-android' : b;
};
const esc  = s => String(s == null ? '' : s)
  .replace(/&(?![a-zA-Z#0-9]+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escA = s => esc(s).replace(/"/g, '&quot;');
const rel  = u => String(u || '').replace(/^https?:\/\/(www\.)?hasnainstudiox\.com\//, '');

/* Category shapes the "who it is for" line and the schema type, so pages in
   different parts of the catalogue do not read identically. */
const CAT = {
  system:   { label: 'System & Performance', schema: 'UtilitiesApplication',
              who: 'people who want their machine to run properly without handing a cleanup tool the keys to their data' },
  media:    { label: 'Audio & Video',        schema: 'MultimediaApplication',
              who: 'editors, musicians and anyone who works with sound or footage and does not want it uploaded for processing' },
  creative: { label: 'Creative & Documents', schema: 'DesignApplication',
              who: 'designers, writers and small studios who need professional output without a monthly bill' },
  ai:       { label: 'AI Tools',             schema: 'MultimediaApplication',
              who: 'creators who want generative tooling on their own GPU, with no API keys, no queue and no per-image cost' },
  explore:  { label: 'Games & Explore',      schema: 'GameApplication',
              who: 'anyone who enjoys exploring simulated worlds without an always-on connection' },
  dev:      { label: 'Developer Tools',      schema: 'DeveloperApplication',
              who: 'developers who want their source, their history and their tooling to stay on their own machine' },
  photo:    { label: 'Photo & Imaging',      schema: 'DesignApplication',
              who: 'photographers, sellers and anyone finishing a folder of pictures who would rather not upload them to a subscription service' },
  files:    { label: 'Files & Transfer',     schema: 'UtilitiesApplication',
              who: 'people moving, converting or archiving files who would rather not route them through someone else’s server' }
};
const CATMAP = eval('({' + grab(read('Windows-apps.html'), /var CATMAP = \{/, '\n        };') + '})');
const CATMAP_A = eval('({' + grab(read('android-apps.html'), /var CATMAP = \{/, '\n        };') + '})');
/* CATMAP is the authority; the app's own category is the safety net so a new
   entry is never silently filed under System & Performance. */
const CAT_FALLBACK = { utilities: 'system', media: 'media', productivity: 'creative', ai: 'ai', files: 'files', games: 'explore' };
/* Apps whose catalogue category is too coarse for their page. */
const CAT_OVERRIDE = { nanocodify: 'dev', nanovisuality: 'photo', pixumbrastudio: 'photo',
                       glowlab: 'photo', photovidix: 'photo', mediatidyultra: 'photo' };
const catOf = a => CAT[CAT_OVERRIDE[a.id]] || CAT[CATMAP[a.id]] || CAT[CAT_FALLBACK[a.category]] || CAT.system;

/* Category hub pages live at apps/<hub>.html. Each app page links up to its own
   hub so the catalogue is a two-level tree rather than a flat list, and so a
   crawler landing on one app page can reach every sibling in its category.
   This resolver must stay identical to the one in gen-category-pages.js. */
const { HUBS } = require('./hsx-taxonomy.js');
const catKeyOf = a => CAT_OVERRIDE[a.id] || CATMAP[a.id] || CATMAP_A[a.id]
                   || CAT_FALLBACK[a.category] || 'system';
const hubOf = a => HUBS.find(h => h.key === catKeyOf(a)) || null;

/* ── page shell, borrowed from an existing page so styling matches ── */
/* Page shell borrowed from a policy page. That page sits one folder down, so
   its links are already ../ prefixed; flatten them back to root-relative first
   and let upify() re-anchor them for apps/. */
const TPL = read('privacy/HSXStudioFlowPrivacy.html')
  .replace(/(href|src)="\.\.\//g, '$1="');
const headOpen = TPL.slice(0, TPL.indexOf('<body>'));
const afterBody = TPL.slice(TPL.indexOf('<body>'));
let headerHTML = afterBody.slice(0, afterBody.indexOf('<main'));
let footerHTML = afterBody.slice(afterBody.indexOf('<footer'));
/* the pages live one level down, so every site-root link needs ../ */
const upify = h => h
  .replace(/(href|src)="(?!http|mailto|#|\/|\.\.\/)/g, '$1="../')
  .replace(/srcset="(?!http|\.\.\/)/g, 'srcset="../');
headerHTML = upify(headerHTML);
footerHTML = upify(footerHTML);

/* Applications whose whole purpose involves fetching remote content. They are
   still local-first about your data, but claiming they "work offline" would be
   false, so they get accurate wording instead. */
const NETWORKED = new Set([
  'browsex', 'medialucent', 'moneyhalo', 'planetx', 'planetxearthexplorer',
  'planetxinfinity', 'terraorbitix', 'earthos', 'nanocodify'
]);
/* A third case, and the one the two-way split got wrong: applications that
   link two of the user's own devices over their own Wi-Fi or a hotspot. They
   never touch the internet, so describing them as reaching online content is
   false; but they are not standalone either, so "works with the network
   switched off" is false too. They get their own wording. */
const LOCAL_LINK = new Set(['castvisuality', 'quantumdrop']);
const isLinked  = a => LOCAL_LINK.has(a.id);
const isOffline = a => !NETWORKED.has(a.id) && !isLinked(a);

/* ── Trademarks ────────────────────────────────────────────────────────────
   COINED are invented words owned outright by the studio; the mark is the
   bare word, not the product name it sits inside (HSX NovaDiffux -> NovaDiffux).
   Every other application asserts its full product name as the mark.
   TM is used throughout: it asserts an unregistered mark and needs no
   registration. The registered symbol is reserved for Hasnain Studio X alone.
   ──────────────────────────────────────────────────────────────────────── */
const COINED = ['NovaDiffux', 'NanoCodify', 'NanoVisuality', 'PhotoVidix', 'Pocktium',
  'PromptKinetics', 'TerraOrbitix', 'Hypersonus', 'VisionBulwark', 'Pixumbra', 'QuantumDrop',
  'SpatiaX', 'XSeasons', 'Automafy', 'CastVisuality', 'FotoTensor', 'GameFabrix',
  'InfiniteGen', 'MediaLucent', 'DocClarity', 'DreamVivid', 'LaunchHarbor', 'SenseCapture',
  'KatanicOS', 'MoneyHalo', 'VectalonOS', 'SolsticeOS', 'XCipher', 'NimbusDock', 'DocMento',
  'ExeCrafter', 'SpillFrame', 'EarthShell', 'AstraMorph', 'VDroidX', 'DreamMint'];
const tmNorm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
/* the mark this application asserts */
const markFor = a => COINED.find(c => tmNorm(a.name).includes(tmNorm(c))) || a.name;
const isCoined = a => COINED.some(c => tmNorm(a.name).includes(tmNorm(c)));

/* Store artwork, when the studio has supplied it. Drives the page hero, the
   social card and the image fields in the structured data. */
const heroOf = a => {
  const b = slug(a);
  return fs.existsSync(P('images/apps/' + b + '-hero.webp')) ? b : null;
};

const isOut   = a => a.status === 'live';                 // already released
const isCert  = a => a.stage === 'certification';        // submitted, awaiting store approval
const storeOf = a => a.platform === 'Android' ? 'Google Play' : 'the Microsoft Store';
const stageOf = a => isCert(a)
  ? `with ${storeOf(a)}, going through certification`
  : 'in active development at the studio';

function faqFor(a) {
  const os = a.platform === 'Android' ? 'Android' : 'Windows 10 and Windows 11';
  const net = isLinked(a)
    ? [`Does ${a.name} need an internet connection?`,
       `No. ${a.name} works over your own Wi-Fi, or your laptop's hotspot where there is no Wi-Fi at all. Your devices talk to each other directly, so nothing is routed through a server and nothing needs an internet connection.`]
    : isOffline(a)
    ? [`Does ${a.name} need an internet connection?`,
       `No. ${a.name} does its work on your own device. You can install it, disconnect, and it keeps functioning. A connection is only used by the store itself, for installation and licence checks.`]
    : [`Does ${a.name} need an internet connection?`,
       `Yes, because ${a.name} works with content that lives online. That connection is used to fetch that content and nothing else: your settings, your history and your files are held on your device and are never sent to Hasnain Studio X.`];
  const release = a.status === 'live' ? null :
    [`When is ${a.name} released?`,
     `${a.name} is ${stageOf(a)}. No date is promised${isCert(a) ? ' until it clears' : ''}. This page will carry the store link the moment it goes live.`];
  return [
    ...(release ? [release] : []),
    net,
    [`Does ${a.name} require an account?`,
     `No. There is no registration, no sign-in and no online identity. You install the application and use it.`],
    [`What data does ${a.name} collect?`,
     `None. There is no analytics SDK, no usage tracking and no crash reporting that leaves your device. The full detail is in the ${a.name} privacy policy.`],
    [`Is ${a.name} a subscription?`,
     `No. ${a.name} is a free trial followed by a one-time purchase through ${a.platform === 'Android' ? 'Google Play' : 'the Microsoft Store'}. There is no recurring fee.`],
    [`Which versions of ${a.platform} does it support?`,
     `${os}.`]
  ];
}

function pageFor(a) {
  const c = catOf(a);
  const s = slug(a);
  const url = BASE + 'apps/' + s + '.html';
  const priv = rel(a.privacyUrl);
  const osFull = a.platform === 'Android' ? 'Android' : 'Windows 10, Windows 11';
  const storeName = a.platform === 'Android' ? 'Google Play' : 'the Microsoft Store';
  const out = isOut(a), cert = isCert(a), stageLine = stageOf(a);
  const storeHref = out ? a.storeUrl : '../contact.html';
  const ctaLabel  = out ? (a.storeLabel || 'Get the app') : 'Tell me when it lands';
  const catalogue = a.platform === 'Android' ? '../android-apps.html' : '../Windows-apps.html';
  const catalogueLabel = a.platform === 'Android' ? 'Android Apps' : 'Windows Apps';

  const hero = heroOf(a);
  const hub = hubOf(a);
  const related = LIVE
    .filter(x => x.id !== a.id && CATMAP[x.id] === CATMAP[a.id] && x.platform === a.platform)
    .slice(0, 4);

  const TAG   = a.tagline.replace(/\.$/, '');
  const BR    = /HSX|Hasnain/i.test(a.name) ? '' : ' | HSX';

  /* Google renders roughly 60 characters of a title before it truncates. A
     truncated title loses the brand suffix, which is the part that builds
     recognition across 78 results, so the tagline is cut instead — always on a
     clause or word boundary, never mid-phrase and never on a trailing joining
     word ("...compress media on"). */
  const T_LIMIT = 60;
  /* Google renders roughly 60 characters of a title before truncating, and a
     truncated title loses the brand suffix — the one part that has to stay
     recognisable across 78 results. So the tagline is shortened here instead,
     and only ever at a point where the phrase still reads as finished. */
  const STOP = new Set(['and','or','the','a','an','on','in','for','to','with','of',
    'your','from','at','by','into','that','which','is','are','as','it','its',
    'their','you','all','plus','over','per','using','via','across','through',
    'local','own','single','full','real','new','smart','quick','one','every','any']);
  const DET = new Set(['on','in','for','to','with','of','from','at','by','into','over',
    'per','across','through','using','via','and','or','your','their','its','our','my',
    'the','a','an','one','this','that','these','those','each','every','any','some','no']);
  const KEEP_SHORT = new Set(['3d','ai','pc','qr','hd','4k','pdf','usb','gpu','dj','vr','os']);
  /* `deep` is only for a cut made mid-sentence at an arbitrary word boundary,
     where the tail really can be a fragment. A cut made at a clause boundary
     already ends where the author ended a thought, so the aggressive rules
     would eat good words - they turned "Turn any phone" into "Turn". */
  const tidy = (t, deep) => {
    let w = t.replace(/[\s,;:—–-]+$/, '').split(/\s+/).filter(Boolean);
    for (;;) {
      const last = (w[w.length - 1] || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
      if (w.length && STOP.has(last)) { w.pop(); continue; }
      if (!deep) break;
      // a very short trailing token is nearly always a cut-off compound
      if (w.length > 1 && last.length <= 2 && !KEEP_SHORT.has(last)) { w.pop(); continue; }
      // a noun left stranded after a preposition or determiner goes with it
      if (w.length > 1 && DET.has(w[w.length - 2].replace(/[^A-Za-z]/g,'').toLowerCase())) {
        w.pop(); w.pop(); continue;
      }
      break;
    }
    return w.join(' ').replace(/[\s,;:—–-]+$/, '');
  };
  let TITLE = `${a.name} — ${TAG}${BR}`;
  if (TITLE.length > T_LIMIT) {
    const room = T_LIMIT - a.name.length - 3 - BR.length;
    /* 1. longest prefix ending on a real phrase boundary — keeps the original
          punctuation and wording exactly as written */
    let cut = '';
    for (const m of TAG.matchAll(/[,;:]|\s+(?:and|or|—|–|-)\s+/g)) {
      const pre = tidy(TAG.slice(0, m.index), false);
      if (pre.length <= room && pre.length > cut.length) cut = pre;
    }
    /* 2. otherwise cut on a word boundary and clean the tail */
    if (cut.length < 18) {
      let words = '';
      for (const w of TAG.split(/\s+/)) {
        const next = words ? words + ' ' + w : w;
        if (next.length <= room) words = next; else break;
      }
      const trimmed = tidy(words, true);
      if (trimmed.length > cut.length) cut = trimmed;
    }
    TITLE = cut.length >= 14
      ? `${a.name} — ${cut}${BR}`
      : `${a.name} — ${c.label} for ${a.platform}${BR}`;
    if (TITLE.length > T_LIMIT) TITLE = `${a.name} — ${c.label} for ${a.platform}`;
    if (TITLE.length > T_LIMIT) TITLE = `${a.name}${BR}`;
  }
  const DEV   = a.platform === 'Android' ? 'phone' : 'PC';
  let DESC    = `${a.name}: ${a.tagline} Runs entirely on your ${DEV} — no account, no telemetry, no subscription.`;
  if (DESC.length > 158) DESC = `${a.name}: ${a.tagline} Runs on your ${DEV} — no account, no telemetry.`;
  if (DESC.length > 158) DESC = `${a.name}: ${a.tagline} Local-first, no account needed.`;
  if (DESC.length > 158) DESC = DESC.slice(0, 155).replace(/[\s,;—-]+$/, '') + '...';
  const KEYS  = [a.name, `${a.name} ${a.platform}`, `${a.name} download`,
                 `${a.name} privacy`, c.label, 'Hasnain Studio X', 'local-first software',
                 `${a.platform} app no subscription`].join(', ');

  const faq = faqFor(a);

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': BASE + '#organization', name: 'Hasnain Studio X', url: BASE,
        alternateName: ['InHasnain', 'HSX', 'Hasnain StudioX', 'HasnainStudioX', 'Hasnain Studio'],
        logo: { '@type': 'ImageObject', url: BASE + 'images/icon-512.png', width: 512, height: 512 },
        founder: { '@type': 'Person', '@id': BASE + '#founder', name: 'Hasnain Butt Akhtar' },
        sameAs: ['https://x.com/HasnainStudioX',
                 'https://apps.microsoft.com/search/publisher?name=Hasnain+Studio+X',
                 'https://play.google.com/store/apps/developer?id=Hasnain+Studio+X'] },
      { '@type': 'WebSite', '@id': BASE + '#website', url: BASE, name: 'Hasnain Studio X',
        publisher: { '@id': BASE + '#organization' }, inLanguage: 'en-GB' },
      { '@type': 'SoftwareApplication', '@id': url + '#app', name: a.name,
        alternateName: [...new Set([a.name.replace(/^HSX /, ''), markFor(a)])],
        description: a.description, applicationCategory: c.schema,
        operatingSystem: osFull, softwareVersion: a.version || undefined,
        url, downloadUrl: out ? a.storeUrl : undefined, installUrl: out ? a.storeUrl : undefined,
        featureList: a.features, applicationSuite: 'Hasnain Studio X',
        image: hero ? [BASE + 'images/apps/' + hero + '-og.jpg',
                       BASE + 'images/apps/' + hero + '-hero.webp'] : undefined,
        screenshot: hero ? BASE + 'images/apps/' + hero + '-hero.webp' : undefined,
        brand: { '@type': 'Brand', name: markFor(a), owner: { '@id': BASE + '#organization' } },
        privacyPolicy: priv ? BASE + priv : undefined,
        publisher: { '@id': BASE + '#organization' },
        author: { '@id': BASE + '#founder' },
        creator: { '@id': BASE + '#founder' },
        offers: { '@type': 'Offer', category: 'Free trial, then one-time purchase',
                  availability: out ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
                  url: out ? a.storeUrl : BASE + 'contact.html' } },
      { '@type': 'Person', '@id': BASE + '#founder',
        name: 'Hasnain Butt Akhtar',
        alternateName: ['Hasnain Butt', 'Hasnain Akhtar', 'InHasnain'],
        jobTitle: 'Founder and Software Developer',
        url: BASE + 'about.html',
        worksFor: { '@id': BASE + '#organization' },
        sameAs: ['https://x.com/HasnainStudioX',
                 'https://apps.microsoft.com/search/publisher?name=Hasnain+Studio+X',
                 'https://play.google.com/store/apps/developer?id=Hasnain+Studio+X'] },
      { '@type': 'WebPage', '@id': url + '#webpage', url, name: TITLE, description: DESC,
        primaryImageOfPage: hero ? { '@type': 'ImageObject',
          '@id': url + '#primaryimage',
          contentUrl: BASE + 'images/apps/' + hero + '-og.jpg',
          url: BASE + 'images/apps/' + hero + '-og.jpg',
          width: 1200, height: 630,
          caption: a.name + ' for ' + a.platform + ' by Hasnain Studio X',
          creditText: 'Hasnain Studio X',
          creator: { '@id': BASE + '#organization' },
          copyrightNotice: 'Hasnain Studio X' } : undefined,
        inLanguage: 'en-GB', isPartOf: { '@id': BASE + '#website' },
        publisher: { '@id': BASE + '#organization' },
        about: { '@id': url + '#app' },
        breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
          { '@type': 'ListItem', position: 2, name: catalogueLabel, item: BASE + (a.platform === 'Android' ? 'android-apps.html' : 'Windows-apps.html') },
          ...(hub ? [{ '@type': 'ListItem', position: 3, name: hub.nav, item: BASE + 'apps/' + hub.slug + '.html' }] : []),
          { '@type': 'ListItem', position: hub ? 4 : 3, name: a.name, item: url } ] } },
      { '@type': 'FAQPage', '@id': url + '#faq', mainEntity: faq.map(([q, ans]) => (
        { '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: ans } })) }
    ]
  };

  /* every app page used to share one of two pictures; now each has its own */
  const OGIMG = hero ? BASE + 'images/apps/' + hero + '-og.jpg'
                     : BASE + 'images/' + (a.platform === 'Android' ? 'og-android.png' : 'og-windows.png');
  let h = headOpen;
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${escA(TITLE)}</title>`);
  // rewrite every meta whose name/property matches, wherever it appears in the head
  const setMeta = (key, v) => {
    const re = new RegExp('(<meta\\s+(?:name|property)="' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s+content=")[\\s\\S]*?(")', 'g');
    h = h.replace(re, (m, x, y) => x + escA(v) + y);
  };
  setMeta('description', DESC);
  setMeta('og:title', TITLE);
  setMeta('og:description', DESC);
  setMeta('og:url', url);
  setMeta('og:image', OGIMG);
  setMeta('og:image:secure_url', OGIMG);
  setMeta('og:image:type', hero ? 'image/jpeg' : 'image/png');
  setMeta('og:image:alt', a.name + ' by Hasnain Studio X');
  setMeta('twitter:title', TITLE);
  setMeta('twitter:description', DESC);
  setMeta('twitter:image', OGIMG);
  setMeta('twitter:image:alt', a.name + ' by Hasnain Studio X');
  h = h.replace(/(<link rel="canonical" href=")[\s\S]*?(")/, (m, x, y) => x + url + y);
  h = h.replace(/hreflang="en-GB" href="[^"]*"/, `hreflang="en-GB" href="${url}"`);
  h = h.replace(/hreflang="x-default" href="[^"]*"/, `hreflang="x-default" href="${url}"`);
  h = h.replace(/<meta name="keywords"[^>]*>\s*/g, '');
  h = h.replace('</head>', `    <meta name="keywords" content="${escA(KEYS)}"/>\n</head>`);
  h = h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    '<script type="application/ld+json">\n' + JSON.stringify(graph, null, 2) + '\n    </script>');
  h = upify(h);

  const main = `    <main id="main-content" class="container" role="main">
        <nav class="app-crumb" aria-label="Breadcrumb">
            <a href="../">Home</a> <span aria-hidden="true">/</span>
            <a href="${catalogue}">${catalogueLabel}</a> <span aria-hidden="true">/</span>${hub ? `
            <a href="${hub.slug}.html">${esc(hub.nav)}</a> <span aria-hidden="true">/</span>` : ''}
            <span aria-current="page">${esc(a.name)}</span>
        </nav>

${hero ? `
        <figure class="app-hero-art">
            <img src="../images/apps/${hero}-hero.webp"
                 srcset="../images/apps/${hero}-hero-sm.webp 400w, ../images/apps/${hero}-hero.webp 720w"
                 sizes="(max-width:900px) 94vw, 900px"
                 width="720" height="405" fetchpriority="high" decoding="async"
                 alt="${escA(a.name)} for ${esc(a.platform)} by Hasnain Studio X">
        </figure>` : ''}
        <section class="hero hero--single app-hero" aria-labelledby="app-title">
            <div class="hero-eyebrow">${esc(c.label)} &middot; ${esc(a.platform)} &middot; ${out ? esc(storeName === 'the Microsoft Store' ? 'Microsoft Store' : 'Google Play') : (cert ? 'In certification' : 'In development')}</div>
            <h1 id="app-title">${esc(a.name)}</h1>
            <p class="app-tagline">${esc(a.tagline)}</p>
            <p class="hero-sub">${esc(a.description)}</p>
            <div class="app-cta">
                <a class="btn btn--primary" href="${escA(storeHref)}"${out ? ' target="_blank" rel="noopener"' : ''}>
                    ${esc(ctaLabel)} <span aria-hidden="true">&rarr;</span></a>
                <a class="btn btn--secondary" href="${catalogue}">All ${esc(catalogueLabel)}</a>
            </div>
            <div class="proof-chips" style="justify-content:center;">
                <span class="proof-chip">No account</span>
                <span class="proof-chip">No telemetry</span>
                <span class="proof-chip">No subscription</span>
                <span class="proof-chip">${isLinked(a) ? 'Your devices only' : isOffline(a) ? 'Runs offline' : 'Your data stays local'}</span>
            </div>
        </section>

        <section class="section" aria-labelledby="f-title">
            <div class="section-header"><h2 id="f-title">What ${esc(a.name)} does</h2></div>
            <ul class="app-features">
${a.features.map(f => `                <li>${esc(f)}</li>`).join('\n')}
            </ul>
        </section>

        <section class="section" aria-labelledby="who-title">
            <div class="section-header"><h2 id="who-title">Who it is for</h2></div>
            <p class="app-lead">${esc(a.name)} is built for ${esc(c.who)}.</p>
            <p>It sits in the ${esc(c.label.toLowerCase())} part of the Hasnain Studio X catalogue, and it follows
            the same rule as every other title in the range: the work happens on your own hardware. Nothing is
            uploaded for processing, because there is no server to upload it to.</p>
        </section>

        <section class="section" aria-labelledby="local-title">
            <div class="section-header"><h2 id="local-title">Local-first, by design</h2></div>
            <p>Most software in this category sends your files somewhere to be handled. ${esc(a.name)} does not.
            Processing runs on your ${a.platform === 'Android' ? 'phone’s own processor' : 'CPU or GPU'},
            and your files stay in the folders you put them in.${isLinked(a)
              ? ` ${esc(a.name)} does need your devices to be on the same network, but that is the only link involved: it runs over your own Wi-Fi or a hotspot, with nothing routed through a server and no internet connection required.`
              : isOffline(a)
              ? ' The application keeps working with the network switched off.'
              : ` ${esc(a.name)} does reach the internet for the content it displays, but nothing about you or your files travels the other way.`}</p>
            <p>That is not a setting you enable. It is how the application is built, and it is why there is no
            account to create, no profile to build and no subscription to lapse. Full detail is in the
            ${priv ? `<a href="../${escA(priv)}">${esc(a.name)} privacy policy</a>` : 'privacy policy'}.</p>
        </section>

        <section class="section" aria-labelledby="tech-title">
            <div class="section-header"><h2 id="tech-title">Technical details</h2></div>
            <dl class="app-spec">
                <div class="spec-cell"><dt>Platform</dt><dd>${esc(osFull)}</dd></div>
                <div class="spec-cell"><dt>Distribution</dt><dd>${esc(storeName === 'the Microsoft Store' ? 'Microsoft Store' : 'Google Play')}</dd></div>
                <div class="spec-cell spec-cell--${out ? 'good' : 'wait'}"><dt>Availability</dt><dd><span class="spec-dot" aria-hidden="true"></span>${out ? 'Available now' : (cert ? 'In certification' : 'In development')}</dd></div>
                <div class="spec-cell"><dt>Licence</dt><dd>Free trial, then one purchase</dd></div>
                <div class="spec-cell spec-cell--${isOffline(a) ? 'good' : isLinked(a) ? 'good' : 'note'}"><dt>Network required</dt><dd><span class="spec-dot" aria-hidden="true"></span>${isLinked(a) ? 'Your own network only' : isOffline(a) ? 'No, works offline' : 'Online content only'}</dd></div>
                <div class="spec-cell spec-cell--good"><dt>Account required</dt><dd><span class="spec-dot" aria-hidden="true"></span>None</dd></div>
                <div class="spec-cell spec-cell--good"><dt>Telemetry</dt><dd><span class="spec-dot" aria-hidden="true"></span>None</dd></div>
                <div class="spec-cell"><dt>Publisher</dt><dd><a href="../about.html">Hasnain Butt Akhtar</a></dd></div>
            </dl>
        </section>

        <section class="section" aria-labelledby="faq-title">
            <div class="section-header"><h2 id="faq-title">Questions</h2></div>
            <div class="app-faq">
${faq.map(([q, ans]) => `                <div class="app-q"><h3>${esc(q)}</h3><p>${esc(ans)}</p></div>`).join('\n')}
            </div>
        </section>
${related.length ? `
        <section class="section" aria-labelledby="rel-title">
            <div class="section-header"><h2 id="rel-title">Related applications</h2></div>${hub ? `
            <p class="app-lead">More of the same kind of tool is listed on
            <a href="${hub.slug}.html">${esc(hub.h1.charAt(0).toLowerCase() + hub.h1.slice(1))}</a>.</p>` : ''}
            <div class="app-related">
${related.map(r => `                <a class="app-rel" href="${slug(r.name)}.html">
                    <span class="app-rel-n">${esc(r.name)}</span>
                    <span class="app-rel-t">${esc(r.tagline)}</span>
                </a>`).join('\n')}
            </div>
        </section>
` : ''}
        <section class="section" aria-labelledby="get-title">
            <div class="section-header"><h2 id="get-title">Get ${esc(a.name)}</h2></div>
            <p class="app-lead">${out
              ? `Available now on ${esc(storeName)}. Try it free, then a single purchase unlocks it for good &mdash; no subscription, no account.`
              : `${esc(a.name)} is ${esc(stageLine)}. It is not on sale yet. Send a message and I will tell you the day it goes live.`}</p>
            <p><a class="btn btn--primary" href="${escA(storeHref)}"${out ? ' target="_blank" rel="noopener"' : ''}>
                ${esc(ctaLabel)} <span aria-hidden="true">&rarr;</span></a></p>
            <p class="app-note">${priv ? `<a href="../${escA(priv)}">${esc(a.name)} privacy policy</a> &middot; ` : ''}<a href="../contact.html">Support and bug reports</a> &middot; ${hub ? `<a href="${hub.slug}.html">${esc(hub.nav)} apps</a> &middot; ` : ''}<a href="${catalogue}">Full catalogue</a></p>
            <p class="app-tm">${
              markFor(a) === a.name
                ? `${esc(a.name)}&trade; is a trademark of Hasnain Studio X.`
                : `${esc(a.name)}&trade; and ${esc(markFor(a))}&trade; are trademarks of Hasnain Studio X.`
            }${isCoined(a) ? ` ${esc(markFor(a))}&trade; is a coined term originated by Hasnain Studio X.` : ''}
            Hasnain Studio X&reg; is a registered trademark.</p>
        </section>
    </main>`;

  return h + '<body>\n' + headerHTML.slice('<body>\n'.length) + main + '\n\n    ' + footerHTML;
}

if (!fs.existsSync(P('apps'))) fs.mkdirSync(P('apps'));
let n = 0;
const written = [];
for (const a of PAGES) {
  const s = slug(a);
  fs.writeFileSync(path.join(P('apps'), s + '.html'), pageFor(a), 'utf8');
  written.push({ slug: s, name: a.name, platform: a.platform });
  n++;
}
console.log(`  app pages   ${n} generated in apps/`);
