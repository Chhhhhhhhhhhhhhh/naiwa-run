"""Author the campus, shopping street, and park meshes in Blender."""

import argparse
import math
from pathlib import Path
import random
import sys

import bpy
from mathutils import Vector

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_scene_mesh import MeshDraft, color, export_glb, painted_material, save_source


STONE = 'e6d2b5'
MORTAR = 'cabba7'
BASE = '9d9f98'
IRON = '314951'
GLASS = '537b88'
DARK_GLASS = '42636e'
WOOD = 'ad7650'
TILE = '657a74'
WHITE = 'f5e9d3'
GOLDEN = 'd1a55d'


def block(draft, width, depth, height, wall, base=BASE):
    draft.box((0, 0, 0.13), (width + 0.28, depth + 0.26, 0.26), base, 0.045)
    draft.box((0, 0, height / 2 + 0.12), (width, depth, height - 0.17), wall, 0.08)


def cornice(draft, width, depth, z, paint=STONE):
    draft.box((0, 0, z), (width + 0.36, depth + 0.3, 0.18), paint, 0.036)
    draft.box((0, 0, z - 0.125), (width + 0.16, depth + 0.15, 0.075), MORTAR)

    # Small brackets cast a band of shadow under the projecting cornice.
    for i in range(round(width / .48)):
        x = -width / 2 + .25 + i * .48
        draft.box((x, depth / 2 + .078, z - .208), (.118, .175, .099), paint)


def glazing(draft, x, y, z, width, height, paint):
    left, right = x - width / 2, x + width / 2
    bottom, top = z - height / 2, z + height / 2
    corners = [(left, bottom, .61), (left, top, .99),
               (right, top, .99), (right, bottom, .61)]
    draft.face([draft.vertex((px, y, pz), color(paint, shade)) for px, pz, shade in corners])


def bay(draft, x, front, z, width, height, frame=STONE, glass=GLASS, split=True):
    draft.box((x, front + .024, z), (width + .17, .105, height + .17), frame, .019)
    draft.box((x, front + .077, z), (width, .037, height), IRON)
    glazing(draft, x, front + .098, z, width - .093, height - .107, glass)
    draft.box((x, front + .118, z + height * .24), (width - .054, .044, .049), IRON)
    draft.box((x, front + .12, z - height / 2 - .108), (width + .19, .20, .048), MORTAR)
    draft.box((x, front + .15, z - height / 2 - .062), (width + .26, .252, .077), frame, .019)
    draft.box((x, front + .108, z + height / 2 + .064), (width + .23, .184, .079), frame, .019)
    if split:
        draft.box((x - width * .07, front + .123, z), (.049, .056, height), IRON)


def side_bays(draft, width, depth, floors, trim=STONE):
    for side in (-1, 1):
        x = side * width / 2
        for level, z in enumerate(floors):
            for col, y in enumerate((-depth * 0.29, depth * 0.15)):
                draft.box((x + side * 0.036, y, z), (0.084, 0.78, 1.1), trim)
                draft.box((x + side * 0.078, y, z), (0.025, 0.64, 0.93),
                          '527b89' if (level + col) % 3 else 'cfac7a')
                draft.box((x + side * 0.101, y, z + 0.21), (0.033, 0.66, 0.036), IRON)
                draft.box((x + side * 0.085, y, z - 0.54), (0.19, 0.96, 0.077), trim)


def arch(radius, spring, bottom, x=0):
    return [(x - radius, bottom), (x + radius, bottom)] + [
        (x + radius * math.cos(angle * math.pi / 10), spring + radius * math.sin(angle * math.pi / 10))
        for angle in range(11)]


def steps(draft, x, front, width):
    draft.box((x, front + .86, .032), (width + .18, .83, .055), MORTAR)
    for edge in (-1, 1):
        draft.box((x + edge * (width / 2 + .064), front + .87, .057), (.078, .83, .097), STONE)
    for i in range(3):
        draft.box((x, front + 0.34 - i * 0.10, 0.041 + i * 0.062),
                  (width - i * 0.13, 0.61, 0.08 + i * 0.124), STONE, 0.013)


def archway(draft, x, front, spring, radius, bottom):
    draft.plate(arch(radius + 0.12, spring, bottom, x), front + 0.077, 0.19, STONE, 0.035)
    draft.plate(arch(radius, spring, bottom + 0.019, x), front + 0.18, 0.045, IRON, 0.008)
    draft.plate(arch(radius - 0.076, spring, bottom + 0.068, x), front + 0.205, 0.017, GLASS)
    for step in range(9):
        angle = math.pi * step / 8
        draft.box((x + (radius + 0.062) * math.cos(angle), front + 0.188,
                   spring + (radius + 0.062) * math.sin(angle)),
                  (0.09, 0.06, 0.083), WHITE, 0.012)
    draft.box((x, front + 0.237, (spring + bottom) / 2), (0.064, 0.056, spring - bottom), WOOD, 0.006)
    draft.box((x, front + 0.24, spring), (radius * 2, 0.045, 0.053), IRON)
    for s in (-1, 1):
        arc_end = (x + s * radius * .58, spring + radius * .67)
        draft.tube([(x,front+.245,spring), (arc_end[0],front+.245,arc_end[1])],
                   [.02,.02], MORTAR, 5)
        if bottom < 1:
            draft.box((x + s * .132, front + .265, bottom + .81), (.047,.061,.207), GOLDEN, .012)


def facade_lantern(draft, x, front, z):
    draft.box((x,front+.05,z+.11),(.152,.12,.28),IRON,.023)
    draft.box((x,front+.18,z),(.158,.211,.251),'edd6a0',.028)
    for lift in (-.14,.14):
        draft.box((x,front+.18,z+lift),(.205,.253,.068),IRON,.019)
    for side in (-1,1):
        draft.box((x+side*.079,front+.26,z),(.025,.037,.244),IRON)


