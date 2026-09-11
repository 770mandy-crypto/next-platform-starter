#!/usr/bin/env python3
"""Lift the garments off their black studio backdrop and set them on white.

The backdrop is synthetic: one exact colour, RGB(10,10,10), laid down perfectly
flat — local standard deviation is 0.00 across the whole of it. That gives a
very sharp test for "is this pixel backdrop": does it differ from that colour at
all. For the white garments the test is decisive on its own, and the cut needs
no cleaning up afterwards at all.

The black garments come back from that same test not as a filled shape but as a
drawing of one: seams, hems, waistband and logo separate cleanly, while the
cloth between them is the backdrop's own value to the digit. The shorts are
almost pure outline. So the shape is not found pixel by pixel — the outline is
closed until it encircles the garment, and then filled. Closing has to reach
thirty pixels before the shorts' outline joins up, and the fill is worth
nothing until it does.

Which of the two an image gets is measured, not configured: a garment whose
interior stands well clear of the backdrop takes the exact cut, and one that
does not is treated as an outline.

Edges are re-backed rather than masked. A pixel on the outline is a mixture of
cloth and backdrop; carrying it whole paints a dark line round the garment on a
white page, and eroding it away thins the garment by however many pixels the
erosion took. Instead each such pixel is given a coverage figure and handed back
exactly what the black behind it took — which needs no estimate of the cloth's
own colour and leaves no grey rim.

Originals are copied to assets/product-originals/ before anything is
overwritten, and every run re-cuts from those, so this is both reversible and
idempotent.
"""
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / 'public' / 'store' / 'images'
# Kept outside public/ so the untouched shots are not deployed with the site.
ORIGINALS = ROOT / 'assets' / 'product-originals'

# A pixel this far from the backdrop colour, on any channel, holds some cloth.
# One value of slack absorbs the ringing JPEG leaves along an edge. It has to
# stay this low for the black garments, whose cloth clears the backdrop by only
# a handful of values.
OFF_BACKDROP = 3
# Against a bright garment that same threshold also catches the stray single
# pixels JPEG scatters along the outline, which stipple the edge with grey
# dots. There the threshold rides on the garment's own contrast instead.
OFF_BACKDROP_SHARE = 0.04
# A garment whose interior sits at least this far from the backdrop can be cut
# on the exact test alone; below it, the geometric route is needed.
EXACT_CUT_CONTRAST = 40

# How far the outline route closes. Measured, not chosen: the shorts' outline
# joins up at thirty and the enclosed area then stops moving, so this sits just
# past where both garments settle.
SEAL = 34
# Exact route needs only enough closing to bridge JPEG ringing.
FINE_SEAL = 2

# Sever bridges this thin, to drop shadow marks the closing happened to reach.
BRIDGE = 5
# Anything shorter than this is the floor's contact line, not garment.
GROUND_LINE = 25
# A mark smaller than this is dust or a loose thread on the backdrop. It matters
# because the closing will happily build a bridge out to one, hanging a tab off
# the hem; removed before the closing, there is nothing to reach for.
SPECK = 60
# Width of the rim that gets a graded alpha instead of a hard edge.
RIM = 4

CROSS = np.ones((3, 3), bool)




def drop_specks(mask: np.ndarray) -> np.ndarray:
    labels, count = ndimage.label(mask)
    if not count:
        return mask
    sizes = ndimage.sum(mask, labels, range(1, count + 1))
    return np.concatenate(([False], sizes >= SPECK))[labels]


def largest_region(mask: np.ndarray) -> np.ndarray:
    labels, count = ndimage.label(mask)
    if count <= 1:
        return mask
    sizes = ndimage.sum(mask, labels, range(1, count + 1))
    return labels == int(np.argmax(sizes)) + 1


