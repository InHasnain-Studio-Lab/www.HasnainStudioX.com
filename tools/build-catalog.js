#!/usr/bin/env node
/*
   Reads the studio website and writes the catalogue the Hub reads.

     node Tools/Sync-Catalog.js [path to the website repo]

   Defaults to D:/Github Website Repo/www.HasnainStudioX.com

   What comes out:
     HSXAppsHub/Assets/catalog.json   bundled into the next Hub build
     HSXAppsHub/Assets/Heroes/*.jpg   tile artwork, converted from the site
     <website>/hub-catalog.json       publish this so installed Hubs refresh

   Run it after adding, renaming or removing an app on the site.
*/

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SITE = process.argv[2] || 'D:/Github Website Repo/www.HasnainStudioX.com';
const ROOT = path.resolve(__dirname, '..');
const BUNDLED = path.join(ROOT, 'HSXAppsHub', 'Assets', 'catalog.json');
const HEROES = path.join(ROOT, 'HSXAppsHub', 'Assets', 'Heroes');
const PUBLISHED = path.join(SITE, 'hub-catalog.json');

const read = file => fs.readFileSync(path.join(SITE, file), 'utf8');

/* ── suites ─────────────────────────────────────────────────────────────── */

const SUITE_OF = {
    system: 'system', files: 'system', utilities: 'system',
    ai: 'ai',
    creative: 'creative', media: 'creative', explore: 'creative', productivity: 'creative',
};

const BAND_OF = {
    system: 'Performance and control', files: 'Files and transfer', utilities: 'Performance and control',
    ai: 'Local generation',
    creative: 'Design and documents', media: 'Audio and video', explore: 'Worlds and play',
    productivity: 'Design and documents',
};

const SUITES = [
    { k: 'system', n: 'HSX System Suite', s: 'System', t: 'Performance, privacy, desktop control and file movement', a: '#C7A5F7', x: '001' },
    { k: 'ai', n: 'HSX AI Studio Suite', s: 'AI Studio', t: 'Generation and understanding that runs on your own GPU', a: '#F2DFB8', x: '002' },
    { k: 'creative', n: 'HSX Creative Utilities', s: 'Creative', t: 'Audio, video, design, documents and simulated worlds', a: '#F3B3CF', x: '003' },
];

/* ── page readers ───────────────────────────────────────────────────────── */

function readApps(file) {
    const source = read(file);
    const block = source.match(/const APPS = \[([\s\S]*?)\n {8}\];/);
    if (!block) throw new Error(`no app list in ${file}`);
    const ico = d => d;
    return eval('[' + block[1] + ']');
}

function readMap(file, name) {
    const source = read(file);
    const block = source.match(new RegExp(`var ${name} = \\{([\\s\\S]*?)\\n {8}\\};`));
    return block ? eval('({' + block[1] + '})') : {};
}

/* HEROES and APPPAGES sit on one line between marker comments. */
function readInline(file, name) {
    const source = read(file);
    const block = source.match(new RegExp(`/\\*${name}_START\\*/\\s*var ${name} = (\\{.*?\\});`));
    return block ? JSON.parse(block[1]) : {};
}

/* Each app carries a hand drawn 40x40 motif in the static markup. */
function readMarks(file) {
    const source = read(file);
    const start = source.indexOf('<!--APPS_STATIC_START-->');
    const end = source.indexOf('<!--APPS_STATIC_END-->');
    const section = source.slice(start < 0 ? 0 : start, end < 0 ? source.length : end);

    const marks = {};
    const pattern = /data-id="([^"]+)"[\s\S]*?<div class="app-logo\s*"><svg([\s\S]*?)<\/svg>/g;
    let hit;
    while ((hit = pattern.exec(section))) marks[hit[1]] = '<svg' + hit[2] + '</svg>';
    return marks;
}

/* ── mark conversion: svg primitives to path data ───────────────────────── */

const round = value => Math.round(parseFloat(value) * 1000) / 1000;
const num = value => String(round(value));

function boxPath(x, y, w, h, r) {
    x = round(x); y = round(y); w = round(w); h = round(h);
    r = r ? Math.min(round(r), w / 2, h / 2) : 0;
    if (!r) return `M${num(x)},${num(y)} L${num(x + w)},${num(y)} L${num(x + w)},${num(y + h)} L${num(x)},${num(y + h)} Z`;
    return `M${num(x + r)},${num(y)} L${num(x + w - r)},${num(y)} A${num(r)},${num(r)} 0 0 1 ${num(x + w)},${num(y + r)}`
        + ` L${num(x + w)},${num(y + h - r)} A${num(r)},${num(r)} 0 0 1 ${num(x + w - r)},${num(y + h)}`
        + ` L${num(x + r)},${num(y + h)} A${num(r)},${num(r)} 0 0 1 ${num(x)},${num(y + h - r)}`
        + ` L${num(x)},${num(y + r)} A${num(r)},${num(r)} 0 0 1 ${num(x + r)},${num(y)} Z`;
}

