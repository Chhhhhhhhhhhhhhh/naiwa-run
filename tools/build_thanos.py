"""Build the stylized Thanos obstacle, editable source, and an orthographic turnaround."""

import argparse
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_scene_mesh import MeshDraft, export_glb, painted_material, save_source


SKIN = '9464b6'
SKIN_LIGHT = 'a877c8'
SKIN_DARK = '644287'
NAVY = '26334e'
BLUE = '374568'
EDGE = '66482e'
GOLD = 'c99345'
LIGHT = 'f1cc7c'
CASING = 'a6703a'


def head():
    part = MeshDraft()
    outline = [
        (1.482, 0.150, 0.168, 0.012), (1.511, 0.225, 0.227, 0.057),
        (1.563, 0.292, 0.265, 0.050), (1.647, 0.324, 0.272, 0.030),
        (1.732, 0.359, 0.286, 0.006), (1.818, 0.383, 0.296, -0.015),
        (1.927, 0.392, 0.302, -0.025), (2.041, 0.359, 0.279, -0.035),
        (2.137, 0.296, 0.235, -0.043), (2.202, 0.207, 0.168, -0.047),
        (2.231, 0.106, 0.089, -0.047), (2.242, 0.018, 0.018, -0.047),
    ]
    exponent = 0.78

    heights = [p[0] for p in outline]
    spans = [hi - lo for lo, hi in zip(heights, heights[1:])]
    tangents = []
    for values in zip(*(p[1:] for p in outline)):
        rates = [(b - a) / span for a, b, span in zip(values, values[1:], spans)]
        slopes = [rates[0]]
        for before, after in zip(rates, rates[1:]):
            slopes.append(2 * before * after / (before + after) if before * after > 0 else 0)
        slopes.append(rates[-1])
        tangents.append(slopes)

    def section(z):
        for i, (low, high) in enumerate(zip(outline, outline[1:])):
            if z <= high[0]:
                span = spans[i]
                t = (z - low[0]) / span
                a = 2 * t ** 3 - 3 * t ** 2 + 1
                b = t ** 3 - 2 * t ** 2 + t
                c = -2 * t ** 3 + 3 * t ** 2
                d = t ** 3 - t ** 2
                return tuple(a * p + b * span * m[i] + c * q + d * span * m[i + 1]
                             for p, q, m in zip(low[1:], high[1:], tangents))
        return outline[-1][1:]

    def tissue(x, z):
        tip = 0.081 * math.exp(-((x / 0.093) ** 2 + ((z - 1.756) / 0.061) ** 2))
        bridge = 0.048 * math.exp(-((x / 0.052) ** 2 + ((z - 1.804) / 0.104) ** 2))
        cheek = 0.027 * math.exp(-(((abs(x) - 0.211) / 0.14) ** 2 + ((z - 1.736) / 0.065) ** 2))
        socket = 0.031 * math.exp(-(((abs(x) - 0.154) / 0.102) ** 2 + ((z - 1.842) / 0.039) ** 2))
        brow = 0.036 * math.exp(-(((abs(x) - 0.143) / 0.14) ** 2 + ((z - 1.894) / 0.045) ** 2))
        return tip + bridge + cheek + brow - socket

    def face_depth(x, z):
        width, depth, center = section(z)
        wave = math.sqrt(max(0, 1 - (abs(x) / width) ** (2 / exponent)))
        return center + depth * wave ** exponent + tissue(x, z) * wave

    sides = 48
    rings = []
    for row_index in range(49):
        z = heights[0] + row_index / 48 * (heights[-1] - heights[0])
        width, depth, center = section(z)
        row = []
        for i in range(sides):
            angle = math.tau * i / sides
            u, v = math.cos(angle), math.sin(angle)
            x = width * math.copysign(abs(u) ** exponent, u)
            y = center + depth * math.copysign(abs(v) ** exponent, v)
            if v > 0:
                y += tissue(x, z) * v
            row.append((x, y, z))
        rings.append(row)
    part.rings(rings, SKIN, smooth=True, shade=lambda r, i: 0.82 + 0.16 * r / (len(rings) - 1))

    mouth = [(-0.137, 1.651), (-0.072, 1.669), (0, 1.673), (0.072, 1.668), (0.137, 1.657)]
    part.tube([(x, face_depth(x, z) + 0.003, z) for x, z in mouth],
              [0.004, 0.009, 0.010, 0.009, 0.004], '462b63', 9)
    for s in (-1, 1):
        part.ellipsoid((s * 0.362, -0.024, 1.777), (0.07, 0.075, 0.099), SKIN)
        part.ellipsoid((s * 0.399, 0.007, 1.777), (0.023, 0.044, 0.061), '795199', 12, 8)
        eye_y = face_depth(s * 0.156, 1.84)
        part.ellipsoid((s * 0.157, eye_y + 0.002, 1.84), (0.099, 0.031, 0.036), SKIN_DARK,
                       18, 8, -s * 0.2)
        part.ellipsoid((s * 0.153, eye_y + 0.025, 1.837), (0.076, 0.016, 0.025), 'eee2df',
                       16, 8, -s * 0.205)
        part.ellipsoid((s * 0.145, eye_y + 0.041, 1.837), (0.023, 0.010, 0.023), '776486', 12, 6)
        part.ellipsoid((s * 0.145, eye_y + 0.047, 1.837), (0.012, 0.007, 0.016), '261d38', 12, 6)
        part.ellipsoid((s * 0.145 - 0.007, eye_y + 0.055, 1.846), (0.006, 0.004, 0.006), 'fff6ec', 8, 5)
        brow = [(s * 0.064, 1.863), (s * 0.129, 1.887), (s * 0.210, 1.911), (s * 0.264, 1.886)]
        part.tube([(x, face_depth(x, z) + 0.003, z) for x, z in brow],
                  [0.009, 0.017, 0.015, 0.006], '724d90', 9)
        x, z = s * 0.035, 1.727
        part.ellipsoid((x, face_depth(x, z), z), (0.017, 0.008, 0.009), '744b94', 10, 6)

    for i in range(-3, 4):
        x = i * 0.054
        crease = [(x, 1.634 - abs(i) * 0.005), (x * 0.97, 1.604),
                  (x * 0.89, 1.564), (x * 0.77, 1.528 + 0.008 * abs(i))]
        part.tube([(px, face_depth(px, z) + 0.001, z) for px, z in crease],
                  [0.003, 0.006, 0.005, 0.0025], '714c91', 7)
    return part


