# hasnainstudiox.com

Static site for Hasnain Studio X. Hosted on GitHub Pages at
**https://hasnainstudiox.com**.

## Public copy rule

Nothing published on this site describes how the applications work internally.

**Never publish:** model or engine names, checkpoint or weight formats, precision
or quantisation detail, VRAM figures, GPU API names, or any other implementation
detail of an app's engine.

**Publish freely:** what an app does, what it is for, how to get better results
from it, how to use its features, and what it does not do with your data.

Applies to every page, meta description, structured-data field and guide.

## Every file in the root, and why it is there

### Pages — 88 .html files
| | |
|---|---|
| `index.html` `Windows-apps.html` `android-apps.html` `HSXAIstudio.html` `contact.html` | the site |
| `privacy-policies.html` | A–Z index of all 79 app policies |
| 79 `*Privacy.html` | one policy per app (Store requirement) |
| `404.html` | custom not-found page, `noindex` |
| `card.html` `qx-link.html` | QR landing pages, `noindex` |

### Assets
| | |
|---|---|
| `site.css` `site.js` `effects.js` `fluid.js` | styles and scripts |
| `gallery-data.js` | AI Studio gallery list — generated, do not hand-edit |
| `images/` | site assets only - the 6 social share cards and app icons |
| `images/gallery/` | **AI Studio artwork.** Drop new PNGs here, nowhere else |
| `favicon.svg` `favicon.ico` `apple-touch-icon.png` `site.webmanifest` | icons |

### Search engine files
| | |
|---|---|
| `sitemap.xml` | **the only sitemap.** 85 pages + 3 gallery images, in one file |
| `robots.txt` | crawl rules, points at the sitemap |
| `88d79d2aa8d9f1a589221f1ca7cdec66.txt` | IndexNow ownership proof for Bing — do not rename or delete |

### Hosting
| | |
|---|---|
| `CNAME` | tells GitHub Pages the domain is `hasnainstudiox.com` |
| `.nojekyll` | stops GitHub running Jekyll over the site |
| `ads.txt` `app-ads.txt` | AdSense / AdMob verification |

### Build tools — run by GitHub, not by you
| | |
|---|---|
| `build.js` | app counts, structured data, static catalogue, sitemap |
| `update-gallery.js` | rebuilds `gallery-data.js` from `images/gallery/` |
| `optimise-images.py` | makes WebP versions of new artwork |
| `submit-indexnow.js` | pushes every URL to Bing, Yandex, Seznam, Naver |
| `.github/workflows/` | runs all four on every push |

### Not published
`_archive/` — backups and retired files. `.gitignore` keeps it out of the repo.
Safe to delete from your PC whenever you like.

## How to change something

Edit the file on GitHub and commit. That is the whole process.

The Action then rebuilds the catalogue, structured data and sitemap, commits the
result, and tells Bing. **You never need to run anything on your PC.**

To add or rename an app, edit the `APPS` array inside `Windows-apps.html` or
`android-apps.html` — every count, schema entry and sitemap URL follows from it.
To add gallery art, drop the PNG into `images/gallery/` and commit. Nothing
else in `images/` is ever picked up.

## One-time setup

1. **Settings → Pages** → Source: *Deploy from a branch*, `main` / root.
   Custom domain: `hasnainstudiox.com`. Tick **Enforce HTTPS**.
2. **Settings → Actions → General → Workflow permissions** → *Read and write*.
3. **DNS**: four `A` records on the apex to `185.199.108.153`, `.109.153`,
   `.110.153`, `.111.153`, plus a `CNAME` on `www` to `<username>.github.io`.
   GitHub then 301s `hasnainstudiox.com` to `hasnainstudiox.com` for you.
4. Submit `https://hasnainstudiox.com/sitemap.xml` in Google Search Console
   and Bing Webmaster Tools. Once. That is the only submission you need.

## Known gap

No `aggregateRating` in the structured data — star ratings must reflect real
review data. Add the counts and averages from Partner Center and Play Console to
`build.js` when you have them.
