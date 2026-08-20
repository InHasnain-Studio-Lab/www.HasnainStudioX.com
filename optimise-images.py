"""Make the WebP versions the gallery serves.

For every PNG you drop into images/ this writes:
    <name>.webp          full size, served to the lightbox
    <name>-thumb.webp    520 px, served to the grid
The original PNG stays as the source of truth and the <img> fallback.

GitHub Actions runs this on every push. Already-processed images are skipped.
"""
import os, glob
from PIL import Image

IMG = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'images')
rows = []

for p in sorted(glob.glob(os.path.join(IMG, '*.png'))):
    name = os.path.basename(p)
    if name.startswith(('og-', 'icon-')):
        continue                                  # social cards and app icons
    stem = os.path.splitext(p)[0]
    if os.path.exists(stem + '.webp') and os.path.exists(stem + '-thumb.webp'):
        continue                                  # already done

    im = Image.open(p).convert('RGB')
    w, h = im.size
    before = os.path.getsize(p)

    im.save(stem + '.webp', 'WEBP', quality=82, method=6)
    thumb = im.copy()
    thumb.thumbnail((520, 520), Image.LANCZOS)
    thumb.save(stem + '-thumb.webp', 'WEBP', quality=80, method=6)

    rows.append((name, w, h, before,
                 os.path.getsize(stem + '.webp'),
                 os.path.getsize(stem + '-thumb.webp')))

if not rows:
    print('All gallery images already have WebP versions - nothing to do.')
    raise SystemExit(0)

for n, w, h, b, full, th in rows:
    print(f'{n:34s} {w}x{h}  png {b//1024:5d}K  ->  webp {full//1024:4d}K   thumb {th//1024:3d}K')
saved = sum(r[3] for r in rows) - sum(r[4] for r in rows)
print(f'{len(rows)} image(s) processed, {saved//1024} KB saved on the full-size versions.')
