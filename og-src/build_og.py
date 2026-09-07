import pathlib, sys, subprocess, base64

HERE = pathlib.Path(__file__).parent

def make_fonts():
    """The three site typefaces, inlined as data URIs so the render never
    depends on a network fetch. Pulled from the fontsource packages, which
    carry the same files Google Fonts serves."""
    css = HERE / "fonts.css"
    if css.exists():
        return css.read_text()
    pkgs = ["@fontsource/unbounded", "@fontsource/space-grotesk", "@fontsource/jetbrains-mono"]
    if not (HERE / "node_modules").exists():
        subprocess.run(["npm", "install", "--silent", *pkgs], cwd=HERE, check=True)
    out = []
    for fam, pkg, weights in [("Unbounded", "unbounded", [500, 600]),
                              ("Space Grotesk", "space-grotesk", [400, 500]),
                              ("JetBrains Mono", "jetbrains-mono", [500, 600])]:
        for w in weights:
            f = HERE / "node_modules" / "@fontsource" / pkg / "files" / f"{pkg}-latin-{w}-normal.woff2"
            b = base64.b64encode(f.read_bytes()).decode()
            out.append(f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};"
                       f"src:url(data:font/woff2;base64,{b}) format('woff2');font-display:block;}}")
    css.write_text("\n".join(out))
    return css.read_text()

sys.path.insert(0, str(HERE))
from cards import CARDS

FONTS = make_fonts()

LOGO = """<svg viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M13 1.5L24 7.5V18.5L13 24.5L2 18.5V7.5Z" stroke="currentColor" stroke-width="1.1" opacity="0.55"/>
  <path d="M8.5 9V17M17.5 9V17M8.5 13H17.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
</svg>"""

GRAIN = ("url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>"
         "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/>"
         "<feColorMatrix type='saturate' values='0'/></filter>"
         "<rect width='140' height='140' filter='url(%23n)' opacity='0.55'/></svg>\")")

CSS = """
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:#111;}
:root{
  --bg:#08070c; --ink:#f4f2ee; --ink-soft:#aaa7ba; --ink-faint:#8c899e;
  --card-border:rgba(255,255,255,.09);
  --holo:linear-gradient(115deg,#f2dfb8 0%,#f3b3cf 20%,#c7a5f7 42%,#9fe8d6 64%,#bcd9f4 82%,#f2dfb8 100%);
  --f-display:'Unbounded',sans-serif; --f-body:'Space Grotesk',sans-serif; --f-mono:'JetBrains Mono',monospace;
}
.card{
  position:relative; width:1200px; height:630px; overflow:hidden;
  background:
    radial-gradient(1150px 660px at 90% -16%, rgba(199,165,247,.30), transparent 64%),
    radial-gradient(760px 520px at -6% 26%, rgba(159,232,214,.13), transparent 58%),
    radial-gradient(880px 600px at 62% 126%, rgba(243,179,207,.14), transparent 62%),
    radial-gradient(560px 420px at 26% 8%, rgba(188,217,244,.07), transparent 62%),
    var(--bg);
  font-family:var(--f-body); color:var(--ink);
  -webkit-font-smoothing:antialiased;
  display:flex; flex-direction:column; justify-content:space-between;
  padding:60px 72px 54px;
}
/* engineered grid, fading away from the lower left */
.card::before{
  content:''; position:absolute; inset:0; pointer-events:none;
  background-image:
    linear-gradient(rgba(255,255,255,.030) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.030) 1px, transparent 1px);
  background-size:48px 48px;
  -webkit-mask-image:linear-gradient(105deg, rgba(0,0,0,.85) 0%, rgba(0,0,0,.35) 42%, transparent 72%);
          mask-image:linear-gradient(105deg, rgba(0,0,0,.85) 0%, rgba(0,0,0,.35) 42%, transparent 72%);
}
/* film grain, barely there: it takes the flatness off the gradients */
.grain{
  position:absolute; inset:0; pointer-events:none; z-index:1;
  background:GRAINURL; background-size:140px 140px;
  opacity:.055; mix-blend-mode:overlay;
}
/* a vignette that seats the whole thing on the page */
.vignette{
  position:absolute; inset:0; pointer-events:none; z-index:1;
  background:radial-gradient(130% 140% at 44% 38%, transparent 58%, rgba(0,0,0,.5) 100%);
}
/* the holographic edge: the one piece of pure brand on the card */
.holo-edge{
  position:absolute; top:0; left:0; right:0; height:3px; background:var(--holo);
}
.sheen{
  position:absolute; inset:-20% -10%; z-index:1; pointer-events:none;
  background:linear-gradient(112deg, transparent 34%, rgba(255,255,255,.05) 49%, rgba(255,255,255,.012) 55%, transparent 64%);
}
.holo-glow{
  position:absolute; top:0; left:0; right:0; height:120px;
  background:linear-gradient(180deg, rgba(199,165,247,.16), transparent 100%);
  pointer-events:none;
}
.row{position:relative; z-index:2;}
.mid{flex:1; display:flex; flex-direction:column; justify-content:center; padding:34px 0 30px;}

/* ── brand lockup ─────────────────────────────────────────── */
.brand{display:flex; align-items:center; gap:20px;}
.mark{
  position:relative; width:84px; height:84px; border-radius:24px;
  display:grid; place-items:center; color:var(--ink);
  background:linear-gradient(150deg, #17141f 0%, #0c0a12 100%);
  border:0;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14), 0 18px 40px -18px rgba(0,0,0,.9);
}
.mark svg{width:46px; height:46px;}
.mark::before{
  content:''; position:absolute; inset:-1.5px; border-radius:25.5px; z-index:-1;
  background:linear-gradient(140deg,#f2dfb8 0%,#f3b3cf 26%,#c7a5f7 52%,#9fe8d6 76%,#bcd9f4 100%); opacity:.85;
}
.mark::after{
  content:''; position:absolute; inset:-14px; border-radius:36px; z-index:-2;
  background:var(--holo); opacity:.26; filter:blur(18px);
}
.name{font-family:var(--f-display); font-weight:600; font-size:26px; letter-spacing:.04em; line-height:1.1;}
.sub-name{font-family:var(--f-mono); font-weight:500; font-size:13px; letter-spacing:.42em;
  text-transform:uppercase; color:var(--ink-faint); margin-top:8px;}

/* ── message ──────────────────────────────────────────────── */
.eyebrow{
  font-family:var(--f-mono); font-weight:600; font-size:17px; letter-spacing:.2em;
  text-transform:uppercase; margin-bottom:26px;
  background:var(--holo); -webkit-background-clip:text; background-clip:text; color:transparent;
}
h1{
  font-family:var(--f-display); font-weight:600; line-height:1.16; letter-spacing:-.018em;
  color:var(--ink); max-width:1010px; text-wrap:balance;
  text-shadow:0 2px 30px rgba(0,0,0,.5);
}
.sub{font-size:26px; font-weight:400; line-height:1.5; color:var(--ink-soft); margin-top:24px; max-width:900px;}

/* ── footer ───────────────────────────────────────────────── */
.foot{display:flex; align-items:center; justify-content:space-between; gap:24px;
  padding-top:26px; border-top:1px solid transparent;
  border-image:linear-gradient(90deg, rgba(255,255,255,.18), rgba(255,255,255,.03) 72%, transparent) 1;}
.url{font-family:var(--f-mono); font-weight:500; font-size:19px; letter-spacing:.02em; color:var(--ink-soft);}
.chips{display:flex; gap:12px;}
.chip{
  font-family:var(--f-mono); font-weight:500; font-size:13px; letter-spacing:.14em;
  text-transform:uppercase; color:var(--ink-faint);
  padding:9px 16px; border-radius:999px;
  border:1px solid rgba(255,255,255,.10);
  background:rgba(255,255,255,.028);
}
""".replace("GRAINURL", GRAIN)

