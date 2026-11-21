"""Build the runner characters in Blender and export rigged, textured GLBs.

Run this with Blender's Python. The ordinates in the character profiles are
measured on the supplied three-view sheets. X in a frontal drawing gives
width, X in the side drawing gives depth, and the rows give height.
"""

from dataclasses import dataclass
import math
from pathlib import Path
import struct
import sys
import zlib

import bpy
from mathutils import Quaternion, Vector
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
ATLAS_SIZE = 1024
TAU = 2 * math.pi
Y_UP_TO_Z_UP = Quaternion((1, 0, 0), math.pi / 2)


def srgb(hex_color):
    return np.array(tuple(int(hex_color[i:i+2], 16) / 255 for i in (0, 2, 4)))


def smooth(low, high, value):
    t = np.clip((value - low) / (high - low), 0, 1)
    return t*t*(3 - 2*t)


def cubic(values, rows, y):
    """Interpolate a profile without overshoot near the poles and hem."""
    y = np.clip(y, rows[0], rows[-1])
    i = np.clip(np.searchsorted(rows, y) - 1, 0, len(rows)-2)
    distance = np.diff(rows)
    slope = np.diff(values) / distance
    d = np.empty(len(rows))
    d[0], d[-1] = slope[0], slope[-1]
    d[1:-1] = np.where(slope[:-1]*slope[1:] > 0,
                        2*slope[:-1]*slope[1:] / np.where(slope[:-1]+slope[1:] == 0,
                                                           1, slope[:-1]+slope[1:]), 0)
    t = (y - rows[i]) / distance[i]
    return (values[i]*(1+2*t)*(1-t)**2 + values[i+1]*t*t*(3-2*t)
            + distance[i]*t*(1-t)*(d[i]*(1-t)-d[i+1]*t))


def write_png(path, rgb):
    """Write the sRGB atlas without converting its color values in Blender."""
    def chunk(name, data):
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', zlib.crc32(name+data))
    h, w, _ = rgb.shape
    filtered = np.empty((h, w*3+1), dtype=np.uint8)
    filtered[:, 0] = 1  # PNG Sub predictor
    filtered[:, 1:4] = rgb[:, 0]
    filtered[:, 4:] = (rgb[:, 1:] - rgb[:, :-1]).reshape(h, -1)
    header = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header)
                     + chunk(b'IDAT', zlib.compress(filtered.tobytes(), 8)) + chunk(b'IEND', b''))


@dataclass
class Part:
    name: str
    sample: object
    role: str
    chains: tuple
    texture: tuple
    rings: int
    sides: int
    cap: bool = True
    flip: bool = False


