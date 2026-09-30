# Builds the "Watch the house think" dollhouse, bakes lightmaps, exports a GLB.
# Coordinates follow public/assets/house.js: x 0..20 (left to right), y 0..14 (back to front),
# z up, in metres. Blender: X = x-10, Y = -(y-7), Z = z.
# usage: /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P build.py -- OUTDIR [--nobake] [--samples N] [--res N]
import bpy, bmesh, math, os, sys, json
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/h3d'
BAKE = '--nobake' not in argv
SAMPLES = int(argv[argv.index('--samples') + 1]) if '--samples' in argv else 256
RES = int(argv[argv.index('--res') + 1]) if '--res' in argv else 2048
LOTRES = RES // 2
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
FLOOR = 0.1


def V(x, y, z=0.0):
    return Vector((x - 10.0, -(y - 7.0), z))


def lin(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}


def mat(group, name, hexcol, rough=0.75, metal=0.0):
    key = f'{group}_{name}'
    if key in MATS:
        return MATS[key]
    m = bpy.data.materials.new(key)
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*lin(hexcol), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    MATS[key] = m
    return m


# ---------------------------------------------------------------- geometry helpers
OBJS = {'house': [], 'lot': [], 'dyn': []}


def new_obj(name, bm, material, group, smooth_faces=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.data.materials.append(material)
    if group:
        OBJS[group].append(ob)
    return ob


def rbox_bm(c0, c1, r=0.0, seg=3):
    """axis-aligned rounded box between blender corners c0, c1"""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    size = c1 - c0
    ctr = (c0 + c1) / 2
    for v in bm.verts:
        v.co = Vector((v.co.x * abs(size.x), v.co.y * abs(size.y), v.co.z * abs(size.z))) + ctr
    for f in bm.faces:
        f.smooth = False
    r = min(r, min(abs(size.x), abs(size.y), abs(size.z)) / 2 - 0.002)
    if r > 0.004:
        res = bmesh.ops.bevel(bm, geom=list(bm.edges), offset=r, segments=seg, affect='EDGES', profile=0.5, clamp_overlap=True)
        if seg > 1:
            for f in res['faces']:
                f.smooth = True
    return bm


def box(name, x, y, w, d, h, col, group='house', z0=0.0, r=0.03, seg=3, rough=0.75, metal=0.0, floor=True):
    """box in house.js terms: corner (x,y), width w along x, depth d along y, height h from z0 (above floor)"""
    zb = z0 + (FLOOR if floor else 0)
    c0 = V(x, y + d, zb)
    c1 = V(x + w, y, zb + h)
    bm = rbox_bm(c0, c1, r, seg)
    m = col if isinstance(col, bpy.types.Material) else mat(group, col.lstrip('#'), col, rough, metal)
    return new_obj(name, bm, m, group)


def cyl(name, cx, cy, rad, z0, z1, m, group='house', seg=20, axis='Z'):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=rad, radius2=rad, depth=(z1 - z0))
    for f in bm.faces:
        f.smooth = len(f.verts) == 4
    ob = new_obj(name, bm, m, group)
    if axis == 'Z':
        ob.location = V(cx, cy, (z0 + z1) / 2)
    return ob


def sphere(name, cx, cy, cz, rad, m, group='lot', sub=2, squash=1.0):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=rad)
    for v in bm.verts:
        v.co.z *= squash
    for f in bm.faces:
        f.smooth = True
    ob = new_obj(name, bm, m, group)
    ob.location = V(cx, cy, cz)
    return ob


def slab_poly(name, pts, z0, z1, m_top, m_side, group='lot'):
    """extruded 2D polygon (blender xy points) from z0 to z1; top uses m_top, sides m_side"""
    bm = bmesh.new()
    top = [bm.verts.new((p[0], p[1], z1)) for p in pts]
    bot = [bm.verts.new((p[0], p[1], z0)) for p in pts]
    ft = bm.faces.new(top)
    ft.material_index = 0
    fb = bm.faces.new(list(reversed(bot)))
    fb.material_index = 1
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        f = bm.faces.new([bot[i], bot[j], top[j], top[i]])
        f.material_index = 1
        f.smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.data.materials.append(m_top)
    ob.data.materials.append(m_side)
    OBJS[group].append(ob)
    return ob


def rrect(x0, y0, x1, y1, r, seg=8):
    """rounded rectangle in house coords -> blender xy list (ccw seen from above)"""
    cs = [(x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180), (x1 - r, y0 + r, 270)]
    out = []
    for cx, cy, a0 in cs:
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            # house y grows toward the front; blender Y = -(y-7)
            hx, hy = cx + r * math.cos(a), cy + r * math.sin(a)
            p = V(hx, hy)
            out.append((p.x, p.y))
    return out


