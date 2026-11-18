/* 奶娃快跑 · three.js 3D 主逻辑（地铁跑酷式 · 大众化热梗） */
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.id = 'game';
stage.insertBefore(renderer.domElement, stage.firstChild);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xffe9f4, 60, 170);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

const LANE_X = [-2.4, 0, 2.4];
const GRAVITY = 26, JUMP_V = 8.4;
const SIGNS = ['卷王大厦', '摸鱼中心', '画饼集团', '早八酒店', '666超市', 'EMO网吧', '内卷工厂', '躺平公寓', '干饭食堂', '奶蛙博物馆'];
const B_COLORS = [0xffb3c9, 0xb3e0ff, 0xffe0a3, 0xc9b3ff, 0xb3ffd9, 0xffd9b3];
const DISTRICTS = [
  { name: '奶娃大学城', signs: ['早八教学楼', '图书馆', '干饭食堂', '卷王自习室', '青春宿舍'], colors: [0xffd9b3, 0xb3e0ff, 0xffe0a3, 0xffb3c9] },
  { name: '奶昔商业街', signs: ['奶昔补给', '666超市', '快乐星球', '奶茶研究所', '来财商行'], colors: [0xffb3c9, 0xc9b3ff, 0xffd0a3, 0xb3ffd9] },
  { name: '躺平公园', signs: ['摸鱼中心', '躺平公寓', '爱你老己', '慢生活馆'], colors: [0xb3ffd9, 0xffe0a3, 0xb3e0ff, 0xffd9b3] },
];
const districtAt = pos => DISTRICTS[Math.floor(Math.max(0, pos) / 220) % DISTRICTS.length];
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
const MENU_TAGLINES = [
  '地铁跑酷？不，是奶跑酷！',
  '如何呢，又能怎？先跑为敬！',
  '牌没有问题，跑就完了！',
  '助我破鼎，从第一米开始！',
  '敬自己一杯，奶娃先干为敬！',
  '过程基础，结果不基础！',
  '我去，不早说，开跑！',
  '真没空陪你闹了，开冲！',
  '活人感拉满的奶娃，出发！',
  '来吧，让我看看你的走位！',
];
const START_LABELS = ['开跑！', '冲鸭！', '助我破鼎！', '整活开始！', '开冲！', '先跑为敬！'];
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
/* 货车几何：roofH 车顶高度；long 加长版车顶更长，能跑更久 */
const TRUCK = { roofH: 2.3, laneTol: 0.95, roofLaneTol: 1.12 };
const TRUCK_TYPES = {
  truck: { half: 2.3, ramp: false, long: false },
  ramptruck: { half: 2.3, ramp: true, long: false },
  longtruck: { half: 6.0, ramp: false, long: true },
  longramptruck: { half: 6.0, ramp: true, long: true },
};
const AIR_FLIP_DUR = 0.62; // 一次跳跃的滞空时间，正好转满一圈

const G = {
  state: 'menu', t: 0, distance: 0, speed: 13, coins: 0, score: 0,
  lane: 1, px: 0, py: 0, vy: 0, sliding: 0, pendingSlide: false,
  shield: 0, sprint: 0, magnet: 0, grace: 0,
  objects: [], buildings: [], nextSpawn: 40, nextBuilding: 5, nextLamp: 20, nextGantry: 60, nextScenery: 8, nextCrosswalk: 95,
  particles: [], shake: 0, deadTimer: 0, phase: 0, airTime: 0, support: 0, jumping: false, speedTier: 0,
  chaseTime: 0, chaseLane: 1, chaseActive: false,
  best: +(localStorage.getItem('naiwa-best') || 0),
};

/* ---------- 场景搭建 ---------- */
scene.add(Models.skyDome());
const sun = Models.sun(); sun.position.set(46, 52, -170); scene.add(sun);
const city = Models.city(); city.position.set(0, 0, -175); scene.add(city);
const clouds = [];
for (let i = 0; i < 8; i++) {
  const c = Models.cloud();
  c.position.set(rand(-60, 60), rand(20, 40), rand(-140, -60));
  c.scale.setScalar(rand(1.5, 3));
  scene.add(c); clouds.push(c);
}
const hemi = new THREE.HemisphereLight(0xbfe6ff, 0x8fd66a, 0.95); scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.85);
dir.position.set(18, 36, 14);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
dir.shadow.camera.left = -26; dir.shadow.camera.right = 26;
dir.shadow.camera.top = 30; dir.shadow.camera.bottom = -40;
dir.shadow.camera.near = 1; dir.shadow.camera.far = 120;
dir.shadow.bias = -0.0005;
dir.target.position.set(0, 0, -16);
scene.add(dir, dir.target);
const fill = new THREE.DirectionalLight(0xfff2d9, 0.55);
fill.position.set(-6, 10, -24);
scene.add(fill);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), Models.L(0x8fd66a));
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
  const curb = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 400), Models.L(0xe8e6e0));
  curb.position.set(sx, 0.08, -160); curb.receiveShadow = true; scene.add(curb);
  const side = Math.sign(sx);
  const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 400), new THREE.MeshLambertMaterial({ map: sidewalkTex }));
  sidewalk.position.set(side * 5.2, 0.03, -160); sidewalk.receiveShadow = true; scene.add(sidewalk);
  const outerCurb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 400), Models.L(0xc4b9a9));
  outerCurb.position.set(side * 6.5, 0.05, -160); scene.add(outerCurb);
}
const posts = [];
for (let i = 0; i < 54; i++) { const p = Models.post(); p.userData.i = i; scene.add(p); posts.push(p); }