def library():
    draft = MeshDraft()
    block(draft, 6.6, 4.4, 6.25, 'ba7a63')
    cornice(draft, 6.6, 4.4, 6.24)
    cornice(draft, 6.6, 4.4, 3.31)
    draft.box((0, 0.74, 6.53), (6.22, 2.78, 0.50), 'b07761', 0.055)
    draft.box((0, 2.08, 6.82), (6.43, 0.18, 0.15), STONE, 0.025)
    draft.box((0, 2.245, 2.80), (2.80, 0.34, 5.34), 'c48a70', 0.07)
    for s in (-1, 1):
        draft.box((s * 1.33, 2.46, 2.805), (0.17, 0.21, 5.38), STONE, 0.024)
        for z in (0.32, 3.28, 5.43):
            draft.box((s * 1.33, 2.53, z), (0.26, 0.30, 0.14), WHITE, 0.02)
        for i in range(5):
            draft.box((s * 3.17, 2.237, 0.65 + i * 0.43), (0.28, 0.14, 0.11), STONE, 0.013)
        for col, x in enumerate((s * 1.84, s * 2.68)):
            bay(draft, x, 2.20, 1.77, 0.59, 1.6, STONE, '698b92' if col else GLASS)
            bay(draft, x, 2.20, 4.54, 0.62, 1.53)
        for row, z in enumerate((.64, .84, 2.92, 3.68, 5.55, 5.76, 5.97)):
            for index in range(3):
                x = s * (1.64 + index * .60 + (row % 2) * .12)
                draft.box((x, 2.221, z), (.50, .046, .026), ('a66858','c78671')[(row + index) % 2])
        facade_lantern(draft, s*1.115, 2.51, 1.41)
    archway(draft, 0, 2.43, 1.55, 0.83, 0.19)
    archway(draft, 0, 2.43, 4.45, 0.60, 3.63)
    draft.box((0, 2.48, 2.94), (2.14, 0.29, 0.43), IRON, 0.048)
    steps(draft, 0, 2.46, 2.36)
    side_bays(draft, 6.6, 4.4, (1.77, 4.56))
    return draft


def academic_hall():
    draft = MeshDraft()
    block(draft, 6.2, 4.5, 8.2, 'd7c7ab')
    draft.box((0, 0, 8.34), (6.52, 4.76, 0.32), 'a6a99c', 0.042)
    draft.box((-1.46, -0.63, 8.81), (2.12, 1.81, 0.68), STONE, 0.065)
    draft.box((-1.46, -0.63, 9.17), (2.26, 1.94, 0.12), TILE, 0.03)
    draft.profile(1.68, [(8.48, 0.58, 0.58, -0.3), (8.55, 0.65, 0.65, -0.3),
                         (9.18, 0.65, 0.65, -0.3), (9.32, 0.43, 0.43, -0.3)], '6c9391', 14)
    draft.box((0, 2.28, 4.87), (1.6, 0.22, 6.7), '41686d', 0.027)
    for row, z in enumerate((2.10,3.17,4.24,5.35,6.44,7.54)):
        glazing(draft, 0, 2.397, z, 1.52, .96, ('699797','5d888e','6f9392')[row % 3])
    for x in (-0.78, -0.24, 0.24, 0.78):
        draft.box((x, 2.414, 4.86), (0.052, 0.085, 6.65), WHITE)
    for z in (1.58, 2.66, 3.72, 4.82, 5.92, 7.01, 8.08):
        draft.box((0, 2.413, z), (1.63, 0.087, 0.052), IRON)
    for side in (-1, 1):
        draft.box((side * 1.95, 2.32, 4.83), (2.46, 0.36, 6.91), 'bcb39c', 0.045)
        draft.box((side * 3.04, 2.54, 4.66), (.148, .293, 7.29), STONE, .026)
        for row, z in enumerate((2.30, 4.02, 5.75, 7.36)):
            for x in (side * 1.41, side * 2.53):
                bay(draft, x, 2.5, z, 0.80, 1.13, WHITE, ('537a80', '83a5a2', 'cbae77')[row % 3])
            draft.box((side * 1.96, 2.60, z + 0.64), (2.38, 0.36, 0.082), TILE, 0.016)
    draft.box((0, 2.59, 1.68), (2.03, 0.99, 0.16), IRON, 0.032)
    draft.box((0, 2.40, 0.85), (1.36, 0.23, 1.58), GLASS, 0.024)
    for x in (-0.64, 0, 0.64):
        draft.box((x, 2.539, 0.85), (0.067, 0.06, 1.58), IRON)
    side_bays(draft, 6.2, 4.5, (2.3, 4.02, 5.75, 7.36), WHITE)
    steps(draft, 0, 2.36, 2.24)
    return draft


def dormitory():
    draft = MeshDraft()
    block(draft, 5.9, 4.05, 7.2, 'd39c79', 'ad957f')
    cornice(draft, 5.9, 4.05, 7.14, 'dfba92')
    draft.box((0, 0, 7.27), (6.25, 4.44, 0.16), '7b5a58', 0.025)
    draft.plate([(-2.94, 7.25), (0, 8.56), (2.94, 7.25)], 0, 4.18, '8e625a', 0.05)
    draft.plate([(-2.80, 7.26), (0, 8.48), (2.80, 7.26)], 2.099, 0.05, 'ca9b79', 0.018)
    draft.box((-1.75, -0.4, 8.06), (0.6, 0.63, 0.85), 'ae7a64', 0.03)
    draft.box((-1.75, -0.4, 8.53), (0.72, 0.75, 0.13), STONE, 0.024)
    for z in (2.54, 4.12, 5.71):
        for x in (-1.94, 0, 1.94):
            bay(draft, x, 2.025, z, 1.28, 1.13, 'f0c7a0', '64888c')
            draft.box((x, 2.27, z - 0.62), (1.62, 0.72, 0.13), STONE, 0.035)
            draft.box((x, 2.59, z - 0.025), (1.57, 0.067, 0.053), IRON)
            for step in range(7):
                draft.box((x - 0.72 + step * 0.24, 2.59, z - 0.30), (0.041, 0.05, 0.59), IRON)
            for offset in (-0.76, 0.76):
                draft.box((x + offset, 2.32, z - 0.025), (0.05, 0.59, 0.053), IRON)
            if x != 0:
                draft.box((x + .31, 2.57, z - .27), (.52, .21, .18), 'a76757', .028)
                for n in (-.16, .12):
                    draft.ellipsoid((x+.31+n,2.56,z-.15),(.17,.13,.11),'728e6c',7,4)
    for x in (-2.0, 2.0):
        bay(draft, x, 2.025, 1.04, 1.07, 1.2)
    draft.box((0, 2.09, 0.92), (1.38, 0.15, 1.68), IRON, 0.033)
    draft.box((0, 2.16, 0.81), (1.12, 0.07, 1.47), '6f8e87', 0.023)
    for side in (-1, 1):
        draft.box((side * 0.55, 2.25, 1.02), (0.067, 0.15, 0.29), GOLDEN, 0.025)
    draft.box((0, 2.19, 1.87), (1.81, 0.46, 0.15), '8e625a', 0.04)
    for side in (-1, 1):
        facade_lantern(draft, side*.89, 2.035, 1.405)
    side_bays(draft, 5.9, 4.05, (1.06, 2.55, 4.12, 5.71), 'e5bc9c')
    return draft


