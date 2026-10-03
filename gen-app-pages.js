#!/usr/bin/env node
/* HSX app landing pages: one per live application, generated from the
   APPS arrays that already drive the catalogue, schema and sitemap.

   Output:  apps/<slug>.html
   Privacy policies stay at the site root, untouched, because those URLs
   are registered with the stores and built into shipped software. */
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
              who: 'creators who want generative tooling on their own GPU, with no API keys, no queue and nothing metered per use' },
  explore:  { label: 'Games & Explore',      schema: 'GameApplication',
              who: 'anyone who enjoys exploring simulated worlds without an always-on connection' },
  dev:      { label: 'Developer Tools',      schema: 'DeveloperApplication',
              who: 'developers who want their source, their history and their tooling to stay on their own machine' },
  photo:    { label: 'Photo & Imaging',      schema: 'DesignApplication',
              who: 'photographers, sellers and anyone finishing a folder of pictures who would rather not upload them to a subscription service' },
  files:    { label: 'Files & Transfer',     schema: 'UtilitiesApplication',
              who: 'people moving, converting or archiving files who would rather not route them through someone else’s server' }
};
/* A handful of titles do not fit their category's stock sentence. Overriding
   one line is better than inventing a category for a single application. */
const WHO_OVERRIDE = {
  writedesk: 'writers, students and professionals who want drafting and rewriting help that never sends a word of their work to anyone else',
  aiassistantpro: 'students, professionals and anyone who wants an everyday AI assistant without handing their questions and files to a cloud service',
  halovoxultra: 'anyone who wants to run their PC by voice, to rest their hands or simply to work faster, without sending a word they say to a cloud service'
};
const CATMAP = eval('({' + grab(read('Windows-apps.html'), /var CATMAP = \{/, '\n        };') + '})');
const CATMAP_A = eval('({' + grab(read('android-apps.html'), /var CATMAP = \{/, '\n        };') + '})');
/* CATMAP is the authority; the app's own category is the safety net so a new
   entry is never silently filed under System & Performance. */
const CAT_FALLBACK = { utilities: 'system', media: 'media', productivity: 'creative', ai: 'ai', files: 'files', games: 'explore' };
/* Apps whose catalogue category is too coarse for their page. */
const CAT_OVERRIDE = { nanocodify: 'dev', nanovisuality: 'photo', pixumbrastudio: 'photo',
                       glowlab: 'photo', photovidix: 'photo', mediatidyultra: 'photo' };
const whoOf = a => WHO_OVERRIDE[a.id] || catOf(a).who;
const catOf = a => CAT[CAT_OVERRIDE[a.id]] || CAT[CATMAP[a.id]] || CAT[CAT_FALLBACK[a.category]] || CAT.system;

/* Category hub pages live at apps/<hub>.html. Each app page links up to its own
   hub so the catalogue is a two-level tree rather than a flat list, and so a
   crawler landing on one app page can reach every sibling in its category.
   This resolver must stay identical to the one in gen-category-pages.js. */
const { HUBS, GPU_VRAM, INTENT } = require('./hsx-taxonomy.js');
const { DETAILS: ANDROID, ADS } = require('./android-details.js');
const catKeyOf = a => CAT_OVERRIDE[a.id] || CATMAP[a.id] || CATMAP_A[a.id]
                   || CAT_FALLBACK[a.category] || 'system';
const hubOf = a => HUBS.find(h => h.key === catKeyOf(a)) || null;
/* a second, cross-cutting hub an app may also belong to (spatial audio,
   privacy tools) - listed as an extra route in, never as its breadcrumb */
const alsoHubsOf = a => HUBS.filter(h => h.crossCut && (h.ids || []).includes(a.id));

/* page shell, borrowed from an existing page so styling matches */
/* Page shell borrowed from a policy page. That page sits one folder down, so
   its links are already ../ prefixed; flatten them back to root-relative first
   and let upify() re-anchor them for apps/. */
/* The shell comes from a policy page, and policies are deliberately
   noindexed. That rule belongs to the policy, not to the shell: every page
   generated from it is one we want in the index. Reset it here so the
   template's own robots meta can never leak into 90 other pages. */
const REINDEX = h => h
  .replace(/<meta name="robots" content="[^"]*"\/?>/i,
           '<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"/>')
  .replace(/<meta name="(googlebot|bingbot)" content="[^"]*"\/?>/gi,
           (m, bot) => '<meta name="' + bot + '" content="index, follow, max-snippet:-1, max-image-preview:large"/>');
