/* 奶娃快跑 · three.js 3D 主逻辑（地铁跑酷式 · 大众化热梗） */
const stage = document.getElementById('stage');
const handheld = window.matchMedia('(pointer: coarse)').matches;
const renderer = new THREE.WebGLRenderer({ antialias: !handheld });
renderer.shadowMap.enabled = !handheld;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.id = 'game';
stage.insertBefore(renderer.domElement, stage.firstChild);
let needsRender = true;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xede2d1, 50, 126);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

const LANE_X = [-2.4, 0, 2.4];
const GRAVITY = 26, JUMP_V = 8.4;
const DISTRICT_LENGTH = 220;
const DISTRICTS = [
  { name: '奶娃大学城', buildings: [['CampusLibrary', '图书馆', 0xc48a70],
    ['AcademicHall', '早八教学楼', 0xd7c7ab], ['Dormitory', '青春宿舍', 0xd39c79]],
    colors: { sky: 0x77abb6, horizon: 0xf5dabb, distance: 0xd9ceb5,
      farHill: 0xc1cbba, nearHill: 0xa2b6a0, grass: 0xe3e5dc, sun: 0xffe1ba } },
  { name: '奶昔商业街', buildings: [['TeaCorner', '奶茶研究所', 0xd4a07a],
    ['MilkMarket', '666超市', 0xaac1ad], ['TeaCorner', '快乐星球', 0xd4a07a]],
    colors: { sky: 0x8d9fb8, horizon: 0xf4c7a7, distance: 0xe0c7b1,
      farHill: 0xc5b3b0, nearHill: 0xabaa9c, grass: 0xece1d2, sun: 0xffd3a7 } },
  { name: '躺平公园', buildings: [['ParkPavilion', '摸鱼亭', 0x648379],
    ['ParkPavilion', '慢生活馆', 0x648379]],
    colors: { sky: 0x7aafb8, horizon: 0xe8e5ca, distance: 0xc7d4bf,
      farHill: 0xadc7bd, nearHill: 0x8ba99b, grass: 0xe9f1d6, sun: 0xffead2 } },
];
const districtAt = pos => DISTRICTS[Math.floor(Math.max(0, pos) / DISTRICT_LENGTH) % DISTRICTS.length];
const MENU_TIPS = [
  '温馨提示：跑不过 DDL 是正常的',
  '温馨提示：奶娃饿了就要喝奶',
  '温馨提示：摸鱼跑两把，班味减半',
  '温馨提示：早八再赶，也别撞闹钟',
  '温馨提示：画饼虽大，奶蛋能过',
  '温馨提示：低头看手机，抬头撞手机',
  '温馨提示：如何呢，又能怎？先跑一把再说',
  '温馨提示：牌没有问题，继续跑',
  '温馨提示：过程基础，走位不基础',
  '温馨提示：敬自己一杯，然后接着跑',
  '温馨提示：助我破鼎，破的是自己的纪录',
  '温馨提示：来财！来分！来点奶币！',
  '温馨提示：爱你老己，别撞货车',
  '温馨提示：活人感拉满的一局',
  '温馨提示：赛博对账：你欠自己一个高分',
  '温馨提示：从从容容游刃有余，别连滚带爬',
  '温馨提示：我要验牌——验的是你的走位',
  '温馨提示：我去，不早说，差点撞上',
  '温馨提示：蒜鸟蒜鸟，这局不算',
  '温馨提示：真没空陪你闹了，奶娃要冲了',
  '温馨提示：低山臭水遇知音，高架桥上遇货车',
  '温馨提示：不知道，我的走位很曼妙',
  '温馨提示：村咖营业中，奶娃快跑营业中',
  '温馨提示：小镇做题家，也在努力跑图',
  '温馨提示：千百次练习只为这一刻——先跑起来',
  '温馨提示：情绪价值 +1 奶币',
];
const PAUSE_TITLES = ['摸鱼中…', '战术暂停', '中场休息', '装死中…', '赛博挂机', '先喘口气', '奶娃系鞋带', '暂停即胜利'];
const PAUSE_QUIPS = [
  '如何呢，又能怎？先歇一下。',
  '敬自己一杯，再继续卷。',
  '牌没有问题，随时继续。',
  '助我破鼎——先补个蓝。',
  '从从容容暂停，游刃有余继续。',
  '真没空陪你闹了，但还是停了。',
  '我去，不早说，先暂停。',
  '蒜鸟蒜鸟，就不跑了。',
  '爱你老己，先保命。',
  '预制暂停，随时加热。',
  '低山臭水遇知音，暂停一下遇自己。',
  '不知道，我的走位很曼妙。',
  '活人感：会暂停的奶娃。',
  '赛博对账：暂停不算输。',
];
const OVER_TITLES = ['芭比Q了！', '饿~', '破防了！', '奶娃倒下了'];
const VERDICTS = {
  low: ['奶娃：我还没喝够奶呢！', '这就饿了？再跑两口奶！', '开局即下班，奶娃躺平。'],
  mid: ['有点东西，但不多。', '已读乱回式跑法。', '卷王看了直摇头。'],
  high: ['可以，这很卷王。', '背手负鼠：已经很累但还得跑。', '这跑法，我要验牌！'],
  pro: ['这操作，666！', '导师看了都沉默。'],
  god: ['遥遥领先！建议直接保研。', '雪山救狐狸级操作！爱你老己！'],
};
const OVER_FEET = ['奶娃倒下了，但没完全倒下', '再来一把，班味就没了', '本次摸鱼已存档', '失败是成功之母，奶是奶娃之母', '奶娃：明天再卷'];
const TRUCK_COLORS = [0x4aa3ff, 0xff8f4a, 0x63c46a, 0xffb3c9, 0xb3e0ff];
const TRUCK = Models.truckGeometry;
const TRUCK_TYPES = {
  truck: { half: TRUCK.shortHalf, ramp: false, long: false },
  ramptruck: { half: TRUCK.shortHalf, ramp: true, long: false },
  longtruck: { half: TRUCK.longHalf, ramp: false, long: true },
  longramptruck: { half: TRUCK.longHalf, ramp: true, long: true },
};
const FOOT_REACH = 0.23;
const FLOOR_EPSILON = 0.025;
const MAX_PHYSICS_STEP = 1 / 120;
const FIRST_ROAD_SECTION = 26;
const JUMP_TIME = 2 * JUMP_V / GRAVITY;
const OPENING_TRUCK_LAYOUT = { route: [['longramptruck', 0], ['longtruck', 0], ['longramptruck', 0]] };
const TRUCK_LAYOUTS = [
  { route: [['ramptruck', 0], ['longtruck', 0]] },
  { route: [['longramptruck', 0], ['truck', 1]] },
  { route: [['longramptruck', 0], ['longtruck', 1], ['ramptruck', 1]] },
  { route: [['ramptruck', 0], ['longramptruck', 0], ['truck', 1]] },
  { route: [['longramptruck', 0], ['longramptruck', 1], ['longtruck', 0]] },
  { route: [['longramptruck', 0]], parallel: 'truck' },
  { route: [['ramptruck', 0]], parallel: 'longramptruck' },
];
const STREET_ROWS = [
  ['low', 'wall'], ['bing', 'low'], ['wall', 'bing'], ['low', 'meme'],
  ['truck', 'low'], ['wall', 'power'],
];
const STREET_TOP = { alarm: 0.7, gang: 0.7, bing: 2.3, thanos: 2.25, emo: 2.28, phone: 2.3 };
const AIR_FLIP_DUR = 0.62; // 一次跳跃的滞空时间，正好转满一圈
const SLIDE_DURATION = 0.75;
const CHASE_DURATION = 4.8;
const CHASE_TRAIL_METRES = 12;
const CAPTURE_LENGTH = 1.4;
const CAPTURE_REACH = 0.38;
const CAPTURE_CONTACT = 0.82;
const STREET_DETAIL_DISTANCE = handheld ? 40 : 52;
const chaseTrail = [{ distance: 0, x: 0, y: 0 }];

const G = {
  state: 'menu', t: 0, distance: 0, speed: 13, coins: 0, score: 0,
  lane: 1, px: 0, py: 0, vy: 0, sliding: 0, pendingSlide: false, rollTime: 0,
  shield: 0, sprint: 0, magnet: 0, grace: 0,
  objects: [], buildings: [], nextSpawn: FIRST_ROAD_SECTION, nextConvoy: FIRST_ROAD_SECTION,
  nextShieldRun: FIRST_ROAD_SECTION, openLane: 0, lastStreetRow: null, roofHint: false,
  truckDeck: [], lastTruckLayout: null,
  nextBuilding: 5, nextLamp: 20, nextGantry: 60, nextScenery: 8, nextCrosswalk: 95, nextLandmark: 30,
  particles: [], flyingObstacles: [], shake: 0, deadTimer: 0, phase: 0, airTime: 0, support: 0, surface: null,
  grounded: true, jumping: false, jumpFrom: 0, speedTier: 0, chaseTime: 0, chaseActive: false,
  motion: '', motionUntil: 0, capture: null, roofHintUntil: 0,
  best: +(localStorage.getItem('naiwa-best') || 0),
};

/* ---------- 场景搭建 ---------- */
const sky = Models.skyDome();
const farHill = Models.hills(234, 56, 0.7, scene.fog.color);
const nearHill = Models.hills(154, 26, 2.8, scene.fog.color);
scene.add(sky, farHill, nearHill);
const clouds = [
  [-63, 29, -142, 44, 10], [50, 36, -137, 41, 10], [6, 15, -184, 31, 5.5],
  [-33, 19, -112, 23, 6.3], [65, 24, -180, 47, 8], [108, 26, -63, 39, 11],
].map(([x, y, z, width, height]) => {
  const cloud = Models.cloud();
  cloud.position.set(x, y, z);
  cloud.scale.set(width, height, 1);
  cloud.material.opacity = 0.84;
  scene.add(cloud);
  return cloud;
});
const hemi = new THREE.HemisphereLight(0xd9edf2, 0xaaa58c, 0.78); scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffe1ba, 0.78);
// 将阴影范围对准角色和近处赛道，同时保持太阳的照射方向。
const shadowTargetZ = -8;
dir.target.position.z = shadowTargetZ;
dir.position.set(-25, 32, shadowTargetZ - 7);
dir.castShadow = true;
dir.shadow.mapSize.set(512, 512);
dir.shadow.camera.left = -22; dir.shadow.camera.right = 18;
dir.shadow.camera.top = 20; dir.shadow.camera.bottom = -26;
dir.shadow.camera.near = 1; dir.shadow.camera.far = 120;
dir.shadow.bias = -0.0005;
scene.add(dir, dir.target);
const fill = new THREE.DirectionalLight(0xd7eaf1, 0.27);
fill.position.set(12, 10, 16);
scene.add(fill);