def storefront(market=False):
    draft = MeshDraft()
    wall = 'aac1ad' if market else 'd4a07a'
    dark = '406463' if market else '935c4b'
    band = '457779' if market else 'ac6258'
    roof = '626e66' if market else '79636a'
    width, depth, height = (6.40, 4.45, 5.65) if market else (5.75, 4.25, 4.73)
    w, front = width / 2, depth / 2
    block(draft, width, depth, height, wall)
    cornice(draft, width, depth, height, WHITE)
    draft.box((0, 0, height + 0.15), (width + 0.18, depth + 0.18, 0.20), roof, 0.045)
    draft.box((0, front * 0.91, height + 0.33), (width * 0.95, 0.21, 0.33), dark, 0.027)
    draft.box((0, front + 0.04, 2.29), (width * 0.94, 0.20, 0.62), dark, 0.035)
    for x in (-w * 0.66, 0, w * 0.66):
        window_z = 3.83 if not market else 4.46
        bay(draft, x, front, window_z, 1.08, 1.29 if not market else 1.43,
            WHITE, 'cdae87' if x < 0 else GLASS)
        if not market:
            draft.box((x, front + 0.26, window_z - 0.68), (1.20, 0.30, 0.17), dark, 0.026)
            for j in range(3):
                draft.ellipsoid((x + (j - 1) * 0.32, front + 0.29, window_z - 0.53),
                                (0.20, 0.17, 0.12), '779577', 8, 5)
    draft.box((0, front + 0.116, 1.17), (width * 0.93, 0.17, 1.81), IRON, 0.026)
    for x in (-w * 0.61, w * 0.61):
        glazing(draft, x, front + .25, 1.22, width*.332, 1.62, '8ba5a0')
        draft.box((x, front + 0.248, 0.84), (width * 0.333, 0.063, 0.073), dark)
        draft.box((x, front + 0.25, 1.24), (0.055, 0.07, 1.58), WHITE)
        for j in range(4):
            slot = x + (j - 1.5) * 0.33
            tone = ('b8a6a0', 'eddc9d', 'a3c9ac', 'f0c2a2')[j]
            draft.box((slot, front + 0.249, 0.74), (0.13, 0.07, 0.24 + j * 0.015), tone, 0.019)
    draft.box((0, front + 0.22, 1.037), (1.06, 0.062, 1.9), DARK_GLASS, 0.013)
    draft.box((0, front + 0.265, 1.11), (0.065, 0.067, 1.69), dark, 0.006)
    for x in (-0.165, 0.165):
        draft.box((x, front + 0.275, 0.97), (0.067, 0.16, 0.18), GOLDEN, 0.015)
    for i in range(11):
        stripe_w = width * 0.91 / 11
        x = (i - 5) * stripe_w
        paint = band if i % 2 == 0 or market else WHITE
        awning_stripe(draft, x, front + 0.10, 2.035, stripe_w, 0.73, paint, drop=0.27)
    for side in (-1, 1):
        facade_lantern(draft, side*.78, front+.13, 1.49)
        draft.box((side*w*.95,front+.10,1.01),(.164,.225,1.62),dark,.03)
    side_bays(draft, width, depth, (1.28, 3.96 if not market else 4.52), WHITE)
    steps(draft, 0, front + 0.13, 1.6)
    return draft


def awning_stripe(draft, x, y, z, width, length, paint, drop):
    # Make the canopy slope away from the wall, then hang a small flat hem.
    def section(height, span):
        return [(x - span, y, z + height + drop), (x + span, y, z + height + drop),
                (x + span, y + length, z + height), (x - span, y + length, z + height)]
    draft.rings([section(-0.045, width / 2), section(0.045, width / 2)], paint)
    draft.box((x, y + length + 0.015, z - 0.072), (width, 0.076, 0.18), paint, 0.016)


def pavilion():
    draft = MeshDraft()
    draft.box((0, 0, 0.15), (5.65, 4.32, 0.30), 'c3b49d', 0.069)
    for side in (-1, 1):
        for y in (-1.64, 1.64):
            for x in (side * 2.23, side * 0.86):
                draft.box((x, y, 1.54), (0.15, 0.15, 2.64), '8b6a54', 0.022)
                draft.box((x, y, 0.44), (0.34, 0.34, 0.33), STONE, 0.049)
        draft.box((side * 2.29, 0, 2.76), (0.21, 3.66, 0.23), WOOD, 0.023)
        for y in (-1.23, 1.23):
            draft.box((side * 2.23, y, 2.58), (0.17, 0.65, 0.20), '765844', 0.027)
    draft.box((0, 0, 2.98), (5.9, 4.23, 0.30), '648379', 0.06)
    draft.plate([(-2.88, 3.06), (-2.39, 3.32), (0, 4.10), (2.39, 3.32), (2.88, 3.06)],
                0, 3.99, TILE, 0.05)
    draft.box((0, 0, 4.04), (0.19, 4.34, 0.16), '466762', 0.044)
    for i in range(13):
        x = (i - 6) * 0.42
        z = 4.1 - abs(x) * 0.329
        draft.tube([(x, -2.05, z), (x, 0, z + 0.047), (x, 2.06, z)],
                   [0.039, 0.047, 0.039], '90a693', 6)
    draft.box((0, 1.89, 2.79), (2.83, 0.20, 0.36), '6c745e', 0.05)
    for x in (-2.12, 2.12):
        draft.tube([(x,1.66,2.88),(x,1.66,2.59)],[.024,.024],IRON,6)
        facade_lantern(draft,x,1.49,2.46)
    draft.box((0, -1.15, 0.76), (3.8, 0.43, 0.15), WOOD, 0.027)
    steps(draft, 0, 2.13, 2.78)
    return draft