class Reference:
    def __init__(self, filename, *, front, side, rear, floor, top, height, dragon):
        self.path = Path(filename)
        self.front, self.side, self.rear, self.floor = front, side, rear, floor
        self.unit = height / (floor - top)
        self.height = height
        self.dragon = dragon
        self.image = bpy.data.images.load(str(self.path), check_existing=True)
        w, h = self.image.size
        pixels = np.empty(w*h*4, dtype=np.float32)
        self.image.pixels.foreach_get(pixels)
        self.pixels = pixels.reshape(h, w, 4)[::-1, :, :3].copy()

    def xyz(self, x, depth, row):
        return (x - self.front) * self.unit, (self.side - depth) * self.unit, (self.floor - row) * self.unit

    def row(self, height):
        return self.floor - height / self.unit

    def photo_color(self, column, row):
        h, w, _ = self.pixels.shape
        x, y = np.clip(column, 0, w-1.001), np.clip(row, 0, h-1.001)
        u, v = x.astype(int), y.astype(int)
        dx, dy = (x-u)[..., None], (y-v)[..., None]
        upper = self.pixels[v,u]*(1-dx) + self.pixels[v,u+1]*dx
        lower = self.pixels[v+1,u]*(1-dx) + self.pixels[v+1,u+1]*dx
        return upper*(1-dy) + lower*dy

    def dragon_body_profile(self, column, row, color):
        # The arm hides these pixels in the side photograph. Sample the skin
        # on either side of the arm instead of painting a second arm on the body.
        rows = (265, 310, 350, 398, 450, 478, 501, 511)
        left = np.interp(row, rows, (105, 103, 110, 124, 142, 146, 151, 170))
        right = np.interp(row, rows, (189, 200, 207, 214, 220, 222, 219, 207))
        ratio = np.clip((column-left) / (right-left), 0, 1)
        a, b = self.photo_color(left-5, row), self.photo_color(right+5, row)
        skin = a*(1-ratio[..., None]) + b*ratio[..., None]
        cover = (smooth(265, 290, row) * (1-smooth(500, 514, row))
                 * smooth(-9, 4, column-left) * (1-smooth(-4, 9, column-right)))[..., None]
        return color*(1-cover) + skin*cover

    def sample(self, coordinates, normal, role):
        x, depth, height = np.moveaxis(coordinates, -1, 0)
        nx, ny, nz = np.moveaxis(normal, -1, 0)
        row = self.row(height)
        pixels_per_unit = 1 / self.unit
        front = self.front + x * pixels_per_unit
        back = self.rear - x * pixels_per_unit
        if self.dragon:
            # The rear silhouette reaches the right edge in the provided sheet.
            back = self.rear - np.abs(x * pixels_per_unit)
        side = self.side - depth * pixels_per_unit
        head_on = np.maximum(0, -ny)
        weights = [head_on**3.5, np.abs(nx)**3.5, np.maximum(0, ny)**3.5]
        if self.dragon:
            # Keep both eyes and the mouth from the same photograph.
            front_curve = np.maximum(smooth(.06,.46,head_on), smooth(255,302,side))
            near_face = front_curve * (1-smooth(178,229,row))
            weights[0] += 2.7*near_face
            weights[1] *= 1 - .99*near_face
            # The rear of the tail shares the rump's continuous projection.
            rump = smooth(.21,.40,depth) * smooth(483,541,row) * (1-smooth(.22,.49,abs(x)))
            weights[2] += 2.8*rump
            weights[1] *= 1 - .66*rump
        elif role == 'face':
            near_face = np.maximum(smooth(.065,.35,head_on), smooth(880,909,side))
            weights[0] = head_on**2 + 2.4*near_face
            weights[1] *= 1 - .98*near_face
        default = {
            'dragon': 'efbb42', 'dragon_body': 'efbb42', 'face': 'f6c5b0',
            'hair': '513124', 'hand': 'efb999', 'coat': '2e2c2a',
            'trouser': '242322', 'scarf': 'ba2320', 'shoe': 'f2efe9',
        }[role]
        base = srgb(default)
        light = .89 + .10 * np.maximum(0, nz) + .07 * np.maximum(0, -ny)
        if self.dragon:
            # Forehead and low back retain the warmth of the original figure.
            base = base * np.stack((light*1.014, light, light*.93), axis=-1)
        defaults = np.full(row.shape, .025)
        total = base * light[..., None] * defaults[..., None]

        for index, (column, contribution) in enumerate(zip((front, side, back), weights)):
            color = self.photo_color(column, row)
            if role == 'dragon_body' and index == 1:
                color = self.dragon_body_profile(column, row, color)
            r, g, b = np.moveaxis(color, -1, 0)
            if self.dragon:
                valid = smooth(.07, .125, r-b) + (1-smooth(.48, .60, r)) * (1-smooth(.43, .52, b))
                if index == 1:
                    # Only the frontal projection supplies the eyes and mouth.
                    facial_rows = 1 - smooth(173, 197, row)
                    valid *= 1 - facial_rows * (1-smooth(.47, .70, r))
            elif role == 'face':
                skin = smooth(.52, .72, r) * smooth(.035, .14, r-b)
                if index == 0:
                    face_rows = (80, 88, 98, 120, 145, 166, 181, 194, 199)
                    left = np.interp(row, face_rows, (635,630,619,605,596,600,613,631,638))
                    right = np.interp(row, face_rows, (659,671,683,699,717,694,680,655,650))
                    features = ((617, 139, 17, 14), (675, 139, 19, 14),
                                (619, 119, 16, 6), (674, 119, 17, 6), (647, 175, 16, 9))
                    feature_mask = np.maximum.reduce([
                        1 - smooth(.80, 1.17, ((column-x)/rw)**2 + ((row-y)/rh)**2)
                        for x,y,rw,rh in features
                    ])
                    outline = smooth(-2, 2, column-left) * smooth(-2, 2, right-column)
                    valid = outline * np.maximum(skin, feature_mask)
                elif index == 1:
                    left = np.interp(row, (83,115,140,170,190,200), (920,896,880,876,887,900))
                    # Keep the profile's skin tones. Eyes, lashes and lips are
                    # already supplied by the front view.
                    valid = skin * smooth(-2, 3, column-left) * (1-smooth(.20, .28, r-g))
                else:
                    valid = skin * smooth(.015, .058, r-g)
            elif role == 'hand':
                valid = smooth(.51, .68, r) * smooth(.014, .061, r-g) * (1-smooth(.16, .29, r-g))
            elif role == 'hair':
                valid = (1-smooth(.34, .55, r)) * smooth(-.015, .022, r-b)
            elif role in ('coat','trouser'):
                valid = (1-smooth(.29, .47, r)) * (1-smooth(.065, .15, r-g))
            elif role == 'scarf':
                valid = smooth(.115, .29, r-g) * (1-smooth(.40, .56, g))
            else:
                valid = smooth(.57, .77, r) * (1-smooth(.067, .13, b-r))
            mix_weight = contribution * np.clip(valid, 0, 1)
            total += color * mix_weight[..., None]
            defaults += mix_weight
        return np.clip(total / defaults[..., None], 0, 1)


