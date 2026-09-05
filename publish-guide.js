#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   HSX guides: release the next scheduled article

   Written guides wait in guides-src/scheduled/ with a "release" date in
   their front matter. This moves the ones that are due up into
   guides-src/, stamps them with today's date and leaves the rest alone.

     node publish-guide.js          release everything due today or earlier
     node publish-guide.js --next   release the next one regardless of date
     node publish-guide.js --list   show the queue without changing anything

   Then run the usual build to regenerate the site.
   ═══════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const ROOT = __dirname;
const SRC = path.join(ROOT, 'guides-src');
const SCHED = path.join(SRC, 'scheduled');
const today = new Date().toISOString().slice(0, 10);

if (!fs.existsSync(SCHED)) {
  console.log('  No guides-src/scheduled folder. Nothing to release.');
  process.exit(0);
}

const field = (s, k) => (s.match(new RegExp('"' + k + '":\\s*"([^"]*)"')) || [, ''])[1];

const queue = fs.readdirSync(SCHED).filter(f => f.endsWith('.html')).map(f => {
  const s = fs.readFileSync(path.join(SCHED, f), 'utf8');
  return { file: f, release: field(s, 'release'), title: field(s, 'title'), section: field(s, 'section') };
}).sort((a, b) => String(a.release).localeCompare(String(b.release)));

if (!queue.length) {
  console.log('  The queue is empty. Every guide is published.');
  process.exit(0);
}

const mode = process.argv[2] || '';

if (mode === '--list') {
  console.log('\n  ' + queue.length + ' guide' + (queue.length === 1 ? '' : 's') + ' waiting\n');
  for (const g of queue) {
    const due = g.release <= today ? ' DUE' : '';
    console.log('  ' + g.release + '  ' + (g.section || '').padEnd(16) + ' ' + g.title + due);
  }
  console.log();
  process.exit(0);
}

const due = mode === '--next' ? queue.slice(0, 1) : queue.filter(g => g.release <= today);

if (!due.length) {
  const next = queue[0];
  console.log('\n  Nothing due yet. Next is ' + next.release + ':');
  console.log('    ' + next.title);
  console.log('\n  Use --next to release it early.\n');
  process.exit(0);
}

for (const g of due) {
  const from = path.join(SCHED, g.file), to = path.join(SRC, g.file);
  if (fs.existsSync(to)) { console.log('  ! already published: ' + g.file); continue; }
  fs.renameSync(from, to);
  let s = fs.readFileSync(to, 'utf8');
  s = s.replace(/\n\s*"release":\s*"[^"]*",/, '');
  s = s.replace(/"published":\s*"[^"]*"/, '"published": "' + today + '"');
  fs.writeFileSync(to, s, 'utf8');
  console.log('  published  ' + g.title);
}

const left = fs.readdirSync(SCHED).filter(f => f.endsWith('.html')).length;
console.log('\n  ' + due.length + ' released, ' + left + ' still waiting.');
console.log('  Now run: node gen-app-pages.js && node gen-category-pages.js && node build.js\n');
