"""Regenerate the app icons from the studio mark.

   images/brand-icon-master.png is the same artwork the HSX Apps Hub ships,
   so the browser tab, the home screen, the PWA and the Windows tile all
   show the icon people already associate with the apps.

   The master is trimmed to its artwork before scaling, otherwise the
   transparent margin around it makes every generated icon look small.
"""
import sys, os
from PIL import Image

MASTER = 'brand-icon-master.png'
FLAT_BG = (12, 10, 20)          # iOS ignores transparency, so flatten on this

def load(root):
    im = Image.open(os.path.join(root, MASTER)).convert('RGBA')
    bb = im.getbbox()
    return im.crop(bb) if bb else im

def square(im, size, pad=0.0, bg=None):
    """Fit the mark into a square canvas, optionally padded and flattened."""
    inner = round(size * (1 - 2 * pad))
    w, h = im.size
    scale = inner / max(w, h)
    art = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (bg + (255,)) if bg else (0, 0, 0, 0))
    canvas.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    return canvas

for ROOT in sys.argv[1:]:
    P = lambda f: os.path.join(ROOT, f)
    mark = load(ROOT)
    # Apple adds its own rounding and puts the icon on an opaque tile
    square(mark, 180, pad=0.08, bg=FLAT_BG).convert('RGB').save(
        P('apple-touch-icon.png'), 'PNG', optimize=True)
    square(mark, 192).save(P('images/icon-192.png'), 'PNG', optimize=True)
    square(mark, 512).save(P('images/icon-512.png'), 'PNG', optimize=True)
    square(mark, 64).save(P('favicon.ico'), format='ICO',
                          sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print('icons rebuilt from the studio mark in', os.path.basename(ROOT))