def loft(ref, sections, *, dish=None, boxiness=1, rounded_ends=False):
    """Horizontal sections in (row, front center, half-width, rear, front)."""
    rows, centers, widths, backs, fronts = np.array(sections, dtype=float).T

    def sample(u, v):
        if rounded_ends:
            v = .5 - .5*np.cos(math.pi*v)
        row = rows[-1] + (rows[0] - rows[-1])*v
        center, width, back, front = (cubic(a, rows, row) for a in (centers, widths, backs, fronts))
        side, facing = np.sin(TAU*u), np.cos(TAU*u)
        x = center + width * np.sign(side) * abs(side)**boxiness
        depth = .5*(front+back) + .5*(front-back)*np.sign(facing)*abs(facing)**boxiness
        if dish:
            depth += dish(x, row, np.maximum(0, facing))
        return np.stack(ref.xyz(x, depth, row), axis=-1)
    return sample


def mirrored(sections, center):
    return [(row,2*center-x,r,b,f) for row,x,r,b,f in sections]


def strands(ref, sections):
    """An open bob shell whose angular edges follow the visible hairline."""
    rows, centers, widths, backs, fronts = np.array(sections, dtype=float).T
    edge_rows = (74, 80, 88, 97, 110, 125, 146, 172, 193, 208)
    left = (645, 637, 628, 619, 610, 603, 596, 600, 601, 600)
    right = (645, 656, 671, 682, 694, 702, 707, 693, 685, 681)

    def sample(u, v):
        row = rows[-1] + (rows[0] - rows[-1])*v
        fade = smooth(168, 208, row)
        row -= fade * (6*np.sin(math.pi*u)**4 + 10*(1-u)**5)
        center, half, back, front = (cubic(a, rows, row) for a in (centers, widths, backs, fronts))
        lo = np.interp(row, edge_rows, left)
        hi = np.interp(row, edge_rows, right)
        near = np.arcsin(np.clip((hi-center)/half, -.91, .91))
        far = np.arcsin(np.clip((lo-center)/half, -.91, .91)) + TAU
        a = u*far + (1-u)*near
        ripple = .8 * np.sin(17*a + .048*row) * smooth(50,100,row)
        lower_rim = smooth(194,208,row) * 1.0
        radius = half + ripple - lower_rim
        x = center + radius*np.sin(a)
        facing = np.cos(a)
        depth = .5*(front+back) + (.5*(front-back)+ripple-lower_rim)*facing
        temple = smooth(98,132,row) * (1-smooth(183,210,row))
        depth -= 28*temple*smooth(.25,.8,facing)*smooth(.05,.4,-np.sin(a))
        return np.stack(ref.xyz(x, depth, row), axis=-1)
    return sample


def wrap(ref, x, depth, row, radius_x, radius_d, thickness, bias):
    def sample(u, v):
        # Two skewed rings meet in front of the throat.
        a, b = TAU*u, TAU*v
        bulge = thickness*np.cos(b)
        return np.stack(ref.xyz(x + (radius_x+bulge)*np.sin(a),
                                depth + (radius_d+bulge)*np.cos(a),
                                row + bias*np.sin(a) + thickness*.76*np.sin(b)), axis=-1)
    return sample


def surface_grid(part, rows, sides):
    u, v = np.meshgrid(np.linspace(0, 1, sides), np.linspace(0, 1, rows))
    return part.sample(u, v), u, v