const TPL = REINDEX(read('privacy/HSXStudioFlowPrivacy.html')
  .replace(/(href|src)="\.\.\//g, '$1="'));
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
  'browsex', 'medialucent', 'planetx', 'planetxearthexplorer',
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

/* Trademarks
   COINED are invented words owned outright by the studio; the mark is the
   bare word, not the product name it sits inside (HSX NovaDiffux -> NovaDiffux).
   Every other application asserts its full product name as the mark.
   TM is used throughout: it asserts an unregistered mark and needs no
   registration. The registered symbol is reserved for Hasnain Studio X alone. */
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

/* Tutorial videos from app-videos.json, keyed by app id:
     "pctunex": { "youtube": "<11-character id>", "title": "...", "uploaded": "YYYY-MM-DD", "seconds": 95 }
   The thumbnail is the JPG HSX Media Production exports, saved as images/videos/<page slug>.jpg.
   Nothing is fetched from YouTube until the visitor presses play. */
const VIDEOS = fs.existsSync(P('app-videos.json')) ? JSON.parse(read('app-videos.json')) : {};
const videoOf = a => {
  const v = VIDEOS[a.id];
  if (!v) return null;
  const own = 'images/videos/' + slug(a) + '.jpg';
  const hero = heroOf(a);
  const thumb = fs.existsSync(P(own)) ? own : hero ? 'images/apps/' + hero + '-hero.webp' : null;
  const problem = !/^[A-Za-z0-9_-]{11}$/.test(v.youtube || '') ? 'the YouTube id is not 11 characters'
    : !/^\d{4}-\d{2}-\d{2}$/.test(v.uploaded || '') ? 'the upload date is missing'
    : !thumb ? 'there is no thumbnail at ' + own : null;
  if (problem) { console.warn(`  video       ${a.id} skipped: ${problem}`); return null; }
  const secs = Math.round(Number(v.seconds) || 0);
  return { id: v.youtube, title: v.title || 'How to use ' + a.name, uploaded: v.uploaded, thumb,
    description: v.description || `A walkthrough of ${a.name}, showing how to use it step by step.`,
    iso: secs ? `PT${Math.floor(secs / 60)}M${secs % 60}S` : undefined,
    clock: secs ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : '' };
};

const isOut   = a => a.status === 'live';                 // already released
const isCert  = a => a.stage === 'certification';        // submitted, awaiting store approval
const HUB_STORE = 'https://apps.microsoft.com/detail/9P0SCSV68797';
const storeOf = a => a.platform === 'Android' ? 'Google Play' : 'the Microsoft Store';
const stageOf = a => isCert(a)
  ? `with ${storeOf(a)}, going through certification`
  : 'in active development at the studio';

/* What each application actually works on. The local-first section used to
   say "your files" on all seventy pages; naming the real subject makes each
   page describe its own application instead of repeating the same sentence.
   Matched against the name, tagline and description so it stays right as the
   catalogue changes. */
/* Screenshots prepared by make-app-shots.py from the store listings. */
const SHOTS = (() => {
  const load = f => { try { return JSON.parse(read(f)); } catch (e) { return {}; } };
  return { ...load('images/shots/index.json'), ...load('play-shots.json') };
})();
/* real pixel sizes, so the browser reserves the space before a shot loads
   and the text below it does not jump */
const webpSize = f => {
  try {
    const b = fs.readFileSync(P(f));
    const kind = b.toString('ascii', 12, 16);
    if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (kind === 'VP8L') {
      return [1 + (((b[22] & 0x3f) << 8) | b[21]),
              1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6))];
    }
    if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  } catch (e) { /* missing file: no size rather than a wrong one */ }
  return null;
};
const shotsOf = a => {
  const n = SHOTS[slug(a)] || 0;
  return Array.from({ length: n }, (_, i) => slug(a) + '-' + (i + 1));
};

const SUBJECT_RULES = [
  [/screen ?record|screen ?capture|screenshot/i, 'your recordings',   'the recordings you make'],
  [/game launcher|game librar|launcher/i,        'your installed games', 'the games you have installed'],
  [/\bphoto|image|picture|raw\b/i,               'your photographs',  'the photographs you open'],
  [/video|footage|clip|film/i,                   'your video files',  'the clips you work on'],
  [/audio|sound|music|spatial|voice/i,           'your audio files',  'the tracks you play'],
  [/document|\bpdf\b|\bdoc\b|write|text|note/i, 'your documents',    'the documents you open'],
  [/\bcode|script|develop|programming/i,          'your source files', 'the projects you open'],
  [/model|prompt|generat|diffus/i,               'the images you generate', 'the images you generate'],
  [/file|convert|archive|transfer|backup/i,      'your files',        'the files you point it at'],
];
/* Every phrase is plural so the surrounding sentences agree without special
   cases. */