def tree(blossom=False):
    draft = MeshDraft()
    wood = '8c7159' if blossom else '776453'
    crown = ('e8a6a9', 'edb9b6', 'dfa0b3', 'f0b6ad', 'f4c7bb') if blossom else (
        '638b60', '779a6b', '88a675', '9fba7d', '658961')
    draft.profile(0, [(0, 0.70, 0.68, 0), (0.049, 0.75, 0.73, 0), (0.17, 0.75, 0.73, 0),
                      (0.224, 0.69, 0.67, 0)], 'c5aa8e', 16)
    draft.profile(0, [(0.217, 0.59, 0.55, 0), (0.236, 0.59, 0.55, 0)], '7e7461', 14)
    draft.tube([(0, 0, 0.21), (-0.054, 0.012, 0.82), (-0.048, -0.022, 1.55),
                (0.04, -0.036, 2.29), (0.21, -0.04, 2.93)],
               [0.177, 0.116, 0.098, 0.075, 0.044], wood, 10)
    for x, y, height in [(-0.82, -0.31, 2.7), (0.81, 0.23, 2.61), (-0.35, 0.39, 2.97), (0.31, -0.58, 3.04)]:
        draft.tube([(-0.04, -0.02, 1.38), (x * 0.41, y * 0.55, 1.97), (x, y, height)],
                   [0.096, 0.075, 0.035], wood, 8)
    lobes = [
        (-0.85, -0.31, 2.72, 0.75), (0.81, 0.16, 2.73, 0.76), (-0.44, 0.44, 3.10, 0.77),
        (0.24, -0.64, 3.01, 0.93), (0.11, 0.42, 3.58, 0.83), (-0.64, -0.43, 3.54, 0.69),
        (0.66, -0.35, 3.57, 0.64), (-0.97, 0.21, 3.30, 0.61), (0.72, 0.38, 3.32, 0.70),
        (0.08, 0.02, 3.96, 0.57), (0.13, 0.81, 2.80, 0.70),
    ]
    for i, (x, y, z, size) in enumerate(lobes):
        draft.ellipsoid((x, y, z), (size, size * 0.82, size * 0.87),
                        crown[i % len(crown)], 10, 7, x * 0.36, 0.15)
    for i in range(7):
        angle = i * math.tau / 7
        x, y = 0.45 * math.cos(angle), 0.39 * math.sin(angle)
        draft.ellipsoid((x, y, 0.264), (0.15, 0.1, 0.071), '819269', 7, 4, 0.16)
    return draft


def bench(draft=None, x=0, y=0):
    if draft is None:
        draft = MeshDraft()
    for side in (-1, 1):
        sx = x + side * 0.70
        draft.box((sx, y, 0.045), (0.34, 0.61, 0.09), IRON, 0.021)
        draft.tube([(sx, y + 0.165, 0.07), (sx, y + 0.086, 0.38),
                    (sx, y - 0.22, 0.51), (sx, y - 0.26, 0.89)],
                   [0.061, 0.058, 0.056, 0.038], IRON, 8)
        draft.tube([(sx, y - 0.24, 0.52), (sx, y - 0.25, 0.67),
                    (sx, y + 0.16, 0.70), (sx, y + 0.23, 0.63)],
                   [0.036, 0.037, 0.036, 0.028], IRON, 8)
    for row in range(4):
        draft.box((x, y - 0.22 + row * 0.14, 0.48), (1.78, 0.12, 0.079), WOOD, 0.021)
    for row in range(3):
        draft.box((x, y - 0.25 - row * 0.014, 0.65 + row * 0.12),
                  (1.78, 0.074, 0.101), 'c19167', 0.021)
    return draft


def planter():
    draft = MeshDraft()
    draft.box((0, 0, 0.18), (1.78, 0.76, 0.36), 'c29179', 0.055)
    draft.box((0, 0, 0.35), (1.88, 0.82, 0.11), STONE, 0.033)
    draft.box((0, 0, 0.406), (1.65, 0.64, 0.035), '8c795f', 0.009)
    rng = random.Random(129)
    for i in range(11):
        x = -0.71 + (i % 6) * 0.27
        y = (-0.14 if i < 6 else 0.15) + rng.uniform(-0.04, 0.04)
        h = rng.uniform(0.18, 0.29)
        draft.ellipsoid((x, y, 0.48), (0.20, 0.16, h), ('668e61', '788f65', '90a46f')[i % 3],
                        8, 5, i * 0.24, 0.11)
        if i % 2 == 0 or i == 5:
            z = 0.49 + h
            for j in range(5):
                angle = j * math.tau / 5
                draft.ellipsoid((x + 0.054 * math.cos(angle), y + 0.054 * math.sin(angle), z),
                                (0.045, 0.044, 0.038), ('e6aa9f', 'e8c57d', 'e7c6bb')[i % 3], 6, 3)
            draft.ellipsoid((x, y, z + 0.023), (0.033, 0.032, 0.028), 'e5c587', 6, 3)
    return draft


def shelter():
    draft = MeshDraft()
    draft.box((0, 0, 0.085), (3.44, 1.56, 0.17), 'b3a68f', 0.043)
    for s in (-1, 1):
        for y in (-0.58, 0.51):
            draft.box((s * 1.51, y, 1.20), (0.12, 0.12, 2.33), IRON, 0.021)
        draft.box((s * 1.50, 0, 2.28), (0.13, 1.33, 0.17), IRON, 0.022)
    draft.box((0, -0.55, 1.34), (3, 0.095, 1.86), IRON)
    for x in (-0.99, 0, 0.99):
        draft.box((x, -0.484, 1.36), (0.93, 0.05, 1.76), '7e9d9e')
        draft.plate([(x - 0.46, 0.94), (x + 0.46, 1.63), (x + 0.46, 1.83),
                     (x - 0.46, 1.17)], -0.455, 0.014, 'aac4bf', 0.002)
    draft.box((0, 0, 2.45), (3.52, 1.65, 0.20), '64898a', 0.062)
    draft.box((0, 0.83, 2.46), (3.24, 0.06, 0.09), WHITE, 0.016)
    draft.box((-0.88, 0.43, 2.72), (1.55, 0.16, 0.48), 'd5ac67', 0.061)
    draft.box((1.01, -0.35, 1.61), (0.65, 0.16, 0.83), WHITE, 0.025)
    for j in range(4):
        draft.box((0.99, -0.261, 1.84 - j * 0.11), (0.42, 0.018, 0.026),
                  ('a56b61', '719c86', '748f9e', 'd3ae69')[j])
    bench(draft, -0.21, -0.042)
    return draft


