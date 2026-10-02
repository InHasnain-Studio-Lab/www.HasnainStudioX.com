/* Home page "Everything We Build" panels: the newest release and the AI Studio
   cell, written from hub-catalog.json. Run after tools/build-catalog.js so the
   newest event is already in the catalogue. */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const P = f => path.join(ROOT, f);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const page = p => (p.su || '').replace(/^https:\/\/hasnainstudiox\.com\//, '') || 'Windows-apps.html';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = d => { const [y, m, day] = d.split('-').map(Number); return `${day} ${MONTHS[m - 1]} ${y}`; };
const list = names => names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
const link = p => `<a href="${esc(page(p))}">${esc(p.n)}</a>`;

function replaceBlock(html, name, body) {
  const re = new RegExp(`(<!--${name}_START-->)[\\s\\S]*?(<!--${name}_END-->)`);
  if (!re.test(html)) throw new Error(`index.html: ${name} markers missing`);
  return html.replace(re, `$1\n${body}\n                    $2`);
}

function build() {
  let cat;
  try { cat = JSON.parse(fs.readFileSync(P('hub-catalog.json'), 'utf8')); }
  catch (e) { return '  home panels           skipped, no hub-catalog.json'; }

  const live = new Map((cat.ps || []).filter(p => p.st === 'live').map(p => [p.i, p]));
  const releases = [];
  for (const n of cat.ns || []) {
    if (n.k !== 'release' || !live.has(n.p) || releases.some(r => r.p.i === n.p)) continue;
    releases.push({ d: n.d, p: live.get(n.p) });
  }
  if (!releases.length) return '  home panels           skipped, no releases in the catalogue';

  const suiteName = Object.fromEntries((cat.cs || []).map(s => [s.k, s.s]));
  const [top, ...rest] = releases;
  let blurb = '';
  for (const sentence of (top.p.d || '').match(/[^.!?]+[.!?]+/g) || []) {
    if ((blurb + sentence).trim().length > 300) break;
    blurb = (blurb + sentence).trim();
  }
  if (!blurb) blurb = top.p.t.replace(/[^.!?]$/, '$&.');

  const ai = [...live.values()].filter(p => p.s === 'ai');
  const aiReleases = releases.filter(r => r.p.s === 'ai').slice(0, 3);
  const aiNew = aiReleases.map(r => link(r.p));
  /* the AI cell already names its newest apps */
  const also = rest.filter(r => !aiReleases.includes(r)).slice(0, 2).map(r => link(r.p));

  const latest = `                    <article class="bento-cell b-span2">
                        <span class="bento-kicker">New · ${esc(suiteName[top.p.s] || 'Windows')}</span>
                        <h3>${esc(top.p.n)}</h3>
                        <p>${esc(blurb)}</p>
                        <p class="bento-note">Released ${longDate(top.d)}${also.length ? `. Also new: ${list(also)}` : ''}.</p>
                        <div class="bento-cta"><a class="btn btn--secondary" href="${esc(page(top.p))}">See ${esc(top.p.n)}</a></div>
                    </article>`;

  const aiCell = `                    <article class="bento-cell b-span2">
                        <span class="bento-kicker">Creative · AI Studio</span>
                        <h3>AI Studio</h3>
                        <p>${ai.length} apps that generate images and clips, write, and read documents on your own PC. No API keys, no queues, no per-image billing.</p>
                        ${aiNew.length ? `<p class="bento-note">Newest: ${list(aiNew)}.</p>` : ''}
                        <div class="bento-art" aria-hidden="true">
                            <div class="viz viz-ai" style="margin:0;border:none;background:transparent;"><span class="va"><span class="va-orbit"><i></i></span><span class="va-orbit va-orbit2"><i></i></span><span class="va-core"></span></span></div>
                        </div>
                        <div class="bento-cta"><a class="btn btn--secondary" href="HSXAIstudio.html">View ${ai.length} AI apps</a></div>
                    </article>`;

  let html = fs.readFileSync(P('index.html'), 'utf8');
  const before = html;
  html = replaceBlock(html, 'LATEST', latest);
  html = replaceBlock(html, 'AISTUDIO', aiCell);
  if (html !== before) fs.writeFileSync(P('index.html'), html);
  return `  home panels           newest ${top.p.n}, AI Studio ${ai.length} apps`;
}

module.exports = { build };
if (require.main === module) console.log(build());
