// 怪物动作模组的门禁：小怪与首领的每一招都要有各自的姿态，
// 不能只有"整体前倾 + 红圈提示"，动作还是站桩。
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
require('../src/moves.js');
const M = XY.Moves;

const FOE_FIELDS = ['lean', 'crouch', 'hdx', 'hdy', 'jaw', 'armF', 'armB', 'lunge', 'tail'];
const BOSS_FIELDS = ['lean', 'crouch', 'hdx', 'hdy', 'jaw', 'hx', 'hy', 'bx', 'by', 'wa', 'wg', 'lunge'];
// 每个字段「一个动作幅度」大约是多少，用来把不同量纲的数拉平
const FOE_SCALE = { lean: 0.4, crouch: 7, hdx: 4, hdy: 4, jaw: 1, armF: 1.2, armB: 1.2, lunge: 4, tail: 3 };
const BOSS_SCALE = { lean: 0.4, crouch: 8, hdx: 4, hdy: 4, jaw: 1, hx: 12, hy: 16, bx: 12, by: 20, wa: 2, wg: 12, lunge: 4 };

// 复刻 engine 的状态字段：p 0..0.5 起手 / 0.5..0.76 出手 / 之后收招
function fakeEnemy(key, p) {
  const e = { state: 'chase', tele: 0, actK: 0, cur: null, last: { key }, recStart: 0, recLen: 1000 };
  if (p <= 0.5) { e.state = 'windup'; e.tele = p / 0.5; e.cur = { key }; }
  else if (p <= 0.76) { e.state = 'active'; e.actK = (p - 0.5) / 0.26; e.cur = { key }; }
  else { e.state = 'recover'; }
  return e;
}
function poseAt(isBoss, key, p) {
  const e = fakeEnemy(key, p);
  const t = p > 0.76 ? ((p - 0.76) / 0.24) * 1000 : 0;
  return isBoss ? M.bossPose(e, t) : M.foePose(e, t);
}
function trace(isBoss, key, fields, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const q = poseAt(isBoss, key, i / n);
    for (const f of fields) out.push(q[f] || 0);
  }
  return out;
}
// 归一化距离：1.0 大约等于"整条动作差满一个幅度"
function dist(a, b, fields, scale) {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]) / scale[fields[i % fields.length]];
  return d / a.length;
}

test.it('同一种小怪的两招互相可辨（抓挠 vs 掷石、撕咬 vs 扑击…）', () => {
  assert.ok(Object.keys(XY.ENEMY_MOVES).length >= 3, '小怪种类不足');
  for (const kind of Object.keys(XY.ENEMY_MOVES)) {
    const moves = XY.ENEMY_MOVES[kind];
    const tr = moves.map((m) => trace(false, m.key, FOE_FIELDS, 10));
    for (let i = 0; i < tr.length; i++) {
      for (let j = i + 1; j < tr.length; j++) {
        const d = dist(tr[i], tr[j], FOE_FIELDS, FOE_SCALE);
        assert.ok(d > 0.17, kind + ' 的 ' + moves[i].key + ' 与 ' + moves[j].key + ' 动作太像（差异 ' + d.toFixed(2) + '）');
      }
    }
  }
});

test.it('首领六招两两可辨，且都有对应的动作行', () => {
  const keys = Object.keys(XY.BOSS_MOVES);
  assert.ok(keys.length >= 6, '首领招式不足');
  for (const k of keys) assert.ok(M.BOSS_MOVE[k], '首领招式 ' + k + ' 没有动作行（会退化成 _any）');
  const tr = keys.map((k) => trace(true, k, BOSS_FIELDS, 10));
  for (let i = 0; i < tr.length; i++) {
    for (let j = i + 1; j < tr.length; j++) {
      const d = dist(tr[i], tr[j], BOSS_FIELDS, BOSS_SCALE);
      assert.ok(d > 0.22, keys[i] + ' 与 ' + keys[j] + ' 动作太像（差异 ' + d.toFixed(2) + '）');
    }
  }
});

test.it('小怪招式都有动作行，别偷偷退化成兜底动作', () => {
  for (const kind of Object.keys(XY.ENEMY_MOVES)) {
    for (const m of XY.ENEMY_MOVES[kind]) {
      assert.ok(M.FOE_MOVE[m.key], kind + ' 的 ' + m.key + ' 没有动作行');
    }
  }
});