def milk_stall():
    draft = MeshDraft()
    draft.box((0, 0, 0.11), (2.6, 1.74, 0.22), STONE, 0.044)
    draft.box((0, 0, 0.64), (2.35, 1.49, 0.99), 'bf8074', 0.052)
    draft.box((0, 0.02, 1.16), (2.51, 1.62, 0.14), WHITE, 0.034)
    draft.box((0, -0.65, 1.69), (2.35, 0.152, 1.07), '619384', 0.035)
    for x in (-1.1, 1.1):
        draft.box((x, 0.65, 1.70), (0.092, 0.10, 1.11), '917156', 0.022)
    draft.box((0, -0.23, 2.34), (2.69, 1.25, 0.16), 'b67c70', 0.035)
    for i in range(7):
        awning_stripe(draft, (i - 3) * 0.367, 0.365, 2.05, 0.367, 0.61,
                      'e8bcad' if i % 2 == 0 else WHITE, 0.29)
    draft.box((0, 0.84, 2.409), (1.80, 0.13, 0.37), IRON, 0.034)
    for i, paint in enumerate(('d393a8', '9fcfc2', 'ebbf74', 'c5b5c7')):
        x = -0.69 + i * 0.4
        draft.profile(x, [(1.24, 0.089, 0.089, 0.35), (1.47, 0.117, 0.117, 0.35),
                          (1.51, 0.110, 0.110, 0.35)], paint, 10)
        draft.tube([(x, 0.35, 1.46), (x, 0.36, 1.58), (x + 0.036, 0.37, 1.65)],
                   [0.014, 0.015, 0.015], WHITE, 6)
    for i in range(7):
        draft.box(((i - 3) * 0.31, 0.75, 0.59), (0.045, 0.046, 0.83), WOOD, 0.009)
    return draft


def street_lamp():
    draft = MeshDraft()
    draft.profile(0, [(0, 0.19, 0.19, 0), (0.12, 0.20, 0.20, 0), (0.24, 0.13, 0.13, 0),
                      (0.67, 0.09, 0.09, 0), (3.71, 0.056, 0.056, 0)], IRON, 12)
    draft.tube([(0, 0, 3.54), (0.03, 0, 3.80), (0.21, 0, 3.99),
                (0.43, 0, 4.01), (0.62, 0, 3.87)], [0.058, 0.055, 0.053, 0.047, 0.04], IRON, 10)
    draft.profile(0.63, [(3.72, 0.14, 0.14, 0), (3.75, 0.19, 0.19, 0), (3.81, 0.21, 0.21, 0),
                         (3.89, 0.17, 0.17, 0), (3.91, 0.09, 0.09, 0)], '405a5b', 12)
    draft.profile(0.63, [(3.666, 0.116, 0.116, 0), (3.707, 0.156, 0.156, 0),
                         (3.756, 0.16, 0.16, 0)], 'ffedbf', 12)
    for z in (0.27, 0.53, 2.81):
        draft.profile(0, [(z, 0.10, 0.10, 0), (z + 0.045, 0.10, 0.10, 0)], GOLDEN, 10)
    return draft


def fountain():
    draft = MeshDraft()
    draft.profile(0, [(0, 1.29, 1.24, 0), (0.075, 1.38, 1.32, 0), (0.27, 1.34, 1.28, 0),
                      (0.31, 1.32, 1.26, 0)], 'c4b498', 24)
    draft.profile(0, [(0.306, 1.20, 1.15, 0), (0.325, 1.20, 1.15, 0)], '76aaa5', 24)
    draft.profile(0, [(0.33, 0.25, 0.25, 0), (0.72, 0.19, 0.19, 0),
                      (0.81, 0.39, 0.39, 0), (0.90, 0.42, 0.42, 0)], STONE, 18)
    draft.profile(0, [(0.88, 0.365, 0.365, 0), (0.913, 0.36, 0.36, 0)], '8db9b6', 18)
    for j in range(8):
        angle = j * math.tau / 8
        x, y = math.cos(angle), math.sin(angle)
        draft.tube([(x * 0.08, y * 0.08, 1.26), (x * 0.29, y * 0.29, 1.20),
                    (x * 0.53, y * 0.53, 0.97), (x * 0.70, y * 0.70, 0.65),
                    (x * 0.78, y * 0.78, 0.34)], [0.023, 0.026, 0.023, 0.019, 0.014], 'b9d9cd', 7)
    return draft


def garden():
    draft = MeshDraft()
    rng = random.Random(932)
    draft.profile(0, [(0, 2.95, 1.58, 0), (0.08, 2.8, 1.56, 0), (0.18, 2.61, 1.40, 0)],
                  '9e936d', 22)
    for index, (x, y, z, radius) in enumerate([
        (-1.95, -0.43, 0.5, 0.80), (-1.08, -0.39, 0.71, 0.96), (0, -0.50, 0.59, 0.90),
        (1.17, -0.57, 0.71, 0.94), (1.92, -0.27, 0.48, 0.80), (-0.7, 0.46, 0.47, 0.70),
        (0.64, 0.46, 0.44, 0.66),
    ]):
        draft.ellipsoid((x, y, z), (radius, radius * 0.78, radius * 0.65),
                        ('65815b', '76945d', '8ba06b')[index % 3], 10, 6, index * 0.1, 0.10)
    for index in range(15):
        x = (index - 7) * 0.31
        y = rng.uniform(0.64, 1.0)
        z = 0.30 + rng.uniform(0.09, 0.23)
        draft.tube([(x, y, 0.18), (x + 0.04, y - 0.035, z)], [0.022, 0.016], '617e53', 6)
        draft.ellipsoid((x + 0.044, y - 0.029, z), (0.09, 0.067, 0.086),
                        ('e3a997', 'e3c17e', 'e9d1a2')[index % 3], 7, 4)
    for x, y, size in [(-2.21, 0.37, 0.38), (2.08, 0.68, 0.40), (1.67, 0.89, 0.26)]:
        draft.ellipsoid((x, y, 0.12), (size, size * 0.70, size * 0.55), 'a8aa94', 9, 6, 0.3, 0.11)
    return draft


