/* 音频系统：WebAudio 合成清脆音效 + 记忆点 BGM + 中文热梗语音 */
const AudioSys = {
  ctx: null,
  master: null,
  bgmGain: null,
  muted: localStorage.getItem('naiba-muted') === '1',
  noiseBuf: null,
  bgmTimer: null,
  bgmStep: 0,
  bgmNextTime: 0,
  lastSay: {},
  zhVoice: null,
  ehFile: null,
  ehFileReady: false,

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.42;
    this.bgmGain.connect(this.master);

    // 魔性"饿~"使用下方合成器，不依赖外部音频文件（避免 404）

    const len = this.ctx.sampleRate * 0.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    if (window.speechSynthesis) {
      this.pickVoice();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.pickVoice();
      }
    }
    this.startBGM();
  },

  pickVoice() {
    if (!window.speechSynthesis) return;
    const voices = speechSynthesis.getVoices();
    this.zhVoice =
      voices.find(v => /zh[-_]CN/i.test(v.lang) && /Xiaoxiao|Yunxi|Huihui|Yaoyao|Kangkang|female/i.test(v.name)) ||
      voices.find(v => /zh[-_]CN/i.test(v.lang)) ||
      voices.find(v => /^zh/i.test(v.lang)) || null;
  },

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('naiba-muted', m ? '1' : '0');
    if (this.master) this.master.gain.value = m ? 0 : 1;
    if (m && window.speechSynthesis) speechSynthesis.cancel();
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
    // 搞怪"哇哇哇"下行 + 弹簧收尾
    [392, 330, 262].forEach((f, i) => this.tone(f, 0.2, 'sawtooth', 0.16, f * 0.85, i * 0.16, 12));
    this.tone(400, 0.3, 'sine', 0.18, 70, 0.5, 20);
    this.noise(0.3, 0.12, 200, 0);
  },
  click() { this.chime(880, 0.06, 0.12); },

  /* ---------- 热梗语音 ---------- */
  say(text, cooldown = 0.9) {
    if (this.muted || !window.speechSynthesis) return;
    const now = performance.now() / 1000;
    if (this.lastSay[text] && now - this.lastSay[text] < cooldown) return;
    this.lastSay[text] = now;
    if (speechSynthesis.speaking) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    if (this.zhVoice) u.voice = this.zhVoice;
    u.pitch = 1.7;
    u.rate = 1.25;
    u.volume = 1;
    speechSynthesis.speak(u);
  },

  /* 操作语音：更快语速 + 更短冷却，跟上快速连续操作 */
  fastSay(text) {
    if (this.muted || !window.speechSynthesis) return;
    const now = performance.now() / 1000;
    if (this.lastSay[text] && now - this.lastSay[text] < 0.3) return;
    this.lastSay[text] = now;
    if (speechSynthesis.speaking) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    if (this.zhVoice) u.voice = this.zhVoice;
    u.pitch = 1.6;
    u.rate = 1.9;
    u.volume = 1;
    speechSynthesis.speak(u);
  },

  /* 魔性"饿~"：共振峰人声合成（更长、带抖音下滑，约 1.1s） */
  eh() {
    if (this.muted) return;
    // 用户提供了原声文件则直接播放
    if (this.ehFileReady && this.ehFile) {
      try { this.ehFile.currentTime = 0; this.ehFile.play().catch(() => {}); return; } catch (e) {}
    }
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const dur = 1.1;
    // 声门源（锯齿波 + 抖音 + 下滑音高）
    const src = this.ctx.createOscillator();
    src.type = 'sawtooth';
    src.frequency.setValueAtTime(360, t0);
    src.frequency.exponentialRampToValueAtTime(330, t0 + 0.15);
    src.frequency.exponentialRampToValueAtTime(250, t0 + dur);
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 6;
    const lg = this.ctx.createGain(); lg.gain.value = 18;
    lfo.connect(lg); lg.connect(src.frequency);
    lfo.start(t0); lfo.stop(t0 + dur);
    // 共振峰（元音"饿"的 F1/F2/F3）
    const mix = this.ctx.createGain(); mix.gain.value = 1;
    [[550, 8, 1.0], [1500, 9, 0.5], [2800, 10, 0.2]].forEach(([f, q, g]) => {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const gg = this.ctx.createGain(); gg.gain.value = g;
      src.connect(bp); bp.connect(gg); gg.connect(mix);
    });
    // 包络
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(0.55, t0 + 0.08);
    env.gain.setValueAtTime(0.55, t0 + dur - 0.25);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    mix.connect(env); env.connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.02);
    // 尾部一点气声
    this.noise(0.3, 0.05, 1200, dur - 0.3);
  },

  /* ---------- 记忆点 BGM（活泼 chiptune 循环） ---------- */
  LEAD: [
    523, 0, 659, 784, 880, 0, 784, 659,
    587, 0, 698, 880, 1046, 0, 880, 784,
    659, 784, 659, 523, 587, 0, 659, 587,
    523, 0, 587, 659, 523, 0, 0, 0,
  ],
  BASS: [131, 165, 196, 165, 147, 175, 196, 165],

  startBGM() {
    if (this.bgmTimer || !this.ctx) return;
    this.bgmNextTime = this.ctx.currentTime + 0.1;
    this.bgmStep = 0;
    this.bgmTimer = setInterval(() => this.scheduleBGM(), 80);
  },
  scheduleBGM() {
    const STEP = 0.15;
    while (this.bgmNextTime < this.ctx.currentTime + 0.25) {
      const i = this.bgmStep % 32;
      const when = this.bgmNextTime - this.ctx.currentTime;
      const m = this.LEAD[i];
      if (m) this.bgmNote(m, STEP * 0.95, 'square', 0.05, when);
      if (i % 4 === 0) this.bgmNote(this.BASS[(i / 4) % 8], STEP * 3.5, 'triangle', 0.1, when);
      if (i % 2 === 0) this.bgmHat(when, i % 8 === 4);
      this.bgmNextTime += STEP;
      this.bgmStep++;
    }
  },
  bgmNote(freq, dur, type, vol, when) {
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.setValueAtTime(vol, t + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.bgmGain);
    o.start(t); o.stop(t + dur + 0.02);
  },
  bgmHat(when, open) {
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(open ? 0.06 : 0.03, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.12 : 0.04));
    src.connect(f); f.connect(g); g.connect(this.bgmGain);
    src.start(t); src.stop(t + 0.13);
  },

  duckBGM(ducked) {
    if (!this.ctx || !this.bgmGain) return;
    this.bgmGain.gain.linearRampToValueAtTime(ducked ? 0.1 : 0.42, this.ctx.currentTime + 0.3);
  },
};