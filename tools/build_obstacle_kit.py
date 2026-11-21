"""Build the reusable obstacle meshes for the runner's lane layouts."""

import argparse
import math
from pathlib import Path
import sys

import bpy

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_scene_mesh import MeshDraft, export_glb, painted_material, save_source


INK = '27383c'
STEEL = '536669'
CREAM = 'f6deae'
AMBER = 'f0aa50'
CORAL = 'c94e3b'
TEAL = '397c77'


def rounded_panel(x, z, width, height, r):
    left, right = x - width / 2, x + width / 2
    bottom, top = z - height / 2, z + height / 2
    return [(left+r,bottom),(right-r,bottom),(right,bottom+r),(right,top-r),
            (right-r,top),(left+r,top),(left,top-r),(left,bottom+r)]


def round_face(x, z, radius, sides=24):
    return [(x + radius * math.cos(i * math.tau / sides),
             z + radius * math.sin(i * math.tau / sides)) for i in range(sides)]


def bolts(draft, positions, y, color=CREAM, radius=.035):
    for x, z in positions:
        draft.plate(round_face(x, z, radius, 8), y, .021, color, .006)


def hazard_band(draft, z, width, height, y, color=AMBER):
    draft.plate(rounded_panel(0, z, width, height, .06), y, .06, INK, .017)
    span = width - .19
    for i in range(5):
        x = (i - 2.5) * span / 5 + .045
        draft.plate([(x,z-height*.30),(x+span*.12,z-height*.30),
                     (x+span*.17,z+height*.30),(x+span*.05,z+height*.30)], y+.035, .016, color)


def alarm():
    draft = MeshDraft()
    draft.box((0, 0, .09), (1.69, .59, .18), INK, .045)
    draft.box((0, 0, .24), (1.72, .50, .28), 'b84939', .07)
    hazard_band(draft, .25, 1.64, .24, .26)
    for side in (-1, 1):
        draft.box((side*.69, 0, .083), (.36, .70, .16), STEEL, .036)
        draft.tube([(side*.28,0,.91),(side*.34,0,1.03)],[.054,.05],STEEL)
        draft.ellipsoid((side*.35,0,1.025),(.16,.17,.103),CORAL)
        draft.ellipsoid((side*.35,.016,1.024),(.122,.154,.062),AMBER)
    draft.plate(round_face(0,.604,.452), .0, .36, CORAL, .085)
    draft.plate(round_face(0,.604,.399), .199, .077, '642f29', .02)
    draft.plate(round_face(0,.604,.344), .245, .022, CREAM, .01)
    for hour in range(12):
        a = math.tau * hour / 12
        start = .252 if hour % 3 == 0 else .274
        end = .309
        draft.tube([(math.sin(a)*start,.26,.604+math.cos(a)*start),
                    (math.sin(a)*end,.26,.604+math.cos(a)*end)],[.009,.009],STEEL,5)
    draft.tube([(-.144,.278,.513),(0,.278,.604),(0,.278,.819)],[.022,.025,.018],INK,7)
    bolts(draft, [(0,.604),(-.75,.251),(.75,.251)], .305, 'e6a769', .024)
    return draft


def barrier():
    draft = MeshDraft()
    for side in (-1, 1):
        x = side * .66
        draft.box((x,0,.07),(.37,.62,.14),INK,.042)
        draft.tube([(x,-.15,.10),(x,0,.65),(x,.21,.12)],[.061,.064,.055],STEEL,8)
        draft.box((x,0,.63),(.20,.32,.19),'925042',.039)
    draft.box((0,0,.65),(1.77,.29,.34),CORAL,.076)
    hazard_band(draft, .65, 1.67, .25, .157)
    bolts(draft, [(-.75,.65),(.75,.65)], .211, CREAM, .036)
    return draft


