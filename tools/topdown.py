# Usage: python3 tools/topdown.py assets/img assets/img/top 720   (needs Pillow + numpy)
"""Turn the angled pizza cut-outs into approximate top-down discs.
The pizza's top face is an ellipse in the photo: widest silhouette row = ellipse centre,
top of the alpha = top of the ellipse. Crop that ellipse, stretch it back into a circle,
mask it round with a soft edge and add a faint outer crust shade."""
import sys, os, glob
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

SRC, OUT, SIZE = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 720
os.makedirs(OUT, exist_ok=True)
files = sorted(glob.glob(os.path.join(SRC, 'pizza-*.webp')))
for f in files:
    im = Image.open(f).convert('RGBA'); a = np.array(im)[:, :, 3] > 128
    rows = np.where(a.any(1))[0]; y_top, y_bot = rows[0], rows[-1]
    widths = np.array([(np.where(r)[0][-1] - np.where(r)[0][0]) if r.any() else 0 for r in a])
    w = widths.max()
    # centre of the top ellipse = first row that reaches ~99% of the max width
    yc = int(np.where(widths >= w * .985)[0][0])
    cols = np.where(a[yc])[0]; x0, x1 = cols[0], cols[-1]
    b = yc - y_top; aa = (x1 - x0) / 2
    crop = im.crop((x0, y_top, x1, y_top + 2 * b))
    D = SIZE
    disc = crop.resize((D, D), Image.LANCZOS)
    # round mask, slightly inset so the crust edge (not the wall) is the rim
    m = Image.new('L', (D * 4, D * 4), 0); ImageDraw.Draw(m).ellipse((6, 6, D * 4 - 6, D * 4 - 6), fill=255)
    m = m.resize((D, D), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))
    alpha = np.minimum(np.array(disc)[:, :, 3], np.array(m))
    out = np.array(disc); out[:, :, 3] = alpha
    # gentle rim darkening so the crust reads as a rounded edge from above
    yy, xx = np.mgrid[0:D, 0:D]; r = np.hypot(xx - D / 2, yy - D / 2) / (D / 2)
    shade = np.clip((r - .86) / .14, 0, 1) ** 2 * .28
    out[:, :, :3] = (out[:, :, :3] * (1 - shade[..., None])).astype(np.uint8)
    name = os.path.basename(f)
    Image.fromarray(out).save(os.path.join(OUT, name), 'WEBP', quality=86, method=6)
    print(name, 'w', w, 'b', b, 'ratio', round(b / aa, 3))
