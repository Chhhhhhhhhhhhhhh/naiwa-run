/* 奶娃快跑 · three.js 3D 主逻辑（地铁跑酷式 · 大众化热梗） */
const stage = document.getElementById('stage');
const handheld = window.matchMedia('(pointer: coarse)').matches;
const renderer = new THREE.WebGLRenderer({ antialias: !handheld, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = false;
renderer.domElement.id = 'game';
stage.insertBefore(renderer.domElement, stage.firstChild);
let needsRender = true;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xede2d1, 50, 126);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);
scene.add(camera);
const speedLines = Models.speedLines();
camera.add(speedLines.mesh);

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
const TRUCK_COLORS = [0xf6c536, 0xffd147, 0xebb52d];
const TRUCK = Models.truckGeometry;
const TRUCK_TYPES = {
  truck: { half: TRUCK.shortHalf, ramp: false, long: false },
  ramptruck: { half: TRUCK.shortHalf, ramp: true, long: false },
  longtruck: { half: TRUCK.longHalf, ramp: false, long: true },
  longramptruck: { half: TRUCK.longHalf, ramp: true, long: true },
  oncoming: { half: TRUCK.shortHalf, ramp: false, long: false, oncoming: true },
};
const OVERDRIVE_START = 5000;
const OVERDRIVE_GRACE = 8;
const CHASE_DURATION_OVERDRIVE = 7.6;
const OVERDRIVE_COLORS = {
  sky: 0x5c2b4f, horizon: 0xff9a62, distance: 0xe3a88b,
  farHill: 0x9c656c, nearHill: 0x7b4c58, grass: 0xc29e7d, sun: 0xffb478,
};
const DEBUG_START_DIST = (() => {
  try {
    const raw = new URLSearchParams(location.search).get('start');
    const n = raw ? Math.floor(Number(raw)) : 0;
    return Number.isFinite(n) && n > 0 ? Math.min(20000, n) : 0;
  } catch (e) { return 0; }
})();
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
// 5000m 狂暴模式专属：去掉轻松凑数排，以高墙 + 货车 + 滑铲/低障的高压组合为主
const HARD_STREET_ROWS = [
  ['wall', 'truck'], ['truck', 'wall'], ['wall', 'wall'],
  ['truck', 'bing'], ['bing', 'truck'], ['wall', 'bing'],
  ['truck', 'low'], ['wall', 'low'],
];
const HARD_TRUCK_LAYOUTS = [
  { route: [['longramptruck', 0], ['truck', 1], ['longtruck', 0]] },
  { route: [['ramptruck', 0], ['truck', 1], ['longramptruck', 0]] },
  { route: [['longramptruck', 0], ['longtruck', 1]], parallel: 'truck' },
  { route: [['ramptruck', 0], ['longtruck', 0]], parallel: 'longtruck' },
];
const STREET_TOP = { alarm: 0.7, gang: 0.7, bing: 2.3, thanos: 2.25, emo: 2.28, phone: 2.3 };
const AIR_FLIP_DUR = 0.62; // 一次跳跃的滞空时间，正好转满一圈
const SLIDE_DURATION = 0.75;
const SPRINT_DURATION = 7.0;
const JETPACK_ALTITUDE = 10.2; // 高于人行天桥顶棚（8.95m）与两侧建筑屋顶，畅飞无阻
const JETPACK_SPEED_MULT = 1.55;
const CHASE_DURATION = 4.8;
const CHASE_TRAIL_METRES = 12;
const CAPTURE_LENGTH = 1.4;
const CAPTURE_REACH = 0.38;
const CAPTURE_CONTACT = 0.82;
// 被抓过场：0–1.4 抓捕，1.4–2.7 老师近景，2.7–3.8 奶娃被拎起，3.8 起老师拎着奶娃往回走。
const CAPTURE_TOTAL = 5.2;
const CAPTURE_LIFT = 2.7;
const CAPTURE_WALK = 3.8;
const CAPTURE_GAP_X = 0.5, CAPTURE_GAP_Z = 0.92; // 老师站位，留出空隙避免手臂穿模
const captureElapsed = () => CAPTURE_TOTAL - G.deadTimer;
const STREET_DETAIL_DISTANCE = handheld ? 30 : 40;
const chaseTrail = [{ distance: 0, x: 0, y: 0 }];

const safeStoreGet = key => { try { return localStorage.getItem(key); } catch (e) { return null; } };
const safeStoreSet = (key, val) => { try { localStorage.setItem(key, val); } catch (e) {} };
const achRecord = (ev, payload) => {
  if (DEBUG_START_DIST > 0) return; // ?start= 调试空降模式不写入成就/商店/最佳纪录
  if (typeof AchievementSys !== 'undefined') AchievementSys.record(ev, payload);
  if (typeof ShopSys !== 'undefined') {
    if (ev === 'runStart') ShopSys.startRun();
    else if (ev === 'coin' || ev === 'powder' || ev === 'meme') ShopSys.addBottles(payload?.amount || 1);
    else if (ev === 'runEnd') ShopSys.finishRun(payload?.coins ?? G.coins);
  }
};

const G = {
  state: 'menu', t: 0, distance: 0, speed: 13, coins: 0, score: 0,
  lane: 1, px: 0, py: 0, vy: 0, sliding: 0, pendingSlide: false, rollTime: 0,
  shield: 0, sprint: 0, jetDescent: 0, jetFlightEnd: 0, nextPowderPos: 0, powderLane: 1, powderStreak: 0, jetSparkT: 0,
  magnet: 0, grace: 0,
  objects: [], buildings: [], nextSpawn: FIRST_ROAD_SECTION, nextConvoy: FIRST_ROAD_SECTION,
  nextShieldRun: FIRST_ROAD_SECTION, nextOncoming: OVERDRIVE_START + 35, nextRocketAllowed: 240,
  openLane: 0, lastStreetRow: null, roofHint: false,
  overdriveTriggered: false, overdriveHintUntil: 0, chaseDuration: CHASE_DURATION,
  truckDeck: [], lastTruckLayout: null,
  nextBuildingL: 1, nextBuildingR: -2, nextBackdrop: 4, lastBuildingL: null, lastBuildingR: null,
  nextLamp: 20, nextGantry: 60, lastGantry: -999, nextScenery: 8, nextCrosswalk: 42, crosswalkMissed: 0, nextLandmark: 30,
  particles: [], flyingObstacles: [], shake: 0, deadTimer: 0, phase: 0, airTime: 0, support: 0, surface: null,
  bendX: 0, bendY: 0, camRoll: 0, camSupportY: 0, fovPunch: 0, hitStop: 0, speedPulse: 0, shieldImpact: 0,
  grounded: true, jumping: false, jumpFrom: 0, speedTier: 0, chaseTime: 0, chaseActive: false, chaseFromStumble: false,
  lastRoofTruck: null, lastAchScore: -1, lastHitType: null, runSettled: false,
  motion: '', motionUntil: 0, capture: null, roofHintUntil: 0,
  best: Math.max(0, +(safeStoreGet('naiwa-best-distance') || 0) || 0),
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
const skyCloudCorridor = Models.skyCloudCorridor();
scene.add(skyCloudCorridor.root);
const hemi = new THREE.HemisphereLight(0xd9edf2, 0xaaa58c, 0.78); scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffe1ba, 0.78);
// 保持太阳的照射方向，关闭实时阴影贴图以节省性能。
dir.target.position.z = -8;
dir.position.set(-25, 32, -15);
dir.castShadow = false;
scene.add(dir, dir.target);
const fill = new THREE.DirectionalLight(0xd7eaf1, 0.27);
fill.position.set(12, 10, 16);
scene.add(fill);