const player = Models.naiwa(); scene.add(player);

/* ---------- 豆包老师：菜单亮相 + 开局/受击后追捕 ---------- */
let chaser = null;
new THREE.GLTFLoader().load('assets/49409c35-2e43-46f8-87f4-f85cf8df7d0a.glb', (gltf) => {
  chaser = gltf.scene;
  const b = new THREE.Box3().setFromObject(chaser), size = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const s = 2.15 / size.y;
  chaser.scale.setScalar(s);
  chaser.position.set(-c.x * s, -b.min.y * s, -c.z * s);
  // 模型面朝 +z（镜头/玩家方向），保持该朝向
  chaser.traverse(o => { if (o.isMesh) { o.castShadow = true; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) if (m.map) m.map.encoding = THREE.LinearEncoding; } });
  scene.add(chaser);
}, undefined, err => console.error('豆包老师模型加载失败', err));
function startChase() { G.chaseActive = true; G.chaseTime = 0; G.chaseLane = pick([0, 1, 2]); }
function updateChaser(dt) {
  if (!chaser) return;
  if (G.state === 'menu') {
    chaser.visible = true;
    chaser.position.set(1.85, Math.abs(Math.sin(G.t * 4)) * 0.06, 1.1);
    chaser.rotation.set(0, -0.28, Math.sin(G.t * 4) * 0.025);
    chaser.scale.y = 1 + Math.sin(G.t * 4) * 0.025;
    return;
  }
  if (!G.chaseActive || (G.state !== 'play' && G.state !== 'dying')) { chaser.visible = false; return; }
  G.chaseTime += dt;
  chaser.visible = true;
  // 前 1.2 秒从镜头下方追入；1.2～4 秒跟跑并换道；甩开/保护结束后退出
  const t = G.chaseTime;
  const entering = Math.min(1, t / 1.2);
  const exit = t > 4 ? Math.min(1, (t - 4) / 0.8) : 0;
  const z = 8 - entering * 5 + exit * 5;
  if (t > 1.8 && Math.floor(t * 0.55) !== Math.floor((t - dt) * 0.55)) G.chaseLane = pick([0, 1, 2]);
  const targetX = G.px * 0.55 + LANE_X[G.chaseLane] * 0.45;
  chaser.position.x += (targetX - chaser.position.x) * Math.min(1, dt * 3.5);
  chaser.position.z = z;
  chaser.position.y = Math.abs(Math.sin(G.t * 13)) * 0.13;
  chaser.rotation.z = Math.sin(G.t * 13) * 0.075;
  chaser.rotation.x = -0.08;
  chaser.scale.y = 1 + Math.sin(G.t * 13) * 0.035;
  if (t > 4.8) { G.chaseActive = false; chaser.visible = false; }
}

/* ---------- 异步加载 GLB 主角模型，替换程序化奶娃 ---------- */
new THREE.GLTFLoader().load('assets/tripo_convert_820779b7-0c09-4c76-8cd6-a7156d9b61d3.glb', (gltf) => {
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const s = 1.9 / size.y; // 与原奶娃等高
  const wrap = new THREE.Group(); // 果冻缩放作用于这个壳（原点在脚底）
  const pivot = new THREE.Group(); // 空翻/滑铲旋转轴：身体中心（修"着力点"错误）
  model.scale.setScalar(s);
  // 模型质心在 X 方向并不居中（尾巴向一侧伸出）；按包围盒中心校准到车道中央
  model.position.set(-center.x * s, -box.min.y * s - 0.95, -center.z * s);
  // Tripo 该模型原生就面朝 -z（前进方向），不再旋转
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { if (m.map) { m.map.encoding = THREE.LinearEncoding; } } } });
  pivot.position.y = 0.95;
  pivot.add(model); wrap.add(pivot);
  player.children.forEach(ch => { ch.visible = false; }); // 隐藏程序化身体（护盾/光环/磁铁图标每帧会自行恢复显示）
  player.userData.spin = pivot; // 空中翻滚改绑到新模型（绕身体中心）
  player.userData.glbModel = wrap;
  player.add(wrap);
}, undefined, err => console.error('GLB 主角加载失败，继续用原奶娃', err));

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

