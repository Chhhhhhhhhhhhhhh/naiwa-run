/* 音频系统：WebAudio 合成清脆音效 + 记忆点 BGM + 离线中文神经语音 */
const AudioSys = (() => {
  const safeGet = key => { try { return localStorage.getItem(key); } catch (e) { return null; } };
  const safeSet = (key, val) => { try { localStorage.setItem(key, val); } catch (e) {} };
  const savedVol = parseFloat(safeGet('naiwa-volume'));
  const initialVol = Number.isFinite(savedVol) ? Math.max(0, Math.min(1, savedVol)) : 0.85;
  const initialMuted = safeGet('naiwa-muted') === '1' || initialVol === 0;

  const VOICE_FILES = {
    start: 'assets/voice/start.mp3',
    dash: 'assets/voice/dash.mp3',
    jump: 'assets/voice/jump.mp3',
    slide: 'assets/voice/slide.mp3',
    shield: 'assets/voice/shield.mp3',
    sprint: 'assets/voice/sprint.mp3',
    magnet: 'assets/voice/magnet.mp3',
    coins666: 'assets/voice/coins666.mp3',
    chaser: 'assets/voice/chaser.mp3',
    eh: 'assets/voice/eh.mp3',
    record: 'assets/voice/record.mp3',
    ach_normal: 'assets/voice/ach_normal.mp3',
    ach_rare: 'assets/voice/ach_rare.mp3',
    ach_secret: 'assets/voice/ach_secret.mp3',
  };

  const TEXT_TO_VOICE = {
    '奶娃快跑,冲鸭!': 'start',
    '闪身步!': 'dash',
    '中国人能飞': 'jump',
    '奶蛋出击!': 'slide',
    '相信光!': 'shield',
    '奥利给!': 'sprint',
    '磁吸奶瓶,吸!': 'magnet',
    '666!': 'coins666',
    '豆包老师来了!': 'chaser',
    '遥遥领先!': 'record',
  };

  function trimClip(buffer) {
    const data = buffer.getChannelData(0);
    const sr = buffer.sampleRate;
    let first = 0;
    while (first < data.length && Math.abs(data[first]) < 0.012) first++;
    let last = data.length - 1;
    while (last > first && Math.abs(data[last]) < 0.008) last--;
    const start = Math.max(0, first / sr - 0.01);
    const end = Math.min(buffer.duration, last / sr + 0.03);
    return { buffer, start, duration: Math.max(0.05, end - start) };
  }

  const sys = {
    ctx: null,
    master: null,
    bgmGain: null,
    voiceGain: null,
    muted: initialMuted,
    volume: initialVol,
    lastVolume: initialVol > 0 ? initialVol : 0.85,
    listeners: [],
    noiseBuf: null,
    bgmTimer: null,
    bgmStep: 0,
    bgmNextTime: 0,
    bgmTempo: 1,
    lastSay: {},
    lastAchSfx: 0,
    lastAchVoice: 0,
    achVoiceTimer: null,
    voiceRaw: Object.create(null),
    voiceClips: Object.create(null),
    voiceDecoding: Object.create(null),
    voiceSource: null,
    voicesFetched: false,

    effectiveVolume() {
      return this.muted ? 0 : this.volume;
    },

    icon() {
      const v = this.effectiveVolume();
      if (v <= 0) return '🔇';
      return v < 0.45 ? '🔉' : '🔊';
    },

    onChange(listener) {
      this.listeners.push(listener);
      listener(this);
    },

    notify() {
      for (const listener of this.listeners) listener(this);
    },

    applyGain() {
      if (!this.master || !this.ctx) return;
      this.master.gain.setTargetAtTime(this.effectiveVolume(), this.ctx.currentTime, 0.015);
    },

    prefetchVoices() {
      if (this.voicesFetched) return;
      this.voicesFetched = true;
      for (const [key, url] of Object.entries(VOICE_FILES)) {
        fetch(url)
          .then(res => (res.ok ? res.arrayBuffer() : null))
          .then(buf => {
            if (!buf) return;
            this.voiceRaw[key] = buf;
            if (this.ctx) this.decodeVoice(key);
          })
          .catch(() => {});
      }
    },

    decodeVoice(key) {
      if (!this.ctx || this.voiceClips[key] || this.voiceDecoding[key]) return;
      const raw = this.voiceRaw[key];
      if (!raw) return;
      this.voiceDecoding[key] = true;
      this.ctx.decodeAudioData(raw.slice(0))
        .then(decoded => { this.voiceClips[key] = trimClip(decoded); })
        .catch(() => {})
        .finally(() => { this.voiceDecoding[key] = false; });
    },

    init() {
      this.prefetchVoices();
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        for (const key of Object.keys(this.voiceRaw)) this.decodeVoice(key);
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.effectiveVolume();
      this.master.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.40;
      this.bgmGain.connect(this.master);

      // BGM 空间回声总线（为旋律与琶音增添柔和立体余韵，告别干瘪单音）
      this.bgmEcho = this.ctx.createDelay(0.5);
      this.bgmEcho.delayTime.value = 0.21;
      const echoFilter = this.ctx.createBiquadFilter();
      echoFilter.type = 'lowpass';
      echoFilter.frequency.value = 2100;
      const echoFeedback = this.ctx.createGain();
      echoFeedback.gain.value = 0.22;
      const echoWet = this.ctx.createGain();
      echoWet.gain.value = 0.18;
      this.bgmEcho.connect(echoFilter);
      echoFilter.connect(echoFeedback);
      echoFeedback.connect(this.bgmEcho);
      echoFilter.connect(echoWet);
      echoWet.connect(this.bgmGain);

      this.voiceGain = this.ctx.createGain();
      this.voiceGain.gain.value = 1.35;
      this.voiceGain.connect(this.master);

      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      for (const key of Object.keys(this.voiceRaw)) this.decodeVoice(key);
      this.startBGM();
    },

    stopVoice() {
      if (!this.voiceSource) return;
      try { this.voiceSource.stop(); } catch (e) {}
      this.voiceSource = null;
    },

    setMuted(m) {
      const next = !!m;
      this.muted = next;
      if (!next && this.volume <= 0) {
        this.volume = this.lastVolume > 0 ? this.lastVolume : 0.85;
        safeSet('naiwa-volume', String(this.volume));
      }
      safeSet('naiwa-muted', next ? '1' : '0');
      if (next) {
        if (this.achVoiceTimer) { clearTimeout(this.achVoiceTimer); this.achVoiceTimer = null; }
        this.stopVoice();
      }
      this.applyGain();
      this.notify();
    },

    setVolume(v) {
      const clamped = Math.max(0, Math.min(1, Number(v) || 0));
      this.volume = clamped;
      if (clamped > 0) {
        this.lastVolume = clamped;
        this.muted = false;
      } else {
        this.muted = true;
        if (this.achVoiceTimer) { clearTimeout(this.achVoiceTimer); this.achVoiceTimer = null; }
        this.stopVoice();
      }
      safeSet('naiwa-volume', String(this.volume));
      safeSet('naiwa-muted', this.muted ? '1' : '0');
      this.applyGain();
      this.notify();
    },

    toggleMute() {
      this.setMuted(!this.muted);
    },

    /* ---------- 基础合成器 ---------- */
    tone(freq, dur, type, vol, slideTo, when = 0, vibrato = 0) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      if (vibrato) {
        const lfo = this.ctx.createOscillator();
        const lg = this.ctx.createGain();
        lfo.frequency.value = 18;
        lg.gain.value = vibrato;
        lfo.connect(lg); lg.connect(o.frequency);
        lfo.start(t); lfo.stop(t + dur + 0.02);
      }
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.03);
    },
    // 清脆金属音（基频 + 泛音）
    chime(freq, dur, vol, when = 0) {
      this.tone(freq, dur, 'sine', vol, null, when);
      this.tone(freq * 2, dur * 0.7, 'sine', vol * 0.4, null, when);
      this.tone(freq * 3, dur * 0.4, 'sine', vol * 0.15, null, when);
    },
    noise(dur, vol, freq, when = 0, q = 1) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + when;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(freq, t);
      f.frequency.exponentialRampToValueAtTime(freq * 2.5, t + dur);
      f.Q.value = q;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + dur + 0.02);
    },

    /* ---------- 清脆音效 ---------- */
    coin() { this.chime(1319, 0.08, 0.2); this.chime(1760, 0.16, 0.2, 0.06); },
    jump() { this.tone(220, 0.22, 'sine', 0.22, 760, 0, 30); this.noise(0.12, 0.06, 900); },
    slide() { this.noise(0.3, 0.14, 260, 0, 0.8); this.tone(90, 0.2, 'sine', 0.12, 60); },
    dash() { this.tone(500, 0.1, 'sawtooth', 0.08, 1500); this.noise(0.08, 0.05, 2200); },
    power() {
      [523, 659, 784, 1046].forEach((f, i) => this.chime(f, 0.14, 0.16, i * 0.06));
      this.chime(2093, 0.25, 0.08, 0.24);
    },
    smash() { this.noise(0.18, 0.2, 700, 0, 0.7); this.tone(300, 0.18, 'square', 0.16, 70); },
    crash() {
      [392, 330, 262].forEach((f, i) => this.tone(f, 0.2, 'sawtooth', 0.16, f * 0.85, i * 0.16, 12));
      this.tone(400, 0.3, 'sine', 0.18, 70, 0.5, 20);
      this.noise(0.3, 0.12, 200, 0);
    },
    click() { this.chime(880, 0.06, 0.12); },
    overdriveAlert() {
      if (!this.ctx || this.muted || this.effectiveVolume() <= 0) return;
      this.tone(440, 0.16, 'sawtooth', 0.14, 660, 0);
      this.tone(660, 0.18, 'sawtooth', 0.15, 880, 0.17);
      this.chime(1046, 0.32, 0.18, 0.34);
      this.chime(1319, 0.36, 0.16, 0.42);
    },
    // 4 档分级成就音效（精简至 4–7 个 WebAudio 节点，清脆响亮且零掉帧）
    achievement(tier = 'common') {
      if (!this.ctx || this.muted || this.effectiveVolume() <= 0) return;
      if (tier === 'secret') {
        this.tone(250, 0.13, 'triangle', 0.22, 660, 0);
        this.tone(580, 0.11, 'sine', 0.18, 320, 0.11);
        this.tone(360, 0.14, 'triangle', 0.2, 980, 0.21);
        this.tone(1568, 0.14, 'sine', 0.16, null, 0.32);
        this.tone(2093, 0.26, 'sine', 0.18, null, 0.42);
      } else if (tier === 'legend') {
        const notes = [523, 784, 1046, 1319, 1568, 2093];
        notes.forEach((f, i) => {
          this.tone(f, i === notes.length - 1 ? 0.42 : 0.15, i % 2 ? 'triangle' : 'sine', 0.16, null, i * 0.065);
        });
        this.tone(2637, 0.30, 'sine', 0.10, null, 0.42);
      } else if (tier === 'rare') {
        [[784, 0], [1046, 0.08], [1319, 0.16], [1568, 0.25]].forEach(([f, w], i) => {
          this.tone(f, i === 3 ? 0.34 : 0.13, 'triangle', 0.17, null, w);
        });
        this.tone(2093, 0.26, 'sine', 0.12, null, 0.31);
      } else {
        [1046, 1319, 1568, 2093].forEach((f, i) => {
          this.tone(f, i === 3 ? 0.25 : 0.11, 'sine', 0.15, null, i * 0.055);
        });
      }
    },
    playAchievement(tier = 'common', { withVoice = true, force = false } = {}) {
      if (this.muted || this.effectiveVolume() <= 0) return;
      if (force) this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const now = performance.now();
      if (!force && now - this.lastAchSfx < 180) return;
      this.lastAchSfx = now;
      this.achievement(tier);
      if (!withVoice) return;
      if (!force && now - this.lastAchVoice < 2400) return;
      this.lastAchVoice = now;
      const voiceKey = tier === 'secret' ? 'ach_secret'
        : (tier === 'rare' || tier === 'legend') ? 'ach_rare' : 'ach_normal';
      if (this.achVoiceTimer) clearTimeout(this.achVoiceTimer);
      this.achVoiceTimer = setTimeout(() => {
        this.achVoiceTimer = null;
        if (!this.muted && this.effectiveVolume() > 0) {
          this.playVoice(voiceKey, force ? 0 : 2.0, 1.05);
        }
      }, tier === 'secret' ? 320 : 180);
    },

    /* ---------- 离线自然中文配音 ---------- */
    playVoice(key, cooldown = 0.9, gainScale = 1) {
      if (this.muted || !this.ctx || !this.voiceGain) return;
      const clip = this.voiceClips[key];
      if (!clip) {
        this.decodeVoice(key);
        return;
      }
      const now = performance.now() / 1000;
      if (cooldown > 0 && this.lastSay[key] && now - this.lastSay[key] < cooldown) return;
      this.lastSay[key] = now;
      this.stopVoice();

      const src = this.ctx.createBufferSource();
      src.buffer = clip.buffer;
      const g = this.ctx.createGain();
      g.gain.value = gainScale;
      src.connect(g);
      g.connect(this.voiceGain);
      src.onended = () => { if (this.voiceSource === src) this.voiceSource = null; };
      this.voiceSource = src;
      src.start(0, clip.start, clip.duration);
    },

    say(text, cooldown = 0.9) {
      const key = TEXT_TO_VOICE[text] || text;
      this.playVoice(key, cooldown, 1.0);
    },

    fastSay(text) {
      const key = TEXT_TO_VOICE[text] || text;
      this.playVoice(key, 0.28, 0.92);
    },

    eh() {
      this.playVoice('eh', 0, 1.15);
    },

    /* ---------- 记忆点 BGM（8 小节多轨律动电音：主音合成器 + 和弦律动 + 木琴琶音 + 放克贝斯 + 街机鼓组） ---------- */
    // 128 步（8 小节 × 16 步）：前 4 小节活力主歌（A 段），后 4 小节高燃副歌（B 段）
    LEAD: [
      // Bar 1 (Cmaj7)
      659, 0, 784, 880, 784, 659, 523, 587, 659, 0, 784, 1046, 988, 0, 784, 0,
      // Bar 2 (Am7)
      880, 0, 784, 659, 523, 587, 659, 0, 880, 784, 659, 587, 523, 0, 587, 659,
      // Bar 3 (Fmaj7)
      698, 0, 880, 1046, 880, 784, 698, 659, 587, 0, 698, 880, 784, 0, 659, 0,
      // Bar 4 (G7sus4 -> G7)
      587, 659, 698, 784, 880, 0, 988, 0, 1046, 988, 880, 784, 659, 0, 587, 0,
      // Bar 5 (副歌 Fmaj7 -> G7)
      1046, 0, 988, 880, 784, 0, 659, 784, 880, 0, 1046, 1175, 1046, 0, 880, 0,
      // Bar 6 (副歌 Em7 -> Am7)
      988, 0, 784, 659, 784, 0, 880, 988, 1046, 0, 880, 659, 880, 0, 784, 659,
      // Bar 7 (副歌 Dm7 -> G7)
      698, 784, 880, 0, 587, 659, 698, 0, 784, 880, 988, 1046, 1175, 0, 988, 784,
      // Bar 8 (副歌收尾 Cmaj7 -> G7)
      1046, 0, 784, 659, 523, 0, 587, 659, 784, 880, 784, 659, 523, 0, 587, 659,
    ],
    // 每小节对应的和弦与低音根音（A 段每小节 1 个和弦，B 段副歌每半小节切换和弦推高情绪）
    HARMONY: [
      { bass: [131, 196], chord: [262, 330, 392, 494] }, // Bar 1a: Cmaj7
      { bass: [131, 165], chord: [262, 330, 392, 523] }, // Bar 1b: C6
      { bass: [110, 165], chord: [220, 262, 330, 392] }, // Bar 2a: Am7
      { bass: [110, 147], chord: [220, 262, 330, 440] }, // Bar 2b: Am
      { bass: [175, 220], chord: [262, 349, 440, 523] }, // Bar 3a: Fmaj7
      { bass: [175, 131], chord: [294, 349, 440, 523] }, // Bar 3b: Dm7/F
      { bass: [196, 147], chord: [294, 349, 392, 523] }, // Bar 4a: G7sus4
      { bass: [196, 247], chord: [247, 294, 349, 392] }, // Bar 4b: G7
      { bass: [175, 220], chord: [349, 440, 523, 659] }, // Bar 5a: Fmaj7 (Chorus)
      { bass: [196, 247], chord: [392, 494, 587, 698] }, // Bar 5b: G7
      { bass: [165, 196], chord: [330, 392, 494, 587] }, // Bar 6a: Em7
      { bass: [110, 165], chord: [330, 440, 523, 659] }, // Bar 6b: Am7
      { bass: [147, 175], chord: [294, 349, 440, 523] }, // Bar 7a: Dm7
      { bass: [196, 247], chord: [294, 349, 392, 494] }, // Bar 7b: G7
      { bass: [131, 196], chord: [262, 330, 392, 523] }, // Bar 8a: C
      { bass: [196, 147], chord: [294, 349, 392, 494] }, // Bar 8b: G7 turnaround
    ],

    setBgmTempo(mult = 1) {
      this.bgmTempo = Math.max(0.75, Math.min(1.45, Number(mult) || 1));
    },
    startBGM() {
      if (this.bgmTimer || !this.ctx) return;
      this.bgmNextTime = this.ctx.currentTime + 0.08;
      this.bgmStep = 0;
      this.bgmTimer = setInterval(() => this.scheduleBGM(), 70);
    },
    scheduleBGM() {
      const STEP = 0.142 / this.bgmTempo;
      while (this.bgmNextTime < this.ctx.currentTime + 0.25) {
        const i = this.bgmStep % 128;
        const bar = Math.floor(i / 16);
        const stepInBar = i % 16;
        const halfBar = Math.floor(i / 8);
        const isChorus = bar >= 4;
        const harm = this.HARMONY[halfBar];
        const when = Math.max(0, this.bgmNextTime - this.ctx.currentTime);

        // 1. 温暖主旋律（带滤波器包络与尾音延音判别）
        const m = this.LEAD[i];
        if (m) {
          const nextRest = this.LEAD[(i + 1) % 128] === 0;
          const noteDur = STEP * (nextRest ? 1.75 : 0.92);
          this.bgmLead(m, noteDur, isChorus ? 0.058 : 0.048, when, nextRest);
        }

        // 2. 清脆木琴/风铃琶音（穿插在主旋律缝隙，副歌更灵动饱满）
        if (isChorus || stepInBar % 2 === 0) {
          const arpIdx = (stepInBar + (isChorus ? 1 : 0)) % harm.chord.length;
          const arpFreq = harm.chord[arpIdx] * (isChorus && stepInBar % 4 === 3 ? 2 : 1);
          this.bgmArp(arpFreq, STEP * 0.85, isChorus ? 0.024 : 0.017, when);
        }

        // 3. 反拍温暖电钢琴和弦律动（每拍反拍轻柔垫底）
        if (stepInBar % 4 === 2) {
          this.bgmChord(harm.chord, STEP * 1.9, isChorus ? 0.019 : 0.015, when);
        }

        // 4. 放克八度弹跳贝斯（根音 -> 高八度 -> 五音律动）
        const subStep = stepInBar % 8;
        const [root, fifth] = harm.bass;
        if (subStep === 0) this.bgmBass(root, STEP * 2.4, 0.115, when);
        else if (subStep === 2) this.bgmBass(root * 2, STEP * 1.1, 0.072, when);
        else if (subStep === 3 && isChorus) this.bgmBass(root, STEP * 0.9, 0.068, when);
        else if (subStep === 4) this.bgmBass(fifth, STEP * 2.1, 0.095, when);
        else if (subStep === 6) this.bgmBass(root * 2, STEP * 1.2, 0.075, when);
        else if (subStep === 7) this.bgmBass(fifth, STEP * 0.9, 0.070, when);

        // 5. 街机律动鼓组（底鼓 Kick + 军鼓拍手 Snare + 律动踩镲 Hat + 过门加花）
        if (stepInBar === 0 || stepInBar === 6 || stepInBar === 8 || (isChorus && stepInBar === 10)) {
          this.bgmKick(when);
        }
        const isTurnaroundBar = bar === 3 || bar === 7;
        if (stepInBar === 4 || stepInBar === 12) {
          this.bgmSnare(when, false);
        } else if (isTurnaroundBar && (stepInBar === 14 || stepInBar === 15)) {
          this.bgmSnare(when, true);
        }
        if (stepInBar % 2 === 0 || isChorus) {
          this.bgmHat(when, stepInBar % 4 === 2, stepInBar % 2 === 1);
        }

        this.bgmNextTime += STEP;
        this.bgmStep++;
      }
    },
    bgmLead(freq, dur, vol, when, sustain = false) {
      const t = this.ctx.currentTime + when;
      const o1 = this.ctx.createOscillator();
      const o2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      // 双振荡器微失谐（Sawtooth + Triangle）经过低通滤波包络，音色圆润有弹性
      o1.type = 'sawtooth';
      o2.type = 'triangle';
      o1.frequency.setValueAtTime(freq, t);
      o2.frequency.setValueAtTime(freq * 1.003, t);
      filter.type = 'lowpass';
      filter.Q.value = 1.6;
      filter.frequency.setValueAtTime(Math.min(4800, freq * 4.5), t);
      filter.frequency.exponentialRampToValueAtTime(Math.max(900, freq * 1.7), t + dur);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.012);
      g.gain.setValueAtTime(vol * 0.86, t + dur * 0.45);
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur);

      if (sustain) {
        const lfo = this.ctx.createOscillator();
        const lg = this.ctx.createGain();
        lfo.frequency.value = 6.2;
        lg.gain.value = freq * 0.008;
        lfo.connect(lg);
        lg.connect(o1.frequency);
        lfo.start(t + dur * 0.25);
        lfo.stop(t + dur + 0.02);
      }

      o1.connect(filter);
      o2.connect(filter);
      filter.connect(g);
      g.connect(this.bgmGain);
      if (this.bgmEcho) g.connect(this.bgmEcho);
      o1.start(t); o2.start(t);
      o1.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
    },
    bgmArp(freq, dur, vol, when) {
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
      o.connect(g);
      g.connect(this.bgmGain);
      if (this.bgmEcho) g.connect(this.bgmEcho);
      o.start(t);
      o.stop(t + dur + 0.02);
    },
    bgmChord(notes, dur, vol, when) {
      const t = this.ctx.currentTime + when;
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1950, t);
      filter.frequency.exponentialRampToValueAtTime(820, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      filter.connect(g);
      g.connect(this.bgmGain);
      for (let i = 0; i < 3 && i < notes.length; i++) {
        const o = this.ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(notes[i], t);
        o.connect(filter);
        o.start(t);
        o.stop(t + dur + 0.02);
      }
    },
    bgmBass(freq, dur, vol, when) {
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator();
      const sub = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      sub.type = 'triangle';
      o.frequency.setValueAtTime(freq, t);
      sub.frequency.setValueAtTime(freq, t);
      filter.type = 'lowpass';
      filter.Q.value = 2.0;
      filter.frequency.setValueAtTime(freq * 4.2, t);
      filter.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 1.35), t + dur * 0.85);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.009);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(filter);
      sub.connect(filter);
      filter.connect(g);
      g.connect(this.bgmGain);
      o.start(t); sub.start(t);
      o.stop(t + dur + 0.02); sub.stop(t + dur + 0.02);
    },
    bgmKick(when) {
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(145, t);
      o.frequency.exponentialRampToValueAtTime(44, t + 0.095);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      o.connect(g);
      g.connect(this.bgmGain);
      o.start(t);
      o.stop(t + 0.14);
    },
    bgmSnare(when, fill = false) {
      const t = this.ctx.currentTime + when;
      // 军鼓噪音声部
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(2200, t);
      f.Q.value = 0.9;
      const g = this.ctx.createGain();
      const v = fill ? 0.042 : 0.062;
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (fill ? 0.075 : 0.11));
      src.connect(f); f.connect(g); g.connect(this.bgmGain);
      src.start(t); src.stop(t + 0.12);
      // 军鼓腔体瞬态
      const body = this.ctx.createOscillator();
      const bg = this.ctx.createGain();
      body.type = 'triangle';
      body.frequency.setValueAtTime(210, t);
      body.frequency.exponentialRampToValueAtTime(110, t + 0.055);
      bg.gain.setValueAtTime(fill ? 0.035 : 0.055, t);
      bg.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
      body.connect(bg); bg.connect(this.bgmGain);
      body.start(t); body.stop(t + 0.07);
    },
    bgmHat(when, open, ghost = false) {
      const t = this.ctx.currentTime + when;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 6800;
      const g = this.ctx.createGain();
      const vol = open ? 0.045 : ghost ? 0.014 : 0.024;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.10 : 0.035));
      src.connect(f); f.connect(g); g.connect(this.bgmGain);
      src.start(t); src.stop(t + 0.11);
    },

    duckBGM(ducked) {
      if (!this.ctx || !this.bgmGain) return;
      this.bgmGain.gain.linearRampToValueAtTime(ducked ? 0.1 : 0.40, this.ctx.currentTime + 0.3);
    },

    /* ---------- 首页、局内与暂停界面音量控件绑定 ---------- */
    bindVolumeWidgets() {
      const widgets = Array.from(document.querySelectorAll('[data-volume-widget], [data-volume-inline]'));
      if (!widgets.length) return;

      const closeAll = except => {
        for (const w of widgets) {
          if (w === except) continue;
          const pop = w.querySelector('.volume-popover');
          const trig = w.querySelector('.volume-trigger');
          if (pop) pop.classList.add('hidden');
          if (trig) trig.setAttribute('aria-expanded', 'false');
        }
      };

      for (const w of widgets) {
        const trigger = w.querySelector('.volume-trigger');
        const popover = w.querySelector('.volume-popover');
        const muteBtn = w.querySelector('.volume-mute-btn');
        const slider = w.querySelector('.volume-slider');
        const valueEl = w.querySelector('.volume-value');
        if (!slider) continue;

        const sync = () => {
          const pct = Math.round(this.effectiveVolume() * 100);
          const icon = this.icon();
          if (trigger) trigger.textContent = icon;
          if (muteBtn) muteBtn.textContent = icon;
          slider.value = String(pct);
          slider.style.setProperty('--vol', `${pct}%`);
          if (valueEl) valueEl.textContent = `${pct}%`;
        };
        this.onChange(sync);

        if (trigger && popover) {
          trigger.addEventListener('click', e => {
            e.stopPropagation();
            const opening = popover.classList.contains('hidden');
            closeAll(opening ? w : null);
            popover.classList.toggle('hidden', !opening);
            trigger.setAttribute('aria-expanded', opening ? 'true' : 'false');
          });
          popover.addEventListener('click', e => e.stopPropagation());
        }

        if (muteBtn) {
          muteBtn.addEventListener('click', () => {
            this.toggleMute();
            if (!this.muted) {
              this.init();
              this.click();
            }
          });
        }

        slider.addEventListener('input', () => {
          this.setVolume(Number(slider.value) / 100);
        });

        slider.addEventListener('change', () => {
          if (!this.muted && this.volume > 0) {
            this.init();
            this.click();
          }
        });
      }

      document.addEventListener('pointerdown', e => {
        if (!widgets.some(w => w.contains(e.target))) closeAll(null);
      });
      window.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeAll(null);
      });
    },
  };

  // 页面加载即开始拉取离线配音，点击开跑时可零等待解码。
  sys.prefetchVoices();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => sys.bindVolumeWidgets(), { once: true });
  } else {
    sys.bindVolumeWidgets();
  }
  return sys;
})();