# ---------------------------------------------------------------- materials
M = {}
H = 'house'
M['wall'] = mat(H, 'wall', '#E6E1D8', 0.9)
M['cap'] = mat(H, 'wallcap', '#2B3340', 0.8)
M['found'] = mat(H, 'foundation', '#4A5260', 0.9)
M['office'] = mat(H, 'floor_office', '#9A7552', 0.6)
M['laundry'] = mat(H, 'floor_laundry', '#B9C0C6', 0.5)
M['kitchen'] = mat(H, 'floor_kitchen', '#D2D5D6', 0.5)
M['pantry'] = mat(H, 'floor_pantry', '#A58A68', 0.6)
M['garage'] = mat(H, 'floor_garage', '#8C9298', 0.8)
M['living'] = mat(H, 'floor_living', '#A87E58', 0.55)
M['frame'] = mat(H, 'winframe', '#252A31', 0.5)
M['white'] = mat(H, 'appliance', '#EEF1F3', 0.35)
M['steel'] = mat(H, 'steel', '#A9B0B6', 0.35, 0.6)
M['dark'] = mat(H, 'dark', '#262C33', 0.4)
M['wood'] = mat(H, 'wood', '#8A6546', 0.6)
M['wood2'] = mat(H, 'woodlight', '#B89468', 0.6)
M['counter'] = mat(H, 'counter', '#E7E4DE', 0.3)
M['cabinet'] = mat(H, 'cabinet', '#39505E', 0.6)
M['sofa'] = mat(H, 'sofa', '#3E7488', 0.95)
M['rug'] = mat(H, 'rug', '#4A5A82', 1.0)
M['chair'] = mat(H, 'armchair', '#A5623F', 0.95)
M['plant'] = mat(H, 'plant', '#4C9A62', 0.9)
M['pot'] = mat(H, 'pot', '#C9B8A0', 0.8)
M['shade'] = mat(H, 'shade', '#F4E6CC', 0.9)
M['book1'] = mat(H, 'books1', '#B5553C', 0.8)
M['book2'] = mat(H, 'books2', '#D9B45A', 0.8)
M['book3'] = mat(H, 'books3', '#4F7F8C', 0.8)
M['metalgray'] = mat(H, 'metalgray', '#56616C', 0.5, 0.3)
M['tvbody'] = mat(H, 'tvbody', '#15181C', 0.4)
M['desk'] = mat(H, 'desk', '#7B5A3E', 0.55)
M['officechair'] = mat(H, 'officechair', '#2F6A80', 0.9)
M['garagedoor'] = mat('dyn', 'garagedoor', '#E3E7EA', 0.6)
L = 'lot'
M['grass'] = mat(L, 'grass', '#3F7148', 1.0)
M['soil'] = mat(L, 'soil', '#3A2C22', 1.0)
M['drive'] = mat(L, 'driveway', '#7A8088', 0.9)
M['porch'] = mat(L, 'porch', '#9A8A76', 0.9)
M['patio'] = mat(L, 'patio', '#978B7E', 0.9)
M['path'] = mat(L, 'path', '#8E8578', 0.9)
M['leaf'] = mat(L, 'foliage', '#3C7A4E', 1.0)
M['leaf2'] = mat(L, 'foliage2', '#4E9660', 1.0)
M['hedge'] = mat(L, 'hedge', '#356B45', 1.0)
M['trunk'] = mat(L, 'trunk', '#5E4430', 1.0)
M['lwood'] = mat(L, 'patiowood', '#8A6A4A', 0.7)
M['post'] = mat(L, 'post', '#2E343B', 0.6)
M['stone'] = mat(L, 'stone', '#6E6A64', 0.9)

# ---------------------------------------------------------------- site (lot object)
LX0, LY0, LX1, LY1 = -4.5, -8.0, 24.5, 23.0
slab_poly('lot', rrect(LX0, LY0, LX1, LY1, 1.6, 10), -0.9, 0.0, M['grass'], M['soil'], 'lot')
box('driveway', 0.0, 14.1, 6.6, LY1 - 14.1 - 0.02, 0.03, M['drive'], 'lot', r=0.01, seg=1, floor=False)
box('porch', 7.4, 14.1, 3.4, 2.1, 0.1, M['porch'], 'lot', r=0.02, seg=2, floor=False)
box('step', 8.0, 16.2, 2.2, 0.45, 0.05, M['porch'], 'lot', r=0.015, seg=2, floor=False)
box('walk', 8.4, 16.65, 1.4, LY1 - 16.65 - 0.02, 0.025, M['path'], 'lot', r=0.01, seg=1, floor=False)
box('patio', 6.0, -4.5, 7.0, 3.3, 0.06, M['patio'], 'lot', r=0.02, seg=2, floor=False)
# stepping stones from patio round the side
for i, (sx, sy) in enumerate([(21.0, 1.0), (21.4, 3.0), (21.1, 5.0), (21.5, 7.0), (21.2, 9.0), (21.6, 11.0)]):
    box(f'stone{i}', sx, sy, 0.9, 0.7, 0.04, M['stone'], 'lot', r=0.03, seg=2, floor=False)
# patio table and chairs
box('ptable', 8.3, -3.4, 2.0, 1.0, 0.06, M['lwood'], 'lot', z0=0.72, r=0.02, seg=2, floor=False)
for (lx, ly) in [(8.45, -3.3), (10.15, -3.3), (8.45, -2.55), (10.15, -2.55)]:
    box('pleg', lx, ly, 0.08, 0.08, 0.72, M['post'], 'lot', z0=0.0, r=0.0, floor=False)
for (cx, cy) in [(8.6, -4.15), (9.7, -4.15), (8.6, -2.1), (9.7, -2.1)]:
    box('pchair', cx, cy, 0.6, 0.55, 0.08, M['lwood'], 'lot', z0=0.42, r=0.03, seg=2, floor=False)
    box('pchairleg', cx + 0.05, cy + 0.05, 0.5, 0.45, 0.42, M['post'], 'lot', r=0.02, seg=1, floor=False)
# string-light posts around the patio
for (px, py) in [(6.2, -4.3), (12.8, -4.3), (6.2, -1.4), (12.8, -1.4)]:
    box('spost', px - 0.05, py - 0.05, 0.1, 0.1, 2.5, M['post'], 'lot', r=0.02, seg=1, floor=False)


def tree(nm, x, y, s):
    cyl(nm + 'trunk', x, y, 0.13 * s, 0, 1.6 * s, M['trunk'], 'lot', seg=10)
    sphere(nm + 'a', x, y, 2.3 * s, 1.15 * s, M['leaf'], 'lot', 2, 0.92)
    sphere(nm + 'b', x - 0.55 * s, y + 0.35 * s, 2.0 * s, 0.8 * s, M['leaf2'], 'lot', 2, 0.95)
    sphere(nm + 'c', x + 0.5 * s, y - 0.3 * s, 2.75 * s, 0.75 * s, M['leaf2'], 'lot', 2, 0.95)


