// 音频与过关流程门禁：不同界面切不同曲子 / 音效可触发且不崩 / 通关结算菜单可用 / 挨打动作有姿态
const test = require('node:test');
const assert = require('node:assert');

global.window = { addEventListener() {}, requestAnimationFrame() {}, focus() {} };
global.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] == null ? null : this._d[k]; },
  setItem(k, v) { this._d[k] = v; },
  removeItem(k) { delete this._d[k]; },
};

const XY = require('../src/data.js');
require('../src/logic.js');
require('../src/audio.js');
require('../src/art.js');
require('../src/fx.js');
require('../src/scenery.js');
require('../src/engine.js');
require('../src/ui.js');
require('../src/game.js');

// 宽松绘图桩：只保证"能画完"，逻辑在 render.test.js 里另有严格门禁
const ctx = new Proxy({}, {
  get(_t, p) {
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
    if (p === 'measureText') return (s) => ({ width: String(s).length * 8 });
    return () => {};
  },
});
const canvas = { width: 960, height: 540, getContext: () => ctx, addEventListener() {}, focus() {} };

function tap(code) { XY.Input.setVirtual(code, true); XY.Input.setVirtual(code, false); }
function step(g, dt) { g.update(dt === undefined ? 0.016 : dt); XY.Input.endFrame(); }
function fresh() {
  XY.Input.clearVirtual(); XY.Input.endFrame();
  global.localStorage._d = {};
  return new XY.Game(canvas);
}
function run(g, idx) {
  g.charIndex = 0;
  g.initRun();
  g.startLevel(idx || 0);
  g.now = 4000;
  return g;
}
// 现在每一关都有首领，通关条件是把它打掉（不再靠走到旗子）
function clearLevel(g) {
  for (const e of g.level.enemies) if (e.isBoss) e.alive = false;
  step(g);
}
function resetAudio() {
  const A = XY.Audio;
  if (A._timer) { clearInterval(A._timer); A._timer = null; }
  A.ctx = null; A.ready = false;
  A.master = null; A.musicBus = null; A.sfxBus = null;
  A.scene = null; A._next = 0; A._step = 0; A._lastSfx = {};
  A.noteCount = 0; A.sfxCount = 0;
}

// ===== 关卡结算菜单 =====
test.it('走到终点即进入过关结算，五个选项齐全且发放仙玉', () => {
  const g = run(fresh());
  const jade0 = g.jade;
  clearLevel(g);
  assert.strictEqual(g.state, 'levelClear', '通关后应停在结算界面，而不是直接切下一关');
  assert.ok(g.clearStats && g.clearStats.name === XY.LEVELS[0].name, '结算应记录关卡名');
  assert.ok(g.clearStats.total >= 1, '结算应记录本关妖物总数');
  const ids = g.clearOptions().map((o) => o.id);
  assert.deepStrictEqual(ids, ['next', 'levels', 'shop', 'craft', 'skillup', 'title'], '结算菜单选项应为 下一关/关卡选择/商店/锻造/参悟/主菜单');
  assert.ok(g.jade > jade0, '过关应发放仙玉，实际 ' + jade0 + ' → ' + g.jade);
  g.render();   // 结算界面必须能画
});

test.it('结算菜单：可跳商店/锻造/参悟，Esc 原路返回结算而不是回到战斗', () => {
  const g = run(fresh());
  clearLevel(g);
  assert.strictEqual(g.state, 'levelClear');

  for (const [key, want] of [['KeyG', 'shop'], ['KeyL', 'craft'], ['KeyH', 'skillup']]) {
    tap(key); step(g);
    assert.strictEqual(g.state, want, key + ' 应进入 ' + want);
    tap('Escape'); step(g);
    assert.strictEqual(g.state, 'levelClear', want + ' 按 Esc 应回到结算界面');
  }
});