/* ---------- 赛道生成 ---------- */
function addObs(type, laneX, pos) {
  G.objects.push({ kind: 'obs', type, wx: laneX, trackPos: pos, resolved: false, seed: Math.random() * 10, mesh: acquire('obs', type) });
}
function addCoinRow(laneX, pos, n = 4, y = 0) {
  for (let i = 0; i < n; i++)
    G.objects.push({ kind: 'coin', type: 'coin', wx: laneX, trackPos: pos + i * 2.4, baseY: y, resolved: false, seed: Math.random() * 10, mesh: acquire('coin', 'coin') });
}
function addPower(laneX, pos) {
  const type = pick(['shield', 'sprint', 'magnet']);
  G.objects.push({ kind: 'power', type, wx: laneX, trackPos: pos, resolved: false, seed: Math.random() * 10, mesh: acquire('power', type) });
}
/* 梗道具：篮球（鸡你太美） */
function addMeme(laneX, pos) {
  G.objects.push({ kind: 'meme', type: 'jntm', wx: laneX, trackPos: pos, resolved: false, baseY: 0, seed: Math.random() * 10, mesh: acquire('meme', 'jntm') });
}
/* 当前脚下可站立高度：地面 = 0；带斜坡货车 = 斜坡/车顶；平顶货车只有人已在车顶高度时才能落上去 */
function getSupport() {
  let h = 0;
  const roofEligible = G.py >= TRUCK.roofH - 0.2;
  for (const o of G.objects) {
    const T = TRUCK_TYPES[o.type];
    if (!T || o.resolved) continue;
    const rel = o.trackPos - G.distance;
    const roofNear = T.half + 0.25;
    const back = -(T.half + 1.4);
    if (T.ramp) {
      if (Math.abs(o.wx - G.px) > TRUCK.laneTol) continue;
      const rampFar = T.half + 3.05;
      if (rel > rampFar || rel < back) continue;
      const sh = rel > roofNear
        ? (rampFar - rel) / (rampFar - roofNear) * TRUCK.roofH
        : TRUCK.roofH;
      if (sh > h) h = sh;
    } else if (roofEligible && Math.abs(o.wx - G.px) <= TRUCK.roofLaneTol && rel <= roofNear && rel >= back) {
      // 平顶货车：从并排货车车顶横向滑过来时，可以落到它车顶上，而不是直接判撞车
      if (TRUCK.roofH > h) h = TRUCK.roofH;
    }
  }
  return h;
}
function roofCoins(lane, pos, type) {
  const T = TRUCK_TYPES[type];
  if (T.long) addCoinRow(lane, pos - 4, 4, TRUCK.roofH + 0.05);
  else addCoinRow(lane, pos - 2.4, 3, TRUCK.roofH + 0.05);
}
function spawnPattern(pos) {
  const lanes = [...LANE_X].sort(() => Math.random() - 0.5);
  const r = Math.random();
  const low = () => pick(['alarm', 'gang']);
  const full = () => pick(['ddl', 'emo', 'phone']);
  if (r < 0.12) { addObs(low(), lanes[0], pos); addCoinRow(lanes[1], pos); }
  else if (r < 0.25) { addObs(full(), lanes[0], pos); addObs(full(), lanes[1], pos); if (Math.random() < 0.25) addPower(lanes[2], pos + 4); else addCoinRow(lanes[2], pos); }
  else if (r < 0.38) { addObs('bing', lanes[0], pos); if (Math.random() < 0.4) addObs('bing', lanes[1], pos); addCoinRow(lanes[2], pos); }
  else if (r < 0.50) { for (const l of LANE_X) addObs(low(), l, pos + rand(-0.5, 0.5)); }
  else if (r < 0.60) { addObs(low(), lanes[0], pos); addObs('bing', lanes[1], pos); addObs(full(), lanes[2], pos); }
  else if (r < 0.68) { addCoinRow(lanes[0], pos, 5); addCoinRow(lanes[1], pos + 6, 5); addCoinRow(lanes[2], pos + 12, 5); }
  else if (r < 0.74) { if (Math.random() < 0.45) addMeme(lanes[0], pos); else addPower(lanes[0], pos); addObs(low(), lanes[1], pos + 2); }
  else if (r < 0.88) {
    // 货车：绕开 or 冲上斜坡；加长车更常出现，能跑更久的车顶
    const t = pick(['truck', 'longtruck', 'ramptruck', 'longramptruck', 'longramptruck', 'longramptruck']);
    addObs(t, lanes[0], pos);
    if (TRUCK_TYPES[t].ramp) roofCoins(lanes[0], pos, t);
    addCoinRow(lanes[1], pos - 2, 4);
    if (Math.random() < 0.45) addObs(full(), lanes[2], pos + 2);
  }
  else if (r < 0.94) {
    // 加长货车车队：中间车道给一条长长的车顶跑道
    addObs('longramptruck', lanes[0], pos);
    roofCoins(lanes[0], pos, 'longramptruck');
    if (Math.random() < 0.6) addObs('longtruck', lanes[2], pos + 1);
  }
  else {
    // 双货车夹击：留一条生路
    addObs('truck', lanes[0], pos);
    addObs('ramptruck', lanes[1], pos);
    roofCoins(lanes[1], pos, 'ramptruck');
  }
}
function addScenery(mesh, x, pos, rotation = 0, y = 0.1) {
  mesh.position.set(x, y, 0); mesh.rotation.y = rotation;
  scene.add(mesh);
  G.buildings.push({ wx: x, trackPos: pos, mesh });
}
function spawnBuildings(pos) {
  const district = districtAt(pos), zone = DISTRICTS.indexOf(district);
  for (const side of [-1, 1]) {
    if (Math.random() < (zone === 2 ? 0.48 : 0.82)) {
      const w = rand(3.4, 5.2), h = zone === 1 ? rand(6, 13) : rand(7, 16);
      const m = Models.building(pick(district.signs), pick(district.colors), w, h);
      addScenery(m, side * rand(8.8, 12.2), pos + rand(0, 5), 0, 0);
    }
  }
}
function spawnScenery(pos) {
  const zone = Math.floor(Math.max(0, pos) / 220) % DISTRICTS.length;
  const index = Math.floor(pos / 14);
  for (const side of [-1, 1]) {
    const facing = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    // 公交站穿插出现，其余位置按区域使用不同组合
    if (index > 0 && index % 13 === (side < 0 ? 3 : 9)) {
      addScenery(Models.busStop(), side * 5.35, pos, facing);
      continue;
    }
    if (zone === 2) {
      const tree = Models.tree(index % 4 === 0);
      tree.scale.setScalar(rand(0.85, 1.18));
      addScenery(tree, side * rand(5.5, 6.1), pos);
      if (index % 3 === 0) addScenery(Models.flowerBed(), side * 4.85, pos + 3, facing);
      if (index % 4 === 1) addScenery(Models.bench(), side * 5.45, pos + 4, -facing);
    } else if (zone === 0) {
      if (index % 2 === 0) addScenery(Models.tree(index % 6 === 0), side * 5.65, pos);
      else addScenery(Models.flowerBed(), side * 5.0, pos, facing);
      if (index % 5 === 2) addScenery(Models.bench(), side * 5.5, pos + 4, -facing);
    } else {
      if (index % 7 === 2) addScenery(Models.stall(), side * 6.0, pos, facing);
      else if (index % 3 === 0) addScenery(Models.tree(false), side * 5.75, pos);
      else addScenery(Models.flowerBed(), side * 4.95, pos, facing);
    }
  }
}
function disposeObject(root) {
  scene.remove(root);
  root.traverse(n => {
    if (n.geometry) n.geometry.dispose();
    const materials = n.material ? (Array.isArray(n.material) ? n.material : [n.material]) : [];
    for (const m of materials) { if (m.map) m.map.dispose(); m.dispose(); }
  });
}
function ensureWorld() {
  while (G.nextSpawn < G.distance + 150) { spawnPattern(G.nextSpawn); G.nextSpawn += Math.max(18, G.speed * rand(0.8, 1.2)); }
  // 建筑间距减半，左右两侧密度约为原来的两倍
  while (G.nextBuilding < G.distance + 150) { spawnBuildings(G.nextBuilding); G.nextBuilding += rand(6, 9.5); }
  while (G.nextScenery < G.distance + 150) { spawnScenery(G.nextScenery); G.nextScenery += 14; }
  while (G.nextCrosswalk < G.distance + 150) {
    addScenery(Models.crosswalk(), 0, G.nextCrosswalk, 0, 0.045);
    G.nextCrosswalk += 130;
  }
  while (G.nextLamp < G.distance + 150) {
    const side = (Math.floor(G.nextLamp / 16) % 2) ? 1 : -1;
    const m = Models.lamp(); m.position.set(side * 5.2, 0, 0); m.rotation.y = side < 0 ? 0 : Math.PI;
    scene.add(m);
    G.buildings.push({ wx: side * 5.2, trackPos: G.nextLamp, mesh: m });
    G.nextLamp += 16;
  }
  while (G.nextGantry < G.distance + 150) {
    const district = districtAt(G.nextGantry);
    const m = Models.gantry(pick([district.name, '奶娃快跑', '加油奥利给', '相信光', '冲鸭', '666']));
    scene.add(m);
    G.buildings.push({ wx: 0, trackPos: G.nextGantry, mesh: m });
    G.nextGantry += 50;
  }
  G.objects = G.objects.filter(o => {
    if (o.trackPos - G.distance > -8) return true;
    release(o); return false;
  });
  G.buildings = G.buildings.filter(b => {
    if (b.trackPos - G.distance > -10) return true;
    disposeObject(b.mesh);
    return false;
  });
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

/* ---------- 玩家动作 ---------- */
function moveLane(dir) {
  const next = Math.max(0, Math.min(2, G.lane + dir));
  if (next === G.lane) return;
  G.lane = next;
  if (G.sliding > 0) G.sliding = 0; // 左右滑可取消奶蛋出击，更丝滑
  AudioSys.dash(); AudioSys.fastSay('闪身步!'); popup('闪身步!', '#8fe8ff');
}
function doJump() {
  if (G.vy > 0.01 || G.py > G.support + 0.06) return;
  if (G.sliding > 0) G.sliding = 0; // 跳跃可取消奶蛋出击
  G.vy = JUMP_V; G.py = G.support + 0.001; G.airTime = 0; G.jumping = true;
  AudioSys.jump(); AudioSys.fastSay('中国人能飞'); popup('中国人能飞!', '#ffd93f');
}
function doSlide() {
  if (G.vy > 0.01 || G.py > G.support + 0.06) { G.vy = -24; G.pendingSlide = true; return; }
  if (G.sliding > 0) return;
  G.sliding = 0.75;
  AudioSys.slide(); AudioSys.fastSay('奶蛋出击!'); popup('奶蛋出击!', '#ffd93f');
}

/* ---------- 碰撞与结算 ---------- */
function crash() {
  G.state = 'dying'; G.deadTimer = 1.0; G.shake = 1;
  AudioSys.eh();
  if (Math.random() < 0.5) popup('你干嘛~', '#ff9fcf'); // 梗弹窗保留，音频已移除
  AudioSys.noise(0.3, 0.15, 200); AudioSys.duckBGM(true);
  burst(G.px, 1, 0, 0xff5c5c, 24, 10);
  burst(G.px, 1, 0, 0xffd93f, 12, 8);
}
function showGameOver() {
  G.state = 'over';
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
  if (G.grace > 0) { crash(); return; }
  // 首次受击不结束：障碍爆掉，5 秒闪烁保护，豆包老师重新追捕
  if (o) { o.resolved = true; o.destroyed = true; }
  G.grace = 5; G.shake = 0.7;
  startChase();
  burst(G.px, 1, 0, 0xffb03f, 22, 11);
  burst(G.px, 1.3, 0, 0xff5c5c, 12, 8);
  AudioSys.smash(); AudioSys.say('豆包老师来了!', 0);
  popup('快跑！5 秒内别再撞！', '#ff9fcf');
}
function checkCollisions() {
  for (const o of G.objects) {
    if (o.resolved) continue;
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
      const T = TRUCK_TYPES[o.type];
      if (T && T.ramp) continue; // 带斜坡的货车（普通/加长）可以直接跑上去，不判定碰撞
      if (T && G.py >= TRUCK.roofH - 0.2) continue; // 已在车顶高度：跨过并排平顶货车不判撞车
      const low = o.type === 'alarm' || o.type === 'gang';
      const cleared = (low && G.py > 0.7) || (o.type === 'bing' && G.sliding > 0);
      if (G.sprint > 0 || G.shield > 0 || cleared) {
        o.resolved = true;
        if (!cleared) {
          o.destroyed = true;
          burst(o.wx, 1, 0, 0xffb03f, 16, 9);
          AudioSys.smash();
          if (G.shield > 0 && G.sprint <= 0) { G.shield--; popup(`相信光盾保住! 剩${G.shield}次`, '#8fe8ff'); AudioSys.say('护盾保住了!', 1); }
          else popup('撞飞! 奥利给!', '#ffb03f');
        }
      } else hitObstacle(o);
    }
  }
}

