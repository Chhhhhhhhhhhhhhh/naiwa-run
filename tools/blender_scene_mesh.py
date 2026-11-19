"""Geometry and GLB export helpers for the street and obstacle assets."""

import math
from pathlib import Path

import bpy
from mathutils import Vector


def color(hex_value, shade=1):
    channels = (int(hex_value[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return tuple((c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4) * shade
                 for c in channels) + (1,)


class MeshDraft:
    """Accumulate solid pieces in game coordinates, with height on Z and +Y facing the street."""

    def __init__(self):
        self.vertices = []
        self.colors = []
        self.faces = []
        self.smooth = []

    def vertex(self, point, paint):
        index = len(self.vertices)
        self.vertices.append(point)
        self.colors.append(paint)
        return index

    def face(self, indices, smooth=False):
        self.faces.append(tuple(indices))
        self.smooth.append(smooth)

    def extend(self, other):
        offset = len(self.vertices)
        self.vertices.extend(other.vertices)
        self.colors.extend(other.colors)
        self.faces.extend(tuple(index + offset for index in face) for face in other.faces)
        self.smooth.extend(other.smooth)

    def rings(self, slices, paint, smooth=False, shade=None):
        rings = []
        for height, points in enumerate(slices):
            rings.append([self.vertex(point, color(paint, shade(height, i) if shade else 1))
                          for i, point in enumerate(points)])
        count = len(rings[0])
        self.face(reversed(rings[0]))
        for lower, upper in zip(rings, rings[1:]):
            for i in range(count):
                j = (i + 1) % count
                self.face((lower[i], lower[j], upper[j], upper[i]), smooth)
        self.face(rings[-1])

    def box(self, center, size, paint, bevel=0):
        x, y, z = center
        w, d, h = (length / 2 for length in size)
        b = min(bevel, w * 0.45, d * 0.45, h * 0.45)
        if b < 0.019:
            points = [(-w, -d), (w, -d), (w, d), (-w, d)]
            slices = [[(x + u, y + v, z + t) for u, v in points] for t in (-h, h)]
        else:
            corner = b * 1.15
            points = [(-w + corner, -d), (w - corner, -d), (w, -d + corner),
                      (w, d - corner), (w - corner, d), (-w + corner, d),
                      (-w, d - corner), (-w, -d + corner)]
            slices = []
            for t, inset in [(-h, b * 0.7), (-h + b, 0), (h - b, 0), (h, b * 0.7)]:
                slices.append([(x + u * (1 - inset / w), y + v * (1 - inset / d), z + t)
                               for u, v in points])
        self.rings(slices, paint, shade=lambda row, _: 0.88 + 0.12 * row / (len(slices) - 1))

    def profile(self, x, slices, paint, sides=16, exponent=1, shade=None):
        # Each slice gives z, horizontal radius, depth radius, and horizontal center depth.
        rings = []
        for z, rx, ry, y in slices:
            points = []
            for i in range(sides):
                theta = i * math.tau / sides
                u, v = math.cos(theta), math.sin(theta)
                points.append((x + math.copysign(abs(u) ** exponent * rx, u),
                               y + math.copysign(abs(v) ** exponent * ry, v), z))
            rings.append(points)
        self.rings(rings, paint, smooth=True, shade=shade)

    def ellipsoid(self, center, radii, paint, sides=12, bands=8, roll=0, variation=0):
        x, y, z = center
        rx, ry, rz = radii
        c, s = math.cos(roll), math.sin(roll)
        slices = []
        for r in range(bands + 1):
            latitude = math.pi * (0.006 + 0.988 * r / bands - 0.5)
            height = rz * math.sin(latitude)
            row = []
            for i in range(sides):
                theta = i * math.tau / sides
                ripple = 1 + variation * math.sin(theta * 3 + r * 1.4)
                dx = math.cos(theta) * math.cos(latitude) * rx * ripple
                dy = math.sin(theta) * math.cos(latitude) * ry * ripple
                row.append((x + dx * c + height * s, y + dy, z + height * c - dx * s))
            slices.append(row)
        self.rings(slices, paint, smooth=True, shade=lambda r, i: 0.78 + 0.22 * r / bands +
                   variation * 0.4 * math.sin(1.7 * i + r))

    def tube(self, path, radii, paint, sides=8):
        path = [Vector(p) for p in path]
        slices = []
        for i, (point, radius) in enumerate(zip(path, radii)):
            axis = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
            reference = Vector((0, 1, 0)) if abs(axis.y) < 0.9 else Vector((0, 0, 1))
            tangent = reference.cross(axis).normalized()
            bitangent = axis.cross(tangent)
            angles = [j * math.tau / sides for j in range(sides)]
            slices.append([tuple(point + radius * (math.cos(a) * tangent + math.sin(a) * bitangent))
                           for a in angles])
        self.rings(slices, paint, smooth=True)

    def plate(self, outline, y, depth, paint, bevel=0):
        """Extrude an XZ silhouette, with gently recessed ends for a small bevel."""
        area = sum(x * next_z - next_x * z for (x, z), (next_x, next_z)
                   in zip(outline, outline[1:] + outline[:1]))
        if area < 0:
            outline = list(reversed(outline))
        cx = sum(x for x, _ in outline) / len(outline)
        cz = sum(z for _, z in outline) / len(outline)
        radius = max(math.hypot(x - cx, z - cz) for x, z in outline)
        b = min(bevel, depth * 0.45, radius * 0.3)
        layers = [(-1, 0), (1, 0)] if not b else [
            (-1, b), (-1 + 2 * b / depth, 0), (1 - 2 * b / depth, 0), (1, b)]
        rings = []
        for t, inset in layers:
            scale = 1 - inset / radius
            points = [(cx + (x - cx) * scale, y + t * depth / 2, cz + (z - cz) * scale)
                      for x, z in outline]
            rings.append([self.vertex(p, color(paint, 0.94 if inset else 0.87)) for p in points])
        self.face(rings[0])
        for back, front in zip(rings, rings[1:]):
            for i in range(len(outline)):
                j = (i + 1) % len(outline)
                self.face((back[i], front[i], front[j], back[j]))
        self.face(reversed(rings[-1]))

    def object(self, name, material):
        data = bpy.data.meshes.new(name)
        data.from_pydata([(x, -y, z) for x, y, z in self.vertices], [],
                         [tuple(reversed(face)) for face in self.faces])
        data.update()
        attribute = data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
        attribute.data.foreach_set('color', [v for rgba in self.colors for v in rgba])
        data.color_attributes.active_color = attribute
        data.polygons.foreach_set('use_smooth', self.smooth)
        data.materials.append(material)
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        return obj


def painted_material():
    material = bpy.data.materials.new('Painted surfaces')
    material.use_nodes = True
    tree = material.node_tree
    colors = tree.nodes.new('ShaderNodeVertexColor')
    colors.layer_name = 'Color'
    shader = tree.nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value = 0.67
    tree.links.new(colors.outputs['Color'], shader.inputs['Base Color'])
    return material


def export_glb(objects, path):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    result = bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB',
                                       use_selection=True, export_vertex_color='ACTIVE',
                                       export_texcoords=False, export_tangents=False,
                                       export_animations=False, export_cameras=False,
                                       export_lights=False)
    if 'FINISHED' not in result:
        raise RuntimeError(f'GLB export failed for {path}')


def save_source(path, camera=None):
    bpy.context.preferences.filepaths.save_version = 0
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                space = area.spaces.active
                space.shading.color_type = 'VERTEX'
                if camera:
                    space.region_3d.view_rotation = camera.rotation_euler.to_quaternion()
                    space.region_3d.view_location = (0, 0, 1.15)
                    space.region_3d.view_distance = 4.9
                    space.region_3d.view_perspective = 'ORTHO'
    bpy.ops.wm.save_as_mainfile(filepath=str(path))
