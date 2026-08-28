#!/usr/bin/env python3
"""Turn Microsoft Store / Google Play hero tiles into the site's app artwork.

    python make-app-art.py "<folder of tiles>"

Every image in the folder is matched to an application by filename - either the
page slug (mobile-tunex.png) or the product name (Mobile TuneX.jpg) - and three
sizes are written into images/apps/:

    <slug>-hero.webp      720x405   the catalogue card and the page hero
    <slug>-hero-sm.webp   400x225   the same, for narrow columns
    <slug>-og.jpg        1200x630   the social card

The whole tile is always fitted, never cropped. The supplied artwork is not a
single shape - the ratios run from about 1.6 to 2.1 - and cropping to the card's
16:9 sliced the feature text off the widest ones. The leftover margin is filled
with a blurred, darkened copy of the same image so the panel still reads as one
piece rather than as a picture on a flat bar.

build.js picks up whatever exists in images/apps/, so nothing else needs editing.
"""
import os, re, sys, json, subprocess
from PIL import Image, ImageFilter, ImageEnhance

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(ROOT, 'images', 'apps')
SIZES = ((720, 405, '-hero.webp',    82, 'WEBP'),
         (400, 225, '-hero-sm.webp', 80, 'WEBP'),
         (1200, 630, '-og.jpg',      72, 'JPEG'))

def slugs():
    """(slug, name) for every application, from the catalogues themselves."""
    js = r'''
    global.ico=()=>"";const fs=require("fs");
    const grab=(s,r,e)=>{const m=s.match(r);const f=m.index+m[0].length;return s.slice(f,s.indexOf(e,f));};
    const rd=f=>eval("["+grab(fs.readFileSync(f,"utf8"),/const APPS = \[/,"\n        ];")
      .replace(/icon: ico\((?:.[^']*.)\),/g,"")+"]");
    const W=rd("Windows-apps.html"),A=rd("android-apps.html");
    const base=n=>String(n).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    const wset=new Set(W.map(a=>base(a.name)));
    const out=[];
    W.forEach(a=>out.push([base(a.name),a.name]));
    A.forEach(a=>{const b=base(a.name);out.push([wset.has(b)?b+"-android":b,a.name]);});
    console.log(JSON.stringify(out));'''
    return json.loads(subprocess.run(['node','-e',js],cwd=ROOT,
                      capture_output=True,text=True,check=True).stdout)

norm = lambda s: re.sub(r'[^a-z0-9]', '', str(s).lower())

def render(im, W, H):
    bw, bh = im.size
    s = max(W / bw, H / bh)
    bg = im.resize((max(W, int(bw * s + 1)), max(H, int(bh * s + 1))), Image.LANCZOS)
    l, t = (bg.width - W) // 2, (bg.height - H) // 2
    bg = bg.crop((l, t, l + W, t + H)).filter(ImageFilter.GaussianBlur(26))
    bg = ImageEnhance.Brightness(bg).enhance(0.42)
    s2 = min(W / bw, H / bh)
    fg = im.resize((round(bw * s2), round(bh * s2)), Image.LANCZOS)
    bg.paste(fg, ((W - fg.width) // 2, (H - fg.height) // 2))
    return bg

def main(src):
    apps = slugs()
    by_slug = {norm(s): s for s, n in apps}
    by_name = {norm(n): s for s, n in apps}
    by_short = {norm(re.sub(r'^HSX ', '', n)): s for s, n in apps}
    os.makedirs(OUT, exist_ok=True)
    done, skipped, total = 0, [], 0
    for f in sorted(os.listdir(src)):
        if not f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            continue
        key = norm(os.path.splitext(f)[0])
        slug = by_slug.get(key) or by_name.get(key) or by_short.get(key)
        if not slug:
            skipped.append(f); continue
        im = Image.open(os.path.join(src, f)).convert('RGB')
        for W, H, suffix, q, fmt in SIZES:
            out = render(im, W, H)
            p = os.path.join(OUT, slug + suffix)
            if fmt == 'WEBP': out.save(p, 'WEBP', quality=q, method=6)
            else:             out.save(p, 'JPEG', quality=q, optimize=True, progressive=True)
            total += os.path.getsize(p)
        print('  %-28s -> %s' % (f, slug))
        done += 1
    print('\n%d application(s) illustrated, %.1f MB written.' % (done, total / 1048576))
    if skipped:
        print('\nNo matching application for:')
        for s in skipped: print('  -', s)
        print('Rename the file to the page slug or the exact product name.')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit('usage: python make-app-art.py "<folder of tiles>"')
    main(sys.argv[1])
