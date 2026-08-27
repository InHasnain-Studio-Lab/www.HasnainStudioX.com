#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   HSX category hub pages — one indexable landing page per catalogue
   category, generated from the same APPS arrays as everything else.

   Output: apps/<hub-slug>.html

   Why these exist: an app page answers a brand query ("HSX NovaDiffux"),
   and the catalogue answers "what does this studio make". Neither answers
   "offline photo editor for Windows", which is how someone who has never
   heard of the studio actually searches. Until now those queries had
   nowhere on the site to land, because the categories were JavaScript
   filters on one page rather than URLs.
   ═══════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const ROOT = __dirname, P = f => path.join(ROOT, f);
const read = f => fs.readFileSync(P(f), 'utf8');
const BASE = 'https://hasnainstudiox.com/';
const { HUBS } = require('./hsx-taxonomy.js');

function grab(src, startRe, endLit) {
  const m = src.match(startRe); if (!m) throw new Error('block not found: ' + startRe);
  const from = m.index + m[0].length;
  return src.slice(from, src.indexOf(endLit, from));
}
global.ico = global.ico || (() => '');

const winSrc = read('Windows-apps.html'), andSrc = read('android-apps.html');
const WIN = eval('[' + grab(winSrc, /const APPS = \[/, '\n        ];') + ']');
const AND = eval('[' + grab(andSrc, /const APPS = \[/, '\n        ];') + ']');
WIN.forEach(a => a.platform = 'Windows');
AND.forEach(a => a.platform = 'Android');
const ALL = WIN.concat(AND);

/* same category resolution as the app pages, so a hub always contains exactly
   the apps whose own pages point back to it */
const CATMAP_W = eval('({' + grab(winSrc, /var CATMAP = \{/, '\n        };') + '})');
const CATMAP_A = eval('({' + grab(andSrc, /var CATMAP = \{/, '\n        };') + '})');
const CAT_FALLBACK = { utilities: 'system', media: 'media', productivity: 'creative',
                       ai: 'ai', files: 'files', games: 'explore' };
const CAT_OVERRIDE = { nanocodify: 'dev', nanovisuality: 'photo', pixumbrastudio: 'photo',
                       glowlab: 'photo', photovidix: 'photo', mediatidyultra: 'photo' };
const keyOf = a => CAT_OVERRIDE[a.id] || CATMAP_W[a.id] || CATMAP_A[a.id]
               || CAT_FALLBACK[a.category] || 'system';

/* app slugs must match gen-app-pages.js exactly or every link here is a 404 */
const baseSlug = n => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const DUPES = (() => {
  const w = new Set(WIN.map(a => baseSlug(a.name))), d = new Set();
  for (const a of AND) if (w.has(baseSlug(a.name))) d.add(baseSlug(a.name));
  return d;
})();
const slug = a => {
  const b = baseSlug(a.name);
  return (a.platform === 'Android' && DUPES.has(b)) ? b + '-android' : b;
};
const hasRealCopy = a => Array.isArray(a.features) && a.features.length >= 3
  && !a.features.some(f => /to be announced/i.test(f));
const hasPage = a => a.status === 'live' || (a.status === 'soon' && hasRealCopy(a));

const esc  = s => String(s == null ? '' : s)
  .replace(/&(?![a-zA-Z#0-9]+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escA = s => esc(s).replace(/"/g, '&quot;');

/* page shell, borrowed from a policy page exactly as the app pages do */
const TPL = read('privacy/HSXStudioFlowPrivacy.html').replace(/(href|src)="\.\.\//g, '$1="');
const headOpen  = TPL.slice(0, TPL.indexOf('<body>'));
const afterBody = TPL.slice(TPL.indexOf('<body>'));
const upify = h => h
  .replace(/(href|src)="(?!http|mailto|#|\/|\.\.\/)/g, '$1="../')
  .replace(/srcset="(?!http|\.\.\/)/g, 'srcset="../');
const headerHTML = upify(afterBody.slice(0, afterBody.indexOf('<main')));
const footerHTML = upify(afterBody.slice(afterBody.indexOf('<footer')));

const OGIMG = BASE + 'images/og-windows.png';

function pageFor(hub) {
  const url = BASE + 'apps/' + hub.slug + '.html';
  const apps = ALL.filter(a => keyOf(a) === hub.key && hasPage(a))
    .sort((x, y) => (x.status === 'live' ? 0 : 1) - (y.status === 'live' ? 0 : 1)
                 || x.name.localeCompare(y.name));
  const live = apps.filter(a => a.status === 'live');
  const soon = apps.filter(a => a.status !== 'live');
  const hasAndroid = apps.some(a => a.platform === 'Android');
  const siblings = HUBS.filter(h => h.slug !== hub.slug);

  const KEYS = [hub.nav + ' apps', hub.h1, 'offline ' + hub.nav.toLowerCase() + ' software',
    'Windows ' + hub.nav.toLowerCase() + ' apps no subscription', 'Hasnain Studio X',
    'local-first software', 'HSX'].join(', ');

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
      { '@type': ['CollectionPage', 'WebPage'], '@id': url + '#webpage', url,
        name: hub.title, description: hub.desc, inLanguage: 'en-GB',
        isPartOf: { '@id': BASE + '#website' },
        publisher: { '@id': BASE + '#organization' },
        about: { '@id': url + '#list' },
        breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
          { '@type': 'ListItem', position: 2, name: 'Windows Apps', item: BASE + 'Windows-apps.html' },
          { '@type': 'ListItem', position: 3, name: hub.nav, item: url } ] } },
      { '@type': 'ItemList', '@id': url + '#list', name: hub.h1,
        description: hub.desc, numberOfItems: apps.length, itemListOrder: 'https://schema.org/ItemListUnordered',
        itemListElement: apps.map((a, i) => ({
          '@type': 'ListItem', position: i + 1, name: a.name,
          url: BASE + 'apps/' + slug(a) + '.html' })) },
      { '@type': 'FAQPage', '@id': url + '#faq', mainEntity: hub.faq.map(([q, ans]) => (
        { '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: ans } })) }
    ]
  };

  let h = headOpen;
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${escA(hub.title)}</title>`);
  const setMeta = (key, v) => {
    const re = new RegExp('(<meta\\s+(?:name|property)="' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s+content=")[\\s\\S]*?(")', 'g');
    h = h.replace(re, (m, x, y) => x + escA(v) + y);
  };
  setMeta('description', hub.desc);
  setMeta('og:title', hub.title);
  setMeta('og:description', hub.desc);
  setMeta('og:url', url);
  setMeta('og:image', OGIMG);
  setMeta('og:image:secure_url', OGIMG);
  setMeta('og:image:alt', hub.h1 + ' — Hasnain Studio X');
  setMeta('twitter:title', hub.title);
  setMeta('twitter:description', hub.desc);
  setMeta('twitter:image', OGIMG);
  setMeta('twitter:image:alt', hub.h1 + ' — Hasnain Studio X');
  h = h.replace(/(<link rel="canonical" href=")[\s\S]*?(")/, (m, x, y) => x + url + y);
  h = h.replace(/hreflang="en-GB" href="[^"]*"/, `hreflang="en-GB" href="${url}"`);
  h = h.replace(/hreflang="x-default" href="[^"]*"/, `hreflang="x-default" href="${url}"`);
  h = h.replace(/<meta name="keywords"[^>]*>\s*/g, '');
  h = h.replace('</head>', `    <meta name="keywords" content="${escA(KEYS)}"/>\n</head>`);
  h = h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    '<script type="application/ld+json">\n' + JSON.stringify(graph, null, 2) + '\n    </script>');
  h = upify(h);

  const card = a => `                <a class="cat-app${a.status === 'live' ? '' : ' cat-app--soon'}" href="${slug(a)}.html">
                    <span class="cat-app-h">
                        <span class="cat-app-n">${esc(a.name)}</span>
                        <span class="cat-app-p">${esc(a.platform)}${a.status === 'live' ? '' : ' &middot; coming soon'}</span>
                    </span>
                    <span class="cat-app-t">${esc(a.tagline)}</span>
${(a.features || []).slice(0, 3).map(f => `                    <span class="cat-app-f">${esc(f)}</span>`).join('\n')}
                    <span class="cat-app-go">Full details <span aria-hidden="true">&rarr;</span></span>
                </a>`;

  const main = `    <main id="main-content" class="container" role="main">
        <nav class="app-crumb" aria-label="Breadcrumb">
            <a href="../">Home</a> <span aria-hidden="true">/</span>
            <a href="../Windows-apps.html">Windows Apps</a> <span aria-hidden="true">/</span>
            <span aria-current="page">${esc(hub.nav)}</span>
        </nav>

        <section class="hero hero--single app-hero" aria-labelledby="cat-title">
            <div class="hero-eyebrow">${live.length} available now${soon.length ? ` &middot; ${soon.length} coming soon` : ''}</div>
            <h1 id="cat-title">${esc(hub.h1)}</h1>
            <p class="app-tagline">${esc(hub.lead)}</p>
            <div class="proof-chips" style="justify-content:center;">
                <span class="proof-chip">No account</span>
                <span class="proof-chip">No telemetry</span>
                <span class="proof-chip">No subscription</span>
                <span class="proof-chip">Bought once</span>
            </div>
        </section>

        <section class="section" aria-labelledby="why-title">
            <div class="section-header"><h2 id="why-title">Why these run on your own machine</h2></div>
            <p class="app-lead">${esc(hub.body)}</p>
        </section>

        <section class="section" aria-labelledby="check-title">
            <div class="section-header"><h2 id="check-title">What to check before you buy anything in this category</h2></div>
            <dl class="cat-check">
${hub.check.map(([t, d]) => `                <div class="cat-check-row"><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('\n')}
            </dl>
        </section>

        <section class="section" aria-labelledby="apps-title">
            <div class="section-header"><h2 id="apps-title">${live.length} ${esc(hub.nav.toLowerCase())} application${live.length === 1 ? '' : 's'} available now</h2></div>
            <div class="cat-grid">
${live.map(card).join('\n')}
            </div>
        </section>
${soon.length ? `
        <section class="section" aria-labelledby="soon-title">
            <div class="section-header"><h2 id="soon-title">Coming soon</h2></div>
            <p>These are finished or in certification but not yet on sale. Each page describes what the
            application does; none of them carries a download link until it is genuinely available.</p>
            <div class="cat-grid">
${soon.map(card).join('\n')}
            </div>
        </section>
` : ''}
        <section class="section" aria-labelledby="faq-title">
            <div class="section-header"><h2 id="faq-title">Questions about ${esc(hub.nav.toLowerCase())} apps</h2></div>
            <div class="app-faq">
${hub.faq.map(([q, ans]) => `                <div class="app-q"><h3>${esc(q)}</h3><p>${esc(ans)}</p></div>`).join('\n')}
            </div>
        </section>

        <section class="section" aria-labelledby="more-title">
            <div class="section-header"><h2 id="more-title">Other parts of the catalogue</h2></div>
            <div class="cat-siblings">
${siblings.map(s => `                <a class="cat-sib" href="${s.slug}.html"><span class="cat-sib-n">${esc(s.nav)}</span><span class="cat-sib-t">${esc(s.h1)}</span></a>`).join('\n')}
            </div>
            <p class="app-note"><a href="../Windows-apps.html">Full Windows catalogue</a>${hasAndroid ? ' &middot; <a href="../android-apps.html">Android catalogue</a>' : ''} &middot; <a href="../privacy-policies.html">Privacy policies</a> &middot; <a href="../about.html">About the studio</a></p>
            <p class="app-tm">Hasnain Studio X&reg; is a registered trademark. Product names shown on this page
            are trademarks of Hasnain Studio X.</p>
        </section>
    </main>`;

  return h + '<body>\n' + headerHTML.slice('<body>\n'.length) + main + '\n\n    ' + footerHTML;
}

if (!fs.existsSync(P('apps'))) fs.mkdirSync(P('apps'));
let n = 0, total = 0;
for (const hub of HUBS) {
  fs.writeFileSync(path.join(P('apps'), hub.slug + '.html'), pageFor(hub), 'utf8');
  total += ALL.filter(a => keyOf(a) === hub.key && hasPage(a)).length;
  n++;
}
console.log(`  category hubs   ${n} generated, ${total} app placements`);

/* consumed by gen-app-pages.js so each app links back to its own hub */
module.exports.hubFor = a => HUBS.find(h => h.key === keyOf(a)) || null;
module.exports.keyOf = keyOf;