function ovalPath(cx, cy, rx, ry) {
    cx = round(cx); cy = round(cy); rx = round(rx); ry = round(ry);
    return `M${num(cx - rx)},${num(cy)} A${num(rx)},${num(ry)} 0 1 0 ${num(cx + rx)},${num(cy)}`
        + ` A${num(rx)},${num(ry)} 0 1 0 ${num(cx - rx)},${num(cy)} Z`;
}

const attr = (tag, name) => {
    const hit = tag.match(new RegExp('[ ]' + name + '="([^"]*)"'));
    return hit ? hit[1] : null;
};

function toStrokes(svg) {
    const strokes = [];
    const body = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    const tokens = body.match(/<\/?(?:g|path|rect|circle|ellipse)\b[^>]*>/g) || [];
    const groups = [];

    for (const token of tokens) {
        if (/^<\/g/.test(token)) { groups.pop(); continue; }
        if (/^<g/.test(token)) { groups.push(attr(token, 'class') || ''); continue; }

        const classes = (groups.join(' ') + ' ' + (attr(token, 'class') || '')).trim().split(String.fromCharCode(10)).filter(Boolean);
        let figure = null;

        if (/^<path/.test(token)) figure = attr(token, 'd');
        else if (/^<rect/.test(token)) figure = boxPath(attr(token, 'x') || 0, attr(token, 'y') || 0, attr(token, 'width'), attr(token, 'height'), attr(token, 'rx'));
        else if (/^<circle/.test(token)) figure = ovalPath(attr(token, 'cx'), attr(token, 'cy'), attr(token, 'r'), attr(token, 'r'));
        else if (/^<ellipse/.test(token)) figure = ovalPath(attr(token, 'cx'), attr(token, 'cy'), attr(token, 'rx'), attr(token, 'ry'));
        if (!figure) continue;

        strokes.push({
            d: figure.replace(/\s+/g, ' ').trim(),
            k: classes.includes('s') ? 's' : 'f',
            o: classes.includes('dim') ? 0.28 : classes.includes('mid') ? 0.6 : 1,
            g: classes.includes('gl') ? 1 : 0,
        });
    }
    return strokes;
}

/* ── contact ────────────────────────────────────────────────────────────── */

