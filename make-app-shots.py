"""Turn the collected store screenshots into web images.

   store-shots/<slug>/NN.jpg holds everything fetch-store-shots.js collected,
   which is a mix of interface captures and promotional banners. Selection
   is scored rather than hand picked: the lead image is whichever looks most
   like an actual interface, and the rest are the busiest screens after it.

   Output: images/shots/<slug>-1.webp at two widths, plus a manifest the
   page generator reads.
"""
import glob, json, os, sys
import numpy as np
from PIL import Image

ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
SRC = os.path.join(ROOT, 'store-shots')
OUT = os.path.join(ROOT, 'images', 'shots')
WIDE, NARROW, QUALITY, PER_APP = 1200, 600, 74, 4

def measure(path):
    """Interface likeness, and how much is going on."""
    im = Image.open(path).convert('L').resize((640, 400), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float32)
    line = max(float((np.abs(np.diff(a, axis=0)) > 18).mean(axis=1).max()),
               float((np.abs(np.diff(a, axis=1)) > 18).mean(axis=0).max()))
    b = a[:400 // 8 * 8, :640 // 8 * 8].reshape(50, 8, 80, 8).transpose(0, 2, 1, 3)
    flat = float((b.reshape(50, 80, 64).std(axis=2) < 4).mean())
    k = (a[:-2, 1:-1] + a[2:, 1:-1] + a[1:-1, :-2] + a[1:-1, 2:]) / 4.0
    detail = float(np.abs(a[1:-1, 1:-1] - k).mean())
    return line * 0.6 + flat * 0.4, detail

def pick(files):
    scored = []
    for f in files:
        try:
            ui, detail = measure(f)
            scored.append({'f': f, 'ui': ui, 'busy': ui * 0.75 + min(detail / 6.0, 1.0) * 0.25})
        except Exception as e:
            print('  ! unreadable', f, e)
    if not scored: return []
    ui_ok = [s for s in scored if s['ui'] >= 0.42] or scored
    lead = max(ui_ok, key=lambda s: s['ui'])          # most clearly an interface
    rest = sorted((s for s in ui_ok if s is not lead), key=lambda s: -s['busy'])
    return [lead['f']] + [s['f'] for s in rest[:PER_APP - 1]]

os.makedirs(OUT, exist_ok=True)
manifest, apps, written = {}, 0, 0
for d in sorted(glob.glob(os.path.join(SRC, '*'))):
    if not os.path.isdir(d): continue
    slug = os.path.basename(d)
    chosen = pick(sorted(glob.glob(os.path.join(d, '*.jpg'))))
    if not chosen: continue
    for i, src in enumerate(chosen, 1):
        im = Image.open(src).convert('RGB')
        for width, suffix in ((WIDE, ''), (NARROW, '-sm')):
            h = round(im.height * width / im.width)
            im.resize((width, h), Image.LANCZOS).save(
                os.path.join(OUT, f'{slug}-{i}{suffix}.webp'), 'WEBP', quality=QUALITY, method=6)
            written += 1
    manifest[slug] = len(chosen)
    apps += 1

json.dump(manifest, open(os.path.join(ROOT, 'images', 'shots', 'index.json'), 'w'),
          indent=1, sort_keys=True)
total = sum(manifest.values())
print(f'  screenshots  {total} chosen for {apps} apps, {written} files written')