tree('t1', 2.2, -4.0, 1.05)
tree('t2', 17.2, -5.2, 1.2)
tree('t3', 22.3, -2.6, 0.85)
tree('t4', 21.8, 19.5, 1.0)
tree('t5', -2.6, 18.0, 0.8)
# shrubs along the front of the living room and the side
for i, (sx, sy, r) in enumerate([(11.3, 14.75, 0.42), (12.4, 14.8, 0.36), (13.5, 14.75, 0.44), (16.6, 14.8, 0.4), (17.7, 14.75, 0.46), (18.9, 14.8, 0.38),
                                  (20.75, 12.4, 0.4), (20.8, 13.5, 0.34), (-0.8, 2.0, 0.45), (-0.8, 3.1, 0.38), (13.6, -0.8, 0.45), (15.0, -0.75, 0.38), (19.0, -0.8, 0.42)]):
    sphere(f'shrub{i}', sx, sy, r * 0.8, r, M['hedge'], 'lot', 2, 0.85)

# ---------------------------------------------------------------- house shell (house object)
box('foundation', -0.15, -0.15, 20.3, 14.3, FLOOR - 0.01, M['found'], z0=0.0, r=0.02, seg=1, floor=False)
FL = [('office', 0, 0, 7, 7), ('laundry', 7, 0, 4, 7), ('kitchen', 11, 0, 6, 7), ('kitchen', 17, 3, 3, 4),
      ('pantry', 17, 0, 3, 3), ('garage', 0, 7, 7, 7), ('living', 7, 7, 13, 7)]
for k, x, y, w, d in FL:
    box('floor_' + k, x, y, w, d, 0.012, M[k], z0=-0.012, r=0.0)

T = 0.16  # wall thickness


def wall(nm, axis, c, a, b, top, holes=(), cap=True):
    """wall along x (axis='x', at y=c) or along y (axis='y', at x=c) from a to b, height top above floor.
    holes: (a0, a1, z0, z1) openings."""
    cuts = sorted({a, b, *[h[0] for h in holes], *[h[1] for h in holes]})
    for i in range(len(cuts) - 1):
        s0, s1 = cuts[i], cuts[i + 1]
        mid = (s0 + s1) / 2
        spans = [(0.0, top)]
        for h in holes:
            if h[0] <= mid <= h[1]:
                spans = [(z0, z1) for (z0, z1) in [(0.0, h[2]), (h[3], top)] if z1 - z0 > 0.001]
        for (z0, z1) in spans:
            if axis == 'x':
                box(nm, s0, c - T / 2, s1 - s0, T, z1 - z0, M['wall'], z0=z0, r=0.0)
            else:
                box(nm, c - T / 2, s0, T, s1 - s0, z1 - z0, M['wall'], z0=z0, r=0.0)
    if cap:
        # dark section cap on top of the cut
        if axis == 'x':
            box(nm + '_cap', a, c - T / 2 - 0.004, b - a, T + 0.008, 0.02, M['cap'], z0=top, r=0.0)
        else:
            box(nm + '_cap', c - T / 2 - 0.004, a, T + 0.008, b - a, 0.02, M['cap'], z0=top, r=0.0)


WH, IH, LOW = 2.8, 2.25, 0.5
WINDOWS = [  # room, axis, c, a0, a1, z0, z1
    ('office', 'x', 0, 2.0, 4.6, 1.0, 2.2), ('laundry', 'x', 0, 8.4, 10.2, 1.4, 2.3), ('kitchen', 'x', 0, 11.8, 15.2, 1.3, 2.3),
    ('office', 'y', 0, 4.3, 6.2, 1.0, 2.2), ('garage', 'y', 0, 9.0, 11.2, 1.4, 2.1),
]
wall('w_back', 'x', 0, -T / 2, 20 + T / 2, WH, [(w[3], w[4], w[5], w[6]) for w in WINDOWS if w[1] == 'x'])
wall('w_left', 'y', 0, T / 2, 14 + T / 2, WH, [(w[3], w[4], w[5], w[6]) for w in WINDOWS if w[1] == 'y'])
# camera-side walls, cut low
wall('w_front_a', 'x', 14, 7.0, 7.9, LOW)
wall('w_front_b', 'x', 14, 10.2, 20 + T / 2, LOW)
wall('w_right', 'y', 20, T / 2, 14 - T / 2, LOW)
# garage front: pillars and header
wall('w_gar_l', 'x', 14, -T / 2, 1.0, 2.6, cap=True)
wall('w_gar_r', 'x', 14, 6.0, 7.0 + T / 2, 2.6, cap=True)
box('gar_header', 1.0, 14 - T / 2, 5.0, T, 0.25, M['wall'], z0=2.35, r=0.0)
box('gar_header_cap', 1.0, 14 - T / 2 - 0.004, 5.0, T + 0.008, 0.02, M['cap'], z0=2.6, r=0.0)
# interior walls with doorways (cut at IH)
wall('i_off_lau', 'y', 7, T / 2, 7 - T / 2, IH, [(5.1, 6.2, 0.0, IH)], cap=True)
wall('i_gar_liv', 'y', 7, 7 + T / 2, 14 - T / 2, IH, [(9.5, 10.9, 0.0, IH)])
wall('i_lau_kit', 'y', 11, T / 2, 7 - T / 2, IH, [(5.0, 6.2, 0.0, IH)])
wall('i_kit_pan', 'y', 17, T / 2, 3 - T / 2, IH)
wall('i_off_gar', 'x', 7, T / 2, 7 - T / 2, IH, [(5.2, 6.3, 0.0, IH)])
wall('i_lau_liv', 'x', 7, 7 - T / 2, 12.2, IH)
wall('i_kit_liv', 'x', 7, 17.5, 20 - T / 2, IH)
wall('i_pan', 'x', 3, 17 + T / 2, 18.2, IH)
wall('i_pan2', 'x', 3, 19.2, 20 - T / 2, IH)