test.it('结算菜单：下一关进入新关卡前情，最后一关是「完成取经」→ win', () => {
  const g = run(fresh());
  clearLevel(g);
  g.clearIndex = 0;
  tap('Enter'); step(g);
  assert.strictEqual(g.state, 'levelIntro', '下一关应先播关卡前情');
  assert.strictEqual(g.levelIndex, 1, '关卡序号应前进');
  assert.strictEqual(g.persist.levelReached, 1, '进度应存档');

  // 最后一关：击败首领后结算，选项变成「完成取经」
  const g2 = fresh();
  g2.charIndex = 0; g2.initRun();
  const last = XY.LEVELS.length - 1;
  g2.startLevel(last);
  g2.now = 5000;
  const boss = g2.level.enemies.find((e) => e.isBoss);
  g2.killEnemy(boss);
  step(g2);
  assert.strictEqual(g2.state, 'levelClear');
  assert.strictEqual(g2.clearOptions()[0].name, '完成取经');
  g2.clearIndex = 0;
  tap('Enter'); step(g2);
  assert.strictEqual(g2.state, 'win', '最后一关结算应进入通关结局');
});

test.it('返回主菜单：结算里选主菜单会回到标题页', () => {
  const g = run(fresh());
  clearLevel(g);
  g.clearIndex = g.clearOptions().length - 1;
  g.render();
  tap('Enter'); step(g);
  assert.strictEqual(g.state, 'title');
});

// ===== 挨打动作 =====
test.it('玩家挨打会进入受击姿态（后仰），320ms 后恢复', () => {
  const g = run(fresh());
  g.now = 6000;
  g.player.invuln = 0;
  g.hurtPlayer(12);
  const pose = g.player.pose(g.now);
  assert.strictEqual(pose.state, 'hurt', '挨打当帧应切到 hurt 姿态');
  assert.ok(pose.hurtP >= 0 && pose.hurtP < 1, 'hurtP 应是 0..1 的进度，实际 ' + pose.hurtP);

  g.now += 160;
  const mid = g.player.pose(g.now);
  assert.strictEqual(mid.state, 'hurt', '受击期内应持续保持受击姿态');
  assert.ok(mid.hurtP > pose.hurtP, '进度应递增');

  g.now += 400;
  assert.notStrictEqual(g.player.pose(g.now).state, 'hurt', '超过 320ms 应恢复常规姿态');

  // 造型层：受击姿态任意进度都能安全绘制
  for (let i = 0; i <= 12; i++) {
    XY.Art.drawCharacter(ctx, 240, 400, 1.15, 'wukong', { t: 800, state: 'hurt', facing: 1, hurtP: i / 12 });
  }
});

test.it('怪物挨打会记录硬直时间，造型层据此后仰', () => {
  const g = run(fresh());
  g.now = 4000;
  const e = g.level.enemies[0];
  g.damageEnemy(e, 6, true, false);
  assert.ok(e.hurtUntil > g.now, '受击后应有 hurtUntil，实际 ' + e.hurtUntil);
  XY.Art.drawEnemy(ctx, e, g.now, 1);
  XY.Art.drawEnemy(ctx, e, g.now + 200, 1);
});

// ===== 音乐：每个界面一首 =====
test.it('不同界面映射到不同曲子（主菜单/战斗/商店/锻造/参悟/结算）', () => {
  const g = fresh();
  const map = {
    title: 'title', charselect: 'title', cutscene: 'title', levelIntro: 'title',
    playing: 'battle', pause: 'battle',
    bag: 'shop', shop: 'shop',
    craft: 'craft',
    skillup: 'skill',
    levelClear: 'clear', win: 'clear',
    gameover: 'defeat',
  };
  for (const st of Object.keys(map)) {
    g.state = st;
    assert.strictEqual(g.musicScene(), map[st], st + ' 的配乐映射错误');
  }
  const distinct = new Set(Object.values(map));
  assert.ok(distinct.size >= 5, '至少要有 5 种不同曲子，实际 ' + distinct.size);
  for (const name of distinct) assert.ok(XY.Audio.tracks[name], '缺少曲目 ' + name);
});