def chest_and_collar():
    part = MeshDraft()
    part.profile(0, [(0.62, 0.24, 0.160, 0), (0.80, 0.30, 0.200, 0),
                     (1.14, 0.385, 0.222, 0), (1.335, 0.432, 0.242, -0.012),
                     (1.43, 0.37, 0.208, -0.014), (1.47, 0.234, 0.149, -0.023)], NAVY, 24, 0.68)
    part.profile(0, [(1.39, 0.16, 0.128, 0), (1.52, 0.156, 0.123, 0), (1.58, 0.128, 0.110, 0)], SKIN)
    part.plate([(-0.39, 1.35), (-0.28, 1.45), (0, 1.33), (0.28, 1.45),
                (0.39, 1.35), (0.31, 1.08), (0.20, 0.86), (-0.20, 0.86), (-0.31, 1.08)],
               0.194, 0.125, EDGE, 0.032)
    part.plate([(-0.35, 1.35), (-0.265, 1.407), (0, 1.29), (0.265, 1.407),
                (0.35, 1.35), (0.27, 1.065), (0.175, 0.89), (-0.175, 0.89), (-0.27, 1.065)],
               0.249, 0.063, GOLD, 0.021)
    part.plate([(-0.302, 1.299), (0, 1.212), (0.302, 1.299), (0.24, 1.087),
                (0.151, 0.964), (-0.151, 0.964), (-0.24, 1.087)], 0.281, 0.015, BLUE, 0.006)
    part.plate([(-0.255, 1.251), (0, 1.165), (0.255, 1.251), (0, 1.10)], 0.292, 0.023, LIGHT, 0.006)
    part.plate([(-0.15, 1.101), (0, 1.061), (0.15, 1.101), (0, 0.990)], 0.290, 0.017, CASING, 0.004)
    part.plate([(-0.29, 1.38), (0, 1.44), (0.29, 1.38), (0.275, 1.10),
                (0.14, 0.895), (-0.14, 0.895), (-0.275, 1.10)], -0.207, 0.085, EDGE, 0.018)
    part.plate([(-0.259, 1.36), (0, 1.41), (0.259, 1.36), (0.21, 1.14),
                (0.115, 0.94), (-0.115, 0.94), (-0.21, 1.14)], -0.248, 0.054, GOLD, 0.013)
    for y in (-0.278, 0.303):
        for x in (-0.254, 0.254):
            part.ellipsoid((x, y, 1.346), (0.020, 0.010, 0.02), LIGHT, 10, 6)
    part.profile(0, [(0.693, 0.242, 0.172, 0), (0.725, 0.287, 0.209, 0),
                     (0.798, 0.301, 0.221, 0), (0.83, 0.276, 0.206, 0)], EDGE, 20, 0.7)
    part.plate([(-0.258, 0.816), (0.258, 0.816), (0.231, 0.739), (-0.231, 0.739)],
               0.205, 0.075, GOLD, 0.017)
    part.plate([(-0.075, 0.8), (0, 0.832), (0.075, 0.8), (0.067, 0.745),
                (0, 0.725), (-0.067, 0.745)], 0.254, 0.056, LIGHT, 0.017)
    return part


