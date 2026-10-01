/* gen-community-pages.js
   Fills the generated parts of roadmap.html and showcase.html. Called by build.js.

   roadmap.json   ideas from the community page the studio has accepted:
                  [{ "title", "app", "status": "planned|building|shipped", "date": "YYYY-MM-DD",
                     "credit": "name shown, with permission", "note" }]
   showcase.json  published showcase entries, added by hand after review:
                  [{ "title", "app", "by", "link", "about", "date": "YYYY-MM-DD" }] */
const fs = require('fs'), path = require('path');
const P = f => path.join(__dirname, f);
const read = f => fs.readFileSync(P(f), 'utf8');
const load = (f, d) => { try { return JSON.parse(read(f)); } catch (e) { return d; } };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = d => { const [y, m, day] = d.split('-').map(Number); return `${day} ${MONTHS[m - 1]} ${y}`; };

function fill(file, marker, html) {
  if (!fs.existsSync(P(file))) return false;
  const s = read(file);
  const re = new RegExp(`(<!--${marker}_START-->)[\\s\\S]*?(\\s*<!--${marker}_END-->)`);
  if (!re.test(s)) return false;
  const out = s.replace(re, `$1\n${html}$2`);
  if (out !== s) fs.writeFileSync(P(file), out, 'utf8');
  return true;
}

const STATUS = { planned: 'Planned', building: 'Being built', shipped: 'Shipped' };

function roadmap(win, and, appSlug) {
  const byId = new Map([...win.map(a => [a.id, a]), ...and.map(a => [a.id, { ...a, platform: 'Android' }])]);
  const pageOf = a => 'apps/' + appSlug(a.name, a.platform) + '.html';

  const ideas = load('roadmap.json', []).filter(i => STATUS[i.status]);
  const ideaHtml = ideas.length
    ? `            <ul class="road-list">
${ideas.map(i => `                <li class="road-item road-${esc(i.status)}"><span class="road-tag">${STATUS[i.status]}</span><h3>${esc(i.title)}</h3><p>${esc(i.app)}${i.note ? '. ' + esc(i.note) : ''}</p>${i.credit ? `<p class="road-credit">Suggested by ${esc(i.credit)}</p>` : ''}</li>`).join('\n')}
            </ul>`
    : `            <p class="road-empty">Nothing here yet. When an idea from the <a href="community.html#idea">community page</a> is accepted, it appears here with its status, credited to the person who suggested it if they agree.</p>`;

  const soon = [...win, ...and.map(a => ({ ...a, platform: 'Android' }))].filter(a => a.status === 'soon');
  const soonHtml = soon.length
    ? `            <ul class="road-list">
${soon.map(a => `                <li class="road-item road-building"><span class="road-tag">${a.stage === 'certification' ? 'In certification' : 'In development'}</span><h3><a href="${pageOf(a)}">${esc(a.name)}</a></h3><p>${esc(a.tagline || '')}</p></li>`).join('\n')}
            </ul>`
    : `            <p class="road-empty">No new app is announced right now. New apps are listed here as soon as they are announced.</p>`;

  const facts = load('store-facts.json', {}).products || {};
  const notes = load('app-releases.json', {}).apps || {};
  const shipped = Object.entries(facts)
    .filter(([id, f]) => byId.has(id) && f.updated)
    .sort((a, b) => b[1].updated.localeCompare(a[1].updated))
    .slice(0, 12)
    .map(([id, f]) => {
      const a = byId.get(id);
      const isNew = f.released && f.released === f.updated;
      const note = ((notes[id] || {}).notes || []).find(n => n.d === f.updated);
      return `                <li class="road-item road-shipped"><span class="road-tag">${isNew ? 'New on the Store' : 'Updated'}, ${longDate(f.updated)}</span><h3><a href="${pageOf(a)}">${esc(a.name)}</a></h3><p>${esc(note ? note.t : a.tagline || '')}</p></li>`;
    });
  const shippedHtml = `            <ul class="road-list">
${shipped.join('\n')}
            </ul>`;

  const ok = fill('roadmap.html', 'ROAD_IDEAS', ideaHtml) && fill('roadmap.html', 'ROAD_SOON', soonHtml) && fill('roadmap.html', 'ROAD_SHIPPED', shippedHtml);
  return ok ? `  roadmap               ${ideas.length} ideas, ${soon.length} coming, ${shipped.length} recent releases` : '';
}

function showcase(win, and, appSlug) {
  const names = new Map([...win.map(a => [a.name, a]), ...and.map(a => [a.name, { ...a, platform: 'Android' }])]);
  const items = load('showcase.json', [])
    .filter(i => i.title && i.link && /^https?:\/\//.test(i.link))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const html = items.length
    ? `            <div class="show-grid">
${items.map(i => {
    const a = names.get(i.app);
    let host = '';
    try { host = new URL(i.link).hostname.replace(/^www\./, ''); } catch (e) { /* filtered above */ }
    return `                <article class="show-card">
                    <span class="road-tag">${a ? `<a href="apps/${appSlug(a.name, a.platform)}.html">${esc(i.app)}</a>` : esc(i.app)}</span>
                    <h3><a href="${esc(i.link)}" target="_blank" rel="noopener nofollow ugc">${esc(i.title)}</a></h3>
                    <p>${esc(i.about)}</p>
                    <p class="show-by">By ${esc(i.by)}${i.date ? ', ' + longDate(i.date) : ''} &middot; ${esc(host)}</p>
                </article>`;
  }).join('\n')}
            </div>`
    : `            <p class="road-empty">The first entries are being reviewed. Made something with one of the apps? Send it in below and it could be the first one here.</p>`;
  return fill('showcase.html', 'SHOWCASE', html) ? `  showcase              ${items.length} published entries` : '';
}

module.exports = { build: (win, and, appSlug) => [roadmap(win, and, appSlug), showcase(win, and, appSlug)].filter(Boolean).join('\n') };
