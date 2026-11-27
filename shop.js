/* 「奶娃快跑」首页奶瓶商店系统：分为「🛒 购买专区」与「⚡ 升级专区」，支持开局道具携带消耗、属性强化与 3D 装扮实时穿戴 */
const ShopSys = (() => {
  const STORAGE_KEY = 'naiwa-shop-v1';
  const STORAGE_VERSION = 1;

  const safeStorage = {
    get(key) {
      try { return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; }
      catch (e) { return null; }
    },
    set(key, val) {
      try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, val); return true; }
      catch (e) { return false; }
    },
    remove(key) {
      try { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); }
      catch (e) {}
    },
  };

  /* 两大主专区：购买类物品 与 升级类物品 彻底分开 */
  const SECTIONS = [
    {
      id: 'buy',
      label: '购买专区',
      icon: '🛒',
      subtitle: '包含可叠加携带的「开局消耗道具」与永久解锁的「3D 潮酷装扮」',
    },
    {
      id: 'upgrade',
      label: '升级专区',
      icon: '⚡',
      subtitle: '消耗奶瓶永久提升局内道具持续时间、吸附范围与得分加成',
    },
  ];

  const BUY_GROUPS = [
    {
      kind: 'boost',
      title: '🚀 开局消耗道具',
      desc: '可重复购买叠加；开启「出战携带」后，下一局开跑自动消耗 1 个生效',
    },
    {
      kind: 'skin',
      title: '🕶️ 3D 潮酷装扮',
      desc: '一次购买永久解锁，支持多项同时穿戴，首页与跑酷中奶娃 3D 模型实时可见',
    },
  ];

  const KIND_META = {
    boost: { label: '消耗道具', tag: '开局消耗' },
    skin: { label: '外观装扮', tag: '3D 装扮' },
    upgrade: { label: '等级强化', tag: '永久强化' },
  };

  const ITEMS = [
    /* ---------- 购买专区：开局消耗道具 (boost) ---------- */
    {
      id: 'start_shield',
      section: 'buy',
      kind: 'boost',
      icon: '🛡️',
      name: '开局相信光盾',
      price: 15,
      summary: '开局自带 1 层「相信光盾」护体，出门再也不怕撞早八闹钟。',
      effectText: '局内效果：开跑直接获得 1 层光盾（可与局内拾取叠加）',
    },
    {
      id: 'start_rocket',
      section: 'buy',
      kind: 'boost',
      icon: '🚀',
      name: '早八冲刺火箭',
      price: 35,
      summary: '铃响直接升空高空巡航，把豆包老师甩在教学楼后头！',
      effectText: '局内效果：开跑立即触发「奥利给」火箭高空飞行并刷出空中奶粉',
    },
    {
      id: 'double_milk',
      section: 'buy',
      kind: 'boost',
      icon: '🍼',
      name: '双倍奶瓶体验卡',
      price: 50,
      summary: '喝最香的奶，跑最野的路，本局所有奶瓶与奶粉收益翻倍。',
      effectText: '局内效果：单局全程拾取奶瓶 (+2) 与金装奶粉/热梗 (+10) 收益 ×2',
    },

    /* ---------- 购买专区：3D 潮酷装扮 (skin) ---------- */
    {
      id: 'skin_glasses',
      section: 'buy',
      kind: 'skin',
      icon: '🕶️',
      name: '街溜子墨镜',
      price: 800,
      summary: '戴上这副金框黑片六亲不认墨镜，奶昔商业街你最靓。',
      effectText: '3D 外观：奶娃面部实时佩戴炫酷黑金太阳镜',
    },
    {
      id: 'skin_crown',
      section: 'buy',
      kind: 'skin',
      icon: '👑',
      name: '遥遥领先小皇冠',
      price: 2000,
      summary: '保研级宝石金冠加持，豆包老师看了都想给你加学分。',
      effectText: '3D 外观：奶娃头顶实时佩戴镶钻纯金小皇冠',
    },
    {
      id: 'skin_pass',
      section: 'buy',
      kind: 'skin',
      icon: '📘',
      name: '免交作业金牌',
      price: 1500,
      summary: '传说中的免死金牌，背在身上跑酷自带金星尾迹与专属台词。',
      effectText: '3D 外观：背部佩戴「免交作业」金牌 + 跑酷金星粒子 + 开场彩蛋台词',
    },

    /* ---------- 升级专区：属性等级强化 (upgrade, Lv.0 -> Lv.5) ---------- */
    {
      id: 'magnet_lv',
      section: 'upgrade',
      kind: 'upgrade',
      icon: '🐑',
      name: '磁吸小羊扩音器',
      prices: [20, 35, 50, 70, 95],
      maxLevel: 5,
      summary: '强化磁吸小羊声波功率，大幅延长磁吸持续时间并扩大吸奶瓶距离。',
      effectText: '每级提升：磁吸时间 +1.5 秒，吸附半径 +2.2 米',
      formatLevel(lv) {
        const dur = (8 + lv * 1.5).toFixed(1);
        const range = (20 + lv * 2.2).toFixed(1);
        return `持续 ${dur}s · 范围 ${range}m`;
      },
    },
    {
      id: 'rocket_lv',
      section: 'upgrade',
      kind: 'upgrade',
      icon: '🔥',
      name: '奥利给推进器',
      prices: [25, 40, 60, 85, 115],
      maxLevel: 5,
      summary: '扩容火箭背包高能燃料，在天上多飞好几秒、多吸几罐金装奶粉。',
      effectText: '每级提升：火箭高空飞行持续时间 +1.0 秒（含开局火箭）',
      formatLevel(lv) {
        const dur = (7 + lv * 1.0).toFixed(1);
        return `高空飞行 ${dur}s`;
      },
    },
    {
      id: 'shield_lv',
      section: 'upgrade',
      kind: 'upgrade',
      icon: '✨',
      name: '光之信念镀膜',
      prices: [30, 50, 75, 105, 140],
      maxLevel: 5,
      summary: '强化光盾与冲刺肘飞障碍时的冲击力，每次肘飞障碍直接奖励额外距离！',
      effectText: '每级提升：每次肘飞障碍物额外奖励 +10 米距离得分',
      formatLevel(lv) {
        return lv === 0 ? '无额外米数加成' : `肘飞障碍 +${lv * 10} 米/次`;
      },
    },
  ];

  const ITEM_BY_ID = Object.create(null);
  for (const item of ITEMS) ITEM_BY_ID[item.id] = item;

  function seedInitialBottles() {
    try {
      if (typeof AchievementSys !== 'undefined' && typeof AchievementSys.getState === 'function') {
        const st = AchievementSys.getState();
        const c = Math.max(0, Math.floor(Number(st?.stats?.totalCoins) || 0));
        if (c > 0) return c;
      }
    } catch (e) {}
    return 0;
  }

  function defaultData(seedBottles = 0) {
    return {
      version: STORAGE_VERSION,
      bottles: seedBottles,
      totalEarned: seedBottles,
      totalSpent: 0,
      lastRunBottles: 0,
      counts: Object.create(null),
      armedBoosts: Object.create(null),
      levels: Object.create(null),
      unlockedSkins: Object.create(null),
      equippedSkins: Object.create(null),
    };
  }

  function loadData() {
    const raw = safeStorage.get(STORAGE_KEY);
    if (!raw) {
      const seeded = defaultData(seedInitialBottles());
      saveData(seeded);
      return seeded;
    }
    try {
      const parsed = JSON.parse(raw);
      const d = defaultData(0);
      d.bottles = Math.max(0, Math.floor(Number(parsed?.bottles) || 0));
      d.totalEarned = Math.max(d.bottles, Math.floor(Number(parsed?.totalEarned) || 0));
      d.totalSpent = Math.max(0, Math.floor(Number(parsed?.totalSpent) || 0));
      d.lastRunBottles = Math.max(0, Math.floor(Number(parsed?.lastRunBottles) || 0));
      if (parsed && typeof parsed.counts === 'object' && parsed.counts) {
        for (const [k, v] of Object.entries(parsed.counts)) {
          if (ITEM_BY_ID[k] && ITEM_BY_ID[k].kind === 'boost') {
            d.counts[k] = Math.max(0, Math.floor(Number(v) || 0));
          }
        }
      }
      if (parsed && typeof parsed.armedBoosts === 'object' && parsed.armedBoosts) {
        for (const [k, v] of Object.entries(parsed.armedBoosts)) {
          if (ITEM_BY_ID[k] && ITEM_BY_ID[k].kind === 'boost' && (d.counts[k] || 0) > 0 && v) {
            d.armedBoosts[k] = true;
          }
        }
      } else {
        // 兼容旧数据：若持有库存且未设置 armedBoosts，默认开启携带
        for (const [k, cnt] of Object.entries(d.counts)) {
          if (cnt > 0) d.armedBoosts[k] = true;
        }
      }
      if (parsed && typeof parsed.levels === 'object' && parsed.levels) {
        for (const [k, v] of Object.entries(parsed.levels)) {
          const item = ITEM_BY_ID[k];
          if (item && item.kind === 'upgrade') {
            d.levels[k] = Math.max(0, Math.min(item.maxLevel || 5, Math.floor(Number(v) || 0)));
          }
        }
      }
      if (parsed && typeof parsed.unlockedSkins === 'object' && parsed.unlockedSkins) {
        for (const [k, v] of Object.entries(parsed.unlockedSkins)) {
          if (ITEM_BY_ID[k] && v) d.unlockedSkins[k] = true;
        }
      }
      if (parsed && typeof parsed.equippedSkins === 'object' && parsed.equippedSkins) {
        for (const [k, v] of Object.entries(parsed.equippedSkins)) {
          if (ITEM_BY_ID[k] && d.unlockedSkins[k] && v) d.equippedSkins[k] = true;
        }
      }
      return d;
    } catch (e) {
      return defaultData(0);
    }
  }

  function saveData(target = data) {
    safeStorage.set(STORAGE_KEY, JSON.stringify({
      version: STORAGE_VERSION,
      bottles: target.bottles,
      totalEarned: target.totalEarned,
      totalSpent: target.totalSpent,
      lastRunBottles: target.lastRunBottles,
      counts: target.counts,
      armedBoosts: target.armedBoosts,
      levels: target.levels,
      unlockedSkins: target.unlockedSkins,
      equippedSkins: target.equippedSkins,
    }));
  }

  let data = loadData();
  let currentRunEarned = 0;
  let activeSection = 'buy';
  let modalOpen = false;
  let returnFocusEl = null;
  let resetArmed = false;
  let resetConfirmTimer = null;
  let noticeTimer = null;
  let previewSkins = null;
  let previewLabel = '';
  const listeners = [];
  const modalListeners = [];
  const focusListeners = [];
  let fitController = null;

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  function onModalChange(fn) {
    if (typeof fn === 'function') modalListeners.push(fn);
  }

  function onSkinFocus(fn) {
    if (typeof fn === 'function') focusListeners.push(fn);
  }

  function setFitController(ctrl) {
    fitController = ctrl || null;
  }

  function notifyChange() {
    for (const fn of listeners) {
      try { fn(getState()); } catch (e) {}
    }
  }

  function notifyModal(open) {
    for (const fn of modalListeners) {
      try { fn(open); } catch (e) {}
    }
  }

  function notifySkinFocus(skinKey) {
    for (const fn of focusListeners) {
      try { fn(skinKey); } catch (e) {}
    }
  }

  function getItemPrice(item) {
    if (item.kind === 'upgrade') {
      const lv = data.levels[item.id] || 0;
      if (lv >= item.maxLevel) return 0;
      return item.prices[lv] || item.prices[item.prices.length - 1];
    }
    return item.price || 0;
  }

  function getModifiers() {
    const magnetLv = data.levels.magnet_lv || 0;
    const rocketLv = data.levels.rocket_lv || 0;
    const shieldLv = data.levels.shield_lv || 0;
    return {
      magnetLv,
      rocketLv,
      shieldLv,
      magnetDuration: 8 + magnetLv * 1.5,
      magnetRange: 20 + magnetLv * 2.2,
      sprintDuration: 7 + rocketLv * 1.0,
      shieldThrowBonus: shieldLv * 10,
    };
  }

  function getEquippedSkins() {
    return {
      glasses: !!data.equippedSkins.skin_glasses,
      crown: !!data.equippedSkins.skin_crown,
      pass: !!data.equippedSkins.skin_pass,
    };
  }

  function getEffectiveSkins() {
    const base = getEquippedSkins();
    return previewSkins ? Object.assign(base, previewSkins) : base;
  }

  function syncPreviewBanner() {
    if (typeof document === 'undefined') return;
    const banner = document.getElementById('shop-preview-banner');
    const lbl = document.getElementById('shop-preview-label');
    if (!banner) return;
    const has = Boolean(previewSkins);
    banner.classList.toggle('hidden', !has);
    if (has && lbl) lbl.textContent = `✨ 正在试穿：${previewLabel || '3D 装扮'}`;
  }

  function clearPreview() {
    if (!previewSkins) return;
    previewSkins = null;
    previewLabel = '';
    syncPreviewBanner();
    notifyChange();
    if (modalOpen) renderContent();
  }

  function toggleSkinPreview(itemId) {
    const item = ITEM_BY_ID[itemId];
    if (!item || item.kind !== 'skin') return;
    const key = item.id.replace('skin_', '');
    if (typeof AudioSys !== 'undefined') {
      AudioSys.init();
      AudioSys.click();
    }
    if (previewSkins && previewSkins[key]) {
      clearPreview();
      setNotice('👌 已还原奶娃当前实际穿搭。', 'info');
      return;
    }
    previewSkins = { [key]: true };
    previewLabel = item.name;
    syncPreviewBanner();
    notifyChange();
    notifySkinFocus(key);
    renderContent();
    setNotice(`👀 正在右侧 3D 展台试穿预览「${item.name}」（可拖拽 360° 端详）！`, 'ok');
  }

  function getArmedBoosts() {
    return {
      startShield: (data.counts.start_shield || 0) > 0 && !!data.armedBoosts.start_shield,
      startRocket: (data.counts.start_rocket || 0) > 0 && !!data.armedBoosts.start_rocket,
      doubleMilk: (data.counts.double_milk || 0) > 0 && !!data.armedBoosts.double_milk,
    };
  }

  function startRun() {
    currentRunEarned = 0;
    data.lastRunBottles = 0;
    saveData();
    syncEntryBadges();
  }

  /* 正式进入跑酷（play 状态）时调用：扣除 1 个已勾选出战携带的消耗道具并返回本局生效配置 */
  function consumeRunLoadout() {
    const loadout = {
      startShield: false,
      startRocket: false,
      doubleMilk: false,
      consumedNames: [],
    };
    const boostMap = [
      ['start_shield', 'startShield', '🛡️ 开局光盾'],
      ['start_rocket', 'startRocket', '🚀 早八火箭'],
      ['double_milk', 'doubleMilk', '🍼 双倍奶瓶'],
    ];
    let changed = false;
    for (const [id, key, label] of boostMap) {
      const cnt = data.counts[id] || 0;
      if (cnt > 0 && data.armedBoosts[id]) {
        loadout[key] = true;
        loadout.consumedNames.push(label);
        data.counts[id] = cnt - 1;
        if (data.counts[id] <= 0) {
          delete data.counts[id];
          delete data.armedBoosts[id];
        }
        changed = true;
      }
    }
    if (changed) {
      saveData();
      syncEntryBadges();
      notifyChange();
    }
    return loadout;
  }

  function addBottles(amount, { fromRun = true } = {}) {
    const n = Math.floor(Number(amount) || 0);
    if (n <= 0) return data.bottles;
    data.bottles += n;
    data.totalEarned += n;
    if (fromRun) {
      currentRunEarned += n;
      data.lastRunBottles = currentRunEarned;
    }
    saveData();
    syncEntryBadges();
    if (modalOpen) {
      renderHeaderStats();
      renderContent();
    }
    return data.bottles;
  }

  function finishRun(runCoins) {
    const finalCoins = Math.max(0, Math.floor(Number(runCoins) || 0));
    if (finalCoins > currentRunEarned) {
      const diff = finalCoins - currentRunEarned;
      data.bottles += diff;
      data.totalEarned += diff;
      currentRunEarned = finalCoins;
    }
    data.lastRunBottles = currentRunEarned;
    saveData();
    syncEntryBadges();
  }

  function defaultNoticeText() {
    return activeSection === 'buy'
      ? '🛒 购买专区：开局道具买完默认勾选「出战携带」，下局开跑自动生效；3D 装扮解锁后可在首页直接看到奶娃穿戴效果！'
      : '⚡ 升级专区：强化等级永久有效，直接提升局内磁吸小羊、奥利给火箭与相信光盾的实战威力！';
  }

  function setNotice(text, tone = 'info') {
    if (typeof document === 'undefined') return;
    const banner = document.getElementById('shop-notice');
    if (!banner) return;
    banner.textContent = text;
    banner.dataset.tone = tone;
    banner.classList.remove('pop');
    void banner.offsetWidth;
    banner.classList.add('pop');
    if (noticeTimer) clearTimeout(noticeTimer);
    if (tone !== 'info') {
      noticeTimer = setTimeout(() => {
        if (banner) {
          banner.textContent = defaultNoticeText();
          banner.dataset.tone = 'info';
        }
      }, 4500);
    }
  }

  function pulseWallet() {
    if (typeof document === 'undefined') return;
    const pill = document.getElementById('shop-wallet-pill');
    if (!pill) return;
    pill.classList.remove('shake', 'bounce');
    void pill.offsetWidth;
    pill.classList.add('bounce');
  }

  function shakeWallet() {
    if (typeof document === 'undefined') return;
    const pill = document.getElementById('shop-wallet-pill');
    if (!pill) return;
    pill.classList.remove('shake', 'bounce');
    void pill.offsetWidth;
    pill.classList.add('shake');
  }

  function toggleBoostArm(itemId) {
    const item = ITEM_BY_ID[itemId];
    if (!item || item.kind !== 'boost') return false;
    const count = data.counts[item.id] || 0;
    if (count <= 0) return false;
    if (typeof AudioSys !== 'undefined') {
      AudioSys.init();
      AudioSys.click();
    }
    if (data.armedBoosts[item.id]) {
      delete data.armedBoosts[item.id];
      setNotice(`⏸ 已取消携带「${item.name}」，库存将保留在背包中。`, 'info');
    } else {
      data.armedBoosts[item.id] = true;
      setNotice(`⚡ 已勾选携带「${item.name}」，下一局开跑时将自动消耗 1 个生效！`, 'ok');
    }
    saveData();
    syncEntryBadges();
    renderContent();
    notifyChange();
    return true;
  }

  function buyOrAct(itemId) {
    const item = ITEM_BY_ID[itemId];
    if (!item) return false;
    if (typeof AudioSys !== 'undefined') AudioSys.init();

    // 已解锁装扮：切换穿戴状态
    if (item.kind === 'skin' && data.unlockedSkins[item.id]) {
      const skinKey = item.id.replace('skin_', '');
      const nextState = !data.equippedSkins[item.id];
      if (nextState) data.equippedSkins[item.id] = true;
      else delete data.equippedSkins[item.id];
      if (previewSkins && previewSkins[skinKey]) {
        delete previewSkins[skinKey];
        if (Object.keys(previewSkins).length === 0) {
          previewSkins = null;
          previewLabel = '';
        }
        syncPreviewBanner();
      }
      saveData();
      if (typeof AudioSys !== 'undefined') AudioSys.click();
      setNotice(
        nextState
          ? `✨ 已为奶娃穿戴 3D 装扮「${item.name}」！右侧 3D 展台已实时换装，可拖拽 360° 查看～`
          : `👌 已卸下「${item.name}」。`,
        'ok'
      );
      renderHeaderStats();
      renderContent();
      syncEntryBadges();
      notifyChange();
      if (nextState) notifySkinFocus(skinKey);
      return true;
    }

    // 已满级强化
    if (item.kind === 'upgrade') {
      const lv = data.levels[item.id] || 0;
      if (lv >= item.maxLevel) {
        if (typeof AudioSys !== 'undefined') AudioSys.click();
        setNotice(`🏆 「${item.name}」已达最高等级 Lv.${item.maxLevel}！`, 'ok');
        return false;
      }
    }

    const price = getItemPrice(item);
    if (data.bottles < price) {
      const lack = price - data.bottles;
      if (typeof AudioSys !== 'undefined') {
        AudioSys.tone(220, 0.14, 'sawtooth', 0.14, 145);
      }
      shakeWallet();
      setNotice(`🍼 奶瓶不够啦！${item.kind === 'upgrade' ? '升级' : '购买'}「${item.name}」还差 ${lack} 个奶瓶，去跑两把或点下方「测试领奶瓶」吧～`, 'warn');
      return false;
    }

    data.bottles -= price;
    data.totalSpent += price;

    if (item.kind === 'boost') {
      data.counts[item.id] = (data.counts[item.id] || 0) + 1;
      data.armedBoosts[item.id] = true;
      if (typeof AudioSys !== 'undefined') AudioSys.coin();
      setNotice(`✅ 购买成功！消耗 ${price} 🍼 入手「${item.name}」（库存 ×${data.counts[item.id]}，已自动勾选下局出战携带）`, 'ok');
    } else if (item.kind === 'upgrade') {
      const nextLv = (data.levels[item.id] || 0) + 1;
      data.levels[item.id] = nextLv;
      if (typeof AudioSys !== 'undefined') AudioSys.power();
      setNotice(`⚡ 强化成功！消耗 ${price} 🍼 将「${item.name}」升至 Lv.${nextLv}/${item.maxLevel}（${item.formatLevel(nextLv)}）！`, 'ok');
    } else if (item.kind === 'skin') {
      const skinKey = item.id.replace('skin_', '');
      data.unlockedSkins[item.id] = true;
      data.equippedSkins[item.id] = true;
      if (previewSkins && previewSkins[skinKey]) {
        previewSkins = null;
        previewLabel = '';
        syncPreviewBanner();
      }
      if (typeof AudioSys !== 'undefined') AudioSys.power();
      setNotice(`🎉 解锁成功！消耗 ${price} 🍼 入手并穿戴 3D 装扮「${item.name}」！`, 'ok');
      notifySkinFocus(skinKey);
    }

    saveData();
    pulseWallet();
    syncEntryBadges();
    renderHeaderStats();
    renderContent();
    notifyChange();
    return true;
  }

  function syncEntryBadges() {
    if (typeof document === 'undefined') return;
    const menuCount = document.getElementById('shop-menu-bottles');
    if (menuCount) menuCount.textContent = `🍼 ${data.bottles}`;

    const homeBottles = document.getElementById('bottles-menu');
    if (homeBottles) homeBottles.textContent = String(data.bottles);

    const overTotal = document.getElementById('final-total-coins');
    if (overTotal) overTotal.textContent = String(data.bottles);

    const shopSub = document.getElementById('shop-menu-sub');
    if (shopSub) {
      const armed = getArmedBoosts();
      const armedCount = (armed.startShield ? 1 : 0) + (armed.startRocket ? 1 : 0) + (armed.doubleMilk ? 1 : 0);
      const skinCount = Object.keys(data.equippedSkins).filter(k => data.equippedSkins[k]).length;
      if (armedCount > 0) {
        shopSub.textContent = `⚡ 已带 ${armedCount} 件开局道具`;
      } else if (skinCount > 0) {
        shopSub.textContent = `✨ 已穿戴 ${skinCount} 件装扮`;
      } else {
        const ownedCount = getOwnedTotalCount();
        shopSub.textContent = ownedCount > 0 ? `已解锁 ${ownedCount} 项内容` : '购买道具 · 强化升级';
      }
    }
  }

  function getOwnedTotalCount() {
    let total = 0;
    for (const v of Object.values(data.counts)) total += (v || 0);
    for (const v of Object.values(data.levels)) total += (v || 0);
    for (const v of Object.values(data.unlockedSkins)) if (v) total += 1;
    return total;
  }

  function renderHeaderStats() {
    if (typeof document === 'undefined') return;
    const balanceEl = document.getElementById('shop-balance-num');
    if (balanceEl) balanceEl.textContent = String(data.bottles);

    const summaryEl = document.getElementById('shop-summary-stats');
    if (!summaryEl) return;
    const armed = getArmedBoosts();
    const armedList = [
      armed.startShield ? '🛡️' : '',
      armed.startRocket ? '🚀' : '',
      armed.doubleMilk ? '🍼' : '',
    ].filter(Boolean).join(' ') || '无';
    const chips = [
      { label: '当前可用奶瓶', val: `🍼 ${data.bottles}` },
      { label: '累计跑酷获得', val: `${data.totalEarned} 🍼` },
      { label: '下局出战携带', val: armedList },
      { label: '上局带回奶瓶', val: `+${data.lastRunBottles} 🍼` },
    ];
    summaryEl.innerHTML = chips.map(c => (
      `<div class="ach-stat-chip"><small>${c.label}</small><b>${c.val}</b></div>`
    )).join('');
  }

  function renderSectionTabs() {
    if (typeof document === 'undefined') return;
    const tabsEl = document.getElementById('shop-tabs');
    if (!tabsEl) return;
    const buyCount = ITEMS.filter(i => i.section === 'buy').length;
    const upgCount = ITEMS.filter(i => i.section === 'upgrade').length;
    tabsEl.innerHTML = SECTIONS.map(sec => {
      const active = sec.id === activeSection;
      const count = sec.id === 'buy' ? buyCount : upgCount;
      return `<button type="button" role="tab" aria-selected="${active}" class="shop-main-tab ${active ? 'active' : ''}" data-shop-sec="${sec.id}">
        <span class="shop-main-tab-ic">${sec.icon}</span>
        <span class="shop-main-tab-txt">
          <strong>${sec.label} <small>(${count})</small></strong>
          <small>${sec.subtitle}</small>
        </span>
      </button>`;
    }).join('');
    tabsEl.querySelectorAll('[data-shop-sec]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextSec = btn.getAttribute('data-shop-sec') || 'buy';
        if (nextSec === activeSection) return;
        activeSection = nextSec;
        if (typeof AudioSys !== 'undefined') AudioSys.click();
        renderSectionTabs();
        renderContent();
        setNotice(defaultNoticeText(), 'info');
      });
    });
  }

  function renderItemCard(item) {
    const meta = KIND_META[item.kind] || KIND_META.boost;
    const price = getItemPrice(item);
    const canAfford = data.bottles >= price;

    let statusHtml = '';
    let actionsHtml = '';
    let cardClass = 'shop-card';

    if (item.kind === 'boost') {
      const count = data.counts[item.id] || 0;
      const armed = count > 0 && !!data.armedBoosts[item.id];
      if (count > 0) cardClass += ' owned';
      if (armed) cardClass += ' equipped';
      statusHtml = `
        <span class="shop-stock-pill ${count > 0 ? 'has-stock' : ''}">背包库存：×${count}</span>
        ${count > 0 ? `<span class="shop-arm-badge ${armed ? 'on' : ''}">${armed ? '⚡ 下局出战' : '⏸ 未携带'}</span>` : ''}
      `;
      if (count > 0) {
        actionsHtml = `
          <div class="shop-btn-row">
            <button type="button" class="shop-buy-btn is-equip ${armed ? 'active' : ''}" data-shop-arm="${item.id}">
              ${armed ? '✓ 出战携带中' : '携带出战'}
            </button>
            <button type="button" class="shop-buy-btn shop-buy-more ${canAfford ? '' : 'lacking'}" data-shop-buy="${item.id}" title="再买 1 个">
              <span>+1</span><strong class="shop-price">🍼 ${price}</strong>
            </button>
          </div>`;
      } else {
        actionsHtml = `<button type="button" class="shop-buy-btn ${canAfford ? '' : 'lacking'}" data-shop-buy="${item.id}">
          <span>购买并携带</span><strong class="shop-price">🍼 ${price}</strong>
        </button>`;
      }
    } else if (item.kind === 'upgrade') {
      const lv = data.levels[item.id] || 0;
      const max = item.maxLevel || 5;
      const pct = Math.round((lv / max) * 100);
      if (lv > 0) cardClass += ' owned';
      if (lv >= max) cardClass += ' maxed';
      const curDesc = item.formatLevel ? item.formatLevel(lv) : `Lv.${lv}`;
      const nextDesc = (lv < max && item.formatLevel) ? item.formatLevel(lv + 1) : '';
      statusHtml = `
        <div class="shop-upg-meta">
          <div class="shop-lv-row">
            <div class="shop-lv-track"><span style="width:${pct}%"></span></div>
            <span class="shop-lv-num">Lv.${lv}/${max}</span>
          </div>
          <div class="shop-lv-compare">
            <span class="cur">当前：${curDesc}</span>
            ${nextDesc ? `<span class="nxt">下一级：${nextDesc}</span>` : '<span class="nxt">已达最高等级</span>'}
          </div>
        </div>`;
      if (lv >= max) {
        actionsHtml = `<button type="button" class="shop-buy-btn is-maxed" disabled>✨ 已满级 (Lv.${max})</button>`;
      } else {
        actionsHtml = `<button type="button" class="shop-buy-btn ${canAfford ? '' : 'lacking'}" data-shop-buy="${item.id}">
          <span>强化至 Lv.${lv + 1}</span><strong class="shop-price">🍼 ${price}</strong>
        </button>`;
      }
    } else if (item.kind === 'skin') {
      const skinKey = item.id.replace('skin_', '');
      const unlocked = !!data.unlockedSkins[item.id];
      const equipped = !!data.equippedSkins[item.id];
      const previewing = !!(previewSkins && previewSkins[skinKey]);
      if (unlocked) cardClass += ' owned';
      if (equipped) cardClass += ' equipped';
      statusHtml = `<span class="shop-stock-pill ${unlocked || previewing ? 'has-stock' : ''}">${
        equipped ? '✨ 奶娃穿戴中' : previewing ? '👀 3D 试穿中' : unlocked ? '✅ 已永久解锁' : '🔒 未解锁装扮'
      }</span>`;
      if (unlocked) {
        actionsHtml = `<button type="button" class="shop-buy-btn is-equip ${equipped ? 'active' : ''}" data-shop-buy="${item.id}">
          ${equipped ? '✓ 穿戴中（点击卸下）' : '立即穿戴'}
        </button>`;
      } else {
        actionsHtml = `<div class="shop-btn-row">
          <button type="button" class="shop-try-btn ${previewing ? 'active' : ''}" data-shop-preview="${item.id}" title="在 3D 展台试穿看看效果">
            ${previewing ? '✓ 试穿中' : '👀 试穿'}
          </button>
          <button type="button" class="shop-buy-btn ${canAfford ? '' : 'lacking'}" data-shop-buy="${item.id}">
            <span>解锁</span><strong class="shop-price">🍼 ${price}</strong>
          </button>
        </div>`;
      }
    }

    return `<div class="${cardClass}" data-kind="${item.kind}">
      <div class="shop-card-top">
        <div class="shop-card-icon">${item.icon}</div>
        <div class="shop-card-body">
          <div class="shop-card-head">
            <h3>${item.name}</h3>
            <span class="shop-kind-pill" data-kind="${item.kind}">${meta.tag}</span>
          </div>
          <p class="shop-card-effect">${item.effectText}</p>
          <p class="shop-card-desc">${item.summary}</p>
        </div>
      </div>
      <div class="shop-card-foot">
        <div class="shop-card-status">${statusHtml}</div>
        ${actionsHtml}
      </div>
    </div>`;
  }

  function renderContent() {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('shop-grid');
    if (!container) return;

    if (activeSection === 'buy') {
      container.className = 'shop-sections-wrap';
      container.innerHTML = BUY_GROUPS.map(group => {
        const list = ITEMS.filter(i => i.section === 'buy' && i.kind === group.kind);
        return `<section class="shop-sub-block">
          <div class="shop-sub-head">
            <h3>${group.title}</h3>
            <small>${group.desc}</small>
          </div>
          <div class="shop-grid">
            ${list.map(renderItemCard).join('')}
          </div>
        </section>`;
      }).join('');
    } else {
      const list = ITEMS.filter(i => i.section === 'upgrade');
      container.className = 'shop-sections-wrap';
      container.innerHTML = `<section class="shop-sub-block">
        <div class="shop-sub-head">
          <h3>⚡ 属性等级强化（Lv.0 → Lv.5）</h3>
          <small>升级后永久生效，对每局拾取的道具和开局携带道具均适用</small>
        </div>
        <div class="shop-grid">
          ${list.map(renderItemCard).join('')}
        </div>
      </section>`;
    }

    container.querySelectorAll('[data-shop-buy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-shop-buy');
        if (id) buyOrAct(id);
      });
    });

    container.querySelectorAll('[data-shop-arm]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-shop-arm');
        if (id) toggleBoostArm(id);
      });
    });

    container.querySelectorAll('[data-shop-preview]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-shop-preview');
        if (id) toggleSkinPreview(id);
      });
    });
  }

  function disarmReset() {
    resetArmed = false;
    if (resetConfirmTimer) {
      clearTimeout(resetConfirmTimer);
      resetConfirmTimer = null;
    }
    if (typeof document !== 'undefined') {
      const btn = document.getElementById('btn-shop-reset');
      if (btn) {
        btn.textContent = '重置商店数据';
        btn.classList.remove('armed');
      }
    }
  }

  function resetAll() {
    data = defaultData(0);
    currentRunEarned = 0;
    previewSkins = null;
    previewLabel = '';
    syncPreviewBanner();
    saveData();
    disarmReset();
    syncEntryBadges();
    notifyChange();
    if (modalOpen) {
      renderHeaderStats();
      renderSectionTabs();
      renderContent();
      setNotice('🧹 商店数据、强化等级、3D 装扮与奶瓶余额已重置为初始状态。', 'info');
    }
  }

  function openModal(triggerEl = null) {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('shop-modal');
    if (!modal) return;
    returnFocusEl = triggerEl || document.activeElement;
    modalOpen = true;
    modal.classList.remove('mobile-preview');
    syncPreviewBanner();
    disarmReset();
    renderHeaderStats();
    renderSectionTabs();
    renderContent();
    setNotice(defaultNoticeText(), 'info');
    modal.classList.remove('hidden');
    notifyModal(true);
    if (typeof AudioSys !== 'undefined') AudioSys.click();
    const closeBtn = document.getElementById('btn-shop-close');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeModal() {
    if (typeof document === 'undefined') return;
    disarmReset();
    const modal = document.getElementById('shop-modal');
    if (modal) {
      modal.classList.remove('mobile-preview');
      modal.classList.add('hidden');
    }
    modalOpen = false;
    if (previewSkins) {
      previewSkins = null;
      previewLabel = '';
      syncPreviewBanner();
      notifyChange();
    }
    notifyModal(false);
    if (returnFocusEl && typeof returnFocusEl.focus === 'function') {
      try { returnFocusEl.focus({ preventScroll: true }); } catch (e) {}
    }
    returnFocusEl = null;
  }

  function isModalOpen() {
    return modalOpen;
  }

  function handleEscape() {
    if (isModalOpen()) {
      closeModal();
      return true;
    }
    return false;
  }

  function getState() {
    return {
      bottles: data.bottles,
      totalEarned: data.totalEarned,
      totalSpent: data.totalSpent,
      lastRunBottles: data.lastRunBottles,
      counts: Object.assign({}, data.counts),
      armedBoosts: Object.assign({}, data.armedBoosts),
      levels: Object.assign({}, data.levels),
      unlockedSkins: Object.assign({}, data.unlockedSkins),
      equippedSkins: Object.assign({}, data.equippedSkins),
      modifiers: getModifiers(),
      skins: getEquippedSkins(),
      armed: getArmedBoosts(),
    };
  }

  function bindUI() {
    if (typeof document === 'undefined') return;
    const openBtn = document.getElementById('btn-shop-menu');
    if (openBtn) openBtn.addEventListener('click', () => openModal(openBtn));

    const closeBtn = document.getElementById('btn-shop-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    const modal = document.getElementById('shop-modal');
    if (modal) {
      modal.addEventListener('click', e => {
        if (e.target === modal) closeModal();
      });
    }

    const testAddBtn = document.getElementById('btn-shop-test-add');
    if (testAddBtn) {
      testAddBtn.addEventListener('click', () => {
        if (typeof AudioSys !== 'undefined') {
          AudioSys.init();
          AudioSys.coin();
        }
        addBottles(100, { fromRun: false });
        pulseWallet();
        setNotice('🧪 测试发放成功！已为你增加 +100 🍼 奶瓶，快去购买道具或强化等级吧～', 'ok');
      });
    }

    const resetBtn = document.getElementById('btn-shop-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (!resetArmed) {
          resetArmed = true;
          resetBtn.textContent = '再次点击确认清空';
          resetBtn.classList.add('armed');
          if (typeof AudioSys !== 'undefined') AudioSys.click();
          resetConfirmTimer = setTimeout(disarmReset, 3500);
          return;
        }
        resetAll();
        if (typeof AudioSys !== 'undefined') AudioSys.click();
      });
    }

    const stagePane = document.getElementById('shop-stage-pane');
    if (stagePane) {
      let dragging = false, lastX = 0, lastY = 0;
      stagePane.addEventListener('pointerdown', e => {
        if (e.target instanceof HTMLButtonElement) return;
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        stagePane.classList.add('dragging');
        if (stagePane.setPointerCapture) {
          try { stagePane.setPointerCapture(e.pointerId); } catch (err) {}
        }
      });
      stagePane.addEventListener('pointermove', e => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        if (fitController && typeof fitController.drag === 'function') {
          fitController.drag(dx, dy);
        }
      });
      const endDrag = () => {
        dragging = false;
        stagePane.classList.remove('dragging');
      };
      stagePane.addEventListener('pointerup', endDrag);
      stagePane.addEventListener('pointercancel', endDrag);

      stagePane.querySelectorAll('[data-fit-view]').forEach(btn => {
        btn.addEventListener('click', () => {
          const v = btn.getAttribute('data-fit-view');
          if (typeof AudioSys !== 'undefined') AudioSys.click();
          if (fitController && typeof fitController.view === 'function') fitController.view(v);
        });
      });
    }

    const clearPreviewBtn = document.getElementById('btn-shop-preview-clear');
    if (clearPreviewBtn) {
      clearPreviewBtn.addEventListener('click', () => {
        if (typeof AudioSys !== 'undefined') AudioSys.click();
        clearPreview();
        setNotice('👌 已还原奶娃当前实际穿搭。', 'info');
      });
    }

    const mobileStageToggle = document.getElementById('btn-shop-stage-toggle');
    const mobileStageBack = document.getElementById('btn-shop-stage-back');
    if (mobileStageToggle && modal) {
      mobileStageToggle.addEventListener('click', () => {
        if (typeof AudioSys !== 'undefined') AudioSys.click();
        modal.classList.add('mobile-preview');
      });
    }
    if (mobileStageBack && modal) {
      mobileStageBack.addEventListener('click', () => {
        if (typeof AudioSys !== 'undefined') AudioSys.click();
        modal.classList.remove('mobile-preview');
      });
    }

    syncEntryBadges();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindUI, { once: true });
    } else {
      bindUI();
    }
  }

  return {
    ITEMS,
    SECTIONS,
    onChange,
    onModalChange,
    onSkinFocus,
    setFitController,
    startRun,
    consumeRunLoadout,
    addBottles,
    finishRun,
    buyOrAct,
    toggleBoostArm,
    getModifiers,
    getEquippedSkins,
    getEffectiveSkins,
    getArmedBoosts,
    openModal,
    closeModal,
    isModalOpen,
    handleEscape,
    resetAll,
    syncEntryBadges,
    getBottles: () => data.bottles,
    getState,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShopSys;
}
