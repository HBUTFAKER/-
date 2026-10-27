// 音频层：音乐与音效全部用 WebAudio 现场合成，不加载任何音频文件（零依赖、双击即响）。
// 挂在 XY.Audio。没有 AudioContext 的环境（node --test / 老浏览器）自动退化为空操作。
(function (root) {
  const XY = (root.XY = root.XY || {});
  const PREF_KEY = 'xiyou_audio_v1';

  // 半音 → 频率
  function hz(base, semi) { return base * Math.pow(2, semi / 12); }

  const A = (XY.Audio = {
    ctx: null, ready: false, muted: false,
    master: null, musicBus: null, sfxBus: null,
    scene: null, _step: 0, _next: 0, _timer: null, _inited: false,
    _noise: null, _lastSfx: {}, _duck: 1,
    _musicVol: 0.5, _sfxVol: 0.75,
    noteCount: 0, sfxCount: 0,
  });

  // ===== 偏好 =====
  A.loadPrefs = function () {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(PREF_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d && typeof d === 'object') {
        this.muted = !!d.muted;
        if (Number.isFinite(d.music)) this._musicVol = Math.max(0, Math.min(1, d.music));
        if (Number.isFinite(d.sfx)) this._sfxVol = Math.max(0, Math.min(1, d.sfx));
      }
    } catch (e) { /* 忽略 */ }
  };
  A.savePrefs = function () {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(PREF_KEY, JSON.stringify({ muted: this.muted, music: this._musicVol, sfx: this._sfxVol }));
    } catch (e) { /* 忽略 */ }
  };

  // ===== 初始化 / 解锁（浏览器要求先有用户手势）=====
  A.init = function () {
    if (this._inited) return;
    this._inited = true;
    this.loadPrefs();
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    const unlock = () => { this.unlock(); };
    const targets = [window];
    if (typeof document !== 'undefined' && document && document.addEventListener) targets.push(document);
    for (const t of targets) {
      try {
        t.addEventListener('keydown', unlock, true);
        t.addEventListener('pointerdown', unlock, true);
        t.addEventListener('touchstart', unlock, true);
      } catch (e) { /* 桩环境忽略 */ }
    }
  };

  A.ensure = function () {
    if (this.ctx) return this.ctx;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try {
      const c = new AC();
      this.ctx = c;
      this.master = c.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(c.destination);
      this.musicBus = c.createGain();
      this.musicBus.gain.value = this._musicVol;
      this.musicBus.connect(this.master);
      this.sfxBus = c.createGain();
      this.sfxBus.gain.value = this._sfxVol;
      this.sfxBus.connect(this.master);
      this._noise = this.makeNoise(c);
      this.ready = true;
    } catch (e) {
      this.ctx = null; this.ready = false;
    }
    return this.ctx;
  };

  A.unlock = function () {
    this.ensure();
    const c = this.ctx;
    if (!c) return;
    try {
      if (c.state === 'suspended' && c.resume) c.resume();
    } catch (e) { /* 忽略 */ }
    this.startScheduler();
    if (this.scene) this.music(this.scene, true);
  };

  A.startScheduler = function () {
    if (this._timer || typeof setInterval === 'undefined') return;
    this._timer = setInterval(() => { this.tick(); }, 25);
    if (this._timer && this._timer.unref) this._timer.unref();   // node 测试里不拖住进程
  };

  A.makeNoise = function (c) {
    try {
      const len = Math.floor((c.sampleRate || 44100) * 0.7);
      const buf = c.createBuffer(1, len, c.sampleRate || 44100);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    } catch (e) { return null; }
  };

  // ===== 合成基元 =====
  function ramp(param, when, attack, dur, peak) {
    try {
      param.setValueAtTime(0.0001, when);
      param.linearRampToValueAtTime(peak, when + attack);
      param.exponentialRampToValueAtTime(0.0001, when + attack + dur);
    } catch (e) { /* 忽略 */ }
  }

  function blip(c, dest, when, opt) {
    if (!dest) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = opt.type || 'sine';
    const f0 = Math.max(20, opt.f0);
    o.frequency.setValueAtTime(f0, when);
    if (opt.f1 && opt.f1 !== opt.f0) {
      try { o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.f1), when + (opt.glide || opt.dur)); } catch (e) { /* 忽略 */ }
    }
    ramp(g.gain, when, opt.a || 0.008, opt.dur, opt.gain == null ? 0.15 : opt.gain);
    o.connect(g);
    let node = g;
    if (opt.filter) {
      const f = c.createBiquadFilter();
      f.type = opt.filter.type || 'lowpass';
      f.frequency.setValueAtTime(opt.filter.freq || 1200, when);
      if (opt.filter.q) { try { f.Q.value = opt.filter.q; } catch (e) { /* 忽略 */ } }
      g.connect(f); node = f;
    }
    node.connect(dest);
    try { o.start(when); o.stop(when + (opt.a || 0.008) + opt.dur + 0.03); } catch (e) { /* 忽略 */ }
  }

  function noise(c, dest, when, dur, gain, type, freq, q, freqEnd) {
    if (!dest || !A._noise) return;
    const src = c.createBufferSource();
    src.buffer = A._noise;
    const f = c.createBiquadFilter();
    f.type = type || 'bandpass';
    f.frequency.setValueAtTime(freq || 1200, when);
    if (freqEnd) { try { f.frequency.exponentialRampToValueAtTime(freqEnd, when + dur); } catch (e) { /* 忽略 */ } }
    try { f.Q.value = q || 1; } catch (e) { /* 忽略 */ }
    const g = c.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0004, when + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    try { src.start(when); src.stop(when + dur + 0.02); } catch (e) { /* 忽略 */ }
  }

  // 拨弦：三角波主体 + 一点正弦泛音，快起快落，像古筝/琵琶
  function pluck(c, dest, when, f, dur, gain) {
    blip(c, dest, when, { type: 'triangle', f0: f, dur: dur, gain: gain, a: 0.006, filter: { type: 'lowpass', freq: Math.min(6000, f * 8) } });
    blip(c, dest, when, { type: 'sine', f0: f * 2, dur: dur * 0.55, gain: gain * 0.35, a: 0.004 });
  }
  // 钟/磬：正弦 + 两个非整数泛音，尾音长
  function bell(c, dest, when, f, dur, gain) {
    blip(c, dest, when, { type: 'sine', f0: f, dur: dur, gain: gain, a: 0.008 });
    blip(c, dest, when, { type: 'sine', f0: f * 2.76, dur: dur * 0.6, gain: gain * 0.22, a: 0.006 });
    blip(c, dest, when, { type: 'sine', f0: f * 5.4, dur: dur * 0.3, gain: gain * 0.09, a: 0.004 });
  }
  // 低音：正弦打底 + 低通方波给一点齿音
  function bass(c, dest, when, f, dur, gain) {
    blip(c, dest, when, { type: 'sine', f0: f, dur: dur, gain: gain, a: 0.01 });
    blip(c, dest, when, { type: 'square', f0: f, dur: dur * 0.8, gain: gain * 0.18, a: 0.01, filter: { type: 'lowpass', freq: 320 } });
  }
  // 长音铺底：两只略微失谐的三角波 + 慢起音
  function pad(c, dest, when, f, dur, gain) {
    for (const det of [-0.06, 0.06]) {
      const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f * (1 + det / 12), when);
      lp.type = 'lowpass'; try { lp.frequency.value = 900; } catch (e) { /* 忽略 */ }
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(gain, when + Math.min(0.6, dur * 0.35));
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
      o.connect(lp); lp.connect(g); g.connect(dest);
      try { o.start(when); o.stop(when + dur + 0.05); } catch (e) { /* 忽略 */ }
    }
  }
  function kick(c, dest, when, gain) {
    blip(c, dest, when, { type: 'sine', f0: 150, f1: 44, glide: 0.1, dur: 0.2, gain: gain == null ? 0.5 : gain, a: 0.004 });
  }
  function snare(c, dest, when, gain) {
    noise(c, dest, when, 0.16, (gain == null ? 0.22 : gain), 'bandpass', 1900, 0.9, 900);
    blip(c, dest, when, { type: 'triangle', f0: 220, f1: 130, dur: 0.09, gain: 0.1 });
  }
  function hat(c, dest, when, gain) {
    noise(c, dest, when, 0.045, gain == null ? 0.1 : gain, 'highpass', 7600, 0.7);
  }
  function anvil(c, dest, when, gain) {
    noise(c, dest, when, 0.09, 0.16 * (gain || 1), 'bandpass', 3400, 2.4);
    bell(c, dest, when, 1680, 0.32, 0.1 * (gain || 1));
    kick(c, dest, when, 0.18 * (gain || 1));
  }

  // ===== 曲目：每关/每界面一首，五声音阶，循环 32 个十六分音符 =====
  const TRACKS = {
    // 天宫序曲：慢、空、庄严 —— 主菜单 / 选角 / 过场
    title: {
      bpm: 70, steps: 32, root: 73.42, leadType: 'bell',
      drums: 'k.......h.......k.......h.....h.',
      bass: { 0: 0, 8: 0, 16: 7, 24: 5 },
      lead: { 4: 17, 8: 15, 12: 12, 20: 19, 24: 17, 28: 12 },
      pad: { 0: [0, 7], 16: [3, 10] },
      gains: { lead: 0.1, bass: 0.2, pad: 0.05 },
    },
    // 战鼓：快、密、紧张 —— 战斗
    battle: {
      bpm: 140, steps: 32, root: 73.42, leadType: 'pluck',
      drums: 'k.h.s.h.k.hks.hhk.h.s.h.k.khs.h.',
      bass: { 0: 0, 3: 0, 6: 3, 8: 0, 11: 0, 14: 5, 16: 0, 19: 0, 22: 3, 24: 7, 28: 5 },
      lead: { 0: 12, 2: 15, 4: 12, 6: 19, 8: 24, 10: 19, 12: 15, 14: 12,
        16: 12, 18: 15, 20: 12, 22: 19, 24: 27, 26: 24, 28: 19, 30: 15 },
      pad: { 0: [0, 3], 16: [5, 8] },
      gains: { lead: 0.07, bass: 0.24, pad: 0.04 },
    },
    // 集市：轻快、跳跃 —— 商店
    shop: {
      bpm: 106, steps: 32, root: 146.83, leadType: 'pluck',
      drums: '..h...h...h...h...h...h...h..h.h',
      bass: { 0: 0, 4: 4, 8: 7, 12: 4, 16: 0, 20: 4, 24: 9, 28: 7 },
      lead: { 2: 12, 6: 16, 10: 19, 14: 16, 18: 12, 22: 16, 26: 19, 30: 21 },
      pad: { 0: [0, 7], 16: [5, 12] },
      gains: { lead: 0.085, bass: 0.16, pad: 0.03 },
    },
    // 铁砧：沉稳的节拍 + 打铁声 —— 锻造坊
    craft: {
      bpm: 94, steps: 32, root: 73.42, leadType: 'pluck',
      drums: 'k...k...k...k...k...k...k...k...',
      anvil: { 0: 1, 6: 0.55, 12: 0.9, 20: 0.75, 26: 0.5 },
      bass: { 0: 0, 8: 0, 16: 3, 24: 5 },
      lead: { 4: 12, 12: 15, 20: 12, 28: 10 },
      pad: { 0: [0], 16: [3] },
      gains: { lead: 0.07, bass: 0.2, pad: 0.035 },
    },
    // 参悟：极慢、空灵 —— 技能升级
    skill: {
      bpm: 56, steps: 32, root: 146.83, leadType: 'bell',
      drums: '',
      bass: { 0: 0, 16: 5 },
      lead: { 0: 12, 6: 19, 10: 24, 16: 17, 22: 15, 26: 12 },
      pad: { 0: [0, 7, 12], 16: [5, 12, 17] },
      gains: { lead: 0.085, bass: 0.12, pad: 0.05 },
    },
    // 凯歌：明亮、上扬 —— 通关结算
    clear: {
      bpm: 112, steps: 32, root: 146.83, leadType: 'bell',
      drums: 'k.h.k.h.k.h.khhhk.h.k.h.k.h.k.h',
      bass: { 0: 0, 8: 0, 16: 5, 24: 7 },
      lead: { 0: 12, 2: 16, 4: 19, 6: 24, 8: 19, 10: 24, 12: 28,
        16: 19, 18: 23, 20: 26, 22: 31, 24: 28, 28: 24 },
      pad: { 0: [0, 7, 12], 16: [5, 12, 17] },
      gains: { lead: 0.1, bass: 0.2, pad: 0.04 },
    },
    // 落败：低沉、下行
    defeat: {
      bpm: 62, steps: 16, root: 73.42, leadType: 'bell',
      drums: '',
      bass: { 0: 0, 4: 0, 8: -2, 12: -5 },
      lead: { 2: 12, 6: 10, 10: 7, 14: 3 },
      pad: { 0: [0, 3], 8: [-2, 2] },
      gains: { lead: 0.09, bass: 0.18, pad: 0.045 },
    },
  };
  A.tracks = TRACKS;

  A.scheduleStep = function (track, s, when) {
    const c = this.ctx, dest = this.musicBus;
    if (!c || !dest) return;
    const g = track.gains || {};
    // 鼓
    const dch = track.drums && track.drums[s];
    if (dch === 'k') kick(c, dest, when, 0.42);
    else if (dch === 's') snare(c, dest, when, 0.2);
    else if (dch === 'h') hat(c, dest, when, 0.085);
    // 铁砧
    if (track.anvil && track.anvil[s] != null) anvil(c, dest, when, track.anvil[s]);
    // 低音
    if (track.bass && track.bass[s] != null) bass(c, dest, when, hz(track.root, track.bass[s]), 0.24, g.bass || 0.18);
    // 旋律
    if (track.lead && track.lead[s] != null) {
      const f = hz(track.root, track.lead[s] + 12);
      if (track.leadType === 'bell') bell(c, dest, when, f, 0.55, g.lead || 0.09);
      else pluck(c, dest, when, f, 0.2, g.lead || 0.09);
    }
    // 铺底：每个和弦起点铺满整段
    if (track.pad && track.pad[s]) {
      const bar = track.steps / 2;
      for (const semi of track.pad[s]) pad(c, dest, when, hz(track.root, semi + 12), (60 / track.bpm) * 4 * (bar / 8), g.pad || 0.04);
    }
    this.noteCount++;
  };

  A.tick = function () {
    const c = this.ctx;
    if (!c || !this.ready) return;
    const track = TRACKS[this.scene || 'title'];
    if (!track) return;
    const spb = 60 / track.bpm / 4;
    if (!this._next) this._next = c.currentTime + 0.08;
    let guard = 0;
    while (this._next < c.currentTime + 0.22 && guard++ < 32) {
      this.scheduleStep(track, this._step % track.steps, this._next);
      this._next += spb;
      this._step++;
    }
  };

  // 切歌：同名不重复触发；换曲时做一次轻微"呼吸"淡入
  A.music = function (name, force) {
    if (!name) return;
    if (this.scene === name && !force) return;
    this.scene = name;
    this._step = 0;
    this._next = 0;
    if (!this.ready || !this.musicBus || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const gain = this.musicBus.gain;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
      gain.linearRampToValueAtTime(0.0001, now + 0.16);
      gain.linearRampToValueAtTime(this._musicVol * this._duck, now + 0.85);
    } catch (e) { /* 忽略 */ }
  };

  // 暂停时压低音乐，不掐断
  A.duck = function (v) {
    const next = Math.max(0, Math.min(1, v == null ? 1 : v));
    if (Math.abs(next - this._duck) < 0.01) return;
    this._duck = next;
    if (!this.ready || !this.musicBus || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.linearRampToValueAtTime(this._musicVol * next, now + 0.4);
    } catch (e) { /* 忽略 */ }
  };

  A.toggleMute = function () {
    this.muted = !this.muted;
    if (this.ready && this.master && this.ctx) {
      try { this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime + 0.25); } catch (e) { /* 忽略 */ }
    }
    this.savePrefs();
    return !this.muted;
  };

  // ===== 音效 =====
  const SFX = {
    ui(c, t, d) { blip(c, d, t, { type: 'triangle', f0: 660, f1: 880, dur: 0.06, gain: 0.1 }); },
    confirm(c, t, d) {
      blip(c, d, t, { type: 'triangle', f0: 520, f1: 780, dur: 0.08, gain: 0.13 });
      blip(c, d, t + 0.06, { type: 'triangle', f0: 1040, dur: 0.1, gain: 0.1 });
    },
    open(c, t, d) { noise(c, d, t, 0.18, 0.1, 'bandpass', 500, 1.1, 2200); },
    deny(c, t, d) { blip(c, d, t, { type: 'square', f0: 190, f1: 120, dur: 0.16, gain: 0.1, filter: { type: 'lowpass', freq: 800 } }); },
    swing(c, t, d) {
      noise(c, d, t, 0.11, 0.13, 'bandpass', 900, 1.2, 2800);
      blip(c, d, t, { type: 'sine', f0: 400, f1: 170, dur: 0.09, gain: 0.05 });
    },
    swingHeavy(c, t, d) {
      noise(c, d, t, 0.19, 0.18, 'bandpass', 600, 1.4, 2200);
      blip(c, d, t, { type: 'triangle', f0: 260, f1: 110, dur: 0.16, gain: 0.1 });
    },
    hit(c, t, d) {
      blip(c, d, t, { type: 'sine', f0: 175, f1: 58, glide: 0.07, dur: 0.12, gain: 0.36 });
      noise(c, d, t, 0.07, 0.26, 'bandpass', 1500, 0.9, 700);
    },
    crit(c, t, d) {
      blip(c, d, t, { type: 'sine', f0: 210, f1: 64, glide: 0.08, dur: 0.16, gain: 0.4 });
      noise(c, d, t, 0.09, 0.3, 'bandpass', 2400, 1.1, 900);
      bell(c, d, t + 0.01, 2100, 0.22, 0.1);
    },
    hurt(c, t, d) {
      blip(c, d, t, { type: 'sawtooth', f0: 330, f1: 90, dur: 0.28, gain: 0.2, filter: { type: 'lowpass', freq: 1300 } });
      noise(c, d, t, 0.16, 0.18, 'lowpass', 1000, 0.9, 300);
    },
    jump(c, t, d) { blip(c, d, t, { type: 'triangle', f0: 300, f1: 620, dur: 0.13, gain: 0.09 }); },
    doubleJump(c, t, d) {
      blip(c, d, t, { type: 'triangle', f0: 520, f1: 1080, dur: 0.16, gain: 0.1 });
      bell(c, d, t + 0.03, 1560, 0.2, 0.06);
    },
    dash(c, t, d) { noise(c, d, t, 0.24, 0.16, 'bandpass', 380, 1.4, 2600); },
    throw(c, t, d) { noise(c, d, t, 0.32, 0.13, 'bandpass', 520, 2.2, 1800); },
    smash(c, t, d) {
      kick(c, d, t, 0.5);
      noise(c, d, t, 0.34, 0.3, 'lowpass', 700, 0.8, 160);
      bell(c, d, t + 0.02, 620, 0.4, 0.06);
    },
    aoe(c, t, d) {
      noise(c, d, t, 0.28, 0.16, 'bandpass', 300, 1.6, 1800);
      bell(c, d, t + 0.02, 880, 0.3, 0.07);
    },
    shoot(c, t, d) { blip(c, d, t, { type: 'square', f0: 920, f1: 420, dur: 0.12, gain: 0.09, filter: { type: 'lowpass', freq: 2400 } }); },
    land(c, t, d) { noise(c, d, t, 0.09, 0.16, 'lowpass', 520, 0.9); },
    coin(c, t, d) {
      bell(c, d, t, 1046, 0.18, 0.09);
      bell(c, d, t + 0.07, 1568, 0.2, 0.07);
    },
    jade(c, t, d) {
      bell(c, d, t, 1318, 0.3, 0.09);
      bell(c, d, t + 0.08, 1976, 0.32, 0.06);
    },
    item(c, t, d) {
      bell(c, d, t, 880, 0.22, 0.08);
      bell(c, d, t + 0.06, 1320, 0.22, 0.06);
    },
    levelup(c, t, d) {
      const notes = [523, 659, 784, 1046];
      for (let i = 0; i < notes.length; i++) bell(c, d, t + i * 0.075, notes[i], 0.45, 0.11);
    },
    buy(c, t, d) {
      blip(c, d, t, { type: 'square', f0: 880, dur: 0.05, gain: 0.08, filter: { type: 'lowpass', freq: 2600 } });
      blip(c, d, t + 0.06, { type: 'square', f0: 1174, dur: 0.08, gain: 0.08, filter: { type: 'lowpass', freq: 3000 } });
    },
    forge(c, t, d) {
      anvil(c, d, t, 1.1);
      noise(c, d, t + 0.02, 0.22, 0.12, 'highpass', 4200, 0.7);
    },
    heal(c, t, d) {
      const notes = [392, 523, 659];
      for (let i = 0; i < notes.length; i++) blip(c, d, t + i * 0.06, { type: 'sine', f0: notes[i], dur: 0.4, gain: 0.07 });
    },
    treasure(c, t, d) {
      noise(c, d, t, 0.2, 0.1, 'bandpass', 700, 1.2, 3000);
      const notes = [784, 1046, 1318, 1568];
      for (let i = 0; i < notes.length; i++) bell(c, d, t + 0.04 + i * 0.055, notes[i], 0.35, 0.06);
    },
    clear(c, t, d) {
      const notes = [523, 659, 784, 1046, 1318];
      for (let i = 0; i < notes.length; i++) bell(c, d, t + i * 0.1, notes[i], 0.6, 0.1);
      kick(c, d, t, 0.35);
    },
    gameover(c, t, d) {
      const notes = [392, 330, 262, 196];
      for (let i = 0; i < notes.length; i++) bell(c, d, t + i * 0.22, notes[i], 0.7, 0.09);
    },
    boss(c, t, d) {
      blip(c, d, t, { type: 'sawtooth', f0: 110, f1: 46, dur: 0.7, gain: 0.2, filter: { type: 'lowpass', freq: 700 } });
      noise(c, d, t, 0.5, 0.18, 'lowpass', 600, 0.8, 120);
    },
  };
  A.SFX = SFX;

  A.sfx = function (name) {
    if (this.muted) return;
    const c = this.ready ? this.ctx : this.ensure();
    if (!c || !this.sfxBus) return;
    if (c.state === 'suspended') return;             // 还没解锁：不排队，避免解锁瞬间一串爆音
    const now = c.currentTime;
    const last = this._lastSfx[name] || -9;
    if (now - last < 0.035) return;                   // 同名音效节流，连击时不糊
    this._lastSfx[name] = now;
    const fn = SFX[name];
    if (!fn) return;
    try { fn(c, now, this.sfxBus); this.sfxCount++; } catch (e) { /* 单个音效失败不影响游戏 */ }
  };

  function boot() { A.init(); }
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = XY;
})(typeof window !== 'undefined' ? window : globalThis);