def build_atlas(ref, parts, output):
    atlas = np.empty((ATLAS_SIZE, ATLAS_SIZE, 3), dtype=np.uint8)
    atlas[:] = np.rint(255*srgb('edb341' if ref.dragon else '282523'))
    x = y = shelf = 0
    tiles = {}
    for part in sorted(parts, key=lambda p: -p.texture[1]):
        w, h = part.texture
        if x+w > ATLAS_SIZE:
            x, y, shelf = 0, y+shelf, 0
        if y+h > ATLAS_SIZE:
            raise ValueError(f'Atlas out of room: {part.name}')
        local, u, v = surface_grid(part,h-8,w-8)
        du = part.sample(u+.0004,v) - part.sample(u-.0004,v)
        dv = part.sample(u,np.minimum(1,v+.0004)) - part.sample(u,np.maximum(0,v-.0004))
        normal = np.cross(du,dv)
        if part.flip:
            normal *= -1
        normal /= np.maximum(1e-8,np.linalg.norm(normal, axis=-1, keepdims=True))
        baked = ref.sample(local,normal,part.role)
        baked = np.pad(np.uint8(np.rint(baked[::-1]*255)), ((4,4),(4,4),(0,0)),mode='edge')
        atlas[y:y+h,x:x+w] = baked
        tiles[part.name] = (x,y,w,h)
        x, shelf = x+w, max(shelf,h)
    write_png(output, atlas)
    return tiles