/* Titles that touch every kind of data, where the first matching rule names the wrong one. */
const SUBJECT_OVERRIDE = {
  aiassistantpro: { short: 'your questions and files', long: 'the conversations, pictures and documents you work with' },
  halovoxultra: { short: 'your spoken commands', long: 'the words you speak and the windows you work in' }
};
function subjectOf(a) {
  if (SUBJECT_OVERRIDE[a.id]) return SUBJECT_OVERRIDE[a.id];
  const hay = [a.name, a.tagline, a.description].filter(Boolean).join(' ');
  for (const [re, short, long] of SUBJECT_RULES) if (re.test(hay)) return { short, long };
  return { short: 'your files', long: 'the files you point it at' };
}

/* "Your first hour": a short plan that gets a trial to a real result before it ends.
   The middle steps are the app's own features; promises about privacy or price are
   left out because they are not something to try. */
const NOT_A_STEP = /\b(never|telemetry|no cloud|no account|no accounts|no sign-in|no analytics|no crash|privacy|private|zero[- ]|fully offline|completely offline|fully local|runs entirely|all processing|all conversion|all edits|everything (is )?(stored|generated|stays|processed)|stays? on[- ]device|stay on[- ]device|kept locally|on your own (device|hardware|pc)|on your (pc|phone|device|machine)|locally|uploaded|transmitted|built on|trial|one-time|lightweight|network access|no background|offline - no|works offline)\b/i;

function firstHourOf(a, ad) {
  const tries = a.features.filter(f => !NOT_A_STEP.test(f)).slice(0, 3);
  const steps = [
    ad
      ? ['Install it free', `Get ${a.name} from Google Play. The free version is enough to see whether it suits you.`]
      : ['Start the free trial', `Get ${a.name} from the Microsoft Store. The Store page shows how long the trial lasts, so you know your window before you begin.`],
    ['Use your own work', `Try it on your own ${a.platform === 'Android' ? 'phone' : 'PC'} and real tasks rather than a quick look around. That is the only test that tells you whether it earns its place.`],
    ...tries.map(f => ['Try this', f.replace(/\.$/, '')]),
    ad
      ? ['Decide on Pro', 'If the free version earns its place, the optional Pro unlock is a single purchase on Google Play, with no subscription.']
      : ['Decide before it ends', `If it earned its place, buy it on the Microsoft Store before the trial runs out. The purchase unlocks the copy you already have, so there is nothing to reinstall.`],
  ];
  return `
        <section class="section" aria-labelledby="hour-title">
            <div class="section-header"><h2 id="hour-title">Your first hour with ${esc(a.name)}</h2>
                <p>${ad ? 'A short plan for finding out quickly whether it suits you.' : 'A short plan for getting to a real result while the trial is still running.'}</p></div>
            <ol class="first-hour">
${steps.map(([h, p]) => `                <li><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('\n')}
            </ol>
        </section>
`;
}

/* "Is it right for my PC?": the requirements Microsoft publishes on each Store
   page, read by fetch-store-facts.js, plus a check the browser can run locally. */
const STORE = (() => { try { return JSON.parse(read('store-facts.json')).products || {}; } catch (e) { return {}; } })();
const WINVER = { 17763: 'Windows 10 (version 1809) or Windows 11', 18362: 'Windows 10 (version 1903) or Windows 11',
                 19041: 'Windows 10 (version 2004) or Windows 11', 22000: 'Windows 11' };
const FIT_ORDER = ['OS', 'Processor', 'Memory', 'Graphics Processor', 'Video Memory', 'DirectX', 'Camera'];
const FIT_LABEL = { OS: 'Windows', 'Graphics Processor': 'Graphics', 'Video Memory': 'Graphics memory' };
const fitText = (name, v) => {
  if (name !== 'OS') return v;
  const b = (v.match(/(\d{5})/) || [])[1];
  return WINVER[b] || v;
};
const gbOf = v => { const m = /(\d+)\s*GB/i.exec(v || ''); return m ? +m[1] : 0; };
const coresOf = v => {
  const w = { dual: 2, quad: 4, hexa: 6, octa: 8 };
  const m = /(\d+)[- ]?core/i.exec(v || '') || /\b(dual|quad|hexa|octa)\b/i.exec(v || '');
  return m ? (w[m[1].toLowerCase()] || +m[1]) : 0;
};
const sizeOf = b => b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : Math.max(1, Math.round(b / 1e6)) + ' MB';

function fitFor(a) {
  const f = STORE[a.id];
  if (a.platform === 'Android' || !f || !f.req || !f.req.min.length) return '';
  const min = new Map(f.req.min), rec = new Map(f.req.rec);
  const names = FIT_ORDER.filter(n => min.has(n) || rec.has(n));
  const showRec = names.some(n => rec.has(n) && rec.get(n) !== min.get(n));
  const cell = (m, n) => m.has(n) ? esc(fitText(n, m.get(n))) : '<span class="fit-none">Not stated</span>';
  const rows = names.map(n => `                    <tr><th scope="row">${esc(FIT_LABEL[n] || n)}</th><td>${cell(min, n)}</td>${showRec ? `<td>${cell(rec, n)}</td>` : ''}</tr>`);
  const build = (/(\d{5})/.exec(min.get('OS') || '') || [])[1] || '';
  return `
        <section class="section" aria-labelledby="fit-title">
            <div class="section-header"><h2 id="fit-title">Is ${esc(a.name)} right for my PC?</h2>
                <p>The requirements Microsoft lists on the ${esc(a.name)} Store page${f.size ? `, and a download of about ${sizeOf(f.size)}` : ''}.</p></div>
            <div class="fit">
                <table class="fit-table">
                    <thead><tr><th scope="col"><span class="visually-hidden">Part</span></th><th scope="col">Minimum</th>${showRec ? '<th scope="col">Recommended</th>' : ''}</tr></thead>
                    <tbody>
