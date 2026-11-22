# Usage: python3 tools/topdown.py assets/img assets/img/top 720   (needs Pillow + numpy)
"""Turn the angled pizza cut-outs into approximate top-down discs.

1. The pizza's top face is an ellipse in the photo: widest silhouette row = ellipse centre,
   top of the alpha = top of the ellipse. Crop that ellipse and stretch it back into a circle.
2. Perspective leaves the toppings off-centre (crust thick on the far side, thin on the near
   side). Find the inner edge of the crust, fit a circle to it, and grow the crop downward until
   that circle is centred.
   (Warping the disc instead smears toppings when the photo has too little crust on one side.)
3. Mask it round with a soft edge and add a faint outer crust shade."""
import sys, os, glob
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

# Ugo's has a sausage border (not dough-coloured) and its cheddar volcano is already centred
SKIP_RECENTRE = {'pizza-ugos.webp'}


def crust_mask(rgb):
    """orange-brown dough: hue 6-34 deg, saturated, not dark"""
    a = rgb.astype(np.float32) / 255
    mx, mn = a.max(-1), a.min(-1); d = np.maximum(mx - mn, 1e-6)
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return (h >= 6) & (h <= 34) & (s > .42) & (mx > .38)


def topping_offset(rgba):
    """Centre of the topping area relative to the disc centre, in pixels (dx, dy)."""
    D = rgba.shape[0]; R = D / 2
    cm = crust_mask(rgba[..., :3]) & (rgba[..., 3] > 200)
    xs, ys = [], []
    for k in range(72):
        t = 2 * np.pi * k / 72; c, s = np.cos(t), np.sin(t); r = R - 6; miss = 0
        while r > R * .45:
            if cm[int(R + s * r), int(R + c * r)]: miss = 0
            else:
                miss += 1
                if miss >= 5: r += 4; break
            r -= 1
        xs.append(R + c * r); ys.append(R + s * r)
    x, y = np.array(xs), np.array(ys)
    A = np.c_[2 * x, 2 * y, np.ones_like(x)]
    (cx, cy, _), *_ = np.linalg.lstsq(A, x ** 2 + y ** 2, rcond=None)
    return cx - R, cy - R


def make_disc(im, box, D):
    return np.array(im.crop(tuple(int(round(v)) for v in box)).resize((D, D), Image.LANCZOS))


def best_crop(im, x0, x1, y_top, b, D):
    """Perspective hides part of the near crust, so the plain ellipse crop leaves the toppings low.
    Grow the crop downward (real crust pixels, no warping) until the crust ring comes out even
    top to bottom. Capped at +24% so it stays subtle."""
    w = x1 - x0; best = None
    for ext in np.arange(0, .241, .02):
        box = (x0, y_top, x1, y_top + 2 * b * (1 + ext))
        dx, dy = topping_offset(make_disc(im, box, 360))
        score = abs(dy)
        if best is None or score < best[0]: best = (score, ext, dx)
    _, ext, dx = best
    shift = 0.0   # sideways readings are too noisy to act on (the offset is a near/far perspective effect)
    return (x0 + shift, y_top, x1 + shift, y_top + 2 * b * (1 + ext)), ext, shift / w


if __name__ == '__main__':
    SRC, OUT, SIZE = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 720
    os.makedirs(OUT, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(SRC, 'pizza-*.webp'))):
        name = os.path.basename(f)
        im = Image.open(f).convert('RGBA'); a = np.array(im)[:, :, 3] > 128
        rows = np.where(a.any(1))[0]; y_top = rows[0]
        widths = np.array([(np.where(r)[0][-1] - np.where(r)[0][0]) if r.any() else 0 for r in a])
        w = widths.max()
        yc = int(np.where(widths >= w * .985)[0][0])        # first row at ~full width = ellipse centre
        cols = np.where(a[yc])[0]; x0, x1 = cols[0], cols[-1]
        b = yc - y_top
        D = SIZE
        if name in SKIP_RECENTRE: box, ext, sh = (x0, y_top, x1, y_top + 2 * b), 0, 0
        else: box, ext, sh = best_crop(im, x0, x1, y_top, b, D)
        disc = make_disc(im, box, D)
        m = Image.new('L', (D * 4, D * 4), 0); ImageDraw.Draw(m).ellipse((6, 6, D * 4 - 6, D * 4 - 6), fill=255)
        m = np.array(m.resize((D, D), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2)))
        disc[..., 3] = np.minimum(disc[..., 3], m)
        yy, xx = np.mgrid[0:D, 0:D]; r = np.hypot(xx - D / 2, yy - D / 2) / (D / 2)
        shade = np.clip((r - .86) / .14, 0, 1) ** 2 * .28
        disc[..., :3] = (disc[..., :3] * (1 - shade[..., None])).astype(np.uint8)
        Image.fromarray(disc).save(os.path.join(OUT, name), 'WEBP', quality=86, method=6)
        print(f'{name:28s} crop grown {100 * ext:4.0f}%  nudged {100 * sh:+4.1f}%')
