"""Regenerate the app icons straight from favicon.svg so every surface
   (browser tab, home screen, PWA, Windows tile) shows the same mark.

   favicon.svg geometry, 32x32 viewBox:
     rounded rect  rx=7            fill  #0a0c11
     hexagon       stroke 1.2      #cdb892 at 55% opacity
     H bars        stroke 2.2      #eef1f6, round caps
"""
import sys, os
from PIL import Image, ImageDraw

BG   = (10, 12, 17)          # #0a0c11
GOLD = (205, 184, 146)       # #cdb892
INK  = (238, 241, 246)       # #eef1f6

def icon(size, ss=8, rounded=True):
    S = size * ss
    k = S / 32.0                                    # viewBox scale
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d  = ImageDraw.Draw(im, 'RGBA')

    r = 7 * k if rounded else 0
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=r, fill=BG + (255,))

    hexa = [(16*k,3*k), (27*k,9.5*k), (27*k,22.5*k), (16*k,29*k), (5*k,22.5*k), (5*k,9.5*k)]
    # repeat the first two points so the closing join renders seamlessly
    d.line(hexa + [hexa[0], hexa[1]], fill=GOLD + (140,),
           width=max(1, round(1.2*k)), joint='curve')

    w = max(2, round(2.2 * k))
    for a, b in [((11*k,11*k),(11*k,21*k)), ((21*k,11*k),(21*k,21*k)), ((11*k,16*k),(21*k,16*k))]:
        d.line([a, b], fill=INK + (255,), width=w)
        for pt in (a, b):                            # stroke-linecap="round"
            d.ellipse([pt[0]-w/2, pt[1]-w/2, pt[0]+w/2, pt[1]+w/2], fill=INK + (255,))

    return im.resize((size, size), Image.LANCZOS)

for ROOT in sys.argv[1:]:
    P = lambda f: os.path.join(ROOT, f)
    icon(180).convert('RGB').save(P('apple-touch-icon.png'), 'PNG', optimize=True)
    icon(192).save(P('images/icon-192.png'), 'PNG', optimize=True)
    icon(512).save(P('images/icon-512.png'), 'PNG', optimize=True)
    # .ico: square, no rounding - Windows and browser tabs mask it themselves
    icon(64, rounded=False).save(P('favicon.ico'), format='ICO',
                                 sizes=[(16,16),(32,32),(48,48),(64,64)])
    print('icons rebuilt from favicon.svg in', os.path.basename(ROOT))
