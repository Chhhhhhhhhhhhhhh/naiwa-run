# -*- coding: utf-8 -*-
import json, struct, numpy as np
from PIL import Image

p = r"D:\奶蛙快跑\assets\tripo_convert_820779b7-0c09-4c76-8cd6-a7156d9b61d3.glb"
d = open(p, 'rb').read()
ln = struct.unpack('<I', d[12:16])[0]
js = ln + 20
g = json.loads(d[20:js])
off = js
blobs = []
while off + 8 <= len(d):
    cl, ct = struct.unpack('<II', d[off:off+8]); off += 8
    blobs.append((ct, d[off:off+cl])); off += cl
bin_ = blobs[0][1]

def acc(i):
    a = g['accessors'][i]; bv = g['bufferViews'][a['bufferView']]
    dt = {5126: np.float32, 5125: np.uint32}[a['componentType']]
    n = {'VEC3': 3, 'VEC2': 2, 'SCALAR': 1}[a['type']]
    return np.frombuffer(bin_, dtype=dt, count=a['count']*n, offset=bv.get('byteOffset', 0)).reshape(-1, n)

pos, nrm, idx = acc(0), acc(1), acc(3).ravel()
lo, hi = pos.min(0), pos.max(0)
print('bbox', lo, hi, 'verts', len(pos), 'tris', len(idx)//3)
c = (lo + hi) / 2; sz = (hi - lo).max()
P = (pos - c) / sz

def render(view, file):
    ax = {'front': 2, 'side': 0, 'top': 1}[view]
    u = (ax + 1) % 3; v = (ax + 2) % 3
    W = 480
    px = np.full((W, W, 3), 245.0)
    zbuf = np.full((W, W), 1e9)
    L = np.array([0.4, 0.6, 0.7]); L = L / np.linalg.norm(L)
    tri = P[idx.reshape(-1, 3)]; ntri = nrm[idx.reshape(-1, 3)]
    order = np.argsort(tri[:, :, v].mean(1))
    tri, ntri = tri[order], ntri[order]
    shade = np.clip(np.abs(ntri) @ L, 0, 1) * 0.85 + 0.15
    pix = (tri[:, :, [u, v]] * 0.46 + 0.5) * (W - 1)
    base = np.array([255, 214, 64], float)
    white = np.array([240, 240, 240], float)
    for t in range(len(tri)):
        xs, ys = pix[t, :, 0], pix[t, :, 1]
        x0i = max(int(xs.min()), 0); x1i = min(int(xs.max()) + 1, W - 1)
        y0i = max(int(ys.min()), 0); y1i = min(int(ys.max()) + 1, W - 1)
        if x1i < x0i or y1i < y0i: continue
        d0x, d0y = xs[1]-xs[0], ys[1]-ys[0]
        d1x, d1y = xs[2]-xs[0], ys[2]-ys[0]
        det = d0x*d1y - d0y*d1x
        if abs(det) < 1e-9: continue
        xx, yy = np.mgrid[x0i:x1i+1, y0i:y1i+1]
        xx = xx.T; yy = yy.T  # match [row=h? ] keep simple: use xx as x
        w0 = ((xx-xs[0])*d1y - (yy-ys[0])*d1x) / det
        w1 = (-(xx-xs[0])*d0y + (yy-ys[0])*d0x) / det
        w2 = 1 - w0 - w1
        m = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02)
        if not m.any(): continue
        z = tri[t, :, ax].mean()
        sub = zbuf[y0i:y1i+1, x0i:x1i+1]
        ok = m & (z < sub)
        if not ok.any(): continue
        sub[ok] = z
        col = base * shade[t] + white * (1 - shade[t])
        px[y0i:y1i+1, x0i:x1i+1][ok] = col
    Image.fromarray(px.astype(np.uint8)).transpose(Image.FLIP_TOP_BOTTOM).save(file)
    print('saved', file)

render('front', r"D:\奶蛙快跑\assets\preview2_front.png")
render('side', r"D:\奶蛙快跑\assets\preview2_side.png")
render('top', r"D:\奶蛙快跑\assets\preview2_top.png")