def legs():
    part = MeshDraft()
    for s in (-1, 1):
        x = s * 0.186
        part.profile(x, [(0.28, 0.112, 0.118, 0), (0.40, 0.143, 0.150, 0),
                         (0.59, 0.159, 0.165, -0.015), (0.77, 0.158, 0.157, 0)],
                     NAVY, 18, 0.78)
        part.profile(x, [(0.006, 0.145, 0.239, 0.056), (0.04, 0.164, 0.265, 0.067),
                         (0.102, 0.169, 0.270, 0.068), (0.19, 0.147, 0.211, 0.03),
                         (0.33, 0.128, 0.15, 0.003), (0.468, 0.135, 0.149, 0.003)],
                     NAVY, 18, 0.62)
        part.plate([(x - 0.127, 0.451), (x, 0.517), (x + 0.127, 0.451),
                    (x + 0.110, 0.267), (x + 0.133, 0.150), (x - 0.133, 0.150),
                    (x - 0.110, 0.267)], 0.144, 0.109, CASING, 0.027)
        part.plate([(x - 0.092, 0.436), (x, 0.487), (x + 0.092, 0.436),
                    (x + 0.062, 0.259), (x, 0.226), (x - 0.062, 0.259)],
                   0.204, 0.028, LIGHT, 0.01)
        part.ellipsoid((x, 0.242, 0.143), (0.148, 0.094, 0.072), GOLD, 18, 8)
        part.box((x, 0.292, 0.047), (0.22, 0.098, 0.053), EDGE, 0.014)
    return part


def pauldrons():
    part = MeshDraft()
    for s in (-1, 1):
        part.ellipsoid((s * 0.413, -0.019, 1.362), (0.254, 0.247, 0.145), EDGE,
                       18, 9, s * 0.22)
        part.ellipsoid((s * 0.413, -0.024, 1.399), (0.242, 0.235, 0.126), GOLD,
                       18, 9, s * 0.22)
        part.plate([(s * 0.25, 1.46), (s * 0.42, 1.49), (s * 0.635, 1.40),
                    (s * 0.580, 1.32), (s * 0.399, 1.385)], 0.200, 0.070, LIGHT, 0.02)
        part.tube([(s * 0.292, 0.146, 1.479), (s * 0.409, 0.118, 1.515),
                   (s * 0.535, 0.096, 1.477), (s * 0.617, 0.065, 1.416)],
                  [0.012, 0.018, 0.017, 0.012], LIGHT)
    return part


