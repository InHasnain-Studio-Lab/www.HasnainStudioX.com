"""Phone screenshots for the Android app pages, taken from each app's own
   Google Play listing.

   The Windows shots come from make-app-shots.py, which rebuilds
   images/shots/index.json from scratch and sizes for wide desktop captures,
   so the phone set keeps its own manifest, play-shots.json, at phone widths.

   Run: python fetch-play-shots.py
"""
import io, json, os, re, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'images', 'shots')
WIDE, NARROW, QUALITY, PER_APP = 540, 270, 78, 6
UA = {'User-Agent': 'Mozilla/5.0'}

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()

src = open(os.path.join(ROOT, 'android-apps.html'), encoding='utf-8').read()
pages = json.loads(re.search(r'var APPPAGES = (\{.*?\});', src).group(1))
apps = re.findall(r"id: '([^']+)'.*?storeUrl: 'https://play\.google\.com/store/apps/details\?id=([\w.]+)'", src, re.S)

os.makedirs(OUT, exist_ok=True)
manifest = {}
for app_id, package in apps:
    page = pages.get(app_id)
    if not page:
        print(f'  ! {app_id}: no app page, skipped')
        continue
    slug = os.path.basename(page)[:-5]
    html = get(f'https://play.google.com/store/apps/details?id={package}&hl=en_GB&gl=GB').decode('utf-8', 'ignore')
    urls = re.findall(r'<img src="(https://play-lh\.googleusercontent\.com/[^"=]+)=[^"]*"[^>]*alt="Screenshot image"', html)
    urls = list(dict.fromkeys(urls))[:PER_APP]
    for i, url in enumerate(urls, 1):
        im = Image.open(io.BytesIO(get(url + f'=w{WIDE * 2}'))).convert('RGB')
        for width, suffix in ((WIDE, ''), (NARROW, '-sm')):
            h = round(im.height * width / im.width)
            im.resize((width, h), Image.LANCZOS).save(
                os.path.join(OUT, f'{slug}-{i}{suffix}.webp'), 'WEBP', quality=QUALITY, method=6)
    manifest[slug] = len(urls)
    print(f'  {slug:24} {len(urls)} screenshots')

json.dump(manifest, open(os.path.join(ROOT, 'play-shots.json'), 'w'), indent=1, sort_keys=True)