function readContact() {
    const source = read('contact.html');
    const endpoint = (source.match(/action="(https:\/\/formspree\.io\/f\/[^"]+)"/) || [])[1] || null;

    const pick = id => {
        const block = source.match(new RegExp(`<select id="${id}"[\\s\\S]*?<\\/select>`));
        if (!block) return [];
        return [...block[0].matchAll(/<option[^>]*>([^<]*)<\/option>/g)]
            .map(m => m[1].trim())
            .filter(v => v && !/^select /i.test(v));
    };

    const social = source.match(/https:\/\/x\.com\/[A-Za-z0-9_]+/);

    return {
        e: endpoint,
        m: (source.match(/mailto:([^"]+)"/) || [])[1] || 'Hasnain@outlook.at',
        x: social ? social[0] : null,
        t: pick('c-topic'),
        p: pick('c-platform'),
    };
}

/* ── build ──────────────────────────────────────────────────────────────── */

const clean = value => String(value == null ? '' : value)
    .replace(/[\u2012\u2013\u2014]/g, '-')
    .replace(/\u2019/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2264/g, 'up to ');

const listingKey = url => {
    const hit = /\/detail\/([A-Z0-9]+)/i.exec(url || '');
    return hit ? hit[1].toUpperCase() : null;
};

function aliases(name) {
    return [...new Set([
        name,
        name.replace(/^HSX /, ''),
        name.replace(/\bUltra\b/, '').trim(),
        name.replace(/\bPro\b/, '').trim(),
        name.replace(/[^A-Za-z0-9]/g, ''),
        name.replace(/^HSX /, '').replace(/[^A-Za-z0-9]/g, ''),
    ])].filter(v => v && v.length > 2);
}

function readReleases() {
    const file = path.join(SITE, 'app-releases.json');
    if (!fs.existsSync(file)) return {};

    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return {};
    }
}

function build(app, index, platform, siteCategory, marks, heroes, pages) {
    const suite = SUITE_OF[siteCategory] || 'creative';
    const tone = SUITES.find(s => s.k === suite).a;
    const external = /^https?:/.test(app.storeUrl);

    return {
        i: app.id,
        n: clean(app.name),
        x: String(index + 1).padStart(3, '0'),
        pf: platform,
        s: suite,
        g: BAND_OF[siteCategory] || 'Performance and control',
        a: tone,
        t: clean(app.tagline),
        d: clean(app.description),
        f: (app.features || []).map(clean),
        st: app.status,
        b: clean(app.badge),
        u: external ? app.storeUrl : 'https://hasnainstudiox.com/' + app.storeUrl,
        p: listingKey(app.storeUrl),
        pu: /^https?:/.test(app.privacyUrl) ? app.privacyUrl : 'https://hasnainstudiox.com/' + app.privacyUrl,
        su: pages[app.id]
            ? 'https://hasnainstudiox.com/' + pages[app.id]
            : 'https://hasnainstudiox.com/' + (platform === 'and' ? 'android-apps.html' : 'Windows-apps.html'),
        h: heroes[app.id] || null,
        m: { a: aliases(app.name), b: [] },
        r: (releases[app.id] || {}).version || null,
        cl: ((releases[app.id] || {}).notes || []).map(note => ({
            v: clean(note.v),
            d: clean(note.d),
            n: String(note.t || '').split(String.fromCharCode(10)).map(clean).filter(Boolean),
        })).filter(note => note.v),
        gl: marks[app.id] ? toStrokes(marks[app.id]) : [],
    };
}

const catmap = readMap('Windows-apps.html', 'CATMAP');
const winMarks = readMarks('Windows-apps.html');
const andMarks = readMarks('android-apps.html');

const winHeroes = readInline('Windows-apps.html', 'HEROES');
const andHeroes = readInline('android-apps.html', 'HEROES');
const winPages = readInline('Windows-apps.html', 'APPPAGES');
const andPages = readInline('android-apps.html', 'APPPAGES');

const feed = readReleases();
const releases = feed.apps || {};

const windows = readApps('Windows-apps.html');
const android = readApps('android-apps.html');

const products = [
    ...windows.map((a, i) => build(a, i, 'win', catmap[a.id] || a.category, winMarks, winHeroes, winPages)),
    ...android.map((a, i) => build(a, windows.length + i, 'and', catmap[a.id] || a.category, andMarks, andHeroes, andPages)),
];

SUITES.forEach(suite => {
    suite.c = products.filter(p => p.s === suite.k).length;
    suite.cl = products.filter(p => p.s === suite.k && p.st === 'live').length;
});

const catalogue = {
    v: 1,
    d: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    pb: {
        n: 'Hasnain Studio X',
        a: 'Hasnain Butt Akhtar',
        s: 'https://hasnainstudiox.com',
        c: 'Hasnain@outlook.at',
        l: 'England, United Kingdom',
    },
    ct: readContact(),
    bl: (feed.bundles || []).map(bundle => ({
        i: clean(bundle.key),
        n: clean(bundle.name),
        t: clean(bundle.line),
        pr: Number(bundle.price) || 0,
        ks: (bundle.apps || []).map(clean),
    })).filter(bundle => bundle.i && bundle.ks.length),
    cs: SUITES,
    ps: products,
};

const payload = JSON.stringify(catalogue);

/* The Hub tree is absent when this runs on the website side, in CI. */
const bundling = fs.existsSync(path.dirname(BUNDLED));
if (bundling) fs.writeFileSync(BUNDLED, payload, 'utf8');
fs.writeFileSync(PUBLISHED, payload, 'utf8');

const pairs = bundling ? products.filter(p => p.h).map(p => `${p.i}:${p.h}`) : [];
try {
    if (pairs.length === 0) throw new Error('nothing to convert');
    const out = execFileSync('python', [path.join(__dirname, 'heroes.py'), SITE, HEROES, ...pairs],
        { encoding: 'utf8' });
    process.stdout.write(out);
}
catch (error) {
    console.log('heroes: artwork step skipped (' + (error.stderr || error.message).toString().trim() + ')');
}

const win = products.filter(p => p.pf === 'win');
const and = products.filter(p => p.pf === 'and');
const missing = products.filter(p => !p.gl.length).map(p => p.i);
const noHero = products.filter(p => !p.h).map(p => p.i);

console.log(`${products.length} apps  ${win.length} Windows  ${and.length} Android`);
SUITES.forEach(s => console.log(`  ${s.x}  ${s.n.padEnd(24)} ${String(s.c).padStart(2)} apps  ${String(s.cl).padStart(2)} live`));
if (missing.length) console.log(`  no mark for: ${missing.join(', ')}`);
if (noHero.length) console.log(`  no hero for: ${noHero.join(', ')}`);

const withBuild = products.filter(p => p.r).length;
console.log(withBuild
    ? `  published builds: ${withBuild}`
    : '  published builds: none (record one with Tools/Release.js)');
console.log(`  contact form ${catalogue.ct.e ? 'found' : 'not found'}`);
if (bundling) console.log(`\nbundled   ${BUNDLED}`);
console.log(`published ${PUBLISHED}`);
console.log(`${(payload.length / 1024).toFixed(0)} KB`);
