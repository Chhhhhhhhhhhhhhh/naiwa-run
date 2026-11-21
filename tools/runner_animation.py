"""Locomotion and capture poses in the game's Y-up axes."""

import math


TAU = 2 * math.pi


def gesture(base_pose, kind, t, teacher):
    strength = math.sin(math.pi * t) ** .84
    rotation = {}
    root = (0, 0, 0)
    if kind in ('DodgeLeft', 'DodgeRight'):
        side = -1 if kind == 'DodgeLeft' else 1
        rotation = {
            'Chest': (12 * strength, -side * 15 * strength, -side * 23 * strength),
            'Head': (-5 * strength, side * 9 * strength, side * 9 * strength),
            'Tail': (0, side * 35 * strength, side * 9 * strength),
        }
        root = (-side * .07 * strength, -.15 * strength, 0)
    elif kind == 'Land':
        rotation = {'Chest': (24 * strength, 0, 0), 'Head': (-12 * strength, 0, 0),
                    'Tail': (-21 * strength, 0, 0)}
        root = (0, -.26 * strength, 0)
    elif kind == 'Stumble':
        tip = math.sin(TAU * t) * strength
        rotation = {'Chest': (30 * strength, 14 * tip, 18 * tip),
                    'Head': (-17 * strength, -10 * tip, -13 * tip), 'Tail': (16 * strength, 24 * tip, 0)}
        root = (.065 * tip, -.21 * strength, 0)
    elif kind == 'Caught':
        reach = min(1, t * 1.95)
        reach = reach * reach * (3 - 2 * reach)
        rotation = {'Chest': (17 * reach, -12 * reach, -7 * reach),
                    'Head': (-14 * reach, 27 * reach, 8 * reach), 'Tail': (27 * reach, -22 * reach, 0)}
        root = (0, -.25 * reach, .045 * reach)
    elif kind == 'Grab':
        reach = min(1, t * 2.05)
        reach = reach * reach * (3 - 2 * reach)
        hold = math.sin(math.pi * t) * reach
        rotation = {'Chest': (23 * reach, 8 * reach, 3 * reach),
                    'Head': (12 * reach, -8 * reach, -3 * reach), 'Scarf': (-30 * hold, 5 * hold, 4 * hold)}
        root = (0, -.24 * reach, .10 * reach)
    else:
        # An occasional greeting in the menu uses the head, elbow and wrist.
        wave = strength * (.68 + .32 * math.sin(3 * TAU * t))
        rotation = {'Head': (-5 * strength, -16 * strength, -9 * strength),
                    'ArmR': (-118 * strength, 18 * strength, 34 * strength),
                    'ElbowR': (-45 * strength, 5 * strength, 21 * wave),
                    'HandR': (0, 11 * wave, -25 * wave)}

    for sign, suffix in ((-1, 'L'), (1, 'R')):
        if kind in ('DodgeLeft', 'DodgeRight'):
            travel = sign * side * strength
            rotation.update({'Arm' + suffix: (-9 * strength - 29 * travel, 0, sign * (8 + 29 * strength)),
                             'Elbow' + suffix: (-28 * strength, 0, sign * 10 * strength),
                             'Leg' + suffix: (-9 * travel, 0, sign * (2 + 13 * strength)),
                             'Knee' + suffix: (26 * strength + 14 * travel, 0, 0)})
        elif kind in ('Land', 'Stumble'):
            rotation.update({'Arm' + suffix: ((-48 if kind == 'Stumble' else -32) * strength, 0, sign * (8 + 30 * strength)),
                             'Elbow' + suffix: (-29 * strength, 0, sign * 10 * strength),
                             'Leg' + suffix: (-18 * strength, 0, sign * 3 * strength),
                             'Knee' + suffix: (40 * strength, 0, 0), 'Foot' + suffix: (-17 * strength, 0, 0)})
        elif kind == 'Caught':
            rotation.update({'Arm' + suffix: (-116 * reach, 0, sign * (8 + 17 * reach)),
                             'Elbow' + suffix: (-48 * reach, sign * 7 * reach, 0),
                             'Hand' + suffix: (8 * reach, 0, sign * 16 * reach),
                             'Leg' + suffix: (-15 * reach, 0, sign * 5 * reach),
                             'Knee' + suffix: (33 * reach, 0, 0), 'Foot' + suffix: (-13 * reach, 0, 0)})
        elif kind == 'Grab':
            rotation.update({'Arm' + suffix: (-73 * reach, sign * -8 * reach, sign * (8 + 4 * reach)),
                             'Elbow' + suffix: (-16 * reach, -sign * 7 * reach, 0),
                             'Hand' + suffix: (14 * reach, 0, sign * -13 * reach),
                             'Leg' + suffix: ((-18 if sign == 1 else 11) * reach, 0, sign * 3 * reach),
                             'Knee' + suffix: (19 * reach, 0, 0), 'Coat' + suffix: (16 * reach, 0, sign * 4 * reach)})

    values = base_pose('Idle', 0)
    values.update({(bone, 'rotation'): value for bone, value in rotation.items()
                   if bone != 'Tail' or not teacher})
    values['Pelvis', 'translation'] = root
    return values