def mesh_part(ref, part, tile, material, rig):
    pts, u, v = surface_grid(part, part.rings, part.sides+1)
    sides = part.sides + 1
    faces = []
    for row in range(part.rings-1):
        for col in range(part.sides):
            a = row*sides+col
            face = (a,a+1,a+1+sides,a+sides)
            faces.append(face[::-1] if part.flip else face)
    if part.cap:
        faces.append(tuple(reversed(range(part.sides))))
        offset = (part.rings-1)*sides
        faces.append(tuple(range(offset,offset+part.sides)))
    points = pts.reshape(-1,3)
    mesh = bpy.data.meshes.new(part.name)
    mesh.from_pydata(points.tolist(), [], faces)
    mesh.update()
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    x,y,w,h = tile
    uv = np.stack(((x+4.5+u*(w-9))/ATLAS_SIZE,
                   1-(y+4.5+(1-v)*(h-9))/ATLAS_SIZE),axis=-1).reshape(-1,2)
    loops = np.empty(len(mesh.loops), dtype=np.int32)
    mesh.loops.foreach_get('vertex_index', loops)
    layer = mesh.uv_layers.new(name='Reference atlas')
    layer.uv.foreach_set('vector', np.float32(uv[loops]).ravel())
    mesh.materials.append(material)
    obj = bpy.data.objects.new(part.name,mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = rig
    modifier = obj.modifiers.new('Skeleton','ARMATURE')
    modifier.object = rig
    rows = ref.row(points[:,2])
    anchors, joints = zip(*part.chains)
    for i, joint in enumerate(joints):
        group = obj.vertex_groups.new(name=joint)
        weights = np.interp(rows,anchors,[int(i==k) for k in range(len(joints))])
        quantized = np.rint(weights*1000).astype(int)
        for w in set(quantized) - {0}:
            group.add(np.flatnonzero(quantized==w).tolist(),w/1000,'REPLACE')
    return obj


def create_rig(ref, name, joints):
    armature = bpy.data.armatures.new(name + ' skeleton')
    obj = bpy.data.objects.new(name + ' rig',armature)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for bone_name, parent, x, depth, row in joints:
        bone = armature.edit_bones.new(bone_name)
        bone.head = ref.xyz(x,depth,row)
        bone.tail = Vector(bone.head) + Vector((0,.14,0))
        bone.roll = 0
        if parent:
            bone.parent = armature.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    armature.display_type = 'STICK'
    return obj


def dragon(ref):
    c, d = ref.front, ref.side
    torso = [(89,628,.7,252,254),(90,628,13,242,269),(93,627,25,232,281),
             (100,627,44,219,293),(116,625,53,201,309),
             (135,625,62,183,320),(155,625,71,170,329),(185,625,77,142,329),
             (210,624,87,122,315),(245,624,107,99,291),(277,624,126,85,286),
             (319,625,149,70,302),(360,625,161,62,317),(407,625,176,52,341),
             (449,625,181,49,350),(480,625,182,55,350),(515,625,174,65,345),
             (551,624,162,78,331),(581,624,149,91,304),(612,624,137,116,269),
             (630,623,114,154,232),(640,623,35,181,204),(645,623,1,192,194)]

    def lids(x,row,facing):
        return 4.4*np.exp(-((abs(x-628)-43.5)/17)**2-((row-137)/19)**2)*facing**2

    parts = [Part('Body and head',loft(ref,torso,dish=lids,rounded_ends=True),'dragon_body',
                  ((204,'Head'),(305,'Chest'),(560,'Pelvis')),(512,460),58,74)]
    joints = [('Pelvis',None,c,d,575),('Chest','Pelvis',c,190,385),('Head','Chest',c,216,237)]
    arms = [(261,533,6,140,160),(280,505,29,110,193),(310,481,32,104,199),
            (345,461,31,110,205),(380,444,29,121,207),(416,429,27,133,211),
            (451,420,24,142,217),(476,416,21,147,221),(493,418,15,154,220),
            (506,416,3,173,208)]
    legs = [(573,545,27,156,226),(598,542,56,128,266),(629,542,56,130,249),
            (653,543,55,131,247),(674,544,55,127,266),(687,544,54,127,275),
            (696,544,48,137,266),(699,544,33,152,239)]
    for sign,side in ((-1,'L'),(1,'R')):
        arm = arms if sign == -1 else mirrored(arms,c)
        leg = legs if sign == -1 else mirrored(legs,c)
        parts.extend([
            Part('Arm '+side,loft(ref,arm),'dragon',((348,'Arm'+side),(425,'Elbow'+side),(477,'Hand'+side)),
                 (232,208),28,24),
            Part('Leg and foot '+side,loft(ref,leg,boxiness=.81),'dragon',
                 ((600,'Leg'+side),(653,'Knee'+side),(686,'Foot'+side)),(185,134),21,28),
        ])
        joints.extend([
            ('Arm'+side,'Chest',c+sign*125,151,300),
            ('Elbow'+side,'Arm'+side,c+sign*176,171,385),
            ('Hand'+side,'Elbow'+side,c+sign*204,187,466),
            ('Leg'+side,'Pelvis',c+sign*79,186,592),
            ('Knee'+side,'Leg'+side,c+sign*81,189,646),
            ('Foot'+side,'Knee'+side,c+sign*81,196,677),
        ])
    joints.append(('Tail','Pelvis',c,99,560))

    def tail(u,v):
        profile = np.array([(-14,547,.7,.7),(3,550,14,18),(31,553,24,22),(66,552,38,30),
                            (103,553,56,43),(142,550,62,46),(162,545,58,45)])
        distance = profile[:,0]
        depth = distance[0]+(distance[-1]-distance[0])*v
        row, width, radius = (cubic(vals,distance,depth) for vals in profile[:,1:].T)
        return np.stack(ref.xyz(c + width*np.sin(TAU*u),depth,
                                row + radius*np.cos(TAU*u)),axis=-1)

    parts.append(Part('Low tail',tail,'dragon',((0,'Tail'),),(260,155),24,37))
    return parts, joints


def teacher(ref):
    c, d = ref.front, ref.side
    parts = []
    joints = [('Pelvis',None,c,d,373),('Chest','Pelvis',c,858,270),('Head','Chest',642,871,202),
              ('Scarf','Chest',644,897,219)]
    face = [(62,641,15,842,893),(73,640,35,820,917),(85,637,52,809,926),
            (104,635,62,799,933),(121,638,63,808,933),(140,641,58,819,928),
            (157,644,54,833,926),(175,644,43,854,923),(188,644,31,878,916),
            (196,645,13,895,909),(200,645,1.2,900,902)]

    def nose(x,row,facing):
        cheek = 23*smooth(17,44,abs(x-642))*smooth(94,129,row)*(1-smooth(168,198,row))
        bridge = 9*np.exp(-((x-644)/11)**2-((row-154)/17)**2)
        return bridge*facing**5-cheek*facing

    parts.append(Part('Face',loft(ref,face,dish=nose),'face',((0,'Head'),),(410,296),43,62))
    hair = [(34,632,.9,855,860),(40,632,25,839,888),(50,636,47,818,913),
            (68,637,64,800,935),(86,637,73,791,943),(107,635,77,784,943),
            (127,635,78,780,934),(146,634,78,781,919),(164,633,75,784,903),
            (181,633,72,788,895),(192,632,69,792,893),
            (200,632,67,799,890),(207,632,64,816,887),(210,632,61,824,885)]
    parts.append(Part('Side-part bob',strands(ref,hair),'hair',((0,'Head'),),(396,276),39,66,cap=False))
    ear = [(130,705,4,864,873),(135,707,9,864,887),(145,708,11,863,892),
           (154,704,10,866,889),(162,700,4,874,882)]
    parts.append(Part('Ear',loft(ref,ear),'hand',((0,'Head'),),(80,76),13,24))
    neck = [(176,644,7,884,908),(192,643,21,860,908),(204,643,25,844,903),
            (215,641,26,836,886),(227,639,21,836,883)]
    parts.append(Part('Neck',loft(ref,neck),'hand',((186,'Head'),(225,'Chest')),(114,90),16,29))

    coat = [(209,638,21,829,901),(219,638,40,824,907),(232,638,56,820,916),
            (254,638,62,824,920),(281,638,61,826,922),(310,638,59,827,920),
            (342,638,57,826,918),(375,639,61,824,920),(403,639,65,822,923),
            (437,639,69,818,925),(470,639,72,814,928),(500,639,75,810,929),
            (530,639,79,805,931),(554,638,82,802,933),(563,638,79,805,929)]
    jacket = loft(ref,coat,boxiness=.88)

    def coat_half(side):
        def sample(u,v):
            opening = (1-smooth(0,.24,v))*.066
            behind = (1-smooth(0,.24,v))*.008
            start = opening if side == 'R' else .5 + behind
            return jacket(start+u*(.5-opening-behind),v)
        return sample

    sleeves = [(223,589,7,837,887),(231,585,16,826,889),(249,579,18,837,894),
               (277,573,17,837,895),(309,564,16,834,887),(344,558,16,829,883),
               (371,550,16,825,880),(388,549,15,825,879),(397,550,13,826,875)]
    hands = [(387,548,5,850,872),(395,549,11,848,875),(405,550,12,844,875),
             (417,544,10,843,873),(431,542,7,843,868),(441,543,3,850,860)]
    trousers = [(358,603,13,827,887),(401,602,29,826,897),(438,602,31,826,898),
                (475,601,27,826,897),(511,600,25,824,895),(550,600,24,823,895),
                (586,598,24,822,894),(615,597,22,821,895),(628,596,21,822,896),
                (635,595,19,827,889)]
    shoes = [(622,596,12,830,875),(635,591,20,827,915),(647,589,24,823,940),
             (658,589,26,822,943),(667,589,25,831,934),(673,590,18,849,916)]
    for side, sign in (('L',-1),('R',1)):
        def side_of(profile):
            return profile if sign == -1 else mirrored(profile,c)
        parts.extend([
            Part('Overcoat '+side,coat_half(side),'coat',
                 ((271,'Chest'),(426,'Pelvis'),(554,'Coat'+side)),(250,372),40,37,cap=False),
            Part('Sleeve '+side,loft(ref,side_of(sleeves),boxiness=.84),'coat',
                 ((260,'Arm'+side),(322,'Elbow'+side),(400,'Hand'+side)),(155,170),27,22),
            Part('Hand '+side,loft(ref,side_of(hands),boxiness=.91),'hand',
                 ((0,'Hand'+side),),(100,81),16,21),
            Part('Trousers '+side,loft(ref,side_of(trousers),boxiness=.87),'trouser',
                 ((450,'Leg'+side),(532,'Knee'+side),(632,'Foot'+side)),(150,155),27,23),
            Part('Sneaker '+side,loft(ref,side_of(shoes)),'shoe',
                 ((0,'Foot'+side),),(158,97),18,25),
        ])
        joints.extend([
            ('Arm'+side,'Chest',c+sign*54,858,232),
            ('Elbow'+side,'Arm'+side,c+sign*75,852,311),
            ('Hand'+side,'Elbow'+side,c+sign*88,858,391),
            ('Leg'+side,'Pelvis',c+sign*33,862,376),
            ('Knee'+side,'Leg'+side,c+sign*39,859,513),
            ('Foot'+side,'Knee'+side,c+sign*42,853,632),
            ('Coat'+side,'Pelvis',c+sign*31,858,385),
        ])
    parts.extend([
        Part('Scarf upper fold',wrap(ref,643,865,206,32,40,9,-8),'scarf',
             ((0,'Chest'),),(180,112),11,35,cap=False,flip=True),
        Part('Scarf crossed fold',wrap(ref,642,869,218,31,44,10,9),'scarf',
             ((0,'Chest'),),(164,106),11,35,cap=False,flip=True),
        Part('Scarf hanging end',loft(ref,[
            (215,641,6,896,922),(236,644,12,904,922),(261,640,15,908,930),
            (280,636,15,911,934),(303,633,15,910,934),(318,631,10,911,929),
        ],boxiness=.68),'scarf',((225,'Chest'),(287,'Scarf')),(160,160),23,22),
        Part('Scarf shorter end',loft(ref,[
            (218,652,5,895,912),(239,657,12,903,924),(265,661,12,906,932),
            (291,658,13,911,932),(315,654,11,912,931),
        ],boxiness=.68),'scarf',((224,'Chest'),(271,'Scarf')),(148,144),21,22),
    ])
    return parts, joints


def write_actions(rig, is_teacher):
    sys.dont_write_bytecode = True
    sys.path.insert(0,str(Path(__file__).resolve().parent))
    from runner_animation import animation_clips

    animation = rig.animation_data_create()
    scene = bpy.context.scene
    scene.render.fps = 60
    cursor = 1
    for name, duration, pose in animation_clips(is_teacher):
        action = bpy.data.actions.new(name)
        action.use_fake_user = True
        animation.action = action
        frames = round(duration*scene.render.fps)
        for f in range(frames+1):
            for (joint, channel), values in pose(f/frames).items():
                bone = rig.pose.bones[joint]
                if channel == 'rotation':
                    x,y,z = (math.radians(a) for a in values)
                    rotation = (Quaternion((1,0,0),x) @ Quaternion((0,1,0),y)
                                @ Quaternion((0,0,1),z))
                    bone.rotation_mode = 'QUATERNION'
                    bone.rotation_quaternion = Y_UP_TO_Z_UP @ rotation @ Y_UP_TO_Z_UP.inverted()
                    bone.keyframe_insert(data_path='rotation_quaternion',frame=f+1,group=joint)
                else:
                    bone.location = Y_UP_TO_Z_UP @ Vector(values)
                    bone.keyframe_insert(data_path='location',frame=f+1,group=joint)
        slot = animation.action_slot
        animation.action = None
        track = animation.nla_tracks.new()
        track.name = name
        strip = track.strips.new(name, cursor, action)
        if slot:
            strip.action_slot = slot
        strip.extrapolation = 'NOTHING'
        cursor += frames+8
    scene.frame_end = cursor-7
    scene.frame_set(1)


def reference_views(ref, output):
    scene = bpy.context.scene
    group = bpy.data.collections.new('Three-view references')
    scene.collection.children.link(group)
    group.hide_render = True
    scene.render.resolution_x = scene.render.resolution_y = 768
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'Standard'
    scene.world.color = (.76,.76,.76)
    target = Vector((0,0,ref.height*.5))
    if ref.dragon:
        crops = [(378,870),(0,366),(882,1256)]
    else:
        crops = [(529,748),(771,953),(1006,1226)]
    for i, name in enumerate(('Front','Side','Back')):
        loc = Vector(((0,-6,target.z),(-6,0,target.z),(0,6,target.z))[i])
        direction = (target-loc).to_track_quat('-Z','Y')
        camera = bpy.data.cameras.new(name + ' comparison')
        cam = bpy.data.objects.new(camera.name,camera)
        scene.collection.objects.link(cam)
        cam.location, cam.rotation_euler = loc, direction.to_euler()
        camera.type = 'ORTHO'
        camera.ortho_scale = ref.height * 1.10
        if i == 0:
            scene.camera = cam
        start,end = crops[i]
        path = output / (name + '-guide.png')
        write_png(path,np.uint8(np.rint(ref.pixels[:,start:end]*255)))
        image = bpy.data.images.load(str(path),check_existing=False)
        image.name = name + ' source photograph'
        image.pack()
        path.unlink()
        guide = bpy.data.objects.new(name + ' reference',None)
        group.objects.link(guide)
        guide.empty_display_type = 'IMAGE'
        guide.data = image
        guide.empty_display_size = len(ref.pixels) * ref.unit
        center = (ref.front, ref.side, ref.rear)[i]
        offset = (start+end)/2-center
        guide.location = (target + direction @ Vector((offset*ref.unit,
                            (ref.floor-len(ref.pixels)/2)*ref.unit-target.z,-1.7)))
        guide.rotation_euler = direction.to_euler()
        guide.color = (1,1,1,.67)
    group.hide_viewport = True
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                space = area.spaces.active
                space.region_3d.view_rotation = scene.camera.rotation_euler.to_quaternion()
                space.region_3d.view_location = target
                space.region_3d.view_distance = ref.height*1.5
                space.region_3d.view_perspective = 'ORTHO'
                space.shading.type = 'MATERIAL'


def export_character(rig, meshes, key):
    # The game uses one joined skinned mesh per actor.
    bpy.ops.object.select_all(action='DESELECT')
    for mesh in meshes:
        mesh.select_set(True)
    body = meshes[0]
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    body.name = ('Doubao' if key == 'doubao-teacher' else 'Naiwa') + ' mesh'
    rig.select_set(True)
    result = bpy.ops.export_scene.gltf(
        filepath=str(ROOT/'assets'/(key+'.glb')),export_format='GLB',use_selection=True,
        export_image_format='JPEG',export_jpeg_quality=92,export_animations=True,
        export_animation_mode='NLA_TRACKS',export_anim_slide_to_zero=True,
        export_optimize_animation_size=True,export_frame_range=False,export_cameras=False,
        export_lights=False,
    )
    if 'FINISHED' not in result:
        raise RuntimeError(f'Could not export {key}: {result}')


def reanimate(source_dir, out_dir, key):
    bpy.ops.wm.open_mainfile(filepath=str(source_dir/(key+'.blend')))
    rig = next(obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE')
    old_actions = {strip.action for track in rig.animation_data.nla_tracks for strip in track.strips}
    rig.animation_data_clear()
    for action in old_actions:
        bpy.data.actions.remove(action)
    write_actions(rig, key == 'doubao-teacher')
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(out_dir/(key+'.blend')),compress=True)
    export_character(rig, [obj for obj in rig.children if obj.type == 'MESH'], key)


def build(filename, out_dir, key):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    is_teacher = key == 'doubao-teacher'
    if is_teacher:
        ref = Reference(filename,front=638,side=861,rear=1117,floor=673,top=34,height=3.16,dragon=False)
        parts, joints = teacher(ref)
        name = 'Doubao'
    else:
        ref = Reference(filename,front=624,side=193,rear=1102,floor=699,top=89,height=2.98,dragon=True)
        parts, joints = dragon(ref)
        name = 'Naiwa'
    print('BUILD',name,flush=True)
    texture_file = out_dir / (key + '-texture.png')
    tiles = build_atlas(ref,parts,texture_file)
    texture = bpy.data.images.load(str(texture_file),check_existing=False)
    texture.name = name + ' projected color atlas'
    texture.pack()
    texture_file.unlink()
    material = bpy.data.materials.new(name + ' baked color')
    material.use_backface_culling = False
    nodes = material.node_tree.nodes
    nodes.clear()
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = texture
    tex.location = (-480,80)
    output = nodes.new('ShaderNodeOutputMaterial')
    # Blender's glTF exporter recognizes the direct color connection as unlit.
    material.node_tree.links.new(tex.outputs['Color'],output.inputs['Surface'])

    rig = create_rig(ref,name,joints)
    meshes = [mesh_part(ref,part,tiles[part.name],material,rig) for part in parts]
    write_actions(rig,is_teacher)
    # Keep the separate sculpted parts in the editable master.
    bpy.context.scene.world = bpy.data.worlds.new('Neutral studio')
    reference_views(ref,out_dir)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(out_dir/(key+'.blend')),compress=True)

    export_character(rig, meshes, key)


if __name__ == '__main__':
    first, second, directory = sys.argv[sys.argv.index('--')+1:]
    out_dir = Path(directory).resolve()
    out_dir.mkdir(parents=True,exist_ok=True)
    if first == '--reanimate':
        source_dir = Path(second).resolve()
        if source_dir == out_dir:
            raise ValueError('Use a separate output directory for revised Blender sources.')
        for key in ('naiwa-runner', 'doubao-teacher'):
            reanimate(source_dir, out_dir, key)
    else:
        build(first,out_dir,'naiwa-runner')
        build(second,out_dir,'doubao-teacher')