const lawnTex = Models.lawnTexture();
lawnTex.repeat.set(84, 84);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ map: lawnTex }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.06; ground.receiveShadow = true;
scene.add(ground);
const trackTex = Models.trackTexture();
trackTex.repeat.set(1, 40);
const track = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 400), new THREE.MeshLambertMaterial({ map: trackTex }));
track.rotation.x = -Math.PI / 2; track.position.set(0, 0.02, -160); track.receiveShadow = true;
scene.add(track);
const sidewalkTex = Models.sidewalkTexture();
sidewalkTex.repeat.set(1.5, 90);
for (const sx of [-3.8, 3.8]) {
  const curb = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 400), Models.L(0xa79e8d));
  curb.position.set(sx, 0.08, -160); curb.receiveShadow = true; scene.add(curb);
  const side = Math.sign(sx);
  const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 400), new THREE.MeshLambertMaterial({ map: sidewalkTex }));
  sidewalk.position.set(side * 5.2, 0.03, -160); sidewalk.receiveShadow = true; scene.add(sidewalk);
  const outerCurb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 400), Models.L(0x8f8b76));
  outerCurb.position.set(side * 6.5, 0.05, -160); scene.add(outerCurb);
}
const skyColors = sky.material.uniforms;
const districtColors = {
  sky: skyColors.topColor.value, horizon: skyColors.horizonColor.value, distance: scene.fog.color,
  farHill: farHill.material.uniforms.ridgeColor.value, nearHill: nearHill.material.uniforms.ridgeColor.value,
  grass: ground.material.color, sun: dir.color,
};
const colorTargets = Object.entries(districtColors);
const blendColor = new THREE.Color();
let paintedDistrict = null, paintedBlend = -1;
function updateDistrictArt() {
  const here = districtAt(G.distance);
  const progress = G.distance % DISTRICT_LENGTH;
  const blend = THREE.MathUtils.smoothstep(progress, DISTRICT_LENGTH - 34, DISTRICT_LENGTH);
  if (here === paintedDistrict && blend === paintedBlend) return;
  paintedDistrict = here;
  paintedBlend = blend;
  const next = districtAt(G.distance + DISTRICT_LENGTH);
  for (const [name, target] of colorTargets) {
    target.setHex(here.colors[name]).lerp(blendColor.setHex(next.colors[name]), blend);
  }
}
updateDistrictArt();
const postMatrix = new THREE.Matrix4();
function addStreetPosts() {
  const { geometry, material } = Models.post();
  const posts = new THREE.InstancedMesh(geometry, material, 46);
  posts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(posts);
  return posts;
}
let posts = addStreetPosts();
let streetKitReady = false;

const player = Models.naiwa(); scene.add(player);
const chaser = new THREE.Group();
const chaserBackup = Models.doubaoFallback();
chaser.add(chaserBackup);
chaser.visible = false;
scene.add(chaser);
const actorShadows = Models.characterShadows();
for (const shadow of actorShadows) scene.add(shadow);

