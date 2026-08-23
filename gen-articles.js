/* ═══════════════════════════════════════════════════════════════════════
   HASNAIN STUDIO X — guide pages
   Wraps each body in articles-src/ in the site shell, with Article schema,
   breadcrumbs and a contents list built from its own <h2> headings.
   Run by build.js; add a new entry to ARTICLES and a matching body file.
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const P = f => path.join(ROOT, f);
const read = f => fs.readFileSync(P(f), 'utf8');
const BASE = 'https://hasnainstudiox.com/';

const ARTICLES = [
  {
    slug: 'how-to-write-better-ai-image-prompts',
    title: 'How to write better AI image prompts',
    headline: 'How to write better AI image prompts',
    tagline: 'Subject first, one layer at a time, and how to finish the picture',
    description: 'A method that beats rewriting: start with the subject alone, add light and framing one layer at a time, and change one thing per attempt until it lands.',
    keywords: ['how to write AI image prompts', 'better AI art prompts', 'AI image prompt tips',
               'AI prompt structure', 'improve AI generated images', 'AI art prompt guide',
               'image prompt examples'],
    published: '2026-08-23', updated: '2026-08-23', readTime: 'PT6M', section: 'Making images'
  }
];

const esc  = s => String(s == null ? '' : s).replace(/&(?![a-z#0-9]+;)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escA = s => esc(s).replace(/"/g, '&quot;');

/* shell, borrowed from a policy page (one folder down, same as guides/) */
const TPL = read('privacy/HSXStudioFlowPrivacy.html').replace(/(href|src)="\.\.\//g, '$1="');
const headOpen  = TPL.slice(0, TPL.indexOf('<body>'));
const afterBody = TPL.slice(TPL.indexOf('<body>'));
const upify = h => h
  .replace(/(href|src)="(?!http|mailto|#|\/|\.\.\/|data:)/g, '$1="../')
  .replace(/srcset="(?!http|\.\.\/)/g, 'srcset="../');
const headerHTML = upify(afterBody.slice(0, afterBody.indexOf('<main')));
const footerHTML = upify(afterBody.slice(afterBody.indexOf('<footer')));

function build(a) {
  const url  = BASE + 'guides/' + a.slug + '.html';
  const body = read('articles-src/' + a.slug + '.html');
  const TITLE = a.title.length > 52 ? a.title : a.title + ' | HSX';
  const OG = BASE + 'images/og-aistudio.png';

  /* contents list from the body's own headings, so it can never drift */
  const heads = [...body.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)]
    .map(m => ({ id: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() }));

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': BASE + '#organization',
        name: 'Hasnain Studio X', url: BASE,
        alternateName: ['InHasnain', 'HSX', 'Hasnain StudioX', 'HasnainStudioX', 'Hasnain Studio'],
        logo: { '@type': 'ImageObject', url: BASE + 'images/icon-512.png' },
        founder: { '@id': BASE + '#founder' } },
      { '@type': 'Person', '@id': BASE + '#founder',
        name: 'Hasnain Butt Akhtar',
        alternateName: ['Hasnain Butt', 'Hasnain Akhtar', 'InHasnain'],
        jobTitle: 'Founder and Software Developer',
        url: BASE + 'about.html',
        worksFor: { '@id': BASE + '#organization' },
        knowsAbout: ['On-device AI image generation', 'Windows application development',
                     'Privacy-preserving software design'],
        sameAs: ['https://x.com/HasnainStudioX',
                 'https://apps.microsoft.com/search/publisher?name=Hasnain+Studio+X',
                 'https://play.google.com/store/apps/developer?id=Hasnain+Studio+X'] },
      { '@type': 'WebSite', '@id': BASE + '#website', url: BASE,
        name: 'Hasnain Studio X', publisher: { '@id': BASE + '#organization' },
        inLanguage: 'en-GB' },
      { '@type': 'TechArticle', '@id': url + '#article',
        headline: a.headline, alternativeHeadline: a.tagline,
        description: a.description, abstract: a.abstract || a.description, articleSection: a.section,
        inLanguage: 'en-GB', isAccessibleForFree: true,
        datePublished: a.published, dateModified: a.updated,
        timeRequired: a.readTime,
        wordCount: body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length,
        keywords: a.keywords.join(', '),
        author:    { '@id': BASE + '#founder' },
        publisher: { '@id': BASE + '#organization' },
        image: OG,
        mainEntityOfPage: { '@id': url + '#webpage' },
        proficiencyLevel: 'Beginner' },
      { '@type': 'WebPage', '@id': url + '#webpage', url,
        name: TITLE, description: a.description, inLanguage: 'en-GB',
        isPartOf: { '@id': BASE + '#website' },
        publisher: { '@id': BASE + '#organization' },
        primaryImageOfPage: OG,
        breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home',   item: BASE + 'index.html' },
          { '@type': 'ListItem', position: 2, name: 'Guides', item: BASE + 'guides/index.html' },
          { '@type': 'ListItem', position: 3, name: a.title,  item: url } ] } }
    ]
  };

  let h = headOpen;
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${escA(TITLE)}</title>`);
  const setMeta = (k, v) => {
    const re = new RegExp('(<meta\\s+(?:name|property)="' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s+content=")[\\s\\S]*?(")', 'g');
    h = h.replace(re, (m, x, y) => x + escA(v) + y);
  };
  setMeta('description', a.description);
  setMeta('og:title', TITLE);       setMeta('og:description', a.description);
  setMeta('og:url', url);           setMeta('og:image', OG);
  setMeta('og:image:secure_url', OG);
  setMeta('og:image:alt', a.title); setMeta('twitter:image', OG);
  setMeta('twitter:image:alt', a.title);
  setMeta('twitter:title', TITLE);  setMeta('twitter:description', a.description);
  h = h.replace(/(<link rel="canonical" href=")[\s\S]*?(")/, (m, x, y) => x + url + y);
  h = h.replace(/hreflang="en-GB" href="[^"]*"/, `hreflang="en-GB" href="${url}"`);
  h = h.replace(/hreflang="x-default" href="[^"]*"/, `hreflang="x-default" href="${url}"`);
  h = h.replace(/<meta property="og:type" content="[^"]*"/, '<meta property="og:type" content="article"');
  h = h.replace(/<meta name="keywords"[^>]*>\s*/g, '');
  h = h.replace('</head>', `    <meta name="keywords" content="${escA(a.keywords.join(', '))}"/>\n</head>`);
  h = h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    '<script type="application/ld+json">\n' + JSON.stringify(graph, null, 2) + '\n    </script>');
  h = upify(h);

  const toc = heads.length ? `
        <nav class="art-toc" aria-labelledby="toc-title">
            <h2 id="toc-title">On this page</h2>
            <ol>${heads.map(x => `\n                <li><a href="#${escA(x.id)}">${esc(x.text)}</a></li>`).join('')}
            </ol>
        </nav>` : '';

  const main = `    <main id="main-content" class="container" role="main">
        <nav class="app-crumb" aria-label="Breadcrumb">
            <a href="../index.html">Home</a> <span aria-hidden="true">/</span>
            <a href="index.html">Guides</a> <span aria-hidden="true">/</span>
            <span aria-current="page">${esc(a.title)}</span>
        </nav>

        <article class="art">
            <header class="art-head">
                <div class="hero-eyebrow">${esc(a.section)} &middot; Guide</div>
                <h1>${esc(a.headline)}</h1>
                <p class="art-tagline">${esc(a.tagline)}</p>
                <p class="art-meta">
                    By <a href="../about.html">Hasnain Butt Akhtar</a>, Hasnain Studio X
                    <span aria-hidden="true">&middot;</span>
                    <time datetime="${escA(a.updated)}">${new Date(a.updated + 'T00:00:00Z')
                        .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</time>
                    <span aria-hidden="true">&middot;</span> ${a.readTime.replace(/PT(\d+)M/, '$1 minute read')}
                </p>
            </header>
${toc}

            <div class="art-body">
${body.trim().split('\n').map(l => '                ' + l).join('\n')}
            </div>
        </article>
    </main>`;

  return h + '<body>\n' + headerHTML.slice('<body>\n'.length) + main + '\n\n    ' + footerHTML;
}

/* ── the guides index ── */
function indexPage() {
  const url = BASE + 'guides/index.html';
  const TITLE = 'Guides | Hasnain Studio X';
  const DESC = 'Practical, vendor-neutral guides from Hasnain Studio X on running AI and creative software on your own hardware.';
  let h = headOpen;
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${escA(TITLE)}</title>`);
  const setMeta = (k, v) => {
    const re = new RegExp('(<meta\\s+(?:name|property)="' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s+content=")[\\s\\S]*?(")', 'g');
    h = h.replace(re, (m, x, y) => x + escA(v) + y);
  };
  const OG = BASE + 'images/og-aistudio.png';
  setMeta('description', DESC); setMeta('og:title', TITLE); setMeta('og:description', DESC);
  setMeta('og:url', url); setMeta('og:image', OG); setMeta('og:image:secure_url', OG);
  setMeta('og:image:alt', TITLE); setMeta('twitter:image', OG); setMeta('twitter:image:alt', TITLE);
  setMeta('twitter:title', TITLE); setMeta('twitter:description', DESC);
  h = h.replace(/(<link rel="canonical" href=")[\s\S]*?(")/, (m, x, y) => x + url + y);
  h = h.replace(/hreflang="en-GB" href="[^"]*"/, `hreflang="en-GB" href="${url}"`);
  h = h.replace(/hreflang="x-default" href="[^"]*"/, `hreflang="x-default" href="${url}"`);
  h = h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    '<script type="application/ld+json">\n' + JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'Organization', '@id': BASE + '#organization', name: 'Hasnain Studio X', url: BASE },
        { '@type': 'CollectionPage', '@id': url + '#webpage', url, name: TITLE, description: DESC,
          inLanguage: 'en-GB', publisher: { '@id': BASE + '#organization' },
          breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: BASE + 'index.html' },
            { '@type': 'ListItem', position: 2, name: 'Guides', item: url } ] },
          mainEntity: { '@type': 'ItemList', numberOfItems: ARTICLES.length,
            itemListElement: ARTICLES.map((a, i) => ({ '@type': 'ListItem', position: i + 1,
              name: a.title, url: BASE + 'guides/' + a.slug + '.html' })) } }
      ]
    }, null, 2) + '\n    </script>');
  h = upify(h);

  const cards = ARTICLES.map(a => `
                <li><a class="gd-card" href="${escA(a.slug)}.html">
                    <span class="gd-eyebrow">${esc(a.section)}</span>
                    <span class="gd-title">${esc(a.title)}</span>
                    <span class="gd-desc">${esc(a.tagline)}</span>
                    <span class="gd-more">Read the guide <span aria-hidden="true">&rarr;</span></span>
                </a></li>`).join('');

  const main = `    <main id="main-content" class="container" role="main">
        <nav class="app-crumb" aria-label="Breadcrumb">
            <a href="../index.html">Home</a> <span aria-hidden="true">/</span>
            <span aria-current="page">Guides</span>
        </nav>
        <section class="hero hero--single" aria-labelledby="g-title">
            <div class="hero-eyebrow">Reference</div>
            <h1 id="g-title">Guides</h1>
            <p class="hero-sub">Practical, vendor-neutral writing on running AI and creative software on hardware
            you own. No affiliate links, no sponsored placements.</p>
        </section>
        <section class="section" aria-labelledby="gl-title">
            <div class="section-header"><h2 id="gl-title">All guides</h2></div>
            <ul class="gd-list">${cards}
            </ul>
        </section>
    </main>`;

  return h + '<body>\n' + headerHTML.slice('<body>\n'.length) + main + '\n\n    ' + footerHTML;
}

