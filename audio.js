/* 音频系统：WebAudio 合成清脆音效 + 记忆点 BGM + 离线中文神经语音 */
const AudioSys = (() => {
  const savedVol = parseFloat(localStorage.getItem('naiwa-volume'));
  const initialVol = Number.isFinite(savedVol) ? Math.max(0, Math.min(1, savedVol)) : 0.85;
  const initialMuted = localStorage.getItem('naiwa-muted') === '1' || initialVol === 0;

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
    lastSay: {},
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
        localStorage.setItem('naiwa-volume', String(this.volume));
      }
      localStorage.setItem('naiwa-muted', next ? '1' : '0');
      if (next) this.stopVoice();
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
        this.stopVoice();
      }
      localStorage.setItem('naiwa-volume', String(this.volume));
      localStorage.setItem('naiwa-muted', this.muted ? '1' : '0');
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
