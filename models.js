/* three.js 程序化建模：奶龙(软胶质感·按照片) + 大众化热梗障碍 + 地铁跑酷场景 */
const Models = (() => {
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
    eggG.position.y = 0.6;
    const egg = mesh(sph(0.55, 24, 20), YELMAT, 0, 0, 0);
    egg.scale.set(0.95, 1.1, 0.95);
    const eggBelly = mesh(sph(0.4, 20, 16), P(CREAM, 18), 0, -0.1, -0.3);
    eggBelly.scale.set(0.8, 0.9, 0.5);
    eggG.add(egg, eggBelly);
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
  function obstacle(type) {
    const g = new THREE.Group();
    if (type === 'alarm') {
      for (const s of [-1, 1]) {
        g.add(mesh(sph(0.16, 12, 10), T(0xffd93f), s * 0.3, 1.02, 0));
        const leg = mesh(cyl(0.04, 0.05, 0.22, 8), T(0x3a2b20), s * 0.26, 0.1, 0);
        leg.rotation.z = s * 0.3; g.add(leg);
      }
      const face = mesh(cyl(0.42, 0.42, 0.22, 22), T(0xff5c5c), 0, 0.62, 0);
      face.rotation.x = Math.PI / 2; g.add(face);
      const dial = mesh(cyl(0.33, 0.33, 0.24, 22), T(0xfff6e3), 0, 0.62, 0);
      dial.rotation.x = Math.PI / 2; g.add(dial);
      const lb = label('8:00 早八', '#ffd9d0', '#a8281f', 1.5); lb.position.set(0, 1.45, 0); g.add(lb);
    } else if (type === 'gang') {
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
      const lb = label('老板画饼', '#f7e6c4', '#8a5a1a', 1.7); lb.position.set(0, 2.75, 0); g.add(lb);
    } else if (type === 'ddl') {
      const layers = [0xfff6e3, 0xffe9c9, 0xfff6e3, 0xffd9d9];
      for (let i = 0; i < 4; i++) {
        const w = 1.1 - i * 0.08;
        g.add(mesh(box(w, 0.45, 0.9), T(layers[i]), Math.sin(i * 7) * 0.06, 0.25 + i * 0.45, 0));
      }
      g.add(mesh(cyl(0.1, 0.12, 0.24, 10), T(0x8a5a3a), 0.2, 2.1, 0));
      const lb = label('DDL', '#ffd9d0', '#c22', 1.3); lb.position.set(0, 2.5, 0); g.add(lb);
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
    const g = new THREE.Group();
    const c = mesh(cyl(0.32, 0.32, 0.08, 20), T(0xffd93f), 0, 0, 0);
    c.rotation.x = Math.PI / 2; g.add(c);
    const inner = mesh(cyl(0.22, 0.22, 0.1, 18), T(0xf7ecd9), 0, 0, 0);
    inner.rotation.x = Math.PI / 2; g.add(inner);
    return g;
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

    // 柔和地面光环（标记可拾取，不遮挡造型）
    const ring = mesh(new THREE.TorusGeometry(0.55, 0.04, 8, 28), new THREE.MeshBasicMaterial({ color: conf.color, transparent: true, opacity: 0.7 }), 0, -0.75, 0, false);
    ring.rotation.x = -Math.PI / 2; g.add(ring);
    g.userData.ring = ring;
    const lb = label(conf.name, '#fff6e3', '#3a2b20', 1.1); lb.position.set(0, 0.95, 0); g.add(lb);
    return g;
  }

  /* ---------- 沥青马路纹理（车道虚线，干净不晃眼） ---------- */
  function trackTexture() {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 512;
    const c = cv.getContext('2d');
    c.fillStyle = '#3b3f46'; c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1600; i++) {
      c.fillStyle = `rgba(${Math.random() > 0.5 ? '20,22,26' : '90,96,104'},${Math.random() * 0.35})`;
      c.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
    // 车道分隔虚线（两条，把路面分成三条车道）
    for (const lx of [-1.2, 1.2]) {
      const u = (lx + 3.8) / 7.6 * 512;
      for (let y = 0; y < 512; y += 64) {
        c.fillStyle = 'rgba(255,255,255,0.85)';
        c.fillRect(u - 4, y + 10, 8, 34);
      }
    }
    // 路缘实线
    for (const lx of [-3.55, 3.55]) {
      const u = (lx + 3.8) / 7.6 * 512;
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(u - 3, 0, 6, 512);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }

  /* ---------- 货车（部分带斜坡，可跑上车顶；long = 加长版，车顶能跑更久） ---------- */
  function truck(withRamp, color = 0x4aa3ff, long = false) {
    const g = new THREE.Group();
    const len = long ? 12 : 4.6, half = len / 2;
    // 底盘
    g.add(mesh(box(1.7, 0.35, len - 0.2), T(0x2a2f38), 0, 0.72, 0));
    // 货柜
    g.add(mesh(box(1.9, 1.6, len), T(color), 0, 1.4, 0));
    g.add(mesh(box(1.95, 0.12, len + 0.1), T(0xf0f0f0), 0, 2.26, 0));
    // 车侧白色反光条
    for (const s of [-1, 1]) g.add(mesh(box(0.02, 0.22, len - 0.5), T(0xfff6e3), s * 0.96, 1.0, 0, false));
    // 车头（远端）
    g.add(mesh(box(1.9, 1.8, 1.4), T(0x3a4a5a), 0, 1.4, -(half + 0.7)));
    g.add(mesh(box(1.7, 0.7, 0.1), Basic(0xbfe6ff), 0, 1.9, -(half + 1.42)));
    for (const s of [-1, 1]) g.add(mesh(sph(0.14, 10, 8), Basic(0xfff2b0), s * 0.7, 0.72, -(half + 1.46), false));
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
    if (withRamp) {
      // 斜坡：近端（+z，玩家先碰到）地面 -> 车顶近缘
      const rampLen = Math.sqrt(3 * 3 + 2.3 * 2.3);
      const ramp = mesh(box(1.7, 0.12, rampLen), T(0xffd93f), 0, 1.15, half + 1.5);
      ramp.rotation.x = Math.atan2(2.3, 3);
      for (const t of [-1.2, 0, 1.2]) ramp.add(mesh(box(1.7, 0.02, 0.3), T(0x2a2f38), 0, 0.07, t, false));
      g.add(ramp);
      const tip = label('斜坡↑', '#fff6d9', '#a8861f', 1.2); tip.position.set(0, 1.0, half + 2.8); g.add(tip);
    }
    return g;
  }

  /* ---------- 场景组件 ---------- */
  function building(sign, color, w, h) {
    const g = new THREE.Group();
    g.add(mesh(box(w, h, w), L(color), 0, h / 2, 0, false));
    // 屋顶
    g.add(mesh(box(w * 1.1, 0.4, w * 1.1), L(0x6a5a7a), 0, h + 0.2, 0, false));
    const win = L(0x3a3a55);
    const rows = Math.max(2, Math.floor(h / 1.1));
    for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++)
      g.add(mesh(box(w * 0.16, 0.5, 0.05), win, -w * 0.3 + c * w * 0.3, 0.9 + r * 1.1, w / 2 + 0.03, false));
    const lb = label(sign, '#fff6e3', '#3a2b20', Math.min(3.2, w * 1.1));
    lb.position.set(0, h + 1.0, 0); g.add(lb);
    return g;
  }
  function lamp() {
    const g = new THREE.Group();
    g.add(mesh(cyl(0.06, 0.09, 4, 8), L(0x4a4a55), 0, 2, 0, false));
    g.add(mesh(box(0.8, 0.08, 0.08), L(0x4a4a55), 0.35, 4, 0, false));
    g.add(mesh(sph(0.2, 12, 10), Basic(0xfff2b0), 0.7, 3.9, 0, false));
    return g;
  }
  function gantry(text) {
    const g = new THREE.Group();
    // 门架抬到 7.4m：牌子从视野上方掠过，不再挡前方路面
    for (const s of [-1, 1]) g.add(mesh(box(0.22, 7.4, 0.22), L(0x5a5a66), s * 4.6, 3.7, 0, false));
    g.add(mesh(box(9.6, 0.3, 0.3), L(0x5a5a66), 0, 7.4, 0, false));
    const lb = label(text, '#ffd93f', '#3a2b20', 3.8);
    lb.position.set(0, 6.75, 0); g.add(lb);
    return g;
  }
  function hedge() { return mesh(box(0.5, 0.6, 8), L(0x5aa84f), 0, 0.3, 0, false); }
  function post() { return mesh(box(0.1, 0.9, 0.1), L(0xf0f0f0), 0, 0.45, 0, false); }
  function cloud() {
    const g = new THREE.Group();
    const m = Basic(0xffffff);
    g.add(mesh(sph(1.2, 12, 10), m, 0, 0, 0, false));
    g.add(mesh(sph(0.9, 12, 10), m, 1.2, 0.1, 0, false));
    g.add(mesh(sph(0.8, 12, 10), m, -1.1, 0.1, 0, false));
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
  function skyDome() {
    const cv = document.createElement('canvas');
    cv.width = 4; cv.height = 256;
    const c = cv.getContext('2d');
    const gr = c.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#5ec8f2');
    gr.addColorStop(0.5, '#a8e6ff');
    gr.addColorStop(0.8, '#ffe9f4');
    gr.addColorStop(1, '#ffe9f4');
    c.fillStyle = gr; c.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(cv);
    return new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false }));
  }
  function city() {
    const g = new THREE.Group();
    const m = L(0x8f7fc0);
    for (let i = 0; i < 24; i++) {
      const h = 8 + Math.random() * 22;
      g.add(mesh(box(6, h, 6), m, -90 + i * 8, h / 2, 0, false));
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
    const lb = label('只因', '#ffe9b8', '#8a4b00', 0.9); lb.position.set(0, 0.8, 0); g.add(lb);
    return g;
  }

  return { naiwa, obstacle, truck, memeBall, coin, power, building, lamp, gantry, hedge, post, trackTexture, cloud, sun, skyDome, city, label, iconSprite, T, L, P, Basic };
})();