def clock_tower():
    draft = MeshDraft()
    brick, copper = 'aa715c', '537e76'
    draft.box((0, .28, .046), (6.25, 5.0, .088), 'b19f84', .04)
    draft.box((0, 0, .37), (3.64, 3.04, .68), BASE, .08)
    draft.box((0, 0, 3.88), (2.72, 2.64, 7.24), brick, .10)
    for level in (.32, 2.79, 5.72, 7.53):
        draft.box((0, 0, level - .08), (2.89, 2.79, .096), '9c8269')
        draft.box((0, 0, level), (3.04, 2.89, .13), 'c1aa8f', .033)
    for side in (-1, 1):
        for depth in (-1.247, 1.247):
            draft.box((side * 1.26, depth, 3.09), (.24, .25, 5.36), 'bc9274', .038)
        bay(draft, side * .59, 1.337, 4.3, .53, 1.1, 'c8b297', DARK_GLASS, split=False)
        facade_lantern(draft, side * 1.12, 1.33, 1.48)
    archway(draft, 0, 1.38, 1.43, .62, .27)
    draft.box((0, 1.53, 2.43), (2.51, .40, .52), IRON, .054)
    steps(draft, 0, 1.38, 1.88)
    for face in (-1, 1):
        for radius, depth, paint in [(.84, 1.38, '866547'), (.752, 1.462, 'c4a370'), (.665, 1.524, 'e5d4ac')]:
            circle = [(radius * math.cos(i * math.tau / 28),
                       6.63 + radius * math.sin(i * math.tau / 28)) for i in range(28)]
            draft.plate(circle, face * depth, .098, paint, .019)
        for hour in range(12):
            angle = hour * math.tau / 12
            h = (math.sin(angle), math.cos(angle))
            draft.tube([(h[0] * length, face * 1.58, 6.63 + h[1] * length) for length in (.492, .588)],
                       [.018, .018], '615c4a', 5)
        draft.tube([(-.25, face * 1.59, 6.49), (0, face * 1.59, 6.63), (.38, face * 1.59, 6.92)],
                   [.028, .043, .021], IRON, 6)
    tiers = [(7.59, 1.62), (7.82, 1.57), (8.57, 1.06), (9.5, .32), (9.77, .17)]
    draft.rings([[(x * w, y * w, z) for x, y in [(-1, -1), (1, -1), (1, 1), (-1, 1)]]
                 for z, w in tiers], copper, shade=lambda row, _: .80 + .05 * row)
    for x in (-1, 1):
        for y in (-1, 1):
            draft.tube([(x * w, y * w, z + .035) for z, w in tiers], [.062, .054, .045, .036, .034], '78998a', 6)
    draft.tube([(0, 0, 9.71), (0, 0, 10.77)], [.061, .034], 'b79359', 9)
    draft.ellipsoid((0, 0, 10.08), (.16, .16, .143), 'c7a86c', 12, 6)
    draft.plate([(0, 10.69), (.79, 10.63), (.59, 10.44), (.08, 10.42)], 0, .043, 'b95c49')
    for x in (-2.57, 2.57):
        draft.box((x, .9, .15), (.81, 2.1, .24), STONE, .049)
        for y in (-.03, .54, 1.09, 1.5):
            draft.ellipsoid((x, y, .39), (.36, .36, .26), '71885a', 9, 5, y * .6, .12)
    return draft


def milk_court():
    draft = MeshDraft()
    red, mint = 'bb7168', '507d74'
    draft.box((0, .37, .075), (6.0, 4.63, .148), 'b5a68d', .052)
    draft.box((0, -.15, .71), (4.21, 2.8, 1.26), 'd0a68a', .085)
    draft.box((0, 1.26, 1.29), (4.47, .56, .20), '736357', .043)
    draft.box((0, -.22, 1.81), (4.19, .17, 1.12), '6f9e92', .026)
    for x in (-2.03, 2.03):
        for y in (-1.43, 1.36):
            draft.box((x, y, 1.49), (.17, .16, 2.69), mint, .027)
        facade_lantern(draft, x * .88, 1.28, 1.86)
    draft.box((0, -.22, 2.8), (4.61, 3.05, .28), mint, .059)
    for i in range(9):
        awning_stripe(draft, (i - 4) * .495, .79, 2.28, .495, 1.48,
                      red if i % 2 == 0 else 'e5ceaa', .44)
    draft.box((0, 1.60, 2.56), (3.33, .27, .59), '80635b', .042)
    # The oversized shake is the shop sign visible over the nearby rooflines.
    draft.profile(0, [(2.86, .62, .58, -.14), (3.02, .83, .73, -.14), (4.10, .94, .82, -.14),
                      (4.71, 1.042, .93, -.14), (4.89, 1.05, .94, -.14)], 'd7948b', 20)
    draft.profile(0, [(3.65, .910, .798, -.14), (4.09, .959, .838, -.14)], 'e9cfad', 20)
    draft.profile(0, [(4.86, 1.08, .962, -.14), (4.99, 1.09, .962, -.14),
                      (5.07, 1.04, .93, -.14)], 'e9cfad', 20)
    draft.profile(0, [(5.049, .94, .846, -.14), (5.19, .86, .76, -.14),
                      (5.39, .67, .60, -.14), (5.47, .45, .44, -.14)], 'efdec4', 20)
    draft.tube([(.14, -.21, 5.43), (.34, -.21, 6.06), (.53, -.21, 6.24),
                (.81, -.21, 6.27)], [.093, .093, .093, .093], 'a95e58', 10)
    draft.tube([(.24, -.21, 5.75), (.275, -.21, 5.86)], [.098, .098], 'ead7b9', 10)
    for i in range(6):
        x = (i - 2.5) * .50
        draft.profile(x, [(1.4, .068, .068, 1.22), (1.62, .108, .108, 1.22),
                          (1.66, .104, .104, 1.22)], ('c58778', 'e3c598', '8bb09e')[i % 3], 9)
    for x in (-2.54, 2.54):
        draft.box((x, 1.34, .23), (.72, .74, .37), WOOD, .039)
        for i in range(3):
            draft.ellipsoid((x + .18 * (i - 1), 1.40, .48), (.17, .16, .108), ('6d8d6b', '829966')[i % 2], 8, 5)
    return draft