def arm():
    part = MeshDraft()
    part.tube([(-0.44, -0.02, 1.29), (-0.548, 0.017, 1.185), (-0.587, 0.043, 1.04),
               (-0.593, 0.111, 0.91), (-0.612, 0.189, 0.80)],
              [0.154, 0.155, 0.124, 0.103, 0.091], SKIN, 18)
    part.ellipsoid((-0.555, 0.087, 1.166), (0.124, 0.132, 0.188), SKIN_LIGHT,
                   16, 10, 0.24)
    part.profile(-0.605, [(0.787, 0.102, 0.093, 0.175), (0.82, 0.124, 0.12, 0.144),
                          (0.94, 0.131, 0.128, 0.097), (0.974, 0.116, 0.123, 0.085)],
                 CASING, 16, 0.8)
    part.plate([(-0.699, 0.95), (-0.513, 0.956), (-0.551, 0.829), (-0.643, 0.82)],
               0.23, 0.043, LIGHT, 0.013)
    part.ellipsoid((-0.621, 0.206, 0.72), (0.116, 0.107, 0.13), SKIN, 20, 11, 0.16)
    part.ellipsoid((-0.557, 0.259, 0.742), (0.052, 0.077, 0.082), SKIN_LIGHT, 14, 9)
    for i in range(3):
        part.ellipsoid((-0.692 + 0.048 * i, 0.268, 0.683), (0.034, 0.034, 0.045), SKIN, 12, 7)
    return part


def gauntlet():
    part = MeshDraft()
    part.tube([(0.436, -0.04, 1.28), (0.573, -0.045, 1.17), (0.648, 0.034, 1.05),
               (0.667, 0.170, 1.09)], [0.155, 0.157, 0.138, 0.115], SKIN, 18)
    part.tube([(0.65, 0.03, 1.062), (0.661, 0.093, 1.090), (0.68, 0.278, 1.195),
               (0.681, 0.360, 1.227)], [0.135, 0.161, 0.15, 0.129], CASING, 20)
    part.tube([(0.658, 0.089, 1.095), (0.661, 0.112, 1.108), (0.665, 0.148, 1.124)],
              [0.162, 0.169, 0.158], LIGHT, 20)
    part.ellipsoid((0.681, 0.378, 1.294), (0.169, 0.154, 0.187), GOLD, 22, 13, -0.08)
    part.ellipsoid((0.560, 0.482, 1.263), (0.074, 0.078, 0.099), CASING, 16, 9, -0.4)
    for i, height in enumerate([1.431, 1.468, 1.465, 1.427]):
        x = 0.557 + i * 0.074
        part.ellipsoid((x, 0.426, height - 0.036), (0.053, 0.101, 0.09), GOLD, 16, 10, 0.08)
        part.ellipsoid((x, 0.492, height - 0.067), (0.045, 0.067, 0.045), LIGHT, 14, 8)
    stone_colors = ['6cefff', 'fd5c72', '86ed95', 'ba7bff', 'ffdb58', 'ff9d49']
    stones = [(0.553, 0.531, 1.366, 0.034), (0.626, 0.55, 1.401, 0.035),
              (0.699, 0.553, 1.397, 0.036), (0.773, 0.533, 1.356, 0.034),
              (0.651, 0.536, 1.276, 0.063), (0.536, 0.538, 1.245, 0.031)]
    for (x, y, z, radius), paint in zip(stones, stone_colors):
        part.ellipsoid((x, y - 0.006, z), (radius * 1.17, radius * 0.52, radius * 1.16), EDGE, 12, 7)
        part.ellipsoid((x, y + 0.007, z), (radius, radius * 0.47, radius), paint, 10, 6)
        part.ellipsoid((x - radius * .22, y + radius * .49, z + radius * .32),
                       (radius * 0.30, 0.007, radius * 0.15), 'fff9eb', 8, 5)
    part.tube([(0.784, 0.494, 1.286), (0.767, 0.456, 1.182), (0.701, 0.343, 1.156)],
              [0.010, 0.015, 0.009], LIGHT)
    return part