# window frames and sills (static) + glass (dynamic)
GLASS = []
for i, (room, axis, c, a0, a1, z0, z1) in enumerate(WINDOWS):
    ft = 0.06
    if axis == 'x':
        box('wf', a0, c - T / 2 - 0.01, a1 - a0, T + 0.02, ft, M['frame'], z0=z0, r=0.0)
        box('wf', a0, c - T / 2 - 0.01, a1 - a0, T + 0.02, ft, M['frame'], z0=z1 - ft, r=0.0)
        box('wf', a0, c - T / 2 - 0.01, ft, T + 0.02, z1 - z0, M['frame'], z0=z0, r=0.0)
        box('wf', a1 - ft, c - T / 2 - 0.01, ft, T + 0.02, z1 - z0, M['frame'], z0=z0, r=0.0)
        box('wf', (a0 + a1) / 2 - 0.02, c - 0.02, 0.04, 0.04, z1 - z0, M['frame'], z0=z0, r=0.0)
        box('sill', a0 - 0.08, c + T / 2 - 0.01, a1 - a0 + 0.16, 0.12, 0.04, M['counter'], z0=z0 - 0.04, r=0.01, seg=1)
        GLASS.append((room, box(f'win_{room}_{i}', a0 + ft, c - 0.01, a1 - a0 - 2 * ft, 0.02, z1 - z0 - 2 * ft, mat('dyn', 'glass', '#10202E', 0.1), 'dyn', z0=z0 + ft, r=0.0)))
    else:
        box('wf', c - T / 2 - 0.01, a0, T + 0.02, a1 - a0, ft, M['frame'], z0=z0, r=0.0)
        box('wf', c - T / 2 - 0.01, a0, T + 0.02, a1 - a0, ft, M['frame'], z0=z1 - ft, r=0.0)
        box('wf', c - T / 2 - 0.01, a0, T + 0.02, ft, z1 - z0, M['frame'], z0=z0, r=0.0)
        box('wf', c - T / 2 - 0.01, a1 - ft, T + 0.02, ft, z1 - z0, M['frame'], z0=z0, r=0.0)
        box('wf', c - 0.02, (a0 + a1) / 2 - 0.02, 0.04, 0.04, z1 - z0, M['frame'], z0=z0, r=0.0)
        box('sill', c + T / 2 - 0.01, a0 - 0.08, 0.12, a1 - a0 + 0.16, 0.04, M['counter'], z0=z0 - 0.04, r=0.01, seg=1)
        GLASS.append((room, box(f'win_{room}_{i}', c - 0.01, a0 + ft, 0.02, a1 - a0 - 2 * ft, z1 - z0 - 2 * ft, mat('dyn', 'glass', '#10202E', 0.1), 'dyn', z0=z0 + ft, r=0.0)))

# ---------------------------------------------------------------- furniture
# office
box('desk_top', 1.0, 0.9, 2.8, 1.1, 0.06, M['desk'], z0=0.7, r=0.03, seg=2)
for lx in (1.05, 3.65):
    box('desk_leg', lx, 0.95, 0.1, 1.0, 0.7, M['dark'], r=0.02, seg=1)
box('monitor', 1.9, 1.05, 1.2, 0.06, 0.62, M['tvbody'], z0=0.98, r=0.025, seg=2)
box('monitor_stand', 2.42, 1.1, 0.16, 0.2, 0.24, M['metalgray'], z0=0.76, r=0.02, seg=1)
box('pc', 4.1, 0.7, 0.5, 0.8, 0.95, M['tvbody'], z0=0.0, r=0.04, seg=2)
box('keyboard', 2.0, 1.45, 0.9, 0.25, 0.025, M['dark'], z0=0.76, r=0.01, seg=1)
box('ochair_seat', 2.05, 2.2, 0.8, 0.75, 0.12, M['officechair'], z0=0.45, r=0.06, seg=3)
box('ochair_back', 2.1, 2.85, 0.7, 0.12, 0.7, M['officechair'], z0=0.6, r=0.05, seg=3)
cyl('ochair_post', 2.45, 2.6, 0.04, FLOOR, FLOOR + 0.45, M['metalgray'], seg=10)
box('ochair_base', 2.15, 2.3, 0.6, 0.6, 0.05, M['dark'], z0=0.02, r=0.02, seg=1)
box('shelf', 0.12, 3.4, 0.55, 2.8, 2.0, M['wood'], r=0.02, seg=2)
for si, sz in enumerate([0.35, 0.8, 1.25, 1.7]):
    for bi in range(6):
        bm_ = [M['book1'], M['book2'], M['book3']][(bi + si) % 3]
        box('book', 0.2 + 0.03 * (bi % 2), 3.55 + bi * 0.42, 0.42, 0.3, 0.3 + 0.04 * ((bi * 7 + si) % 3), bm_, z0=sz, r=0.01, seg=1)
box('orug', 0.9, 3.4, 3.4, 2.4, 0.012, M['rug'], z0=0.0, r=0.0)
# laundry
for wx in (7.25, 8.45):
    box('washer', wx, 0.22, 1.1, 1.05, 1.05, M['white'], r=0.07, seg=3, rough=0.3)
    cyl('washer_door', wx + 0.55, 1.28, 0.33, FLOOR + 0.52 - 0.02, FLOOR + 0.52 + 0.02, M['dark'])  # rotated below