def bunting():
    draft = MeshDraft()
    reach = 4.54

    def wire_z(x):
        return 6.55 + .73 * (x / reach) ** 2

    draft.tube([(reach * (i / 9 - 1), .04, wire_z(reach * (i / 9 - 1))) for i in range(19)],
               [.016] * 19, '675b4b', 5)
    for i in range(13):
        x = (i - 6) * .66
        draft.plate([(x - .245, wire_z(x - .245)), (x + .246, wire_z(x + .246)),
                     (x + .019, wire_z(x) - .42)], .065, .032,
                    ('bb6d61', 'd6aa68', '749d8f', 'e0c7a2')[i % 4], .004)
    return draft


def poplar():
    draft = MeshDraft()
    draft.tube([(0, 0, -.02), (.095, .08, 1.16), (.09, 0, 2.68), (-.09, -.12, 4.73)],
               [.212, .164, .083, .028], '746758', 9)
    for x, y, z, width, height, tone in [
        (.15, .06, 3.73, .88, 1.48, '73976d'), (-.17, .14, 4.74, .74, 1.50, '85a079'),
        (-.39, -.26, 3.22, .76, 1.31, '678a69'), (.35, -.22, 4.25, .70, 1.37, '8aa57b'),
        (-.10, 0, 5.4, .45, .97, '96b086'),
    ]:
        draft.ellipsoid((x, y, z), (width, width * .81, height), tone, 9, 7, -x * .24, .16)
    return draft


def park_pond():
    draft = MeshDraft()
    rng = random.Random(2652)
    extent = (4.72, 7.24)
    sides = 48

    def shore(angle, radius, z):
        bend = 1 + .073 * math.sin(3 * angle + .8) + .062 * math.cos(2 * angle - .7)
        return (extent[0] * math.cos(angle) * bend * radius,
                extent[1] * math.sin(angle) * bend * radius, z)

    angles = [i * math.tau / sides for i in range(sides)]
    draft.rings([[shore(a, radius, z) for a in angles]
                 for radius, z in [(1.02, .01), (1.0, .113), (.96, .143)]], '809180')
    # A colored ring around the edge gives the water a visible shallows.
    inner = [draft.vertex(shore(a, .73, .151), color('4a7d83', .92 + .08 * math.cos(a))) for a in angles]
    outer = [draft.vertex(shore(a, .924, .151), color('749f94')) for a in angles]
    draft.face(inner)
    for i in range(sides):
        following = (i + 1) % sides
        draft.face((inner[i], outer[i], outer[following], inner[following]))
    for i in range(16):
        x, y, _ = shore(i * math.tau / 16 + .06, .949, 0)
        size = rng.uniform(.16, .36)
        draft.ellipsoid((x, y, .13), (size * 1.2, size, size * .61),
                        ('a2a591', 'a1aa9b', 'a6a18c')[i % 3], 7, 4, i * .4, .14)
    for x, y, spread in [(-2.4, -4.4, .75), (1.1, 4.58, .63), (2.22, -1.7, .52), (-1.2, 1.9, .51)]:
        for i in range(4):
            px, py = x + rng.uniform(-spread, spread), y + rng.uniform(-spread, spread)
            size = rng.uniform(.11, .26)
            pad = [draft.vertex((px + size * math.cos(a), py + .85 * size * math.sin(a), .165), color('5f8e69'))
                   for a in (.24, .85, 1.47, 2.09, 2.7, 3.31, 3.93, 4.54, 5.15, 5.84)]
            draft.face(pad + [draft.vertex((px, py, .165), color('76a174'))])
            if i == 0:
                draft.ellipsoid((px, py, .22), (.13, .13, .066), 'dfacaf', 9, 6)
                draft.ellipsoid((px, py, .27), (.053, .058, .052), 'e4c18c', 8, 5)
    for i in range(18):
        x, y, _ = shore(rng.uniform(.08, 5.96), rng.uniform(.1, .83), 0)
        w = rng.uniform(.12, .56)
        face = [draft.vertex((x + offset_x, y + offset_y, .156), color('94bbad', shade))
                for offset_x, offset_y, shade in [(-w, 0, .80), (0, -.063, .95), (w, -.028, .82), (.17, .02, .92)]]
        draft.face(face)
    for a in (1.05, 1.83, 2.46, 3.34, 4.36):
        x, y, _ = shore(a, .95, .0)
        for i in range(6):
            h = rng.uniform(.42, .88)
            px, py = x + rng.uniform(-.26, .26), y + rng.uniform(-.29, .29)
            draft.tube([(px, py, .13), (px + .05, py - .06, h), (px + .12, py - .08, h + .16)],
                       [.025, .019, .009], ('7c9264', '80905a')[i % 2], 5)
            if i % 3 == 0:
                draft.ellipsoid((px + .077, py - .061, h + .055), (.047, .052, .132), '9f845c', 7, 4, -.21)
    for i in range(7):
        x = 4.15 + .074 * math.sin(i * .8)
        draft.box((x, -2.15 + i * .46, .208), (1.22, .437, .103),
                  ('a98162', 'b48c6c', 'a47d60')[i % 3], .027)
    return draft


def park_walk():
    draft = MeshDraft()
    path = [(-5.38, 3.8), (-4.54, 3.55), (-3.34, 3.14), (-2.31, 2.52), (-1.43, 1.81),
            (-.72, .91), (.02, -.18), (.54, -1.37), (1.13, -2.49), (2.08, -3.62), (3.18, -4.50), (4.48, -4.89)]
    rows = []
    for i, (x, y) in enumerate(path):
        ax, ay = path[max(0, i - 1)]
        bx, by = path[min(len(path) - 1, i + 1)]
        length = math.hypot(bx - ax, by - ay)
        nx, ny = (ay - by) / length, (bx - ax) / length
        rows.append([draft.vertex((x + nx * w, y + ny * w, .043),
                                  color(paint, .92 + .05 * math.sin(i * .9)))
                     for w, paint in [(-.67, '958a70'), (-.53, 'baad90'),
                                      (.53, 'c5b99b'), (.67, '938972')]])
    for near, far in zip(rows, rows[1:]):
        for i in range(len(near) - 1):
            draft.face((near[i], far[i], far[i + 1], near[i + 1]))
    for x, y in [(-2.54, 4.07), (-3.32, 1.68), (.06, -2.5), (1.8, -1.81), (3.55, -5.6)]:
        for i in range(3):
            draft.ellipsoid((x + .37 * (i - 1), y + .18 * math.sin(i), .18 + i * .027),
                            (.41, .44, .25), ('628664', '798f61', '8b9e6c')[i], 8, 4, .2, .10)
        for i in range(5):
            dx = .22 * (i - 2)
            z = .23 + .13 * math.sin(1 + i * .64)
            draft.tube([(x + dx, y - .31, .04), (x + dx + .032, y - .38, z)], [.016, .012], '5f7c57', 5)
            draft.ellipsoid((x + dx + .032, y - .38, z), (.073, .069, .048),
                            ('dc9c89', 'dec891', 'ae859e')[i % 3], 7, 4)
    return draft