def animation_clips(teacher=False):
    def pose(kind, t):
        a = TAU * t
        run = kind == 'Run'
        idle = kind == 'Idle'
        jump = kind == 'Jump'
        stride = math.sin(a)
        lift = math.sin(math.pi * t) if jump else 0
        bob = .04 * (1 - math.cos(a * 2)) if run else .017 * math.sin(a) if idle else -.13 * (1 - lift)
        rolls = math.cos(a) if run else .3 * math.sin(a)
        angles = {
            'Chest': (10 if run else -10*lift if jump else 1.5*math.sin(a) if idle else 24,
                      rolls * 4, rolls * 3),
            'Head': (-5 + 3*math.cos(2*a) if run else -3 if jump else 2*math.sin(a), -rolls*3.5, -rolls*2.5),
        }
        if teacher:
            angles['Scarf'] = (-15 + 8*math.sin(a + .8) if run else 4*math.sin(a), 4*stride, 6*rolls)
        else:
            angles['Tail'] = (6*math.cos(2*a) if run else 16 if jump else 3*rolls, 10*stride, 0)
        for s, side in ((-1, 'L'), (1, 'R')):
            step = stride * s
            swing = step * (34 if teacher else 27)
            bend = max(0, math.sin(a - .48)*s)
            if run:
                leg_x, knee_x = -swing - 8, 9 + (49 if teacher else 46)*bend
                arm_x, elbow_x = swing, -42 + step*15
                foot_x = 8*s*math.cos(a) - knee_x*.34
            elif idle:
                leg_x, knee_x = -1, 2
                arm_x, elbow_x = 3*math.sin(a + s*.8), -5 + 2*rolls*s
                foot_x = -1
            elif jump:
                leg_x, knee_x = -23*lift + 6*s, 15 + 49*lift
                arm_x, elbow_x = -51*lift, -20 - 22*lift
                foot_x = -14*lift
            else:
                leg_x, knee_x = -47, 66
                arm_x, elbow_x = -34, -56
                foot_x = -26
            angles.update({
                'Leg' + side: (leg_x, 0, s*1.5), 'Knee' + side: (knee_x, 0, 0),
                'Foot' + side: (foot_x, 0, 0), 'Arm' + side: (arm_x, -s*5, s*(5 if run else 8)),
                'Elbow' + side: (elbow_x, s*4, s*(4 if run else 1)), 'Hand' + side: (0, 0, -s*rolls*4),
            })
            if teacher:
                angles['Coat' + side] = (leg_x * .91, 0, s * 1.6)
        values = {(bone, 'rotation'): xyz for bone, xyz in angles.items()}
        values['Pelvis', 'translation'] = (.017*rolls, bob, 0)
        return values

    durations = {'Idle': 2.5, 'Run': .68 if teacher else .58, 'Jump': .62, 'Slide': .85}
    if teacher:
        durations.pop('Slide')
    clips = [(name, duration, lambda t, kind=name: pose(kind, t)) for name, duration in durations.items()]
    motions = {'Greeting': 1.45, 'Grab': .91} if teacher else {
        'Greeting': 1.45, 'DodgeLeft': .32, 'DodgeRight': .32, 'Land': .25, 'Stumble': .48, 'Caught': 1.25,
    }
    return clips + [(name, duration, lambda t, kind=name: gesture(pose, kind, t, teacher))
                    for name, duration in motions.items()]
