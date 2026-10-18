# Generates public/models/mug.stl and mug.glb. Requires: pip install trimesh manifold3d
import numpy as np, trimesh
from trimesh.creation import revolve, torus, cylinder
# mm units: coffee mug, radius 40, height 95, wall 4, base 6
R, H, t, b = 40.0, 95.0, 4.0, 6.0
f = 3.0  # fillet-ish chamfer on bottom edge
profile = np.array([[0,0],[R-f,0],[R,f],[R,H],[R-t,H],[R-t,b],[0,b]])
body = revolve(profile, sections=128)
handle = torus(major_radius=28, minor_radius=6, major_sections=96, minor_sections=32)
handle.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[1,0,0]))
handle.apply_scale([1,1,1.15])
handle.apply_translation([R+4, 0, H*0.52])
mug = trimesh.boolean.union([body, handle], engine='manifold')
cavity = cylinder(radius=R-t, height=H, sections=128)
cavity.apply_translation([0,0,b+H/2+0.01])
mug = trimesh.boolean.difference([mug, cavity], engine='manifold')
print('watertight', mug.is_watertight, 'volume cm3', round(mug.volume/1000,1), 'extents', mug.extents.round(1))
import os
out=os.path.join(os.path.dirname(__file__), '..', 'public', 'models') + '/'
mug.export(out+'mug.stl')
g = mug.copy(); g.apply_scale(0.001)  # GLB in meters
g.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2,[1,0,0]))  # Z-up -> Y-up
g.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(name="ceramic", baseColorFactor=[200,90,60,255], roughnessFactor=0.35, metallicFactor=0.0))
g.export(out+'mug.glb')
