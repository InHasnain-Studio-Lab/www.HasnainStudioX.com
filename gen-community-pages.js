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

/* New PC kits: every live app, in five Windows kits and one for the phone. The lists set
   the order and the picks that do not follow the catalogue group; any other live app lands
   by its group, so a new app is never missing. */
const KITS = [
  { id: 'productivity', name: 'Productivity', blurb: 'Documents, writing, focus, files and the small jobs you repeat every day.',
    ids: ['workxsuite', 'writedesk', 'docmento', 'focusroomultra', 'nimbusdock', 'automafy', 'quantumdrop', 'pcdownloadmanagerultra',
          'convertxpro', 'handsfreepc', 'browsex', 'horizonos', 'flipxstudio', 'castvisuality', 'autoclickx', 'docclarity',
          'socialdeckpro', 'pocktium', 'execrafter', 'qrcreatorstudio', 'nanocodify'] },
  { id: 'safety', name: 'Safety and care', blurb: 'Privacy, backups, recovery and keeping the PC quick as it fills up.',
    ids: ['pcguardx', 'fileguardianultra', 'bootforge', 'pcarchivepro', 'pctunex', 'mediatidyultra', 'pcvisionbulwark', 'pcturboxultra', 'pcbenchxultra'] },
  { id: 'creativity', name: 'Creativity', blurb: 'Recording, editing, photos, sound and design.',
    ids: ['pcscreenrecorderpro', 'primecut', 'photovidix', 'glowlab', 'creatorxstudio', 'spillframe', 'beatxpro', 'vaudioelite',
          'spatiaxultra', 'hypersonusultra', 'medialucent', 'webxstudio', 'image3dx', 'sensecapture', 'nanovisuality', 'pixumbrastudio'] },
  { id: 'ai', name: 'Local AI', blurb: 'Image, video and writing models that run on your own graphics card, with nothing uploaded.',
    ids: ['hsxstudioflow', 'dreammintai', 'forgexpro', 'fototensor', 'novadiffux', 'artgenstudio', 'quantumxai', 'dreamgenaiultra',
          'infinitegenai', 'pixunica', 'nostalgicel', 'morphlora'] },
  { id: 'explore', name: 'Explore and play', blurb: 'Globes, worlds, games and desktops that make the PC your own.',
    ids: ['planetx', 'planetxearthexplorer', 'terraorbitix', 'planetxinfinity', 'aetheris', 'gamefabrix', 'xseasons', 'nexusos',
          'quantumos', 'earthos'] },
];
const GROUP_KIT = { 'Local generation': 'ai', 'Worlds and play': 'explore', 'Audio and video': 'creativity',
  'Design and documents': 'productivity', 'Files and transfer': 'productivity', 'Performance and control': 'safety' };
const CAT_KIT = { ai: 'ai', media: 'creativity', productivity: 'productivity', utilities: 'safety' };

function kits(win, and, appSlug) {
  const cat = load('hub-catalog.json', {});
  const hub = new Map((cat.ps || []).map(p => [p.i, p]));
  const live = win.filter(a => a.status === 'live');
  const byId = new Map(live.map(a => [a.id, a]));
  const lists = new Map(KITS.map(k => [k.id, []]));
  const placed = new Set();
  for (const k of KITS) for (const id of k.ids) if (byId.has(id) && !placed.has(id)) { lists.get(k.id).push(byId.get(id)); placed.add(id); }
  for (const a of live) {
    if (placed.has(a.id)) continue;
    const h = hub.get(a.id);
    lists.get((h && GROUP_KIT[h.g]) || CAT_KIT[a.category] || 'productivity').push(a);
  }
  const storeOf = a => { const m = /apps\.microsoft\.com\/detail\/([A-Z0-9]+)/i.exec(a.storeUrl || ''); return m ? 'https://apps.microsoft.com/detail/' + m[1].toUpperCase() : a.storeUrl; };
  const card = (a, platform) => {
    const h = hub.get(a.id);
    const play = platform === 'Android';
    return `                    <article class="kit-app">
                        <span class="kit-dot" style="--app:${esc((h && h.a) || '#C7A5F7')}" aria-hidden="true"></span>
                        <h3><a href="apps/${appSlug(a.name, platform)}.html">${esc(a.name)}</a></h3>
                        <p>${esc(a.tagline || '')}</p>
                        <a class="kit-store" href="${esc(play ? a.storeUrl : storeOf(a))}" target="_blank" rel="noopener">${play ? 'Get it on Google Play' : 'Free trial on Microsoft Store'}<span class="visually-hidden"> for ${esc(a.name)}</span></a>
                    </article>`;
  };
  const phone = and.filter(a => a.status === 'live');
  const total = KITS.length;
  const sections = KITS.map((k, i) => `        <section class="section kit" id="${k.id}" data-cid="newpc-${k.id}" aria-labelledby="kit-${k.id}">
            <div class="section-header">
                <span class="kit-kicker">Kit ${i + 1} of ${total}</span>
                <h2 id="kit-${k.id}">${esc(k.name)}</h2>
                <p>${esc(k.blurb)}</p>
            </div>
            <div class="kit-grid">
${lists.get(k.id).map(a => card(a, 'Windows')).join('\n')}
            </div>
        </section>`);
  if (phone.length) sections.push(`        <section class="section kit" id="phone" data-cid="newpc-phone" aria-labelledby="kit-phone">
            <div class="section-header">
                <span class="kit-kicker">And your phone</span>
                <h2 id="kit-phone">Android</h2>
                <p>The same idea on your phone: no account, no cloud, free on Google Play with an optional one-time Pro unlock.</p>
            </div>
            <div class="kit-grid">
${phone.map(a => card(a, 'Android')).join('\n')}
            </div>
        </section>`);
  const pills = `            <nav class="camp-pills camp-pills--kits" aria-label="The kits">
${KITS.map(k => `                <a href="#${k.id}"><b>${esc(k.name)}</b><span>${lists.get(k.id).length} apps</span></a>`).join('\n')}${phone.length ? `
                <a href="#phone"><b>Android</b><span>${phone.length} apps</span></a>` : ''}
            </nav>`;
  const ok = fill('new-pc.html', 'KITS', sections.join('\n\n')) && fill('new-pc.html', 'KITPILLS', pills);
  const n = [...lists.values()].reduce((x, l) => x + l.length, 0);
  return ok ? `  new PC kits           ${n} of ${live.length} Windows apps, ${phone.length} Android` : '';
}

module.exports.build = ((prev) => (win, and, appSlug) => [prev(win, and, appSlug), kits(win, and, appSlug)].filter(Boolean).join('\n'))(module.exports.build);