/* ---------- 角色及骨骼动作 ---------- */
let runnerRig = null, chaserRig = null;
function riggedCharacter(gltf, height) {
  const model = gltf.scene;
  const bounds = new THREE.Box3().setFromObject(model);
  const scale = height / (bounds.max.y - bounds.min.y);
  model.scale.setScalar(scale);
  model.position.y = -bounds.min.y * scale;
  model.traverse(node => {
    if (!node.isSkinnedMesh) return;
    node.castShadow = true;
    node.frustumCulled = false; // 绑定姿势的包围球无法覆盖所有动作
    const source = node.material;
    const { map } = source;
    if (map) map.encoding = THREE.LinearEncoding;
    // 漫反射跟随街景光照，带贴图的底光保留五官和衣服细节。
    node.material = new THREE.MeshLambertMaterial({
      map, color: 0x919191, emissiveMap: map, emissive: 0x3f3f3f,
      side: source.side, skinning: true,
    });
    source.dispose();
  });
  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map(gltf.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
  for (const [name, action] of actions) {
    if (name === 'Idle' || name === 'Run') continue;
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
  }
  let current = null;
  return {
    model,
    animate(name, dt, speed = 1) {
      const action = actions.get(name) ?? actions.get('Idle');
      if (!action) return;
      if (current !== action) {
        action.reset().setEffectiveWeight(1).play();
        if (current) action.crossFadeFrom(current, name === 'Idle' || name === 'Run' ? 0.12 : 0.075, false);
        current = action;
      }
      action.timeScale = speed;
      mixer.update(dt);
    },
  };
}

const bootBackdrop = document.getElementById('boot-backdrop');
const loadingPanel = document.querySelector('.loading-panel');
const loadingStage = document.getElementById('loading-stage');
const loadingPercent = document.getElementById('loading-percent');
const loadingFill = document.getElementById('loading-fill');
const loadingTrack = document.querySelector('.loading-track');
const startButton = document.getElementById('btn-start');
const startLabel = document.getElementById('start-label');
const home = document.getElementById('menu');
let bootReady = false, startRequested = false;

function showLoading(message, progress) {
  if (loadingStage.textContent !== message) loadingStage.textContent = message;
  loadingPercent.textContent = progress + '%';
  loadingFill.style.width = progress + '%';
  loadingTrack.setAttribute('aria-valuenow', progress);
}

function loadGameArt() {
  const loader = new THREE.GLTFLoader();
  const assets = [
    ['assets/naiwa-runner.glb', '奶娃正在热身', gltf => {
      runnerRig = riggedCharacter(gltf, 1.9);
      const skin = runnerRig.model;
      skin.rotation.y = Math.PI; // GLB 面朝 +Z，游戏向 -Z 前进
      skin.position.y -= player.userData.spin.position.y;
      skin.visible = false;
      player.userData.spin.add(skin);
    }],
    ['assets/doubao-teacher.glb', '豆包老师准备出场', gltf => {
      chaserRig = riggedCharacter(gltf, 2.15);
      chaserBackup.visible = false;
      chaser.add(chaserRig.model);
    }],
    ['assets/street-kit.glb', '正在铺设街景', gltf => {
      Models.installStreetKit(gltf.scene);
      streetKitReady = true;
      for (const entry of G.buildings) {
        if (!entry.fallbackFactory) continue;
        const replacement = entry.fallbackFactory();
        replacement.position.copy(entry.mesh.position);
        replacement.rotation.copy(entry.mesh.rotation);
        replacement.scale.copy(entry.mesh.scale);
        if (entry.key) replacement.userData.poolKey = entry.key;
        Models.setStreetDetail(replacement, entry.far);
        disposeObject(entry.mesh);
        scene.add(replacement);
        entry.mesh = replacement;
        entry.fallbackFactory = null;
      }
      disposeObject(posts);
      posts.dispose();
      posts = addStreetPosts();
      postOffset = NaN;
      updatePosts();
    }],
    ['assets/obstacle-kit.glb', '正在布置障碍物', gltf => Models.installObstacleKit(gltf.scene)],
    ['assets/thanos-obstacle.glb', '灭霸准备出场', gltf => Models.installThanos(gltf.scene)],
  ];
  const stages = assets.map(([, label]) => ({ label, progress: 0, done: false }));
  let pending = stages.length, failures = 0;
  const updateProgress = () => {
    const next = stages.find(stage => !stage.done);
    const progress = stages.reduce((sum, stage) => sum + stage.progress, 0) / stages.length;
    showLoading(next?.label ?? '正在预热赛道', Math.round(progress * 92));
  };
  updateProgress();

  assets.forEach(([url, , install], index) => {
    const stage = stages[index];
    const complete = (gltf, error) => {
      if (stage.done) return;
      clearTimeout(timeout);
      if (gltf) {
        try { install(gltf); }
        catch (installError) { error = installError; }
      }
      if (error) {
        failures++;
        console.warn('资源加载失败，已启用备用模型', url, error);
      }
      stage.done = true;
      stage.progress = 1;
      pending--;
      needsRender = true;
      updateProgress();
      if (pending === 0) prewarmPools(frac => showLoading('正在预热赛道', 92 + Math.round(frac * 7)), () => {
        requestAnimationFrame(() => {
          showLoading(failures ? '可以开跑，部分素材使用备用造型' : '赛道准备好了', 100);
          bootBackdrop.classList.add('done');
          loadingPanel.classList.toggle('ready', failures === 0);
          bootReady = true;
          startButton.disabled = false;
          startButton.removeAttribute('aria-busy');
          startLabel.textContent = '开跑';
          if (startRequested) startGame();
        });
      });
    };
    const timeout = setTimeout(() => complete(null, new Error('加载超时')), 9500);
    loader.load(url, gltf => complete(gltf), event => {
      if (stage.done || !event.lengthComputable || event.total <= 0) return;
      stage.progress = Math.max(stage.progress, Math.min(0.94, event.loaded / event.total));
      updateProgress();
    }, error => complete(null, error));
  });
}

function animateChaser(action, dt, speed = 1) {
  if (chaserRig) {
    chaserRig.animate(action, dt, speed);
    return;
  }
  for (const [i, arm] of chaserBackup.userData.arms.entries()) {
    const swing = Math.sin(G.phase + i * Math.PI);
    arm.rotation.x = action === 'Grab' ? -1.38 : action === 'Run' ? swing * 0.55 : 0;
  }
}

function updateCaptureChaser(dt) {
  const { from, side } = G.capture;
  const elapsed = CAPTURE_LENGTH - G.deadTimer;
  const approach = THREE.MathUtils.smoothstep(elapsed, 0, 0.66);
  const x = THREE.MathUtils.lerp(from.x, G.px - side * 0.29, approach);
  const z = THREE.MathUtils.lerp(from.z, 0.78, approach);
  const surface = getTruckSurface(G.distance - z, x);
  const y = THREE.MathUtils.lerp(from.y, surface?.height ?? 0, approach);
  chaser.position.set(x, Math.max(y, surface?.height ?? 0), z);
  chaser.rotation.set(0, Math.atan2(G.px - x, -z), 0);
  chaser.visible = true;
  animateChaser(elapsed >= CAPTURE_REACH ? 'Grab' : 'Run', dt, 1.18);
  return surface;
}

function startChase() {
  G.chaseActive = true;
  G.chaseTime = 0;
}
function trackRunner() {
  if (G.distance <= chaseTrail[chaseTrail.length - 1].distance) return;
  chaseTrail.push({ distance: G.distance, x: G.px, y: G.py });
  while (chaseTrail.length > 2 && chaseTrail[1].distance < G.distance - CHASE_TRAIL_METRES) {
    chaseTrail.shift();
  }
}
function chasePosition(distance) {
  const next = chaseTrail.findIndex(point => point.distance >= distance);
  if (next <= 0) {
    const point = next === 0 ? chaseTrail[0] : chaseTrail[chaseTrail.length - 1];
    return { x: point.x, y: point.y, heading: 0 };
  }
  const a = chaseTrail[next - 1], b = chaseTrail[next];
  const span = b.distance - a.distance;
  const progress = (distance - a.distance) / span;
  return {
    x: THREE.MathUtils.lerp(a.x, b.x, progress),
    y: THREE.MathUtils.lerp(a.y, b.y, progress),
    heading: Math.atan((b.x - a.x) / span),
  };
}
function updateChaser(dt) {
  if (G.capture) return updateCaptureChaser(dt);
  if (G.state === 'menu') {
    chaser.visible = true;
    const portrait = camera.aspect < 0.95;
    chaser.position.set(portrait ? 0.98 : 3.36, 0, portrait ? 0.04 : -0.72);
    chaser.rotation.set(0, -0.34, 0);
    animateChaser(G.t % 10 >= 5.0 && G.t % 10 < 6.5 ? 'Greeting' : 'Idle', dt);
    return;
  }
  if (G.state === 'play') trackRunner();
  chaser.visible = false;
  if (!G.chaseActive || (G.state !== 'play' && G.state !== 'dying')) return;
  G.chaseTime += dt;
  const t = G.chaseTime;
  if (t >= CHASE_DURATION) { G.chaseActive = false; return; }
  const entering = Math.min(1, t / 1.2);
  const exit = Math.max(0, (t - (CHASE_DURATION - 0.8)) / 0.8);
  const gap = 8 - entering * 4.4 + exit * 4.4;
  const distance = G.distance - gap;
  // 在奶娃换道的位置换道，也沿着他的斜坡和跳跃路线追过去。
  const { x, y, heading } = chasePosition(distance);
  const surface = getTruckSurface(distance, x);
  const turn = THREE.MathUtils.clamp(heading, -0.65, 0.65);
  chaser.position.set(x, Math.max(y, surface?.height ?? 0), gap);
  chaser.rotation.set(0, Math.PI - turn, -turn * 0.16);
  chaser.visible = true;
  animateChaser(y - (surface?.height ?? 0) > 0.17 ? 'Jump' : 'Run', dt, Math.min(1.7, G.speed / 13));
  return surface;
}

/* ---------- 对象池 ---------- */
const pool = {};
function acquire(kind, type) {
  const key = kind + ':' + type;
  (pool[key] = pool[key] || []);
  let m = pool[key].pop();
  if (!m) {
    const T = TRUCK_TYPES[type];
    m = kind === 'obs'
      ? (T ? Models.truck(T.ramp, pick(TRUCK_COLORS), T.long) : Models.obstacle(type))
      : kind === 'meme' ? Models.memeBall()
      : kind === 'coin' ? Models.coin() : Models.power(type);
  }
  if (kind === 'obs' && TRUCK_TYPES[type]) {
    m.userData.sign.visible = true;
    if (m.userData.rampSign) m.userData.rampSign.visible = true;
    if (m.userData.jumpMarker) m.userData.jumpMarker.visible = false;
  }
  m.visible = true;
  scene.add(m);
  return m;
}
function release(o) {
  scene.remove(o.mesh);
  o.mesh.visible = false;
  const key = o.kind + ':' + o.type;
  (pool[key] = pool[key] || []).push(o.mesh);
}
// 开局前把赛道会用到的模型先造好并塞进对象池，跑图过程中不再临时创建几何/材质。
const PREWARM_OBSTACLES = ['alarm', 'gang', 'bing', 'thanos', 'emo', 'phone'];
function prewarmPools(progress, ready) {
  const jobs = [];
  const schedule = (key, count, make) => {
    const list = pool[key] || (pool[key] = []);
    for (let i = list.length; i < count; i++) jobs.push(() => {
      const mesh = make();
      mesh.visible = false;
      list.push(mesh);
    });
  };
  schedule('coin:coin', 40, Models.coin);
  for (const type of ['shield', 'sprint', 'magnet']) schedule('power:' + type, 3, () => Models.power(type));
  for (const type of PREWARM_OBSTACLES) schedule('obs:' + type, 3, () => Models.obstacle(type));
  for (const type of Object.keys(TRUCK_TYPES)) {
    const T = TRUCK_TYPES[type];
    schedule('obs:' + type, 2, () => Models.truck(T.ramp, pick(TRUCK_COLORS), T.long));
  }
  schedule('meme:jntm', 1, Models.memeBall);
  let next = 0;
  function warmFrame() {
    const deadline = performance.now() + 4;
    const end = Math.min(jobs.length, next + 9);
    while (next < end && performance.now() < deadline) jobs[next++]();
    progress(jobs.length ? next / jobs.length : 1);
    if (next < jobs.length) requestAnimationFrame(warmFrame);
    else ready();
  }
  requestAnimationFrame(warmFrame);
}

/* ---------- 赛道生成 ---------- */
function addObs(type, laneX, pos) {
  const obstacle = { kind: 'obs', type, wx: laneX, trackPos: pos, resolved: false,
    seed: Math.random() * 10, mesh: acquire('obs', type) };
  G.objects.push(obstacle);
  return obstacle;
}
function addCoin(laneX, pos, y, truck = null) {
  G.objects.push({ kind: 'coin', type: 'coin', wx: laneX, trackPos: pos, baseY: y, truck, resolved: false,
    seed: Math.random() * 10, mesh: acquire('coin', 'coin') });
}
const COIN_SPACING = 4.8;
function addCoinRow(laneX, pos, n = 4, y = 0, truck = null) {
  for (let i = 0; i < n; i++) addCoin(laneX, pos + i * COIN_SPACING, y, truck);
}
function addLaneChangeCoins(fromX, toX, pos) {
  if (fromX === toX) return;
  addCoin(fromX, pos - COIN_SPACING, 0);
  addCoin((fromX + toX) / 2, pos - COIN_SPACING / 2, 0);
  addCoin(toX, pos, 0);
}
function addLowObstacleCoins(laneX, center) {
  const distance = runningSpeed(center) * JUMP_TIME;
  const count = Math.max(2, Math.round(distance / COIN_SPACING));
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const arc = 4 * t * (1 - t) * JUMP_V * JUMP_V / (2 * GRAVITY);
    addCoin(laneX, center + (t - 0.5) * distance, arc);
  }
}
function addPower(laneX, pos, type = pick(['shield', 'sprint', 'magnet'])) {
  G.objects.push({ kind: 'power', type, wx: laneX, trackPos: pos, resolved: false, seed: Math.random() * 10, mesh: acquire('power', type) });
}
/* 梗道具：篮球（鸡你太美） */
function addMeme(laneX, pos) {
  G.objects.push({ kind: 'meme', type: 'jntm', wx: laneX, trackPos: pos, resolved: false, baseY: 0, seed: Math.random() * 10, mesh: acquire('meme', 'jntm') });
}
/* 查询脚下的几何表面，不依赖玩家当前高度。 */
function getTruckSurface(distance, x) {
  let surface = null;
  for (const o of G.objects) {
    const T = TRUCK_TYPES[o.type];
    if (!T) continue;
    const offset = distance - o.trackPos;
    const ramp = offset < -T.half;
    if (offset > T.half + TRUCK.cabLength || (ramp && (!T.ramp || offset < -T.half - TRUCK.rampLength))) continue;
    const width = ramp ? TRUCK.rampWidth : TRUCK.roofWidth;
    if (Math.abs(o.wx - x) > width / 2 + FOOT_REACH) continue;
    const height = ramp ? rampHeight(o.trackPos - T.half, distance) : TRUCK.roofHeight;
    if (!surface || height > surface.height) surface = { truck: o, height, ramp };
  }
  return surface;
}
function runningSpeed(distance) {
  const lateDistance = Math.max(0, distance - 400);
  return Math.min(13 + distance * 0.024 + lateDistance * 0.012, 44);
}
function placeTruck(type, laneX, entrance) {
  const { half, ramp } = TRUCK_TYPES[type];
  return addObs(type, laneX, entrance + half + (ramp ? TRUCK.rampLength : 0));
}
function truckEnd(truck) {
  return truck.trackPos + TRUCK_TYPES[truck.type].half + TRUCK.cabLength;
}
function roofCoins(truck, arrival = null, departure = Infinity) {
  const { half, ramp } = TRUCK_TYPES[truck.type];
  const deckStart = truck.trackPos - half;
  const deckEnd = truck.trackPos + half;
  if (ramp && arrival === null) {
    for (const progress of [0.25, 0.65]) {
      const pos = deckStart - TRUCK.rampLength * (1 - progress);
      addCoin(truck.wx, pos, rampHeight(deckStart, pos), truck);
    }
  }
  const first = Math.max(deckStart + 0.8, (arrival ?? deckStart) + 0.8);
  const last = Math.min(deckEnd - 0.48, departure - 1.05);
  for (let pos = first; pos <= last; pos += COIN_SPACING) {
    addCoin(truck.wx, pos, TRUCK.roofHeight, truck);
  }
}
function extendConvoy(from, type, laneX, opening) {
  const end = truckEnd(from);
  const takeoff = end - (opening ? 2.65 : rand(2.55, 3.15));
  const speed = runningSpeed(takeoff);
  const arrival = takeoff + speed * JUMP_TIME;
  const { ramp, long } = TRUCK_TYPES[type];
  // 以预计落点反推下一辆车的位置，给短车的落点也留出前后余量。
  const landingOffset = opening ? (ramp ? -0.95 : 4.95)
    : ramp ? -rand(0.75, 1.35) : long ? rand(2.8, 3.8) : rand(2.15, 2.65);
  const entrance = Math.max(end + 3.2, arrival - landingOffset - (ramp ? TRUCK.rampLength : 0));
  const truck = placeTruck(type, laneX, entrance);
  const direction = -Math.sign(laneX - from.wx) * Math.PI / 5;
  Models.markTruckJump(from.mesh, from.trackPos - takeoff, direction);
  return { truck, takeoff, arrival };
}
function nextTruckLayout() {
  if (G.truckDeck.length === 0) G.truckDeck = TRUCK_LAYOUTS.slice();
  const choices = G.truckDeck.length > 1
    ? G.truckDeck.filter(layout => layout !== G.lastTruckLayout)
    : G.truckDeck;
  const layout = pick(choices);
  G.truckDeck.splice(G.truckDeck.indexOf(layout), 1);
  G.lastTruckLayout = layout;
  return layout;
}
function spawnConvoy(pos) {
  const opening = pos === FIRST_ROAD_SECTION;
  const { route, parallel } = opening ? OPENING_TRUCK_LAYOUT : nextTruckLayout();
  const adjacentTrucks = opening || route.some(([, lane]) => lane === 1);
  const previousLane = G.openLane;
  G.openLane = pick(LANE_X.filter(x => Math.abs(x - G.openLane) <= LANE_X[2] && (!adjacentTrucks || x !== 0)));
  addLaneChangeCoins(previousLane, G.openLane, pos);
  const lanes = LANE_X.filter(x => x !== G.openLane);
  if (opening ? lanes[0] !== 0 : Math.random() < 0.5) lanes.reverse();
  const [entryType, entryLane] = route[0];
  let truck = placeTruck(entryType, lanes[entryLane], pos);
  let arrival = null;
  for (const [type, lane] of route.slice(1)) {
    const link = extendConvoy(truck, type, lanes[lane], opening);
    roofCoins(truck, arrival, link.takeoff);
    truck = link.truck;
    arrival = link.arrival;
  }
  roofCoins(truck, arrival);
  let end = truckEnd(truck);
  if (parallel) {
    const staggered = placeTruck(parallel, lanes[1], pos + rand(1.8, 5.7));
    if (TRUCK_TYPES[parallel].ramp) roofCoins(staggered);
    end = Math.max(end, truckEnd(staggered));
  }
  const coinStart = previousLane === G.openLane ? pos : pos + COIN_SPACING;
  addCoinRow(G.openLane, coinStart, Math.max(1, Math.floor((end - coinStart) / COIN_SPACING) + 1));
  G.nextConvoy = end + Math.max(43, runningSpeed(end) * rand(2.45, 5.15));
  return end;
}
function spawnShieldRun(pos) {
  const lane = G.openLane === 0 ? pick([LANE_X[0], LANE_X[2]]) : 0;
  addPower(lane, pos, 'shield');
  const truck = placeTruck('truck', lane, pos + 10);
  addCoinRow(G.openLane, pos + 1.2, 4);
  const end = truckEnd(truck);
  G.nextShieldRun = end + Math.max(96, runningSpeed(end) * 5);
  return end;
}
function spawnPattern(pos) {
  if (pos >= G.nextConvoy) return spawnConvoy(pos);
  if (pos >= G.nextShieldRun) return spawnShieldRun(pos);

  // 让奶瓶始终跟着可通行的车道，每组过去后留出下一次换道的距离。
  const previousLane = G.openLane;
  G.openLane = pick(LANE_X.filter(x => Math.abs(x - G.openLane) <= LANE_X[2]));
  addLaneChangeCoins(previousLane, G.openLane, pos);
  const sides = LANE_X.filter(x => x !== G.openLane);
  if (Math.random() < 0.5) sides.reverse();
  const row = pick(STREET_ROWS.filter(pattern => pattern !== G.lastStreetRow));
  G.lastStreetRow = row;
  let end = pos + 7.2;
  for (const [i, slot] of row.entries()) {
    const lane = sides[i];
    if (slot === 'truck') {
      const truck = placeTruck(pick(['truck', 'ramptruck', 'longtruck', 'longramptruck']), lane, pos);
      if (TRUCK_TYPES[truck.type].ramp) roofCoins(truck);
      end = Math.max(end, truckEnd(truck));
    } else if (slot === 'meme') addMeme(lane, pos + 1.2);
    else if (slot === 'power') addPower(lane, pos);
    else {
      const variants = slot === 'low' ? ['alarm', 'gang'] : ['thanos', 'emo', 'phone'];
      const obstaclePos = pos + 2.4;
      addObs(slot === 'bing' ? slot : pick(variants), lane, obstaclePos);
      if (slot === 'low') addLowObstacleCoins(lane, obstaclePos);
    }
  }
  const coinStart = previousLane === G.openLane ? pos : pos + COIN_SPACING;
  addCoinRow(G.openLane, coinStart, Math.max(2, Math.floor((end - coinStart) / COIN_SPACING) + 1));
  return end;
}
const sceneryPools = Object.create(null);
const SCENERY_POOL_MAX = 24;
function retireScenery(entry) {
  const { mesh } = entry;
  scene.remove(mesh);
  mesh.visible = false;
  const key = mesh.userData.poolKey;
  if (!key) { disposeObject(mesh); return; }
  const pool = sceneryPools[key] || (sceneryPools[key] = []);
  if (pool.length < SCENERY_POOL_MAX) pool.push(mesh);
  else disposeObject(mesh);
}
function addScenery(factory, x, pos, rotation = 0, y = 0.1, scale = 1, key = null) {
  const batch = !streetKitReady || factory === Models.crosswalk;
  const poolable = Boolean(key) && !batch;
  const pool = poolable ? (sceneryPools[key] || (sceneryPools[key] = [])) : null;
  let mesh = pool?.pop();
  if (mesh) {
    mesh.visible = true;
  } else {
    mesh = factory();
    if (poolable) mesh.userData.poolKey = key;
  }
  if (batch && !mesh.userData.sceneryBatched) {
    Models.batchScenery(mesh);
    mesh.userData.sceneryBatched = true;
  }
  mesh.position.set(x, y, G.distance - pos);
  mesh.rotation.set(0, rotation, 0);
  mesh.scale.setScalar(scale);
  const far = mesh.position.z < -STREET_DETAIL_DISTANCE;
  Models.setStreetDetail(mesh, far);
  scene.add(mesh);
  G.buildings.push({ trackPos: pos, mesh, far, key,
    fallbackFactory: streetKitReady || factory === Models.crosswalk ? null : factory });
}
function besidePond(pos, side) {
  const center = side < 0 ? 30 : 122;
  return Math.abs(pos % DISTRICT_LENGTH - center) < 12;
}
function spawnBuildings(pos) {
  const district = districtAt(pos), zone = DISTRICTS.indexOf(district);
  const block = pos % DISTRICT_LENGTH;
  for (const side of [-1, 1]) {
    const opening = pos === 5;
    if (zone === 2 && (besidePond(pos, side) || besidePond(pos, -side))) continue;
    if (zone === 0 && side < 0 && block > 19 && block < 43) continue;
    if (zone === 1 && side > 0 && block > 19 && block < 43) continue;
    if (!opening && Math.random() >= (zone === 2 ? 0.26 : 0.91)) continue;
    const [name, sign, color] = opening ? district.buildings[side < 0 ? 0 : 1] : pick(district.buildings);
    const width = zone === 0 ? 5.7 : 5.3;
    const height = zone === 0 ? 7.3 : zone === 1 ? 4.9 : 3.1;
    const angle = -side * (zone === 1 ? 0.63 : 0.46);
    const setback = zone === 2 ? rand(12.4, 15.8) : rand(9.7, 11.4);
    addScenery(() => Models.building(name, sign, color, width, height), side * setback,
      pos + rand(0.2, 2.8), angle, 0, rand(0.89, 1.07),
      `building|${name}|${sign}|${color}`);
  }
}
function spawnLandmarks(pos) {
  const zone = DISTRICTS.indexOf(districtAt(pos));
  if (zone === 0) {
    addScenery(() => Models.landmark('CampusClock', '早八钟楼'), -10.2, pos, 0.54, 0, 1, 'landmark|clock');
  } else if (zone === 1) {
    addScenery(() => Models.landmark('MilkCourt', '奶昔补给站'), 10.2, pos, -0.61, 0, 1, 'landmark|milk');
  } else {
    const second = pos % DISTRICT_LENGTH > 100;
    addScenery(() => Models.landmark('ParkPond'), second ? 11.8 : -11.55, pos,
      second ? Math.PI : 0, 0, 1, 'landmark|pond');
    addScenery(() => Models.landmark('ParkWalk'), second ? -11.8 : 11.8, pos - 1.5,
      second ? Math.PI : 0, 0, 1, 'landmark|walk');
    return second ? DISTRICT_LENGTH - 92 : 92;
  }
  return DISTRICT_LENGTH;
}
function spawnScenery(pos) {
  const zone = DISTRICTS.indexOf(districtAt(pos));
  const index = Math.floor(pos / 14);
  for (const side of [-1, 1]) {
    const facing = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    const addTree = blossom => addScenery(() => Models.tree(blossom), side * rand(5.8, 6.05), pos,
      rand(-0.38, 0.38), 0.12, rand(0.86, 1.08), `tree|${blossom ? 'blossom' : 'plane'}`);
    // 公交站穿插出现，其余位置按区域使用不同组合
    if (zone !== 2 && index > 0 && index % 13 === (side < 0 ? 3 : 9)) {
      addScenery(Models.busStop, side * 5.4, pos, facing, 0.1, 1, 'busStop');
      continue;
    }
    if (zone === 2) {
      const shore = besidePond(pos, side);
      if (!shore) {
        addTree(index % 3 === 0);
        addScenery(Models.parkTree, side * rand(10.8, 15.6), pos + rand(-1, 2), 0, 0,
          rand(1.08, 1.34), 'tree|poplar');
      }
      if (index % 3 === 0) addScenery(Models.flowerBed, side * 4.91, pos + 3.8, facing, 0.1, 1, 'flowerBed');
      if (shore || index % 4 === 1) addScenery(Models.bench, side * 5.8, pos + 4, facing, 0.1, 1, 'bench');
      if (!shore && index % 4 === (side < 0 ? 0 : 2)) {
        addScenery(Models.garden, side * 8.7, pos + 5.5, facing, 0, rand(0.88, 1.15), 'garden');
        addScenery(Models.parkTree, side * 19.6, pos + 8.4, 0.8, 0, rand(1.18, 1.45), 'tree|poplar');
      }
      if (!shore && index % 6 === (side < 0 ? 1 : 4)) {
        addScenery(Models.fountain, side * 9.05, pos + 5.4, 0, 0, 0.92, 'fountain');
      }
    } else if (zone === 0) {
      if (index % 2 === 0) addTree(index % 6 === (side < 0 ? 0 : 2));
      else addScenery(Models.flowerBed, side * 5.05, pos, facing, 0.1, 1, 'flowerBed');
      if (index % 5 === 0 || index % 5 === 2) addScenery(Models.bench, side * 5.8, pos + 3.8, facing, 0.1, 1, 'bench');
    } else {
      if (index % 7 === (side < 0 ? 2 : 4)) addScenery(Models.stall, side * 6.0, pos, facing, 0.1, 1, 'stall');
      else if (index % 3 === 0) addTree(false);
      else addScenery(Models.flowerBed, side * 5.03, pos, facing, 0.1, 1, 'flowerBed');
    }
  }
}
function disposeObject(root) {
  scene.remove(root);
  root.traverse(n => {
    if (n.userData.sharedAsset) return;
    if (n.geometry) n.geometry.dispose();
    const materials = n.material ? (Array.isArray(n.material) ? n.material : [n.material]) : [];
    for (const m of materials) { if (m.map) m.map.dispose(); m.dispose(); }
  });
}
const sceneryStreams = [
  ['nextBuilding', pos => { spawnBuildings(pos); return rand(8.4, 11.1); }],
  ['nextScenery', pos => { spawnScenery(pos); return 14; }],
  ['nextLandmark', spawnLandmarks],
  ['nextCrosswalk', pos => { addScenery(Models.crosswalk, 0, pos, 0, 0.031, 1, 'crosswalk'); return 130; }],
  ['nextLamp', pos => {
    const side = (Math.floor(pos / 16) % 2) ? 1 : -1;
    addScenery(Models.lamp, side * 4.9, pos, side < 0 ? 0 : Math.PI, 0.1, 1, 'lamp');
    return 16;
  }],
  ['nextGantry', pos => {
    const district = districtAt(pos);
    const market = district === DISTRICTS[1];
    addScenery(() => Models.gantry(district.name, market), 0, pos, 0, 0, 1, `gantry|${district.name}`);
    return 68;
  }],
];