/* ---------- 更新 ---------- */
function update(dt) {
  G.t += dt;
  if (G.state !== 'pause') G.phase += dt * (G.state === 'play' ? G.speed : 8) * 1.15;
  if (G.state === 'menu') { G.distance += 7 * dt; ensureWorld(); updateWorldMeshes(dt); updatePlayerMesh(); updateEffects(dt); return; }
  if (G.state === 'dying') { G.deadTimer -= dt; updateWorldMeshes(dt); updatePlayerMesh(); updateEffects(dt); if (G.deadTimer <= 0) showGameOver(); return; }
  if (G.state !== 'play') { updatePlayerMesh(); return; }

  G.speed = Math.min(13 + G.distance * 0.024, 36);
  const eff = G.speed * (G.sprint > 0 ? 1.55 : 1);
  G.distance += eff * dt;
  G.score = Math.floor(G.distance) + G.coins * 10;
  // 每快 5m/s 弹一次「提速」，让玩家明显感到越跑越快
  const tier = Math.floor((G.speed - 13) / 5);
  if (tier > G.speedTier) {
    G.speedTier = tier;
    if (tier > 0) popup(`提速 x${(G.speed / 13).toFixed(1)}!`, '#ffd93f');
  }
  const targetX = LANE_X[G.lane];
  G.px += (targetX - G.px) * Math.min(1, dt * 11);
  // 垂直物理：地面/斜坡/车顶统一用支撑高度
  const sup = getSupport();
  G.support = sup;
  if (G.vy > 0 || G.py > sup + 0.03) {
    G.vy -= GRAVITY * dt; G.py += G.vy * dt;
    G.airTime += dt;
    if (G.py <= sup + 0.03 && G.vy <= 0) {
      const wasJump = G.jumping;
      G.py = sup; G.vy = 0; G.airTime = 0; G.jumping = false;
      if (wasJump) burst(G.px, G.py + 0.12, 0, 0xfff6e3, 6, 3.2); // 落地小烟尘
      if (G.pendingSlide) { G.pendingSlide = false; G.sliding = 0.75; AudioSys.slide(); AudioSys.fastSay('奶蛋出击!'); popup('奶蛋出击!', '#ffd93f'); }
    }
  } else {
    // 贴地/贴车顶走；若整面车顶突然出现在脚下（从侧面撞上货车），判定失败
    if (sup >= TRUCK.roofH - 0.05 && G.py < 0.9) { hitObstacle(null); return; }
    G.py = sup; G.vy = 0; G.airTime = 0;
  }
  if (G.sliding > 0) G.sliding -= dt;
  if (G.sprint > 0) G.sprint -= dt;
  if (G.magnet > 0) G.magnet -= dt;
  if (G.grace > 0) G.grace = Math.max(0, G.grace - dt);
  ensureWorld();
  checkCollisions();
  updateWorldMeshes(dt);
  updatePlayerMesh();
  updateEffects(dt);
  updateHUD();
}

