/* 首页独立 Three.js 动态舞台：日间明亮活力风 · 3D 悬浮圆环追逐秀（奶娃 & 豆包老师） */
const HomeStage = (() => {
  const TAU = Math.PI * 2;

  function lerpAngle(current, target, t) {
    let diff = (target - current) % TAU;
    if (diff > Math.PI) diff -= TAU;
    if (diff < -Math.PI) diff += TAU;
    return current + diff * t;
  }

  function createDaySky() {
    const geometry = new THREE.SphereGeometry(180, 28, 18);
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        zenith: { value: new THREE.Color(0x2894e2) },
        midSky: { value: new THREE.Color(0x70cbfa) },
        horizon: { value: new THREE.Color(0xfff1cc) },
        nadir: { value: new THREE.Color(0xc9ecff) },
        sunDir: { value: new THREE.Vector3(0.46, 0.34, -0.82).normalize() },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 zenith;
        uniform vec3 midSky;
        uniform vec3 horizon;
        uniform vec3 nadir;
        uniform vec3 sunDir;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = h >= 0.0
            ? mix(mix(horizon, midSky, smoothstep(0.0, 0.34, h)), zenith, smoothstep(0.28, 0.88, h))
            : mix(horizon, nadir, smoothstep(0.0, -0.45, h));
          float sunDot = max(dot(d, sunDir), 0.0);
          col += vec3(1.0, 0.93, 0.68) * pow(sunDot, 12.0) * 0.32;
          col += vec3(1.0, 0.98, 0.88) * smoothstep(0.992, 0.9985, sunDot) * 0.95;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    return new THREE.Mesh(geometry, material);
  }

  function createRunwayTexture() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1024;
    const c = cv.getContext('2d');
    const cx = 512, cy = 512;

    // 外圈金边基底
    c.fillStyle = '#f5c748';
    c.fillRect(0, 0, 1024, 1024);

    // 圆形柏油跑道（与游戏内 #2C3E50 柏油路呼应）
    const asphalt = c.createRadialGradient(cx, cy, 220, cx, cy, 488);
    asphalt.addColorStop(0, '#243444');
    asphalt.addColorStop(0.55, '#2c3e50');
    asphalt.addColorStop(0.94, '#32475b');
    asphalt.addColorStop(1, '#233240');
    c.beginPath();
    c.arc(cx, cy, 488, 0, TAU);
    c.fillStyle = asphalt;
    c.fill();

    // 细微沥青噪点纹理
    for (let i = 0; i < 4200; i++) {
      const a = Math.random() * TAU;
      const r = 215 + Math.random() * 270;
      c.fillStyle = i % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(10,18,26,0.16)';
      c.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 2);
    }

    // 内外明黄安全边线
    c.strokeStyle = '#ffd562';
    c.lineWidth = 10;
    c.beginPath(); c.arc(cx, cy, 466, 0, TAU); c.stroke();
    c.beginPath(); c.arc(cx, cy, 236, 0, TAU); c.stroke();

    // 中间白色环形车道虚线
    c.save();
    c.strokeStyle = 'rgba(255, 250, 236, 0.92)';
    c.lineWidth = 11;
    c.setLineDash([40, 32]);
    c.beginPath();
    c.arc(cx, cy, 352, 0, TAU);
    c.stroke();
    c.restore();

    // 前后双处迷你斑马线点缀
    for (const baseAngle of [Math.PI * 0.5, Math.PI * 1.5]) {
      c.save();
      c.translate(cx, cy);
      c.rotate(baseAngle);
      c.fillStyle = 'rgba(255, 252, 240, 0.9)';
      for (let k = -3; k <= 3; k++) {
        c.fillRect(-16, 252 + (k + 3) * 32, 32, 16);
      }
      c.restore();
    }

    // 中央晴空奶白活力圆盘
    const plaza = c.createRadialGradient(cx, cy, 18, cx, cy, 224);
    plaza.addColorStop(0, '#fff9e6');
    plaza.addColorStop(0.68, '#ffefc4');
    plaza.addColorStop(1, '#f4d998');
    c.beginPath();
    c.arc(cx, cy, 224, 0, TAU);
    c.fillStyle = plaza;
    c.fill();

    // 放射状暖阳条纹
    c.save();
    c.beginPath();
    c.arc(cx, cy, 220, 0, TAU);
    c.clip();
    c.translate(cx, cy);
    for (let i = 0; i < 16; i++) {
      c.rotate(TAU / 16);
      c.fillStyle = i % 2 ? 'rgba(255, 212, 92, 0.24)' : 'rgba(94, 200, 242, 0.12)';
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(240, -26);
      c.lineTo(240, 26);
      c.closePath();
      c.fill();
    }
    c.restore();

    // 内圈清爽薄荷镶边
    c.strokeStyle = '#3fb8a6';
    c.lineWidth = 10;
    c.beginPath(); c.arc(cx, cy, 218, 0, TAU); c.stroke();

    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 8;
    return tex;
  }

  function createCloudCluster(scale = 1) {
    const g = new THREE.Group();
    const topMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x2a3542 });
    const puffData = [
      [0, 0.16, 0, 1.05],
      [-0.95, -0.05, 0.08, 0.78],
      [0.98, -0.02, -0.06, 0.82],
      [-0.45, 0.48, -0.1, 0.72],
      [0.48, 0.42, 0.12, 0.68],
      [0.05, -0.18, 0.45, 0.62],
    ];
    for (const [x, y, z, r] of puffData) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), topMat);
      m.position.set(x, y, z);
      m.scale.set(1.15, 0.78, 0.92);
      g.add(m);
    }
    g.scale.setScalar(scale);
    return g;
  }

  function createSparkleTexture() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const c = cv.getContext('2d');
    const grad = c.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 245, 1)');
    grad.addColorStop(0.35, 'rgba(255, 232, 148, 0.85)');
    grad.addColorStop(0.75, 'rgba(140, 230, 255, 0.25)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  }

  function stripPickupExtras(group) {
    if (group.userData.beacon) {
      group.remove(group.userData.beacon);
      group.userData.beacon = null;
    }
    for (const child of [...group.children]) {
      if (child.isSprite) group.remove(child);
    }
    return group;
  }

  function create({ Models }) {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xdff4ff, 26, 120);

    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 320);

    // 晴空穹顶与三点阳光照明
    scene.add(createDaySky());
    const hemi = new THREE.HemisphereLight(0xf2fbff, 0xffe0a8, 1.05);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xfff4da, 0.92);
    keyLight.position.set(9, 14, 13);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xffcf66, 0.54);
    rimLight.position.set(-11, 7, -9);
    scene.add(rimLight);

    // 蓬松 3D 云海（前/中/远三层缓缓漂移）
    const clouds = [];
    const cloudConfigs = [
      [-11.5, 4.6, -15, 2.3, 0.22, 0.4],
      [-4.2, 6.2, -21, 2.8, 0.16, 1.8],
      [6.5, 5.4, -18, 2.6, 0.19, 3.1],
      [14.2, 3.8, -14, 2.2, 0.24, 4.4],
      [-9.8, -2.6, -7.5, 1.85, 0.28, 0.9],
      [10.8, -2.2, -6.5, 1.95, 0.25, 2.6],
      [-3.5, -3.5, -10.5, 2.2, 0.20, 5.2],
      [4.8, -3.3, -9.5, 2.05, 0.21, 1.3],
      [-13.5, 0.5, -11, 1.75, 0.26, 3.7],
      [13.2, 0.8, -10, 1.8, 0.23, 5.8],
    ];
    for (const [x, y, z, sc, spd, phase] of cloudConfigs) {
      const c = createCloudCluster(sc);
      c.position.set(x, y, z);
      scene.add(c);
      clouds.push({ mesh: c, baseY: y, spd, phase });
    }

    // 悬浮圆环跑台主体
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    const STAGE_R = 3.55;
    const TRACK_R = 2.40;
    const runwayTex = createRunwayTexture();
    const deckMat = [
      new THREE.MeshLambertMaterial({ color: 0xeeb93b }), // 侧面暖金包边
      new THREE.MeshLambertMaterial({ map: runwayTex }), // 顶面跑道
      new THREE.MeshLambertMaterial({ color: 0x205550 }), // 底面
    ];
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(STAGE_R, STAGE_R + 0.08, 0.34, 48), deckMat);
    deck.position.y = -0.17;
    stageGroup.add(deck);

    // 外围高亮金色倒角护边环
    const rimRing = new THREE.Mesh(
      new THREE.TorusGeometry(STAGE_R + 0.04, 0.10, 12, 56),
      new THREE.MeshLambertMaterial({ color: 0xf7c948, emissive: 0x281c04 })
    );
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = -0.04;
    stageGroup.add(rimRing);

    // 悬浮底座流线舱体 + 底部发光反重力核心
    const hull = new THREE.Mesh(
      new THREE.CylinderGeometry(STAGE_R * 0.86, STAGE_R * 0.42, 0.78, 36),
      new THREE.MeshLambertMaterial({ color: 0x235f59 })
    );
    hull.position.y = -0.72;
    stageGroup.add(hull);

    const core = new THREE.Mesh(
      new THREE.ConeGeometry(STAGE_R * 0.36, 0.75, 24),
      new THREE.MeshBasicMaterial({ color: 0x6ef0ff })
    );
    core.rotation.x = Math.PI;
    core.position.y = -1.42;
    stageGroup.add(core);

    // 底部双反重力发光悬浮环
    const hoverRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(STAGE_R * 0.72, 0.075, 10, 48),
      new THREE.MeshBasicMaterial({ color: 0xffdf6d, transparent: true, opacity: 0.9 })
    );
    hoverRing1.rotation.x = Math.PI / 2;
    hoverRing1.position.y = -0.92;
    stageGroup.add(hoverRing1);

    const hoverRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(STAGE_R * 0.50, 0.065, 10, 40),
      new THREE.MeshBasicMaterial({ color: 0x62e5ff, transparent: true, opacity: 0.85 })
    );
    hoverRing2.rotation.x = Math.PI / 2;
    hoverRing2.position.y = -1.36;
    stageGroup.add(hoverRing2);

    // 倾斜炫彩星轨光环（环绕舞台后景增加潮流纵深感）
    const haloGroup = new THREE.Group();
    haloGroup.position.set(0, 1.55, 0);
    haloGroup.rotation.set(0.32, 0, -0.24);
    stageGroup.add(haloGroup);

    const outerHalo = new THREE.Mesh(
      new THREE.TorusGeometry(STAGE_R + 1.15, 0.042, 10, 72),
      new THREE.MeshBasicMaterial({ color: 0xfff0a8, transparent: true, opacity: 0.62 })
    );
    outerHalo.rotation.x = Math.PI / 2;
    haloGroup.add(outerHalo);

    const haloStars = [];
    const starGeo = new THREE.OctahedronGeometry(0.18, 0);
    const starCols = [0xffd93f, 0x6beeff, 0xff89b8];
    for (let i = 0; i < 3; i++) {
      const st = new THREE.Mesh(starGeo, new THREE.MeshBasicMaterial({ color: starCols[i] }));
      haloGroup.add(st);
      haloStars.push({ mesh: st, phase: (TAU * i) / 3 });
    }

    // 中央小展台：旋转的巨型奶瓶纪念奖杯 + 4 颗迷你星标灯柱
    const centerPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.76, 0.22, 24),
      new THREE.MeshLambertMaterial({ color: 0xfff6df })
    );
    centerPedestal.position.y = 0.11;
    stageGroup.add(centerPedestal);

    const centerBottle = Models.coin();
    centerBottle.scale.setScalar(1.35);
    centerBottle.position.set(0, 0.92, 0);
    stageGroup.add(centerBottle);

    const bollardMat = new THREE.MeshLambertMaterial({ color: 0x38b3a2 });
    const bollardTopMat = new THREE.MeshBasicMaterial({ color: 0xffe27a });
    for (let i = 0; i < 4; i++) {
      const a = (TAU * i) / 4 + Math.PI / 4;
      const bx = Math.cos(a) * 1.48, bz = Math.sin(a) * 1.48;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.38, 10), bollardMat);
      post.position.set(bx, 0.19, bz);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), bollardTopMat);
      cap.position.set(bx, 0.42, bz);
      stageGroup.add(post, cap);
    }

    // 轨道外围悬浮漂浮的经典游戏道具（奶瓶 / 黄色小羊 / 奶粉罐 / 火箭 / 篮球）
    const orbiters = [];
    const addOrbiter = (mesh, radius, baseY, speed, phase, spinSpeed, scale = 1) => {
      mesh.scale.setScalar(scale);
      stageGroup.add(mesh);
      orbiters.push({ mesh, radius, baseY, speed, phase, spinSpeed });
    };
    addOrbiter(Models.coin(), 4.15, 1.45, 0.34, 0.3, 1.8, 0.96);
    addOrbiter(Models.coin(), 4.35, 2.35, 0.28, 3.5, -1.6, 0.90);
    addOrbiter(stripPickupExtras(Models.power('magnet')), 4.25, 2.05, 0.31, 1.55, 1.1, 1.05);
    addOrbiter(stripPickupExtras(Models.milkPowder()), 4.45, 1.25, 0.26, 4.7, 1.4, 0.92);
    addOrbiter(stripPickupExtras(Models.power('sprint')), 4.25, 2.75, 0.36, 2.6, 1.9, 0.88);
    addOrbiter(stripPickupExtras(Models.memeBall()), 4.15, 1.05, 0.30, 5.5, 2.2, 0.80);

    // 漂浮阳光星尘粒子（1 次 Draw Call）
    const PART_COUNT = 64;
    const partPos = new Float32Array(PART_COUNT * 3);
    const partSpeed = new Float32Array(PART_COUNT);
    for (let i = 0; i < PART_COUNT; i++) {
      const a = Math.random() * TAU;
      const r = 1.6 + Math.random() * 6.4;
      partPos[i * 3] = Math.cos(a) * r;
      partPos[i * 3 + 1] = -1.2 + Math.random() * 5.8;
      partPos[i * 3 + 2] = Math.sin(a) * r;
      partSpeed[i] = 0.25 + Math.random() * 0.45;
    }
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
    const sparkles = new THREE.Points(partGeo, new THREE.PointsMaterial({
      map: createSparkleTexture(),
      size: 0.44,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    stageGroup.add(sparkles);

    // 鼠标 / 触控平滑 3D 视差状态
    const pointer = { tx: 0, ty: 0, x: 0, y: 0 };
    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', e => {
        const w = window.innerWidth || 1, h = window.innerHeight || 1;
        pointer.tx = ((e.clientX / w) - 0.5) * 2;
        pointer.ty = ((e.clientY / h) - 0.5) * 2;
      }, { passive: true });
      window.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; });
    }

    // 双人循环互动追逐剧本状态（无缝连续运转，初始即面向镜头 3/4 正脸出场）
    const show = {
      t: 0,
      mode: 'chase', // 'chase' | 'taunt' | 'boost'
      modeT: 0,
      sinceTaunt: 2.8,
      naiwaAngle: 0.28,       // 右前弧迎面跑向镜头，正脸极清晰
      teacherAngle: -0.62,    // 豆包老师紧随其后迎面追来
      naiwaRot: Math.PI - 0.28,
      teacherRot: 0.55,
      jumpTimer: 0,
      jumpCooldown: 1.8,
      teacherJumpTimer: -1,
      teacherJumpDelay: -1,
    };

    function reset() {
      show.mode = 'chase';
      show.modeT = 0;
      show.sinceTaunt = 2.8;
      show.naiwaAngle = 0.28;
      show.teacherAngle = -0.62;
      show.naiwaRot = Math.PI - 0.28;
      show.teacherRot = 0.55;
      show.jumpTimer = 0;
      show.jumpCooldown = 1.6;
      show.teacherJumpTimer = -1;
      show.teacherJumpDelay = -1;
    }

    function resize(width, height) {
      camera.aspect = width / Math.max(1, height);
      camera.fov = camera.aspect < 0.95 ? 50 : 41;
      camera.updateProjectionMatrix();
    }

    function update(dt, { player, chaser, runnerRig, chaserRig, chaserBackup, actorShadows }) {
      show.t += dt;
      show.modeT += dt;
      const t = show.t;
      const portrait = camera.aspect < 0.95;
      const wide = THREE.MathUtils.clamp((camera.aspect - 0.95) / 0.8, 0, 1);

      // 舞台按屏幕宽高比精准避让左侧 UI，确保整座悬浮圆台与底部反重力发光环完整入镜
      const stageX = portrait ? 0 : THREE.MathUtils.lerp(2.45, 3.35, wide);
      const stageY = Math.sin(t * 1.15) * 0.14 + (portrait ? -0.95 : 0.15);
      const stageZ = 0;
      stageGroup.position.set(stageX, stageY, stageZ);

      // 舞台悬浮特效自转
      hoverRing1.rotation.z = t * 0.55;
      hoverRing2.rotation.z = -t * 0.82;
      hoverRing1.scale.setScalar(1 + Math.sin(t * 2.4) * 0.03);
      hoverRing2.scale.setScalar(1 + Math.cos(t * 2.9) * 0.04);
      centerBottle.rotation.y = t * 1.25;
      centerBottle.position.y = 0.94 + Math.sin(t * 2.3) * 0.11;

      // 倾斜星环小星星运转
      const haloR = STAGE_R + 1.15;
      for (const s of haloStars) {
        const a = t * 0.72 + s.phase;
        s.mesh.position.set(Math.cos(a) * haloR, 0, Math.sin(a) * haloR);
        s.mesh.rotation.y = t * 2.4;
        s.mesh.rotation.x = t * 1.6;
      }

      // 外围漂浮经典道具公转 + 柔波起伏
      for (const o of orbiters) {
        const a = t * o.speed + o.phase;
        o.mesh.position.set(
          Math.cos(a) * o.radius,
          o.baseY + Math.sin(t * 1.9 + o.phase) * 0.24,
          Math.sin(a) * o.radius
        );
        o.mesh.rotation.y = t * o.spinSpeed + o.phase;
      }

      // 云海缓缓漂移
      for (const c of clouds) {
        c.mesh.position.x += c.spd * dt;
        if (c.mesh.position.x > 18) c.mesh.position.x = -18;
        c.mesh.position.y = c.baseY + Math.sin(t * 0.7 + c.phase) * 0.18;
      }

      // 阳光星尘缓缓上升循环
      const posAttr = sparkles.geometry.attributes.position;
      for (let i = 0; i < PART_COUNT; i++) {
        let py = posAttr.getY(i) + partSpeed[i] * dt;
        if (py > 4.8) py = -1.2;
        posAttr.setY(i, py);
      }
      posAttr.needsUpdate = true;

      // ---------- 奶娃 & 豆包老师 舞台追逐剧本 ----------
      let naiwaSpeed = 1.05;
      let teacherSpeed = 1.05;
      let naiwaAction = 'Run';
      let teacherAction = 'Run';
      let naiwaAnimSpeed = 1.05;
      let teacherAnimSpeed = 1.08;
      let naiwaY = 0;
      let teacherY = 0;
      let showRocket = false;
      let naiwaCustomFace = null;
      let teacherCustomFace = null;

      if (show.mode === 'chase') {
        show.sinceTaunt += dt;
        show.jumpCooldown -= dt;
        naiwaSpeed = 1.06;
        // 保持豆包老师与奶娃约 0.92 rad（~2.4 米）的紧凑追逐间距
        const gap = show.naiwaAngle - show.teacherAngle;
        teacherSpeed = THREE.MathUtils.clamp(1.06 + (gap - 0.92) * 0.85, 0.72, 1.35);

        show.naiwaAngle += naiwaSpeed * dt;
        show.teacherAngle += teacherSpeed * dt;

        // 偶尔俏皮飞跃跨栏，豆包老师紧跟着跃起
        if (show.jumpCooldown <= 0 && show.jumpTimer <= 0) {
          show.jumpTimer = 0.68;
          show.jumpCooldown = 3.2;
          show.teacherJumpDelay = 0.62;
        }
        if (show.jumpTimer > 0) {
          show.jumpTimer = Math.max(0, show.jumpTimer - dt);
          const u = 1 - show.jumpTimer / 0.68;
          naiwaY = 4 * u * (1 - u) * 1.15;
          naiwaAction = u > 0.86 ? 'Land' : 'Jump';
          naiwaAnimSpeed = 1.0;
        }
        if (show.teacherJumpDelay > 0) {
          show.teacherJumpDelay -= dt;
          if (show.teacherJumpDelay <= 0) show.teacherJumpTimer = 0.64;
        }
        if (show.teacherJumpTimer > 0) {
          show.teacherJumpTimer = Math.max(0, show.teacherJumpTimer - dt);
          const u = 1 - show.teacherJumpTimer / 0.64;
          teacherY = 4 * u * (1 - u) * 1.0;
          teacherAction = 'Jump';
          teacherAnimSpeed = 1.0;
        }

        // 奶娃转到镜头正前偏右 C 位（角度接近 0.85–1.35 rad）时切入挑衅互动小剧场
        const frontPhase = ((show.naiwaAngle % TAU) + TAU) % TAU;
        if (show.sinceTaunt >= 4.6 && show.jumpTimer <= 0 && frontPhase > 0.75 && frontPhase < 1.35) {
          show.mode = 'taunt';
          show.modeT = 0;
          show.sinceTaunt = 0;
          show.teacherJumpDelay = -1;
          show.teacherJumpTimer = -1;
        }
      } else if (show.mode === 'taunt') {
        // 前排 C 位搞笑互动：奶娃停步回头挥手挑衅 → 左右闪身 → 豆包老师扑抓扑空 → 奶娃火箭开溜！
        const mt = show.modeT;
        const desiredGap = mt < 1.5 ? 0.56 : 0.46;
        const gap = show.naiwaAngle - show.teacherAngle;
        if (gap > desiredGap) {
          show.teacherAngle += Math.min(gap - desiredGap, 1.38 * dt);
          teacherAction = 'Run';
          teacherAnimSpeed = 1.2;
        } else {
          teacherAction = mt < 2.6 ? 'Grab' : 'Greeting';
          teacherAnimSpeed = 1.0;
        }

        if (mt < 1.55) {
          naiwaAction = 'Greeting';
          naiwaCustomFace = Math.PI + (portrait ? 0 : -0.18); // 面向镜头俏皮招手
        } else if (mt < 2.15) {
          naiwaAction = 'DodgeLeft';
          naiwaCustomFace = Math.PI + 0.25;
        } else if (mt < 2.75) {
          naiwaAction = 'DodgeRight';
          naiwaCustomFace = Math.PI - 0.25;
        } else {
          const u = THREE.MathUtils.clamp((mt - 2.75) / 0.55, 0, 1);
          naiwaY = 4 * u * (1 - u) * 0.85;
          naiwaAction = 'Jump';
        }
        // 豆包老师面向奶娃扑抓
        const nx = Math.cos(show.naiwaAngle) * TRACK_R;
        const nz = Math.sin(show.naiwaAngle) * TRACK_R;
        const tx = Math.cos(show.teacherAngle) * TRACK_R;
        const tz = Math.sin(show.teacherAngle) * TRACK_R;
        teacherCustomFace = Math.atan2(nx - tx, nz - tz);

        if (mt >= 3.35) {
          show.mode = 'boost';
          show.modeT = 0;
        }
      } else {
        // 火箭加速逃跑秀（2.2 秒屁股喷火冲刺拉大距离，再自然回落到常规追逐）
        showRocket = true;
        naiwaSpeed = 1.58;
        teacherSpeed = 1.24;
        show.naiwaAngle += naiwaSpeed * dt;
        show.teacherAngle += teacherSpeed * dt;
        naiwaAnimSpeed = 1.42;
        teacherAnimSpeed = 1.25;
        if (show.modeT >= 2.2) {
          show.mode = 'chase';
          show.modeT = 0;
          show.jumpCooldown = 1.8;
        }
      }

      // 计算两人圆环轨道世界坐标与平滑朝向
      const nCos = Math.cos(show.naiwaAngle), nSin = Math.sin(show.naiwaAngle);
      const tCos = Math.cos(show.teacherAngle), tSin = Math.sin(show.teacherAngle);
      const nWx = stageX + nCos * TRACK_R;
      const nWz = stageZ + nSin * TRACK_R;
      const tWx = stageX + tCos * TRACK_R;
      const tWz = stageZ + tSin * TRACK_R;

      // 切线方向（角度递增时为 (-sin, +cos)）
      const nTargetRot = naiwaCustomFace !== null ? naiwaCustomFace : Math.atan2(nSin, -nCos);
      const tTargetRot = teacherCustomFace !== null ? teacherCustomFace : Math.atan2(-tSin, tCos);
      show.naiwaRot = lerpAngle(show.naiwaRot, nTargetRot, 1 - Math.exp(-10 * dt));
      show.teacherRot = lerpAngle(show.teacherRot, tTargetRot, 1 - Math.exp(-10 * dt));

      const ud = player.userData;
      player.visible = true;
      player.position.set(nWx, stageY + naiwaY, nWz);
      player.rotation.set(0, show.naiwaRot, show.mode === 'boost' ? 0.14 : 0);
      ud.spin.rotation.x = showRocket ? -0.22 : 0;
      ud.egg.visible = false;
      ud.torso.visible = !runnerRig;
      for (const leg of ud.legs) leg.visible = ud.torso.visible;
      if (ud.shieldMesh) ud.shieldMesh.visible = false;

      // 火箭喷火小彩蛋
      ud.aura.visible = showRocket;
      if (showRocket) {
        const flames = ud.auraFlames || ud.aura.children;
        flames.forEach((f, i) => f.scale.set(
          0.85 + Math.abs(Math.sin(t * 24 + i)) * 0.35,
          0.75 + Math.abs(Math.sin(t * 28 + i * 1.4)) * 0.65,
          0.85 + Math.abs(Math.sin(t * 24 + i)) * 0.35
        ));
      }

      if (runnerRig) {
        runnerRig.model.visible = true;
        runnerRig.animate(naiwaAction, dt, naiwaAnimSpeed);
      } else {
        const sw = Math.sin(t * 11);
        const moving = naiwaAction === 'Run';
        ud.legs[0].rotation.x = moving ? sw * 0.75 : 0;
        ud.legs[1].rotation.x = moving ? -sw * 0.75 : 0;
        ud.arms[0].rotation.x = moving ? -sw * 0.65 : -0.35;
        ud.arms[1].rotation.x = moving ? sw * 0.65 : -0.35;
      }

      chaser.visible = true;
      chaser.position.set(tWx, stageY + teacherY, tWz);
      chaser.rotation.set(0, show.teacherRot, 0);
      if (chaserRig) {
        chaserRig.animate(teacherAction, dt, teacherAnimSpeed);
      } else if (chaserBackup?.userData?.arms) {
        for (const [i, arm] of chaserBackup.userData.arms.entries()) {
          const sw = Math.sin(t * 11 + i * Math.PI);
          arm.rotation.x = teacherAction === 'Grab' ? -1.35 : teacherAction === 'Run' ? sw * 0.55 : 0;
        }
      }

      // 脚底接触阴影贴合悬浮舞台顶面（stageY + 0.03）
      const [runnerShadow, chaserShadow] = actorShadows;
      const updateShadow = (sh, actor, lift, w, d) => {
        sh.visible = true;
        const spread = 1 + Math.min(lift, 1.5) * 0.25;
        sh.position.set(actor.position.x, stageY + 0.035, actor.position.z);
        sh.rotation.set(-Math.PI / 2, 0, 0);
        sh.scale.set(w * spread, d * spread, 1);
        sh.material.opacity = 0.85 / (1 + lift * 1.7);
      };
      updateShadow(runnerShadow, player, naiwaY, 1.52, 1.18);
      updateShadow(chaserShadow, chaser, teacherY, 1.24, 1.16);

      // 电影级平滑鼠标 3D 视差运镜 + 轻微自然呼吸漂移
      const damp = 1 - Math.exp(-4.5 * dt);
      pointer.x += (pointer.tx - pointer.x) * damp;
      pointer.y += (pointer.ty - pointer.y) * damp;

      const driftX = Math.sin(t * 0.42) * 0.26;
      const driftY = Math.cos(t * 0.55) * 0.12;
      if (portrait) {
        camera.position.set(
          pointer.x * 0.60 + driftX,
          3.95 - pointer.y * 0.32 + driftY,
          12.4
        );
        camera.lookAt(0, 1.55, 0);
      } else {
        const camZ = THREE.MathUtils.lerp(13.2, 11.4, wide);
        camera.position.set(
          0.15 + pointer.x * 0.78 + driftX,
          3.45 - pointer.y * 0.38 + driftY,
          camZ
        );
        camera.lookAt(THREE.MathUtils.lerp(0.15, 0.35, wide), 0.92, 0);
      }
    }

    return { scene, camera, update, reset, resize };
  }

  return { create };
})();