function ensureWorld() {
  const menu = G.state === 'menu';
  const sceneryEnd = G.distance + (menu ? 88 : 125);
  // 优先补齐近处，每帧最多生成两组场景。开始页与开跑共用同一段街景。
  for (let i = 0; i < 2; i++) {
    let nearest = sceneryStreams[0];
    for (const stream of sceneryStreams) {
      if (G[stream[0]] < G[nearest[0]]) nearest = stream;
    }
    const [key, spawn] = nearest;
    if (G[key] >= sceneryEnd) break;
    G[key] += spawn(G[key]);
  }
  if (menu) return;

  if (G.nextSpawn < G.distance + 150) {
    const end = spawnPattern(G.nextSpawn);
    G.nextSpawn = end + Math.max(7, runningSpeed(end) * 0.52);
  }
  // 原地压缩数组，避免每帧 filter 生成新数组增加 GC 停顿。
  let write = 0;
  for (const o of G.objects) {
    const T = TRUCK_TYPES[o.type];
    const lastVisible = T
      ? truckEnd(o) + TRUCK.cabOverhang + camera.position.z + 2
      : o.trackPos + 8;
    if (G.distance < lastVisible) G.objects[write++] = o;
    else release(o);
  }
  G.objects.length = write;
  write = 0;
  for (const b of G.buildings) {
    if (b.trackPos - G.distance > -10 - (b.mesh.userData.sceneryTail ?? 0)) G.buildings[write++] = b;
    else retireScenery(b);
  }
  G.buildings.length = write;
}

