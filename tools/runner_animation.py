"""Running, jumping and sliding poses in the game's Y-up axes."""

import math


TAU = 2 * math.pi


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
        durations = {name: durations[name] for name in ('Idle', 'Run')}
    return [(name, duration, lambda t, kind=name: pose(kind, t)) for name, duration in durations.items()]
