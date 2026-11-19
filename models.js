/* three.js 程序化建模：奶龙(软胶质感·按照片) + 大众化热梗障碍 + 地铁跑酷场景 */
const Models = (() => {
  const truckGeometry = Object.freeze({
    shortHalf: 2.3, longHalf: 6, roofHeight: 2.3, roofWidth: 1.95,
    cabLength: 1.4, cabOverhang: 0.2, rampLength: 3, rampWidth: 1.7,
  });
  let gradientMap = null;
  function toonGrad() {
    if (gradientMap) return gradientMap;
    const data = new Uint8Array([70, 140, 210, 255]);
    gradientMap = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
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
  function installThanos(source) {
    preparePaintedAsset(source);
    thanosAsset = source.getObjectByName('Thanos');
  }
  function assetInstance(source, castShadow = false) {
    const instance = source.clone(false);
    instance.castShadow = castShadow;
    return instance;
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
  }
  function replaceThanosFallback(group) {
    const fallback = group.userData.thanosFallback;
    if (!fallback || !thanosAsset) return null;
    group.remove(fallback);
    group.add(assetInstance(thanosAsset, true));
    delete group.userData.thanosFallback;
    return fallback;
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

  function label(text, bg = '#fff6e3', fg = '#3a2b20', w = 2.0) {    const cv = document.createElement('canvas');
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
    const tex = new THREE.CanvasTexture(cv);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true }));
    sp.scale.set(w, w * 96 / 256, 1);
    return sp;
  }

  /* 大图标 Sprite（道具/状态标识用） */
  function iconSprite(emoji, size = 0.9) {
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 128;
    const c = cv.getContext('2d');
    c.font = '100px serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(emoji, 64, 70);
    const tex = new THREE.CanvasTexture(cv);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sp.scale.set(size, size, 1);
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

    // 冲刺火焰尾焰（默认隐藏）
    const aura = new THREE.Group();
    aura.position.set(0, 0.7, 0.7);
    for (let i = 0; i < 3; i++) {
      const flame = mesh(cyl(0.02, 0.22 - i * 0.05, 0.5, 10), Basic([0xff5c3f, 0xffb03f, 0xffe93f][i]), 0, 0, 0.3 + i * 0.3, false);
      flame.rotation.x = Math.PI / 2;
      aura.add(flame);
    }
    aura.visible = false;
    g.add(aura);
    // 磁吸头顶图标（默认隐藏）
    const magIcon = iconSprite('🧲', 0.8);
    magIcon.position.set(0, 2.5, 0);
    magIcon.visible = false;
    g.add(magIcon);

    // 空中翻转枢轴：绕身体中心旋转，避免绕脚底翻转时穿进地面
    const spin = new THREE.Group();
    spin.position.y = 1.0;
    for (const ch of [...g.children]) { ch.position.y -= 1.0; spin.add(ch); }
    g.add(spin);

    g.userData = { body, belly, arms, legs, torso, egg: eggG, aura, magIcon, spin };
    return g;
  }

  /* ---------- 大众化热梗障碍 ---------- */
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
        g.userData.thanosFallback = fallback;
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
  function coin() {
    // 奶币改为小奶瓶：白色瓶身 + 粉色奶嘴盖，沿用原来的旋转与拾取逻辑
    const g = new THREE.Group();
    g.add(mesh(cyl(0.2, 0.24, 0.6, 16), T(0xffffff), 0, 0, 0));
    g.add(mesh(cyl(0.1, 0.14, 0.16, 12), T(0xff7bac), 0, 0.38, 0));
    g.rotation.z = -0.35;
    return g;
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

  function power(kind) {
    const g = new THREE.Group();
    const conf = {
      shield: { color: 0xffe066, name: '相信光' },
      sprint: { color: 0xff7a3c, name: '奥利给' },
      magnet: { color: 0x5ec8f2, name: '磁吸' },
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
      // 磁吸奶瓶：白奶瓶 + 粉盖 + 红色马蹄磁铁
      g.add(mesh(cyl(0.2, 0.24, 0.6, 16), T(0xffffff), 0, 0, 0));
      g.add(mesh(cyl(0.1, 0.14, 0.16, 12), T(0xff7bac), 0, 0.38, 0));
      const mag = mesh(new THREE.TorusGeometry(0.3, 0.08, 10, 20, Math.PI), T(0xd8433a), 0, -0.1, 0.25);
      mag.rotation.z = Math.PI; g.add(mag);
    }

    markPickup(g, conf.color);
    const lb = label(conf.name, '#fff6e3', '#3a2b20', 1.1); lb.position.set(0, 0.95, 0); g.add(lb);
    return g;
  }

  /* ---------- 路面纹理 ---------- */
  function trackTexture() {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 512;
    const c = cv.getContext('2d');
    const base = c.createLinearGradient(0, 0, 512, 0);
    for (const [stop, color] of [[0, '#414951'], [0.06, '#565c61'], [0.22, '#505961'],
      [0.5, '#586065'], [0.78, '#505961'], [0.94, '#565c61'], [1, '#414951']]) base.addColorStop(stop, color);
    c.fillStyle = base; c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9200; i++) {
      c.fillStyle = i % 2 ? 'rgba(229,215,190,0.065)' : 'rgba(29,34,37,0.09)';
      c.fillRect(Math.random() * 512, Math.random() * 512, 1 + i % 2, 1);
    }
    for (const lx of [-1.2, 1.2]) {
      const u = (lx + 3.8) / 7.6 * 512;
      c.fillStyle = 'rgba(233,226,206,0.63)';
      c.fillRect(u - 2.5, 0, 5, 512);
    }
    for (const lx of [-3.55, 3.55]) {
      const u = (lx + 3.8) / 7.6 * 512;
      c.fillStyle = '#d6bd88'; c.fillRect(u - 2.5, 0, 5, 512);
      c.fillStyle = 'rgba(29,34,37,0.43)'; c.fillRect(u + Math.sign(lx) * 11, 0, 2, 512);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }

  /* ---------- 货车（部分带斜坡，可跑上车顶；long = 加长版，车顶能跑更久） ---------- */
  function truck(withRamp, color = 0x4aa3ff, long = false) {
    const g = new THREE.Group();
    const { longHalf, shortHalf, roofHeight, roofWidth, cabLength, rampLength, rampWidth } = truckGeometry;
    const half = long ? longHalf : shortHalf, len = half * 2;
    // 底盘
    g.add(mesh(box(1.7, 0.35, len - 0.2), T(0x2a2f38), 0, 0.72, 0));
    // 货柜
    g.add(mesh(box(1.9, 1.6, len), T(color), 0, 1.4, 0));
    g.add(mesh(box(roofWidth, 0.12, len + 0.1), T(0xf0f0f0), 0, roofHeight - 0.06, 0));
    // 车侧白色反光条
    for (const s of [-1, 1]) g.add(mesh(box(0.02, 0.22, len - 0.5), T(0xfff6e3), s * 0.96, 1.0, 0, false));
    // 车头（远端）
    g.add(mesh(box(1.9, 1.8, cabLength), T(0x3a4a5a), 0, roofHeight - 0.9, -(half + cabLength / 2)));
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
    // 车顶标语（靠车头一侧，跑车顶时不挡视线）
    const lb = label(long ? '奶娃物流 · 加长' : '奶娃物流', '#fff6e3', '#3a2b20', 1.9);
    lb.position.set(0, 2.95, -(half - 0.8)); g.add(lb);
    g.userData.sign = lb;
    if (withRamp) {
      // 斜坡：近端（+z，玩家先碰到）地面 -> 车顶近缘
      const angle = Math.atan2(roofHeight, rampLength);
      const rampLen = Math.hypot(rampLength, roofHeight);
      const ramp = mesh(box(rampWidth, 0.12, rampLen), T(0xffd93f), 0,
        roofHeight / 2 - 0.06 * Math.cos(angle), half + rampLength / 2 - 0.06 * Math.sin(angle));
      ramp.rotation.x = angle;
      for (const t of [-1.2, 0, 1.2]) ramp.add(mesh(box(rampWidth, 0.02, 0.3), T(0x2a2f38), 0, 0.07, t, false));
      g.add(ramp);
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
      const outline = mesh(shape, Basic(0x875324), 0, 0, 0, false);
      outline.scale.set(1.14, 1.12, 1);
      outline.rotation.x = -Math.PI / 2;
      const fill = mesh(shape, Basic(0xffcf45), 0, 0.006, 0, false);
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
  function building(name, sign, color, w, h) {
    const asset = streetPart(name);
    if (asset) {
      const [width, height, y, z] = facadeSigns[name];
      const group = new THREE.Group();
      group.add(asset, streetSign(sign, width, height, 0, y, z));
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
  function crosswalk() {
    const g = new THREE.Group();
    for (let i = 0; i < 9; i++) g.add(mesh(box(0.52, 0.018, 2.2), Basic(0xe9e9e2), -3.1 + i * 0.78, 0, 0, false));
    return g;
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
  function gantry(text) {
    const g = new THREE.Group();
    const asset = streetPart('StreetGate');
    if (asset) {
      g.add(asset, streetSign(text, 3.50, 0.47, 0, 7.04, 0.154));
      return g;
    }
    // 门架抬到 7.4m：牌子从视野上方掠过，不再挡前方路面
    for (const s of [-1, 1]) g.add(mesh(box(0.22, 7.4, 0.22), L(0x5a5a66), s * 4.6, 3.7, 0, false));
    g.add(mesh(box(9.6, 0.3, 0.3), L(0x5a5a66), 0, 7.4, 0, false));
    const lb = label(text, '#ffd93f', '#3a2b20', 3.8);
    lb.position.set(0, 6.75, 0); g.add(lb);
    return g;
  }
  function fountain() {
    return streetPart('ParkFountain') || mesh(cyl(1.24, 1.3, 0.28, 18).translate(0, 0.14, 0), L(0xb3b4a1), 0, 0, 0, false);
  }
  function garden() { return streetPart('ParkGarden') || flowerBed(); }
  function hedge() { return mesh(box(0.5, 0.6, 8), L(0x5aa84f), 0, 0.3, 0, false); }
  function post() { return streetPart('StreetBollard') || mesh(box(0.12, 0.65, 0.12).translate(0, 0.325, 0), L(0x526465), 0, 0, 0, false); }
  function cloud() {
    const g = new THREE.Group();
    const m = L(0xd1d7d9);
    for (const [x, y, z, radius, flatten] of [[0, 0, 0, 1.35, 0.64], [-0.45, 0.65, -0.05, 0.95, 0.8],
      [1.1, 0.05, 0, 0.94, 0.61], [-1.32, -0.08, 0.17, 0.96, 0.54], [1.75, -0.22, -0.17, 0.62, 0.51]]) {
      const puff = mesh(sph(radius, 14, 10), m, x, y, z, false);
      puff.scale.y = flatten;
      g.add(puff);
    }
    return g;
  }
  function sun() {
    const g = new THREE.Group();
    g.add(mesh(sph(2.2, 20, 16), Basic(0xffd93f), 0, 0, 0, false));
    const gl = Basic(0x222222);
    g.add(mesh(box(1.5, 0.7, 0.3), gl, -0.85, 0.3, -2.0, false));
    g.add(mesh(box(1.5, 0.7, 0.3), gl, 0.85, 0.3, -2.0, false));
    g.add(mesh(box(0.6, 0.2, 0.3), gl, 0, 0.4, -2.0, false));
    return g;
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
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#82956c';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1900; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(185,189,132,0.24)' : 'rgba(69,93,65,0.22)';
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 1 + i % 4, 1 + i % 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }
  function skyDome() {
    const cv = document.createElement('canvas');
    cv.width = 4; cv.height = 256;
    const c = cv.getContext('2d');
    const gr = c.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#76adc7');
    gr.addColorStop(0.36, '#a6c8d5');
    gr.addColorStop(0.52, '#e6d9c8');
    gr.addColorStop(0.71, '#f1e4cf');
    gr.addColorStop(1, '#f1e4cf');
    c.fillStyle = gr; c.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(cv);
    return new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false }));
  }
  function city() {
    const g = new THREE.Group();
    const colors = [0xa394c7, 0x8faac5, 0xc0a4c5, 0x9dbcb7];
    for (let i = 0; i < 24; i++) {
      const h = 7 + Math.random() * 20, w = 5 + Math.random() * 2;
      const x = -92 + i * 8;
      g.add(mesh(box(w, h, 6), L(colors[i % colors.length]), x, h / 2, Math.sin(i * 2.1) * 5, false));
      g.add(mesh(box(w * 0.72, 1.1, 6.2), L(0x776d99), x, h + 0.55, Math.sin(i * 2.1) * 5, false));
      if (i % 3 === 0) g.add(mesh(cyl(0.04, 0.04, 3.5, 6), L(0x776d99), x, h + 2.6, 0, false));
      for (let r = 0; r < Math.floor(h / 3); r++)
        g.add(mesh(box(w * 0.65, 0.25, 0.04), Basic(0xd9d5e5), x, 2 + r * 2.8, 3.05 + Math.sin(i * 2.1) * 5, false));
    }
    return g;
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

  return { naiwa, obstacle, truck, truckGeometry, markTruckJump, memeBall, coin, power, building, tree,
    flowerBed, bench, busStop, stall, crosswalk, lamp, gantry, fountain, garden, hedge, post, trackTexture, lawnTexture,
    sidewalkTexture, cloud, sun, skyDome, city, label, iconSprite, batchScenery, characterShadows,
    installStreetKit, setStreetDetail, installThanos, replaceThanosFallback, T, L, P, Basic };
})();