/* ---------- 特效 ---------- */
const popupsEl = document.getElementById('popups');
function popup(text, color = '#fff6e3') {
  const el = document.createElement('div');
  el.className = 'popup';
  el.textContent = text;
  el.style.color = color;
  el.style.left = (50 + rand(-8, 8)) + '%';
  popupsEl.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}
const partPool = [];
function burst(x, y, z, color, n = 10, spd = 8) {
  for (let i = 0; i < n; i++) {
    let p = partPool.pop();
    if (!p) { p = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); scene.add(p); }
    p.material.color.set(color);
    p.position.set(x, y, z);
    p.visible = true;
    const a = rand(0, Math.PI * 2);
    G.particles.push({ m: p, vx: Math.cos(a) * rand(spd * 0.3, spd), vy: rand(2, spd), vz: Math.sin(a) * rand(spd * 0.3, spd), life: rand(0.3, 0.7), max: 0.7 });
  }
}

const FLIGHT_SECONDS = 0.92;
const FLASH_SECONDS = 0.30;
let flashTexture;
function makeSkyFlash() {
  if (!flashTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const glow = ctx.createRadialGradient(64, 64, 3, 64, 64, 64);
    glow.addColorStop(0, 'rgba(255, 246, 186, 0.95)');
    glow.addColorStop(0.43, 'rgba(255, 220, 103, 0.37)');
    glow.addColorStop(1, 'rgba(255, 220, 103, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 128, 128);
    ctx.beginPath();
    ctx.moveTo(64, 5);
    ctx.quadraticCurveTo(69, 60, 123, 64);
    ctx.quadraticCurveTo(69, 68, 64, 123);
    ctx.quadraticCurveTo(59, 68, 5, 64);
    ctx.quadraticCurveTo(59, 60, 64, 5);
    ctx.closePath();
    ctx.strokeStyle = '#ffcf54';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fffef5';
    ctx.fill();
    flashTexture = new THREE.CanvasTexture(canvas);
  }
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture, depthWrite: false, fog: false }));
}

function hasImpactPower() { return G.sprint > 0 || G.shield > 0; }

function throwObstacle(obstacle) {
  if (G.sprint <= 0) G.shield--;
  obstacle.resolved = true;
  const { mesh, type, wx, trackPos } = obstacle;
  const center = (STREET_TOP[type] ?? TRUCK.roofHeight) / 2;
  const firstZ = G.distance - trackPos;
  const pivot = new THREE.Group();
  pivot.position.set(wx, center, firstZ);
  mesh.position.set(0, -center, 0);
  const labels = [];
  mesh.traverse(node => {
    if (!node.isSprite || !node.visible) return;
    node.visible = false;
    labels.push(node);
  });
  if (mesh.userData.jumpMarker?.visible) {
    mesh.userData.jumpMarker.visible = false;
    labels.push(mesh.userData.jumpMarker);
  }
  pivot.add(mesh);
  const flash = makeSkyFlash();
  flash.visible = false;
  scene.add(pivot, flash);
  G.objects = G.objects.filter(o => {
    if (o === obstacle) return false;
    if (o.truck !== obstacle || o.pull) return true;
    o.resolved = true;
    release(o);
    return false;
  });
  const side = wx === 0 ? pick([-1, 1]) : Math.sign(wx);
  G.flyingObstacles.push({ obstacle, pivot, flash, labels, center, firstZ, side, age: 0 });
  G.shake = Math.max(G.shake, 0.24);
  burst(G.px, G.py + 0.75, 0, 0xffcf59, 16, 9);
  AudioSys.smash();
  popup('肘开！', '#ffe788');
}

function releaseFlight(flight) {
  const { obstacle, labels } = flight;
  flight.pivot.remove(obstacle.mesh);
  obstacle.mesh.position.set(0, 0, 0);
  for (const label of labels) label.visible = true;
  release(obstacle);
  scene.remove(flight.pivot, flight.flash);
  flight.flash.material.dispose();
}

function updateFlyingObstacles(dt) {
  for (let i = G.flyingObstacles.length - 1; i >= 0; i--) {
    const flight = G.flyingObstacles[i];
    const { pivot, flash, obstacle, center, firstZ, side } = flight;
    flight.age += dt;
    if (flight.age >= FLIGHT_SECONDS + FLASH_SECONDS) {
      releaseFlight(flight);
      G.flyingObstacles.splice(i, 1);
      continue;
    }
    const u = Math.min(1, flight.age / FLIGHT_SECONDS);
    const climb = 1 - (1 - u) ** 1.6;
    pivot.position.set(obstacle.wx + side * (1.4 * u + 1.0 * u * u),
      center + 8.4 * climb, firstZ - 7 * u - 10 * u * u);
    pivot.rotation.set(5.6 * u * u, side * 1.45 * Math.PI * 2 * u, side * 0.65 * u);
    pivot.scale.setScalar(1 - 0.84 * u * u);
    if (u === 1) {
      if (!flash.visible) AudioSys.chime(1568, 0.13, 0.1);
      const sparkle = (flight.age - FLIGHT_SECONDS) / FLASH_SECONDS;
      pivot.visible = false;
      flash.visible = true;
      flash.position.copy(pivot.position);
      flash.scale.setScalar(1.2 + 2.8 * Math.min(1, sparkle * 4));
      flash.material.opacity = (1 - Math.max(0, (sparkle - 0.22) / 0.78)) ** 1.35;
    }
  }
}

/* ---------- 玩家动作 ---------- */
function moveLane(dir) {
  const next = Math.max(0, Math.min(2, G.lane + dir));
  if (next === G.lane) return;
  G.lane = next;
  if (G.sliding > 0) G.sliding = 0; // 左右滑可取消奶蛋出击，更丝滑
  bodyMotion(dir < 0 ? 'DodgeLeft' : 'DodgeRight', 0.32);
  AudioSys.dash(); AudioSys.fastSay('闪身步!'); popup('闪身步!', '#8fe8ff');
}
function doJump() {
  if (!G.grounded) return;
  if (G.sliding > 0) G.sliding = 0; // 跳跃可取消奶蛋出击
  G.vy = JUMP_V; G.airTime = 0; G.jumpFrom = G.py;
  G.grounded = false; G.jumping = true;
  AudioSys.jump(); AudioSys.fastSay('中国人能飞'); popup('中国人能飞!', '#ffd93f');
}
function doSlide() {
  if (G.sliding > 0 || G.pendingSlide) return;
  if (G.grounded) G.sliding = SLIDE_DURATION;
  else { G.vy = -24; G.pendingSlide = true; }
  G.rollTime = 0;
  AudioSys.slide(); AudioSys.fastSay('奶蛋出击!'); popup('奶蛋出击!', '#ffd93f');
}

/* ---------- 碰撞与结算 ---------- */
function bodyMotion(name, duration) {
  G.motion = name;
  G.motionUntil = G.t + duration;
}