def studio_camera(location, aim, scale):
    scene = bpy.context.scene
    data = bpy.data.cameras.new('Orthographic camera')
    camera = bpy.data.objects.new('Orthographic camera', data)
    scene.collection.objects.link(camera)
    camera.location = location
    camera.rotation_euler = (Vector(aim) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    data.type = 'ORTHO'
    data.ortho_scale = scale
    scene.camera = camera
    shading = scene.display.shading
    scene.render.engine = 'BLENDER_WORKBENCH'
    shading.color_type = 'VERTEX'
    shading.light = 'STUDIO'
    shading.studiolight_rotate_z = 0.53
    shading.show_shadows = True
    shading.show_cavity = True
    shading.cavity_type = 'BOTH'
    shading.cavity_ridge_factor = 1.15
    shading.cavity_valley_factor = 1.05
    shading.curvature_ridge_factor = 0.8
    shading.curvature_valley_factor = 0.65
    shading.background_type = 'WORLD'
    scene.world = bpy.data.worlds.new('Studio background')
    scene.world.color = (0.72, 0.76, 0.82)
    scene.view_settings.view_transform = 'Standard'
    return camera


def sheet_text(name, location, size):
    data = bpy.data.curves.new(name, 'FONT')
    data.body = name
    data.align_x = 'CENTER'
    data.size = size
    data.space_character = 1.18
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    obj.rotation_euler.x = math.pi / 2
    obj.color = (0.09, 0.11, 0.19, 1)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    attribute = obj.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
    attribute.data.foreach_set('color', obj.color[:] * len(obj.data.vertices))
    obj.data.color_attributes.active_color = attribute


def render_sheet(parts, camera, path, material):
    scene = bpy.context.scene
    camera.location = (0, -9, 1.34)
    camera.rotation_euler = (math.pi / 2, 0, 0)
    camera.data.ortho_scale = 7.55
    for i, (angle, name) in enumerate([(0, 'FRONT'), (-math.pi / 2, 'LEFT'), (math.pi, 'BACK')]):
        x = (i - 1) * 2.37
        for part in parts:
            copy = part.copy()
            bpy.context.collection.objects.link(copy)
            copy.location.x = x
            copy.rotation_euler.z = angle
        sheet_text(name, (x, -0.36, -0.19), 0.114)
        base = MeshDraft()
        base.profile(x, [(-0.046, 0.89, 0.7, 0), (-0.027, 0.92, 0.72, 0),
                         (0, 0.89, 0.69, 0)], 'aab3c9', 40)
        base.object(f'{name} base', material)
    for part in parts:
        part.hide_render = True
    sheet_text('THANOS', (0, -0.5, 2.72), 0.235)
    sheet_text('NAIWA RUN   /   OBSTACLE', (0, -0.5, 2.47), 0.11)
    scene.render.resolution_x = 1500
    scene.render.resolution_y = 710
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source_dir', type=Path)
    parser.add_argument('--turnaround', type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    destination = Path(__file__).resolve().parent.parent / 'assets'
    args.source_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    material = painted_material()
    sections = {'Head': head(), 'Chest and collar': chest_and_collar(), 'Leg armor': legs(),
                'Shoulder plates': pauldrons(), 'Right arm': arm(), 'Infinity Gauntlet': gauntlet()}
    combined = MeshDraft()
    for draft in sections.values():
        combined.extend(draft)
    asset = combined.object('Thanos', material)
    export_glb([asset], destination / 'thanos-obstacle.glb')
    bpy.data.objects.remove(asset, do_unlink=True)
    parts = [draft.object(name, material) for name, draft in sections.items()]
    camera = studio_camera((3.1, -7, 2.55), (0, 0, 1.12), 3.3)
    reference = bpy.data.texts.new('Visual reference')
    reference.write('Original chibi modeling for Naiwa Run. Film design reference only.\n'
                    'https://jsmarantz.artstation.com/projects/OyAnlw?album_id=6196360\n'
                    'https://www.sideshow.com/collectibles/marvel-thanos-hot-toys-904600\n')
    save_source(args.source_dir / 'thanos-obstacle.blend', camera)
    if args.turnaround:
        render_sheet(parts, camera, args.turnaround, material)


if __name__ == '__main__':
    main()