def card_html(c):
    chips = "".join(f'<span class="chip">{x}</span>' for x in c["chips"])
    return f"""
<div class="card" id="{c['slug']}">
  <div class="sheen"></div><div class="grain"></div><div class="vignette"></div>
  <div class="holo-glow"></div><div class="holo-edge"></div>
  <div class="row brand">
    <div class="mark">{LOGO}</div>
    <div><div class="name">Hasnain</div><div class="sub-name">Studio X</div></div>
  </div>
  <div class="row mid">
    <div class="eyebrow">{c['eyebrow']}</div>
    <h1 style="font-size:{c['size']}px">{c['head']}</h1>
    <div class="sub">{c['sub']}</div>
  </div>
  <div class="row foot">
    <div class="url">{c['url']}</div>
    <div class="chips">{chips}</div>
  </div>
</div>"""

html = ("<!doctype html><html><head><meta charset='utf-8'><style>" + FONTS + CSS +
        "</style></head><body>" + "".join(card_html(c) for c in CARDS) + "</body></html>")
work = HERE / ".build"; work.mkdir(exist_ok=True)
work.joinpath("cards.html").write_text(html)

from playwright.sync_api import sync_playwright
outdir = HERE.parent / "images"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
    pg = b.new_page(viewport={"width":1200,"height":700}, device_scale_factor=1)
    pg.goto("file://" + str(work / "cards.html"))
    pg.wait_for_timeout(1200)
    from PIL import Image
    for c in CARDS:
        f = outdir / (c["slug"] + ".png")
        pg.locator("#" + c["slug"]).screenshot(path=str(f))
        """A 24-bit render of these gradients lands around 550 KB. A 256-colour
        palette with error diffusion is visually identical here and less than
        half the size."""
        im = Image.open(f).convert("RGB").quantize(
            colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
        im.save(f, optimize=True, compress_level=9)
        print("rendered", c["slug"], f.stat().st_size // 1024, "KB")
    b.close()