let dt0 = 0;
function updateWorldMeshes(dt = 0.016) {
  trackTex.offset.y = -(G.distance / 10);
  sidewalkTex.offset.y = -(G.distance / 10);
  for (const p of posts) {
    p.position.x = p.userData.i % 2 ? 4.6 : -4.6;
    p.position.z = -(Math.floor(p.userData.i / 2) * 6 - (G.distance % 6));
    if (p.position.z > 6) p.position.z -= 162;
  }
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
    const z = -(o.trackPos - G.distance);
    o.mesh.position.set(o.wx, o.kind === 'coin' ? (o.baseY || 0) + 0.6 + Math.sin(G.t * 3 + o.seed) * 0.1 : (o.kind === 'power' || o.kind === 'meme') ? (o.baseY || 0) + 0.9 + Math.sin(G.t * 3 + o.seed) * 0.12 : 0, z);
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
  for (const b of G.buildings) b.mesh.position.z = -(b.trackPos - G.distance);
  for (const c of clouds) { c.position.x += dt0 * 1.5; if (c.position.x > 70) c.position.x = -70; }
}

/* 果冻软体感（GLB 主角）：弹簧驱动的挤压拉伸 */
let glbJelly = 1, glbJellyV = 0, glbAir = false;
function glbSquash(v) { glbJelly = v; glbJellyV = 0; }