${rows.join('\n')}
                    </tbody>
                </table>
                <div class="fit-check" data-build="${build}" data-mem="${gbOf(min.get('Memory'))}" data-cores="${coresOf(min.get('Processor'))}">
                    <button type="button" class="btn btn--secondary fit-run">Check this PC</button>
                    <ul class="fit-out" aria-live="polite"></ul>
                    <p class="fit-note">The check runs in your browser and sends nothing anywhere. Browsers only report part of the picture, so the Microsoft Store makes the final check when you install.</p>
                </div>
            </div>
        </section>
`;
}

/* "AI Tools" must not become "ai tools" in the middle of a sentence. */
const catPhrase = c => c.label.toLowerCase().replace(/\bai\b/g, 'AI');

function faqFor(a) {
  const ad = a.platform === 'Android' ? ANDROID[a.id] : null;
  if (ad) return [
    [`Does ${a.name} need an internet connection?`, ad.net],
    [`Does ${a.name} require an account?`,
     `No. There is no registration, no sign-in and no online identity. You install the app and use it.`],
    [`What data does ${a.name} collect?`,
     `Hasnain Studio X collects nothing: there is no account, no analytics and no crash reporting that leaves your phone, and ${ad.subject.short} are never uploaded. ${ADS} The full detail is in the ${a.name} privacy policy.`],
    [`Is ${a.name} a subscription?`,
     `No. ${a.name} is free on Google Play, with an optional one-time Pro unlock. There is no recurring fee.`],
    [`Which versions of Android does it support?`, `Android ${ad.minAndroid} or later.`],
  ];
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
  const gpu = GPU_VRAM[a.id] ? [
    `Does ${a.name} need a dedicated graphics card?`,
    `Yes. ${a.name} runs its processing on your own GPU and needs at least ${GPU_VRAM[a.id]} GB of dedicated graphics memory. Shared or integrated graphics below that will either refuse to start or fall back to a much slower path.`
  ] : null;
  return [
    ...(release ? [release] : []),
    net,
    ...(gpu ? [gpu] : []),
    [`Does ${a.name} require an account?`,
     `No. There is no registration, no sign-in and no online identity. You install the application and use it.`],
    [`What data does ${a.name} collect?`,
     `None. There is no analytics, no usage tracking and no crash reporting that leaves your device, and ${subjectOf(a).short} are never uploaded. The full detail is in the ${a.name} privacy policy.`],
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
  const ad = a.platform === 'Android' ? ANDROID[a.id] : null;
  const subj = ad ? ad.subject : subjectOf(a);
  const osFull = ad ? `Android ${ad.minAndroid} or later` : a.platform === 'Android' ? 'Android' : 'Windows 10, Windows 11';
  const storeName = a.platform === 'Android' ? 'Google Play' : 'the Microsoft Store';
  const out = isOut(a), cert = isCert(a), stageLine = stageOf(a);
  const storeHref = out ? a.storeUrl : '../contact.html';
  const ctaLabel  = out ? (a.storeLabel || 'Get the app') : 'Tell me when it lands';
  const catalogue = a.platform === 'Android' ? '../android-apps.html' : '../Windows-apps.html';
  const catalogueLabel = a.platform === 'Android' ? 'Android Apps' : 'Windows Apps';

  const also = alsoHubsOf(a);
  const hero = heroOf(a);
  const video = videoOf(a);
  const vram = GPU_VRAM[a.id] || null;
  /* Microsoft Store product id, for the native protocol link */
  const pidM = String(a.storeUrl || '').match(/apps\.microsoft\.com\/detail\/([A-Z0-9]{12})/i);
  const pid  = (out && a.platform !== 'Android' && pidM) ? pidM[1] : null;
  const hub = hubOf(a);
  const related = LIVE
    .filter(x => x.id !== a.id && CATMAP[x.id] === CATMAP[a.id] && x.platform === a.platform)
    .slice(0, 4);

  const TAG   = a.tagline.replace(/\.$/, '');
  const BR    = /HSX|Hasnain/i.test(a.name) ? '' : ' | HSX';

  /* Google renders roughly 60 characters of a title before it truncates. A
     truncated title loses the brand suffix, which is the part that builds
     recognition across 78 results, so the tagline is cut instead, always on a
     clause or word boundary, never mid-phrase and never on a trailing joining
     word ("...compress media on"). */
  const T_LIMIT = 60;
  /* Google renders roughly 60 characters of a title before truncating, and a
     truncated title loses the brand suffix, the one part that has to stay
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
    let w = t.replace(/[\s,;:-]+$/, '').split(/\s+/).filter(Boolean);
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
    return w.join(' ').replace(/[\s,;:-]+$/, '');
  };
  /* A search-intent phrase leads the title where one is written for this app,
     with the product name after it. Sized so the whole title survives the ~60
     characters Google renders. Apps without a phrase keep the tagline form. */
  let TITLE;
  if (INTENT[a.id]) {
    TITLE = `${INTENT[a.id]} | ${a.name}`;
    /* the product name is not optional - if the phrase is too long for it to
       fit, that is a phrase to shorten, not a name to drop */
    if (TITLE.length > T_LIMIT) {
      console.log('  ! intent phrase too long for "' + a.name + '" ('
        + TITLE.length + ' chars) - shorten it in hsx-taxonomy.js');
    }
  } else {
    TITLE = `${a.name}: ${TAG}${BR}`;
  }
  if (!INTENT[a.id] && TITLE.length > T_LIMIT) {
    const room = T_LIMIT - a.name.length - 3 - BR.length;
    /* 1. longest prefix ending on a real phrase boundary, keeps the original
          punctuation and wording exactly as written */
    let cut = '';
    for (const m of TAG.matchAll(/[,;:]|\s+(?:and|or|-)\s+/g)) {
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
      ? `${a.name}: ${cut}${BR}`
      : `${a.name}: ${c.label} for ${a.platform}${BR}`;
    if (TITLE.length > T_LIMIT) TITLE = `${a.name}: ${c.label} for ${a.platform}`;
    if (TITLE.length > T_LIMIT) TITLE = `${a.name}${BR}`;
  }
  const DEV   = a.platform === 'Android' ? 'phone' : 'PC';
  /* taglines are written without a closing full stop, so add one before
     the sentence that follows */
  const TAGP = /[.!?]$/.test(a.tagline.trim()) ? a.tagline.trim() : a.tagline.trim() + '.';
  let DESC    = `${a.name}: ${TAGP} Runs entirely on your ${DEV} with no account, no telemetry and no subscription.`;
  if (DESC.length > 158) DESC = `${a.name}: ${TAGP} Runs on your ${DEV} with no account and no telemetry.`;
  if (DESC.length > 158) DESC = `${a.name}: ${a.tagline} Local-first, no account needed.`;
  if (DESC.length > 158) DESC = DESC.slice(0, 155).replace(/[\s,;-]+$/, '') + '...';
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
                 'https://play.google.com/store/apps/developer?id=Hasnain+Studio+X',
                 'https://www.wikidata.org/wiki/Q141501125'] },
      { '@type': 'WebSite', '@id': BASE + '#website', url: BASE, name: 'Hasnain Studio X',
        publisher: { '@id': BASE + '#organization' }, inLanguage: 'en-GB' },
      { '@type': 'SoftwareApplication', '@id': url + '#app', name: a.name,
        alternateName: [...new Set([a.name.replace(/^HSX /, ''), markFor(a)])],
        description: a.description, applicationCategory: c.schema,
        operatingSystem: osFull, softwareVersion: a.version || undefined,
        memoryRequirements: vram ? vram + ' GB dedicated GPU VRAM (minimum)' : undefined,
        url, downloadUrl: out ? a.storeUrl : undefined, installUrl: out ? a.storeUrl : undefined,
        featureList: a.features, applicationSuite: 'Hasnain Studio X',
        image: hero ? [BASE + 'images/apps/' + hero + '-og.jpg',
                       BASE + 'images/apps/' + hero + '-hero.webp'] : undefined,
        screenshot: (() => {
          const list = shotsOf(a).map(n => BASE + 'images/shots/' + n + '.webp');
          if (hero) list.unshift(BASE + 'images/apps/' + hero + '-hero.webp');
          return list.length ? list : undefined;
        })(),
        brand: { '@type': 'Brand', name: markFor(a), owner: { '@id': BASE + '#organization' } },
        privacyPolicy: priv ? BASE + priv : undefined,
        publisher: { '@id': BASE + '#organization' },
        author: { '@id': BASE + '#founder' },
        creator: { '@id': BASE + '#founder' },
        offers: { '@type': 'Offer', category: ad ? 'Free, optional one-time Pro unlock' : 'Free trial, then one-time purchase',
                  price: ad ? '0' : undefined, priceCurrency: ad ? 'USD' : undefined,
                  availability: out ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
                  url: out ? a.storeUrl : BASE + 'contact.html' } },
      video ? { '@type': 'VideoObject', '@id': url + '#video', name: video.title, description: video.description,
        thumbnailUrl: [BASE + video.thumb], uploadDate: video.uploaded, duration: video.iso,
        embedUrl: 'https://www.youtube-nocookie.com/embed/' + video.id,
        publisher: { '@id': BASE + '#organization' }, about: { '@id': url + '#app' } } : undefined,
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
          copyrightNotice: 'Hasnain Studio X',
          acquireLicensePage: BASE + 'contact.html' } : undefined,
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
    ].filter(Boolean)
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
${pid ? `
        <aside class="copy-notice" id="copy-notice" role="note" aria-labelledby="copy-notice-title" hidden>
            <p class="copy-notice-title" id="copy-notice-title">About the copy you came from</p>
            <p>The copy on that site is a modified build we don't support and can't vouch for.
            The genuine ${esc(a.name)} has a free trial on the Microsoft Store.</p>
            <a class="btn btn--primary" href="${escA(a.storeUrl)}" target="_blank" rel="noopener">
                Get the genuine app <span aria-hidden="true">&rarr;</span></a>
        </aside>` : ''}

${hero ? `
        <figure class="app-hero-art">
            <img src="../images/apps/${hero}-hero.webp"
                 srcset="../images/apps/${hero}-hero-sm.webp 400w, ../images/apps/${hero}-hero.webp 720w"
                 sizes="(max-width:900px) 94vw, 900px"
                 width="720" height="405" fetchpriority="high" decoding="async"
                 alt="${escA(a.name)} for ${esc(a.platform)} by Hasnain Studio X">
        </figure>` : ''}
        <section class="hero hero--single app-hero" aria-labelledby="app-title">
            <div class="hero-eyebrow">${esc(ad && ad.label ? ad.label : c.label)} &middot; ${esc(a.platform)} &middot; ${out ? esc(storeName === 'the Microsoft Store' ? 'Microsoft Store' : 'Google Play') : (cert ? 'In certification' : 'In development')}</div>
            <h1 id="app-title">${esc(a.name)}</h1>
            <p class="app-tagline">${esc(a.tagline)}</p>
            <p class="hero-sub">${esc(a.description)}</p>
            <div class="app-cta">
                <a class="btn btn--primary" href="${escA(storeHref)}"${out ? ' target="_blank" rel="noopener"' : ''}>
                    ${esc(ctaLabel)} <span aria-hidden="true">&rarr;</span></a>
                <a class="btn btn--secondary" href="${catalogue}">All ${esc(catalogueLabel)}</a>${pid ? `
                <a class="btn btn--ghost store-native" data-pid="${pid}" href="${escA(a.storeUrl)}" hidden>
                    Open in the Store app</a>` : ''}
            </div>
            <div class="proof-chips" style="justify-content:center;">
                <span class="proof-chip">No account</span>
                <span class="proof-chip">${ad ? 'No analytics' : 'No telemetry'}</span>
                <span class="proof-chip">No subscription</span>
                <span class="proof-chip">${ad ? 'Files stay on the phone' : isLinked(a) ? 'Your devices only' : isOffline(a) ? 'Runs offline' : 'Your data stays local'}</span>
            </div>${out && ad ? `
            <p class="buy-promise">Free on Google Play, with an optional one-time Pro unlock. There is no
            subscription and no account to keep it working. Genuine copies are published only on Google Play.</p>` : out ? `
            <p class="buy-promise">Buy it once through ${esc(storeName)}. There is no renewal, and no account to
            keep it working: the copy on your machine keeps running whether or not this studio is still here.
            Genuine copies are sold only on ${esc(storeName)}.</p>` : ''}${vram ? `
            <p class="gpu-badge">
                <span class="gpu-badge-ico" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><rect x="7" y="10" width="5" height="4" rx="1"/><path d="M16 10v4M7 18v2M17 18v2"/></svg>
                </span>
                <span class="gpu-badge-k">Minimum graphics</span>
                <span class="gpu-badge-v">${vram} GB+ dedicated VRAM</span>
            </p>` : ''}
        </section>

        <section class="section" aria-labelledby="f-title">
            <div class="section-header"><h2 id="f-title">What ${esc(a.name)} does</h2></div>
            <ul class="app-features">
${a.features.map(f => `                <li>${esc(f)}</li>`).join('\n')}
            </ul>
        </section>
${out ? fitFor(a) : ''}${out ? firstHourOf(a, ad) : ''}${video ? `
        <section class="section" aria-labelledby="video-title">
            <div class="section-header"><h2 id="video-title">Watch: ${esc(video.title)}</h2></div>
            <div class="app-video">
                <button type="button" class="app-video-play" data-yt="${escA(video.id)}" data-title="${escA(video.title)}"
                        aria-label="Play the video: ${escA(video.title)}">
                    <img src="../${video.thumb}" width="1280" height="720" loading="lazy" decoding="async" alt="">
                    <span class="app-video-icon" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg></span>
                </button>
            </div>
            <p class="app-note">${video.clock ? video.clock + ' long. ' : ''}Pressing play loads the video from YouTube. <a href="https://www.youtube.com/watch?v=${escA(video.id)}" target="_blank" rel="noopener">Watch it on YouTube</a></p>
        </section>` : ''}${(() => {
  const shots = shotsOf(a);
  if (!shots.length) return '';
  return `
        <section class="section" aria-labelledby="shots-title">
            <div class="section-header"><h2 id="shots-title">${esc(a.name)} on screen</h2></div>
            <div class="app-shots${ad ? ' app-shots--phone' : ''}">
