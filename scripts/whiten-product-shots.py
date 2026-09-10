#!/usr/bin/env python3
"""Lift the garments off their black studio backdrop and set them on white.

Brightness alone cannot do this. The backdrop sits at L=10, and so do the
darkest streaks of the black garments' distressed print — threshold on
luminance and the shirt comes back with bites taken out of it.

Two things do separate them:

  Texture. The backdrop is synthetic and perfectly flat — local standard
  deviation is 0.00 across all of it. Cloth is never flat; even a fold in full
  shadow carries weave and grain, around 0.7.

  Width. Where a streak genuinely matches the backdrop, what tells them apart
  is that a streak is a narrow channel into the garment while real backdrop is
  open field. So the silhouette is closed across everything, and then only the
  backdrop wide enough to hold a sizeable disk is cut back out — an opening,
  not a flood, because every streak drains into the same backdrop region and a
  flood would run straight back up them.

Originals are copied to assets/product-originals/ before anything is
overwritten, and every run re-cuts from those, so this is both reversible and
idempotent.
"""
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / 'public' / 'store' / 'images'
# Kept outside public/ so the untouched shots are not deployed with the site.
ORIGINALS = ROOT / 'assets' / 'product-originals'

TEXTURE_WINDOW = 7
# Backdrop measures 0.00; the most shadowed cloth measures ~0.66.
FLAT_MAX = 0.25
# Lit cloth is unambiguous on brightness alone.
LIT_MIN = 20
# Close the silhouette across gaps up to twice this, in pixels.
SEAL = 28
# Backdrop only counts as backdrop where a disk of this radius fits inside it.
# The streaks running out of the black garments are narrower than that, so they
# stay part of the garment; the open field around it does not.
BACKDROP_DISK = 40
# Snap thin bridges so a shadow line near the hem does not ride along with the
# garment just because the closing reached it. Kept small on purpose: a wider
# cut starts taking bites out of the garment itself, and a faint stray tick is
# the cheaper fault.
BRIDGE = 5
# How far to smooth the finished outline, in pixels.
OUTLINE_SMOOTH = 4.0
# The last few pixels before the cut are backdrop bleeding into the cloth, and
# on a white page they read as an ink outline drawn round the garment.
HALO = 5

CROSS = np.ones((3, 3), bool)


def local_std(lum: np.ndarray) -> np.ndarray:
    mean = ndimage.uniform_filter(lum, TEXTURE_WINDOW)
    mean_sq = ndimage.uniform_filter(lum * lum, TEXTURE_WINDOW)
    return np.sqrt(np.maximum(mean_sq - mean * mean, 0))


def touching_border(mask: np.ndarray) -> np.ndarray:
    """The parts of `mask` connected to the edge of the frame."""
    labels, count = ndimage.label(mask)
    if not count:
        return np.zeros_like(mask)
    edge = np.concatenate([labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]])
    ids = [int(v) for v in np.unique(edge) if v]
    return np.isin(labels, ids) if ids else np.zeros_like(mask)


def largest_region(mask: np.ndarray) -> np.ndarray:
    labels, count = ndimage.label(mask)
    if count <= 1:
        return mask
    sizes = ndimage.sum(mask, labels, range(1, count + 1))
    return labels == int(np.argmax(sizes)) + 1


def cutout(path: Path) -> Image.Image:
    rgb = Image.open(path).convert('RGB')
    lum = np.asarray(rgb.convert('L'), dtype=np.float32)
    std = local_std(lum)

    garment = (std > FLAT_MAX) | (lum >= LIT_MIN)

    # Close the outline, then take everything it encloses.
    garment = ndimage.binary_dilation(garment, CROSS, iterations=SEAL)
    garment = ndimage.binary_erosion(garment, CROSS, iterations=SEAL)
    garment = ndimage.binary_fill_holes(garment)

    # Cut back the backdrop the closing swallowed — but only where it is broad
    # enough to be backdrop rather than a streak. Eroding drops the narrow
    # channels; propagating regrows what survives to its true extent.
    backdrop = touching_border(std <= FLAT_MAX)
    wide = ndimage.binary_erosion(backdrop, CROSS, iterations=BACKDROP_DISK)
    wide = ndimage.binary_dilation(wide, CROSS, iterations=BACKDROP_DISK)
    garment &= ~wide

    # One garment per frame, so anything else is a stray mark or a shadow line
    # the closing happened to reach. Sever the thin bridges, choose the body
    # while it is still severed, and only then grow it back — regrowing first
    # would re-attach exactly what the severing was meant to drop. Growth is
    # held inside the silhouette so the outline does not creep outward.
    silhouette = garment
    body = largest_region(ndimage.binary_erosion(garment, CROSS, iterations=BRIDGE))
    garment = ndimage.binary_dilation(body, CROSS, iterations=BRIDGE) & silhouette
    garment = ndimage.binary_fill_holes(garment)

    # Closing at that radius leaves the outline notched. Blurring the mask and
    # re-cutting it at the halfway point rounds the notches off without moving
    # the silhouette.
    garment = ndimage.gaussian_filter(garment.astype(np.float32), OUTLINE_SMOOTH) > 0.5
    garment = ndimage.binary_fill_holes(garment)

    # The cut edge carries a dark halo from the backdrop behind it. Pulling the
    # mask in drops the halo; a slight blur keeps the edge off a staircase.
    alpha = ndimage.binary_erosion(garment, CROSS, iterations=HALO)
    alpha_img = Image.fromarray((alpha * 255).astype(np.uint8), mode='L')
    alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(0.9))

    white = Image.new('RGB', rgb.size, (255, 255, 255))
    return Image.composite(rgb, white, alpha_img)


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

        out = cutout(backup)
        out.save(path, 'JPEG', quality=88, optimize=True, progressive=True)

        share = float((np.asarray(out.convert('L')) < 250).mean())
        print(f'{path.name:24s} garment covers {share:5.1%} of the frame')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