function crash() {
  G.state = 'dying';
  G.deadTimer = CAPTURE_LENGTH;
  G.shake = 0.44;
  G.capture = {
    from: chaser.visible ? chaser.position.clone()
      : new THREE.Vector3(G.px, getTruckSurface(G.distance - 3.9, G.px)?.height ?? 0, 3.9),
    side: G.px > 0 ? -1 : 1, height: G.py, touched: false, signs: [],
  };
  G.capture.from.z = THREE.MathUtils.clamp(G.capture.from.z, 1.35, 5.8);
  for (const obstacle of G.objects) {
    if (obstacle.kind !== 'obs' || Math.abs(obstacle.trackPos - G.distance) > 18) continue;
    obstacle.mesh.traverse(node => {
      if (!node.isSprite || !node.visible) return;
      node.visible = false;
      G.capture.signs.push(node);
    });
  }
  setCoach('');
  AudioSys.eh();
  popupsEl.replaceChildren();
  AudioSys.noise(0.3, 0.15, 200); AudioSys.duckBGM(true);
  burst(G.px, G.py + 1, 0, 0xff5c5c, 24, 10);
  burst(G.px, G.py + 1, 0, 0xffd93f, 12, 8);
}
function showGameOver() {
  G.state = 'over';
  setCoach('');
  const isRecord = G.score > G.best;
  if (isRecord) { G.best = G.score; localStorage.setItem('naiwa-best', String(G.best)); }
  document.getElementById('final-score').textContent = G.score;
  document.getElementById('final-coins').textContent = G.coins;
  document.getElementById('final-best').textContent = G.best;
  document.getElementById('new-record').classList.toggle('hidden', !isRecord);
  const s = G.score;
  const tier = s < 300 ? 'low' : s < 800 ? 'mid' : s < 1800 ? 'high' : s < 3500 ? 'pro' : 'god';
  document.querySelector('#gameover .over-title').textContent = pick(OVER_TITLES);
  document.getElementById('verdict').textContent = pick(VERDICTS[tier]);
  const foot = document.getElementById('over-foot');
  if (foot) foot.textContent = pick(OVER_FEET);
  document.getElementById('gameover').classList.remove('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('btn-restart').focus({ preventScroll: true });
  if (isRecord) AudioSys.say('遥遥领先!', 0);
}
function collectCoin(o, at) {
  o.resolved = true; G.coins++;
  AudioSys.coin();
  const p = at || { x: o.wx, y: 0.6, z: -(o.trackPos - G.distance) };
  burst(p.x, p.y, p.z, 0xffd93f, 6, 6);
  if (G.coins % 10 === 0) { AudioSys.say('666!', 1.5); popup(`666! ${G.coins} 奶币`, '#ffd93f'); }
}
function collectMeme(o) {
  o.resolved = true; G.coins += 5;
  AudioSys.coin();
  popup('鸡你太美! +5 奶币', '#ffd93f');
  burst(o.wx, 1.0, -(o.trackPos - G.distance), 0xff8a1f, 12, 8);
}

function applyPower(o) {
  o.resolved = true; AudioSys.power();
  burst(o.wx, 0.8, 0, 0xff9fcf, 14, 8);
  if (o.type === 'shield') { G.shield = Math.min(3, (G.shield || 0) + 1); popup(`相信光盾 x${G.shield}!`, '#8fe8ff'); AudioSys.say('相信光!', 1); }
  else if (o.type === 'sprint') { G.sprint = 4.5; popup('奥利给!冲!', '#ffb03f'); AudioSys.say('奥利给!', 1); }
  else { G.magnet = 8; popup('库里库里~', '#8fe8ff'); AudioSys.say('磁吸奶瓶,吸!', 1); }
}
function hitObstacle(o) {
  // 小障碍碎掉，货车仍然留在赛道上。
  if (!TRUCK_TYPES[o.type]) { o.resolved = true; o.destroyed = true; }
  if (G.grace > 0) { crash(); return; }
  G.grace = 5; G.shake = 0.7;
  bodyMotion('Stumble', 0.48);
  startChase();
  burst(G.px, G.py + 1, 0, 0xffb03f, 22, 11);
  burst(G.px, G.py + 1.3, 0, 0xff5c5c, 12, 8);
  AudioSys.smash(); AudioSys.say('豆包老师来了!', 0);
  popup('快跑！5 秒内别再撞！', '#ff9fcf');
}
function checkCollisions() {
  for (const o of G.objects) {
    if (o.resolved || TRUCK_TYPES[o.type]) continue;
    if (o.kind === 'coin' && o.pull) continue;
    const z = o.trackPos - G.distance;
    // 磁铁：不在原地换车道，而是让金币进入“飞向奶娃”的吸附动画（见 updateWorldMeshes）
    if (o.kind === 'coin' && G.magnet > 0 && z > 0 && z < 20) {
      o.pull = true; o.pullT = 0;
      o.pullX0 = o.wx; o.pullY0 = (o.baseY || 0) + 0.6; o.pullZ0 = -z;
      continue;
    }
    if (z > 1.2 || z < -1.2) continue;
    if (Math.abs(o.wx - G.px) > 1.1) continue;
    if (o.kind === 'coin') { if (Math.abs(G.py - (o.baseY || 0)) < 0.9) collectCoin(o); }
    else if (o.kind === 'power') { if (Math.abs(G.py - (o.baseY || 0)) < 1.2) applyPower(o); }
    else if (o.kind === 'meme') { if (Math.abs(G.py - (o.baseY || 0)) < 1.3) collectMeme(o); }
    else {
      const top = STREET_TOP[o.type] ?? TRUCK.roofHeight;
      if (G.py >= top - FLOOR_EPSILON) continue;
      if (o.type === 'bing' && (G.sliding > 0 || G.pendingSlide)) o.resolved = true;
      else if (hasImpactPower()) throwObstacle(o);
      else hitObstacle(o);
      if (G.state !== 'play') break;
    }
  }
}

/* ---------- 玩家与货车的运动 ---------- */
function rampHeight(deckStart, distance) {
  const progress = 1 + (distance - deckStart) / TRUCK.rampLength;
  return TRUCK.roofHeight * THREE.MathUtils.clamp(progress, 0, 1);
}

// 同时检查前进方向和左右换道，取脚经过这块表面的时间段。
function surfaceContactRange(lastDistance, lastX, near, far, laneX, halfWidth) {
  const travel = G.distance - lastDistance;
  const side = G.px - lastX;
  let enter = Math.max(0, (near - lastDistance) / travel);
  let leave = Math.min(1, (far - lastDistance) / travel);
  if (side !== 0) {
    const left = (laneX - halfWidth - lastX) / side;
    const right = (laneX + halfWidth - lastX) / side;
    enter = Math.max(enter, Math.min(left, right));
    leave = Math.min(leave, Math.max(left, right));
  } else if (Math.abs(lastX - laneX) > halfWidth) return null;
  return enter <= leave ? { enter, leave } : null;
}

function entersFromAbove(surface, lastDistance, lastX, dt, nextVY) {
  const truck = surface.truck;
  const spec = TRUCK_TYPES[truck.type];
  const deckStart = truck.trackPos - spec.half;
  const feetAt = progress => {
    const t = dt * progress;
    return G.py + G.vy * t - 0.5 * GRAVITY * t * t;
  };
  if (spec.ramp && lastDistance <= deckStart) {
    const slope = surfaceContactRange(lastDistance, lastX, deckStart - TRUCK.rampLength, deckStart,
      truck.wx, TRUCK.rampWidth / 2 + FOOT_REACH);
    if (slope) {
      const start = THREE.MathUtils.lerp(lastDistance, G.distance, slope.enter);
      const end = THREE.MathUtils.lerp(lastDistance, G.distance, slope.leave);
      if (feetAt(slope.enter) >= rampHeight(deckStart, start) - FLOOR_EPSILON &&
          feetAt(slope.leave) <= rampHeight(deckStart, end)) return true;
    }
  }
  if (nextVY > 0) return false;
  const deck = surfaceContactRange(lastDistance, lastX, deckStart, truckEnd(truck),
    truck.wx, TRUCK.roofWidth / 2 + FOOT_REACH);
  if (!deck) return false;
  const reach = G.jumping && G.jumpFrom >= TRUCK.roofHeight - FLOOR_EPSILON ? 0.16 : FLOOR_EPSILON;
  return feetAt(deck.enter) >= TRUCK.roofHeight - reach;
}

function setPlayerSurface(surface) {
  G.surface = surface;
  G.support = surface?.height ?? 0;
}

function landPlayer() {
  G.py = G.support;
  G.vy = 0;
  G.airTime = 0;
  G.grounded = true;
  if (G.jumping) {
    burst(G.px, G.py + 0.12, 0, 0xfff6e3, 6, 3.2);
    bodyMotion('Land', 0.25);
  }
  G.jumping = false;
  if (G.pendingSlide) {
    G.pendingSlide = false;
    G.sliding = SLIDE_DURATION;
  }
}

function handleTruckContact(truck, lastDistance, lastX) {
  hitObstacle(truck);
  if (G.state === 'play') {
    let lane = -1, nearest = Infinity;
    for (let i = 0; i < LANE_X.length; i++) {
      const distance = Math.abs(LANE_X[i] - lastX);
      const surface = getTruckSurface(G.distance, LANE_X[i]);
      if (distance < nearest && (!surface || surface.height <= FLOOR_EPSILON)) {
        lane = i; nearest = distance;
      }
    }
    if (lane >= 0) {
      // 侧撞时沿原车道退开，正撞时让开车头，避免留在车身里反复受击。
      const lastSurface = getTruckSurface(G.distance, lastX);
      G.lane = lane;
      G.px = lastSurface && lastSurface.height > G.py + FLOOR_EPSILON ? LANE_X[lane] : lastX;
      setPlayerSurface(getTruckSurface(G.distance, G.px));
      G.grounded = G.vy <= 0 && Math.abs(G.py - G.support) <= FLOOR_EPSILON;
      return;
    }
    crash();
  }
  G.distance = lastDistance;
  G.px = lastX;
  setPlayerSurface(getTruckSurface(lastDistance, lastX));
}

function advancePlayer(dt, speed) {
  const steps = Math.ceil(dt / MAX_PHYSICS_STEP);
  if (steps === 0) return;
  const step = dt / steps;
  const travel = speed * step;
  const steering = 1 - Math.exp(-11 * step);
  for (let i = 0; i < steps && G.state === 'play'; i++) {
    const lastDistance = G.distance, lastX = G.px;
    const previousSurface = G.surface;
    G.distance += travel;
    G.px += (LANE_X[G.lane] - G.px) * steering;

    const nextY = G.py + G.vy * step - 0.5 * GRAVITY * step * step;
    const nextVY = G.vy - GRAVITY * step;
    // 撞飞的货车立即退出碰撞，随后用相同的移动步继续判定脚下。
    while (true) {
      const surface = getTruckSurface(G.distance, G.px);
      const height = surface?.height ?? 0;
      const continuingRamp = surface && (surface.ramp ||
        (previousSurface?.ramp && previousSurface.truck === surface.truck));
      const stepUp = FLOOR_EPSILON + (continuingRamp ? travel * TRUCK.roofHeight / TRUCK.rampLength : 0);
      const onRampToe = surface?.ramp && height <= 0.22;
      const walking = G.grounded && height >= G.py - FLOOR_EPSILON && (height <= G.py + stepUp || onRampToe);
      const landing = !walking && nextY <= height && (surface
        ? entersFromAbove(surface, lastDistance, lastX, step, nextVY)
        : nextVY <= 0);
      if (walking || landing) {
        setPlayerSurface(surface);
        landPlayer();
        break;
      }
      if (surface && nextY < height) {
        if (hasImpactPower()) {
          throwObstacle(surface.truck);
          continue;
        }
        handleTruckContact(surface.truck, lastDistance, lastX);
      } else {
        setPlayerSurface(surface);
        G.grounded = false;
        G.py = nextY;
        G.vy = nextVY;
        G.airTime += step;
      }
      break;
    }
    if (G.state === 'play') checkCollisions();
  }
}

/* ---------- 更新 ---------- */
function update(dt) {
  G.t += dt;
  G.phase += dt * (G.state === 'play' ? G.speed : 8) * 1.15;
  if (G.state === 'menu') {
    ensureWorld();
    updateWorldMeshes(dt);
    updatePlayerMesh(dt);
    updateEffects(dt);
    return;
  }
  if (G.state === 'dying') {
    G.deadTimer = Math.max(0, G.deadTimer - dt);
    const elapsed = CAPTURE_LENGTH - G.deadTimer;
    const surface = getTruckSurface(G.distance, G.px);
    setPlayerSurface(surface?.height <= G.capture.height + 0.24 ? surface : null);
    G.py = THREE.MathUtils.lerp(G.capture.height, G.support, THREE.MathUtils.smoothstep(elapsed, 0, 0.46));
    if (elapsed >= CAPTURE_CONTACT && !G.capture.touched) {
      G.capture.touched = true;
      setCoach('被豆包老师抓到了！');
    }
    updateWorldMeshes(dt);
    updatePlayerMesh(dt);
    updateEffects(dt);
    if (G.deadTimer <= 0) showGameOver();
    return;
  }

  G.speed = runningSpeed(G.distance);
  const eff = G.speed * (G.sprint > 0 ? 1.55 : 1);
  if (G.sliding > 0) G.sliding = Math.max(0, G.sliding - dt);
  if (G.sliding > 0 || G.pendingSlide) G.rollTime += dt;
  if (G.sprint > 0) G.sprint -= dt;
  if (G.magnet > 0) G.magnet -= dt;
  if (G.grace > 0) G.grace = Math.max(0, G.grace - dt);
  advancePlayer(dt, eff);
  G.score = Math.floor(G.distance) + G.coins * 10;
  // 每快 5m/s 弹一次「提速」，让玩家明显感到越跑越快
  const tier = Math.floor((G.speed - 13) / 5);
  if (tier > G.speedTier) {
    G.speedTier = tier;
    if (tier > 0) popup(`提速 x${(G.speed / 13).toFixed(1)}!`, '#ffd93f');
  }
  ensureWorld();
  if (G.state === 'play' && !G.roofHint && G.grounded && G.surface && !G.surface.ramp &&
      G.surface.truck.mesh.userData.jumpMarker?.visible) {
    G.roofHint = true;
    G.roofHintUntil = G.t + 3.6;
  }
  if (G.state === 'play') updateCoach();
  updateWorldMeshes(dt);
  updatePlayerMesh(dt);
  updateEffects(dt);
  updateHUD();
}

let postOffset = NaN;
function updatePosts() {
  const offset = G.distance % 6;
  if (offset === postOffset) return;
  postOffset = offset;
  for (let i = 0; i < posts.count; i++) {
    const z = offset - Math.floor(i / 2) * 6;
    posts.setMatrixAt(i, postMatrix.makeTranslation(i % 2 ? 4.25 : -4.25, 0.096, z));
  }
  posts.instanceMatrix.needsUpdate = true;
}
function updateWorldMeshes(dt) {
  updateDistrictArt();
  trackTex.offset.y = -(G.distance / 10);
  sidewalkTex.offset.y = G.distance / 10;
  lawnTex.offset.y = G.distance * 84 / 600;
  updatePosts();
  for (const o of G.objects) {
    // 磁铁吸附飞行中的金币：划弧线飞向奶娃，跨过货车时抬高，避免穿模
    if (o.kind === 'coin' && o.pull && !o.resolved) {
      o.pullT = Math.min(1, o.pullT + dt * 2.8);
      const t = o.pullT, e = t * t * (3 - 2 * t);
      const tx = G.px, ty = G.py + 0.7, tz = 0;
      const arc = Math.sin(Math.PI * t) * 2.4;
      o.mesh.position.set(
        o.pullX0 + (tx - o.pullX0) * e,
        o.pullY0 + (ty - o.pullY0) * e + arc,
        o.pullZ0 + (tz - o.pullZ0) * e
      );
      o.mesh.rotation.y = G.t * 10 + o.seed;
      if (t >= 1) {
        collectCoin(o, { x: o.mesh.position.x, y: o.mesh.position.y, z: o.mesh.position.z });
        o.pull = false;
      }
      continue;
    }
    const z = G.distance - o.trackPos;
    const baseY = o.baseY ?? 0;
    const bob = Math.sin(G.t * 3 + (o.truck?.seed ?? o.seed));
    const beacon = o.mesh.userData.beacon;
    const y = beacon ? baseY + 0.9 + bob * 0.12 : o.kind === 'coin' ? baseY + 0.6 + bob * 0.1 : 0;
    o.mesh.position.set(o.wx, y, z);
    if (beacon) beacon.position.y = baseY + 0.045 - y;
    if (o.kind === 'coin') o.mesh.rotation.y = G.t * 4 + o.seed;
    if (o.kind === 'power') o.mesh.rotation.y = Math.sin(G.t * 2 + o.seed) * 0.4;
    if (o.kind === 'meme') o.mesh.rotation.y = G.t * 2 + o.seed;
    if (o.kind === 'obs' && o.type === 'clap' && o.mesh.userData.hands) {
      const c = Math.abs(Math.sin(G.t * 6 + o.seed)) * 0.12;
      o.mesh.userData.hL.position.x = -0.12 + c;
      o.mesh.userData.hR.position.x = 0.12 - c;
    }
    // 金币/道具吃到即隐藏；障碍只有被撞碎才隐藏，正常通过会从身边飞过
    if (o.kind !== 'obs' && o.resolved) o.mesh.visible = false;
    if (o.kind === 'obs' && o.destroyed) o.mesh.visible = false;
  }
  for (const entry of G.buildings) {
    const { mesh, trackPos } = entry;
    const z = G.distance - trackPos;
    mesh.position.z = z;
    const far = z < -STREET_DETAIL_DISTANCE;
    if (far !== entry.far) {
      entry.far = far;
      Models.setStreetDetail(mesh, far);
    }
    if (mesh.userData.streetShadow) mesh.castShadow = !handheld && mesh.position.z > -29;
  }
  for (const cloud of clouds) {
    cloud.position.x += dt * 0.48;
    if (cloud.position.x > 184) cloud.position.x = -184;
  }
}

function updatePlayerMesh(dt) {
  const ud = player.userData;
  const menu = G.state === 'menu';
  const fallen = G.state === 'dying' || G.state === 'over';
  const airborne = !menu && !fallen && !G.grounded;
  const egg = !fallen && (G.sliding > 0 || G.pendingSlide);
  const tilt = (LANE_X[G.lane] - G.px) / 2.4;
  const swing = Math.sin(G.phase);

  const motion = G.motionUntil > G.t ? G.motion : '';
  player.visible = menu || fallen || motion === 'Stumble' || G.grace <= 0 || Math.floor(G.t * 12) % 2 === 0;
  player.position.set(G.px, G.py, 0);
  player.rotation.set(0, 0, -tilt * (egg ? 0.15 : 0.25));
  ud.spin.rotation.x = 0;
  ud.egg.visible = egg;
  ud.torso.visible = !runnerRig && !egg;
  for (const leg of ud.legs) leg.visible = ud.torso.visible;

  if (menu) {
    const portrait = camera.aspect < 0.95;
    player.position.set(portrait ? -0.96 : 1.75, 0, 0.63);
    player.rotation.set(0, Math.PI + 0.23, 0);
  } else if (fallen) {
    const elapsed = CAPTURE_LENGTH - G.deadTimer;
    const turn = THREE.MathUtils.smoothstep(elapsed, 0.20, 0.75);
    player.rotation.set(0, -(G.capture?.side ?? 1) * 1.82 * turn, turn * 0.1);
  } else if (egg) {
    ud.egg.rotation.x = -G.rollTime * 13;
    player.position.y += 0.025;
  } else if (airborne && G.jumping) {
    ud.spin.rotation.x = -Math.min(1, G.airTime / AIR_FLIP_DUR) * Math.PI * 2;
  }

  if (runnerRig) {
    runnerRig.model.visible = !egg;
    if (!egg) {
      const action = menu ? (G.t % 10 >= 2.5 && G.t % 10 < 4 ? 'Greeting' : 'Idle')
        : fallen ? 'Caught' : airborne && motion !== 'Stumble' ? 'Jump' : motion || 'Run';
      const speed = action === 'Run' ? Math.min(2.1, G.speed / 13 * (G.sprint > 0 ? 1.3 : 1)) : 1;
      runnerRig.animate(action, dt, speed);
    }
  } else if (!egg) {
    // 角色文件抵达之前亦可开跑。
    ud.legs[0].rotation.x = menu ? 0 : fallen ? 0.4 : airborne ? 0.9 : swing * 0.8;
    ud.legs[1].rotation.x = menu ? 0 : fallen ? 0.4 : airborne ? -0.5 : -swing * 0.8;
    ud.arms[0].rotation.x = airborne ? -2.2 : -swing * (menu ? 0.12 : 0.7);
    ud.arms[1].rotation.x = airborne ? -2.2 : swing * (menu ? 0.12 : 0.7);
    if (!menu && !fallen && !airborne) player.position.y += Math.abs(swing) * 0.07;
  }

  ud.aura.visible = G.sprint > 0;
  if (ud.aura.visible) ud.aura.children.forEach((f, i) => f.scale.setScalar(0.7 + Math.abs(Math.sin(G.t * 20 + i)) * 0.5));
  const shielded = G.shield > 0;
  if (shielded && !ud.shieldMesh) {
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.4, 18, 14), new THREE.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.3, depthWrite: false,
    }));
    bubble.position.y = 1.1;
    player.add(bubble);
    ud.shieldMesh = bubble;
  }
  if (ud.shieldMesh) ud.shieldMesh.visible = shielded;
}