def close(mask: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return mask
    grown = ndimage.binary_dilation(mask, CROSS, iterations=radius)
    return ndimage.binary_erosion(grown, CROSS, iterations=radius)


def drop_stray_marks(mask: np.ndarray) -> np.ndarray:
    """Sever thin bridges, keep the body, then grow it back inside the outline.

    Choosing the body before regrowing matters: regrow first and the shadow
    mark the severing was meant to drop is simply re-attached.
    """
    body = largest_region(ndimage.binary_erosion(mask, CROSS, iterations=BRIDGE))
    if not body.any():
        return mask
    return ndimage.binary_dilation(body, CROSS, iterations=BRIDGE) & mask


def silhouette_exact(off: np.ndarray) -> np.ndarray:
    mask = ndimage.binary_fill_holes(close(off, FINE_SEAL))
    # JPEG leaves single stray pixels along the outline, and at full coverage
    # they stipple the edge with grey dots. One pixel of open-then-close drops
    # them without moving the outline itself.
    mask = ndimage.binary_closing(ndimage.binary_opening(mask, CROSS), CROSS)
    return drop_stray_marks(mask)


def silhouette_outline(off: np.ndarray) -> np.ndarray:
    """Close the garment's outline until it encircles it, then fill it.

    The radius is not a taste setting. Below it the outline is still broken and
    the fill leaks out to the frame; at it the enclosed area jumps and then
    stops moving, because the shape is now the garment and closing further has
    nothing left to join.
    """
    mask = largest_region(ndimage.binary_fill_holes(close(off, SEAL)))
    mask = ndimage.binary_fill_holes(drop_stray_marks(mask))
    # A faint contact line runs along the floor under these shots, a few pixels
    # tall where the garment is a thousand, so a vertical cut takes it alone.
    mask = ndimage.binary_opening(mask, np.ones((GROUND_LINE, 1), bool))
    return ndimage.binary_fill_holes(largest_region(mask))


def cutout(path: Path) -> tuple[Image.Image, str]:
    rgb = Image.open(path).convert('RGB')
    arr = np.asarray(rgb, dtype=np.int16)

    # The frame corner is backdrop by construction.
    backdrop = arr[2, 2].copy()
    distance = np.abs(arr - backdrop[None, None, :]).max(axis=2)

    off = drop_specks(distance >= OFF_BACKDROP)

    # How far clear of the backdrop does this garment actually sit? Measured
    # well inside it, so an edge or a stray mark cannot speak for the whole.
    interior = ndimage.binary_erosion(off, CROSS, iterations=25)
    contrast = float(np.median(distance[interior])) if interior.any() else 0.0

    if contrast >= EXACT_CUT_CONTRAST:
        clear = max(OFF_BACKDROP, contrast * OFF_BACKDROP_SHARE)
        mask, route = silhouette_exact(drop_specks(distance >= clear)), 'exact'
    else:
        mask, route = silhouette_outline(off), 'outline'

    # A pixel on the outline is a mixture of cloth and backdrop, so it needs a
    # coverage figure, not a yes or no. How far it sits from the backdrop,
    # against how far the cloth beside it sits, is that figure.
    core = ndimage.binary_erosion(mask, CROSS, iterations=RIM)
    cloth = ndimage.grey_dilation(np.where(core, distance, 0), size=2 * RIM + 3)
    coverage = np.clip(distance / np.maximum(cloth, 1.0), 0.0, 1.0)
    alpha = np.where(core, 1.0, coverage) * mask

    # Re-backing the shot, rather than masking it. A half-covered pixel was
    # darkened by the black behind it; put a white backing there instead and it
    # gets back exactly what that black took:
    #     out = a*F + (1-a)*white,  where  observed = a*F + (1-a)*backdrop
    #         = observed + (1-a)*(white - backdrop)
    # which needs no estimate of the cloth colour F and leaves no grey rim.
    lift = (1.0 - alpha)[:, :, None] * (255.0 - backdrop.astype(np.float32))[None, None, :]
    out = np.clip(arr.astype(np.float32) + lift, 0, 255).astype(np.uint8)
    return Image.fromarray(out), route


def main() -> int:
    files = sorted(IMAGES.glob('*.jpg'))
    if not files:
        print('no images found', file=sys.stderr)
        return 1

    ORIGINALS.mkdir(parents=True, exist_ok=True)
    for path in files:
        backup = ORIGINALS / path.name
        if not backup.exists():
            shutil.copy2(path, backup)

        out, route = cutout(backup)
        out.save(path, 'JPEG', quality=90, optimize=True, progressive=True)

        share = float((np.asarray(out.convert('L')) < 250).mean())
        print(f'{path.name:24s} {route:10s} garment covers {share:5.1%}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