def oil_gate():
    draft = MeshDraft()
    for side in (-1, 1):
        x = side * 1.01
        draft.box((x,0,.09),(.29,.58,.18),INK,.049)
        draft.box((x,0,1.19),(.18,.24,2.22),'54847a',.035)
        draft.box((x,.035,.30),(.228,.31,.32),'344e4b',.04)
        for z in (.48, 2.06):
            draft.box((x,.045,z),(.205,.24,.09),AMBER,.02)
    draft.box((0,0,2.245),(2.25,.28,.235),TEAL,.058)
    hazard_band(draft,2.25,2.14,.192,.155)
    draft.tube([(0,0,2.15),(0,0,1.91)], [.025,.034], INK, 8)
    center = 1.48
    puffed = [(math.cos(a)*(.518 + .018*math.sin(a*9)),
               center + math.sin(a)*(.518 + .018*math.sin(a*9)))
              for a in (math.tau*i/36 for i in range(36))]
    draft.plate(puffed, .032, .31, 'b56a35', .10)
    draft.plate(round_face(0,center,.461,32), .199, .069, 'e5a54c', .03)
    for i in range(19):
        radius = .37 * math.sqrt((i+.5)/19)
        a = i * 2.39996323
        x, z = math.cos(a)*radius, center+math.sin(a)*radius
        draft.ellipsoid((x,.239,z),(.036,.015,.013),CREAM,7,4,roll=a)
    draft.plate([(-.19,1.49),(.19,1.49),(.19,1.43),(0,1.32),(-.19,1.43)], .251, .012, '925631')
    return draft


def emo_board():
    draft = MeshDraft()
    draft.box((0,0,.108),(1.48,.64,.215),'393041',.053)
    draft.plate(rounded_panel(0,1.202,1.34,2.08,.20), .025,.37,'5c4b72',.09)
    draft.plate(rounded_panel(0,1.202,1.15,1.89,.14), .253,.084,'39435f',.036)
    draft.plate(rounded_panel(0,1.249,1.025,1.67,.13), .310,.036,'675f8e',.013)
    draft.plate(rounded_panel(0,1.991,.73,.15,.063), .347,.032,'b9a1bb',.014)
    for x in (-.225, .225):
        draft.plate(round_face(x,1.495,.069,13),.343,.024,'ebd3d6',.009)
        draft.plate([(x-.067,1.24),(x,1.43),(x+.061,1.247),(x,1.157)],.343,.033,'8bbbd5',.013)
    draft.tube([(-.15,.363,1.05),(0,.363,1.13),(.15,.363,1.05)],[.021,.021,.021],'e0bbd3',7)
    bolts(draft, [(-.51,.337),(.51,.337)],.321,'a9a3b8')
    return draft


def phone():
    draft = MeshDraft()
    draft.box((0,0,.105),(1.57,.68,.21),INK,.063)
    draft.plate(rounded_panel(0,1.208,1.53,2.15,.23),0,.35,'3d5d63',.095)
    draft.plate(rounded_panel(0,1.216,1.39,2.03,.19),.195,.087,'243b48',.037)
    draft.plate(rounded_panel(0,1.214,1.26,1.85,.155),.25,.045,'4b7f92',.018)
    draft.plate(rounded_panel(0,1.49,1.14,.95,.078),.279,.028,'78a5a5',.012)
    draft.plate([(-.565,.999),(-.565,1.20),(-.18,1.622),(.17,1.309),(.565,1.51),(.565,.999)],
                .302, .012, '527d7d')
    draft.plate(round_face(0,1.51,.239),.321,.026,'e2a75b',.011)
    draft.plate([(-.067,1.385),(.138,1.51),(-.067,1.635)],.343,.024,CREAM,.009)
    draft.plate(rounded_panel(0,2.065,.46,.098,.041),.288,.031,INK,.012)
    draft.plate(rounded_panel(-.192,.804,.78,.09,.033),.284,.026,CREAM,.009)
    draft.plate(rounded_panel(-.295,.652,.57,.063,.032),.282,.024,'9cc2bf',.008)
    draft.plate(rounded_panel(.336,.493,.48,.22,.062),.286,.025,CORAL,.011)
    for x in (-.41,-.28,-.15):
        draft.plate(round_face(x,.486,.035,12),.291,.016,'b2c4bf',.004)
    return draft