box('ltub', 9.8, 0.22, 1.0, 0.8, 0.9, M['cabinet'], r=0.03, seg=2)
box('ltub_top', 9.75, 0.2, 1.1, 0.85, 0.05, M['counter'], z0=0.9, r=0.02, seg=2)
box('lshelf', 7.25, 0.2, 2.3, 0.35, 0.05, M['wood2'], z0=1.85, r=0.01, seg=1)
box('basket', 9.9, 2.2, 0.6, 0.45, 0.4, M['wood2'], r=0.05, seg=2)
# kitchen: base run along the back wall
box('kbase_a', 11.1, 0.18, 1.8, 0.85, 0.88, M['cabinet'], r=0.02, seg=2)
box('krange', 12.9, 0.18, 1.1, 0.85, 0.9, M['steel'], r=0.03, seg=2)
box('krange_top', 12.95, 0.2, 1.0, 0.8, 0.02, M['dark'], z0=0.9, r=0.0)
box('kbase_b', 14.0, 0.18, 1.62, 0.85, 0.88, M['cabinet'], r=0.02, seg=2)
box('kcounter', 11.08, 0.16, 4.56, 0.9, 0.05, M['counter'], z0=0.88, r=0.015, seg=2)
box('ksink', 14.3, 0.35, 0.8, 0.5, 0.02, M['steel'], z0=0.925, r=0.02, seg=1)
box('kfaucet', 14.66, 0.2, 0.06, 0.06, 0.35, M['steel'], z0=0.93, r=0.0)
# fridge shell (door is dynamic)
FX0, FX1, FY0, FY1, FH = 15.7, 16.8, 0.2, 1.12, 2.05
box('fr_back', FX0, FY0, FX1 - FX0, 0.06, FH, M['white'], r=0.02, seg=1)
box('fr_l', FX0, FY0, 0.06, FY1 - FY0, FH, M['white'], r=0.02, seg=1)
box('fr_r', FX1 - 0.06, FY0, 0.06, FY1 - FY0, FH, M['white'], r=0.02, seg=1)
box('fr_top', FX0, FY0, FX1 - FX0, FY1 - FY0, 0.08, M['white'], z0=FH - 0.08, r=0.02, seg=1)
box('fr_bot', FX0, FY0, FX1 - FX0, FY1 - FY0, 0.12, M['white'], z0=0.0, r=0.02, seg=1)
for sz in (0.55, 1.0, 1.45):
    box('fr_shelf', FX0 + 0.06, FY0 + 0.06, FX1 - FX0 - 0.12, FY1 - FY0 - 0.1, 0.02, M['counter'], z0=sz, r=0.0)
box('fr_food1', FX0 + 0.15, FY0 + 0.2, 0.3, 0.3, 0.25, M['book2'], z0=1.02, r=0.04, seg=2)
box('fr_food2', FX0 + 0.55, FY0 + 0.15, 0.25, 0.35, 0.3, M['plant'], z0=0.57, r=0.04, seg=2)
box('fr_food3', FX0 + 0.2, FY0 + 0.25, 0.35, 0.25, 0.2, M['book1'], z0=1.47, r=0.04, seg=2)
# island + stools
box('island', 12.9, 3.5, 3.2, 1.1, 0.88, M['cabinet'], r=0.03, seg=2)
box('island_top', 12.8, 3.4, 3.4, 1.3, 0.06, M['counter'], z0=0.88, r=0.03, seg=3)
for sx in (13.2, 14.4, 15.6):
    cyl('stool_leg', sx + 0.27, 5.2, 0.035, FLOOR, FLOOR + 0.65, M['metalgray'], seg=8)
    cyl('stool_seat', sx + 0.27, 5.2, 0.24, FLOOR + 0.65, FLOOR + 0.72, M['wood'], seg=18)
# pantry shelving
box('pshelf_side', 17.2, 0.2, 0.05, 0.55, 2.1, M['wood'], r=0.0)
box('pshelf_side', 19.75, 0.2, 0.05, 0.55, 2.1, M['wood'], r=0.0)
for sz in (0.4, 0.9, 1.4, 1.9):
    box('pshelf', 17.2, 0.2, 2.6, 0.55, 0.04, M['wood2'], z0=sz, r=0.0)
    for j in range(4):
        box('pjar', 17.35 + j * 0.6, 0.3, 0.35, 0.3, 0.3, [M['book2'], M['pot'], M['book1'], M['plant']][(j + int(sz * 10)) % 4], z0=sz + 0.04, r=0.06, seg=2)
# garage
box('bench', 0.15, 11.6, 0.9, 2.2, 0.06, M['wood'], z0=0.9, r=0.02, seg=2)
box('bench_base', 0.2, 11.65, 0.8, 2.1, 0.9, M['metalgray'], r=0.02, seg=1)
box('pegboard', 0.1, 11.7, 0.04, 2.0, 1.0, M['wood2'], z0=1.1, r=0.0)
box('gcab', 5.8, 7.25, 1.0, 0.55, 1.9, M['metalgray'], r=0.03, seg=2)
box('gbin1', 4.6, 7.3, 0.7, 0.5, 0.6, M['cabinet'], r=0.05, seg=2)
# living room
box('rug', 9.6, 8.8, 6.6, 3.8, 0.015, M['rug'], z0=0.0, r=0.0)
box('console', 13.0, 7.2, 3.2, 0.5, 0.5, M['wood'], r=0.03, seg=2)
box('tv_body', 13.25, 7.35, 2.7, 0.07, 1.5, M['tvbody'], z0=0.56, r=0.02, seg=2)
box('sofa_seat', 10.2, 12.2, 5.0, 0.95, 0.45, M['sofa'], r=0.12, seg=3)
box('sofa_back', 10.2, 12.95, 5.0, 0.4, 0.95, M['sofa'], r=0.14, seg=3)
box('sofa_arm', 10.05, 11.95, 0.45, 1.4, 0.68, M['sofa'], r=0.12, seg=3)
box('sofa_arm', 14.75, 11.95, 0.45, 1.4, 0.68, M['sofa'], r=0.12, seg=3)
for ci in range(3):
    box('cushion', 10.55 + ci * 1.4, 12.2, 1.35, 0.8, 0.14, M['sofa'], z0=0.45, r=0.07, seg=3)