const lawnTex = Models.lawnTexture();
lawnTex.repeat.set(84, 84);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(600, 600, 16, 90),
  Models.applyWorldBend(new THREE.MeshLambertMaterial({ map: lawnTex }), { antiTileGrass: true })
);
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.06;
scene.add(ground);
const outskirtForest = Models.outskirtForest(handheld);
scene.add(outskirtForest.root);
const ambientWeather = Models.ambientWeather(handheld);
scene.add(ambientWeather.mesh);
const particleSys = Models.particleSystem(handheld ? 150 : 240);
scene.add(particleSys.points);
const landingRings = Models.landingRings(6);
scene.add(landingRings.root);
const ribbonTrail = Models.ribbonTrail(14);
scene.add(ribbonTrail.mesh);
const trackTex = Models.trackTexture();
trackTex.repeat.set(1, 40);
const track = new THREE.Mesh(
  new THREE.PlaneGeometry(7.6, 400, 1, 90),
  Models.applyWorldBend(new THREE.MeshLambertMaterial({ map: trackTex }))
);
track.rotation.x = -Math.PI / 2; track.position.set(0, 0.02, -160);
scene.add(track);
const sidewalkTex = Models.sidewalkTexture();
sidewalkTex.repeat.set(1.5, 90);
const sidewalkMat = Models.applyWorldBend(new THREE.MeshLambertMaterial({ map: sidewalkTex }));
for (const sx of [-3.8, 3.8]) {
  const curb = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 400, 1, 1, 90), Models.L(0xa79e8d));
  curb.position.set(sx, 0.08, -160); scene.add(curb);
  const side = Math.sign(sx);
  const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 400, 1, 1, 90), sidewalkMat);
  sidewalk.position.set(side * 5.2, 0.03, -160); scene.add(sidewalk);
  const outerCurb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 400, 1, 1, 90), Models.L(0x8f8b76));
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
let paintedDistrict = null, paintedBlend = -1, paintedOverdrive = -1;
const overdriveColor = new THREE.Color();
function updateDistrictArt() {
  const here = districtAt(G.distance);
  const progress = G.distance % DISTRICT_LENGTH;
  const blend = THREE.MathUtils.smoothstep(progress, DISTRICT_LENGTH - 34, DISTRICT_LENGTH);
  const overBlend = THREE.MathUtils.smoothstep(G.distance, OVERDRIVE_START - 15, OVERDRIVE_START + 35);
  if (here === paintedDistrict && blend === paintedBlend && overBlend === paintedOverdrive) return;
  paintedDistrict = here;
  paintedBlend = blend;
  paintedOverdrive = overBlend;
  const next = districtAt(G.distance + DISTRICT_LENGTH);
  for (const [name, target] of colorTargets) {
    target.setHex(here.colors[name]).lerp(blendColor.setHex(next.colors[name]), blend);
    if (overBlend > 0 && OVERDRIVE_COLORS[name] !== undefined) {
      target.lerp(overdriveColor.setHex(OVERDRIVE_COLORS[name]), overBlend * 0.72);
    }
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

const homeStage = typeof HomeStage !== 'undefined' ? HomeStage.create({ Models }) : null;
let actorScene = scene;
function attachActorsTo(target) {
  if (!target || actorScene === target) return;
  actorScene = target;
  target.add(player, chaser, ...actorShadows);
}
if (homeStage) attachActorsTo(homeStage.scene);

/* ---------- 角色及骨骼动作 ---------- */
let runnerRig = null, chaserRig = null, rigCosmetics = null;
function shopMods() {
  if (typeof ShopSys !== 'undefined' && typeof ShopSys.getModifiers === 'function') {
    return ShopSys.getModifiers();
  }
  return { magnetDuration: 8, magnetRange: 20, sprintDuration: SPRINT_DURATION, shieldThrowBonus: 0 };
}
function shopSkins() {
  if (typeof ShopSys !== 'undefined' && typeof ShopSys.getEquippedSkins === 'function') {
    return ShopSys.getEquippedSkins();
  }
  return { glasses: false, crown: false, pass: false };
}
function syncPlayerCosmetics() {
  const skins = shopSkins();
  if (player.userData.fallbackCosmetics) player.userData.fallbackCosmetics.setSkins(skins);
  if (rigCosmetics) rigCosmetics.setSkins(skins);
  needsRender = true;
}
syncPlayerCosmetics();
if (typeof ShopSys !== 'undefined' && typeof ShopSys.onChange === 'function') {
  ShopSys.onChange(syncPlayerCosmetics);
}
const runnerRim = {
  color: { value: new THREE.Color(0xffe8a8) },
  strength: { value: 0.40 },
  power: { value: 2.6 },
};
const chaserRim = {
  color: { value: new THREE.Color(0xffdfa8) },
  strength: { value: 0.34 },
  power: { value: 2.65 },
};
const rimTmpColor = new THREE.Color();
const rimWhite = new THREE.Color(0xffffff);
function updateCharacterRims(dt, inHome = false) {
  const damp = 1 - Math.exp(-7 * dt);
  let rStr = 0.38, rPow = 2.65;
  if (inHome) {
    rimTmpColor.setHex(0xffe8a3);
    rStr = 0.42; rPow = 2.55;
  } else if (G.sprint > 0) {
    rimTmpColor.setHex(0xffa447);
    rStr = 0.78; rPow = 2.1;
  } else if (G.shield > 0) {
    rimTmpColor.setHex(0xffe97d).lerp(blendColor.setHex(0x75f0ff), 0.35 + 0.25 * Math.sin(G.t * 4.5));
    rStr = 0.62 + G.shieldImpact * 0.35; rPow = 2.2;
  } else if (G.magnet > 0) {
    rimTmpColor.setHex(0x6ce3ff);
    rStr = 0.60; rPow = 2.25;
  } else if (G.overdriveTriggered) {
    rimTmpColor.setHex(0xff7d5c);
    rStr = 0.56; rPow = 2.3;
  } else {
    rimTmpColor.copy(dir.color).lerp(rimWhite, 0.32);
    rStr = 0.38; rPow = 2.65;
  }
  runnerRim.color.value.lerp(rimTmpColor, damp);
  runnerRim.strength.value += (rStr - runnerRim.strength.value) * damp;
  runnerRim.power.value += (rPow - runnerRim.power.value) * damp;

  const angryTeacher = !inHome && (G.chaseFromStumble || G.overdriveTriggered || Boolean(G.capture));
  if (inHome) rimTmpColor.setHex(0xffe8a3);
  else if (angryTeacher) rimTmpColor.setHex(0xff5e4b);
  else rimTmpColor.copy(dir.color).lerp(rimWhite, 0.25);
  const cStr = inHome ? 0.38 : angryTeacher ? 0.62 : 0.34;
  const cPow = angryTeacher ? 2.2 : 2.65;
  chaserRim.color.value.lerp(rimTmpColor, damp);
  chaserRim.strength.value += (cStr - chaserRim.strength.value) * damp;
  chaserRim.power.value += (cPow - chaserRim.power.value) * damp;
}
function updateWorldBend(dt) {
  const skyBlend = THREE.MathUtils.smoothstep(G.py, 3.0, JETPACK_ALTITUDE - 1.2);
  const meander = Math.sin(G.distance * 0.0085 + 0.55) * 0.65 + Math.sin(G.distance * 0.0037 + 1.4) * 0.35;
  let bendScale = 1;
  if (G.state === 'intro') {
    bendScale = THREE.MathUtils.lerp(0.42, 1.0, THREE.MathUtils.smoothstep(intro.t, INTRO_RUN_FROM, INTRO_LENGTH));
  } else if (G.state === 'dying' || G.state === 'over') {
    bendScale = 0.32;
  } else if (G.state === 'menu') {
    bendScale = 0.55;
  }
  const targetX = meander * 0.00145 * bendScale;
  const targetY = -(0.00112 + skyBlend * 0.00058) * bendScale;
  const k = 1 - Math.exp(-3.8 * dt);
  G.bendX += (targetX - G.bendX) * k;
  G.bendY += (targetY - G.bendY) * k;
  Models.setWorldBend(G.bendX, G.bendY);
}
function riggedCharacter(gltf, height, rimUniforms) {
  const model = gltf.scene;
  const bounds = new THREE.Box3().setFromObject(model);
  const scale = height / (bounds.max.y - bounds.min.y);
  model.scale.setScalar(scale);
  model.position.y = -bounds.min.y * scale;
  model.traverse(node => {
    if (!node.isSkinnedMesh) return;
    node.frustumCulled = false; // 绑定姿势的包围球无法覆盖所有动作
    const source = node.material;
    const { map } = source;
    if (map) map.encoding = THREE.LinearEncoding;
    // 漫反射跟随街景光照，带贴图的底光保留五官和衣服细节，叠加菲涅尔边缘光增强立体轮廓。
    const mat = new THREE.MeshLambertMaterial({
      map, color: 0x919191, emissiveMap: map, emissive: 0x3f3f3f,
      side: source.side, skinning: true,
    });
    node.material = rimUniforms ? Models.applyCharacterShader(mat, rimUniforms) : Models.applyWorldBend(mat);
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
      runnerRig = riggedCharacter(gltf, 1.9, runnerRim);
      const skin = runnerRig.model;
      skin.rotation.y = Math.PI; // GLB 面朝 +Z，游戏向 -Z 前进
      skin.position.y -= player.userData.spin.position.y;
      skin.visible = false;
      player.userData.spin.add(skin);
      if (typeof Models.naiwaCosmetics === 'function') {
        rigCosmetics = Models.naiwaCosmetics(true);
        const headBone = skin.getObjectByName('Head');
        const chestBone = skin.getObjectByName('Chest');
        if (headBone) headBone.add(rigCosmetics.headMount);
        if (chestBone) chestBone.add(rigCosmetics.chestMount);
      }
      syncPlayerCosmetics();
    }],
    ['assets/doubao-teacher.glb', '豆包老师准备出场', gltf => {
      chaserRig = riggedCharacter(gltf, 2.15, chaserRim);
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
  const elapsed = captureElapsed();
  if (elapsed >= CAPTURE_WALK) return updateCaptureWalk(dt, elapsed);
  const approach = THREE.MathUtils.smoothstep(elapsed, 0, 0.66);
  const x = THREE.MathUtils.lerp(from.x, G.px - side * CAPTURE_GAP_X, approach);
  const z = THREE.MathUtils.lerp(from.z, CAPTURE_GAP_Z, approach);
  const floor = G.support;
  const y = THREE.MathUtils.lerp(from.y, floor, approach);
  chaser.position.set(x, Math.max(y, floor), z);
  chaser.rotation.set(0, Math.atan2(G.px - x, -z), 0);
  chaser.visible = true;
  animateChaser(elapsed >= CAPTURE_REACH ? 'Grab' : 'Run', dt, 1.18);
  return G.surface;
}
function updateCaptureWalk(dt, elapsed) {
  const { side } = G.capture;
  const x = G.px - side * CAPTURE_GAP_X;
  const startZ = CAPTURE_GAP_Z;
  const turn = THREE.MathUtils.smoothstep(elapsed, CAPTURE_WALK, CAPTURE_WALK + 0.35);
  const walkT = Math.max(0, elapsed - (CAPTURE_WALK + 0.2));
  const z = startZ + 1.35 * walkT * THREE.MathUtils.smoothstep(walkT, 0, 0.4);
  const floor = G.support;
  const lastY = G.capture.walkY ?? chaser.position.y;
  G.capture.walkY = lastY + (floor - lastY) * Math.min(1, dt * 10);
  chaser.position.set(x, G.capture.walkY, z);
  const faceAtGrab = Math.atan2(side * CAPTURE_GAP_X, -startZ);
  chaser.rotation.set(0, THREE.MathUtils.lerp(faceAtGrab, 0, turn), 0);
  chaser.visible = true;
  animateChaser(walkT > 0.05 ? 'Run' : 'Grab', dt, 0.55);
  return G.surface;
}

function startChase(fromStumble = false) {
  G.chaseActive = true;
  G.chaseTime = 0;
  G.chaseFromStumble = fromStumble;
  G.chaseDuration = fromStumble && G.distance >= OVERDRIVE_START ? CHASE_DURATION_OVERDRIVE : CHASE_DURATION;
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
  if (G.state === 'intro') {
    chaser.visible = true;
    chaser.position.copy(intro.dPos);
    chaser.rotation.set(0, intro.dRot, 0);
    animateChaser(intro.dAction, dt, intro.dSpeed);
    return;
  }
  if (G.state === 'play') trackRunner();
  chaser.visible = false;
  if (!G.chaseActive || (G.state !== 'play' && G.state !== 'dying')) return;
  G.chaseTime += dt;
  const t = G.chaseTime;
  const dur = G.chaseDuration || CHASE_DURATION;
  if (t >= dur) {
    G.chaseActive = false;
    if (G.chaseFromStumble && G.state === 'play') {
      G.chaseFromStumble = false;
      achRecord('stumbleEscaped');
    }
    return;
  }
  const entering = Math.min(1, t / 1.2);
  const exit = Math.max(0, (t - (dur - 0.8)) / 0.8);
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
      ? (T ? (T.oncoming ? Models.oncomingTruck(pick(TRUCK_COLORS)) : Models.truck(T.ramp, pick(TRUCK_COLORS), T.long)) : Models.obstacle(type))
      : kind === 'meme' ? Models.memeBall()
      : kind === 'powder' ? Models.milkPowder()
      : kind === 'coin' ? Models.coin() : Models.power(type);
  }
  m.rotation.set(0, 0, 0);
  m.scale.set(1, 1, 1);
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
  schedule('powder:powder', 14, Models.milkPowder);
  for (const type of ['shield', 'sprint', 'magnet']) schedule('power:' + type, 3, () => Models.power(type));
  for (const type of PREWARM_OBSTACLES) schedule('obs:' + type, 3, () => Models.obstacle(type));
  for (const type of Object.keys(TRUCK_TYPES)) {
    const T = TRUCK_TYPES[type];
    schedule('obs:' + type, 2, () => T.oncoming ? Models.oncomingTruck(pick(TRUCK_COLORS)) : Models.truck(T.ramp, pick(TRUCK_COLORS), T.long));
  }
  schedule('meme:jntm', 1, Models.memeBall);
  jobs.push(() => { Models.alleyFiller(0); Models.alleyFiller(1); Models.crosswalk(); });
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
function addMilkPowder(laneX, pos) {
  G.objects.push({ kind: 'powder', type: 'powder', wx: laneX, trackPos: pos, baseY: JETPACK_ALTITUDE, resolved: false,
    seed: Math.random() * 10, mesh: acquire('powder', 'powder') });
}
function spawnAerialPowder() {
  // 火箭高空飞行期间沿三车道稀疏蜿蜒排布高价值金装奶粉罐（每罐 +5 奶瓶）
  while (G.sprint > 0 && G.nextPowderPos <= G.jetFlightEnd && G.nextPowderPos < G.distance + 135) {
    addMilkPowder(LANE_X[G.powderLane], G.nextPowderPos);
    G.powderStreak++;
    if (G.powderStreak >= 2 + (Math.random() < 0.45 ? 1 : 0)) {
      const dirs = G.powderLane === 0 ? [1] : G.powderLane === 2 ? [-1] : [-1, 1];
      G.powderLane += pick(dirs);
      G.powderStreak = 0;
    }
    G.nextPowderPos += rand(17.5, 22.5);
  }
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
  const distance = Math.min(12.2, runningSpeed(center) * JUMP_TIME);
  const count = Math.max(2, Math.round(distance / COIN_SPACING));
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const arc = 4 * t * (1 - t) * JUMP_V * JUMP_V / (2 * GRAVITY);
    addCoin(laneX, center + (t - 0.5) * distance, arc);
  }
}
function pickPowerType(pos) {
  const over = pos >= OVERDRIVE_START;
  // 火箭属于高收益道具（概率上调 +10%：常规 25%，5000m 狂暴后 19%、冷却 560–780m）
  const rocketChance = over ? 0.19 : 0.25;
  if (pos >= G.nextRocketAllowed && G.sprint <= 0 && Math.random() < rocketChance) {
    G.nextRocketAllowed = pos + (over ? rand(560, 780) : rand(360, 520));
    return 'sprint';
  }
  return Math.random() < (over ? 0.36 : 0.52) ? 'shield' : 'magnet';
}
function addPower(laneX, pos, type = pickPowerType(pos)) {
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
    const frontBound = T.oncoming ? -(T.half + TRUCK.cabLength) : -T.half;
    const backBound = T.oncoming ? T.half : (T.half + TRUCK.cabLength);
    const ramp = !T.oncoming && offset < -T.half;
    if (offset > backBound || (ramp ? (!T.ramp || offset < -T.half - TRUCK.rampLength) : offset < frontBound)) continue;
    const width = ramp ? TRUCK.rampWidth : TRUCK.roofWidth;
    if (Math.abs(o.wx - x) > width / 2 + FOOT_REACH) continue;
    const height = ramp ? rampHeight(o.trackPos - T.half, distance) : TRUCK.roofHeight;
    if (!surface || height > surface.height) surface = { truck: o, height, ramp };
  }
  return surface;
}
function runningSpeed(distance) {
  // 5000m 前保持平缓封顶 27 m/s；5000m 起进入狂暴模式突破封顶，稳步升至 34.5 m/s
  const lateDistance = Math.max(0, distance - 500);
  const base = Math.min(13 + distance * 0.014 + lateDistance * 0.005, 27);
  if (distance <= OVERDRIVE_START) return base;
  return Math.min(34.5, base + 1.8 + (distance - OVERDRIVE_START) * 0.0022);
}
function placeTruck(type, laneX, entrance) {
  const { half, ramp } = TRUCK_TYPES[type];
  return addObs(type, laneX, entrance + half + (ramp ? TRUCK.rampLength : 0));
}
function truckEnd(truck) {
  const T = TRUCK_TYPES[truck.type];
  return truck.trackPos + (T.oncoming ? T.half : T.half + TRUCK.cabLength);
}
function roofCoins(truck, arrival = null, departure = Infinity) {
  const { half, ramp } = TRUCK_TYPES[truck.type];
  // 只有带斜坡、玩家可直接跑上去的货车才生成车顶奶瓶；无斜坡货车不生成
  if (!ramp) return;
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
function nextTruckLayout(overdrive = false) {
  if (overdrive && Math.random() < 0.55) {
    const hardChoices = HARD_TRUCK_LAYOUTS.filter(l => l !== G.lastTruckLayout);
    const chosen = pick(hardChoices.length ? hardChoices : HARD_TRUCK_LAYOUTS);
    G.lastTruckLayout = chosen;
    return chosen;
  }
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
  const overdrive = pos >= OVERDRIVE_START;
  const { route, parallel } = opening ? OPENING_TRUCK_LAYOUT : nextTruckLayout(overdrive);
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
  G.nextConvoy = end + (overdrive ? rand(28, 48) : rand(44, 78));
  return end;
}
function spawnShieldRun(pos) {
  const lane = G.openLane === 0 ? pick([LANE_X[0], LANE_X[2]]) : 0;
  addPower(lane, pos, 'shield');
  const truck = placeTruck('truck', lane, pos + 10);
  addCoinRow(G.openLane, pos + 1.2, 4);
  const end = truckEnd(truck);
  // 5000m 后护盾保底路线间隔拉长（从 115–165m 延至 280–400m），显著提高生存含金量
  G.nextShieldRun = end + (pos >= OVERDRIVE_START ? rand(280, 400) : rand(115, 165));
  return end;
}
function spawnOncomingWave(pos) {
  // 5000m 狂暴模式专属：来车预警清空路段（必留至少 1 条完全安全通道，绝不与静态障碍穿模）
  const previousLane = G.openLane;
  G.openLane = pick(LANE_X.filter(x => Math.abs(x - G.openLane) <= LANE_X[2]));
  addLaneChangeCoins(previousLane, G.openLane, pos);
  const sides = LANE_X.filter(x => x !== G.openLane);
  if (Math.random() < 0.5) sides.reverse();

  const doubleCar = pos >= 6400 || Math.random() < 0.65;
  const speedBoost = Math.min(3.5, (pos - OVERDRIVE_START) * 0.0012);
  const first = addObs('oncoming', sides[0], pos + 40);
  first.oncoming = true;
  first.moveSpeed = (rand(10.5, 13.5) + speedBoost) * 1.1;

  let end = pos + 44;
  if (doubleCar) {
    const second = addObs('oncoming', sides[1], pos + 56);
    second.oncoming = true;
    second.moveSpeed = (rand(10.5, 13.5) + speedBoost) * 1.1;
    end = pos + 58;
  }
  const coinStart = previousLane === G.openLane ? pos : pos + COIN_SPACING;
  addCoinRow(G.openLane, coinStart, Math.max(3, Math.floor((end - 6 - coinStart) / COIN_SPACING) + 1));
  G.nextOncoming = end + rand(95, 155);
  return end;
}
function spawnPattern(pos) {
  const overdrive = pos >= OVERDRIVE_START;
  if (overdrive && pos >= G.nextOncoming) return spawnOncomingWave(pos);
  if (pos >= G.nextConvoy) return spawnConvoy(pos);
  if (pos >= G.nextShieldRun) return spawnShieldRun(pos);

  // 让奶瓶始终跟着可通行的车道，每组过去后留出下一次换道的距离。
  const previousLane = G.openLane;
  G.openLane = pick(LANE_X.filter(x => Math.abs(x - G.openLane) <= LANE_X[2]));
  addLaneChangeCoins(previousLane, G.openLane, pos);
  const sides = LANE_X.filter(x => x !== G.openLane);
  if (Math.random() < 0.5) sides.reverse();
  const rowPool = overdrive ? HARD_STREET_ROWS : STREET_ROWS;
  const row = pick(rowPool.filter(pattern => pattern !== G.lastStreetRow));
  G.lastStreetRow = row;
  let end = pos + 6.4;
  for (const [i, slot] of row.entries()) {
    const lane = sides[i];
    // 5000m 后偶发 12% 概率在边路补刷道具（比常规稀缺），保证长跑仍有翻盘博弈
    if (overdrive && i === 1 && slot !== 'truck' && Math.random() < 0.12) {
      addPower(lane, pos);
      continue;
    }
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
  // 5000m 狂暴模式核心：主通道以 62%→75% 概率放置「必跳(闹钟/栏杆)」或「必滑(画饼)」形成全三车道组合阵，100% 有解
  const fullBlockChance = overdrive ? Math.min(0.75, 0.62 + (pos - OVERDRIVE_START) * 0.00004) : 0;
  let openBlocked = null;
  if (overdrive && Math.random() < fullBlockChance) {
    openBlocked = Math.random() < 0.52 ? 'low' : 'bing';
    const openObsPos = previousLane !== G.openLane ? pos + 3.4 : pos + 2.6;
    if (openBlocked === 'low') {
      addObs(pick(['alarm', 'gang']), G.openLane, openObsPos);
      addLowObstacleCoins(G.openLane, openObsPos);
      end = Math.max(end, pos + 9.2); // 留足落地缓冲，杜绝跳进下一排死局
    } else {
      addObs('bing', G.openLane, openObsPos);
      addCoinRow(G.openLane, pos + 0.6, 2);
      end = Math.max(end, pos + 7.4);
    }
  }
  if (!openBlocked) {
    const coinStart = previousLane === G.openLane ? pos : pos + COIN_SPACING;
    addCoinRow(G.openLane, coinStart, Math.max(2, Math.floor((end - coinStart) / COIN_SPACING) + 1));
  }
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
  const batch = !streetKitReady && factory !== Models.crosswalk;
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
  if (Array.isArray(scale)) mesh.scale.set(scale[0], scale[1], scale[2]);
  else mesh.scale.setScalar(scale);
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
// 结合 street-kit.glb 实测包围盒：width 为转正 ±90° 后沿马路方向的宽度，setback 让门前台阶紧贴外路沿（x≈±6.59）
const BUILDING_SPEC = {
  CampusLibrary: { width: 7.0, setback: 10.20, scaleY: [0.96, 1.09] },
  AcademicHall:  { width: 6.6, setback: 10.25, scaleY: [0.95, 1.09] },
  Dormitory:     { width: 6.3, setback: 9.85,  scaleY: [0.96, 1.10] },
  TeaCorner:     { width: 6.1, setback: 10.10, scaleY: [0.96, 1.09] },
  MilkMarket:    { width: 6.8, setback: 10.20, scaleY: [0.96, 1.08] },
  ParkPavilion:  { width: 5.9, setback: 12.40, scaleY: [0.95, 1.05] },
};
function spawnBuildingSide(side, cursor) {
  const district = districtAt(cursor), zone = DISTRICTS.indexOf(district);
  const districtBase = Math.floor(Math.max(0, cursor) / DISTRICT_LENGTH) * DISTRICT_LENGTH;
  const districtEnd = districtBase + DISTRICT_LENGTH;
  const facing = side < 0 ? Math.PI / 2 : -Math.PI / 2;

  // 躺平公园保持开阔绿地与稀疏亭台，正面同样朝向马路
  if (zone === 2) {
    const center = cursor + 3;
    if (cursor + 6.5 <= districtEnd && !besidePond(center, side) && !besidePond(center, -side) && Math.random() < 0.34) {
      const [name, sign, color] = pick(district.buildings);
      const spec = BUILDING_SPEC[name];
      const setback = spec.setback + rand(-0.6, 1.2);
      addScenery(() => Models.building(name, sign, color, 5.3, 3.1), side * setback,
        center, facing, 0, [1, rand(spec.scaleY[0], spec.scaleY[1]), 1],
        `building|${name}|${sign}|${color}`);
    }
    const step = rand(12.5, 16.5);
    return cursor + step > districtEnd ? Math.max(6.5, districtEnd - cursor) : step;
  }

  // 大学城与商业街：地标预留段（早八钟楼 / 奶昔补给站）严格避让防穿模
  const hasLandmark = (zone === 0 && side < 0) || (zone === 1 && side > 0);
  const resStart = districtBase + 25.0, resEnd = districtBase + 35.0;
  const lastKey = side < 0 ? 'lastBuildingL' : 'lastBuildingR';
  const opening = cursor < 10;
  const candidates = district.buildings.filter(b => b[0] !== G[lastKey]);
  const [name, sign, color] = opening
    ? district.buildings[side < 0 ? 0 : (cursor < 0 ? 1 : 2)]
    : pick(candidates.length ? candidates : district.buildings);
  const spec = BUILDING_SPEC[name];

  if (hasLandmark && cursor + spec.width > resStart && cursor < resEnd) {
    const preGap = resStart - cursor;
    if (preGap >= 1.1) {
      addScenery(() => Models.alleyFiller(zone), side * 8.15, cursor + preGap / 2,
        facing, 0, [Math.min(1.05, Math.max(0.55, preGap / 2.2)), 1, 1], `alley|${zone}`);
    }
    return Math.max(2, resEnd - cursor);
  }

  const center = cursor + spec.width / 2;
  const setback = spec.setback + rand(-0.14, 0.14);
  const sy = opening ? 1 : rand(spec.scaleY[0], spec.scaleY[1]);
  const height = zone === 0 ? 7.3 : 4.9;
  addScenery(() => Models.building(name, sign, color, 5.5, height), side * setback,
    center, facing, 0, [1, sy, 1], `building|${name}|${sign}|${color}`);
  G[lastKey] = name;

  const gap = rand(1.15, 1.85);
  const nextEdge = cursor + spec.width + gap;
  if (nextEdge < districtEnd && (!hasLandmark || nextEdge <= resStart || cursor >= resEnd)) {
    addScenery(() => Models.alleyFiller(zone), side * 8.15, cursor + spec.width + gap / 2,
      facing, 0, [Math.min(1.0, gap / 2.05), 1, 1], `alley|${zone}`);
  }
  return spec.width + gap;
}
function spawnBackdrop(pos) {
  const district = districtAt(pos), zone = DISTRICTS.indexOf(district);
  if (zone === 2) {
    const nextDistrict = (Math.floor(Math.max(0, pos) / DISTRICT_LENGTH) + 1) * DISTRICT_LENGTH;
    return Math.max(12, nextDistrict - pos);
  }
  const block = pos % DISTRICT_LENGTH;
  const pool = zone === 0
    ? [['AcademicHall', 0xd7c7ab], ['Dormitory', 0xd39c79], ['CampusLibrary', 0xc48a70]]
    : [['MilkMarket', 0xaac1ad], ['TeaCorner', 0xd4a07a], ['AcademicHall', 0xd7c7ab]];
  for (const side of [-1, 1]) {
    // 避开早八钟楼正后方视野，让钟楼塔尖轮廓清晰衬在天空前
    if (zone === 0 && side < 0 && block > 21 && block < 41) continue;
    const [name, color] = pick(pool);
    const facing = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    addScenery(() => Models.backdropBuilding(name, color), side * rand(18.8, 22.4),
      pos + rand(-1.4, 1.4), facing, 0, [1.22, rand(1.32, 1.78), 1.15], `backdrop|${name}`);
  }
  return rand(11.0, 13.5);
}
function spawnLandmarks(pos) {
  const zone = DISTRICTS.indexOf(districtAt(pos));
  if (zone === 0) {
    addScenery(() => Models.landmark('CampusClock', '早八钟楼'), -9.55, pos, Math.PI / 2, 0, 1, 'landmark|clock');
  } else if (zone === 1) {
    addScenery(() => Models.landmark('MilkCourt', '奶昔补给站'), 9.45, pos, -Math.PI / 2, 0, 1, 'landmark|milk');
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
function nearGantry(pos) {
  const hit = center => pos >= center - 11.4 && pos <= center + 2.4;
  return hit(G.lastGantry) || hit(G.nextGantry);
}
function spawnScenery(pos) {
  const zone = DISTRICTS.indexOf(districtAt(pos));
  const index = Math.floor(pos / 14);
  const blockMain = nearGantry(pos);
  const blockBack = nearGantry(pos + 3.8);
  for (const side of [-1, 1]) {
    const facing = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    const addTree = blossom => {
      if (blockMain) return;
      addScenery(() => Models.tree(blossom), side * rand(5.8, 6.05), pos,
        rand(-0.38, 0.38), 0.12, rand(0.86, 1.08), `tree|${blossom ? 'blossom' : 'plane'}`);
    };
    // 公交站穿插出现，其余位置按区域使用不同组合（避开人行天桥左右楼梯占位）
    if (!blockMain && zone !== 2 && index > 0 && index % 13 === (side < 0 ? 3 : 9)) {
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
      if (!blockBack && index % 3 === 0) addScenery(Models.flowerBed, side * 4.91, pos + 3.8, facing, 0.1, 1, 'flowerBed');
      if (!blockBack && (shore || index % 4 === 1)) addScenery(Models.bench, side * 5.8, pos + 4, facing, 0.1, 1, 'bench');
      if (!shore && index % 4 === (side < 0 ? 0 : 2)) {
        addScenery(Models.garden, side * 8.7, pos + 5.5, facing, 0, rand(0.88, 1.15), 'garden');
        addScenery(Models.parkTree, side * 19.6, pos + 8.4, 0.8, 0, rand(1.18, 1.45), 'tree|poplar');
      }
      if (!shore && index % 6 === (side < 0 ? 1 : 4)) {
        addScenery(Models.fountain, side * 9.05, pos + 5.4, 0, 0, 0.92, 'fountain');
      }
    } else if (zone === 0) {
      if (index % 2 === 0) addTree(index % 6 === (side < 0 ? 0 : 2));
      else if (!blockMain) addScenery(Models.flowerBed, side * 5.05, pos, facing, 0.1, 1, 'flowerBed');
      if (!blockBack && (index % 5 === 0 || index % 5 === 2)) addScenery(Models.bench, side * 5.8, pos + 3.8, facing, 0.1, 1, 'bench');
    } else {
      if (!blockMain && index % 7 === (side < 0 ? 2 : 4)) addScenery(Models.stall, side * 6.0, pos, facing, 0.1, 1, 'stall');
      else if (index % 3 === 0) addTree(false);
      else if (!blockMain) addScenery(Models.flowerBed, side * 5.03, pos, facing, 0.1, 1, 'flowerBed');
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
  ['nextBuildingL', pos => spawnBuildingSide(-1, pos)],
  ['nextBuildingR', pos => spawnBuildingSide(1, pos)],
  ['nextBackdrop', spawnBackdrop],
  ['nextScenery', pos => { spawnScenery(pos); return 14; }],
  ['nextLandmark', spawnLandmarks],
  ['nextCrosswalk', pos => {
    // 每隔 38–58m 按 65% 概率出现横跨三车道的斑马线（最多连续跳过 1 次，避免久不见）
    if (G.crosswalkMissed >= 1 || Math.random() < 0.65) {
      addScenery(Models.crosswalk, 0, pos, 0, 0.028, 1, 'crosswalk');
      G.crosswalkMissed = 0;
    } else {
      G.crosswalkMissed++;
    }
    return rand(38, 58);
  }],
  ['nextLamp', pos => {
    const side = (Math.floor(pos / 16) % 2) ? 1 : -1;
    if (!nearGantry(pos)) addScenery(Models.lamp, side * 4.9, pos, side < 0 ? 0 : Math.PI, 0.1, 1, 'lamp');
    return 16;
  }],
  ['nextGantry', pos => {
    const district = districtAt(pos);
    const market = district === DISTRICTS[1];
    G.lastGantry = pos;
    addScenery(() => Models.gantry(district.name, market), 0, pos, 0, 0, 1, `gantry|${district.name}`);
    // 降低天桥出现频率（约每 165–245m 出现一座，相当于每个街区 1 座地标天桥）
    return rand(165, 245);
  }],
];

function ensureWorld() {
  const menu = G.state === 'menu';
  const sceneryEnd = G.distance + (menu ? 82 : 112);
  // 优先补齐近处，每帧最多生成三组场景。开始页与开跑共用同一段街景。
  for (let i = 0; i < 3; i++) {
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
    // 5000m 前封顶 11.5m；5000m 狂暴后收紧至 9.6 → 8.4m，提升高频走位压迫感
    const gap = end >= OVERDRIVE_START
      ? Math.max(8.4, 9.6 - Math.min(1.2, (end - OVERDRIVE_START) * 0.0005))
      : Math.min(11.5, Math.max(6.4, 5.2 + runningSpeed(end) * 0.22));
    G.nextSpawn = end + gap;
  }
  spawnAerialPowder();
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
function burst(x, y, z, color, n = 10, spd = 8, shape = 2, size = 0.24, lifeMax = 0.65, gravity = 18, roadScroll = 0) {
  particleSys.burst(x, y, z, color, n, spd, shape, size, lifeMax, gravity, roadScroll);
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
  return new THREE.Sprite(Models.applyWorldBend(new THREE.SpriteMaterial({ map: flashTexture, depthWrite: false, fog: false })));
}

function hasImpactPower() { return G.sprint > 0 || G.jetDescent > 0 || G.shield > 0; }

function throwObstacle(obstacle) {
  if (G.sprint <= 0 && G.jetDescent <= 0 && G.shield > 0) G.shield--;
  obstacle.resolved = true;
  achRecord('elbow', { type: obstacle.type, isTruck: Boolean(TRUCK_TYPES[obstacle.type]) });
  const { mesh, type, wx, trackPos } = obstacle;
  const center = (STREET_TOP[type] ?? TRUCK.roofHeight) / 2;
  const firstZ = G.distance - trackPos;
  const pivot = new THREE.Group();
  pivot.position.set(wx, center, firstZ);
  mesh.position.set(0, -center, 0);
  const labels = [];
  mesh.traverse(node => {
    if ((!node.isSprite && !node.userData?.contactShadow) || !node.visible) return;
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
  G.shake = Math.max(G.shake, 0.34);
  G.hitStop = Math.max(G.hitStop, 0.042);
  G.fovPunch = Math.max(G.fovPunch, 4.6);
  G.speedPulse = Math.max(G.speedPulse, 0.58);
  G.shieldImpact = 1.0;
  landingRings.spawn(G.px, G.py, -0.45, 0xffe478, 2.6, 0.36);
  burst(G.px, G.py + 0.85, -0.2, 0xffdf66, 12, 9.5, 1, 0.34, 0.58, 12);
  burst(G.px, G.py + 0.75, -0.2, 0xff9a3c, 10, 8.5, 3, 0.26, 0.52, 16);
  AudioSys.smash();
  const throwBonus = shopMods().shieldThrowBonus || 0;
  if (throwBonus > 0) {
    G.bonusScore = (G.bonusScore || 0) + throwBonus;
    G.score = Math.floor(G.distance) + G.bonusScore;
    popup(`肘开！+${throwBonus}米`, '#ffe788');
  } else {
    popup('肘开！', '#ffe788');
  }
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
  G.speedPulse = Math.max(G.speedPulse, 0.24);
  AudioSys.dash(); AudioSys.fastSay('闪身步!'); popup('闪身步!', '#8fe8ff');
  achRecord('laneMove');
}
function doJump() {
  if (G.sprint > 0 || !G.grounded) return;
  if (G.sliding > 0) G.sliding = 0; // 跳跃可取消奶蛋出击
  G.vy = JUMP_V; G.airTime = 0; G.jumpFrom = G.py;
  G.grounded = false; G.jumping = true;
  AudioSys.jump(); AudioSys.fastSay('中国人能飞'); popup('中国人能飞!', '#ffd93f');
  achRecord('jump');
}
function doSlide() {
  if (G.sprint > 0 || G.sliding > 0 || G.pendingSlide) return;
  const airSlam = !G.grounded;
  if (G.grounded) G.sliding = SLIDE_DURATION;
  else { G.vy = -24; G.pendingSlide = true; }
  G.rollTime = 0;
  AudioSys.slide(); AudioSys.fastSay('奶蛋出击!'); popup('奶蛋出击!', '#ffd93f');
  achRecord('slide', { airSlam });
}

/* ---------- 碰撞与结算 ---------- */
function bodyMotion(name, duration) {
  G.motion = name;
  G.motionUntil = G.t + duration;
}

function crash() {
  G.state = 'dying';
  G.chaseFromStumble = false;
  G.deadTimer = CAPTURE_TOTAL;
  G.shake = 0.44;
  // 只有奶娃原本已稳稳站在平顶货车车顶时才保留脚下那辆车，其余情况统一落在开阔路面，彻底杜绝镜头穿进货车与障碍物
  const supportTruck = (G.grounded && G.surface && !G.surface.ramp && G.py >= TRUCK.roofHeight - 0.25)
    ? G.surface.truck : null;
  const supportSurface = supportTruck ? { truck: supportTruck, height: TRUCK.roofHeight, ramp: false } : null;
  setPlayerSurface(supportSurface);

  for (const flight of G.flyingObstacles) releaseFlight(flight);
  G.flyingObstacles.length = 0;

  const hiddenMeshes = [];
  const hideMesh = m => {
    if (m && m.visible) {
      m.visible = false;
      hiddenMeshes.push(m);
    }
  };
  for (const o of G.objects) {
    if (o === supportTruck) {
      if (o.mesh.userData.jumpMarker) hideMesh(o.mesh.userData.jumpMarker);
      o.mesh.traverse(node => { if (node.isSprite) hideMesh(node); });
      continue;
    }
    const half = TRUCK_TYPES[o.type]?.half ?? 2;
    if (Math.abs(o.trackPos - G.distance) <= 26 + half) {
      hideMesh(o.mesh);
    }
  }
  // 隐藏抓捕点紧邻的树冠、公交站、摊位、路灯与天桥，保留主街建筑立面作为背景，防止侧景镜头被近景物体遮挡
  for (const entry of G.buildings) {
    const z = G.distance - entry.trackPos;
    if (z < -16 || z > 18) continue;
    const k = entry.key || '';
    if (k.startsWith('building|') || k.startsWith('backdrop|') || k.startsWith('alley|') ||
        k.startsWith('landmark|') || k === 'crosswalk') continue;
    hideMesh(entry.mesh);
  }

  G.capture = {
    from: chaser.visible ? chaser.position.clone()
      : new THREE.Vector3(G.px, G.support, 3.9),
    side: G.px > 0 ? -1 : 1, height: G.py, touched: false,
    supportSurface, hiddenMeshes, next: 0, walkY: null,
  };
  G.capture.from.z = THREE.MathUtils.clamp(G.capture.from.z, 1.35, 5.8);
  setCoach('');
  AudioSys.eh();
  AudioSys.setBgmTempo(1);
  popupsEl.replaceChildren();
  AudioSys.noise(0.3, 0.15, 200); AudioSys.duckBGM(true);
  burst(G.px, G.py + 1, 0, 0xff5c5c, 24, 10);
  burst(G.px, G.py + 1, 0, 0xffd93f, 12, 8);
}
function showGameOver() {
  G.state = 'over';
  AudioSys.setBgmTempo(1);
  hideCutsceneOverlay();
  setCoach('');
  const isRecord = DEBUG_START_DIST === 0 && G.score > G.best;
  if (isRecord) { G.best = G.score; safeStoreSet('naiwa-best-distance', String(G.best)); }
  if (!G.runSettled) {
    G.runSettled = true;
    achRecord('runEnd', { distance: G.score, coins: G.coins, caught: true, hitType: G.lastHitType, isRecord });
  }
  document.getElementById('final-score').textContent = G.score;
  document.getElementById('final-coins').textContent = G.coins;
  document.getElementById('final-best').textContent = G.best;
  document.getElementById('new-record').classList.toggle('hidden', !isRecord);
  const s = G.score;
  const tier = s < 150 ? 'low' : s < 400 ? 'mid' : s < 900 ? 'high' : s < 1600 ? 'pro' : 'god';
  document.querySelector('#gameover .over-title').textContent = pick(OVER_TITLES);
  document.getElementById('verdict').textContent = pick(VERDICTS[tier]);
  const foot = document.getElementById('over-foot');
  if (foot) foot.textContent = pick(OVER_FEET);
  document.getElementById('gameover').classList.remove('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('btn-restart').focus({ preventScroll: true });
  if (isRecord) AudioSys.say('遥遥领先!', 0);
}
function collectCoin(o, at, fromMagnet = false) {
  const prev = G.coins;
  const gain = (G.doubleMilk ? 2 : 1) * (G.distance >= OVERDRIVE_START ? 2 : 1);
  o.resolved = true; G.coins += gain;
  AudioSys.coin();
  const p = at || { x: o.wx, y: (o.baseY || 0) + 0.6, z: -(o.trackPos - G.distance) };
  burst(p.x, p.y, p.z, 0xfffdf2, 5, 5.2, 2, 0.22, 0.48, 16);
  burst(p.x, p.y, p.z, 0xffdf59, 4, 6.2, 1, 0.30, 0.52, 8);
  if (Math.floor(prev / 10) < Math.floor(G.coins / 10)) { AudioSys.say('666!', 1.5); popup(`666! ${G.coins} 奶币`, '#ffd93f'); }
  achRecord('coin', { amount: gain, fromMagnet });
}
function collectPowder(o, at, fromMagnet = false) {
  const prev = G.coins;
  const gain = (G.doubleMilk ? 10 : 5) * (G.distance >= OVERDRIVE_START ? 2 : 1);
  o.resolved = true; G.coins += gain;
  AudioSys.coin();
  AudioSys.chime(2093, 0.14, 0.14, 0.08);
  const p = at || { x: o.wx, y: (o.baseY || JETPACK_ALTITUDE) + 0.75, z: -(o.trackPos - G.distance) };
  burst(p.x, p.y, p.z, 0xffe066, 10, 7.8, 1, 0.36, 0.62, 7);
  burst(p.x, p.y, p.z, 0x5ed4ff, 6, 6.2, 1, 0.30, 0.54, 7);
  popup(`金装奶粉 +${gain} 🍼`, '#ffe066');
  if (Math.floor(prev / 10) < Math.floor(G.coins / 10)) AudioSys.say('666!', 1.5);
  achRecord('powder', { amount: gain, fromMagnet });
}
function collectMeme(o) {
  const gain = (G.doubleMilk ? 10 : 5) * (G.distance >= OVERDRIVE_START ? 2 : 1);
  o.resolved = true; G.coins += gain;
  AudioSys.coin();
  popup(`鸡你太美! +${gain} 奶币`, '#ffd93f');
  burst(o.wx, 1.0, -(o.trackPos - G.distance), 0xff9a2e, 10, 8, 1, 0.34, 0.6, 12);
  burst(o.wx, 1.0, -(o.trackPos - G.distance), 0xffe478, 6, 6.5, 2, 0.24, 0.55, 16);
  achRecord('meme', { amount: gain });
}

function triggerRocketFlight(fromLoadout = false) {
  const escaped = G.chaseFromStumble && G.chaseActive;
  const dur = shopMods().sprintDuration;
  G.sprint = dur;
  G.sprintMax = dur;
  G.jetDescent = 0;
  G.sliding = 0; G.pendingSlide = false; G.jumping = false; G.grounded = false; G.surface = null; G.vy = 0;
  G.lastRoofTruck = null;
  G.chaseActive = false; // 升空甩开地面的豆包老师
  G.chaseFromStumble = false;
  const cruiseSpeed = runningSpeed(G.distance) * JETPACK_SPEED_MULT;
  G.nextPowderPos = Math.max(G.nextPowderPos, G.distance + 18);
  G.jetFlightEnd = G.distance + cruiseSpeed * (dur - 0.85);
  G.nextRocketAllowed = Math.max(G.nextRocketAllowed, G.jetFlightEnd + rand(280, 420));
  G.powderLane = G.lane;
  G.powderStreak = 0;
  G.fovPunch = Math.max(G.fovPunch, 3.8);
  G.speedPulse = Math.max(G.speedPulse, 0.78);
  landingRings.spawn(G.px, G.py, 0, 0xffaa44, 2.5, 0.38);
  burst(G.px, G.py + 0.4, 0.4, 0xfff1dc, 10, 5.5, 0, 0.46, 0.58, -1.5, 0.8);
  burst(G.px, G.py + 0.5, 0.4, 0xff8c3a, 10, 7.5, 3, 0.30, 0.52, 6, 0.4);
  spawnAerialPowder();
  if (!fromLoadout) {
    popup('奥利给! 起飞!', '#ffb03f');
    AudioSys.say('奥利给!', 1);
  }
  achRecord('power', { type: 'sprint', tripleBuff: G.shield > 0 && G.sprint > 0 && G.magnet > 0 });
  if (escaped) achRecord('stumbleEscaped');
}

function applyPower(o) {
  o.resolved = true; AudioSys.power();
  const ringCol = o.type === 'shield' ? 0xffe478 : o.type === 'sprint' ? 0xff9244 : 0x69e2ff;
  landingRings.spawn(o.wx, o.baseY || 0, 0, ringCol, 2.2, 0.35);
  burst(o.wx, 0.85, 0, ringCol, 12, 7.8, 1, 0.34, 0.58, 9);
  if (o.type === 'shield') {
    G.shield = (G.shield || 0) + 1;
    popup(`相信光盾 x${G.shield}!`, '#8fe8ff'); AudioSys.say('相信光!', 1);
    achRecord('power', { type: 'shield', stack: G.shield, tripleBuff: G.shield > 0 && G.sprint > 0 && G.magnet > 0 });
  } else if (o.type === 'sprint') {
    triggerRocketFlight(false);
  } else {
    const magDur = shopMods().magnetDuration;
    G.magnet = magDur;
    G.magnetMax = magDur;
    popup('库里库里~', '#8fe8ff'); AudioSys.say('磁吸奶瓶,吸!', 1);
    achRecord('power', { type: 'magnet', tripleBuff: G.shield > 0 && G.sprint > 0 && G.magnet > 0 });
  }
}
function hitObstacle(o) {
  // 小障碍碎掉，货车仍然留在赛道上。
  if (!TRUCK_TYPES[o.type]) { o.resolved = true; o.destroyed = true; }
  G.lastHitType = o.type;
  if (G.grace > 0) { crash(); return; }
  const over = G.distance >= OVERDRIVE_START;
  G.grace = over ? OVERDRIVE_GRACE : 5; G.shake = 0.7;
  bodyMotion('Stumble', 0.48);
  startChase(true);
  burst(G.px, G.py + 1, 0, 0xffb03f, 16, 10.5, 3, 0.28, 0.58, 18);
  burst(G.px, G.py + 1.25, 0, 0xff5c5c, 10, 8.2, 1, 0.30, 0.52, 14);
  burst(G.px, G.py + 0.6, 0, 0xefe4d0, 8, 5.2, 0, 0.42, 0.52, 2, 0.7);
  AudioSys.smash(); AudioSys.say('豆包老师来了!', 0);
  popup(over ? '🔥 狂暴警报！8 秒内别再撞！' : '快跑！5 秒内别再撞！', over ? '#ff6b4a' : '#ff9fcf');
  achRecord('stumble', { type: o.type });
}
function checkCollisions() {
  for (const o of G.objects) {
    if (o.resolved || TRUCK_TYPES[o.type]) continue;
    const isCollectible = o.kind === 'coin' || o.kind === 'powder';
    if (isCollectible && o.pull) continue;
    const z = o.trackPos - G.distance;
    // 磁铁：同高度区间的奶瓶/空中奶粉划弧线飞向奶娃
    const magRange = shopMods().magnetRange;
    if (isCollectible && G.magnet > 0 && z > 0 && z < magRange && Math.abs(G.py - (o.baseY || 0)) < 5.5) {
      o.pull = true; o.pullT = 0;
      o.pullX0 = o.wx; o.pullY0 = (o.baseY || 0) + (o.kind === 'powder' ? 0.75 : 0.6); o.pullZ0 = -z;
      continue;
    }
    if (z > 1.35 || z < -1.35) continue;
    if (Math.abs(o.wx - G.px) > (o.kind === 'powder' ? 1.25 : 1.1)) continue;
    if (o.kind === 'coin') { if (Math.abs(G.py - (o.baseY || 0)) < 0.9) collectCoin(o); }
    else if (o.kind === 'powder') { if (Math.abs(G.py - (o.baseY || JETPACK_ALTITUDE)) < 1.55) collectPowder(o); }
    else if (o.kind === 'power') { if (Math.abs(G.py - (o.baseY || 0)) < 1.2) applyPower(o); }
    else if (o.kind === 'meme') { if (Math.abs(G.py - (o.baseY || 0)) < 1.3) collectMeme(o); }
    else {
      const top = STREET_TOP[o.type] ?? TRUCK.roofHeight;
      if (G.py >= top - FLOOR_EPSILON) continue;
      if (o.type === 'bing' && (G.sliding > 0 || G.pendingSlide)) { o.resolved = true; achRecord('bingSlide'); }
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
  if (G.state === 'play') {
    const truck = G.surface?.truck ?? null;
    if (truck) {
      if (truck !== G.lastRoofTruck) {
        G.lastRoofTruck = truck;
        achRecord('roofLand', { truck });
      }
    } else if (G.lastRoofTruck !== null) {
      G.lastRoofTruck = null;
      achRecord('roofReset');
    }
  }
  if (G.jumping || G.pendingSlide) {
    const slam = G.pendingSlide;
    const onTruck = Boolean(G.surface?.truck);
    const dustCol = slam ? 0xffe47a : onTruck ? 0xfff0c2 : 0xeae2d2;
    burst(G.px, G.py + 0.14, 0.1, dustCol, slam ? 12 : 7, slam ? 4.8 : 3.2, 0, slam ? 0.38 : 0.30, 0.44, 3.5, 0.85);
    landingRings.spawn(G.px, G.py, 0, slam ? 0xffe066 : onTruck ? 0xfff1b8 : 0xfff5e0, slam ? 2.15 : 1.55, slam ? 0.36 : 0.30);
    if (slam) G.shake = Math.max(G.shake, 0.22);
    if (G.jumping) bodyMotion('Land', 0.25);
  }
  G.jumping = false;
  if (G.pendingSlide) {
    G.pendingSlide = false;
    G.sliding = SLIDE_DURATION;
  }
}

function handleTruckContact(truck, lastDistance, lastX) {
  if (G.grace > 0) {
    // 即将进入被抓过场：先回退到撞车前的安全坐标，避免奶娃陷在货车模型内部进入过场
    G.distance = lastDistance;
    G.px = lastX;
    setPlayerSurface(getTruckSurface(lastDistance, lastX));
    hitObstacle(truck);
    return;
  }
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
    G.distance = lastDistance;
    G.px = lastX;
    setPlayerSurface(getTruckSurface(lastDistance, lastX));
    crash();
    return;
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
    // 在 120Hz 物理子步内同步推进迎面驶来的动态货车，高速对向交汇零穿模
    for (const o of G.objects) {
      if (o.oncoming && !o.resolved && o.trackPos - G.distance < 115) {
        o.trackPos -= o.moveSpeed * step;
      }
    }

    // 火箭高空飞行模式：平滑拉升至高空巡航，跳过地面货车与重力，只保留左右换道吃空中奶粉
    if (G.sprint > 0) {
      const cruiseY = JETPACK_ALTITUDE + Math.sin(G.t * 4.5) * 0.16;
      G.py += (cruiseY - G.py) * (1 - Math.exp(-5.8 * step));
      G.vy = 0;
      G.grounded = false;
      G.jumping = false;
      G.surface = null;
      G.support = 0;
      if (G.state === 'play') checkCollisions();
      continue;
    }

    const effGrav = G.jetDescent > 0 ? GRAVITY * 0.65 : GRAVITY;
    const rawVY = G.vy - effGrav * step;
    const nextVY = G.jetDescent > 0 ? Math.max(-15, rawVY) : rawVY;
    const nextY = G.py + ((G.vy + nextVY) * 0.5) * step;
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
  if (G.fovPunch > 0) G.fovPunch = Math.max(0, G.fovPunch - dt * 16);
  if (G.speedPulse > 0) G.speedPulse = Math.max(0, G.speedPulse - dt * 2.4);
  if (G.shieldImpact > 0) G.shieldImpact = Math.max(0, G.shieldImpact - dt * 2.8);
  if (G.state === 'intro') { G.phase += dt * 8 * 1.15; updateIntro(dt); return; }
  if (G.state === 'menu') {
    G.phase += dt * 8 * 1.15;
    ensureWorld();
    updateWorldMeshes(dt);
    updatePlayerMesh(dt);
    updateEffects(dt);
    return;
  }
  if (G.state === 'dying') {
    G.phase += dt * 8 * 1.15;
    G.deadTimer = Math.max(0, G.deadTimer - dt);
    const elapsed = captureElapsed();
    setPlayerSurface(G.capture.supportSurface ?? null);
    G.py = THREE.MathUtils.lerp(G.capture.height, G.support, THREE.MathUtils.smoothstep(elapsed, 0, 0.46));
    if (elapsed >= CAPTURE_CONTACT && !G.capture.touched) G.capture.touched = true;
    runCaptureEvents(elapsed);
    updateWorldMeshes(dt);
    updatePlayerMesh(dt);
    updateEffects(dt);
    if (G.deadTimer <= 0) showGameOver();
    return;
  }

  let simDt = dt;
  if (G.hitStop > 0) {
    G.hitStop = Math.max(0, G.hitStop - dt);
    simDt = dt * 0.18;
  }
  G.phase += simDt * G.speed * 1.15;
  G.speed = runningSpeed(G.distance);
  const eff = G.speed * (G.sprint > 0 ? JETPACK_SPEED_MULT : 1);
  if (G.sliding > 0) G.sliding = Math.max(0, G.sliding - simDt);
  if (G.sliding > 0 || G.pendingSlide) G.rollTime += simDt;
  const wasSprinting = G.sprint > 0;
  if (G.sprint > 0) {
    G.sprint = Math.max(0, G.sprint - simDt);
    // 火箭蓬松云烟尾迹 + 炽热火星粒子
    G.jetSparkT -= simDt;
    if (G.jetSparkT <= 0) {
      G.jetSparkT = 0.032;
      particleSys.emit(
        G.px + rand(-0.16, 0.16), G.py + 0.46, 0.68,
        rand(-0.7, 0.7), rand(-0.3, 0.5), rand(1.2, 2.8),
        0xfff0d8, rand(0.36, 0.52), rand(0.42, 0.62), 0, -1.4, 1.6, 0.85, 0.88
      );
      particleSys.emit(
        G.px + rand(-0.14, 0.14), G.py + 0.48, 0.62,
        rand(-1.2, 1.2), rand(-0.6, 0.8), rand(2.0, 4.2),
        Math.random() < 0.5 ? 0xff7a3c : 0xffe066, rand(0.18, 0.28), rand(0.24, 0.42), 3, 2.5, 0.8, -0.4, 0.45
      );
    }
    if (G.sprint <= 0 && wasSprinting) {
      G.jetDescent = 1.8;
      G.vy = -4.2;
      popup('准备降落!', '#ffd93f');
    }
  }
  if (G.jetDescent > 0) {
    G.jetDescent = Math.max(0, G.jetDescent - simDt);
    if (G.grounded && G.jetDescent > 0.45) G.jetDescent = 0.45;
  }
  // 奔跑脚底扬尘 & 奶蛋出击翻滚尘迹
  if (G.grounded && G.sprint <= 0) {
    G.footDustT = (G.footDustT || 0) - simDt;
    if (G.footDustT <= 0) {
      const rolling = G.sliding > 0;
      G.footDustT = rolling ? 0.045 : Math.max(0.075, 0.135 - (G.speed - 13) * 0.0022);
      const onTruck = Boolean(G.surface?.truck);
      const footSide = rolling ? rand(-0.26, 0.26) : (((G.footStep = (G.footStep || 0) + 1) % 2) ? 0.22 : -0.22);
      const dustCol = rolling ? 0xffe9a8 : onTruck ? 0xfff0c8 : (DISTRICTS.indexOf(districtAt(G.distance)) === 2 ? 0xd9e3c8 : 0xdcd5c7);
      particleSys.emit(
        G.px + footSide, G.py + (rolling ? 0.14 : 0.10), 0.26,
        rand(-0.55, 0.55) + footSide * 0.6, rand(0.55, rolling ? 1.45 : 1.05), rand(0.4, 1.4),
        dustCol, rolling ? rand(0.28, 0.42) : rand(0.22, 0.34), rolling ? 0.36 : 0.32,
        0, 2.2, 2.0, 0.72, 0.95
      );
    }
  }
  if (G.magnet > 0) G.magnet -= simDt;
  if (G.grace > 0) G.grace = Math.max(0, G.grace - simDt);
  if (shopSkins().pass) {
    G.passSparkT = (G.passSparkT || 0) - simDt;
    if (G.passSparkT <= 0) {
      G.passSparkT = 0.14;
      particleSys.emit(
        G.px + rand(-0.24, 0.24), G.py + 0.92, 0.48,
        rand(-0.6, 0.6), rand(0.4, 1.3), rand(0.2, 1.0),
        0xffe46e, rand(0.22, 0.32), 0.48, 1, 1.5, 0.6, -0.2, 0.75
      );
    }
  }
  advancePlayer(simDt, eff);
  G.score = Math.floor(G.distance) + (G.bonusScore || 0);
  if (G.state === 'play' && !G.overdriveTriggered && G.distance >= OVERDRIVE_START) {
    G.overdriveTriggered = true;
    G.overdriveHintUntil = G.t + 4.8;
    G.shake = Math.max(G.shake, 0.55);
    G.fovPunch = Math.max(G.fovPunch, 5.2);
    G.speedPulse = 1.0;
    AudioSys.overdriveAlert();
    AudioSys.setBgmTempo(1.18);
    AudioSys.say('豆包老师来了!', 0);
    popup('🔥 5000米！狂暴模式！奶瓶 ×2！', '#ff6b4a');
  }
  if (G.state === 'play' && G.score !== G.lastAchScore) {
    G.lastAchScore = G.score;
    achRecord('tick', {
      distance: G.distance,
      muted: AudioSys.effectiveVolume() <= 0,
      tripleBuff: G.shield > 0 && G.sprint > 0 && G.magnet > 0,
    });
  }
  // 每快 3.5m/s 弹一次「提速」，配合更平滑的后期速度曲线
  const tier = Math.floor((G.speed - 13) / 3.5);
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
  updateWorldMeshes(simDt);
  updatePlayerMesh(simDt);
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
  Models.setWorldTime(G.t, G.distance);
  trackTex.offset.y = G.distance * 40 / 400;
  sidewalkTex.offset.y = G.distance * 90 / 400;
  lawnTex.offset.y = G.distance * 84 / 600;
  updatePosts();
  outskirtForest.update(G.distance);
  for (const o of G.objects) {
    // 磁铁吸附飞行中的奶瓶 / 空中奶粉：划弧线飞向奶娃（被抓过场期间冻结，避免幽灵入账）
    if ((o.kind === 'coin' || o.kind === 'powder') && o.pull && !o.resolved) {
      if (G.state !== 'play') continue;
      o.pullT = Math.min(1, o.pullT + dt * 2.8);
      const t = o.pullT, e = t * t * (3 - 2 * t);
      const tx = G.px, ty = G.py + 0.7, tz = 0;
      const arc = Math.sin(Math.PI * t) * (o.kind === 'powder' ? 1.2 : 2.4);
      o.mesh.position.set(
        o.pullX0 + (tx - o.pullX0) * e,
        o.pullY0 + (ty - o.pullY0) * e + arc,
        o.pullZ0 + (tz - o.pullZ0) * e
      );
      o.mesh.rotation.y = G.t * 10 + o.seed;
      if (Math.random() < dt * 15) {
        particleSys.emit(
          o.mesh.position.x, o.mesh.position.y, o.mesh.position.z,
          rand(-0.5, 0.5), rand(-0.3, 0.7), rand(-0.4, 0.4),
          o.kind === 'powder' ? 0xffe066 : 0x7ae8ff, 0.22, 0.28, 1, 2, 1.2, -0.3, 0.35
        );
      }
      if (t >= 1) {
        const at = { x: o.mesh.position.x, y: o.mesh.position.y, z: o.mesh.position.z };
        if (o.kind === 'powder') collectPowder(o, at, true);
        else collectCoin(o, at, true);
        o.pull = false;
      }
      continue;
    }
    const z = G.distance - o.trackPos;
    const baseY = o.baseY ?? 0;
    const bob = Math.sin(G.t * 3 + (o.truck?.seed ?? o.seed));
    const beacon = o.mesh.userData.beacon;
    let y = beacon ? baseY + 0.9 + bob * 0.12
      : o.kind === 'powder' ? baseY + 0.75 + bob * 0.14
      : o.kind === 'coin' ? baseY + 0.6 + bob * 0.1 : 0;

    // 障碍物活人感微动画：早八闹钟狂震 / 灭霸呼吸+手套闪光 / EMO 摇摆 / 低头族飘心 / 来车颠簸扬尘
    if (o.kind === 'obs' && !o.destroyed) {
      if (o.type === 'alarm') {
        const near = z > -38 && z < 3;
        o.mesh.rotation.z = near ? Math.sin(G.t * 36 + o.seed) * 0.095 : 0;
        if (near) y += Math.abs(Math.sin(G.t * 18 + o.seed)) * 0.055;
      } else if (o.type === 'thanos') {
        const breath = Math.sin(G.t * 3.1 + o.seed);
        o.mesh.scale.set(1 + breath * 0.018, 1 + breath * 0.036, 1 + breath * 0.018);
        o.mesh.rotation.y = THREE.MathUtils.clamp((G.px - o.wx) * 0.075, -0.26, 0.26);
        const glow = o.mesh.userData.gauntletGlow;
        if (glow) {
          const pulse = 0.72 + 0.28 * Math.sin(G.t * 6.5 + o.seed);
          glow.scale.setScalar(0.62 + pulse * 0.34);
          glow.material.opacity = 0.55 + pulse * 0.4;
        }
      } else if (o.type === 'emo') {
        o.mesh.rotation.z = Math.sin(G.t * 2.3 + o.seed) * 0.045;
      } else if (o.type === 'phone') {
        o.mesh.rotation.z = Math.sin(G.t * 3.4 + o.seed) * 0.032;
        const heart = o.mesh.userData.phoneHeart;
        if (heart) {
          const u = ((G.t * 0.85 + o.seed) % 1 + 1) % 1;
          heart.position.set(0.36 + Math.sin(u * Math.PI * 2) * 0.12, 1.32 + u * 0.88, 0.28);
          heart.scale.setScalar(0.26 + Math.sin(u * Math.PI) * 0.16);
          heart.material.opacity = Math.sin(u * Math.PI) * 0.92;
        }
      } else if (o.type === 'bing') {
        o.mesh.rotation.z = Math.sin(G.t * 2.5 + o.seed) * 0.022;
      } else if (o.oncoming) {
        y += Math.abs(Math.sin(G.t * 22 + o.seed)) * 0.042;
        if (G.state === 'play' && z > -65 && z < 4 && Math.random() < dt * 18) {
          particleSys.emit(
            o.wx + rand(-0.85, 0.85), 0.18, z - TRUCK.shortHalf - 0.3,
            rand(-0.8, 0.8), rand(0.5, 1.4), rand(-1.5, 0.5),
            0xd4cab8, rand(0.28, 0.44), 0.42, 0, 1.8, 1.8, 0.75, 0.8
          );
        }
      }
      const jm = o.mesh.userData.jumpMarker;
      if (jm && jm.visible) {
        const p = 0.5 + 0.5 * Math.sin(G.t * 8.5 + o.seed);
        jm.scale.setScalar(1 + p * 0.14);
        jm.position.y = TRUCK.roofHeight + 0.02 + p * 0.06;
      }
    }

    o.mesh.position.set(o.wx, y, z);
    if (beacon) beacon.position.y = baseY + 0.045 - y;
    if (o.kind === 'coin') o.mesh.rotation.y = G.t * 4 + o.seed;
    if (o.kind === 'powder') o.mesh.rotation.y = G.t * 2.6 + o.seed;
    if (o.kind === 'power') o.mesh.rotation.y = Math.sin(G.t * 2 + o.seed) * 0.4;
    if (o.kind === 'meme') o.mesh.rotation.y = G.t * 2 + o.seed;
    if (o.kind === 'obs' && o.type === 'clap' && o.mesh.userData.hands) {
      const c = Math.abs(Math.sin(G.t * 6 + o.seed)) * 0.12;
      o.mesh.userData.hL.position.x = -0.12 + c;
      o.mesh.userData.hR.position.x = 0.12 - c;
    }
    if (o.oncoming && o.mesh.userData.headlightMat) {
      o.mesh.userData.headlightMat.opacity = 0.22 + Math.abs(Math.sin(G.t * 14 + o.seed)) * 0.16;
      if (o.mesh.userData.strobeMat) {
        o.mesh.userData.strobeMat.color.setHex(Math.floor(G.t * 10 + o.seed) % 2 ? 0xff3b2f : 0xffd54f);
      }
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
  }
  for (const cloud of clouds) {
    cloud.position.x += dt * 0.48;
    if (cloud.position.x > 184) cloud.position.x = -184;
  }
  const targetSkyCloud = (G.state === 'play' && (G.sprint > 0 || G.jetDescent > 0 || G.py > 4.0))
    ? THREE.MathUtils.smoothstep(G.py, 2.2, 5.6) : 0;
  G.skyCloudBlend = (G.skyCloudBlend || 0) + (targetSkyCloud - (G.skyCloudBlend || 0)) * Math.min(1, dt * 7);
  skyCloudCorridor.update(G.skyCloudBlend, G.distance);
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
  const flying = !menu && !fallen && G.sprint > 0;
  player.rotation.set(0, 0, -tilt * (egg ? 0.15 : flying ? 0.36 : 0.25));
  ud.spin.rotation.x = flying ? -0.34 : 0;
  ud.egg.visible = egg;
  ud.torso.visible = !runnerRig && !egg;
  for (const leg of ud.legs) leg.visible = ud.torso.visible;

  if (menu) {
    const portrait = camera.aspect < 0.95;
    player.position.set(portrait ? -0.96 : 1.75, 0, 0.63);
    player.rotation.set(0, Math.PI + 0.23, 0);
  } else if (G.state === 'intro') {
    player.position.copy(intro.nPos);
    player.rotation.set(0, intro.nRot, 0);
  } else if (fallen) {
    const elapsed = captureElapsed();
    const side = G.capture?.side ?? 1;
    const turn = THREE.MathUtils.smoothstep(elapsed, 0.20, 0.75);
    const lift = THREE.MathUtils.smoothstep(elapsed, CAPTURE_LIFT, CAPTURE_LIFT + 0.3);
    const dangle = Math.sin(G.t * 8.5) * lift;
    player.rotation.set(0, -side * 1.82 * turn, turn * 0.1 + dangle * 0.09);
    player.position.y += lift * (0.32 + Math.abs(dangle) * 0.04);
    if (elapsed >= CAPTURE_WALK) {
      // 被老师拎在身侧带走，面朝镜头晃荡。
      const k = THREE.MathUtils.smoothstep(elapsed, CAPTURE_WALK, CAPTURE_WALK + 0.35);
      const step = Math.abs(Math.sin(G.t * 7)) * 0.05;
      player.position.lerp(iA.set(chaser.position.x + side * 0.62,
        chaser.position.y + 0.32 + step, chaser.position.z - 0.05), k);
      player.rotation.y = THREE.MathUtils.lerp(-side * 1.82, -side * Math.PI, k);
    }
  } else if (egg) {
    ud.egg.rotation.x = -G.rollTime * 13;
    player.position.y += 0.025;
  } else if (airborne && G.jumping && !flying) {
    ud.spin.rotation.x = -Math.min(1, G.airTime / AIR_FLIP_DUR) * Math.PI * 2;
  }

  if (runnerRig) {
    runnerRig.model.visible = !egg;
    if (!egg) {
      const action = menu ? (G.t % 10 >= 2.5 && G.t % 10 < 4 ? 'Greeting' : 'Idle')
        : G.state === 'intro' ? intro.nAction
        : fallen ? 'Caught' : airborne && motion !== 'Stumble' ? 'Jump' : motion || 'Run';
      const speed = G.state === 'intro' ? intro.nSpeed
        : action === 'Run' ? Math.min(2.1, G.speed / 13 * (G.sprint > 0 ? 1.3 : 1)) : 1;
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
  if (ud.aura.visible) {
    const flames = ud.auraFlames || ud.aura.children;
    flames.forEach((f, i) => f.scale.set(
      0.85 + Math.abs(Math.sin(G.t * 24 + i)) * 0.35,
      0.75 + Math.abs(Math.sin(G.t * 28 + i * 1.4)) * 0.65,
      0.85 + Math.abs(Math.sin(G.t * 24 + i)) * 0.35
    ));
  }
  const shielded = G.shield > 0;
  if (shielded && !ud.shieldDome) {
    const dome = Models.shieldDome();
    player.add(dome.root);
    ud.shieldDome = dome;
    ud.shieldMesh = dome.root;
  }
  if (ud.shieldMesh) {
    ud.shieldMesh.visible = shielded;
    if (shielded && ud.shieldDome) ud.shieldDome.update(G.t, G.shield, G.shieldImpact);
  }
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
  // 关闭实时阴影后，桌面与手机统一使用低成本脚底接触阴影。
  shadow.material.opacity = 0.90 / (1 + lift * 1.7);
}

function updateActorShadows(chaserSurface) {
  const [runnerShadow, chaserShadow] = actorShadows;
  updateContactShadow(runnerShadow, player, G.surface, 1.57, 1.22);
  updateContactShadow(chaserShadow, chaser, chaserSurface, 1.27, 1.20);
}

function updateEffects(dt) {
  updateWorldBend(dt);
  updateCharacterRims(dt, false);
  updateFlyingObstacles(dt);
  const scrollDz = G.state === 'play'
    ? G.speed * (G.sprint > 0 ? JETPACK_SPEED_MULT : 1) * (G.hitStop > 0 ? dt * 0.18 : dt)
    : G.state === 'intro' ? 13 * sstep(intro.t, INTRO_RUN_FROM, INTRO_LENGTH) * dt : 0;
  particleSys.update(dt, renderer.domElement.clientHeight || window.innerHeight || 720, scrollDz);
  landingRings.update(dt, scrollDz);
  const weatherMode = G.overdriveTriggered ? 3 : DISTRICTS.indexOf(districtAt(G.distance));
  ambientWeather.update(dt, scrollDz, weatherMode, G.t, Math.max(0, G.py - 1.5));

  // 3D 动态丝带拖尾（闪身步 / 奶蛋出击 / 火箭高飞 / 狂暴高速）
  const laneDelta = Math.abs(LANE_X[G.lane] - G.px);
  const trailActive = G.state === 'play' && (G.sprint > 0 || G.sliding > 0 || laneDelta > 0.16 || G.speedPulse > 0.12);
  const trailCol = G.sprint > 0 ? 0xffa43c
    : G.sliding > 0 ? 0xffe478
    : laneDelta > 0.16 ? 0x7ceeff
    : G.overdriveTriggered ? 0xff7f5c : 0xffe8a3;
  const trailW = G.sprint > 0 ? 0.52 : G.sliding > 0 ? 0.44 : 0.34;
  const trailY = G.py + (G.sliding > 0 ? 0.46 : G.sprint > 0 ? 0.72 : 0.92);
  const trailStr = G.sprint > 0 ? 0.92 : G.sliding > 0 ? 0.82 : Math.min(0.88, 0.55 + laneDelta * 0.35 + G.speedPulse * 0.4);
  ribbonTrail.update(dt, scrollDz, trailActive, G.px, trailY, 0.32, trailW, trailCol, trailStr);

  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 1.9);
  if (G.state === 'intro') {
    speedLines.update(G.t, 0, 0xfff5dc, camera.aspect);
    camera.fov = intro.fov;
    camera.updateProjectionMatrix();
    camera.position.copy(intro.camPos);
    camera.lookAt(intro.camLook);
    return;
  }
  const fovEff = G.speed * (G.sprint > 0 ? JETPACK_SPEED_MULT : 1);
  const narrow = camera.aspect < 0.95;
  const fovT = G.state === 'menu' ? (narrow ? 55 : 49)
    : G.capture ? (narrow ? 59 : 55)
    : Math.min(89, 62 + Math.max(0, fovEff - 13) * 0.5 + G.fovPunch);
  camera.fov += (fovT - camera.fov) * Math.min(1, dt * (G.fovPunch > 0.2 ? 14 : 5.5));
  camera.updateProjectionMatrix();

  // 3D 空间速度线：高速跑酷 / 火箭升空 / 狂暴模式 / 闪身与肘飞冲击时呈现
  if (G.state === 'play') {
    let spInt = THREE.MathUtils.smoothstep(fovEff, 18.5, 34) * 0.42;
    if (G.sprint > 0) spInt = Math.max(spInt, 0.78);
    if (G.overdriveTriggered) spInt = Math.max(spInt, 0.34 + THREE.MathUtils.smoothstep(fovEff, 27, 36) * 0.36);
    spInt = Math.min(1, spInt + G.speedPulse * 0.48);
    const spCol = G.sprint > 0 ? 0xffe48f : G.overdriveTriggered ? 0xff9466 : 0xfff5dc;
    speedLines.update(G.t, spInt, spCol, camera.aspect);
  } else {
    speedLines.update(G.t, 0, 0xfff5dc, camera.aspect);
  }

  if (G.state === 'menu') {
    camera.position.set(narrow ? 0 : -0.52, narrow ? 3.57 : 2.88, narrow ? 8.1 : 6.8);
    camera.lookAt(narrow ? 0 : -0.22, narrow ? 2.02 : 1.55, -7.7);
    return;
  }
  // 平方创伤阻尼震屏：更有重量与弹性，不生硬抖动
  const tr = G.shake * G.shake;
  const shx = tr > 0 ? (Math.sin(G.t * 47) * 0.65 + Math.cos(G.t * 73) * 0.35) * tr * 0.55 : 0;
  const shy = tr > 0 ? (Math.cos(G.t * 53) * 0.65 + Math.sin(G.t * 81) * 0.35) * tr * 0.40 : 0;
  const shRoll = tr > 0 ? Math.sin(G.t * 61) * tr * 0.042 : 0;

  // 竖屏（手机）时把镜头拉远一点，避免奶娃糊满屏幕
  const portrait = camera.aspect < 0.85 ? 2.2 : 0;
  // 同车道追逐时从稍高的侧后方拍摄，也看得到前面的奶娃和障碍。
  const chaseDur = G.chaseDuration || CHASE_DURATION;
  const chaseFrame = G.chaseActive
    ? Math.max(0, Math.min(1, G.chaseTime / 0.65, (chaseDur - G.chaseTime) / 0.7)) : 0;

  // 跳跃高度弹性阻尼：常规起跳镜头仅跟升 42%，凸显腾空高度；车顶连跳期间保持车顶基准不下沉
  const jetMode = G.sprint > 0 || G.jetDescent > 0;
  const floorTarget = jetMode ? G.py
    : G.grounded ? G.support
    : G.jumping ? Math.max(G.support, Math.min(G.jumpFrom, G.py))
    : Math.max(G.support, G.py);
  G.camSupportY += (floorTarget - G.camSupportY) * (1 - Math.exp(-(jetMode ? 8.5 : 8.0) * dt));
  const jumpLift = jetMode ? 0 : Math.max(0, G.py - G.camSupportY);
  const camBaseY = G.camSupportY + jumpLift * 0.42;
  const lookBaseY = G.camSupportY + jumpLift * 0.58;

  // 火箭高空飞行时保持舒适的拉远与俯瞰角度，同时看到空中奶粉与下方城市街景
  const camLift = Math.min(G.py, 4.5);
  const skyBlend = THREE.MathUtils.smoothstep(G.py, 3.0, JETPACK_ALTITUDE - 1.2);
  camera.position.set(G.px * 0.55 + chaseFrame + shx,
    3.4 + camBaseY - skyBlend * 0.55 + portrait * 0.35 + chaseFrame * 0.55 + shy,
    7.2 + portrait + camLift * 0.50 + skyBlend * 0.95 + chaseFrame * 0.85);
  let targetX = G.px * 0.7 + chaseFrame * 0.1;
  let targetY = 1.5 + lookBaseY - skyBlend * 0.75 - chaseFrame * 0.58;
  let targetZ = -9 + chaseFrame * 2.5;
  if (G.capture) {
    const cut = THREE.MathUtils.smoothstep(Math.min(CAPTURE_LENGTH, captureElapsed()), 0.05, 0.70);
    const { side } = G.capture;
    const camX = THREE.MathUtils.clamp(G.px + side * (narrow ? 3.45 : 3.05), -3.15, 3.15);
    camera.position.set(
      THREE.MathUtils.lerp(camera.position.x, camX, cut),
      THREE.MathUtils.lerp(camera.position.y, G.py + 2.38, cut),
      THREE.MathUtils.lerp(camera.position.z, narrow ? 3.35 : 2.2, cut)
    );
    targetX = THREE.MathUtils.lerp(targetX, G.px - side * 0.18, cut);
    targetY = THREE.MathUtils.lerp(targetY, G.py + 1.08, cut);
    targetZ = THREE.MathUtils.lerp(targetZ, narrow ? 0.22 : 0.42, cut);
    if (captureElapsed() >= CAPTURE_LENGTH) {
      const look = captureShot(captureElapsed(), narrow, camera.position);
      camera.position.x += shx; camera.position.y += shy;
      camera.updateProjectionMatrix();
      targetX = look.x; targetY = look.y; targetZ = look.z;
    }
  }
  camera.lookAt(targetX, targetY, targetZ);

  // 换道微倾（Camera Roll）+ 震屏微旋
  const targetRoll = (G.state === 'play' && !G.capture)
    ? -((LANE_X[G.lane] - G.px) / 2.4) * (G.sprint > 0 ? 0.062 : 0.042)
    : 0;
  G.camRoll += (targetRoll - G.camRoll) * (1 - Math.exp(-10 * dt));
  const totalRoll = G.camRoll + (G.capture ? 0 : shRoll);
  if (Math.abs(totalRoll) > 0.0001) camera.rotateZ(totalRoll);
}
// 被抓过场 1.4 秒之后的三个镜头；始终保持机位在安全车道宽度内（|x| <= 3.15m），返回注视点，相机位置写入 pos。
const captureLook = new THREE.Vector3();
function captureShot(elapsed, narrow, pos) {
  const { side } = G.capture;
  const far = narrow ? 1.55 : 1;
  const h = G.support;
  if (elapsed < CAPTURE_LIFT) {
    // 豆包老师近景：从马路开阔侧斜前方拍老师正面，既不被奶娃挡脸也不出街沿
    const k = THREE.MathUtils.smoothstep(elapsed, CAPTURE_LENGTH, CAPTURE_LIFT);
    const tx = G.px - side * CAPTURE_GAP_X;
    const cx = THREE.MathUtils.clamp(G.px + side * (1.15 - 0.18 * k) * far, -3.1, 3.1);
    pos.set(cx, h + 1.86, -0.88 * far + 0.15 * k);
    camera.fov = 42;
    return captureLook.set(tx + side * 0.12, h + 1.52, CAPTURE_GAP_Z - 0.12);
  }
  if (elapsed < CAPTURE_WALK) {
    // 奶娃近景：被拎起来求饶，老师在身后
    const k = THREE.MathUtils.smoothstep(elapsed, CAPTURE_LIFT, CAPTURE_WALK);
    const cx = THREE.MathUtils.clamp(G.px + side * (2.65 - 0.30 * k) * far, -3.15, 3.15);
    pos.set(cx, h + 1.56, 0.52 * far);
    camera.fov = 42;
    return captureLook.set(G.px - side * 0.1, h + 1.38, 0.3);
  }
  // 拉远：镜头在两人身后的赛道上方后退抬高，老师拎着奶娃朝镜头走来
  const k = easeIO(THREE.MathUtils.smoothstep(elapsed, CAPTURE_WALK, CAPTURE_TOTAL));
  const tx = chaser.position.x, tz = chaser.position.z;
  const cx = THREE.MathUtils.clamp(tx + side * THREE.MathUtils.lerp(1.0, 1.75, k), -3.15, 3.15);
  pos.set(cx,
    h + THREE.MathUtils.lerp(1.85, 4.4, k),
    tz + THREE.MathUtils.lerp(3.3, 8.4, k) * far);
  camera.fov = THREE.MathUtils.lerp(46, 52, k);
  return captureLook.set(tx + side * 0.2, h + THREE.MathUtils.lerp(1.3, 0.88, k), tz - THREE.MathUtils.lerp(0, 2.8, k));
}

/* ---------- HUD ---------- */
const coach = document.getElementById('coach');
function setCoach(text) {
  if (coach.textContent !== text) coach.textContent = text;
  coach.classList.toggle('hidden', !text);
}
function updateCoach() {
  if (G.overdriveHintUntil > G.t) {
    setCoach('🔥 5000米狂暴模式：极速飙升 · 三道连障 · 来车预警 · 奶瓶收益 ×2！');
  } else if (G.sprint > 0) {
    const gain = (G.doubleMilk ? 10 : 5) * (G.distance >= OVERDRIVE_START ? 2 : 1);
    setCoach(handheld ? `🚀 火箭高空飞行！左右滑动收集空中奶粉（+${gain} 奶币）` : `🚀 火箭高空飞行！按 ← → 收集空中奶粉（+${gain} 奶币）`);
  } else if (G.roofHintUntil > G.t) {
    setCoach(handheld ? '看到车顶箭头时，上滑跳到下一辆车' : '看到车顶箭头时，按 ↑ 跳到下一辆车');
  } else if (G.distance < 22) {
    setCoach('沿地面奶瓶绕行，也可以从中间斜坡上车');
  } else setCoach('');
}

const elScore = document.getElementById('score');
const elCoins = document.getElementById('coins');
const elPowerbars = document.getElementById('powerbars');
const elOverdriveBadge = document.getElementById('overdrive-badge');
let puKey = '';
const puEls = Object.create(null);
let shownScore = 0, shownCoins = 0, shownOverdrive = false;
const PU_META = {
  shield: { icon: '🛡️', name: '相信光盾', color: '#ffe066', dur: 1 },
  sprint: { icon: '🚀', name: '奥利给', color: '#ff7a3c', dur: SPRINT_DURATION },
  magnet: { icon: '🐑', name: '磁吸小羊', color: '#5ec8f2', dur: 8 },
  doubleMilk: { icon: '🍼', name: '双倍奶瓶', color: '#8ef0c6', dur: 1 },
};
function updateHUD() {
  if (G.score !== shownScore) elScore.textContent = shownScore = G.score;
  if (G.coins !== shownCoins) elCoins.textContent = shownCoins = G.coins;
  const over = Boolean(G.overdriveTriggered);
  if (elOverdriveBadge && over !== shownOverdrive) {
    shownOverdrive = over;
    elOverdriveBadge.classList.toggle('hidden', !over);
  }
  const active = [];
  if (G.shield > 0) active.push('shield');
  if (G.sprint > 0) active.push('sprint');
  if (G.magnet > 0) active.push('magnet');
  if (G.doubleMilk) active.push('doubleMilk');
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
    const isStatic = k === 'shield' || k === 'doubleMilk';
    const maxDur = k === 'sprint' ? (G.sprintMax || m.dur)
      : k === 'magnet' ? (G.magnetMax || m.dur) : m.dur;
    const remain = isStatic ? 1 : G[k];
    const frac = isStatic ? 1 : Math.max(0, G[k] / maxDur);
    if (el.fill) el.fill.style.width = `${frac * 100}%`;
    if (el.time) {
      el.time.textContent = k === 'shield' ? `${G.shield}次`
        : k === 'doubleMilk' ? '×2'
        : `${remain.toFixed(1)}s`;
    }
  }
}

/* ---------- 流程 ---------- */
function resetGame(keepScenery = false) {
  const startDist = DEBUG_START_DIST;
  const preserveScenery = keepScenery && startDist === 0;
  for (const mesh of G.capture?.hiddenMeshes ?? []) mesh.visible = true;
  for (const o of G.objects) release(o);
  for (const flight of G.flyingObstacles) releaseFlight(flight);
  if (!preserveScenery) {
    for (const b of G.buildings) retireScenery(b);
    Object.assign(G, {
      buildings: [], nextBuildingL: startDist + 1, nextBuildingR: startDist - 2, nextBackdrop: startDist + 4,
      lastBuildingL: null, lastBuildingR: null,
      nextLamp: startDist + 20, nextGantry: startDist + 60, lastGantry: startDist - 999,
      nextScenery: startDist + 8, nextCrosswalk: startDist + 42, crosswalkMissed: 0,
      nextLandmark: Math.floor(startDist / DISTRICT_LENGTH) * DISTRICT_LENGTH + 30 + (startDist % DISTRICT_LENGTH > 30 ? DISTRICT_LENGTH : 0),
    });
  }
  particleSys.clear();
  landingRings.clear();
  ribbonTrail.clear();
  const overStart = startDist >= OVERDRIVE_START;
  Object.assign(G, {
    distance: startDist, bonusScore: 0, speed: runningSpeed(startDist), coins: 0, score: startDist,
    lane: 1, px: 0, py: 0, vy: 0,
    sliding: 0, pendingSlide: false, rollTime: 0, shield: 0, sprint: 0, sprintMax: SPRINT_DURATION, jetDescent: 0,
    jetFlightEnd: 0, nextPowderPos: 0, powderLane: 1, powderStreak: 0, jetSparkT: 0, passSparkT: 0,
    footDustT: 0, footStep: 0,
    magnet: 0, magnetMax: 8, doubleMilk: false, grace: 0,
    objects: [], nextSpawn: startDist + FIRST_ROAD_SECTION, nextConvoy: startDist + FIRST_ROAD_SECTION,
    nextShieldRun: startDist + (overStart ? 240 : FIRST_ROAD_SECTION),
    nextOncoming: Math.max(OVERDRIVE_START + 35, startDist + 45),
    nextRocketAllowed: Math.max(240, startDist + 180), openLane: 0, lastStreetRow: null, roofHint: false,
    truckDeck: [], lastTruckLayout: null,
    particles: [], flyingObstacles: [], shake: 0, deadTimer: 0, airTime: 0, support: 0, surface: null,
    bendX: 0, bendY: 0, camRoll: 0, camSupportY: 0, fovPunch: 0, hitStop: 0, speedPulse: 0, shieldImpact: 0,
    grounded: true, jumping: false, jumpFrom: 0, speedTier: Math.max(0, Math.floor((runningSpeed(startDist) - 13) / 3.5)),
    chaseTime: 0, chaseActive: false, chaseFromStumble: false, chaseDuration: CHASE_DURATION,
    overdriveTriggered: overStart, overdriveHintUntil: 0,
    lastRoofTruck: null, lastAchScore: -1, lastHitType: null, runSettled: false,
    motion: '', motionUntil: 0, capture: null, roofHintUntil: 0,
  });
  AudioSys.setBgmTempo(overStart ? 1.18 : 1);
  chaseTrail.length = 0;
  chaseTrail.push({ distance: startDist, x: 0, y: 0 });
  puKey = ''; elPowerbars.innerHTML = '';
  shownOverdrive = !overStart;
  if (elOverdriveBadge) elOverdriveBadge.classList.toggle('hidden', !overStart);
  popupsEl.replaceChildren();
  setCoach('');
  if (player.userData.shieldMesh) player.userData.shieldMesh.visible = false;
  G.skyCloudBlend = 0;
  skyCloudCorridor.update(0, 0);
  syncPlayerCosmetics();
}
function applyRunLoadout() {
  if (typeof ShopSys === 'undefined' || typeof ShopSys.consumeRunLoadout !== 'function') return;
  const loadout = ShopSys.consumeRunLoadout();
  if (!loadout) return;
  if (loadout.doubleMilk) {
    G.doubleMilk = true;
  }
  if (loadout.startShield) {
    G.shield = (G.shield || 0) + 1;
    achRecord('power', { type: 'shield', stack: G.shield, tripleBuff: G.shield > 0 && G.sprint > 0 && G.magnet > 0 });
  }
  if (loadout.startRocket) {
    triggerRocketFlight(true);
  }
  if (loadout.consumedNames && loadout.consumedNames.length > 0) {
    setTimeout(() => {
      if (G.state === 'play') popup(`出战生效: ${loadout.consumedNames.join(' ')}`, '#8ef0c6');
    }, 320);
  }
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
  if (G.state === 'menu') { startIntro(); return; }
  AudioSys.init(); AudioSys.click(); AudioSys.duckBGM(false);
  bootBackdrop.hidden = true;
  attachActorsTo(scene);
  const fromHome = G.state === 'menu';
  resetGame(fromHome);
  G.state = 'play';
  achRecord('runStart', { distance: 0 });
  chaser.position.set(0, 0, 8);
  startChase(false);
  applyRunLoadout();
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
/* ---------- 开场动画：放学被豆包老师抓作业，奶娃转身开跑 ---------- */
const INTRO_LENGTH = 6.6;
const INTRO_RUN_FROM = 5.0;      // 世界开始滚动、奶娃加速
const INTRO_CHASE_GAP = 3.6;     // 与 updateChaser 进场完成时的距离一致
const introEl = document.getElementById('intro');
const introCard = introEl.querySelector('.intro-card');
const introLine = introEl.querySelector('.intro-line');
const introSpeaker = introEl.querySelector('.intro-speaker');
const introText = introEl.querySelector('.intro-text');
const introSfx = introEl.querySelector('.intro-sfx');
const introFlash = introEl.querySelector('.intro-flash');
const introSkip = document.getElementById('btn-intro-skip');
const intro = {
  t: 0, next: 0, portrait: false,
  n0: new THREE.Vector3(), d0: new THREE.Vector3(),
  nPos: new THREE.Vector3(), dPos: new THREE.Vector3(), nRot: 0, dRot: 0,
  nAction: 'Idle', nSpeed: 1, dAction: 'Idle', dSpeed: 1,
  camPos: new THREE.Vector3(), camLook: new THREE.Vector3(), fov: 49,
};
const iA = new THREE.Vector3(), iB = new THREE.Vector3(), iC = new THREE.Vector3(), iD = new THREE.Vector3();
function retrigger(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function introSay(who, text) {
  if (!text) { introLine.classList.remove('on'); return; }
  introLine.dataset.who = who;
  introSpeaker.textContent = who === 'teacher' ? '豆包老师' : '奶娃';
  introText.textContent = text;
  retrigger(introLine, 'on');
}
function introPop(text, kind = '') {
  introSfx.textContent = text;
  introSfx.className = 'intro-sfx ' + kind;
  retrigger(introSfx, 'on');
}
function introCut() { retrigger(introFlash, 'on'); }
const INTRO_EVENTS = [
  [0.0, () => { introEl.classList.add('bars-in'); introCard.classList.add('on'); }],
  [0.35, () => { introSay('naiwa', '下课啦～豆包老师拜拜！'); AudioSys.chime(988, 0.18, 0.14); AudioSys.chime(1319, 0.3, 0.12, 0.14); }],
  [1.45, () => introCard.classList.remove('on')],
  [1.7, () => { introCut(); introSay('teacher', '站——住！今天的作业呢？'); AudioSys.tone(392, 0.16, 'square', 0.1, 330); }],
  [2.55, () => { introPop('交 作 业 ！', 'small alarm'); AudioSys.tone(660, 0.12, 'square', 0.1, 880); }],
  [3.1, () => { introCut(); introSay('naiwa', '作、作业？！'); introPop('?!'); retrigger(introEl, 'shake'); AudioSys.eh(); }],
  [3.75, () => introSay('naiwa', shopSkins().pass ? '我有免交作业金牌，溜了溜了——！' : '溜了溜了——！')],
  [4.45, () => { introSay('', ''); introPop('豆包老师追来了！', 'small'); AudioSys.say('豆包老师来了!', 0); AudioSys.dash(); }],
  [5.55, () => { introPop('预备——', 'small'); AudioSys.duckBGM(false); }],
  [6.0, () => { introEl.classList.add('bars-out'); }],
];
const easeIO = x => x * x * x * (x * (x * 6 - 15) + 10);
function sstep(t, a, b) { return THREE.MathUtils.smoothstep(t, a, b); }
function introPlayCamera(pos, look) {
  // 与 updateEffects 中追逐镜头（px=0, py=0, chaseFrame=1）完全一致，保证交接无跳变。
  const portrait = camera.aspect < 0.85 ? 2.2 : 0;
  pos.set(1, 3.4 + portrait * 0.35 + 0.55, 7.2 + portrait + 0.85);
  look.set(0.1, 1.5 - 0.58, -9 + 2.5);
}
function introMenuCamera(pos, look) {
  const narrow = camera.aspect < 0.95;
  pos.set(narrow ? 0 : -0.52, narrow ? 3.57 : 2.88, narrow ? 8.1 : 6.8);
  look.set(narrow ? 0 : -0.22, narrow ? 2.02 : 1.55, -7.7);
}
function introShot(t, pos, look) {
  const { n0, d0, portrait } = intro;
  const far = portrait ? 1.35 : 1;
  if (t < 1.7) {
    // 镜头从首页机位推向两人
    const k = easeIO(sstep(t, 0, 1.7));
    introMenuCamera(iA, iB);
    iC.addVectors(n0, d0).multiplyScalar(0.5);
    pos.lerpVectors(iA, iD.set(iC.x - 0.35, 1.85, iC.z + 4.3 * far), k);
    look.lerpVectors(iB, iD.set(iC.x, 1.2, iC.z), k);
    intro.fov = THREE.MathUtils.lerp(portrait ? 55 : 49, 44, k);
  } else if (t < 3.1) {
    // 豆包老师近景，缓推
    const k = sstep(t, 1.7, 3.1);
    pos.set(d0.x - (0.85 - 0.25 * k) * far, 1.82, d0.z + (2.95 - 0.7 * k) * far);
    look.set(d0.x - 0.1, 1.6, d0.z);
    intro.fov = 40;
  } else if (t < 4.4) {
    // 奶娃近景：吓一跳
    const k = sstep(t, 3.1, 4.4);
    const jolt = t < 3.45 ? (3.45 - t) * 0.25 : 0;
    pos.set(n0.x + (0.75 - 0.2 * k) * far + rand(-1, 1) * jolt, 1.5 + rand(-1, 1) * jolt, n0.z + (3.5 - 0.5 * k) * far);
    look.set(n0.x, 1.3, n0.z);
    intro.fov = 40;
  } else {
    // 镜头甩到奶娃身后，落在跑酷机位
    const k = easeIO(sstep(t, 4.4, INTRO_LENGTH));
    iA.set(n0.x + 0.55 * far, 1.5, n0.z + 3.0 * far);
    iB.set(n0.x, 1.3, n0.z);
    introPlayCamera(iC, iD);
    // 中途抬高，避免从豆包老师身体中穿过
    pos.lerpVectors(iA, iC, k);
    pos.y += Math.sin(k * Math.PI) * 1.1;
    look.lerpVectors(iB, iD, k);
    intro.fov = THREE.MathUtils.lerp(40, 62, k);
  }
}
function introPose(t) {
  const { n0, d0 } = intro;
  // 奶娃：挥手 → 吓一跳 → 转身跑进中间车道
  intro.nPos.lerpVectors(n0, iA.set(0, 0, 0), easeIO(sstep(t, 4.4, 5.5)));
  intro.nRot = THREE.MathUtils.lerp(Math.PI + 0.23, Math.PI * 2, easeIO(sstep(t, 4.4, 4.95)));
  intro.nAction = t < 0.3 ? 'Idle' : t < 1.75 ? 'Greeting' : t < 3.1 ? 'Idle'
    : t < 3.7 ? 'Stumble' : t < 4.4 ? 'Idle' : 'Run';
  intro.nSpeed = intro.nAction === 'Run' ? THREE.MathUtils.lerp(0.85, 1, sstep(t, INTRO_RUN_FROM, INTRO_LENGTH)) : 1;
  // 豆包老师：招手 → 伸手要作业 → 追到奶娃身后
  const dk = easeIO(sstep(t, 4.55, 5.75));
  intro.dPos.lerpVectors(d0, iB.set(0, 0, INTRO_CHASE_GAP), dk);
  const heading = Math.atan2(-d0.x, INTRO_CHASE_GAP - d0.z);
  intro.dRot = t < 4.55 ? -0.34
    : t < 5.45 ? THREE.MathUtils.lerp(-0.34, heading, sstep(t, 4.55, 4.85))
    : THREE.MathUtils.lerp(heading, -Math.PI, sstep(t, 5.45, 5.95));
  intro.dAction = t < 1.7 ? 'Idle' : t < 2.5 ? 'Greeting' : t < 3.3 ? 'Grab' : t < 4.55 ? 'Idle' : 'Run';
  intro.dSpeed = intro.dAction === 'Run' ? 1.15 : 1;
}
function startIntro() {
  AudioSys.init(); AudioSys.click(); AudioSys.duckBGM(true);
  bootBackdrop.hidden = true;
  attachActorsTo(scene);
  player.userData.aura.visible = false;
  player.userData.spin.rotation.x = 0;
  resetGame(true);
  G.state = 'intro';
  intro.t = 0; intro.next = 0;
  intro.portrait = camera.aspect < 0.95;
  intro.n0.set(intro.portrait ? -0.96 : 1.75, 0, 0.63);
  intro.d0.set(intro.portrait ? 0.98 : 3.36, 0, intro.portrait ? 0.04 : -0.72);
  introPose(0);
  home.classList.add('leaving');
  setTimeout(() => { if (G.state !== 'menu') home.classList.add('hidden'); }, 220);
  document.getElementById('gameover').classList.add('hidden');
  document.getElementById('pause').classList.add('hidden');
  introEl.className = '';
  introLine.classList.remove('on');
  introCard.classList.remove('on');
  introSfx.className = 'intro-sfx';
  if (homeStage) introCut();
  introSkip.focus({ preventScroll: true });
  ensureWorld();
  updateWorldMeshes(0);
}
function updateIntro(dt) {
  intro.t = Math.min(INTRO_LENGTH, intro.t + dt);
  const t = intro.t;
  while (intro.next < INTRO_EVENTS.length && INTRO_EVENTS[intro.next][0] <= t) INTRO_EVENTS[intro.next++][1]();
  introPose(t);
  introShot(t, intro.camPos, intro.camLook);
  // 最后 1.6 秒世界从静止平滑加速到开局速度
  const v = 13 * sstep(t, INTRO_RUN_FROM, INTRO_LENGTH);
  G.speed = 13;
  G.distance += v * dt;
  ensureWorld();
  updateWorldMeshes(dt);
  updatePlayerMesh(dt);
  updateEffects(dt);
  if (t >= INTRO_LENGTH) finishIntro(false);
}
function finishIntro(skipped) {
  if (G.state !== 'intro') return;
  while (intro.next < INTRO_EVENTS.length) intro.next++;
  if (skipped) {
    introCut();
    AudioSys.duckBGM(false);
    AudioSys.stopVoice();
  }
  intro.t = INTRO_LENGTH;
  introPose(INTRO_LENGTH);
  G.state = 'play';
  G.px = 0; G.lane = 1;
  achRecord('runStart', { distance: G.distance });
  if (skipped) achRecord('skipCutscene');
  chaser.position.set(0, 0, INTRO_CHASE_GAP);
  startChase(false);
  G.chaseTime = 1.2; // 豆包老师已完成进场，直接贴身追赶
  applyRunLoadout();
  introEl.classList.add('bars-out');
  introLine.classList.remove('on');
  setTimeout(() => { if (G.state !== 'intro') introEl.classList.add('hidden'); }, skipped ? 340 : 560);
  const hud = document.getElementById('hud');
  hud.classList.remove('hidden');
  retrigger(hud, 'hud-in');
  updateCoach();
  AudioSys.say('奶娃快跑,冲鸭!', 0); popup('冲鸭!', '#ffd93f');
  updateHUD();
}
/* ---------- 被抓过场：与开场共用 #intro 遮罩 ---------- */
const CAPTURE_EVENTS = [
  [0.15, () => {
    introEl.className = '';
    introLine.classList.remove('on');
    introCard.classList.remove('on');
    introSfx.className = 'intro-sfx';
    void introEl.offsetWidth;
    introEl.classList.add('bars-in');
  }],
  [CAPTURE_CONTACT, () => {
    introPop('抓 到 了 ！', 'alarm'); retrigger(introEl, 'shake');
    AudioSys.tone(196, 0.3, 'square', 0.12, 98); AudioSys.noise(0.18, 0.12, 500);
  }],
  [CAPTURE_LENGTH, () => {
    introCut(); introSay('teacher', '抓到你了！作业呢？');
    AudioSys.tone(392, 0.16, 'square', 0.1, 330);
  }],
  [CAPTURE_LIFT, () => {
    introCut(); introSay('naiwa', '我、我明天一定交…');
    AudioSys.tone(523, 0.5, 'sine', 0.1, 392, 0, 6);
  }],
  [CAPTURE_WALK, () => {
    introCut(); introSay('', ''); introPop('补 作 业 去 ！', 'small');
    AudioSys.tone(330, 0.22, 'triangle', 0.1, 262); AudioSys.tone(262, 0.4, 'triangle', 0.1, 196, 0.22);
  }],
  [CAPTURE_TOTAL - 0.5, () => introEl.classList.add('bars-out')],
];
function runCaptureEvents(elapsed) {
  const c = G.capture;
  while (c.next < CAPTURE_EVENTS.length && CAPTURE_EVENTS[c.next][0] <= elapsed) CAPTURE_EVENTS[c.next++][1]();
}
function hideCutsceneOverlay() {
  introEl.classList.add('hidden');
  introLine.classList.remove('on');
  introSfx.className = 'intro-sfx';
}
function skipCapture() {
  if (G.state !== 'dying') return;
  achRecord('skipCutscene');
  G.deadTimer = 0;
  showGameOver();
}
introSkip.addEventListener('click', () => {
  if (G.state === 'intro') finishIntro(true);
  else skipCapture();
});

function togglePause(auto = false) {
  if (G.state === 'play') {
    G.state = 'pause';
    if (!auto) achRecord('pause');
    randomizePause();
    setCoach('');
    document.getElementById('pause').classList.remove('hidden');
    document.getElementById('btn-resume').focus({ preventScroll: true });
    AudioSys.duckBGM(true);
  } else if (G.state === 'pause') {
    if (typeof AchievementSys !== 'undefined' && AchievementSys.isModalOpen()) AchievementSys.closeModal();
    G.state = 'play';
    document.getElementById('pause').classList.add('hidden');
    updateCoach();
    AudioSys.duckBGM(false);
  }
}
function toggleMute() {
  AudioSys.toggleMute();
}
function randomizeMenu() {
  document.getElementById('menu-tip').textContent = pick(MENU_TIPS);
}
function randomizePause() {
  document.getElementById('pause-title').textContent = pick(PAUSE_TITLES);
  document.getElementById('pause-quip').textContent = pick(PAUSE_QUIPS);
}
function showMenu() {
  achRecord('runAbort');
  if (typeof AchievementSys !== 'undefined' && AchievementSys.isModalOpen()) AchievementSys.closeModal();
  if (typeof ShopSys !== 'undefined') {
    if (ShopSys.isModalOpen()) ShopSys.closeModal();
    ShopSys.syncEntryBadges();
  }
  resetGame();
  G.state = 'menu';
  AudioSys.setBgmTempo(1);
  if (homeStage) {
    attachActorsTo(homeStage.scene);
    homeStage.reset();
  }
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
  if (k === 'm' || k === 'M') { toggleMute(); return; }
  if (typeof AchievementSys !== 'undefined' && AchievementSys.isModalOpen()) {
    if (k === 'Escape' && !e.repeat) { e.preventDefault(); AchievementSys.handleEscape(); }
    return;
  }
  if (typeof ShopSys !== 'undefined' && ShopSys.isModalOpen()) {
    if (k === 'Escape' && !e.repeat) { e.preventDefault(); ShopSys.handleEscape(); }
    return;
  }
  if (e.target instanceof HTMLInputElement) return;
  const confirm = k === 'Enter' || k === ' ';
  if (confirm && G.state !== 'play' && e.target instanceof HTMLButtonElement) return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) e.preventDefault();
  if (G.state === 'intro') {
    if ((confirm || k === 'Escape') && !e.repeat) { e.preventDefault(); finishIntro(true); }
    return;
  }
  if (G.state === 'dying') {
    // 刚被抓的 0.6 秒内不响应，避免玩家连按跳跃时误跳过。
    if ((confirm || k === 'Escape') && !e.repeat && captureElapsed() > 0.6) { e.preventDefault(); skipCapture(); }
    return;
  }
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
window.addEventListener('blur', () => { if (G.state === 'play') togglePause(true); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.state === 'play') togglePause(true);
});
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-restart').addEventListener('click', startGame);
document.getElementById('btn-menu').addEventListener('click', showMenu);
document.getElementById('btn-pause-menu').addEventListener('click', pauseToMenu);
document.getElementById('btn-resume').addEventListener('click', () => togglePause(false));
document.getElementById('btn-pause').addEventListener('click', () => togglePause(false));
document.getElementById('best-menu').textContent = G.best;
randomizeMenu();

/* ---------- resize & loop ---------- */
function resize() {
  const w = window.innerWidth || 900, h = window.innerHeight || 640;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, handheld ? 1.3 : 1.5,
    Math.max(0.75, Math.sqrt(1250000 / (w * h))));
  if (pixelRatio !== renderer.getPixelRatio()) renderer.setPixelRatio(pixelRatio);
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (homeStage) homeStage.resize(w, h);
  needsRender = true;
}
window.addEventListener('resize', resize);
resize();

let lastTime = performance.now();
let artLoadScheduled = false;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (G.state === 'menu' && homeStage) {
    G.t += dt;
    ensureWorld();
    Models.setWorldBend(0, 0, homeStage.camera);
    updateCharacterRims(dt, true);
    speedLines.mesh.visible = false;
    homeStage.update(dt, { player, chaser, runnerRig, chaserRig, chaserBackup, actorShadows });
    renderer.render(homeStage.scene, homeStage.camera);
    needsRender = false;
  } else {
    if (G.state !== 'pause' && G.state !== 'over') {
      update(dt);
      const chaserSurface = updateChaser(dt);
      updateActorShadows(chaserSurface);
      needsRender = true;
    }
    if (needsRender) {
      Models.setWorldBend(G.bendX, G.bendY, camera);
      renderer.render(scene, camera);
      needsRender = false;
    }
  }
  if (!artLoadScheduled) {
    artLoadScheduled = true;
    requestAnimationFrame(() => setTimeout(loadGameArt, 0));
  }
}
requestAnimationFrame(loop);
document.documentElement.classList.add('game-mounted');
