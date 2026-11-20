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
from blender_scene_mesh import MeshDraft, export_glb, painted_material, save_source


STONE = 'e6d2b5'
MORTAR = 'cabba7'
BASE = '9d9f98'
IRON = '314951'
GLASS = '537b88'
DARK_GLASS = '42636e'
GLINT = 'a1bec0'
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


def bay(draft, x, front, z, width, height, frame=STONE, glass=GLASS, split=True):
    draft.box((x, front + 0.019, z), (width + 0.17, 0.09, height + 0.16), frame, 0.018)
    draft.box((x, front + 0.07, z), (width, 0.045, height), IRON, 0.008)
    draft.box((x, front + 0.093, z), (width - 0.097, 0.02, height - 0.105), glass)
    draft.box((x, front + 0.112, z + height * 0.32), (width - 0.1, 0.016, 0.035), GLINT)
    draft.box((x, front + 0.13, z - height / 2 - 0.08), (width + 0.26, 0.24, 0.077), frame, 0.015)
    if split:
        draft.box((x - width * 0.07, front + 0.117, z), (0.048, 0.044, height), IRON)


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
        for z in (0.64, 0.84, 2.89, 3.69, 5.61, 5.80):
            draft.box((s * 2.27, 2.217, z), (1.66, 0.038, 0.043), 'a66858')
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
    draft.box((0, 2.28, 4.87), (1.6, 0.22, 6.7), '538289', 0.027)
    for x in (-0.78, -0.24, 0.24, 0.78):
        draft.box((x, 2.414, 4.86), (0.052, 0.085, 6.65), WHITE)
    for z in (1.58, 2.66, 3.72, 4.82, 5.92, 7.01, 8.08):
        draft.box((0, 2.413, z), (1.63, 0.087, 0.052), IRON)
    for side in (-1, 1):
        draft.box((side * 1.95, 2.32, 4.83), (2.46, 0.36, 6.91), 'bcb39c', 0.045)
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
    for x in (-2.0, 2.0):
        bay(draft, x, 2.025, 1.04, 1.07, 1.2)
    draft.box((0, 2.09, 0.92), (1.38, 0.15, 1.68), IRON, 0.033)
    draft.box((0, 2.16, 0.81), (1.12, 0.07, 1.47), '6f8e87', 0.023)
    for side in (-1, 1):
        draft.box((side * 0.55, 2.25, 1.02), (0.067, 0.15, 0.29), GOLDEN, 0.025)
    draft.box((0, 2.19, 1.87), (1.81, 0.46, 0.15), '8e625a', 0.04)
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
        draft.box((x, front + 0.21, 1.22), (width * 0.332, 0.058, 1.62), '8ba5a0', 0.015)
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
    }
    for obj in objects:
        x, y = locations[obj.name]
        obj.location.x = x
        obj.location.y = y
        if abs(x) > 7:
            obj.rotation_euler.z = math.copysign(-0.48, x)
    platform = MeshDraft()
    platform.box((0, 13, -0.13), (30, 44, 0.25), '8ba17b', 0.11)
    platform.box((0, 13, 0), (7.65, 44, 0.07), '657179')
    for side in (-1, 1):
        platform.box((side * 5.16, 13, 0.018), (2.53, 44, 0.112), STONE, 0.015)
        platform.box((side * 1.22, 13, 0.039), (0.064, 44, 0.008), WHITE)
    platform.object('Example street and sidewalks', material)
    scene = bpy.context.scene
    data = bpy.data.cameras.new('Street overview')
    camera = bpy.data.objects.new('Street overview', data)
    scene.collection.objects.link(camera)
    camera.location = (23, -18, 21)
    camera.rotation_euler = (Vector((0, 12, 2)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    data.type = 'ORTHO'
    data.ortho_scale = 47
    scene.camera = camera
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces.active.region_3d.view_rotation = camera.rotation_euler.to_quaternion()
                area.spaces.active.region_3d.view_location = (0, 13, 1.4)
                area.spaces.active.region_3d.view_distance = 39
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