test.it('没有 AudioContext 时音频 API 全部安全（不抛错）', () => {
  resetAudio();
  assert.doesNotThrow(() => {
    XY.Audio.music('battle');
    XY.Audio.sfx('hit');
    XY.Audio.sfx('clear');
    XY.Audio.duck(0.4);
    XY.Audio.unlock();
    XY.Audio.tick();
  });
  assert.strictEqual(XY.Audio.ready, false, '无 AudioContext 时不应标记为就绪');
});

test.it('静音开关会写入偏好，并能读回', () => {
  global.localStorage._d = {};
  XY.Audio.muted = false;
  assert.strictEqual(XY.Audio.toggleMute(), false, '第一次切换后应处于静音');
  const saved = JSON.parse(global.localStorage.getItem('xiyou_audio_v1'));
  assert.strictEqual(saved.muted, true);
  assert.strictEqual(XY.Audio.toggleMute(), true, '再切一次应恢复声音');
  XY.Audio.loadPrefs();
  assert.strictEqual(XY.Audio.muted, false);
});

// ===== 伪 AudioContext：验证真的在调度音符与音效 =====
class Param {
  constructor(v) { this.value = v; }
  setValueAtTime(v) { this.value = v; return this; }
  linearRampToValueAtTime(v) { this.value = v; return this; }
  exponentialRampToValueAtTime(v) {
    if (!(v > 0)) throw new Error('exponentialRamp 目标必须 > 0');
    this.value = v; return this;
  }
  cancelScheduledValues() { return this; }
}
class Node {
  constructor(ctx, kind) { this.ctx = ctx; this.kind = kind; }
  connect(n) { return n; }
  disconnect() {}
}
class FakeCtx {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.destination = new Node(this, 'dest');
    this._started = 0;
    this._stopped = 0;
  }
  resume() { this.state = 'running'; }
  createGain() { const n = new Node(this, 'gain'); n.gain = new Param(1); return n; }
  createOscillator() {
    const c = this;
    const n = new Node(this, 'osc');
    n.frequency = new Param(440); n.detune = new Param(0);
    n.start = () => { c._started++; };
    n.stop = () => { c._stopped++; };
    return n;
  }
  createBufferSource() {
    const c = this;
    const n = new Node(this, 'buffer');
    n.start = () => { c._started++; };
    n.stop = () => { c._stopped++; };
    return n;
  }
  createBiquadFilter() { const n = new Node(this, 'filter'); n.frequency = new Param(1000); n.Q = new Param(1); return n; }
  createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
}

test.it('有 AudioContext 时会真的排音符、切歌并播放音效', () => {
  resetAudio();
  global.window.AudioContext = FakeCtx;
  const A = XY.Audio;
  const c = A.ensure();
  assert.ok(c && A.ready, '应成功建立音频上下文');

  A.unlock();
  A.music('battle', true);
  assert.strictEqual(A.scene, 'battle');
  c.currentTime = 1.0;
  A.tick();
  assert.ok(c._started > 0, '战斗曲应排出音符，实际启动节点 ' + c._started);
  const n1 = A.noteCount;
  c.currentTime = 1.8;
  A.tick();
  assert.ok(A.noteCount > n1, '时间推进后应继续排音符');

  A.music('shop');
  assert.strictEqual(A.scene, 'shop', '切歌应更新当前曲目');
  assert.strictEqual(A._step, 0, '切歌应从头开始');

  const before = c._started;
  A.sfx('hit');
  assert.ok(c._started > before, '音效应真的发声');
  const after = c._started;
  A.sfx('hit');
  assert.strictEqual(c._started, after, '同名音效 35ms 内应节流，避免连击糊成一片');

  A.duck(0.3);
  A.duck(1);
  A.toggleMute();
  A.toggleMute();
  assert.doesNotThrow(() => { A.music('clear'); c.currentTime = 2.5; A.tick(); });

  resetAudio();
  delete global.window.AudioContext;
});