box('ctable', 11.6, 9.9, 2.2, 1.1, 0.06, M['wood2'], z0=0.36, r=0.03, seg=2)
box('ctable_base', 11.8, 10.05, 1.8, 0.8, 0.36, M['wood'], r=0.03, seg=2)
box('achair_seat', 17.2, 9.4, 1.3, 1.3, 0.5, M['chair'], r=0.14, seg=3)
box('achair_back', 18.3, 9.35, 0.35, 1.4, 1.0, M['chair'], r=0.14, seg=3)
cyl('pot', 19.4, 13.2, 0.3, FLOOR, FLOOR + 0.55, M['pot'], seg=18)
sphere('plant', 19.4, 13.2, FLOOR + 0.95, 0.5, M['plant'], 'house', 2, 1.1)
cyl('lamp_base', 18.55, 12.75, 0.22, FLOOR, FLOOR + 0.04, M['metalgray'], seg=18)
cyl('lamp_pole', 18.55, 12.75, 0.025, FLOOR, FLOOR + 1.7, M['metalgray'], seg=8)
box('side_table', 17.4, 11.4, 0.7, 0.7, 0.55, M['wood2'], r=0.05, seg=2)

# ---------------------------------------------------------------- dynamic objects
DYN_M = {
    'shade': mat('dyn', 'lampshade', '#F4E6CC', 0.9),
    'tv': mat('dyn', 'tvscreen', '#05080E', 0.2),
    'fin': mat('dyn', 'fridgelight', '#DDF2FF', 0.5),
    'fdoor': mat('dyn', 'fridgedoor', '#F2F5F7', 0.35),
    'handle': mat('dyn', 'handle', '#A9B0B6', 0.3),
    'body': mat('dyn', 'carbody', '#C8513A', 0.28),
    'cabin': mat('dyn', 'carglass', '#1A2430', 0.08),
    'tire': mat('dyn', 'tire', '#1B1E22', 0.9),
    'rim': mat('dyn', 'rim', '#B8BEC4', 0.3),
    'head': mat('dyn', 'headlight', '#FFF4D6', 0.2),
    'tail': mat('dyn', 'taillight', '#5A1512', 0.3),
    'fixture': mat('dyn', 'fixture', '#FFE2A8', 0.5),
    'bulb': mat('dyn', 'bulb', '#FFE2A8', 0.5),
}
# lamp shade (living)
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=False, segments=24, radius1=0.32, radius2=0.22, depth=0.42)
for f in bm.faces:
    f.smooth = True
sh = new_obj('lampshade', bm, DYN_M['shade'], 'dyn')
sh.location = V(18.55, 12.75, FLOOR + 1.72 + 0.21)
# TV screen
box('tv_screen', 13.32, 7.425, 2.56, 0.01, 1.36, DYN_M['tv'], 'dyn', z0=0.63, r=0.0)
# fridge interior light panel
box('fridge_inner', FX0 + 0.07, FY0 + 0.065, FX1 - FX0 - 0.14, 0.01, FH - 0.25, DYN_M['fin'], 'dyn', z0=0.14, r=0.0)
# fridge door: pivot at hinge (FX1, FY1)
fd = box('fridge_door', FX0, FY1, FX1 - FX0, 0.08, FH, DYN_M['fdoor'], 'dyn', r=0.03, seg=2)
hd = box('fridge_handle', FX0 + 0.12, FY1 + 0.08, 0.05, 0.05, 0.8, DYN_M['handle'], 'dyn', z0=0.9, r=0.015, seg=1)
# join handle into door, set origin to hinge
for o in bpy.data.objects:
    o.select_set(False)
fd.select_set(True)
hd.select_set(True)
bpy.context.view_layer.objects.active = fd
bpy.ops.object.join()
OBJS['dyn'].remove(hd)
hinge = V(FX1, FY1 + 0.04, FLOOR)
fd.data.transform(__import__('mathutils').Matrix.Translation(-hinge))
fd.location = hinge
# garage door panels (closed), rolled by the page
GD_X0, GD_X1, GD_TOP = 1.0, 6.0, 2.35
PH = GD_TOP / 4
for i in range(4):
    p = box(f'gdoor_{i}', GD_X0 + 0.04, 13.96, GD_X1 - GD_X0 - 0.08, 0.06, PH - 0.02, M['garagedoor'], 'dyn', z0=0.0, r=0.015, seg=2)
    # origin at panel centre
    ctr = V((GD_X0 + GD_X1) / 2, 13.99, FLOOR + (PH - 0.02) / 2)
    p.data.transform(__import__('mathutils').Matrix.Translation(-ctr))
    p.location = ctr + Vector((0, 0, i * PH))
# outdoor fixtures that glow (drive: flood + wall lights, porch lantern, yard bulbs)
box('fx_flood', 0.05, 14.1, 0.25, 0.18, 0.14, DYN_M['fixture'], 'dyn', z0=2.25, r=0.03, seg=2)
box('fx_wall_l', 6.05, 14.1, 0.14, 0.12, 0.26, DYN_M['fixture'], 'dyn', z0=1.75, r=0.03, seg=2)
box('fx_wall_r', 6.8, 14.1, 0.14, 0.12, 0.26, DYN_M['fixture'], 'dyn', z0=1.75, r=0.03, seg=2)
box('fx_porch_post', 10.55, 15.75, 0.08, 0.08, 1.1, M['post'], 'lot', z0=0.0, r=0.0, floor=False)
box('fx_porch', 10.47, 15.67, 0.24, 0.24, 0.3, DYN_M['fixture'], 'dyn', z0=1.0, r=0.04, seg=2)
# string lights: bulbs along sagging strings between the patio posts
YARD_BULBS = []
posts = [(6.2, -4.3), (12.8, -4.3), (12.8, -1.4), (6.2, -1.4)]
for (a, b) in [(0, 1), (1, 2), (2, 3), (3, 0), (0, 2)]:
    (x0, y0), (x1, y1) = posts[a], posts[b]
    n = int(math.hypot(x1 - x0, y1 - y0) / 0.7)
    for k in range(1, n):
        t = k / n
        z = 2.45 - 0.35 * math.sin(math.pi * t)
        YARD_BULBS.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z))
bm = bmesh.new()
for (bx, by, bz) in YARD_BULBS:
    r_ = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.055)
    bmesh.ops.translate(bm, verts=r_['verts'], vec=V(bx, by, bz))
