#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   HSX guides: long-form articles, generated from guides-src/

   Output: guides/<slug>.html, plus guides/index.html

   To add a guide, drop an HTML fragment in guides-src/<slug>.html opening
   with a JSON front matter comment. Nothing else needs editing.

   Required front matter: title, description, published.
   Optional: nav, h1, standfirst, section, updated, keywords, apps.
   ═══════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const ROOT = __dirname, P = f => path.join(ROOT, f);
const read = f => fs.readFileSync(P(f), 'utf8');
const BASE = 'https://hasnainstudiox.com/';
const SRC = 'guides-src', OUT = 'guides';

const esc  = s => String(s == null ? '' : s)
  .replace(/&(?![a-zA-Z#0-9]+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escA = s => esc(s).replace(/"/g, '&quot;');

const FM_RE = /^\s*<!--\s*HSX:GUIDE\s*([\s\S]*?)-->\s*/;

function load(file) {
  const raw = fs.readFileSync(path.join(P(SRC), file), 'utf8');
  const m = raw.match(FM_RE);
  if (!m) throw new Error(file + ': missing HSX:GUIDE front matter');
  let fm;
  try { fm = JSON.parse(m[1]); }
  catch (e) { throw new Error(file + ': front matter is not valid JSON, ' + e.message); }
  for (const k of ['title', 'description', 'published']) {
    if (!fm[k]) throw new Error(file + ': front matter is missing "' + k + '"');
  }
  const body = raw.slice(m[0].length).trim();
  const words = body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Object.assign({ slug: file.replace(/\.html$/, ''), body, words }, fm);
}

const GUIDES = fs.existsSync(P(SRC))
  ? fs.readdirSync(P(SRC)).filter(f => f.endsWith('.html')).map(load)
      .sort((a, b) => String(b.published).localeCompare(String(a.published)))
  : [];

/* page shell, borrowed from a policy page exactly as the app pages do */
const TPL = read('privacy/HSXStudioFlowPrivacy.html').replace(/(href|src)="\.\.\//g, '$1="');
const headOpen  = TPL.slice(0, TPL.indexOf('<body>'));
const afterBody = TPL.slice(TPL.indexOf('<body>'));
const upify = h => h
  .replace(/(href|src)="(?!http|mailto|#|\/|\.\.\/)/g, '$1="../')
  .replace(/srcset="(?!http|\.\.\/)/g, 'srcset="../');
const headerHTML = upify(afterBody.slice(0, afterBody.indexOf('<main')));
const footerHTML = upify(afterBody.slice(afterBody.indexOf('<footer')));
const OGIMG = BASE + 'images/og-home.png';

const ORG = {
  '@type': 'Organization', '@id': BASE + '#organization', name: 'Hasnain Studio X', url: BASE,
  alternateName: ['InHasnain', 'HSX', 'Hasnain StudioX', 'HasnainStudioX', 'Hasnain Studio'],
  logo: { '@type': 'ImageObject', url: BASE + 'images/icon-512.png', width: 512, height: 512 },
  founder: { '@type': 'Person', '@id': BASE + '#founder', name: 'Hasnain Butt Akhtar' },
  sameAs: ['https://x.com/HasnainStudioX',
           'https://apps.microsoft.com/search/publisher?name=Hasnain+Studio+X',
           'https://play.google.com/store/apps/developer?id=Hasnain+Studio+X']
};
const SITE = { '@type': 'WebSite', '@id': BASE + '#website', url: BASE, name: 'Hasnain Studio X',
               publisher: { '@id': BASE + '#organization' }, inLanguage: 'en-GB' };
const AUTHOR = { '@type': 'Person', '@id': BASE + '#founder', name: 'Hasnain Butt Akhtar',
                 jobTitle: 'Founder and developer', worksFor: { '@id': BASE + '#organization' },
                 url: BASE + 'about.html' };

function shell({ url, title, desc, keywords, graph, main }) {
  let h = headOpen;
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${escA(title)}</title>`);
  const setMeta = (key, v) => {
    const re = new RegExp('(<meta\\s+(?:name|property)="' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      + '"\\s+content=")[\\s\\S]*?(")', 'g');
    h = h.replace(re, (m, x, y) => x + escA(v) + y);
  };
  setMeta('description', desc);
  setMeta('og:title', title);
  setMeta('og:description', desc);
  setMeta('og:url', url);
  setMeta('og:image', OGIMG);
  setMeta('og:image:secure_url', OGIMG);
  setMeta('og:image:alt', title);
  setMeta('twitter:title', title);
  setMeta('twitter:description', desc);
  setMeta('twitter:image', OGIMG);
  setMeta('twitter:image:alt', title);
  h = h.replace(/(<link rel="canonical" href=")[\s\S]*?(")/, (m, x, y) => x + url + y);
  h = h.replace(/hreflang="en-GB" href="[^"]*"/, `hreflang="en-GB" href="${url}"`);
  h = h.replace(/hreflang="x-default" href="[^"]*"/, `hreflang="x-default" href="${url}"`);
  h = h.replace(/<meta name="keywords"[^>]*>\s*/g, '');
  h = h.replace('</head>', `    <meta name="keywords" content="${escA(keywords)}"/>\n</head>`);
  h = h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    '<script type="application/ld+json">\n' + JSON.stringify(graph, null, 2) + '\n    </script>');
  h = upify(h);
  return h + '<body>\n' + headerHTML.slice('<body>\n'.length) + main + '\n\n    ' + footerHTML;
}

const readMins = w => Math.max(1, Math.round(w / 220));
const niceDate = d => new Date(d + 'T00:00:00Z')
  .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function pageFor(g) {
  const url = BASE + OUT + '/' + g.slug + '.html';
  const others = GUIDES.filter(x => x.slug !== g.slug).slice(0, 3);
  const graph = { '@context': 'https://schema.org', '@graph': [ORG, SITE,
    { '@type': 'Article', '@id': url + '#article', headline: g.title, description: g.description,
      inLanguage: 'en-GB', url,
      datePublished: g.published, dateModified: g.updated || g.published,
      wordCount: g.words, author: AUTHOR, publisher: { '@id': BASE + '#organization' },
      isPartOf: { '@id': BASE + '#website' },
      mainEntityOfPage: { '@id': url + '#webpage' },
      articleSection: g.section || 'Guides' },
    { '@type': 'WebPage', '@id': url + '#webpage', url, name: g.title,
      description: g.description, inLanguage: 'en-GB',
      isPartOf: { '@id': BASE + '#website' }, publisher: { '@id': BASE + '#organization' },
      breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: BASE + OUT + '/' },
        { '@type': 'ListItem', position: 3, name: g.title, item: url } ] } }
  ] };

  const related = (g.apps || []).filter(a => a && a.name && a.href);
  const main = `    <main id="main-content" class="container" role="main">
        <nav class="app-crumb" aria-label="Breadcrumb">
            <a href="../">Home</a> <span aria-hidden="true">/</span>
            <a href="./">Guides</a> <span aria-hidden="true">/</span>
            <span aria-current="page">${esc(g.nav || g.title)}</span>
        </nav>

        <article class="section guide-article" aria-labelledby="guide-title">
            <header class="hero hero--single app-hero">
                <div class="hero-eyebrow">${esc(g.section || 'Guide')} &middot; ${readMins(g.words)} min read</div>
                <h1 id="guide-title">${esc(g.h1 || g.title)}</h1>
                <p class="app-tagline">${esc(g.standfirst || g.description)}</p>
                <p class="app-note">By <a href="../about.html">Hasnain Butt Akhtar</a>, founder and developer
                &middot; <time datetime="${escA(g.published)}">${esc(niceDate(g.published))}</time>${
                  g.updated ? ` &middot; updated <time datetime="${escA(g.updated)}">${esc(niceDate(g.updated))}</time>` : ''}</p>
            </header>

            <div class="art-body">
${g.body.split('\n').map(l => l ? '                ' + l : l).join('\n')}
            </div>
        </article>
${related.length ? `
        <section class="section" aria-labelledby="guide-apps-title">
            <div class="section-header"><h2 id="guide-apps-title">Software mentioned in this guide</h2></div>
            <div class="cat-siblings">
${related.map(a => `                <a class="cat-sib" href="../${escA(a.href)}"><span class="cat-sib-n">${esc(a.name)}</span><span class="cat-sib-t">${esc(a.note || '')}</span></a>`).join('\n')}
            </div>
            <p class="app-note">Everything above works the same whichever software you choose.</p>
        </section>` : ''}
${others.length ? `
        <section class="section" aria-labelledby="guide-more-title">
            <div class="section-header"><h2 id="guide-more-title">More guides</h2></div>
            <div class="cat-siblings">
${others.map(o => `                <a class="cat-sib" href="${escA(o.slug)}.html"><span class="cat-sib-n">${esc(o.nav || o.title)}</span><span class="cat-sib-t">${esc(o.description)}</span></a>`).join('\n')}
            </div>
            <p class="app-note"><a href="./">All guides</a> &middot; <a href="../Windows-apps.html">Windows catalogue</a>
            &middot; <a href="../about.html">About the studio</a></p>
        </section>` : ''}
    </main>`;

  const keywords = [g.title, ...(g.keywords || []), 'Hasnain Studio X', 'HSX guides'].join(', ');
  return shell({ url, title: g.title + ' | Hasnain Studio X', desc: g.description, keywords, graph, main });
}

function indexPage() {
  const url = BASE + OUT + '/';
  const TITLE = 'Guides | Hasnain Studio X';
  const DESC = 'Practical guides to getting more out of the computer you already own. Local AI, Windows '
             + 'performance, photos, files and games, written to be useful on their own.';
  const graph = { '@context': 'https://schema.org', '@graph': [ORG, SITE,
    { '@type': ['CollectionPage', 'WebPage'], '@id': url + '#webpage', url, name: TITLE,
      description: DESC, inLanguage: 'en-GB',
      isPartOf: { '@id': BASE + '#website' }, publisher: { '@id': BASE + '#organization' },
      about: { '@id': url + '#list' },
      breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: url } ] } },
    { '@type': 'ItemList', '@id': url + '#list', name: 'Guides', numberOfItems: GUIDES.length,
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      itemListElement: GUIDES.map((g, i) => ({ '@type': 'ListItem', position: i + 1,
        name: g.title, url: BASE + OUT + '/' + g.slug + '.html' })) }
  ] };

  const cards = GUIDES.map(g => `                <a class="cat-app" href="${escA(g.slug)}.html">
                    <span class="cat-app-h">
                        <span class="cat-app-n">${esc(g.nav || g.title)}</span>
                        <span class="cat-app-p">${esc(g.section || 'Guide')} &middot; ${readMins(g.words)} min read</span>
                    </span>
                    <span class="cat-app-t">${esc(g.description)}</span>
                    <span class="cat-app-go">Read the guide <span aria-hidden="true">&rarr;</span></span>
                </a>`).join('\n');

  const main = `    <main id="main-content" class="container" role="main">
        <nav class="app-crumb" aria-label="Breadcrumb">
            <a href="../">Home</a> <span aria-hidden="true">/</span>
            <span aria-current="page">Guides</span>
        </nav>

        <section class="hero hero--single app-hero" aria-labelledby="guides-title">
            <div class="hero-eyebrow">${GUIDES.length} guide${GUIDES.length === 1 ? '' : 's'}</div>
            <h1 id="guides-title">Guides</h1>
            <p class="app-tagline">How to get more out of the computer you already own.</p>
        </section>

        <section class="section" aria-labelledby="guides-why-title">
            <div class="section-header"><h2 id="guides-why-title">What these are</h2></div>
            <p class="app-lead">Every guide here is written to be useful on its own. You should be able to
            follow any of it with software you already have, or none at all. Where one of our applications
            suits the job it gets a mention at the end, clearly marked, and never in place of the
            explanation.</p>
        </section>

        <section class="section" aria-labelledby="guides-list-title">
            <div class="section-header"><h2 id="guides-list-title">All guides</h2></div>
${GUIDES.length ? `            <div class="cat-grid">\n${cards}\n            </div>`
  : `            <p class="app-lead">The first guides are being written now.</p>`}
        </section>
    </main>`;

  return shell({ url, title: TITLE, desc: DESC,
    keywords: 'local AI guides, Windows performance guide, offline software guides, Hasnain Studio X',
    graph, main });
}

if (!fs.existsSync(P(OUT))) fs.mkdirSync(P(OUT));
for (const g of GUIDES) fs.writeFileSync(path.join(P(OUT), g.slug + '.html'), pageFor(g), 'utf8');
fs.writeFileSync(path.join(P(OUT), 'index.html'), indexPage(), 'utf8');

/* A guide moved back into guides-src/scheduled must stop being served, so
   any page here without a matching source is removed. */
const keep = new Set(GUIDES.map(g => g.slug + '.html').concat('index.html'));
let pruned = 0;
for (const f of fs.readdirSync(P(OUT))) {
  if (!f.endsWith('.html') || keep.has(f)) continue;
  fs.unlinkSync(path.join(P(OUT), f));
  pruned++;
}
const totalWords = GUIDES.reduce((n, g) => n + g.words, 0);
console.log(`  guides   ${GUIDES.length} article${GUIDES.length === 1 ? '' : 's'} generated`
  + (GUIDES.length ? `, ${totalWords.toLocaleString('en-GB')} words` : '') + ', plus index'
  + (pruned ? `, ${pruned} withdrawn` : ''));

module.exports.GUIDES = GUIDES.map(g => ({ slug: g.slug, title: g.title, words: g.words }));