const RAMP_ANGLE = Math.atan2(TRUCK.roofHeight, TRUCK.rampLength);
function updateContactShadow(shadow, actor, surface, width, depth) {
  shadow.visible = actor.visible;
  if (!shadow.visible) return;

  const floor = surface?.height ?? 0;
  const lift = Math.max(0, actor.position.y - floor);
  const spread = 1 + Math.min(lift, 2.3) * 0.25;
  shadow.position.set(actor.position.x, floor + 0.04, actor.position.z);
  shadow.rotation.x = -Math.PI / 2 + (surface?.ramp ? RAMP_ANGLE : 0);
  shadow.scale.set(width * spread, depth * spread, 1);
  // 桌面还有太阳投影，接触阴影只补脚下。手机用同一张低成本投影。
  shadow.material.opacity = (handheld ? 0.90 : surface ? 0.67 : 0.46) / (1 + lift * 1.7);
}

function updateActorShadows(chaserSurface) {
  const [runnerShadow, chaserShadow] = actorShadows;
  updateContactShadow(runnerShadow, player, G.surface, 1.57, 1.22);
  updateContactShadow(chaserShadow, chaser, chaserSurface, 1.27, 1.20);
}

function updateEffects(dt) {
  updateFlyingObstacles(dt);
  for (const p of G.particles) {
    p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
    p.vy -= 20 * dt; p.life -= dt;
    p.m.scale.setScalar(Math.max(0.05, p.life / p.max));
    if (p.life <= 0) { p.m.visible = false; partPool.push(p.m); }
  }
  let live = 0;
  for (const p of G.particles) {
    if (p.life > 0) G.particles[live++] = p;
  }
  G.particles.length = live;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 1.8);
  const fovEff = G.speed * (G.sprint > 0 ? 1.55 : 1);
  const narrow = camera.aspect < 0.95;
  const fovT = G.state === 'menu' ? (narrow ? 55 : 49)
    : G.capture ? (narrow ? 59 : 55) : Math.min(86, 62 + Math.max(0, fovEff - 13) * 0.5);
  camera.fov += (fovT - camera.fov) * Math.min(1, dt * 5);
  camera.updateProjectionMatrix();
  if (G.state === 'menu') {
    camera.position.set(narrow ? 0 : -0.52, narrow ? 3.57 : 2.88, narrow ? 8.1 : 6.8);
    camera.lookAt(narrow ? 0 : -0.22, narrow ? 2.02 : 1.55, -7.7);
    return;
  }
  const shx = G.shake > 0 ? rand(-1, 1) * G.shake * 0.4 : 0;
  const shy = G.shake > 0 ? rand(-1, 1) * G.shake * 0.3 : 0;
  // 竖屏（手机）时把镜头拉远一点，避免奶娃糊满屏幕
  const portrait = camera.aspect < 0.85 ? 2.2 : 0;
  // 同车道追逐时从稍高的侧后方拍摄，也看得到前面的奶娃和障碍。
  const chaseFrame = G.chaseActive
    ? Math.max(0, Math.min(1, G.chaseTime / 0.65, (CHASE_DURATION - G.chaseTime) / 0.7)) : 0;
  camera.position.set(G.px * 0.55 + chaseFrame + shx,
    3.4 + G.py + portrait * 0.35 + chaseFrame * 0.55 + shy,
    7.2 + portrait + G.py * 0.55 + chaseFrame * 0.85);
  let targetX = G.px * 0.7 + chaseFrame * 0.1;
  let targetY = 1.5 + G.py - chaseFrame * 0.58;
  let targetZ = -9 + chaseFrame * 2.5;
  if (G.capture) {
    const cut = THREE.MathUtils.smoothstep(CAPTURE_LENGTH - G.deadTimer, 0.05, 0.70);
    const { side } = G.capture;
    camera.position.set(
      THREE.MathUtils.lerp(camera.position.x, G.px + side * (narrow ? 4.95 : 3.65), cut),
      THREE.MathUtils.lerp(camera.position.y, G.py + 2.48, cut),
      THREE.MathUtils.lerp(camera.position.z, narrow ? 3.43 : 2.15, cut)
    );
    targetX = THREE.MathUtils.lerp(targetX, G.px - side * 0.12, cut);
    targetY = THREE.MathUtils.lerp(targetY, G.py + 1.06, cut);
    targetZ = THREE.MathUtils.lerp(targetZ, narrow ? 0.18 : 0.38, cut);
  }
  camera.lookAt(targetX, targetY, targetZ);
}