if (!fs.existsSync(P('guides'))) fs.mkdirSync(P('guides'));
let n = 0;
for (const a of ARTICLES) {
  fs.writeFileSync(P('guides/' + a.slug + '.html'), build(a), 'utf8');
  n++;
}
fs.writeFileSync(P('guides/index.html'), indexPage(), 'utf8');
/* ── Atom feed, so readers and aggregators can follow the guides ── */
function feed() {
  const upd = ARTICLES.map(a => a.updated).sort().pop() + 'T00:00:00Z';
  const entries = ARTICLES
    .slice().sort((x, y) => y.published.localeCompare(x.published))
    .map(a => {
      const u = BASE + 'guides/' + a.slug + '.html';
      return `  <entry>
    <title>${esc(a.title)}</title>
    <link rel="alternate" type="text/html" href="${escA(u)}"/>
    <id>${escA(u)}</id>
    <published>${a.published}T00:00:00Z</published>
    <updated>${a.updated}T00:00:00Z</updated>
    <author><name>Hasnain Butt Akhtar</name><uri>${BASE}about.html</uri></author>
    <category term="${escA(a.section)}"/>
    <summary type="text">${esc(a.description)}</summary>
  </entry>`;
    }).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Hasnain Studio X - Guides</title>
  <subtitle>Practical writing on running AI and creative software on hardware you own.</subtitle>
  <link rel="self" type="application/atom+xml" href="${BASE}guides/feed.xml"/>
  <link rel="alternate" type="text/html" href="${BASE}guides/index.html"/>
  <id>${BASE}guides/</id>
  <updated>${upd}</updated>
  <rights>Copyright Hasnain Studio X</rights>
  <author><name>Hasnain Butt Akhtar</name><uri>${BASE}about.html</uri></author>
${entries}
</feed>
`;
}
fs.writeFileSync(P('guides/feed.xml'), feed(), 'utf8');

console.log(`  guides        ${n} article${n === 1 ? '' : 's'} + index + feed`);