new_obj('fx_yard', bm, DYN_M['bulb'], 'dyn')
# the string wire (static, lot)
bm = bmesh.new()
for (a, b) in [(0, 1), (1, 2), (2, 3), (3, 0), (0, 2)]:
    (x0, y0), (x1, y1) = posts[a], posts[b]
    prev = None
    for k in range(0, 17):
        t = k / 16
        z = 2.45 - 0.35 * math.sin(math.pi * t)
        p = V(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z)
        if prev is not None:
            d = p - prev
            r_ = bmesh.ops.create_cube(bm, size=1.0)
            L_ = d.length
            q = d.to_track_quat('X', 'Z')
            M_ = q.to_matrix().to_4x4()
            for v in r_['verts']:
                v.co = Vector((v.co.x * L_, v.co.y * 0.012, v.co.z * 0.012))
            bmesh.ops.transform(bm, matrix=M_, verts=r_['verts'])
            bmesh.ops.translate(bm, verts=r_['verts'], vec=(p + prev) / 2)
        prev = p
new_obj('stringwire', bm, M['post'], 'lot')

# car, parked nose-in: body x 1.4..3.7, y 8.1..12.7
CAR = []
def cbox(nm, x, y, w, d, h, m, z0, r, seg=3):
    o = box(nm, x, y, w, d, h, m, 'dyn', z0=z0, r=r, seg=seg)
    CAR.append(o)
    return o
cbox('car_body', 1.45, 8.1, 2.2, 4.6, 0.62, DYN_M['body'], 0.22, 0.26, 4)
cbox('car_cabin', 1.62, 9.3, 1.86, 2.35, 0.55, DYN_M['cabin'], 0.78, 0.26, 4)
cbox('car_roof', 1.7, 9.5, 1.7, 1.9, 0.08, DYN_M['body'], 1.28, 0.06, 2)
cbox('car_head_l', 1.6, 8.07, 0.45, 0.05, 0.12, DYN_M['head'], 0.62, 0.03, 1)
cbox('car_head_r', 3.05, 8.07, 0.45, 0.05, 0.12, DYN_M['head'], 0.62, 0.03, 1)
cbox('car_tail_l', 1.55, 12.68, 0.45, 0.05, 0.1, DYN_M['tail'], 0.66, 0.03, 1)
cbox('car_tail_r', 3.1, 12.68, 0.45, 0.05, 0.1, DYN_M['tail'], 0.66, 0.03, 1)
for (wx, wy) in [(1.45, 9.0), (3.65, 9.0), (1.45, 11.8), (3.65, 11.8)]:
    for nm_, rad, m_, w_ in [('car_tire', 0.34, DYN_M['tire'], 0.24), ('car_rim', 0.2, DYN_M['rim'], 0.26)]:
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=rad, radius2=rad, depth=w_)
        for f in bm.faces:
            f.smooth = len(f.verts) == 4
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=__import__('mathutils').Matrix.Rotation(math.pi / 2, 3, 'Y'))
        o = new_obj(nm_, bm, m_, 'dyn')
        o.location = V(wx, wy, FLOOR + 0.34)
        CAR.append(o)

# washer doors: rotate the discs to face the front (+y house = -Y blender)
for o in list(OBJS['house']):
    if o.name.startswith('washer_door'):
        o.rotation_euler = (math.pi / 2, 0, 0)

# ---------------------------------------------------------------- join static groups
def join(group, name):
    obs = OBJS[group]
    for o in bpy.data.objects:
        o.select_set(False)
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    # clean up: merge exact duplicates only
    return ob


house = join('house', 'house')
lot = join('lot', 'lot')

# car: join into one object with origin at the car centre
for o in bpy.data.objects:
    o.select_set(False)
for o in CAR:
    o.select_set(True)
    OBJS['dyn'].remove(o)
