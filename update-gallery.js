#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   HASNAIN STUDIO X — Gallery updater

   Scans the "images" folder and rewrites gallery-data.js automatically.
   You never edit code: drop files in, double-click update-gallery.bat.

   NAMING YOUR FILES (optional but recommended)
   ───────────────────────────────────────────
   The tool reads the filename to fill in the title and category:

       portrait__Neon-Rain__StudioFlow-SDXL.jpg
       └ category   └ title      └ how it was made

   Use double underscores "__" between the three parts, and single
   hyphens "-" instead of spaces. Any part you leave out is simply
   skipped — even "whatever.jpg" works fine.

   Categories that get a filter button: portrait, concept, video, product.
   Anything else is grouped under "Other".

   Existing titles/descriptions you have hand-edited in gallery-data.js
   are preserved — this tool only adds new files and drops missing ones.
   ═══════════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const ROOT     = __dirname;
const IMG_DIR  = path.join(ROOT, 'images');
const OUT_FILE = path.join(ROOT, 'gallery-data.js');
const EXT      = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
const KNOWN    = new Set(['portrait', 'concept', 'video', 'product']);

function titleCase(s) {
  return s.replace(/[-_]+/g, ' ').trim()
          .replace(/\s+/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
}

/* Read PNG / JPEG / WebP dimensions from the file header so the page can
   reserve the right space and never jump while loading. */
function dimensions(file) {
  try {
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(65536);
    const len = fs.readSync(fd, buf, 0, 65536, 0);
    fs.closeSync(fd);

    if (buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a')        // PNG
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };

    if (buf[0] === 0xFF && buf[1] === 0xD8) {                           // JPEG
      let o = 2;
      while (o < len) {
        if (buf[o] !== 0xFF) { o++; continue; }
        const m = buf[o + 1];
        if (m >= 0xC0 && m <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(m))
          return { h: buf.readUInt16BE(o + 5), w: buf.readUInt16BE(o + 7) };
        o += 2 + buf.readUInt16BE(o + 2);
      }
    }

    if (buf.slice(0, 4).toString() === 'RIFF' &&
        buf.slice(8, 12).toString() === 'WEBP') {                       // WebP
      const f = buf.slice(12, 16).toString();
      if (f === 'VP8X') return { w: (buf.readUIntLE(24, 3) & 0xFFFFFF) + 1,
                                 h: (buf.readUIntLE(27, 3) & 0xFFFFFF) + 1 };
      if (f === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3FFF,
                                 h: buf.readUInt16LE(28) & 0x3FFF };
      if (f === 'VP8L') {
        const b = buf.readUInt32LE(21);
        return { w: (b & 0x3FFF) + 1, h: ((b >> 14) & 0x3FFF) + 1 };
      }
    }
  } catch (_) { /* fall through */ }
  return { w: 0, h: 0 };
}

/* keep any hand-written titles/descriptions from the previous run */
function existing() {
  const map = {};
  if (!fs.existsSync(OUT_FILE)) return map;
  try {
    const txt = fs.readFileSync(OUT_FILE, 'utf8');
    const arr = txt.slice(txt.indexOf('['), txt.lastIndexOf(']') + 1);
    // eslint-disable-next-line no-eval
    for (const it of eval(arr)) if (it && it.src) map[it.src] = it;
  } catch (_) { /* first run or hand-broken file — start clean */ }
  return map;
}

if (!fs.existsSync(IMG_DIR)) {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  console.log('Created the "images" folder. Put your artwork in it and run this again.');
}

const prev = existing();
/* Only real artwork belongs in the gallery. Skip:
     - site furniture: og-* social cards, icon-* app icons
     - derivatives:    *-thumb.*  and any .webp/.avif that optimise-images.py
                       generated next to an original (the <picture> element
                       already asks for those by name)                        */
const SITE_ASSET = /^(og-|icon-|favicon|apple-touch-icon)/i;
const DERIVATIVE = /-thumb\.[a-z0-9]+$/i;
const SOURCE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif']);

const allNames = new Set(fs.readdirSync(IMG_DIR));
const hasSourceTwin = f => {
  const base = path.basename(f, path.extname(f));
  return [...SOURCE_EXT].some(e => allNames.has(base + e));
};

const files = fs.readdirSync(IMG_DIR)
  .filter(f => EXT.has(path.extname(f).toLowerCase()))
  .filter(f => !SITE_ASSET.test(f))
  .filter(f => !DERIVATIVE.test(f))
  .filter(f => SOURCE_EXT.has(path.extname(f).toLowerCase()) || !hasSourceTwin(f))
  .sort((a, b) => fs.statSync(path.join(IMG_DIR, b)).mtimeMs -   // newest first
                  fs.statSync(path.join(IMG_DIR, a)).mtimeMs);

const items = files.map(f => {
  const src  = 'images/' + f;
  const base = path.basename(f, path.extname(f));
  const bits = base.split('__');

  let tag = 'concept', title = titleCase(base), desc = '';
  if (bits.length >= 2) {
    const t = bits[0].toLowerCase();
    tag = KNOWN.has(t) ? t : 'other';
    title = titleCase(bits[1]);
    if (bits[2]) desc = titleCase(bits[2]).replace(/\s+/g, ' ');
  }

  const d = dimensions(path.join(IMG_DIR, f));
  const keep = prev[src] || {};
  return {
    src,
    tag:   keep.tag   || tag,
    title: keep.title || title,
    desc:  keep.desc  || desc,
    alt:   keep.alt   || (title + ' — AI artwork by Hasnain Studio X'),
    w: d.w, h: d.h
  };
});

const header = `/* ═══════════════════════════════════════════════════════════════════════
   HASNAIN STUDIO X — AI Studio gallery data
   AUTO-GENERATED by update-gallery.js — last run: file count ${items.length}

   To add artwork:   drop files into the "images" folder,
                     then double-click update-gallery.bat

   You may hand-edit any "title", "desc", "tag" or "alt" below —
   re-running the tool keeps your edits and only adds/removes files.
   ═══════════════════════════════════════════════════════════════════════ */
window.GALLERY_IMAGES = `;

fs.writeFileSync(OUT_FILE, header + JSON.stringify(items, null, 2) + ';\n', 'utf8');

console.log(`\n  Gallery updated — ${items.length} image${items.length === 1 ? '' : 's'}.`);
const byTag = items.reduce((a, i) => (a[i.tag] = (a[i.tag] || 0) + 1, a), {});
for (const [t, c] of Object.entries(byTag)) console.log(`    ${t.padEnd(10)} ${c}`);
const noDim = items.filter(i => !i.w).length;
if (noDim) console.log(`    (${noDim} file${noDim === 1 ? '' : 's'} had unreadable dimensions — still shown)`);
console.log('\n  Wrote gallery-data.js. Refresh the AI Studio page to see it.\n');