/* ---------- HUD ---------- */
const coach = document.getElementById('coach');
function setCoach(text) {
  if (coach.textContent !== text) coach.textContent = text;
  coach.classList.toggle('hidden', !text);
}
function updateCoach() {
  if (G.roofHintUntil > G.t) {
    setCoach(handheld ? '看到车顶箭头时，上滑跳到下一辆车' : '看到车顶箭头时，按 ↑ 跳到下一辆车');
  } else if (G.distance < 22) {
    setCoach('沿地面奶瓶绕行，也可以从中间斜坡上车');
  } else setCoach('');
}

const elScore = document.getElementById('score');
const elCoins = document.getElementById('coins');
const elPowerbars = document.getElementById('powerbars');
let puKey = '';
const puEls = Object.create(null);
let shownScore = 0, shownCoins = 0;
const PU_META = {
  shield: { icon: '🛡️', name: '相信光盾', color: '#ffe066', dur: 1 },
  sprint: { icon: '🚀', name: '奥利给', color: '#ff7a3c', dur: 4.5 },
  magnet: { icon: '🧲', name: '磁吸奶瓶', color: '#5ec8f2', dur: 8 },
};
function updateHUD() {
  if (G.score !== shownScore) elScore.textContent = shownScore = G.score;
  if (G.coins !== shownCoins) elCoins.textContent = shownCoins = G.coins;
  const active = [];
  if (G.shield > 0) active.push('shield');
  if (G.sprint > 0) active.push('sprint');
  if (G.magnet > 0) active.push('magnet');
  const key = active.join(',');
  if (key !== puKey) {
    puKey = key;
    elPowerbars.innerHTML = active.map(k => {
      const m = PU_META[k];
      return `<div class="pu-row" id="pu-${k}">
        <span class="pu-ic">${m.icon}</span><span class="pu-name">${m.name}</span>
        <span class="pu-track"><span class="pu-fill" style="background:${m.color}"></span></span>
        <span class="pu-time"></span></div>`;
    }).join('');
    for (const k of active) {
      puEls[k] = {
        fill: elPowerbars.querySelector(`#pu-${k} .pu-fill`),
        time: elPowerbars.querySelector(`#pu-${k} .pu-time`),
      };
    }
  }
  for (const k of active) {
    const m = PU_META[k], el = puEls[k];
    if (!el) continue;
    const remain = k === 'shield' ? 1 : G[k];
    const frac = k === 'shield' ? 1 : Math.max(0, G[k] / m.dur);
    if (el.fill) el.fill.style.width = `${frac * 100}%`;
    if (el.time) el.time.textContent = k === 'shield' ? `${G.shield}次` : `${remain.toFixed(1)}s`;
  }
}

/* ---------- 流程 ---------- */
function resetGame(keepScenery = false) {
  for (const sign of G.capture?.signs ?? []) sign.visible = true;
  for (const o of G.objects) release(o);
  for (const flight of G.flyingObstacles) releaseFlight(flight);
  if (!keepScenery) {
    for (const b of G.buildings) retireScenery(b);
    Object.assign(G, {
      buildings: [], nextBuilding: 5, nextLamp: 20, nextGantry: 60, nextScenery: 8, nextCrosswalk: 95, nextLandmark: 30,
    });
  }
  for (const { m } of G.particles) { m.visible = false; partPool.push(m); }
  Object.assign(G, {
    distance: 0, speed: 13, coins: 0, score: 0, lane: 1, px: 0, py: 0, vy: 0,
    sliding: 0, pendingSlide: false, rollTime: 0, shield: 0, sprint: 0, magnet: 0, grace: 0,
    objects: [], nextSpawn: FIRST_ROAD_SECTION, nextConvoy: FIRST_ROAD_SECTION,
    nextShieldRun: FIRST_ROAD_SECTION, openLane: 0, lastStreetRow: null, roofHint: false,
    truckDeck: [], lastTruckLayout: null,
    particles: [], flyingObstacles: [], shake: 0, deadTimer: 0, airTime: 0, support: 0, surface: null,
    grounded: true, jumping: false, jumpFrom: 0, speedTier: 0, chaseTime: 0, chaseActive: false,
    motion: '', motionUntil: 0, capture: null, roofHintUntil: 0,
  });
  chaseTrail.length = 0;
  chaseTrail.push({ distance: 0, x: 0, y: 0 });
  puKey = ''; elPowerbars.innerHTML = '';
  popupsEl.replaceChildren();
  setCoach('');
  if (player.userData.shieldMesh) player.userData.shieldMesh.visible = false;
}
function startGame() {
  if (G.state !== 'menu' && G.state !== 'over') return;
  if (!bootReady) {
    if (startRequested) return;
    startRequested = true;
    startButton.disabled = true;
    startButton.setAttribute('aria-busy', 'true');
    startLabel.textContent = '赛道准备中';
    AudioSys.init();
    AudioSys.duckBGM(true);
    return;
  }
  startRequested = false;
  AudioSys.init(); AudioSys.click(); AudioSys.duckBGM(false);
  bootBackdrop.hidden = true;
  const fromHome = G.state === 'menu';
  resetGame(fromHome);
  G.state = 'play';
  chaser.position.set(0, 0, 8);
  startChase();
  if (fromHome) {
    home.classList.add('leaving');
    setTimeout(() => { if (G.state !== 'menu') home.classList.add('hidden'); }, 220);
  }
  document.getElementById('gameover').classList.add('hidden');
  document.getElementById('pause').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  ensureWorld();
  updateCoach();
  AudioSys.say('奶娃快跑,冲鸭!', 0); popup('冲鸭!', '#ffd93f');
  updateHUD();
}
function togglePause() {
  if (G.state === 'play') {
    G.state = 'pause';
    randomizePause();
    setCoach('');
    document.getElementById('pause').classList.remove('hidden');
    document.getElementById('btn-resume').focus({ preventScroll: true });
    AudioSys.duckBGM(true);
  } else if (G.state === 'pause') {
    G.state = 'play';
    document.getElementById('pause').classList.add('hidden');
    updateCoach();
    AudioSys.duckBGM(false);
  }
}
function toggleMute() {
  AudioSys.setMuted(!AudioSys.muted);
  document.getElementById('btn-mute').textContent = AudioSys.muted ? '🔇' : '🔊';
}
function randomizeMenu() {
  document.getElementById('menu-tip').textContent = pick(MENU_TIPS);
}
function randomizePause() {
  document.getElementById('pause-title').textContent = pick(PAUSE_TITLES);
  document.getElementById('pause-quip').textContent = pick(PAUSE_QUIPS);
}
function showMenu() {
  resetGame();
  G.state = 'menu';
  AudioSys.duckBGM(false);
  home.classList.remove('hidden', 'leaving');
  document.getElementById('gameover').classList.add('hidden');
  document.getElementById('pause').classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('best-menu').textContent = G.best;
  randomizeMenu();
  startButton.focus({ preventScroll: true });
}
function pauseToMenu() {
  if (G.state === 'pause') showMenu();
}

/* ---------- 输入 ---------- */
window.addEventListener('keydown', e => {
  const k = e.key;
  const confirm = k === 'Enter' || k === ' ';
  if (confirm && G.state !== 'play' && e.target instanceof HTMLButtonElement) return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) e.preventDefault();
  if (k === 'm' || k === 'M') { toggleMute(); return; }
  if (G.state === 'menu' || G.state === 'over') { if (confirm && !e.repeat) startGame(); return; }
  if (k === 'p' || k === 'P' || k === 'Escape' || (confirm && G.state === 'pause')) {
    if (!e.repeat) togglePause();
    return;
  }
  if (G.state !== 'play') return;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') moveLane(-1);
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') moveLane(1);
  else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') doJump();
  else if (k === 'ArrowDown' || k === 's' || k === 'S') doSlide();
});
let touchStart = null, touchSwiped = false;
const cv = renderer.domElement;
cv.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; touchStart = { x: t.clientX, y: t.clientY, time: performance.now() }; touchSwiped = false; }, { passive: false });
cv.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!touchStart || touchSwiped || G.state !== 'play') return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
  if (Math.abs(dx) < 28 && Math.abs(dy) < 28) return;
  touchSwiped = true;
  if (Math.abs(dx) > Math.abs(dy)) moveLane(dx > 0 ? 1 : -1);
  else if (dy < 0) doJump(); else doSlide();
}, { passive: false });
cv.addEventListener('touchend', e => { e.preventDefault(); if (!touchStart) return; const dt = performance.now() - touchStart.time; if (!touchSwiped && dt < 250 && G.state === 'play') doJump(); touchStart = null; }, { passive: false });
cv.addEventListener('touchcancel', () => { touchStart = null; touchSwiped = false; });
window.addEventListener('blur', () => { if (G.state === 'play') togglePause(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.state === 'play') togglePause();
});
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-restart').addEventListener('click', startGame);
document.getElementById('btn-menu').addEventListener('click', showMenu);
document.getElementById('btn-pause-menu').addEventListener('click', pauseToMenu);
document.getElementById('btn-resume').addEventListener('click', togglePause);
document.getElementById('btn-pause').addEventListener('click', togglePause);
document.getElementById('btn-mute').addEventListener('click', toggleMute);
document.getElementById('best-menu').textContent = G.best;
randomizeMenu();
document.getElementById('btn-mute').textContent = AudioSys.muted ? '🔇' : '🔊';

/* ---------- resize & loop ---------- */
function resize() {
  const w = window.innerWidth || 900, h = window.innerHeight || 640;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, handheld ? 1.3 : 1.5,
    Math.max(0.75, Math.sqrt(1250000 / (w * h))));
  if (pixelRatio !== renderer.getPixelRatio()) renderer.setPixelRatio(pixelRatio);
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  needsRender = true;
}
window.addEventListener('resize', resize);
resize();

let lastTime = performance.now();
let artLoadScheduled = false;
function loop(now) {
  requestAnimationFrame(loop);
  if (G.state === 'menu' && !needsRender && now - lastTime < 1000 / 30 - 0.5) return;
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (G.state !== 'pause' && G.state !== 'over') {
    update(dt);
    const chaserSurface = updateChaser(dt);
    updateActorShadows(chaserSurface);
    needsRender = true;
  }
  if (needsRender) {
    renderer.render(scene, camera);
    needsRender = false;
  }
  if (!artLoadScheduled) {
    artLoadScheduled = true;
    requestAnimationFrame(() => setTimeout(loadGameArt, 0));
  }
}
requestAnimationFrame(loop);
document.documentElement.classList.add('game-mounted');
