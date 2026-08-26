"""P4 gallery post — composite/grade the Cycles masters, one shared treatment.

Input:  gallery-masters/${config}_${n}.png  (RGBA, transparent film, AgX MHC)
Output: public/assets/gallery/${config}_${n}.webp  (q84 — the Images-section
        naming contract; same master serves both breakpoints via CSS cover)

The stage grammar per cell reproduces the shipped P2/P3 compositions
(LOOKBIBLE §2 ink/porcelain split-stage; geometry sampled off the accepted
stills so the drop-in is seamless):
  1 hero-diagonal : ink field + porcelain wedge lower-right — edge drawn at
                    3x and LANCZOS-downsampled (the render-01 stair-step
                    class is dead by construction; gate-4 wedge-AA law)
  2 crown-knurl   : dark vertical gradient
  3 dial-faceon   : ink above / porcelain below, soft split at 0.685h
  4 side-14mm     : dark vertical gradient (top lifted)
  5 back-crystal  : cool dark gradient + porcelain accent bar right
Shared treatment: alpha-derived soft contact shadow onto light grounds,
fine mono grain (masks gradient banding), webp q84 method 6.

Run:  /usr/bin/python3 postprocess_gallery.py   (system python — has PIL)
"""

import os

from PIL import Image, ImageDraw, ImageFilter

REPO = "/Users/simon/engineer/one-hertz"
SRC = REPO + "/research/lookdev/instrument/gallery-masters"
DST = REPO + "/public/assets/gallery"

CONFIGS = [
    "natural-anchor-blue",
    "black-dlc-black",
    "natural-neon-green",
    "black-dlc-anchor-blue",
]

INK = (9, 11, 12)
PORCELAIN = (232, 234, 238)
PORCELAIN_WARM = (219, 213, 208)
BAR_WHITE = (242, 242, 241)

SS = 3  # ground supersample factor (AA'd wedge/split edges)


def vertical_gradient(w, h, top, bottom):
    im = Image.new("RGB", (1, h))
    px = im.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        px[0, y] = tuple(round(a + (b - a) * t) for a, b in zip(top, bottom))
    return im.resize((w, h))


def ground_1(w, h):
    """Ink field + porcelain wedge: edge right@0.302h -> bottom@0.40w."""
    g = Image.new("RGB", (w * SS, h * SS), INK)
    d = ImageDraw.Draw(g)
    d.polygon(
        [(w * SS, int(0.302 * h * SS)), (w * SS, h * SS), (int(0.40 * w * SS), h * SS)],
        fill=PORCELAIN,
    )
    return g.resize((w, h), Image.LANCZOS)


def ground_2(w, h):
    return vertical_gradient(w, h, (26, 30, 33), (18, 20, 24))


def ground_3(w, h):
    """Ink above, warm porcelain below, soft split at 0.685h."""
    g = Image.new("RGB", (w * SS, h * SS), (22, 23, 27))
    d = ImageDraw.Draw(g)
    d.rectangle([(0, int(0.685 * h * SS)), (w * SS, h * SS)], fill=PORCELAIN_WARM)
    g = g.filter(ImageFilter.GaussianBlur(radius=2 * SS))
    return g.resize((w, h), Image.LANCZOS)


def ground_4(w, h):
    return vertical_gradient(w, h, (32, 36, 39), (26, 30, 33))


def ground_5(w, h):
    """Cool dark gradient + porcelain accent bar behind the watch, right."""
    g = vertical_gradient(w * SS, h * SS, (45, 48, 54), (29, 33, 37))
    d = ImageDraw.Draw(g)
    d.rectangle(
        [(int(0.62 * w * SS), int(0.554 * h * SS)), (w * SS, int(0.718 * h * SS))],
        fill=BAR_WHITE,
    )
    return g.resize((w, h), Image.LANCZOS)


GROUNDS = {1: ground_1, 2: ground_2, 3: ground_3, 4: ground_4, 5: ground_5}


def contact_shadow(ground, alpha, opacity=0.30, blur=22, dy=14):
    """Darken the ground under the subject — alpha silhouette, blurred and
    dropped; invisible over ink, grounds the watch over porcelain."""
    sh = alpha.filter(ImageFilter.GaussianBlur(radius=blur))
    shifted = Image.new("L", sh.size, 0)
    shifted.paste(sh, (0, dy))
    black = Image.new("RGB", ground.size, (0, 0, 0))
    mask = shifted.point(lambda v: int(v * opacity))
    return Image.composite(black, ground, mask)


def add_grain(im, strength=2.5):
    """Fine centered mono grain, PIL-only: noise blended toward flat 128,
    then signed-added (offset -128) so the mean stays put."""
    from PIL import ImageChops

    noise = Image.effect_noise(im.size, 18).convert("L")
    flat = Image.new("L", im.size, 128)
    delta = Image.blend(flat, noise, strength / 18.0)
    d3 = Image.merge("RGB", [delta, delta, delta])
    return ImageChops.add(im, d3, scale=1.0, offset=-128)


def process(cfg, n):
    src = os.path.join(SRC, f"{cfg}_{n}.png")
    fg = Image.open(src).convert("RGBA")
    w, h = fg.size
    ground = GROUNDS[n](w, h).convert("RGB")
    alpha = fg.split()[3]
    ground = contact_shadow(ground, alpha)
    out = ground.copy()
    out.paste(fg, (0, 0), fg)
    out = add_grain(out)
    dst = os.path.join(DST, f"{cfg}_{n}.webp")
    out.save(dst, "WEBP", quality=80, method=6)
    print("WROTE", dst, out.size)


if __name__ == "__main__":
    os.makedirs(DST, exist_ok=True)
    for cfg in CONFIGS:
        for n in range(1, 6):
            process(cfg, n)
    print("ALL GALLERY WEBP DONE")