function updatePlayerMesh() {
  const ud = player.userData;
  player.visible = G.state !== 'menu' && (G.grace <= 0 || Math.floor(G.t * 12) % 2 === 0); // 受击保护期闪烁
  if (G.state === 'pause') return; // 暂停定格，腿不再跑
  const swing = Math.sin(G.phase);
  player.position.set(G.px, G.py, 0);
  player.rotation.set(0, 0, 0);
  if (ud.spin) ud.spin.rotation.x = 0;
  ud.torso.visible = true;
  ud.legs.forEach(l => l.visible = true);
  if (ud.egg) ud.egg.visible = false;
  if (ud.glbModel) {
    const dtj = Math.min(0.05, dt0 || 0.016);
    // 起跳拉伸 / 落地压扁（一次性冲量）
    const air = G.py > G.support + 0.05;
    if (air && !glbAir) glbSquash(1.22);
    else if (!air && glbAir) glbSquash(0.68);
    glbAir = air;
    // 滑铲保持压扁姿态
    if (G.sliding > 0 && glbJelly > 0.85) glbSquash(0.8);
    // 弹簧回弹（阻尼振荡 → 果冻感）
    glbJellyV += (1 - glbJelly) * 190 * dtj;
    glbJellyV *= Math.exp(-8.5 * dtj);
    glbJelly += glbJellyV * dtj;
    const sy = glbJelly, sxz = 1 + (1 - glbJelly) * 0.55; // 体积近似守恒
    ud.glbModel.scale.set(sxz, sy, sxz);
    // 跑动小晃动（软胶玩具的左右摆）
    if (!air && G.sliding <= 0) ud.glbModel.rotation.z = swing * 0.045;
    else ud.glbModel.rotation.z = 0;
  }
  // 道具状态标识（奶娃身上）
  if (ud.aura) {
    ud.aura.visible = G.sprint > 0;
    if (ud.aura.visible) ud.aura.children.forEach((f, i) => f.scale.setScalar(0.7 + Math.abs(Math.sin(G.t * 20 + i)) * 0.5));
  }
  if (ud.magIcon) ud.magIcon.visible = G.magnet > 0;
  if (G.state === 'menu') {
    player.rotation.y = Math.PI;
    player.position.y = Math.abs(Math.sin(G.t * 2)) * 0.12;
    ud.arms[0].rotation.x = Math.sin(G.t * 2) * 0.3; ud.arms[1].rotation.x = -Math.sin(G.t * 2) * 0.3;
    ud.legs[0].rotation.x = 0; ud.legs[1].rotation.x = 0;
    const laugh = 1 + Math.max(0, Math.sin(G.t * 3)) * 0.05;
    ud.body.scale.set(laugh, 1, laugh);
    return;
  }
  ud.body.scale.set(1, 1, 1);
  if (G.state === 'dying' || G.state === 'over') {
    player.rotation.x = -Math.PI / 2.2;
    player.rotation.z = 0.4;
    player.position.y = 0.3;
    ud.legs[0].rotation.x = 0.4; ud.legs[1].rotation.x = 0.4;
    return;
  }
  if (G.sliding > 0) {
    // 奶蛋：蜷缩成蛋向前翻滚（GLB 模型整体翻滚，绕身体中心轴）
    if (ud.spin) ud.spin.rotation.x = -(G.t * 11);
    ud.torso.visible = false;
    ud.legs.forEach(l => l.visible = false);
    if (ud.egg) {
      ud.egg.visible = true;
      ud.egg.rotation.x = -(G.t * 11);
    }
    player.position.y = G.py + 0.05;
    const tiltS = (LANE_X[G.lane] - G.px) / 2.4;
    player.rotation.z = -tiltS * 0.15;
    return;
  }
  const tilt = (LANE_X[G.lane] - G.px) / 2.4;
  player.rotation.z = -tilt * 0.25;
  // 空中绕身体中心翻一圈（落地正好转满 360°）
  const airborne = G.vy > 0.2 || G.py > G.support + 0.05;
  if (ud.spin) ud.spin.rotation.x = (airborne && G.jumping)
    ? 0.12 - Math.min(1, G.airTime / AIR_FLIP_DUR) * Math.PI * 2
    : 0.12;
  if (airborne) {
    ud.legs[0].rotation.x = 0.9; ud.legs[1].rotation.x = -0.5;
    ud.arms[0].rotation.x = -2.2; ud.arms[1].rotation.x = -2.2;
  } else {
    ud.legs[0].rotation.x = swing * 0.8; ud.legs[1].rotation.x = -swing * 0.8;
    ud.arms[0].rotation.x = -swing * 0.7; ud.arms[1].rotation.x = swing * 0.7;
    player.position.y = G.py + Math.abs(swing) * 0.07;
  }
  if (G.shield > 0 && !player.userData.shieldMesh) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(1.4, 18, 14), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.3 }));
    b.position.y = 1.1; player.add(b); player.userData.shieldMesh = b;
  }
  if (player.userData.shieldMesh) player.userData.shieldMesh.visible = G.shield > 0;
}

