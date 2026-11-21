/* three.js 程序化建模：奶龙(软胶质感·按照片) + 大众化热梗障碍 + 地铁跑酷场景 */
const Models = (() => {
  const truckGeometry = Object.freeze({
    shortHalf: 2.3, longHalf: 6, roofHeight: 2.3, roofWidth: 1.95,
    cabLength: 1.4, cabOverhang: 0.2, rampLength: 3, rampWidth: 1.7,
  });
  let gradientMap = null;
  function toonGrad() {
    if (gradientMap) return gradientMap;
    // three.js r128 MeshToonMaterial 采样 gradientMap.rgb，需用 RGBA 灰度贴图避免 WebGL2 下 RedFormat 偏红
    const stops = [115, 175, 225, 255];
    const data = new Uint8Array(stops.length * 4);
    stops.forEach((v, i) => {
      const o = i * 4;
      data[o] = v; data[o + 1] = v; data[o + 2] = v; data[o + 3] = 255;
    });
    gradientMap = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.generateMipmaps = false;
    gradientMap.needsUpdate = true;
    return gradientMap;
  }
  const T = (color) => new THREE.MeshToonMaterial({ color, gradientMap: toonGrad() });
  const L = (color) => new THREE.MeshLambertMaterial({ color });
  const P = (color, shininess = 30, emissive = 0x000000) => new THREE.MeshPhongMaterial({ color, shininess, specular: 0x3a3a3a, emissive });
  const Basic = (color) => new THREE.MeshBasicMaterial({ color });

  function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = false;
    return m;
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const sph = (r, ws = 18, hs = 14) => new THREE.SphereGeometry(r, ws, hs);
  const cyl = (rt, rb, h, s = 14) => new THREE.CylinderGeometry(rt, rb, h, s);

  const streetKit = new Map();
  const obstacleKit = new Map();
  let thanosAsset = null;
  function preparePaintedAsset(source) {
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    const paint = new THREE.Color();
    source.traverse(node => {
      if (!node.isMesh) return;
      const attribute = node.geometry.getAttribute('color');
      // Match the current renderer's color encoding while keeping standard linear colors in the GLB.
      const scale = attribute.normalized ? (attribute.array instanceof Uint16Array ? 65535 : 255) : 1;
      for (let i = 0; i < attribute.count; i++) {
        paint.setRGB(attribute.getX(i) / scale, attribute.getY(i) / scale, attribute.getZ(i) / scale);
        paint.convertLinearToSRGB();
        attribute.setXYZ(i, paint.r * scale, paint.g * scale, paint.b * scale);
      }
      node.material.dispose();
      node.material = material;
      node.userData.sharedAsset = true;
    });
  }
  function installStreetKit(source) {
    preparePaintedAsset(source);
    source.traverse(node => { if (node.isMesh) streetKit.set(node.name, node); });
  }
  function recolorTruckYellow(node, isLong) {
    const attr = node.geometry.getAttribute('color');
    const pos = node.geometry.getAttribute('position');
    if (!attr || !pos) return;
    const scale = attr.normalized ? (attr.array instanceof Uint16Array ? 65535 : 255) : 1;
    const c = new THREE.Color();
    // 源颜色（已转成 sRGB）：长车车身 TEAL(#397c77)、短车车身砖红(#b86149)、车顶(#52646a)、车头(#374d52)、车尾门框(#8aa29e)
    const bodySrc = new THREE.Color(isLong ? 0x397c77 : 0xb86149);
    const roofSrc = new THREE.Color(0x52646a);
    const cabSrc = new THREE.Color(0x374d52);
    const trimSrc = new THREE.Color(0x8aa29e);
    const bodyDst = new THREE.Color(0xf6c536); // 明亮明黄车厢
    const roofDst = new THREE.Color(0xe3b12c); // 略深金黄车顶（保留层次与对比）
    const cabDst = new THREE.Color(0xe0a122);  // 暖琥珀黄车头
    const trimDst = new THREE.Color(0xf9e395); // 浅奶黄门框
    const dist = (a, b) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
    const applyWithShade = (dst, src) => {
      const lumSrc = Math.max(0.05, src.r * 0.299 + src.g * 0.587 + src.b * 0.114);
      const lumCur = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
      const shade = THREE.MathUtils.clamp(lumCur / lumSrc, 0.78, 1.06);
      c.copy(dst).multiplyScalar(shade);
    };
    for (let i = 0; i < attr.count; i++) {
      c.setRGB(attr.getX(i) / scale, attr.getY(i) / scale, attr.getZ(i) / scale);
      const y = pos.getY(i);
      if (dist(c, bodySrc) < 0.09) applyWithShade(bodyDst, bodySrc);
      else if (dist(c, trimSrc) < 0.08) applyWithShade(trimDst, trimSrc);
      else if (y > 2.15 && dist(c, roofSrc) < 0.08) applyWithShade(roofDst, roofSrc);
      else if (y > 0.45 && dist(c, cabSrc) < 0.07) applyWithShade(cabDst, cabSrc);
      else continue;
      attr.setXYZ(i, Math.min(1, c.r) * scale, Math.min(1, c.g) * scale, Math.min(1, c.b) * scale);
    }
    attr.needsUpdate = true;
  }
  function installObstacleKit(source) {
    preparePaintedAsset(source);
    source.traverse(node => {
      if (!node.isMesh) return;
      if (node.name === 'TruckLong') recolorTruckYellow(node, true);
      else if (node.name === 'TruckShort') recolorTruckYellow(node, false);
      obstacleKit.set(node.name, node);
    });
  }
  function installThanos(source) {
    preparePaintedAsset(source);
    thanosAsset = source.getObjectByName('Thanos');
  }
  function assetInstance(source, castShadow = false) {
    const instance = source.clone(false);
    instance.castShadow = castShadow;
    return instance;
  }
  function obstaclePart(name) {
    const source = obstacleKit.get(name);
    return source ? assetInstance(source, true) : null;
  }
  function streetPart(name) {
    const source = streetKit.get(name);
    if (!source) return null;
    const instance = assetInstance(source);
    if (streetKit.has(name + 'Far')) instance.userData.streetModel = name;
    return instance;
  }
  function setStreetDetail(root, far) {
    const body = root.isMesh ? root : root.children[0];
    const name = body?.userData.streetModel;
    if (name) body.geometry = streetKit.get(far ? name + 'Far' : name).geometry;
    const hide = root.userData.farHide;
    if (hide) for (const node of hide) node.visible = !far;
  }
  function mergeStatic(parts, material, { vertexColors = false, withUV = false } = {}) {
    const vertexCount = parts.reduce((sum, m) => sum + m.geometry.attributes.position.count, 0);
    const indexCount = parts.reduce((sum, m) => sum + (m.geometry.index?.count ?? m.geometry.attributes.position.count), 0);
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const colors = vertexColors ? new Float32Array(vertexCount * 3) : null;
    const uvs = withUV ? new Float32Array(vertexCount * 2) : null;
    const indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
    const normal = new THREE.Matrix3(), temp = new THREE.Vector3();
    let vertex = 0, index = 0;
    for (const part of parts) {
      part.updateMatrix();
      const { position, normal: direction, uv } = part.geometry.attributes;
      normal.getNormalMatrix(part.matrix);
      for (let i = 0; i < position.count; i++) {
        const o3 = (vertex + i) * 3;
        temp.fromBufferAttribute(position, i).applyMatrix4(part.matrix).toArray(positions, o3);
        temp.fromBufferAttribute(direction, i).applyNormalMatrix(normal).normalize().toArray(normals, o3);
        if (colors) part.material.color.toArray(colors, o3);
        if (uvs && uv) {
          const o2 = (vertex + i) * 2;
          uvs[o2] = uv.getX(i);
          uvs[o2 + 1] = uv.getY(i);
        }
      }
      const sourceIndices = part.geometry.index?.array;
      if (sourceIndices) {
        for (const source of sourceIndices) indices[index++] = vertex + source;
      } else {
        for (let i = 0; i < position.count; i++) indices[index++] = vertex + i;
      }
      vertex += position.count;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    if (colors) geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    if (uvs) geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    return new THREE.Mesh(geometry, material);
  }
  // Bake each stationary prop's solid pieces into one draw per lighting mode.
  // Textures, translucent glass and text sprites keep their individual materials.
  function batchScenery(root) {
    root.updateMatrixWorld(true);
    const inverse = root.matrixWorld.clone().invert();
    for (const Material of [THREE.MeshLambertMaterial, THREE.MeshBasicMaterial]) {
      const parts = [];
      root.traverse(m => {
        if (m !== root && m.isMesh && !m.userData.sharedAsset && m.material instanceof Material &&
            !m.material.map && !m.material.transparent && !m.castShadow && !m.receiveShadow) parts.push(m);
      });
      if (parts.length < 2) continue;

      const vertexCount = parts.reduce((sum, m) => sum + m.geometry.attributes.position.count, 0);
      const indexCount = parts.reduce((sum, m) => sum + (m.geometry.index?.count ?? m.geometry.attributes.position.count), 0);
      const positions = new Float32Array(vertexCount * 3);
      const normals = new Float32Array(vertexCount * 3);
      const colors = new Float32Array(vertexCount * 3);
      const indices = new Uint16Array(indexCount);
      const local = new THREE.Matrix4(), normal = new THREE.Matrix3(), temp = new THREE.Vector3();
      const materials = new Set();
      let vertex = 0, index = 0;
      for (const part of parts) {
        const { position, normal: direction } = part.geometry.attributes;
        local.multiplyMatrices(inverse, part.matrixWorld);
        normal.getNormalMatrix(local);
        for (let i = 0; i < position.count; i++) {
          const offset = (vertex + i) * 3;
          temp.fromBufferAttribute(position, i).applyMatrix4(local).toArray(positions, offset);
          temp.fromBufferAttribute(direction, i).applyNormalMatrix(normal).toArray(normals, offset);
          part.material.color.toArray(colors, offset);
        }
        const sourceIndices = part.geometry.index?.array;
        if (sourceIndices) {
          for (const source of sourceIndices) indices[index++] = vertex + source;
        } else {
          for (let i = 0; i < position.count; i++) indices[index++] = vertex + i;
        }
        vertex += position.count;
        part.parent.remove(part);
        part.geometry.dispose();
        materials.add(part.material);
      }
      for (const material of materials) material.dispose();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      root.add(new THREE.Mesh(geometry, new Material({ vertexColors: true })));
    }
    return root;
  }

  function characterShadows() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const fade = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    for (const [stop, alpha] of [[0, 0.68], [0.26, 0.55], [0.60, 0.24], [1, 0]]) {
      fade.addColorStop(stop, `rgba(30,39,49,${alpha})`);
    }
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, 64, 64);
    const map = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(1, 1);
    return [0, 1].map(() => new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      map, transparent: true, depthWrite: false,
    })));
  }

  // 同一段文字只画一次画布，Sprite 之间共享贴图，减少跑图时的 canvas 绘制和显存上涨。
  const labelTextures = new Map();
  function labelTexture(text, bg, fg) {
    const key = `${text}|${bg}|${fg}`;
    let tex = labelTextures.get(key);
    if (tex) return tex;
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 96;
    const c = cv.getContext('2d');
    c.fillStyle = bg;
    const r = 22;
    c.beginPath();
    c.moveTo(r, 4); c.arcTo(252, 4, 252, 92, r); c.arcTo(252, 92, 4, 92, r);
    c.arcTo(4, 92, 4, 4, r); c.arcTo(4, 4, 252, 4, r); c.closePath(); c.fill();
    c.lineWidth = 6; c.strokeStyle = '#3a2b20'; c.stroke();
    c.font = 'bold 44px "ZCOOL KuaiLe","Microsoft YaHei",sans-serif';
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, 128, 50);
    tex = new THREE.CanvasTexture(cv);
    labelTextures.set(key, tex);
    return tex;
  }
  function label(text, bg = '#fff6e3', fg = '#3a2b20', w = 2.0) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(text, bg, fg), transparent: true, depthTest: true }));
    sp.scale.set(w, w * 96 / 256, 1);
    sp.userData.sharedAsset = true; // 贴图是共享缓存，回收时不要 dispose
    return sp;
  }

  /* ---------- 奶龙：圆顶头+正面绿眼大黑瞳+奶白大肚皮+炭灰手贴肚侧+锥形长腿（软胶） ---------- */
  function naiwa() {
    const g = new THREE.Group();
    const YEL = 0xffd93f, CREAM = 0xfff2d6, GREEN = 0x63a44a, DARK = 0x4f4f4f, INKC = 0x5a4a28, BLACK = 0x141414;
    // 奶娃黄：与门架牌子完全同色 #ffd93f，用烘焙渐变贴图，不再被草地/天空的绿色环境光染色
    const yelCv = document.createElement('canvas');
    yelCv.width = 8; yelCv.height = 256;
    const yelCtx = yelCv.getContext('2d');
    const yelGrad = yelCtx.createLinearGradient(0, 0, 0, 256);
    yelGrad.addColorStop(0, '#fff3a0');
    yelGrad.addColorStop(0.35, '#ffe45c');
    yelGrad.addColorStop(0.72, '#ffd93f');
    yelGrad.addColorStop(1, '#f5c81f');
    yelCtx.fillStyle = yelGrad; yelCtx.fillRect(0, 0, 8, 256);
    const YELMAT = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(yelCv) });

    const torso = new THREE.Group();
    torso.position.y = 0.55;
    g.add(torso);

    // 圆顶头 + 梨形鼓肚 连续轮廓
    const pts = [
      [0.0, 0.0], [0.28, 0.02], [0.42, 0.10], [0.52, 0.30], [0.56, 0.55],
      [0.52, 0.80], [0.44, 1.00], [0.36, 1.08], [0.34, 1.16], [0.33, 1.30],
      [0.28, 1.42], [0.18, 1.50], [0.06, 1.54], [0.0, 1.55],
    ].map(p => new THREE.Vector2(p[0], p[1]));
    const body = mesh(new THREE.LatheGeometry(pts, 48), YELMAT);
    torso.add(body);

    // 奶白大肚皮（正面大椭圆）
    const belly = mesh(sph(0.5, 28, 22), P(CREAM, 18), 0, 0.55, -0.40);
    belly.scale.set(0.9, 1.05, 0.42);
    torso.add(belly);

    // 绿眼大黑瞳（头部正面，两眼较近）
    for (const s of [-1, 1]) {
      torso.add(mesh(sph(0.12, 20, 16), P(GREEN, 50), s * 0.13, 1.30, -0.28));
      const pup = mesh(sph(0.085, 16, 12), new THREE.MeshPhongMaterial({ color: 0x0a0a0a, shininess: 90, specular: 0x999999 }), s * 0.13, 1.30, -0.375, false);
      torso.add(pup);
    }
    // 细微笑嘴
    const smile = mesh(new THREE.TorusGeometry(0.08, 0.016, 8, 24, Math.PI * 0.8), P(INKC, 10), 0, 1.18, -0.42, false);
    smile.rotation.z = Math.PI + (Math.PI - Math.PI * 0.8) / 2;
    torso.add(smile);

    // 短臂 + 炭灰手贴在肚侧（肩部枢轴）
    const arms = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 0.48, 0.95, 0);
      arm.add(mesh(cyl(0.07, 0.08, 0.32, 10), YELMAT, 0, -0.15, -0.03));
      arm.add(mesh(sph(0.13, 14, 12), P(BLACK, 30), 0, -0.34, -0.14));
      arm.rotation.z = s * 0.1;
      torso.add(arm); arms.push(arm);
    }

    // 锥形长腿 + 圆脚（髋部枢轴）
    const legs = [];
    for (const s of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(s * 0.20, 0.55, 0);
      leg.add(mesh(cyl(0.12, 0.16, 0.45, 12), YELMAT, 0, -0.22, 0));
      const foot = mesh(sph(0.155, 14, 12), P(BLACK, 30), 0, -0.50, -0.05);
      foot.scale.set(1, 0.5, 1.4);
      leg.add(foot);
      g.add(leg); legs.push(leg);
    }

    // 奶蛋（滑铲时蜷缩成蛋向前翻滚）
    const eggG = new THREE.Group();
    eggG.position.y = 0.55;
    const shell = sph(0.55, 32, 24);
    const points = shell.attributes.position;
    const colors = new Float32Array(points.count * 3);
    const honey = new THREE.Color(0xf1ad42), yellow = new THREE.Color(0xffdb69);
    const cream = new THREE.Color(0xffebc1), color = new THREE.Color();
    for (let i = 0; i < points.count; i++) {
      const x = points.getX(i), y = points.getY(i), z = points.getZ(i);
      const belly = (x / 0.37) ** 2 + ((y + 0.07) / 0.39) ** 2;
      const patch = z < 0 ? 1 - THREE.MathUtils.smoothstep(belly, 0.78, 1.04) : 0;
      color.copy(honey).lerp(yellow, (y + 0.55) / 1.1).lerp(cream, patch);
      color.toArray(colors, i * 3);
    }
    shell.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    eggG.add(mesh(shell, new THREE.MeshBasicMaterial({ vertexColors: true }), 0, 0, 0));
    eggG.visible = false;
    g.add(eggG);

    // 屁股/背部卡通火箭推进器 + 动态尾焰（拾取火箭道具后显示，贴合 GLB 背部轮廓 z≈+0.64）
    const aura = new THREE.Group();
    aura.position.set(0, 0.78, 0.66);
    const rocketPivot = new THREE.Group();
    rocketPivot.rotation.x = -0.32; // 略微朝后下方倾斜喷射
    const rCol = hex => ({ color: new THREE.Color(hex) });
    const rocketParts = [
      mesh(cyl(0.15, 0.18, 0.56, 12), rCol(0xff523b), 0, 0, 0, false),          // 红箭身
      mesh(cyl(0.01, 0.15, 0.24, 12), rCol(0xffd447), 0, 0.40, 0, false),       // 金尖头
      mesh(cyl(0.165, 0.175, 0.09, 12), rCol(0xfff4d6), 0, 0.14, 0, false),     // 奶油环带
      mesh(cyl(0.11, 0.16, 0.14, 12), rCol(0x3a4652), 0, -0.34, 0, false),      // 金属喷口
      mesh(box(0.05, 0.26, 0.18), rCol(0xffcf3f), 0.18, -0.18, 0, false),       // 右尾翼
      mesh(box(0.05, 0.26, 0.18), rCol(0xffcf3f), -0.18, -0.18, 0, false),      // 左尾翼
      mesh(box(0.18, 0.26, 0.05), rCol(0xffcf3f), 0, -0.18, 0.18, false),       // 后尾翼
    ];
    const rocketBody = mergeStatic(rocketParts, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGrad() }), { vertexColors: true });
    for (const p of rocketParts) p.geometry.dispose();
    rocketPivot.add(rocketBody);
    const auraFlames = [];
    for (let i = 0; i < 3; i++) {
      const flame = mesh(cyl(0.015, 0.18 - i * 0.04, 0.48 + i * 0.14, 10),
        Basic([0xff5c3f, 0xffb03f, 0xfff066][i]), 0, -(0.62 + i * 0.22), 0, false);
      flame.rotation.x = Math.PI;
      rocketPivot.add(flame);
      auraFlames.push(flame);
    }
    aura.add(rocketPivot);
    aura.visible = false;
    g.add(aura);
    // 空中翻转枢轴：绕身体中心旋转，避免绕脚底翻转时穿进地面
    const spin = new THREE.Group();
    spin.position.y = 1.0;
    for (const ch of [...g.children]) { ch.position.y -= 1.0; spin.add(ch); }
    g.add(spin);

    g.userData = { body, belly, arms, legs, torso, egg: eggG, aura, auraFlames, spin };
    return g;
  }

  /* ---------- 大众化热梗障碍 ---------- */
  const obstacleLooks = {
    alarm: ['Alarm', '跳过闹钟', '#8f352d', '#fff2d3', 1.84, 1.48],
    gang: ['Barrier', '跨过去', '#914c37', '#fff0cd', 1.41, 1.22],
    bing: ['OilGate', '滑过油饼', '#295c58', '#fff1ca', 1.75, 2.66],
    emo: ['EmoBoard', 'EMO', '#59456f', '#f8e4f3', 1.27, 2.55],
    phone: ['Phone', '低头族', '#294d59', '#e4f5ea', 1.48, 2.61],
  };

  function doubaoFallback() {
    const g = new THREE.Group();
    const skin = L(0xeab29b), coat = L(0x32404a), hair = L(0x4e3028);
    g.add(mesh(cyl(0.23, 0.36, 0.82, 12), coat, 0, 0.94, 0));
    g.add(mesh(sph(0.36, 16, 12), hair, 0, 1.76, -0.025));
    g.add(mesh(sph(0.30, 16, 12), skin, 0, 1.69, 0.10));
    g.add(mesh(cyl(0.239, 0.24, 0.11, 12), L(0xb4483b), 0, 1.34, 0.02));
    const arms = [];
    for (const side of [-1, 1]) {
      g.add(mesh(sph(0.042, 10, 8), Basic(0x30251f), side * 0.104, 1.718, 0.373, false));
      g.add(mesh(box(0.19, 0.61, 0.21), coat, side * 0.15, 0.405, -0.005));
      g.add(mesh(box(0.21, 0.139, 0.31), L(0xe2ddca), side * 0.15, 0.075, 0.054));
      const arm = new THREE.Group();
      arm.position.set(side * 0.26, 1.23, 0.01);
      arm.add(mesh(cyl(0.088, 0.076, 0.43, 10), coat, 0, -0.195, 0));
      arm.add(mesh(sph(0.076, 10, 8), skin, 0, -0.43, 0.019));
      arms.push(arm);
      g.add(arm);
    }
    g.userData.arms = arms;
    return g;
  }

  let alarmFaceMaterial, alarmStripeMaterial;
  function alarmObstacle() {
    if (!alarmFaceMaterial) {
      const dial = document.createElement('canvas');
      dial.width = dial.height = 192;
      const d = dial.getContext('2d');
      d.fillStyle = '#fff2d8';
      d.fillRect(0, 0, 192, 192);
      d.strokeStyle = '#462820';
      d.lineCap = 'round';
      for (let hour = 0; hour < 12; hour++) {
        const angle = hour * Math.PI / 6;
        const x = Math.sin(angle), y = -Math.cos(angle);
        const inner = hour % 3 === 0 ? 64 : 72;
        d.lineWidth = hour % 3 === 0 ? 6 : 3;
        d.beginPath();
        d.moveTo(96 + x * inner, 96 + y * inner);
        d.lineTo(96 + x * 82, 96 + y * 82);
        d.stroke();
      }
      d.lineWidth = 10;
      d.beginPath();
      d.moveTo(61, 116); d.lineTo(96, 96); d.lineTo(96, 46);
      d.stroke();
      d.fillStyle = '#d04838';
      d.beginPath();
      d.arc(96, 96, 8, 0, Math.PI * 2);
      d.fill();
      alarmFaceMaterial = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(dial) });

      const stripes = document.createElement('canvas');
      stripes.width = 256; stripes.height = 64;
      const s = stripes.getContext('2d');
      s.fillStyle = '#ffcb51'; s.fillRect(0, 0, 256, 64);
      s.fillStyle = '#3c302a';
      for (let x = -36; x < 256; x += 52) {
        s.beginPath();
        s.moveTo(x, 64); s.lineTo(x + 31, 64);
        s.lineTo(x + 70, 0); s.lineTo(x + 39, 0);
        s.fill();
      }
      alarmStripeMaterial = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(stripes) });
    }

    const g = new THREE.Group();
    const red = T(0xd74631), dark = T(0x493132), orange = T(0xf47746);
    g.add(mesh(box(1.72, 0.28, 0.52), red, 0, 0.245, 0));
    g.add(mesh(new THREE.PlaneGeometry(1.61, 0.206), alarmStripeMaterial, 0, 0.245, 0.262, false));
    for (const side of [-1, 1]) {
      g.add(mesh(box(0.29, 0.12, 0.68), dark, side * 0.65, 0.06, 0));
      const bell = mesh(sph(0.154, 14, 10), orange, side * 0.35, 0.985, 0);
      bell.scale.set(1.05, 0.67, 1.08); g.add(bell);
    }
    const body = mesh(cyl(0.431, 0.431, 0.31, 28), red, 0, 0.57, 0);
    body.rotation.x = Math.PI / 2; g.add(body);
    const rim = mesh(cyl(0.376, 0.376, 0.034, 28), dark, 0, 0.57, 0.158);
    rim.rotation.x = Math.PI / 2; g.add(rim);
    g.add(mesh(new THREE.CircleGeometry(0.342, 28), alarmFaceMaterial, 0, 0.57, 0.177, false));
    const warning = label('跳过闹钟', '#982d27', '#fff3d9', 1.89);
    warning.position.set(0, 1.42, 0.17);
    g.add(warning);
    return g;
  }

  function obstacle(type) {
    const look = obstacleLooks[type];
    const painted = look && obstaclePart(look[0]);
    if (painted) {
      const g = new THREE.Group();
      const [, caption, bg, fg, width, y] = look;
      const sign = label(caption, bg, fg, width);
      sign.position.set(0, y, 0.22);
      g.add(painted, sign);
      return g;
    }
    if (type === 'alarm') return alarmObstacle();
    const g = new THREE.Group();
    if (type === 'gang') {
      for (const s of [-1, 1]) g.add(mesh(box(0.1, 0.85, 0.1), T(0xc9c2d8), s * 0.5, 0.42, 0));
      for (let i = 0; i < 5; i++)
        g.add(mesh(box(0.22, 0.3, 0.12), T(i % 2 ? 0xfff6e3 : 0xffb03f), -0.44 + i * 0.22, 0.72, 0));
      const lb = label('杠精', '#fff0d9', '#a86a1f', 1.2); lb.position.set(0, 1.25, 0); g.add(lb);
    } else if (type === 'bing') {
      for (const s of [-1, 1]) g.add(mesh(box(0.12, 2.3, 0.12), T(0xc9a06a), s * 1.05, 1.15, 0));
      g.add(mesh(box(2.3, 0.14, 0.2), T(0xc9a06a), 0, 2.3, 0));
      g.add(mesh(cyl(0.02, 0.02, 0.5, 6), T(0x3a2b20), 0, 2.0, 0));
      const cake = mesh(cyl(0.55, 0.55, 0.18, 24), T(0xf2c14e), 0, 1.5, 0);
      cake.rotation.x = Math.PI / 2; g.add(cake);
      const lb = label('食不食油饼', '#f7e6c4', '#8a5a1a', 1.7); lb.position.set(0, 2.75, 0); g.add(lb);
    } else if (type === 'thanos') {
      if (thanosAsset) g.add(assetInstance(thanosAsset, true));
      else {
        const fallback = new THREE.Group();
        fallback.add(mesh(box(0.94, 0.98, 0.45), T(0x3b4067), 0, 0.89, 0));
        fallback.add(mesh(box(0.82, 0.21, 0.46), T(0xb88748), 0, 1.38, 0.02));
        fallback.add(mesh(sph(0.42, 16, 12), T(0xa06eb9), 0, 1.81, 0));
        fallback.add(mesh(sph(0.26, 14, 10), T(0xd8a657), 0.63, 1.28, 0.21));
        g.add(fallback);
      }
      const lb = label('灭霸', '#eadcfa', '#462f68', 1.23);
      lb.position.set(0, 2.48, 0.12);
      g.add(lb);
    } else if (type === 'emo') {
      g.add(mesh(box(1.2, 2.2, 0.3), T(0x4a3b6b), 0, 1.1, 0));
      g.add(mesh(box(1.28, 2.28, 0.06), T(0x6b5a94), 0, 1.1, 0.13, false));
      for (const s of [-1, 1]) g.add(mesh(sph(0.07, 10, 8), Basic(0xb8a8e0), s * 0.25, 1.5, 0.19, false));
      for (const s of [-1, 1]) g.add(mesh(box(0.06, 0.26, 0.04), Basic(0x8fc7ff), s * 0.25, 1.24, 0.19, false)); // 眼泪
      const frown = mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 16, Math.PI * 0.7), Basic(0xb8a8e0), 0, 1.05, 0.19, false);
      frown.rotation.z = Math.PI * 0.15; g.add(frown);
      const lb = label('EMO', '#e6e0f2', '#4a3b6b', 1.3); lb.position.set(0, 2.6, 0); g.add(lb);
    } else {
      // 低头族手机墙（正面对着玩家：机身+刘海+短视频界面+弹幕+飘心，稍微歪一点像正被人刷）
      g.add(mesh(box(1.5, 2.3, 0.22), T(0x2b3038), 0, 1.15, 0));
      g.add(mesh(box(1.54, 0.1, 0.24), T(0x161a20), 0, 2.3, 0, false));
      g.add(mesh(box(1.34, 2.1, 0.06), Basic(0x14233c), 0, 1.18, 0.13));
      g.add(mesh(box(1.24, 1.96, 0.04), Basic(0x3b6fb0), 0, 1.2, 0.15));
      // 刘海 + 前置摄像头
      g.add(mesh(box(0.42, 0.08, 0.06), T(0x14181f), 0, 2.26, 0.15, false));
      g.add(mesh(sph(0.035, 8, 6), Basic(0x35506e), 0.22, 2.26, 0.15, false));
      // 播放键（深色圆底 + 大三角）
      const playBg = mesh(cyl(0.34, 0.34, 0.03, 22), Basic(0x0c1626), 0, 1.6, 0.17, false);
      playBg.rotation.x = Math.PI / 2; g.add(playBg);
      const tri = mesh(cyl(0.0, 0.26, 0.05, 3), Basic(0xffffff), 0, 1.6, 0.2, false);
      tri.rotation.z = -Math.PI / 2; tri.rotation.y = Math.PI / 2; g.add(tri);
      // 右侧点赞/评论图标
      for (const [yy, cc] of [[1.6, 0xff6b9d], [1.15, 0xffd93f], [0.75, 0x7ed957]]) {
        g.add(mesh(box(0.16, 0.16, 0.04), Basic(cc), 0.5, yy, 0.18, false));
      }
      // 弹幕条
      g.add(mesh(box(0.62, 0.1, 0.04), Basic(0xffffff), -0.2, 1.05, 0.18, false));
      g.add(mesh(box(0.5, 0.1, 0.04), Basic(0x7ed957), 0.08, 0.86, 0.18, false));
      // 底部进度条
      g.add(mesh(box(1.18, 0.04, 0.03), Basic(0x3a3f48), 0, 0.36, 0.17, false));
      g.add(mesh(box(0.6, 0.04, 0.04), Basic(0xff5c5c), -0.29, 0.36, 0.18, false));
      // 飘心
      g.add(mesh(sph(0.1, 10, 8), Basic(0xff6b9d), -0.45, 1.95, 0.18, false));
      g.add(mesh(sph(0.08, 10, 8), Basic(0xff9fcf), 0.42, 2.05, 0.18, false));
      const lb = label('低头族', '#e6f4ea', '#2e7d5b', 1.5); lb.position.set(0, 2.7, 0); g.add(lb);
      g.rotation.y = 0.08; g.rotation.x = -0.03;
    }
    return g;
  }

  /* ---------- 奶币 / 道具 ---------- */
  let coinProto = null;
  function milkBottleTexture() {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const c = cv.getContext('2d');
    // 上半瓶肩淡蓝透明感 + 下半饱满奶白液面，拉高层次与辨识度
    const glass = c.createLinearGradient(0, 0, 0, 68);
    glass.addColorStop(0, '#cdeaff');
    glass.addColorStop(1, '#eaf7ff');
    c.fillStyle = glass;
    c.fillRect(0, 0, 256, 68);

    const milk = c.createLinearGradient(0, 68, 0, 256);
    milk.addColorStop(0, '#ffffff');
    milk.addColorStop(0.78, '#fffaf0');
    milk.addColorStop(1, '#ede3d1');
    c.fillStyle = milk;
    c.fillRect(0, 68, 256, 188);

    // 清晰液面分界线
    c.fillStyle = '#7ec8f2';
    c.fillRect(0, 65, 256, 5);
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillRect(0, 70, 256, 4);

    // 底部柔和底边线
    c.fillStyle = '#d6c8b2';
    c.fillRect(0, 238, 256, 18);

    // 两组对称刻度线（瓶身旋转任意角度都清晰可见）
    for (const sx of [26, 154]) {
      c.fillStyle = '#244b73';
      c.fillRect(sx, 88, 3, 128);
      for (let i = 0; i <= 6; i++) {
        const y = 90 + i * 20;
        const long = i % 2 === 0;
        c.fillRect(sx + 3, y, long ? 18 : 10, long ? 4 : 3);
      }
      // 刻度旁的小亮蓝强调块
      c.fillStyle = '#ff5a96';
      c.fillRect(sx + 24, 129, 8, 6);
      c.fillRect(sx + 24, 169, 8, 6);
    }

    // 两组对称奶滴徽标（暖金+天蓝高对比）
    for (const cx of [96, 224]) {
      c.beginPath();
      c.arc(cx, 152, 24, 0, Math.PI * 2);
      c.fillStyle = '#48b8f0';
      c.fill();
      c.lineWidth = 4;
      c.strokeStyle = '#244b73';
      c.stroke();

      // 徽标内白奶滴
      c.beginPath();
      c.moveTo(cx, 136);
      c.bezierCurveTo(cx + 12, 150, cx + 11, 164, cx, 165);
      c.bezierCurveTo(cx - 11, 164, cx - 12, 150, cx, 136);
      c.fillStyle = '#fffef9';
      c.fill();

      // 顶部小金星点缀
      c.beginPath();
      c.arc(cx + 14, 136, 4.5, 0, Math.PI * 2);
      c.fillStyle = '#ffd447';
      c.fill();
    }

    // 玻璃竖向高光条
    for (const hx of [62, 190]) {
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.fillRect(hx, 18, 9, 212);
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }

  function coin() {
    // 精细高对比度小奶瓶：收腰瓶身 + 液位与刻度贴图 + 草莓粉螺旋盖 + 暖金奶嘴 + 卡通描边轮廓
    // 共享同一份几何/材质，跑图时只复制节点，避免每个奶币都新建材质触发着色器重编。
    if (!coinProto) {
      coinProto = new THREE.Group();
      const grad = toonGrad();

      // 1. 圆润收腰瓶身
      const bodyPts = [
        [0.001, -0.32], [0.16, -0.32], [0.225, -0.27], [0.245, -0.15],
        [0.215, 0.01], [0.23, 0.14], [0.195, 0.21], [0.145, 0.26], [0.001, 0.26],
      ].map(([r, y]) => new THREE.Vector2(r, y));
      const bodyMat = new THREE.MeshToonMaterial({
        map: milkBottleTexture(), color: 0xffffff, emissive: 0x24221e, gradientMap: grad,
      });
      coinProto.add(mesh(new THREE.LatheGeometry(bodyPts, 12), bodyMat, 0, 0, 0, false));

      // 2 & 3. 草莓粉螺旋瓶盖 + 白色锁边环 + 暖金硅胶奶嘴头，合并为 1 个顶点色网格降低 draw call
      const collarMat = { color: new THREE.Color(0xff4b8b) };
      const rimMat = { color: new THREE.Color(0xfff8ea) };
      const nippleMat = { color: new THREE.Color(0xffcf56) };
      const torusPart = mesh(new THREE.TorusGeometry(0.166, 0.018, 6, 12), collarMat, 0, 0.348, 0, false);
      torusPart.rotation.x = Math.PI / 2;
      const nipplePts = [
        [0.112, 0.352], [0.102, 0.382], [0.052, 0.422], [0.048, 0.448],
        [0.068, 0.476], [0.056, 0.502], [0.001, 0.514],
      ].map(([r, y]) => new THREE.Vector2(r, y));
      const topParts = [
        mesh(cyl(0.168, 0.168, 0.032, 12), rimMat, 0, 0.258, 0, false),
        mesh(cyl(0.162, 0.172, 0.092, 12), collarMat, 0, 0.312, 0, false),
        torusPart,
        mesh(new THREE.LatheGeometry(nipplePts, 10), nippleMat, 0, 0, 0, false),
      ];
      const topMat = new THREE.MeshToonMaterial({ vertexColors: true, emissive: 0x221210, gradientMap: grad });
      coinProto.add(mergeStatic(topParts, topMat, { vertexColors: true }));
      for (const p of topParts) p.geometry.dispose();

      // 4. 整瓶深棕卡通描边壳（BackSide），确保在沥青路面、黄色斜坡和远雾中对比度清晰
      const outlinePts = [
        [0.001, -0.348], [0.178, -0.346], [0.252, -0.285], [0.273, -0.15],
        [0.243, 0.01], [0.258, 0.145], [0.222, 0.22], [0.196, 0.26],
        [0.198, 0.358], [0.140, 0.384], [0.088, 0.44], [0.095, 0.486],
        [0.068, 0.528], [0.001, 0.542],
      ].map(([r, y]) => new THREE.Vector2(r, y));
      const outlineMat = new THREE.MeshBasicMaterial({ color: 0x33241a, side: THREE.BackSide });
      coinProto.add(mesh(new THREE.LatheGeometry(outlinePts, 12), outlineMat, 0, 0, 0, false));

      coinProto.rotation.z = -0.32;
      coinProto.traverse(n => { n.userData.sharedAsset = true; }); // 共享几何/材质，回收时不 dispose
    }
    return coinProto.clone(true);
  }

  // 空中高价值收集物：金装婴儿奶粉罐（仅 2 次 draw call：贴图罐体 + 深色描边）
  let powderProto = null;
  function milkPowderTexture() {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const c = cv.getContext('2d');
    // 顶部亮蓝塑料盖（v 接近 1 -> canvas y 靠上）
    const lid = c.createLinearGradient(0, 0, 0, 52);
    lid.addColorStop(0, '#4ec4ff');
    lid.addColorStop(0.55, '#1d8ee0');
    lid.addColorStop(1, '#176fb5');
    c.fillStyle = lid;
    c.fillRect(0, 0, 256, 52);
    // 上下银白金属卷边
    c.fillStyle = '#edf4f8'; c.fillRect(0, 52, 256, 14);
    c.fillStyle = '#334d63'; c.fillRect(0, 64, 256, 4);
    // 暖金罐身标签（在蓝天白云背景下对比度极强）
    const gold = c.createLinearGradient(0, 68, 0, 224);
    gold.addColorStop(0, '#ffe169');
    gold.addColorStop(0.5, '#ffbe33');
    gold.addColorStop(1, '#f0932b');
    c.fillStyle = gold;
    c.fillRect(0, 68, 256, 156);
    // 顶部/底部海军蓝+暖红装饰腰带
    c.fillStyle = '#1f4e7a'; c.fillRect(0, 68, 256, 12);
    c.fillStyle = '#e84a5f'; c.fillRect(0, 80, 256, 6);
    c.fillStyle = '#1f4e7a'; c.fillRect(0, 210, 256, 14);
    c.fillStyle = '#fff7e0'; c.fillRect(0, 102, 256, 90);
    // 底部金属边
    c.fillStyle = '#334d63'; c.fillRect(0, 224, 256, 4);
    c.fillStyle = '#dfe9ef'; c.fillRect(0, 228, 256, 28);

    // 双面对称深蓝圆徽标 + 醒目「奶粉」与「+5」
    for (const cx of [64, 192]) {
      c.beginPath();
      c.arc(cx, 147, 41, 0, Math.PI * 2);
      c.fillStyle = '#1d4f7c';
      c.fill();
      c.lineWidth = 5;
      c.strokeStyle = '#ffbe33';
      c.stroke();

      c.font = 'bold 34px "Microsoft YaHei","PingFang SC",sans-serif';
      c.fillStyle = '#fff9e6';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('奶粉', cx, 138, 72);

      c.font = 'bold 20px "Microsoft YaHei",sans-serif';
      c.fillStyle = '#ffd94a';
      c.fillText('+5', cx, 169);
    }
    // 两侧亮色金属高光条
    for (const hx of [120, 248]) {
      c.fillStyle = 'rgba(255,255,255,0.45)';
      c.fillRect(hx, 68, 8, 156);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }

  function milkPowder() {
    if (!powderProto) {
      powderProto = new THREE.Group();
      const grad = toonGrad();
      // 经典圆铁罐轮廓（带底座卷边 + 罐身 + 上沿卡扣 + 凸起塑料盖）
      const canPts = [
        [0.001, -0.32], [0.30, -0.32], [0.35, -0.29], [0.335, -0.24],
        [0.335, 0.20], [0.36, 0.23], [0.365, 0.30], [0.34, 0.33], [0.001, 0.33],
      ].map(([r, y]) => new THREE.Vector2(r, y));
      const canMat = new THREE.MeshToonMaterial({
        map: milkPowderTexture(), color: 0xffffff, emissive: 0x262014, gradientMap: grad,
      });
      powderProto.add(mesh(new THREE.LatheGeometry(canPts, 14), canMat, 0, 0, 0, false));

      // 深棕卡通描边，确保在蓝天白云中轮廓鲜明
      const outPts = [
        [0.001, -0.352], [0.325, -0.350], [0.382, -0.305], [0.368, -0.24],
        [0.368, 0.20], [0.392, 0.23], [0.396, 0.315], [0.362, 0.362], [0.001, 0.366],
      ].map(([r, y]) => new THREE.Vector2(r, y));
      const outMat = new THREE.MeshBasicMaterial({ color: 0x33241a, side: THREE.BackSide });
      powderProto.add(mesh(new THREE.LatheGeometry(outPts, 14), outMat, 0, 0, 0, false));

      powderProto.rotation.z = -0.18;
      powderProto.traverse(n => { n.userData.sharedAsset = true; });
    }
    return powderProto.clone(true);
  }

  const beaconTextures = {};
  const beaconFloor = new THREE.PlaneGeometry(1.5, 1.5);
  function pickupBeacon(color) {
    if (!beaconTextures.beam) {
      const beamCanvas = document.createElement('canvas');
      beamCanvas.width = 64; beamCanvas.height = 256;
      const beamCtx = beamCanvas.getContext('2d');
      const width = beamCtx.createLinearGradient(0, 0, 64, 0);
      for (const [stop, opacity] of [[0, 0], [0.17, 0.19], [0.31, 0.44], [0.44, 0.63], [0.50, 0.89],
        [0.56, 0.63], [0.69, 0.44], [0.83, 0.19], [1, 0]]) {
        width.addColorStop(stop, `rgba(255,255,255,${opacity})`);
      }
      beamCtx.fillStyle = width;
      beamCtx.fillRect(0, 0, 64, 256);
      const height = beamCtx.createLinearGradient(0, 0, 0, 256);
      height.addColorStop(0, 'transparent');
      height.addColorStop(0.17, 'rgba(255,255,255,0.55)');
      height.addColorStop(0.47, 'white');
      height.addColorStop(1, 'white');
      beamCtx.globalCompositeOperation = 'destination-in';
      beamCtx.fillStyle = height;
      beamCtx.fillRect(0, 0, 64, 256);
      beaconTextures.beam = new THREE.CanvasTexture(beamCanvas);

      const floorCanvas = document.createElement('canvas');
      floorCanvas.width = floorCanvas.height = 128;
      const ctx = floorCanvas.getContext('2d');
      const ring = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      for (const [stop, opacity] of [[0, 0.46], [0.36, 0.22], [0.62, 0.1], [0.72, 0.64], [0.8, 0.84], [0.91, 0.15], [1, 0]]) {
        ring.addColorStop(stop, `rgba(255,255,255,${opacity})`);
      }
      ctx.fillStyle = ring;
      ctx.fillRect(0, 0, 128, 128);
      beaconTextures.floor = new THREE.CanvasTexture(floorCanvas);
    }
    const marker = new THREE.Group();
    const beam = new THREE.Sprite(new THREE.SpriteMaterial({
      map: beaconTextures.beam, color, transparent: true, depthWrite: false, opacity: 0.88,
    }));
    beam.scale.set(0.96, 3.72, 1);
    beam.position.y = beam.scale.y / 2;
    const floor = new THREE.Mesh(beaconFloor, new THREE.MeshBasicMaterial({
      map: beaconTextures.floor, color, transparent: true, depthWrite: false,
    }));
    floor.rotation.x = -Math.PI / 2;
    marker.add(floor, beam);
    return marker;
  }

  function markPickup(group, color) {
    group.userData.beacon = pickupBeacon(color);
    group.add(group.userData.beacon);
  }

  let sheepProto = null;
  function yellowSheep() {
    if (!sheepProto) {
      const col = hex => ({ color: new THREE.Color(hex) });
      const woolA = col(0xffdc4d), woolB = col(0xffcd2e), woolC = col(0xffe97d);
      const faceCol = col(0xfff1c9), hornCol = col(0xd9922b), hoofCol = col(0x3a2b20);
      const eyeCol = col(0x231914), shineCol = col(0xffffff), noseCol = col(0xff8fab);
      const parts = [];
      // 蓬松黄色羊毛身体（多团圆润云朵）
      const puffs = [
        [0, 0.04, 0, 0.34, woolA],
        [-0.18, 0.08, -0.05, 0.24, woolB],
        [0.18, 0.08, -0.05, 0.24, woolB],
        [0, 0.16, -0.14, 0.25, woolC],
        [0, 0.10, 0.16, 0.24, woolC],
        [-0.14, -0.03, 0.10, 0.21, woolA],
        [0.14, -0.03, 0.10, 0.21, woolA],
        [0, 0.06, -0.34, 0.14, woolC], // 蓬松小尾巴
      ];
      for (const [x, y, z, r, m] of puffs) {
        parts.push(mesh(new THREE.IcosahedronGeometry(r, 1), m, x, y, z, false));
      }
      // 可爱圆脸 + 头顶黄色卷毛刘海
      const head = mesh(sph(0.21, 12, 10), faceCol, 0, 0.20, 0.34, false);
      head.scale.set(0.95, 0.92, 1.08);
      parts.push(head);
      parts.push(mesh(new THREE.IcosahedronGeometry(0.16, 1), woolC, 0, 0.35, 0.30, false));
      parts.push(mesh(new THREE.IcosahedronGeometry(0.11, 1), woolA, -0.10, 0.32, 0.34, false));
      parts.push(mesh(new THREE.IcosahedronGeometry(0.11, 1), woolA, 0.10, 0.32, 0.34, false));
      // 垂耳 + 小卷角 + 亮晶晶大眼 + 粉鼻头
      for (const s of [-1, 1]) {
        const ear = mesh(sph(0.095, 8, 6), woolB, s * 0.21, 0.21, 0.30, false);
        ear.scale.set(1.35, 0.55, 0.72);
        ear.rotation.z = -s * 0.45;
        parts.push(ear);
        const horn = mesh(new THREE.TorusGeometry(0.075, 0.028, 6, 10, Math.PI * 1.25), hornCol, s * 0.15, 0.34, 0.27, false);
        horn.rotation.set(0.25, s * 0.65, s * 0.35);
        parts.push(horn);
        parts.push(mesh(sph(0.038, 8, 6), eyeCol, s * 0.085, 0.22, 0.525, false));
        parts.push(mesh(sph(0.015, 6, 5), shineCol, s * 0.076, 0.234, 0.556, false));
      }
      parts.push(mesh(sph(0.032, 8, 6), noseCol, 0, 0.155, 0.555, false));
      // 四条短腿与深棕小羊蹄
      for (const lx of [-0.15, 0.15]) {
        for (const lz of [-0.15, 0.15]) {
          parts.push(mesh(cyl(0.055, 0.05, 0.22, 8), faceCol, lx, -0.24, lz, false));
          parts.push(mesh(cyl(0.054, 0.06, 0.08, 8), hoofCol, lx, -0.37, lz, false));
        }
      }
      const sheepMat = new THREE.MeshToonMaterial({ vertexColors: true, emissive: 0x261f08, gradientMap: toonGrad() });
      sheepProto = mergeStatic(parts, sheepMat, { vertexColors: true });
      for (const p of parts) p.geometry.dispose();
      sheepProto.userData.sharedAsset = true;
    }
    return sheepProto.clone(false);
  }

  function power(kind) {
    const g = new THREE.Group();
    const conf = {
      shield: { color: 0xffe066, name: '相信光' },
      sprint: { color: 0xff7a3c, name: '奥利给' },
      magnet: { color: 0x5ec8f2, name: '磁吸小羊' },
    }[kind];

    if (kind === 'shield') {
      // 奶嘴护盾：金环 + 奶白底盘 + 粉色奶嘴头
      g.add(mesh(new THREE.TorusGeometry(0.3, 0.08, 10, 24), T(0xffd93f), 0, 0, 0));
      g.add(mesh(cyl(0.26, 0.26, 0.08, 20), T(0xfff6e3), 0, 0, 0));
      g.add(mesh(sph(0.14, 14, 12), T(0xff7bac), 0, 0.22, 0));
    } else if (kind === 'sprint') {
      // 奥利给火箭：红箭身 + 黄尖头 + 尾翼 + 尾焰
      const r = new THREE.Group();
      r.add(mesh(cyl(0.16, 0.2, 0.6, 14), T(0xff5c3f), 0, 0, 0));
      r.add(mesh(cyl(0.0, 0.16, 0.3, 14), T(0xffd93f), 0, 0.45, 0));
      for (const s of [-1, 1]) r.add(mesh(box(0.06, 0.3, 0.22), T(0xffd93f), s * 0.2, -0.25, 0));
      r.add(mesh(cyl(0.12, 0.02, 0.3, 10), Basic(0xffb03f), 0, -0.45, 0));
      r.rotation.x = 0.5;
      g.add(r);
    } else {
      // 磁吸功能道具：可爱黄色小羊（合并为 1 个顶点色网格）
      const sheep = yellowSheep();
      sheep.position.y = 0.12;
      g.add(sheep);
    }

    markPickup(g, conf.color);
    const lb = label(conf.name, '#fff6e3', '#3a2b20', 1.1); lb.position.set(0, 0.95, 0); g.add(lb);
    return g;
  }

  /* ---------- 路面纹理（#2C3E50 柏油路） ---------- */
  function trackTexture() {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 512;
    const c = cv.getContext('2d');
    const base = c.createLinearGradient(0, 0, 512, 0);
    for (const [stop, color] of [[0, '#233242'], [0.07, '#2c3e50'], [0.24, '#293a4b'],
      [0.5, '#2f4255'], [0.76, '#293a4b'], [0.93, '#2c3e50'], [1, '#233242']]) base.addColorStop(stop, color);
    c.fillStyle = base; c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 8000; i++) {
      c.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(12,20,28,0.18)';
      c.fillRect(Math.random() * 512, Math.random() * 512, 1 + i % 2, 1);
    }
    // 三车道中间两条分割线：纯白虚线（1 贴图周期 = 10 米，每 5 米一段 2.65m 实线 + 2.35m 间隔）
    for (const lx of [-1.2, 1.2]) {
      const u = (lx + 3.8) / 7.6 * 512;
      c.fillStyle = 'rgba(248,246,240,0.88)';
      for (const y of [32, 288]) {
        c.fillRect(u - 3.5, y, 7, 136);
      }
    }
    for (const lx of [-3.55, 3.55]) {
      const u = (lx + 3.8) / 7.6 * 512;
      c.fillStyle = '#ebcb5c'; c.fillRect(u - 2.8, 0, 5.6, 512);
      c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(u + Math.sign(lx) * 11, 0, 2, 512);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }

  /* ---------- 货车（部分带斜坡，可跑上车顶；long = 加长版，车顶能跑更久） ---------- */
  function truck(withRamp, color = 0xf6c536, long = false) {
    const g = new THREE.Group();
    const { longHalf, shortHalf, roofHeight, roofWidth, cabLength, rampLength, rampWidth } = truckGeometry;
    const half = long ? longHalf : shortHalf, len = half * 2;
    const body = obstaclePart(long ? 'TruckLong' : 'TruckShort');
    if (body) {
      g.add(body);
    } else {
      // 底盘
      g.add(mesh(box(1.7, 0.35, len - 0.2), T(0x2a2f38), 0, 0.72, 0));
      // 货柜
      g.add(mesh(box(1.9, 1.6, len), T(color), 0, 1.4, 0));
      g.add(mesh(box(roofWidth, 0.12, len + 0.1), L(0xe3b12c), 0, roofHeight - 0.06, 0));
      // 车侧白色反光条
      for (const s of [-1, 1]) g.add(mesh(box(0.02, 0.22, len - 0.5), T(0xfff6e3), s * 0.96, 1.0, 0, false));
      // 车头（远端）
      g.add(mesh(box(1.9, 1.8, cabLength), T(0xe0a122), 0, roofHeight - 0.9, -(half + cabLength / 2)));
      g.add(mesh(box(1.7, 0.7, 0.1), Basic(0xbfe6ff), 0, 1.9, -(half + cabLength + 0.02)));
      for (const s of [-1, 1]) g.add(mesh(sph(0.14, 10, 8), Basic(0xfff2b0), s * 0.7, 0.72, -(half + cabLength + 0.06), false));
      // 车轮
      const wheelZs = long ? [-half + 0.8, -half / 3, half / 3, half - 0.8] : [-2.6, -1.2, 1.6];
      for (const zx of wheelZs) for (const s of [-1, 1]) {
        const w = mesh(cyl(0.42, 0.42, 0.3, 14), T(0x22262e), s * 1.0, 0.42, zx);
        w.rotation.z = Math.PI / 2; g.add(w);
    }
    // 车尾（+z 近端）：双开门 + 把手 + 尾灯 + 保险杠
    g.add(mesh(box(1.78, 1.42, 0.06), T(0xe9e4da), 0, 1.38, half + 0.01, false));
    g.add(mesh(box(0.05, 1.42, 0.03), T(0x9a958c), 0, 1.38, half + 0.05, false));
    for (const s of [-1, 1]) {
      g.add(mesh(box(0.18, 0.12, 0.03), T(0x8a3a3a), s * 0.6, 0.78, half + 0.05, false));
      g.add(mesh(box(0.06, 0.24, 0.05), T(0x6a6a72), s * 0.12, 1.3, half + 0.05, false));
    }
    g.add(mesh(box(1.82, 0.16, 0.12), T(0x2a2f38), 0, 0.5, half + 0.06, false));
    }
    // 车顶标语（靠车头一侧，跑车顶时不挡视线）
    const lb = label(long ? '奶娃物流 · 加长' : '奶娃物流', '#fff6e3', '#3a2b20', 1.9);
    lb.position.set(0, 2.95, -(half - 0.8)); g.add(lb);
    g.userData.sign = lb;
    if (withRamp) {
      const paintedRamp = obstaclePart('TruckRamp');
      if (paintedRamp) {
        paintedRamp.position.z = half;
        g.add(paintedRamp);
      } else {
        // 斜坡：近端（+z，玩家先碰到）地面 -> 车顶近缘
        const angle = Math.atan2(roofHeight, rampLength);
        const rampLen = Math.hypot(rampLength, roofHeight);
        const ramp = mesh(box(rampWidth, 0.12, rampLen), T(0xffd93f), 0,
          roofHeight / 2 - 0.06 * Math.cos(angle), half + rampLength / 2 - 0.06 * Math.sin(angle));
        ramp.rotation.x = angle;
        for (const t of [-1.2, 0, 1.2]) ramp.add(mesh(box(rampWidth, 0.02, 0.3), T(0x2a2f38), 0, 0.07, t, false));
        g.add(ramp);
      }
      const tip = label('斜坡↑', '#fff6d9', '#a8861f', 1.2); tip.position.set(0, 1.0, half + 2.8); g.add(tip);
      g.userData.rampSign = tip;
    }
    return g;
  }

  function markTruckJump(truck, z, angle) {
    let marker = truck.userData.jumpMarker;
    if (!marker) {
      marker = new THREE.Group();
      const arrow = new THREE.Shape();
      arrow.moveTo(-0.16, -0.55); arrow.lineTo(0.16, -0.55);
      arrow.lineTo(0.16, 0.03); arrow.lineTo(0.40, 0.03);
      arrow.lineTo(0, 0.52); arrow.lineTo(-0.40, 0.03);
      arrow.lineTo(-0.16, 0.03); arrow.closePath();
      const shape = new THREE.ShapeGeometry(arrow);
      const outline = mesh(shape, Basic(0x2b1e16), 0, 0, 0, false);
      outline.scale.set(1.18, 1.16, 1);
      outline.rotation.x = -Math.PI / 2;
      const fill = mesh(shape, Basic(0xfffdf2), 0, 0.006, 0, false);
      fill.rotation.x = -Math.PI / 2;
      marker.add(outline, fill);
      truck.add(marker);
      truck.userData.jumpMarker = marker;
    }
    marker.position.set(0, truckGeometry.roofHeight + 0.018, z);
    marker.rotation.y = angle;
    marker.visible = true;
    truck.userData.sign.visible = false;
  }

  /* ---------- 场景组件 ---------- */
  const signGeometry = new THREE.PlaneGeometry(1, 1);
  const signMaterials = new Map();
  function streetSign(text, width, height, x, y, z) {
    if (!signMaterials.has(text)) {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.font = 'bold 50px "Microsoft YaHei","PingFang SC",sans-serif';
      ctx.fillStyle = '#fff0d0';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#354a4f'; ctx.shadowBlur = 4;
      ctx.fillText(text, 128, 34, 232);
      const map = new THREE.CanvasTexture(canvas);
      map.anisotropy = 4;
      signMaterials.set(text, new THREE.MeshBasicMaterial({ map, alphaTest: 0.22 }));
    }
    const sign = mesh(signGeometry, signMaterials.get(text), x, y, z, false);
    sign.scale.set(width, height, 1);
    sign.userData.sharedAsset = true;
    return sign;
  }

  const facadeSigns = {
    CampusLibrary: [1.68, 0.33, 2.94, 2.631],
    AcademicHall: [1.48, 0.30, 1.89, 2.52],
    Dormitory: [1.51, 0.28, 2.01, 2.43],
    TeaCorner: [2.72, 0.44, 2.42, 2.282],
    MilkMarket: [2.84, 0.44, 2.42, 2.384],
    ParkPavilion: [2.35, 0.26, 2.81, 2.003],
  };
  // 建筑正面朝向马路（±90°）后，挂载于靠街立面的双面垂直悬挑招牌与庭院石砖裙边参数
  const bladeMounts = {
    CampusLibrary: { x: 1.38, y: 3.35, z: 2.56, theme: 'campus', apronW: 7.4, apronZ: 0.72, apronD: 5.9 },
    AcademicHall:  { x: 2.88, y: 3.22, z: 2.55, theme: 'campus', apronW: 7.0, apronZ: 0.72, apronD: 5.9 },
    Dormitory:     { x: 1.02, y: 3.36, z: 2.06, theme: 'campus', apronW: 6.7, apronZ: 0.60, apronD: 5.5 },
    TeaCorner:     { x: 2.55, y: 2.90, z: 2.18, theme: 'market', apronW: 6.6, apronZ: 0.68, apronD: 5.8 },
    MilkMarket:    { x: 2.88, y: 3.16, z: 2.28, theme: 'market', apronW: 7.2, apronZ: 0.70, apronD: 5.9 },
  };
  const bladeMaterials = new Map();
  const bladeFrameGeos = {};
  let bladeFacesGeo = null;
  const bladeFrameMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const apronMats = { campus: L(0xb8ad98), market: L(0xc3b49b) };
  const apronGeos = new Map();

  function bladeSign(text, x, y, z, theme) {
    const key = `${text}|${theme}`;
    if (!bladeMaterials.has(key)) {
      const cv = document.createElement('canvas');
      cv.width = 256; cv.height = 112;
      const ctx = cv.getContext('2d');
      const market = theme === 'market';
      ctx.fillStyle = market ? '#be5446' : '#254a4f';
      ctx.fillRect(0, 0, 256, 112);
      ctx.strokeStyle = market ? '#ffe29c' : '#efd49a';
      ctx.lineWidth = 7;
      ctx.strokeRect(7, 7, 242, 98);
      ctx.font = 'bold 46px "Microsoft YaHei","PingFang SC",sans-serif';
      ctx.fillStyle = '#fff7e0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(20, 32, 34, 0.55)';
      ctx.shadowBlur = 4;
      ctx.fillText(text, 128, 58, 214);
      const map = new THREE.CanvasTexture(cv);
      map.anisotropy = 4;
      bladeMaterials.set(key, new THREE.MeshBasicMaterial({ map }));
    }
    if (!bladeFrameGeos[theme]) {
      const ironCol = { color: new THREE.Color(0x2d434a) };
      const frameCol = { color: new THREE.Color(theme === 'market' ? 0x7c3d35 : 0x284349) };
      const parts = [
        mesh(box(0.045, 0.045, 0.16), ironCol, 0, 0.15, 0.04, false),
        mesh(box(0.045, 0.045, 0.16), ironCol, 0, -0.15, 0.04, false),
        mesh(box(0.08, 0.48, 1.00), frameCol, 0, 0, 0.54, false),
      ];
      bladeFrameGeos[theme] = mergeStatic(parts, bladeFrameMat, { vertexColors: true }).geometry;
      for (const p of parts) p.geometry.dispose();
    }
    if (!bladeFacesGeo) {
      const faceGeo = new THREE.PlaneGeometry(0.92, 0.40);
      const rightFace = mesh(faceGeo, null, 0.044, 0, 0.54, false);
      rightFace.rotation.y = Math.PI / 2;
      const leftFace = mesh(faceGeo, null, -0.044, 0, 0.54, false);
      leftFace.rotation.y = -Math.PI / 2;
      bladeFacesGeo = mergeStatic([rightFace, leftFace], null, { withUV: true }).geometry;
      faceGeo.dispose();
    }
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.add(
      mesh(bladeFrameGeos[theme], bladeFrameMat, 0, 0, 0, false),
      mesh(bladeFacesGeo, bladeMaterials.get(key), 0, 0, 0, false)
    );
    g.traverse(n => { n.userData.sharedAsset = true; });
    return g;
  }

  function forecourtApron(w, d, z, theme) {
    const key = `${w}|${d}`;
    if (!apronGeos.has(key)) apronGeos.set(key, box(w, 0.055, d));
    const slab = mesh(apronGeos.get(key), apronMats[theme] || apronMats.campus, 0, 0.028, z, false);
    slab.userData.sharedAsset = true;
    return slab;
  }

  function building(name, sign, color, w, h) {
    const asset = streetPart(name);
    if (asset) {
      const [width, height, y, z] = facadeSigns[name];
      const group = new THREE.Group();
      const frontSign = streetSign(sign, width, height, 0, y, z);
      // 保持 asset 位于 children[0]，确保 setStreetDetail 远近 LOD 正常切换；远景自动隐藏小招牌减负
      group.add(asset, frontSign);
      const farHide = [frontSign];
      const mount = bladeMounts[name];
      if (mount) {
        const blade = bladeSign(sign, mount.x, mount.y, mount.z, mount.theme);
        farHide.push(blade);
        group.add(blade, forecourtApron(mount.apronW, mount.apronD, mount.apronZ, mount.theme));
      }
      group.userData.farHide = farHide;
      return group;
    }
    const g = new THREE.Group();
    // 一张立面贴图代替几十扇独立窗户，细节更多但 draw call 更少
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 256;
    const c = cv.getContext('2d');
    c.scale(0.5, 0.5);
    c.fillStyle = '#' + color.toString(16).padStart(6, '0'); c.fillRect(0, 0, 256, 512);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(0, 0, 18, 512);
    const rows = Math.max(3, Math.floor(h / 1.5));
    for (let r = 0; r < rows; r++) {
      const y = 20 + r * (400 / rows);
      c.fillStyle = 'rgba(70,55,80,.13)'; c.fillRect(0, y + 34, 256, 4);
      for (let col = 0; col < 4; col++) {
        const x = 25 + col * 57;
        c.fillStyle = 'rgba(255,246,227,.7)'; c.fillRect(x - 3, y - 3, 39, 40);
        c.fillStyle = Math.random() < 0.2 ? '#ffe6a3' : (Math.random() < 0.5 ? '#52647e' : '#39445e');
        c.fillRect(x, y, 33, 32);
        c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x + 4, y + 3, 4, 25);
      }
    }
    c.fillStyle = 'rgba(58,43,32,.12)'; c.fillRect(0, 430, 256, 82);
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    g.add(mesh(box(w, h, w), new THREE.MeshLambertMaterial({ map: tex }), 0, h / 2, 0, false));
    // 屋檐、屋顶设备与水箱，打破所有楼都只有方盒子的轮廓
    g.add(mesh(box(w * 1.1, 0.28, w * 1.1), L(0x625570), 0, h + 0.14, 0, false));
    g.add(mesh(box(w * 0.42, 0.65, w * 0.38), L(0xe7e1d8), -w * 0.2, h + 0.58, 0, false));
    if (h > 10) {
      g.add(mesh(cyl(0.5, 0.5, 0.8, 12), L(0x7cb7c9), w * 0.22, h + 0.65, 0, false));
      g.add(mesh(cyl(0.025, 0.025, 1.8, 6), L(0x4a4a55), -w * 0.25, h + 1.45, 0, false));
    }
    // 底层商铺：玻璃门、双色雨棚和招牌
    const front = w / 2;
    g.add(mesh(box(w * 0.88, 1.7, 0.12), L(0x40506a), 0, 0.9, front + 0.05, false));
    for (const sx of [-0.23, 0.23]) {
      g.add(mesh(box(w * 0.36, 1.35, 0.04), P(0x9ed9df, 45), sx * w, 0.92, front + 0.13, false));
      g.add(mesh(box(0.05, 1.35, 0.05), L(0xfff6e3), sx * w, 0.92, front + 0.17, false));
    }
    const awning = new THREE.Group();
    for (let i = 0; i < 7; i++)
      awning.add(mesh(box(w * 0.14, 0.16, 0.75), L(i % 2 ? 0xfff6e3 : color), -w * 0.42 + i * w * 0.14, 0, 0, false));
    awning.position.set(0, 2.05, front + 0.36); awning.rotation.x = -0.12; g.add(awning);
    const lb = label(sign, '#fff6e3', '#3a2b20', Math.min(3.2, w * 0.95));
    lb.position.set(0, 2.75, front + 0.2); g.add(lb);
    return g;
  }

  let clockDialProto = null;
  function clockSideDials() {
    if (!clockDialProto) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 128;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#e5d4ac';
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#615c4a';
      ctx.lineWidth = 4;
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(64 + Math.sin(a) * 44, 64 - Math.cos(a) * 44);
        ctx.lineTo(64 + Math.sin(a) * 55, 64 - Math.cos(a) * 55);
        ctx.stroke();
      }
      ctx.strokeStyle = '#314951';
      ctx.lineCap = 'round';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(42, 74); ctx.stroke();
      ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(94, 42); ctx.stroke();
      ctx.fillStyle = '#c4a370';
      ctx.beginPath(); ctx.arc(64, 64, 6, 0, Math.PI * 2); ctx.fill();
      const map = new THREE.CanvasTexture(cv);
      map.anisotropy = 4;

      clockDialProto = new THREE.Group();
      const bronze = { color: new THREE.Color(0x866547) }, gold = { color: new THREE.Color(0xc4a370) };
      const faceMat = new THREE.MeshBasicMaterial({ map });
      const outerGeo = cyl(0.84, 0.84, 0.12, 20);
      const bezelGeo = cyl(0.75, 0.75, 0.15, 20);
      const faceGeo = new THREE.CircleGeometry(0.67, 20);
      const ringParts = [], faceParts = [];
      for (const s of [-1, 1]) {
        const outer = mesh(outerGeo, bronze, s * 1.39, 6.63, 0, false);
        outer.rotation.z = Math.PI / 2;
        const bezel = mesh(bezelGeo, gold, s * 1.41, 6.63, 0, false);
        bezel.rotation.z = Math.PI / 2;
        const dial = mesh(faceGeo, faceMat, s * 1.495, 6.63, 0, false);
        dial.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
        ringParts.push(outer, bezel);
        faceParts.push(dial);
      }
      clockDialProto.add(
        mergeStatic(ringParts, new THREE.MeshLambertMaterial({ vertexColors: true }), { vertexColors: true }),
        mergeStatic(faceParts, faceMat, { withUV: true })
      );
      outerGeo.dispose(); bezelGeo.dispose(); faceGeo.dispose();
      clockDialProto.traverse(n => { n.userData.sharedAsset = true; });
    }
    return clockDialProto.clone(true);
  }

  function landmark(name, text) {
    const group = new THREE.Group();
    const asset = streetPart(name);
    if (!asset) return group;
    group.add(asset);
    if (name === 'CampusClock') {
      group.add(
        streetSign(text, 2.24, 0.36, 0, 2.43, 1.78),
        clockSideDials(),
        forecourtApron(6.5, 1.4, 2.55, 'campus')
      );
    }
    if (name === 'MilkCourt') {
      group.add(
        streetSign(text, 3.0, 0.39, 0, 2.56, 1.78),
        forecourtApron(6.3, 1.4, 2.45, 'market')
      );
    }
    if (name === 'ParkPond' || name === 'ParkWalk') group.userData.sceneryTail = 8;
    return group;
  }

  const alleyProtos = {};
  function alleyFiller(zone = 0) {
    if (!alleyProtos[zone]) {
      const market = zone === 1;
      const parts = [];
      const col = hex => ({ color: new THREE.Color(hex) });
      const baseMat = col(market ? 0xc3b49b : 0xb8ad98);
      const wallMat = col(market ? 0xc89a82 : 0xc4b59c);
      const capMat = col(0xe3d5bc);
      parts.push(
        mesh(box(2.4, 0.055, 3.4), baseMat, 0, 0.028, 0.1, false),
        mesh(box(2.25, 1.15, 0.28), wallMat, 0, 0.60, -0.35, false),
        mesh(box(2.35, 0.12, 0.38), capMat, 0, 1.22, -0.35, false)
      );
      for (const sx of [-0.95, 0.95]) {
        parts.push(
          mesh(box(0.26, 1.38, 0.34), wallMat, sx, 0.70, -0.35, false),
          mesh(box(0.34, 0.10, 0.42), capMat, sx, 1.42, -0.35, false)
        );
      }
      const bushColors = [0x5e885d, 0x739967, 0x88a972];
      const lobes = [[-0.58, 0.48, 0.16, 0.44], [0, 0.56, 0.20, 0.52], [0.58, 0.46, 0.15, 0.42]];
      lobes.forEach(([x, y, z, r], i) => {
        const b = mesh(new THREE.IcosahedronGeometry(r, 1), col(bushColors[i]), x, y, z, false);
        b.scale.set(1.1, 0.78, 0.85);
        parts.push(b);
      });
      if (market) {
        const flowerMat = col(0xf2b59b);
        for (const [x, y, z] of [[-0.42, 0.76, 0.28], [0.12, 0.86, 0.36], [0.55, 0.74, 0.26]]) {
          parts.push(mesh(sph(0.09, 6, 4), flowerMat, x, y, z, false));
        }
      }
      // 合并为 1 个顶点色网格，每条窄巷仅占 1 次 draw call
      const merged = mergeStatic(parts, new THREE.MeshLambertMaterial({ vertexColors: true }), { vertexColors: true });
      for (const p of parts) p.geometry.dispose();
      merged.userData.sharedAsset = true;
      alleyProtos[zone] = merged;
    }
    return alleyProtos[zone].clone(false);
  }

  function backdropBuilding(name, color = 0xc9b8a0) {
    const farSource = streetKit.get(name + 'Far') || streetKit.get(name);
    if (farSource) return assetInstance(farSource, false);
    const g = new THREE.Group();
    g.add(mesh(box(6.2, 7.2, 4.2), L(color), 0, 3.6, 0, false));
    g.add(mesh(box(6.5, 0.3, 4.5), L(0x7c7478), 0, 7.35, 0, false));
    return g;
  }
  function tree(blossom = false) {
    const asset = streetPart(blossom ? 'BlossomTree' : 'PlaneTree');
    if (asset) {
      asset.userData.streetShadow = true;
      return asset;
    }
    const g = new THREE.Group();
    g.add(mesh(cyl(0.12, 0.19, 1.7, 8), L(0x8a6248), 0, 0.85, 0, false));
    const colors = blossom ? [0xffb7d2, 0xffd1e2, 0xf49abc] : [0x54ad63, 0x72c768, 0x3e9657];
    const crowns = [[0, 2.15, 0, 0.9], [-0.48, 1.9, 0.08, 0.62], [0.5, 1.95, -0.08, 0.68]];
    crowns.forEach((p, i) => {
      const crown = mesh(new THREE.IcosahedronGeometry(p[3], 1), L(colors[i]), p[0], p[1], p[2], false);
      crown.rotation.set(i * 0.3, i * 0.7, 0); g.add(crown);
    });
    g.add(mesh(cyl(0.65, 0.72, 0.16, 12), L(0xd7c3a4), 0, 0.08, 0, false));
    return g;
  }
  function parkTree() {
    const asset = streetPart('ParkPoplar');
    if (!asset) return tree(false);
    asset.userData.streetShadow = true;
    return asset;
  }
  function flowerBed() {
    const asset = streetPart('FlowerPlanter');
    if (asset) return asset;
    const g = new THREE.Group();
    g.add(mesh(box(1.8, 0.35, 0.85), L(0xe6c7a5), 0, 0.18, 0, false));
    g.add(mesh(box(1.62, 0.12, 0.68), L(0x59884c), 0, 0.39, 0, false));
    const colors = [0xff7bac, 0xffd93f, 0xffffff, 0xb793e8];
    for (let i = 0; i < 7; i++) {
      const x = -0.66 + i * 0.22, z = i % 2 ? 0.18 : -0.16;
      g.add(mesh(cyl(0.018, 0.018, 0.28, 5), L(0x3e8550), x, 0.54, z, false));
      g.add(mesh(new THREE.IcosahedronGeometry(0.11, 0), L(colors[i % colors.length]), x, 0.7, z, false));
    }
    return g;
  }
  function bench() {
    const asset = streetPart('CedarBench');
    if (asset) return asset;
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      g.add(mesh(box(0.1, 0.65, 0.55), L(0x465364), s * 0.72, 0.33, 0, false));
      g.add(mesh(box(0.1, 0.8, 0.1), L(0x465364), s * 0.72, 0.85, 0.24, false));
    }
    for (let i = 0; i < 3; i++) g.add(mesh(box(1.8, 0.1, 0.16), L(0xd99b62), 0, 0.63, -0.2 + i * 0.2, false));
    for (let i = 0; i < 3; i++) g.add(mesh(box(1.8, 0.16, 0.08), L(0xd99b62), 0, 0.9 + i * 0.2, 0.26, false));
    return g;
  }
  function busStop() {
    const asset = streetPart('BusShelter');
    if (asset) {
      const group = new THREE.Group();
      group.add(asset, streetSign('奶娃站', 1.23, 0.30, -0.88, 2.73, 0.516));
      return group;
    }
    const g = new THREE.Group();
    for (const s of [-1, 1]) g.add(mesh(box(0.1, 2.5, 0.1), L(0x40506a), s * 1.55, 1.25, 0, false));
    g.add(mesh(box(3.5, 0.18, 1.55), L(0x5ec8f2), 0, 2.5, 0, false));
    const glass = new THREE.MeshPhongMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.35, shininess: 80 });
    g.add(mesh(box(3.1, 2.1, 0.05), glass, 0, 1.25, -0.58, false));
    const b = bench(); b.scale.setScalar(0.85); b.position.set(0, 0, -0.3); g.add(b);
    const lb = label('奶娃站', '#ffd93f', '#3a2b20', 1.45); lb.position.set(-0.85, 2.95, 0); g.add(lb);
    const route = label('早八路 · 666路', '#fff6e3', '#3a2b20', 1.35); route.position.set(0.75, 1.6, -0.48); g.add(route);
    return g;
  }
  function stall() {
    const asset = streetPart('MilkStall');
    if (asset) {
      const group = new THREE.Group();
      group.add(asset, streetSign('奶昔补给站', 1.64, 0.28, 0, 2.41, 0.909));
      return group;
    }
    const g = new THREE.Group();
    g.add(mesh(box(2.4, 1.65, 1.55), L(0xffe0a3), 0, 0.83, 0, false));
    g.add(mesh(box(2.0, 0.8, 0.06), P(0x9ed9df, 40), 0, 1.05, 0.8, false));
    for (let i = 0; i < 6; i++) g.add(mesh(box(0.42, 0.18, 1.85), L(i % 2 ? 0xfff6e3 : 0xff7bac), -1.05 + i * 0.42, 2.05, 0, false));
    const lb = label('奶昔补给站', '#fff6e3', '#3a2b20', 1.9); lb.position.set(0, 2.55, 0); g.add(lb);
    for (let i = 0; i < 3; i++) {
      g.add(mesh(cyl(0.11, 0.09, 0.3, 10), T([0xffb3c9, 0xb3e0ff, 0xffd93f][i]), -0.5 + i * 0.5, 1.72, 0.55, false));
    }
    return g;
  }
  let crosswalkProto = null;
  function crosswalk() {
    if (!crosswalkProto) {
      const paint = { color: new THREE.Color(0xefede4) };
      const stripeGeo = box(0.46, 0.014, 2.75);
      const stopGeo = box(6.8, 0.014, 0.20);
      const parts = [];
      for (let i = 0; i < 9; i++) {
        parts.push(mesh(stripeGeo, paint, -3.04 + i * 0.76, 0, 0, false));
      }
      // 斑马线前后配两条标准停车线，合并为 1 个几何体
      for (const sz of [-1.95, 1.95]) {
        parts.push(mesh(stopGeo, paint, 0, 0, sz, false));
      }
      crosswalkProto = mergeStatic(parts, new THREE.MeshBasicMaterial({ vertexColors: true }), { vertexColors: true });
      stripeGeo.dispose(); stopGeo.dispose();
      crosswalkProto.userData.sharedAsset = true;
    }
    return crosswalkProto.clone(false);
  }
  function lamp() {
    const asset = streetPart('StreetLamp');
    if (asset) return asset;
    const g = new THREE.Group();
    g.add(mesh(cyl(0.06, 0.09, 4, 8), L(0x4a4a55), 0, 2, 0, false));
    g.add(mesh(box(0.8, 0.08, 0.08), L(0x4a4a55), 0.35, 4, 0, false));
    g.add(mesh(sph(0.2, 12, 10), Basic(0xfff2b0), 0.7, 3.9, 0, false));
    return g;
  }
  let overpassProto = null;
  function buildOverpassProto() {
    const g = new THREE.Group();
    const concrete = L(0xe6dcc9);
    const concreteDark = L(0xc7bca8);
    const steel = L(0x314d55);
    const steelLight = L(0x466872);
    const gold = L(0xd6ae62);
    const glassRoofMat = new THREE.MeshLambertMaterial({
      color: 0xbce5ef, transparent: true, opacity: 0.44, side: THREE.DoubleSide, depthWrite: false,
    });
    const glassRailMat = new THREE.MeshLambertMaterial({
      color: 0x99cedb, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false,
    });

    // 1. 主桥墩（立于左右人行道内侧 x = ±4.65，避开三车道与路桩）
    const baseGeo = box(0.86, 0.38, 1.85);
    const pierGeo = cyl(0.22, 0.26, 5.75, 12);
    const capGeo = box(0.80, 0.36, 2.35);
    for (const s of [-1, 1]) {
      const px = s * 4.65;
      g.add(mesh(baseGeo, concreteDark, px, 0.19, 0, false));
      for (const pz of [-0.55, 0.55]) g.add(mesh(pierGeo, concrete, px, 3.05, pz, false));
      g.add(mesh(capGeo, steel, px, 5.82, 0, false));
    }

    // 2. 中间廊桥主箱梁（桥底净空 y=5.98m，高于货车车顶视角与跳跃最高点）
    g.add(mesh(box(12.5, 0.42, 2.50), concrete, 0, 6.19, 0, false));
    g.add(mesh(box(12.6, 0.14, 2.58), steel, 0, 5.96, 0, false));
    for (const fz of [-1.27, 1.27]) {
      g.add(mesh(box(12.6, 0.46, 0.12), concrete, 0, 6.26, fz, false));
      g.add(mesh(box(12.6, 0.08, 0.15), gold, 0, 6.49, fz, false));
    }

    // 3. 廊桥正面横幅牌框（文字按街区动态挂在 z = +1.47）
    g.add(mesh(box(4.76, 0.90, 0.12), gold, 0, 6.32, 1.37, false));
    g.add(mesh(box(4.60, 0.76, 0.14), steel, 0, 6.32, 1.39, false));

    // 4. 廊桥前后透明玻璃护栏 + 扶手 + 网红天桥挂壁花箱
    const railBarGeo = box(12.2, 0.06, 0.06);
    const railGlassGeo = new THREE.PlaneGeometry(12.0, 0.86);
    const postGeo = box(0.06, 1.0, 0.06);
    for (const rz of [-1.20, 1.20]) {
      g.add(mesh(railBarGeo, steel, 0, 7.42, rz, false));
      g.add(mesh(railBarGeo, steelLight, 0, 6.96, rz, false));
      g.add(mesh(railGlassGeo, glassRailMat, 0, 6.96, rz, false));
      for (let i = -5; i <= 5; i++) {
        g.add(mesh(postGeo, steel, i * 1.15, 6.94, rz, false));
      }
    }
    const planterGeo = box(0.95, 0.24, 0.26);
    const planterMat = L(0xc7896d);
    const bushGeo = new THREE.IcosahedronGeometry(0.18, 1);
    const bushMats = [L(0x638f60), L(0x7ca26d)];
    const bloomGeo = sph(0.075, 6, 5);
    const bloomMats = [L(0xf5a8b8), L(0xffd466)];
    for (const fx of [-4.05, -2.95, 2.95, 4.05]) {
      g.add(mesh(planterGeo, planterMat, fx, 6.66, 1.38, false));
      for (let j = -1; j <= 1; j++) {
        const bx = fx + j * 0.28;
        g.add(mesh(bushGeo, bushMats[(j + 2) % 2], bx, 6.84, 1.40, false));
        g.add(mesh(bloomGeo, bloomMats[(j + 3) % 2], bx, 6.97, 1.45, false));
      }
    }

    // 5. 现代校园弧形半透明玻璃雨棚 + 7 道钢拱肋
    const R = 2.0, halfAng = 0.78, archCenterY = 6.95;
    const canopyGeo = new THREE.CylinderGeometry(R, R, 12.2, 14, 1, true, Math.PI / 2 - halfAng, halfAng * 2);
    const canopy = mesh(canopyGeo, glassRoofMat, 0, archCenterY, 0, false);
    canopy.rotation.z = Math.PI / 2;
    g.add(canopy);
    // 顶部脊梁与两侧雨檐边梁
    g.add(mesh(box(12.25, 0.08, 0.12), steel, 0, archCenterY + R, 0, false));
    for (const ez of [-R * Math.sin(halfAng), R * Math.sin(halfAng)]) {
      g.add(mesh(box(12.25, 0.10, 0.12), steel, 0, archCenterY + R * Math.cos(halfAng), ez, false));
    }
    const ribPts = [];
    for (let i = 0; i <= 8; i++) {
      const a = -halfAng + halfAng * 2 * (i / 8);
      ribPts.push(new THREE.Vector3(0, archCenterY + R * Math.cos(a), R * Math.sin(a)));
    }
    const ribGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribPts), 10, 0.055, 6, false);
    const canopyPostGeo = box(0.11, 2.05, 0.11);
    for (const rx of [-5.55, -3.7, -1.85, 0, 1.85, 3.7, 5.55]) {
      g.add(mesh(ribGeo, steel, rx, 0, 0, false));
      for (const pz of [-1.20, 1.20]) {
        g.add(mesh(canopyPostGeo, steel, rx, 7.42, pz, false));
      }
    }

    // 6. 左右两侧现实感上下楼梯（沿两侧人行道 x = ±5.52 落地，分两段共 16 级台阶 + 中间休息平台 + 护栏扶手）
    const flightDz = 3.60, flightDy = 3.00;
    const flightLen = Math.hypot(flightDz, flightDy);
    const flightSlope = Math.atan2(flightDy, flightDz);
    const stringerGeo = box(0.12, 0.28, flightLen);
    const handrailGeo = box(0.06, 0.06, flightLen + 0.1);
    const stepGeo = box(1.36, 0.14, 0.48);
    const nosingGeo = box(1.36, 0.03, 0.08);
    const landGeo = box(1.56, 0.26, 1.44);
    const midPierGeo = cyl(0.16, 0.19, 3.04, 10);
    const midBaseGeo = box(0.54, 0.24, 0.54);
    const stairPostGeo = box(0.05, 0.96, 0.05);
    const landRailGeo = box(0.06, 0.06, 1.44);
    const newelGeo = cyl(0.055, 0.06, 1.05, 8);
    const newelCapGeo = sph(0.075, 8, 6);

    for (const s of [-1, 1]) {
      const sx = s * 5.52;
      // 桥端左右端头护栏（封闭外侧端头，仅留向楼梯开口）
      g.add(mesh(box(0.07, 1.02, 2.45), steel, s * 6.24, 6.94, 0, false));
      g.add(mesh(box(1.52, 0.06, 0.06), steel, sx, 7.42, -1.20, false));

      // 两段楼梯：上段 (z: 1.25→4.85, y: 6.20→3.20)，下段 (z: 6.25→9.85, y: 3.12→0.12)
      const flights = [
        { z0: 1.25, y0: 6.20, z1: 4.85, y1: 3.20 },
        { z0: 6.25, y0: 3.12, z1: 9.85, y1: 0.12 },
      ];
      for (const fl of flights) {
        const mz = (fl.z0 + fl.z1) / 2, my = (fl.y0 + fl.y1) / 2;
        for (const sideOff of [-0.71, 0.71]) {
          const str = mesh(stringerGeo, steel, sx + sideOff, my - 0.12, mz, false);
          str.rotation.x = flightSlope;
          g.add(str);
          const rail = mesh(handrailGeo, steelLight, sx + sideOff, my + 0.92, mz, false);
          rail.rotation.x = flightSlope;
          g.add(rail);
          const midRail = mesh(handrailGeo, gold, sx + sideOff, my + 0.52, mz, false);
          midRail.rotation.x = flightSlope;
          g.add(midRail);
          for (let p = 0; p <= 3; p++) {
            const t = p / 3;
            g.add(mesh(stairPostGeo, steel, sx + sideOff,
              fl.y0 + (fl.y1 - fl.y0) * t + 0.44, fl.z0 + (fl.z1 - fl.z0) * t, false));
          }
        }
        // 逐级混凝土踏步 + 深色防滑前沿
        const steps = 8;
        for (let k = 0; k < steps; k++) {
          const t = (k + 0.5) / steps;
          const sy = fl.y0 + (fl.y1 - fl.y0) * t;
          const sz = fl.z0 + (fl.z1 - fl.z0) * t;
          g.add(mesh(stepGeo, concrete, sx, sy - 0.06, sz, false));
          g.add(mesh(nosingGeo, steel, sx, sy + 0.015, sz + 0.20, false));
        }
      }

      // 中间休息平台 + 支撑柱 + 平台护栏
      g.add(mesh(landGeo, concrete, sx, 3.06, 5.55, false));
      g.add(mesh(midPierGeo, concreteDark, sx, 1.52, 5.55, false));
      g.add(mesh(midBaseGeo, steel, sx, 0.12, 5.55, false));
      for (const sideOff of [-0.71, 0.71]) {
        g.add(mesh(landRailGeo, steelLight, sx + sideOff, 4.04, 5.55, false));
        g.add(mesh(landRailGeo, gold, sx + sideOff, 3.64, 5.55, false));
      }

      // 底层入口踏板 + 金顶立柱
      g.add(mesh(box(1.58, 0.14, 0.65), concreteDark, sx, 0.07, 10.05, false));
      for (const sideOff of [-0.71, 0.71]) {
        g.add(mesh(newelGeo, steel, sx + sideOff, 0.60, 9.95, false));
        g.add(mesh(newelCapGeo, gold, sx + sideOff, 1.15, 9.95, false));
      }
    }

    // 把 240+ 个不透明实色部件与 2 块玻璃护栏分别烘焙合并，每座天桥仅需 3 次 draw call（实色 + 玻璃护栏 + 玻璃雨棚）
    const solidParts = [], glassRailParts = [];
    for (const child of [...g.children]) {
      if (child.material === glassRoofMat) continue;
      if (child.material === glassRailMat) glassRailParts.push(child);
      else solidParts.push(child);
      g.remove(child);
    }
    const solidMesh = mergeStatic(solidParts, new THREE.MeshLambertMaterial({ vertexColors: true }), { vertexColors: true });
    const railGlassMesh = mergeStatic(glassRailParts, glassRailMat);
    const tempGeos = new Set([...solidParts, ...glassRailParts].map(p => p.geometry));
    for (const geo of tempGeos) geo.dispose();
    const tempMats = new Set(solidParts.map(p => p.material));
    for (const mat of tempMats) mat.dispose();
    g.add(solidMesh, railGlassMesh);

    g.traverse(n => { n.userData.sharedAsset = true; });
    return g;
  }

  function gantry(text, festive = false) {
    if (!overpassProto) overpassProto = buildOverpassProto();
    const g = overpassProto.clone(true);
    g.add(streetSign(text, 4.10, 0.58, 0, 6.32, 1.48));
    if (festive) {
      const bunting = streetPart('MarketBunting');
      if (bunting) {
        bunting.position.y = -0.88;
        g.add(bunting);
      }
    }
    g.userData.sceneryTail = 4;
    return g;
  }
  function fountain() {
    return streetPart('ParkFountain') || mesh(cyl(1.24, 1.3, 0.28, 18).translate(0, 0.14, 0), L(0xb3b4a1), 0, 0, 0, false);
  }
  function garden() { return streetPart('ParkGarden') || flowerBed(); }
  function hedge() { return mesh(box(0.5, 0.6, 8), L(0x5aa84f), 0, 0.3, 0, false); }
  function post() { return streetPart('StreetBollard') || mesh(box(0.12, 0.65, 0.12).translate(0, 0.325, 0), L(0x526465), 0, 0, 0, false); }
  let cloudMap;
  function cloud() {
    if (!cloudMap) {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 128;
      const c = canvas.getContext('2d');
      const light = c.createLinearGradient(0, 16, 0, 112);
      light.addColorStop(0, '#fff4d8');
      light.addColorStop(.54, '#ffedcf');
      light.addColorStop(1, '#d8d7cb');
      c.fillStyle = light;
      c.beginPath();
      c.moveTo(17, 103);
      c.bezierCurveTo(9, 91, 35, 84, 66, 82);
      c.bezierCurveTo(95, 77, 101, 61, 128, 62);
      c.bezierCurveTo(145, 61, 164, 52, 181, 41);
      c.bezierCurveTo(198, 27, 225, 21, 243, 34);
      c.bezierCurveTo(267, 1, 311, 7, 328, 38);
      c.bezierCurveTo(361, 29, 386, 45, 394, 63);
      c.bezierCurveTo(419, 56, 447, 69, 450, 85);
      c.bezierCurveTo(483, 83, 502, 96, 493, 105);
      c.bezierCurveTo(411, 113, 76, 119, 17, 103);
      c.fill();
      c.fillStyle = '#fff1d986';
      c.beginPath();
      c.moveTo(75, 90);
      c.bezierCurveTo(158, 88, 177, 72, 229, 69);
      c.bezierCurveTo(265, 45, 289, 62, 311, 64);
      c.bezierCurveTo(355, 46, 376, 68, 416, 78);
      c.bezierCurveTo(336, 82, 195, 99, 75, 90);
      c.fill();
      cloudMap = new THREE.CanvasTexture(canvas);
    }
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudMap, depthWrite: false, fog: false }));
  }
  function sidewalkTexture() {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const c = cv.getContext('2d');
    c.fillStyle = '#8e8371'; c.fillRect(0, 0, 256, 256);
    const stones = ['#b8a891', '#ad9e88', '#b3a38f', '#c2b098'];
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 4; col++) {
        const x = col * 64 + (row % 2 ? 32 : 0);
        const y = row * 32;
        c.fillStyle = stones[(row + ((col + 4) % 4) * 5) % stones.length];
        c.fillRect(x + 1, y + 1, 62, 30);
        c.fillStyle = '#cdbba0';
        c.fillRect(x + 1, y + 1, 62, 2);
      }
    }
    for (let i = 0; i < 1800; i++) {
      c.fillStyle = i % 2 ? 'rgba(255,252,226,0.22)' : 'rgba(105,95,74,0.14)';
      c.fillRect(Math.random() * 256, Math.random() * 256, 1 + i % 2, 1);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }
  function lawnTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const c = canvas.getContext('2d');
    c.fillStyle = '#667751'; c.fillRect(0, 0, 256, 256);
    for (const [x, y, radius, tint] of [[24, 58, 37, '#829461'], [124, 115, 39, '#5b754f'],
      [200, 55, 43, '#778b55'], [174, 210, 42, '#829462'], [42, 186, 36, '#576e4e']]) {
      const patch = c.createRadialGradient(x, y, 2, x, y, radius);
      patch.addColorStop(0, tint); patch.addColorStop(1, tint + '00');
      c.fillStyle = patch;
      c.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
    }
    for (let i = 0; i < 2300; i++) {
      c.fillStyle = i % 2 ? '#adc18d38' : '#344d3640';
      c.fillRect(Math.random() * 256, Math.random() * 256, 1 + i % 3, 1 + i % 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }

  function skyDome() {
    const material = new THREE.ShaderMaterial({
      uniforms: { topColor: { value: new THREE.Color() }, horizonColor: { value: new THREE.Color() } },
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        varying vec3 vDirection;
        void main() {
          vec3 ray = normalize(vDirection);
          float height = smoothstep(-0.055, 0.43, ray.y);
          vec3 base = mix(horizonColor, topColor, height);
          float towardSun = max(0.0, dot(ray, normalize(vec3(-0.36, 0.23, -1.0))));
          float halo = pow(towardSun, 42.0) * 0.40;
          float disk = smoothstep(0.99954, 0.99967, towardSun);
          vec3 lit = mix(base, vec3(1.0, 0.90, 0.73), halo);
          gl_FragColor = vec4(mix(lit, vec3(1.0, 0.96, 0.84), disk), 1.0);
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 30, 20), material);
    sky.renderOrder = -10;
    return sky;
  }

  function hills(radius, height, phase, hazeColor) {
    const steps = 160;
    const points = [], indices = [];
    for (let i = 0; i <= steps; i++) {
      const a = i / steps * Math.PI * 2;
      const x = Math.sin(a) * radius, z = -Math.cos(a) * radius;
      const valley = 0.42 + 0.58 * Math.abs(Math.sin(a * 1.5));
      const ridge = 0.58 + 0.22 * Math.sin(a * 7 + phase) + 0.14 * Math.sin(a * 13 + 1.2 + phase);
      points.push(x, -3, z, x, 4 + height * ridge * valley, z);
      if (i < steps) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geometry.setIndex(indices);
    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { ridgeColor: { value: new THREE.Color() }, hazeColor: { value: hazeColor },
        hazeHeight: { value: height * 0.39 } },
      vertexShader: `
        varying float vHeight;
        void main() {
          vHeight = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 ridgeColor;
        uniform vec3 hazeColor;
        uniform float hazeHeight;
        varying float vHeight;
        void main() {
          gl_FragColor = vec4(mix(hazeColor, ridgeColor, smoothstep(0.0, hazeHeight, vHeight)), 1.0);
        }`,
    });
    return mesh(geometry, material, 0, 0, 0, false);
  }

  /* 梗道具：篮球（鸡你太美） */
  function memeBall() {
    const g = new THREE.Group();
    g.add(mesh(sph(0.38, 20, 16), P(0xff8a1f, 40), 0, 0, 0));
    const ringGeo = new THREE.TorusGeometry(0.38, 0.018, 6, 28);
    const ringMat = Basic(0x2a2a2a);
    const a = new THREE.Mesh(ringGeo, ringMat); a.rotation.x = Math.PI / 2; g.add(a);
    const b = new THREE.Mesh(ringGeo, ringMat); b.rotation.set(Math.PI / 2, 0, Math.PI / 2); g.add(b);
    const c = new THREE.Mesh(ringGeo, ringMat); c.rotation.set(0, 0, Math.PI / 2); g.add(c);
    markPickup(g, 0xffad42);
    const lb = label('只因', '#ffe9b8', '#8a4b00', 0.9); lb.position.set(0, 0.8, 0); g.add(lb);
    return g;
  }

  return { naiwa, doubaoFallback, obstacle, truck, truckGeometry, markTruckJump, memeBall, coin, milkPowder, power, building, tree,
    flowerBed, bench, busStop, stall, crosswalk, lamp, gantry, fountain, garden, hedge, post, trackTexture, lawnTexture,
    sidewalkTexture, cloud, skyDome, hills, landmark, alleyFiller, backdropBuilding, parkTree, label, batchScenery,
    characterShadows, installStreetKit, installObstacleKit, setStreetDetail, installThanos, T, L, P, Basic };
})();
