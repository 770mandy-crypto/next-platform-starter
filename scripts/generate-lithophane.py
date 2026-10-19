# Generates a printable lithophane STL from an image: thicker where the image is dark.
# Usage: python3 scripts/generate-lithophane.py <image> <out.stl>
# Requires: pip install trimesh pillow
import sys
import numpy as np, trimesh
from PIL import Image, ImageOps

WIDTH = 150.0           # mm, plate width without frame
PX = 0.3                # mm per height sample
T_MIN, T_MAX = 0.8, 3.2 # mm, thickness for white / black
FRAME, T_FRAME = 4.0, 4.5

img = ImageOps.grayscale(Image.open(sys.argv[1]))
w = int(WIDTH / PX)
h = int(round(w * img.height / img.width))
lum = np.asarray(img.resize((w, h), Image.LANCZOS), dtype=float) / 255.0
z = T_MIN + (1.0 - lum) * (T_MAX - T_MIN)
f = int(FRAME / PX)
z = np.pad(z, f, constant_values=T_FRAME)[::-1]  # image row 0 is the top edge
rows, cols = z.shape

xs, ys = np.meshgrid(np.arange(cols) * PX, np.arange(rows) * PX)
top = np.column_stack([xs.ravel(), ys.ravel(), z.ravel()])
idx = np.arange(rows * cols).reshape(rows, cols)
a, b, c, d = idx[:-1, :-1].ravel(), idx[:-1, 1:].ravel(), idx[1:, :-1].ravel(), idx[1:, 1:].ravel()
faces = [np.column_stack([a, b, d]), np.column_stack([a, d, c])]

# Boundary loop (counter-clockwise seen from above), dropped to z=0 for the walls and base
ring = np.concatenate([idx[0, :], idx[1:, -1], idx[-1, -2::-1], idx[-2:0:-1, 0]])
n = len(top)
bottom = top[ring].copy(); bottom[:, 2] = 0
centre = np.array([[cols * PX / 2, rows * PX / 2, 0]])
verts = np.vstack([top, bottom, centre])
k = np.arange(len(ring)); k1 = (k + 1) % len(ring)
faces.append(np.column_stack([ring[k], n + k, ring[k1]]))
faces.append(np.column_stack([ring[k1], n + k, n + k1]))
faces.append(np.column_stack([np.full(len(ring), n + len(ring)), n + k1, n + k]))

mesh = trimesh.Trimesh(verts, np.vstack(faces), process=True)
if mesh.volume < 0:
    mesh.invert()
print('watertight', mesh.is_watertight, 'extents mm', mesh.extents.round(1), 'faces', len(mesh.faces))
mesh.export(sys.argv[2])
