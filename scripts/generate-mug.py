# Generates public/models/mug.stl and mug.glb: a coffee mug with an embossed name.
# Requires: pip install trimesh manifold3d fonttools shapely mapbox-earcut
import os
import numpy as np, trimesh
from trimesh.creation import revolve, torus, cylinder, extrude_polygon
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely.affinity import affine_transform

NAME = 'מנדי'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
# mm units: radius 40, height 95, wall 4, base 6
R, H, t, b = 40.0, 95.0, 4.0, 6.0
TEXT_H, EMBOSS, BURY = 26.0, 1.6, 1.0

def glyph_rings(glyph_set, name, steps=12):
    pen = RecordingPen()
    glyph_set[name].draw(pen)
    rings, cur = [], []
    for op, pts in pen.value:
        if op == 'moveTo':
            cur = [pts[0]]
        elif op == 'lineTo':
            cur.append(pts[0])
        elif op == 'qCurveTo':
            # TrueType quadratic spline: implied on-curve points between off-curve ones
            offs, end = list(pts[:-1]), pts[-1]
            for i, c in enumerate(offs):
                e = end if i == len(offs) - 1 else ((c[0] + offs[i+1][0]) / 2, (c[1] + offs[i+1][1]) / 2)
                s = cur[-1]
                for k in range(1, steps + 1):
                    u = k / steps
                    cur.append(((1-u)**2*s[0] + 2*(1-u)*u*c[0] + u*u*e[0],
                                (1-u)**2*s[1] + 2*(1-u)*u*c[1] + u*u*e[1]))
        elif op in ('closePath', 'endPath'):
            if len(cur) > 2:
                rings.append(cur)
            cur = []
    return rings

def text_polygons(text):
    font = TTFont(FONT)
    cmap, gs, hmtx = font.getBestCmap(), font.getGlyphSet(), font['hmtx']
    shapes, x = [], 0.0
    for ch in reversed(text):  # Hebrew is RTL: lay out glyphs left-to-right in reverse
        gname = cmap[ord(ch)]
        shape = None
        for ring in glyph_rings(gs, gname):
            p = Polygon([(x + px, py) for px, py in ring]).buffer(0)
            shape = p if shape is None else shape.symmetric_difference(p)
        if shape is not None:
            shapes.append(shape)
        x += hmtx[gname][0]
    shape = unary_union(shapes)
    minx, miny, maxx, maxy = shape.bounds
    s = TEXT_H / (maxy - miny)
    shape = affine_transform(shape, [s, 0, 0, s, -s*(minx+maxx)/2, -s*miny])
    return list(getattr(shape, 'geoms', [shape]))

def name_mesh(text):
    parts = [extrude_polygon(p, BURY + EMBOSS) for p in text_polygons(text)]
    m = trimesh.util.concatenate(parts)
    v, f = trimesh.remesh.subdivide_to_size(m.vertices, m.faces, max_edge=1.0)
    u, z, w = v[:, 0], v[:, 1], v[:, 2]
    r = R - BURY + w
    th = np.pi + u / R  # wrap onto the side opposite the handle, readable from -x
    z0 = H * 0.5 - TEXT_H / 2 + 2
    return trimesh.Trimesh(np.column_stack([r*np.cos(th), r*np.sin(th), z + z0]), f)

profile = np.array([[0,0],[R-3,0],[R,3],[R,H],[R-t,H],[R-t,b],[0,b]])
body = revolve(profile, sections=160)
handle = torus(major_radius=28, minor_radius=6, major_sections=96, minor_sections=32)
handle.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2, [1,0,0]))
handle.apply_scale([1, 1, 1.15])
handle.apply_translation([R + 4, 0, H*0.52])
cavity = cylinder(radius=R-t, height=H, sections=160)
cavity.apply_translation([0, 0, b + H/2 + 0.01])
mug = trimesh.boolean.difference([trimesh.boolean.union([body, handle], engine='manifold'), cavity], engine='manifold')
label = name_mesh(NAME)
full = trimesh.boolean.union([mug, label], engine='manifold')
print('watertight', full.is_watertight, 'extents', full.extents.round(1))

out = os.path.join(os.path.dirname(__file__), '..', 'public', 'models') + '/'
full.export(out + 'mug.stl')

def pbr(mesh, color, rough):
    mesh = mesh.copy()
    mesh.apply_scale(0.001)  # GLB in meters, Y-up
    mesh.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2, [1,0,0]))
    mesh.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(
        baseColorFactor=color, roughnessFactor=rough, metallicFactor=0.0))
    return mesh
label_only = trimesh.boolean.difference([label, mug], engine='manifold')
trimesh.Scene({'mug': pbr(mug, [200,90,60,255], 0.35),
               'name': pbr(label_only, [250,245,235,255], 0.5)}).export(out + 'mug.glb')
