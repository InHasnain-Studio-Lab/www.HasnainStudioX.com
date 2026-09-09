# og-src - the social cards

Renders the seven Open Graph cards in `images/og-*.png` at 1200x630, in the
site's own design system: obsidian ground, pearl-foil accents, Unbounded for
display, Space Grotesk for text, JetBrains Mono for the small caps.

Copy in `cards.py`, layout and finish in `build_og.py`. Change a headline or a
count in `cards.py` and re-run; nothing else needs touching.

    pip install playwright pillow
    playwright install chromium
    python build_og.py

The typefaces are fetched once from the fontsource packages and inlined as data
URIs, so a render never depends on a live font request. Output is written back
over `../images/og-*.png`.

Not part of the published site: the deploy workflow strips this folder.