def cargo(half):
    draft = MeshDraft()
    length = half * 2
    paint = TEAL if half > 3 else 'b86149'
    draft.box((0,-.35,.66),(1.72,length+1.04,.32),INK,.068)
    draft.box((0,0,1.435),(1.90,length,1.636),paint,.115)
    draft.box((0,0,2.245),(1.95,length+.078,.11),'52646a',.04)
    draft.box((0,-half-.69,1.355),(1.92,1.38,1.69),'374d52',.15)
    draft.box((0,-half-.68,2.206),(1.86,1.37,.188),paint,.054)
    draft.plate(rounded_panel(0,1.776,1.57,.53,.10),-half-1.373,.035,'719999',.013)
    draft.box((0,-half-1.387,.864),(1.31,.073,.25),'60777a',.026)
    wheels = (-half-.81,-half+.83,half-.81) if half < 3 else (-half-.78,-half+1.2,half-2.1,half-.9)
    for side in (-1, 1):
        draft.box((side*.95,0,1.72),(.042,length-.23,.217),CREAM,.018)
        draft.box((side*.976,0,1.03),(.038,length-.35,.088),AMBER,.012)
        draft.box((side*.994,-half-.74,1.83),(.06,.73,.40),'618d92',.022)
        draft.box((side*.974,-half-.72,1.27),(.042,.35,.078),STEEL,.017)
        for y in wheels:
            draft.tube([(side*.85,y,.383),(side*1.096,y,.383)],[.379,.379],INK,16)
            draft.tube([(side*1.10,y,.383),(side*1.132,y,.383)],[.224,.224],STEEL,14)
            draft.tube([(side*1.132,y,.383),(side*1.145,y,.383)],[.112,.112],CREAM,10)
        for y in (-half+.36, 0, half-.34):
            draft.box((side*.964,y,1.25),(.04,.076,.33),'bdc3ae',.013)
        draft.plate(rounded_panel(side*.463,1.433,.821,1.472,.074), half+.041,.095,'8aa29e',.04)
        draft.plate(rounded_panel(side*.463,1.458,.72,1.31,.047),half+.101,.045,paint,.017)
        for z in (1.07,1.97):
            draft.box((side*.746,half+.129,z),(.107,.077,.171),STEEL,.023)
        draft.box((side*.17,half+.141,1.441),(.061,.095,1.16),STEEL,.018)
        draft.plate(rounded_panel(side*.684,.747,.24,.121,.043),half+.083,.067,'b8423f',.018)
        draft.plate(rounded_panel(side*.684,.75,.146,.054,.019),half+.122,.032,'ef8d7d',.008)
    draft.box((0,half+.084,.554),(1.79,.20,.162),INK,.045)
    draft.box((0,half+.197,.565),(.37,.02,.105),'decea3',.006)
    return draft


def ramp():
    draft = MeshDraft()
    shape = [(-.85,0),(.85,0),(.85,3),(-.85,3)]
    draft.rings([[(x,y,2.3*(1-y/3)+h) for x,y in shape] for h in (-.114,0)], 'a68e62')
    for y in (.31, .93, 1.55, 2.17, 2.79):
        z = 2.3 * (1-y/3)
        for x in (-.45, .45):
            draft.tube([(x-.28,y,z+.008),(x+.28,y,z+.008)],[.024,.024],INK,6)
        draft.plate([(-.175,z-.02),(0,z+.066),(.175,z-.02)],y+.029,.038,CREAM,.007)
    for x in (-.805,.805):
        draft.tube([(x,.014,2.29),(x,2.99,.013)],[.036,.036],AMBER,7)
    return draft


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source_dir', type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    args.source_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    material = painted_material()
    models = {
        'Alarm': alarm(), 'Barrier': barrier(), 'OilGate': oil_gate(),
        'EmoBoard': emo_board(), 'Phone': phone(), 'TruckShort': cargo(2.3),
        'TruckLong': cargo(6), 'TruckRamp': ramp(),
    }
    objects = [draft.object(name, material) for name, draft in models.items()]
    for obj in objects:
        obj.data.validate()
    export_glb(objects, Path(__file__).resolve().parent.parent / 'assets' / 'obstacle-kit.glb')
    for index, obj in enumerate(objects):
        obj.location.x = (index - 3.5) * 2.85
    save_source(args.source_dir / 'obstacle-kit.blend')


if __name__ == '__main__':
    main()