function updateEffects(dt) {
  dt0 = dt;
  for (const p of G.particles) {
    p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
    p.vy -= 20 * dt; p.life -= dt;
    p.m.scale.setScalar(Math.max(0.05, p.life / p.max));
    if (p.life <= 0) { p.m.visible = false; partPool.push(p.m); }
  }
  G.particles = G.particles.filter(p => p.life > 0);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 1.8);
  const fovEff = G.speed * (G.sprint > 0 ? 1.55 : 1);
  const fovT = Math.min(86, 62 + Math.max(0, fovEff - 13) * 0.5);
  camera.fov += (fovT - camera.fov) * Math.min(1, dt * 5);
  camera.updateProjectionMatrix();
  const shx = G.shake > 0 ? rand(-1, 1) * G.shake * 0.4 : 0;
  const shy = G.shake > 0 ? rand(-1, 1) * G.shake * 0.3 : 0;
  // 竖屏（手机）时把镜头拉远一点，避免奶娃糊满屏幕
  const portrait = camera.aspect < 0.85 ? 2.2 : 0;
  // 镜头跟着奶娃的高度走：上斜坡/车顶时视野一起抬高
  camera.position.set(G.px * 0.55 + shx, 3.4 + G.py * 1.0 + portrait * 0.35 + shy, 7.2 + portrait + G.py * 0.55);
  camera.lookAt(G.px * 0.7, 1.5 + G.py * 1.0, -9);
}