bpy.context.view_layer.objects.active = CAR[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.join()
car = bpy.context.view_layer.objects.active
car.name = 'car'
cc = V(2.55, 10.4, 0)
car.data.transform(__import__('mathutils').Matrix.Translation(-cc))
car.location = cc
OBJS['dyn'].append(car)


def unwrap(ob, margin):
    for o in bpy.data.objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    while ob.data.uv_layers:
        ob.data.uv_layers.remove(ob.data.uv_layers[0])
    ob.data.uv_layers.new(name='lightmap')
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(50), island_margin=margin, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')


unwrap(house, 0.0025)
unwrap(lot, 0.004)
print('house faces', len(house.data.polygons), 'lot faces', len(lot.data.polygons))

# ---------------------------------------------------------------- lights
def light(name, kind, loc, energy, radius=0.2, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy
    ld.color = color
    if kind in ('POINT', 'SPOT'):
        ld.shadow_soft_size = radius
    ob = bpy.data.objects.new(name, ld)
    scene.collection.objects.link(ob)
    ob.location = loc
    return ob


GROUPS = {
    'office': [((2.4, 2.4, 1.9), 170), ((5.2, 5.2, 1.9), 60)],
    'laundry': [((9.0, 3.2, 1.9), 130)],
    'kitchen': [((13.2, 3.0, 1.95), 150), ((16.0, 4.6, 1.95), 110), ((18.6, 5.2, 1.95), 60)],
    'pantry': [((18.5, 1.7, 1.9), 70)],
    'garage': [((3.6, 10.6, 2.1), 220)],
    'living': [((18.55, 12.75, 1.93), 150), ((12.6, 10.4, 1.9), 170), ((9.0, 12.0, 1.8), 50)],
    'yard': [(b, 7) for b in YARD_BULBS] + [((9.5, -2.8, 2.3), 40)],
    'drive': [((0.3, 14.45, 2.25), 170), ((6.1, 14.35, 1.85), 40), ((6.9, 14.35, 1.85), 40)],
    'porch': [((10.59, 15.79, 1.15), 45), ((9.0, 14.6, 1.6), 25)],
}
LIGHTS = {}
for g, lst in GROUPS.items():
    LIGHTS[g] = []
    for i, ((x, y, z), e) in enumerate(lst):
        LIGHTS[g].append(light(f'L_{g}_{i}', 'POINT', V(x, y, z + FLOOR), e, 0.12 if g == 'yard' else 0.25))
sun = light('sun', 'SUN', (0, 0, 20), 1.0)
world = bpy.data.worlds.new('world')
scene.world = world
bg = world.node_tree.nodes.get('Background')


def set_sun(direction_from, strength, color, angle_deg):
    d = Vector(direction_from).normalized()
    sun.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    sun.data.energy = strength
    sun.data.color = color
    sun.data.angle = math.radians(angle_deg)


def lights_only(group):
    for g, obs in LIGHTS.items():
        for o in obs:
            o.hide_render = (g != group)
    sun.hide_render = group not in ('night', 'day')


# ---------------------------------------------------------------- bake
def setup_cycles():
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type != 'CPU'
    scene.cycles.device = 'GPU'
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = False
    scene.cycles.max_bounces = 4
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 0
    scene.cycles.transmission_bounces = 0
    scene.render.bake.margin = 12
    scene.render.bake.use_clear = True


def bake_target(ob, img):
    for slot in ob.material_slots:
        nt = slot.material.node_tree
        n = nt.nodes.get('BAKE') or nt.nodes.new('ShaderNodeTexImage')
        n.name = 'BAKE'
        n.image = img
        nt.nodes.active = n


def bake(ob, res, tag):
    img = bpy.data.images.new(f'{ob.name}_{tag}', res, res, float_buffer=True)
    bake_target(ob, img)
    for o in bpy.data.objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=12, use_clear=True)
    a = np.empty(res * res * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(res, res, 4)[:, :, :3]


def save_png(arr, path):
    """arr float HxWx3 in 0..1 (already encoded); blender images are bottom-up like GL"""
    h, w, _ = arr.shape
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=False, float_buffer=False)
    img.colorspace_settings.name = 'Non-Color'
    rgba = np.ones((h, w, 4), dtype=np.float32)
    rgba[:, :, :3] = np.clip(arr, 0, 1)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()


def encode(arr, pct=99.7):
    """sqrt encoding with a per-texture scale: stored = sqrt(v/scale); decode v = scale*s^2"""
    lum = arr if arr.ndim == 2 else arr.max(axis=2)
    scale = float(np.percentile(lum[lum > 1e-5], pct)) if np.any(lum > 1e-5) else 1.0
    scale = max(scale, 1e-4)
    return np.sqrt(np.clip(arr / scale, 0, 1)), scale


meta = {'floor': FLOOR, 'groups': list(GROUPS.keys()), 'scales': {}}
glass_objs = [g for _, g in GLASS]
if BAKE:
    setup_cycles()
    # hide things that should not cast into the bake
    for o in [car, *glass_objs] + [o for o in OBJS['dyn'] if o.name.startswith(('fx_', 'tv_screen', 'fridge_inner', 'lampshade'))]:
        o.hide_render = True
    SUN_SAMPLES, LAMP_SAMPLES = SAMPLES, SAMPLES * 2
    for ob, res, lres in [(house, RES, RES // 2), (lot, LOTRES, LOTRES)]:
        # texture A: R = sun/moon (one direction, used for both), G = sky dome, B = unused
        lights_only('sun')
        sun.hide_render = False
        set_sun(V(-6, 20, 16) - V(10, 7, 0), 3.0, (1, 1, 1), 2.0)
        bg.inputs['Strength'].default_value = 0.0
        scene.cycles.samples = SUN_SAMPLES
        a = bake(ob, res, 'sun')
        sun_l, s1 = encode(a[:, :, 1], 99.8)
        sun.hide_render = True
        bg.inputs['Color'].default_value = (1, 1, 1, 1)
        bg.inputs['Strength'].default_value = 1.0
        a = bake(ob, res, 'sky')
        sky_l, s2 = encode(a[:, :, 1], 99.8)
        meta['scales'][f'{ob.name}_sun'] = s1
        meta['scales'][f'{ob.name}_sky'] = s2
        save_png(np.stack([sun_l, sky_l, np.zeros_like(sun_l)], axis=2), f'{OUT}/{ob.name}_env.png')
        # lamp groups, 3 per texture, luminance only
        bg.inputs['Strength'].default_value = 0.0
        scene.cycles.samples = LAMP_SAMPLES
        gl = list(GROUPS.keys())
        for t in range(3):
            chans = []
            for c in range(3):
                g = gl[t * 3 + c]
                lights_only(g)
                a = bake(ob, lres, g)
                lum = a[:, :, 0] * 0.2126 + a[:, :, 1] * 0.7152 + a[:, :, 2] * 0.0722
                enc, s = encode(lum, 99.8)
                meta['scales'][f'{ob.name}_{g}'] = s
                chans.append(enc)
            save_png(np.stack(chans, axis=2), f'{OUT}/{ob.name}_lamps{t}.png')
    for o in bpy.data.objects:
        o.hide_render = False
    # remove bake nodes before export
    for m in bpy.data.materials:
        n = m.node_tree.nodes.get('BAKE')
        if n:
            m.node_tree.nodes.remove(n)

with open(f'{OUT}/meta.json', 'w') as f:
    json.dump(meta, f, indent=1)

# ---------------------------------------------------------------- export
for o in bpy.data.objects:
    o.select_set(o.type == 'MESH')
bpy.ops.export_scene.gltf(filepath=f'{OUT}/house.glb', export_format='GLB', use_selection=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_materials='EXPORT', export_yup=True,
                          export_lights=False, export_cameras=False, export_animations=False, export_extras=False)
bpy.ops.wm.save_as_mainfile(filepath=f'{OUT}/house.blend')
print('DONE', json.dumps(meta['scales']))
