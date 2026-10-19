# Generates public/models/flying-wagon.stl (printable, one solid) and flying-wagon.glb (coloured):
# a stylised sculpture of the flying horse-drawn wagon from the painting.
# Requires: pip install trimesh manifold3d shapely mapbox-earcut
import os
import numpy as np, trimesh
from trimesh.creation import icosphere, cylinder, box, torus, extrude_polygon
from trimesh.transformations import rotation_matrix as rot
from shapely.geometry import Polygon

rng = np.random.default_rng(7)
parts = {k: [] for k in ('base', 'house', 'roof', 'dust', 'wood', 'horse', 'coat', 'skin', 'beard', 'hat')}

def ell(c, r, R=None):
    m = icosphere(subdivisions=3)
    m.apply_scale(r)
    if R is not None:
        m.apply_transform(R)
    m.apply_translation(c)
    return m

def limb(p0, p1, r):
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    return [cylinder(radius=r, segment=[p0, p1], sections=24), ell(p0, r), ell(p1, r)]

# --- wagon group, local coordinates: floor at z=0, travelling toward +x, viewer on +y ---
group = {k: [] for k in parts}
shell = box([50, 30, 14]); shell.apply_translation([0, 0, 7])
hollow = box([46, 26, 14]); hollow.apply_translation([0, 0, 9])
group['wood'].append(trimesh.boolean.difference([shell, hollow], engine='manifold'))
for z in (4, 9, 13.3):  # plank ribs
    for y in (-15.3, 15.3):
        rib = box([50, 1.2, 1.2]); rib.apply_translation([0, y, z]); group['wood'].append(rib)
for x in (-16, 16):
    group['wood'] += limb([x, -18, 2], [x, 18, 2], 1.6)  # axle
    for y in (-17.5, 17.5):
        rim = torus(10, 1.4, major_sections=64, minor_sections=16)
        rim.apply_transform(rot(np.pi/2, [1, 0, 0])); rim.apply_translation([x, y, 2])
        hub = cylinder(radius=2.8, height=3.5, sections=24)
        hub.apply_transform(rot(np.pi/2, [1, 0, 0])); hub.apply_translation([x, y, 2])
        group['wood'] += [rim, hub]
        for a in np.arange(8) * np.pi / 4:
            s = box([1.8, 1.6, 19.5]); s.apply_transform(rot(a, [0, 1, 0])); s.apply_translation([x, y, 2])
            group['wood'].append(s)
for y in (-9, 9):  # shafts to the horse
    group['wood'] += limb([22, y, 7], [68, y * 0.8, 19], 2.2)

# horse, leaping upward
group['horse'].append(ell([72, 0, 22], [17, 7.5, 8.5], rot(-0.35, [0, 1, 0])))
group['horse'] += limb([84, 0, 27], [93, 0, 40], 5)                       # neck
group['horse'].append(ell([98, 0, 41], [8.5, 3.6, 4.2], rot(0.5, [0, 1, 0])))  # head
for y in (-1.8, 1.8):
    group['horse'] += limb([94, y, 45], [93, y, 49], 1.1)                  # ears
for y in (-4, 4):
    group['horse'] += limb([83, y, 21], [91, y, 14], 2.6) + limb([91, y, 14], [87, y, 6], 2.0)  # front legs tucked
    group['horse'] += limb([62, y, 18], [52, y, 10], 3.0) + limb([52, y, 10], [41, y, 6], 2.0)  # hind legs stretched
group['horse'] += limb([56, 0, 22], [46, 0, 18], 2.6)                      # tail
group['horse'] += limb([89, 0, 37], [83, 0, 30], 2.2)                      # mane

# eight passengers in black coats and hats, facing the viewer (+y, the painting's point of view)
for x in (-15, -5, 5, 15):
    for y in (-6.5, 6.5):
        h = rng.uniform(-1.2, 1.2)
        top = 16 + h
        group['coat'] += limb([x, y, 4], [x, y, top], 4.6)
        group['skin'].append(ell([x, y, top + 4.4], 3.5))
        group['beard'].append(ell([x, y + 2.4, top + 2.6], [2.4, 1.8, 3.2]))
        brim = cylinder(radius=4.6, height=0.9, sections=32); brim.apply_translation([x, y, top + 7.2])
        crown = cylinder(radius=3.2, height=4.0, sections=32); crown.apply_translation([x, y, top + 9.4])
        group['hat'] += [brim, crown]

# tilt the whole flying group nose-up and lift it into the air
G = trimesh.transformations.concatenate_matrices(
    trimesh.transformations.translation_matrix([-5, 0, 48]), rot(np.radians(-20), [0, 1, 0]))
for k, ms in group.items():
    for m in ms:
        m.apply_transform(G); parts[k].append(m)
horse_belly = trimesh.transform_points([[72, 0, 15]], G)[0]
wagon_floor = trimesh.transform_points([[-4, 0, 1]], G)[0]

# base with a hill, a village house, and swirling "dust" supports holding the wagon and horse aloft
base = cylinder(radius=1, height=6, sections=96); base.apply_scale([78, 46, 1]); base.apply_translation([38, 0, 3])
hill = ell([60, -22, 6], [34, 16, 9])
parts['base'] += [base, hill]
walls = box([22, 16, 13]); walls.apply_translation([-22, 20, 6 + 6.5])
roof = extrude_polygon(Polygon([(-9, 0), (9, 0), (0, 8)]), 24)
roof.apply_transform(rot(np.pi/2, [1, 0, 0])); roof.apply_transform(rot(np.pi/2, [0, 0, 1]))
roof.apply_translation([-22 - 12, 20, 19]); roof.apply_scale(1)
parts['house'].append(walls); parts['roof'].append(roof)
for p0, p1, r in ([[-10, 0, 6], wagon_floor, 5.5], [[horse_belly[0] - 6, 0, 6], horse_belly, 4.0]):
    parts['dust'] += limb(p0, p1, r)
    puff = ell(p0, [r * 1.8, r * 1.8, r * 0.8]); parts['dust'].append(puff)

out = os.path.join(os.path.dirname(__file__), '..', 'public', 'models') + '/'
allm = [m for ms in parts.values() for m in ms]
solid = trimesh.boolean.union(allm, engine='manifold')
solid.apply_translation(-np.array([*solid.bounds[0][:2], 0]))
print('watertight', solid.is_watertight, 'extents mm', solid.extents.round(1), 'faces', len(solid.faces))
solid.export(out + 'flying-wagon.stl')

COL = {'base': [95, 140, 75], 'house': [235, 228, 210], 'roof': [175, 70, 50], 'dust': [200, 185, 155],
       'wood': [125, 85, 50], 'horse': [245, 245, 240], 'coat': [30, 30, 36], 'skin': [228, 188, 152],
       'beard': [70, 62, 55], 'hat': [20, 20, 24]}
scene = trimesh.Scene()
shift = solid.bounds[0] * 0
for k, ms in parts.items():
    m = trimesh.boolean.union(ms, engine='manifold') if len(ms) > 1 else ms[0].copy()
    m.apply_scale(0.001); m.apply_transform(rot(-np.pi/2, [1, 0, 0]))
    m.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(
        baseColorFactor=COL[k] + [255], roughnessFactor=0.6, metallicFactor=0.0))
    scene.add_geometry(m, node_name=k)
scene.export(out + 'flying-wagon.glb')
