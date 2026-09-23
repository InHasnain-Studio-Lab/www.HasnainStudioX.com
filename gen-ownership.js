/* gen-ownership.js
   Builds ownership.html: one public record naming the author of every
   published application, with its store identifier. Notices link here so a
   reviewer can check ownership without being sent a folder of documents. */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const P = f => path.join(ROOT, f);
const read = f => fs.readFileSync(P(f), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const AUTHOR = 'Hasnain Butt Akhtar';
const STUDIO = 'Hasnain Studio X';

function firstReleases() {
  /* the news feed carries the date each app went live; earliest wins */
  const dates = {};
  try {
    const history = JSON.parse(read('app-history.json'));
    for (const event of history.events || []) {
      if (event.k !== 'release' || !event.p || !event.d) continue;
      if (!dates[event.p] || event.d < dates[event.p]) dates[event.p] = event.d;
    }
  } catch (e) {
    /* no history yet: the table simply omits the dates */
  }
  return dates;
}

function shown(iso) {
  if (!iso) return '<span class="own-none">date not recorded</span>';
  const d = new Date(iso + 'T00:00:00Z');
  return `<time datetime="${iso}">${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</time>`;
}

function build() {
  const catalogue = JSON.parse(read('hub-catalog.json'));
  const apps = [...(catalogue.ps || [])].sort((a, b) => a.n.localeCompare(b.n, 'en-GB'));
  if (!apps.length) return '  ! ownership page skipped, no apps in the catalogue';
  const dates = firstReleases();
  const stamp = new Date().toISOString().slice(0, 10);

  const play = url => (String(url || '').match(/[?&]id=([\w.]+)/) || [])[1];
  const rows = apps.map(app => {
    const id = app.p || play(app.u);
    const store = id
      ? `<a href="${esc(app.u || 'https://apps.microsoft.com/detail/' + app.p)}">${esc(id)}</a>`
      : '<span class="own-none">not listed</span>';
    return `                    <tr>
                        <td><a href="${esc(app.su || './')}">${esc(app.n)}</a></td>
                        <td>${app.pf === 'and' ? 'Android' : 'Windows'}</td>
                        <td class="own-id">${store}</td>
                        <td>${shown(dates[app.i])}</td>
                    </tr>`;
  }).join('\n');

  const listed = apps.map(app => ({
    '@type': 'SoftwareApplication',
    name: app.n,
    url: app.su || undefined,
    operatingSystem: app.pf === 'and' ? 'Android' : 'Windows',
    author: { '@id': 'https://hasnainstudiox.com/#founder' },
    copyrightHolder: { '@id': 'https://hasnainstudiox.com/#founder' },
    publisher: { '@id': 'https://hasnainstudiox.com/#organization' },
    datePublished: dates[app.i] || undefined,
  }));

  const template = read('privacy-policies.html');
  const head = template.slice(0, template.indexOf('                    <main id="main-content"'));
  const tail = template.slice(template.indexOf('    <footer class="site-footer"'));

  const page = head
    .replace(/<title>[^<]*<\/title>/, `<title>Ownership and authorship of every app | ${STUDIO}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/,
      `$1The public record of authorship: every application published as ${STUDIO} was written by ${AUTHOR}, who owns the copyright in it.$2`)
    .replace(/(<link rel="canonical" href="https:\/\/hasnainstudiox\.com\/)[^"]*(")/, '$1ownership.html$2')
    + `                    <main id="main-content" class="container" role="main">
        <section class="hero hero--single">
            <div class="hero-eyebrow">Legal &middot; Record of authorship</div>
            <h1>Who owns this software</h1>
            <p class="hero-sub">Every application listed below was written by ${AUTHOR}, an independent developer
            in England, United Kingdom, who publishes under the trading name ${STUDIO}. This page is the studio's
            public record of that, kept so anyone checking a copyright claim can confirm it in one place.</p>
        </section>

        <section class="section" aria-labelledby="own-statement-title">
            <h2 id="own-statement-title">The statement</h2>
            <p>${AUTHOR} is the sole author of each application named on this page. Each was written by
            ${AUTHOR} as an individual. None was made for an employer, and none was commissioned by, assigned to,
            or licensed from any other person or company. Copyright in each work therefore belongs to its author,
            and arose automatically on creation under the Copyright, Designs and Patents Act 1988.</p>
            <p>${STUDIO} is the trading name under which that software is published. It is not a separate company
            and not a separate legal person. The Microsoft Store publisher account and the Google Play developer
            account for ${STUDIO} are both held by ${AUTHOR}, whose identity Microsoft has verified.</p>
            <p>No website, service or person has ever been licensed to copy, host or distribute this software.
            It is sold only through the
            <a href="https://apps.microsoft.com/search/publisher?name=Hasnain+Studio+X">Microsoft Store</a> and
            <a href="https://play.google.com/store/apps/developer?id=Hasnain+Studio+X">Google Play</a>. Any other
            site offering it for download is doing so without permission.</p>
        </section>

        <section class="section" aria-labelledby="own-list-title">
            <h2 id="own-list-title">Published works</h2>
            <p>${apps.length} applications, each written and owned by ${AUTHOR}. The identifier is the product ID
            on the Microsoft Store, or the package name on Google Play, both of which name ${STUDIO} as
            publisher.</p>
            <div class="own-wrap">
                <table class="own-table">
                    <thead>
                        <tr><th scope="col">Application</th><th scope="col">Platform</th><th scope="col">Store identifier</th><th scope="col">First published</th></tr>
                    </thead>
                    <tbody>
${rows}
                    </tbody>
                </table>
            </div>
        </section>

        <section class="section" aria-labelledby="own-verify-title">
            <h2 id="own-verify-title">How to verify this</h2>
            <ul>
                <li><strong>Microsoft:</strong> the publisher account for ${STUDIO} is verified and held in the name
                ${AUTHOR}. Microsoft can confirm this to any platform that asks.</li>
                <li><strong>Trade mark:</strong> UK trade mark application UK00004429289 for the name ${STUDIO}, filed
                12 August 2026, names ${AUTHOR} as owner. The application is searchable on the
                <a href="https://www.gov.uk/search-for-trademark">UK Intellectual Property Office register</a>.</li>
                <li><strong>Founder:</strong> the studio's <a href="about.html">About page</a> and the founder's own
                site at <a href="https://inhasnain.com/">inhasnain.com</a> both name ${AUTHOR} as the sole developer.</li>
                <li><strong>Google Play:</strong> the developer account for ${STUDIO} publishes the Android
                applications listed above.</li>
                <li><strong>Copyright registration:</strong> the United Kingdom keeps no register of copyright.
                Copyright arises automatically on creation, so no certificate exists or is required.</li>
            </ul>
            <p>For takedown correspondence, or to confirm any of the above,
            <a href="contact.html">contact the studio</a> at contact@hasnainstudiox.com.</p>
            <p class="own-stamp">This record was last confirmed on <time datetime="${stamp}">${stamp}</time>.</p>
        </section>
    </main>

`
    + tail;

  const data = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Who owns this software',
    url: 'https://hasnainstudiox.com/ownership.html',
    about: { '@id': 'https://hasnainstudiox.com/#founder' },
    dateModified: stamp,
    mainEntity: listed,
  })}</script>\n</head>`;

  fs.writeFileSync(P('ownership.html'), page.replace('</head>', data), 'utf8');
  return `  ownership record       ${apps.length} works listed, ${Object.keys(dates).length} with first release dates`;
}

module.exports = { build };
if (require.main === module) console.log(build());