/* ---------- HUD ---------- */
const elScore = document.getElementById('score');
const elCoins = document.getElementById('coins');
const elPowerbars = document.getElementById('powerbars');
let puKey = '';
const PU_META = {
  shield: { icon: '🛡️', name: '相信光盾', color: '#ffe066', dur: 1 },
  sprint: { icon: '🚀', name: '奥利给', color: '#ff7a3c', dur: 4.5 },
  magnet: { icon: '🧲', name: '磁吸奶瓶', color: '#5ec8f2', dur: 8 },
};
function updateHUD() {
  elScore.textContent = G.score;
  elCoins.textContent = G.coins;
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
  }
  for (const k of active) {
    const m = PU_META[k];
    const remain = k === 'shield' ? 1 : G[k];
    const frac = k === 'shield' ? 1 : Math.max(0, G[k] / m.dur);
    const fill = document.querySelector(`#pu-${k} .pu-fill`);
    const time = document.querySelector(`#pu-${k} .pu-time`);
    if (fill) fill.style.width = `${frac * 100}%`;
    if (time) time.textContent = k === 'shield' ? `${G.shield}次` : `${remain.toFixed(1)}s`;
  }
}

/* ---------- 流程 ---------- */
function resetGame() {
  for (const o of G.objects) release(o);
  for (const b of G.buildings) disposeObject(b.mesh);
  Object.assign(G, {
    distance: 0, speed: 13, coins: 0, score: 0, lane: 1, px: 0, py: 0, vy: 0,
    sliding: 0, pendingSlide: false, shield: 0, sprint: 0, magnet: 0, grace: 0,
    objects: [], buildings: [], nextSpawn: 40, nextBuilding: 5, nextLamp: 20, nextGantry: 60, nextScenery: 8, nextCrosswalk: 95,
    particles: [], shake: 0, deadTimer: 0, airTime: 0, support: 0, jumping: false, speedTier: 0,
    chaseTime: 0, chaseLane: pick([0, 1, 2]), chaseActive: false,
  });
  puKey = ''; elPowerbars.innerHTML = '';
  if (player.userData.shieldMesh) player.userData.shieldMesh.visible = false;
}
function startGame() {
  AudioSys.init(); AudioSys.click(); AudioSys.duckBGM(false);
  resetGame();
  G.state = 'play';
  startChase();
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('gameover').classList.add('hidden');
  document.getElementById('pause').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  AudioSys.say('奶娃快跑,冲鸭!', 0); popup('冲鸭!', '#ffd93f');
  updateHUD();
}
function togglePause() {
  if (G.state === 'play') { G.state = 'pause'; randomizePause(); document.getElementById('pause').classList.remove('hidden'); AudioSys.duckBGM(true); }
  else if (G.state === 'pause') { G.state = 'play'; document.getElementById('pause').classList.add('hidden'); AudioSys.duckBGM(false); }
}
function toggleMute() {
  AudioSys.setMuted(!AudioSys.muted);
  document.getElementById('btn-mute').textContent = AudioSys.muted ? '🔇' : '🔊';
}
function randomizeMenu() {
  document.getElementById('menu-tip').textContent = pick(MENU_TIPS);
  document.getElementById('menu-tagline').textContent = pick(MENU_TAGLINES);
  document.getElementById('btn-start').textContent = pick(START_LABELS);
}
function randomizePause() {
  document.getElementById('pause-title').textContent = pick(PAUSE_TITLES);
  document.getElementById('pause-quip').textContent = pick(PAUSE_QUIPS);
}
function showMenu() {
  resetGame();
  G.state = 'menu';
  AudioSys.duckBGM(false);
  document.getElementById('menu').classList.remove('hidden');
  document.getElementById('gameover').classList.add('hidden');
  document.getElementById('pause').classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('best-menu').textContent = G.best;
  randomizeMenu();
}
function pauseToMenu() {
  if (G.state === 'pause') showMenu();
}

/* ---------- 输入 ---------- */
window.addEventListener('keydown', e => {
  const k = e.key;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) e.preventDefault();
  if (k === 'm' || k === 'M') { toggleMute(); return; }
  if (G.state === 'menu' || G.state === 'over') { if (k === 'Enter' || k === ' ') startGame(); return; }
  if (k === 'p' || k === 'P' || k === 'Escape') { togglePause(); return; }
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
window.addEventListener('blur', () => { if (G.state === 'play') togglePause(); });
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
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  updateChaser(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);