test.it('出招时明显偏离待机，收招后回到待机', () => {
  for (const kind of Object.keys(XY.ENEMY_MOVES)) {
    for (const m of XY.ENEMY_MOVES[kind]) {
      const idle = M.foePose({ state: 'chase', cur: null, last: null }, 0);
      const hit = poseAt(false, m.key, 0.6);
      let move = 0;
      for (const f of FOE_FIELDS) move += Math.abs((hit[f] || 0) - (idle[f] || 0));
      assert.ok(move > 2, kind + ' 的 ' + m.key + ' 出手帧离待机太近（' + move.toFixed(1) + '）');
      // 收招末帧必须回到待机（否则下一招会从奇怪的姿势开始）
      const back = poseAt(false, m.key, 1);
      for (const f of FOE_FIELDS) {
        assert.ok(Math.abs((back[f] || 0) - (idle[f] || 0)) < 1e-6, kind + ' 的 ' + m.key + ' 收招后 ' + f + ' 没归零');
      }
    }
  }
  const bossIdle = M.bossPose({ state: 'chase', cur: null, last: null }, 0);
  for (const k of Object.keys(XY.BOSS_MOVES)) {
    const back = poseAt(true, k, 1);
    for (const f of BOSS_FIELDS) {
      if (f === 'wa') continue;
      assert.ok(Math.abs((back[f] || 0) - (bossIdle[f] || 0)) < 1e-6, '首领 ' + k + ' 收招后 ' + f + ' 没回到待机');
    }
    const hit = poseAt(true, k, 0.6);
    let move = 0;
    for (const f of ['lean', 'hx', 'hy', 'wa']) move += Math.abs((hit[f] || 0) - (bossIdle[f] || 0));
    assert.ok(move > 0.6, '首领 ' + k + ' 出手帧离待机太近（' + move.toFixed(2) + '）');
  }
});

test.it('怪物姿态数值有限、幅度可绘制', () => {
  for (const isBoss of [false, true]) {
    const fields = isBoss ? BOSS_FIELDS : FOE_FIELDS;
    const keys = isBoss ? Object.keys(M.BOSS_MOVE) : Object.keys(M.FOE_MOVE);
    for (const k of keys) {
      for (let p = 0; p <= 1.001; p += 0.05) {
        const q = poseAt(isBoss, k, p);
        for (const f of fields) {
          assert.ok(Number.isFinite(q[f]), k + ' 在 p=' + p.toFixed(2) + ' 的 ' + f + ' 不是有限数: ' + q[f]);
        }
        assert.ok(Math.abs(q.lean) < 0.7, k + ' 倾角过大: ' + q.lean);
        assert.ok(Math.abs(q.crouch) < 30, k + ' 下沉过大: ' + q.crouch);
        assert.ok(q.jaw >= -0.01 && q.jaw < 2, k + ' 张嘴幅度离谱: ' + q.jaw);
        assert.ok(Math.abs(q.lunge) < 20, k + ' 前冲离谱: ' + q.lunge);
        if (isBoss) {
          assert.ok(Math.abs(q.hx) < 40 && Math.abs(q.hy) < 40, k + ' 前手离谱: ' + q.hx + ',' + q.hy);
          assert.ok(Math.abs(q.by) < 50, k + ' 后手离谱: ' + q.by);
        }
      }
    }
  }
});

test.it('收招阶段沿用最后一招的姿势（cur 清空后不闪回待机）', () => {
  const e = { state: 'recover', tele: 0, actK: 0, cur: null, last: { key: 'slam' }, recStart: 0, recLen: 400 };
  const q = M.bossPose(e, 30);      // 收招刚开始
  const idle = M.bossPose({ state: 'chase', cur: null, last: null }, 0);
  assert.ok(Math.abs(q.lean - idle.lean) > 0.02, '收招第一帧就闪回待机了');
  const q2 = M.bossPose(Object.assign({}, e, { recStart: 0 }), 400);
  assert.ok(Math.abs(q2.lean - idle.lean) < 1e-6, '收招结束还没回到待机');
});