${shots.map((n, i) => `                <figure class="app-shot">
                    <img src="../images/shots/${n}.webp"
                         srcset="${ad ? `../images/shots/${n}-sm.webp 270w, ../images/shots/${n}.webp 540w` : `../images/shots/${n}-sm.webp 600w, ../images/shots/${n}.webp 1200w`}"
                         sizes="${ad ? '(max-width:700px) 44vw, 180px' : '(max-width:700px) 92vw, 46vw'}"${(sz => sz ? ` width="${sz[0]}" height="${sz[1]}"` : '')(webpSize('images/shots/' + n + '.webp'))}
                         loading="lazy" decoding="async"
                         alt="${escA(a.name)} running on ${esc(a.platform)}, screen ${i + 1} of ${shots.length}">
                </figure>`).join('\n')}
            </div>
            <p class="app-note">${esc(a.name)} running on ${esc(a.platform)}, captured from the application itself.</p>
        </section>`;
})()}

${ad ? `
        <section class="section" aria-labelledby="inside-title">
            <div class="section-header"><h2 id="inside-title">Inside ${esc(a.name)}</h2></div>
            <div class="app-faq">
${ad.groups.map(([h, p]) => `                <div class="app-q"><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('\n')}
            </div>
        </section>
` : ''}        <section class="section" aria-labelledby="who-title">
            <div class="section-header"><h2 id="who-title">Who it is for</h2></div>
            <p class="app-lead">${esc(a.name)} is built for ${esc(ad ? ad.who : whoOf(a))}.</p>
            <p>It sits in the ${esc(ad && ad.label ? ad.label.toLowerCase() : catPhrase(c))} part of the catalogue, and ${esc(subj.short)}
            never leave the ${ad ? 'phone' : 'machine'} to be processed. There is no server behind ${esc(a.name)} to send them to.</p>
        </section>

        <section class="section" aria-labelledby="local-title">
            <div class="section-header"><h2 id="local-title">Local-first, by design</h2></div>
            <p>Plenty of the alternatives send ${esc(subj.short)} to a server to be
            handled. ${esc(a.name)} does not.
            Processing runs on your ${a.platform === 'Android' ? 'phone’s own processor' : 'CPU or GPU'},
            and ${esc(subj.long)} stay where you put them.${ad ? ' ' + esc(ad.net) : isLinked(a)
              ? ` ${esc(a.name)} does need your devices to be on the same network, but that is the only link involved: it runs over your own Wi-Fi or a hotspot, with nothing routed through a server and no internet connection required.`
              : isOffline(a)
              ? ' The application keeps working with the network switched off.'
              : ` ${esc(a.name)} does reach the internet for the content it displays, but nothing about you or your files travels the other way.`}</p>
            <p>That is not a setting you enable, it is how ${esc(a.name)} is built, which is why there is no
            account to create and no subscription to lapse.${vram ? ` It does ask for a graphics card with at
            least ${vram} GB of dedicated memory, because the work it would otherwise send to a server happens
            on that card instead.` : ''} Full detail is in the
            ${priv ? `<a href="../${escA(priv)}">${esc(a.name)} privacy policy</a>` : 'privacy policy'}.</p>${ad && ad.honest ? `
            <p>${esc(ad.honest)}</p>` : ''}
        </section>
${ad ? `
        <section class="section" aria-labelledby="pro-title">
            <div class="section-header"><h2 id="pro-title">Free and Pro</h2></div>
            <p class="app-lead">${esc(a.name)} is free on Google Play. ${esc(ad.free)}</p>
            <p>A one-time Pro unlock, with no subscription, adds:</p>
            <ul class="app-features">
${ad.pro.map(p => `                <li>${esc(p)}</li>`).join('\n')}
            </ul>${ad.proNote ? `
            <p>${esc(ad.proNote)}</p>` : ''}
            <p class="app-note">${esc(ADS)}</p>
        </section>

        <section class="section" aria-labelledby="asks-title">
            <div class="section-header"><h2 id="asks-title">What it asks your phone for</h2></div>
            <p class="app-lead">Android shows these when you install or first use a feature. Each one is used for the reason given, and for nothing else.</p>
            <dl class="app-spec">
${ad.asks.map(([k, v]) => `                <div class="spec-cell"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('\n')}
            </dl>
        </section>
` : ''}
        <section class="section" aria-labelledby="tech-title">
            <div class="section-header"><h2 id="tech-title">Technical details</h2></div>
            <dl class="app-spec">
                <div class="spec-cell"><dt>Platform</dt><dd>${esc(osFull)}</dd></div>
                <div class="spec-cell"><dt>Distribution</dt><dd>${esc(storeName === 'the Microsoft Store' ? 'Microsoft Store' : 'Google Play')}</dd></div>
                <div class="spec-cell spec-cell--${out ? 'good' : 'wait'}"><dt>Availability</dt><dd><span class="spec-dot" aria-hidden="true"></span>${out ? 'Available now' : (cert ? 'In certification' : 'In development')}</dd></div>
                <div class="spec-cell"><dt>Licence</dt><dd>${ad ? 'Free, optional one-time Pro' : 'Free trial, then one purchase'}</dd></div>${vram ? `
                <div class="spec-cell"><dt>Graphics</dt><dd>${vram} GB+ dedicated VRAM</dd></div>` : ''}
                <div class="spec-cell spec-cell--${ad ? 'note' : isOffline(a) ? 'good' : isLinked(a) ? 'good' : 'note'}"><dt>Network required</dt><dd><span class="spec-dot" aria-hidden="true"></span>${ad ? esc(ad.netShort) : isLinked(a) ? 'Your own network only' : isOffline(a) ? 'No, works offline' : 'Online content only'}</dd></div>
                <div class="spec-cell spec-cell--good"><dt>Account required</dt><dd><span class="spec-dot" aria-hidden="true"></span>None</dd></div>
                <div class="spec-cell spec-cell--${ad ? 'note' : 'good'}"><dt>Telemetry</dt><dd><span class="spec-dot" aria-hidden="true"></span>${ad ? 'None. Free version shows ads' : 'None'}</dd></div>
                <div class="spec-cell"><dt>Publisher</dt><dd>Hasnain Studio X</dd></div>
                <div class="spec-cell"><dt>Developer</dt><dd><a href="../about.html">Hasnain Butt Akhtar</a></dd></div>
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
              ? ad ? `Available now on Google Play. It is free, and a single optional purchase unlocks Pro for good, with no subscription and no account.`
                : `Available now on ${esc(storeName)}. Try it free, then a single purchase unlocks it for good with no subscription and no account.`
              : `${esc(a.name)} is ${esc(stageLine)}. It is not on sale yet. Send a message and I will tell you the day it goes live.`}</p>
            <p><a class="btn btn--primary" href="${escA(storeHref)}"${out ? ' target="_blank" rel="noopener"' : ''}>
                ${esc(ctaLabel)} <span aria-hidden="true">&rarr;</span></a></p>
${out && a.platform === 'Windows' ? `            <p class="app-lead">Not ready to buy yet? <a href="${HUB_STORE}" target="_blank" rel="noopener">HSX Apps Hub</a> is free on the Microsoft Store. It shows which of your HSX apps have updates and tells you when a new one is out.</p>
` : ''}${also.length ? `            <p class="app-lead">Also listed under ${also.map(h => `<a href="${h.slug}.html">${esc(h.nav.toLowerCase())}</a>`).join(' and ')}.</p>
` : ''}            <p class="app-note">${priv ? `<a href="../${escA(priv)}">${esc(a.name)} privacy policy</a> &middot; ` : ''}<a href="../contact.html">Support and bug reports</a> &middot; ${hub ? `<a href="${hub.slug}.html">${esc(hub.nav)} apps</a> &middot; ` : ''}<a href="${catalogue}">Full catalogue</a></p>
            <p class="app-tm">${
              markFor(a) === a.name
                ? `${esc(a.name)}&trade; is a trademark of Hasnain Studio X.`
                : `${esc(a.name)}&trade; and ${esc(markFor(a))}&trade; are trademarks of Hasnain Studio X.`
            }${isCoined(a) ? ` ${esc(markFor(a))}&trade; is a coined term originated by Hasnain Studio X.` : ''}
            Hasnain Studio X&trade; is a trade mark of Hasnain Studio X.</p>
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

/* which generated pages are Windows titles - used to split the sitemap */
module.exports.windowsSlugs = PAGES.filter(a => a.platform === 'Windows').map(a => slug(a));