def gate():
    draft = MeshDraft()
    for side in (-1, 1):
        x = side * 4.57
        draft.box((x, 0, 0.24), (0.5, 0.49, 0.44), STONE, 0.049)
        draft.box((x, 0, 3.77), (0.18, 0.19, 6.96), IRON, 0.027)
        draft.box((x, 0, 7.27), (0.31, 0.32, 0.34), GOLDEN, 0.034)
        for z in (0.60, 6.49):
            draft.box((x, 0, z), (0.25, 0.26, 0.084), GOLDEN, 0.014)
    draft.box((0, 0, 7.41), (9.52, 0.3, 0.205), IRON, 0.038)
    draft.box((0, 0.043, 7.04), (4.6, 0.21, 0.62), '466563', 0.051)
    for x in (-2.04, 2.04):
        draft.box((x, 0.188, 7.04), (0.055, 0.061, 0.46), GOLDEN, 0.013)
    return draft


def bollard():
    draft = MeshDraft()
    draft.profile(0, [(0, 0.096, 0.096, 0), (0.09, 0.092, 0.092, 0), (0.58, 0.063, 0.063, 0),
                      (0.65, 0.055, 0.055, 0)], IRON, 9)
    draft.profile(0, [(0.435, 0.071, 0.071, 0), (0.483, 0.07, 0.07, 0)], STONE, 9)
    return draft


def presentation(objects, material):
    """Arrange the exported modules in an editable example street."""
    locations = {
        'CampusLibrary': (-10, 13), 'AcademicHall': (10, 8), 'Dormitory': (-10, 3),
        'TeaCorner': (10, 21), 'MilkMarket': (-11, 23), 'ParkPavilion': (10, 32),
        'PlaneTree': (-6, 17), 'BlossomTree': (5.8, 5), 'BusShelter': (-5.4, 4),
        'MilkStall': (5.9, 14), 'StreetLamp': (-5.3, 1), 'FlowerPlanter': (5.2, 0),
        'CedarBench': (5.61, 8), 'ParkFountain': (-6.6, 27), 'StreetGate': (0, 16),
        'StreetBollard': (-4.7, 2.8), 'ParkGarden': (9.5, 28.5),
        'CampusClock': (-10, 17.2), 'MilkCourt': (10.4, 27.6), 'MarketBunting': (0, 16),
        'ParkPond': (-11.6, 37.0), 'ParkPoplar': (14.6, 33.9), 'ParkWalk': (11.8, 40.5),
    }
    for obj in objects:
        x, y = locations[obj.name]
        obj.location.x = x
        obj.location.y = y
        if abs(x) > 7:
            obj.rotation_euler.z = math.copysign(-0.48, x)
    platform = MeshDraft()
    platform.box((0, 19, -0.13), (34, 54, 0.25), '8ba17b', 0.11)
    platform.box((0, 19, 0), (7.65, 54, 0.07), '657179')
    for side in (-1, 1):
        platform.box((side * 5.16, 19, 0.018), (2.53, 54, 0.112), STONE, 0.015)
        platform.box((side * 1.22, 19, 0.039), (0.064, 54, 0.008), WHITE)
    platform.object('Example street and sidewalks', material)
    scene = bpy.context.scene
    data = bpy.data.cameras.new('Street overview')
    camera = bpy.data.objects.new('Street overview', data)
    scene.collection.objects.link(camera)
    camera.location = (27, -23, 26)
    camera.rotation_euler = (Vector((0, 18, 2.2)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    data.type = 'ORTHO'
    data.ortho_scale = 55
    scene.camera = camera
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces.active.region_3d.view_rotation = camera.rotation_euler.to_quaternion()
                area.spaces.active.region_3d.view_location = (0, 19, 1.7)
                area.spaces.active.region_3d.view_distance = 46
    return camera


def make_distant_meshes(objects):
    distant = []
    for obj in objects:
        obj.data.calc_loop_triangles()
        if len(obj.data.loop_triangles) < 1700:
            continue
        low = obj.copy()
        low.data = obj.data.copy()
        low.name = obj.name + 'Far'
        low.data.name = low.name
        bpy.context.collection.objects.link(low)
        bpy.context.view_layer.objects.active = low
        modifier = low.modifiers.new('Distant detail', 'DECIMATE')
        modifier.ratio = 0.31
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        low.data.validate()
        low.data.update()
        distant.append(low)
    return distant


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source_dir', type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    output = Path(__file__).resolve().parent.parent / 'assets' / 'street-kit.glb'
    args.source_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    material = painted_material()
    drafts = {
        'CampusLibrary': library(), 'AcademicHall': academic_hall(), 'Dormitory': dormitory(),
        'TeaCorner': storefront(), 'MilkMarket': storefront(market=True), 'ParkPavilion': pavilion(),
        'PlaneTree': tree(), 'BlossomTree': tree(blossom=True), 'FlowerPlanter': planter(),
        'CedarBench': bench(), 'BusShelter': shelter(), 'MilkStall': milk_stall(),
        'StreetLamp': street_lamp(), 'ParkFountain': fountain(), 'StreetGate': gate(),
        'StreetBollard': bollard(), 'ParkGarden': garden(),
        'CampusClock': clock_tower(), 'MilkCourt': milk_court(), 'MarketBunting': bunting(),
        'ParkPond': park_pond(), 'ParkPoplar': poplar(), 'ParkWalk': park_walk(),
    }
    objects = [draft.object(name, material) for name, draft in drafts.items()]
    distant = make_distant_meshes(objects)
    export_glb(objects + distant, output)
    for proxy in distant:
        mesh = proxy.data
        bpy.data.objects.remove(proxy, do_unlink=True)
        bpy.data.meshes.remove(mesh)
    presentation(objects, material)
    save_source(args.source_dir / 'street-kit.blend')


if __name__ == '__main__':
    main()
