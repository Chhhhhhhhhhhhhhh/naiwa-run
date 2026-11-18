# -*- coding: utf-8 -*-
import json, struct, numpy as np
p = r"D:\奶蛙快跑\assets\49409c35-2e43-46f8-87f4-f85cf8df7d0a.glb"
d = open(p, "rb").read()
ln = struct.unpack("<I", d[12:16])[0]
g = json.loads(d[20:20+ln])
bv = g["bufferViews"][g["accessors"][0]["bufferView"]]
pos = np.frombuffer(d, np.float32, g["accessors"][0]["count"]*3, 20+ln+8+bv.get("byteOffset", 0)).reshape(-1, 3)
v = pos[pos[:, 1] > 0.05]
z0, z1 = v[:, 2].min(), v[:, 2].max()
print("z range", z0, z1, "| x range", v[:, 0].min(), v[:, 0].max(), "| y range", v[:, 1].min(), v[:, 1].max())
for i in range(12):
    lo = z0 + (z1-z0)*i/12; hi = z0 + (z1-z0)*(i+1)/12
    s = v[(v[:, 2] >= lo) & (v[:, 2] < hi)]
    if len(s) == 0:
        print(i, "empty"); continue
    print(i, "z=%.2f..%.2f" % (lo, hi), "topY=%.2f" % s[:, 1].max(), "xW=%.2f" % (s[:, 0].max()-s[:, 0].min()), "n=%d" % len(s))
print("x median", np.median(v[:, 0]))

