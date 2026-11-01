// 技能联动的门禁：每一招要么"留痕"要么"引动"，两招之间必须咬得上。
// 这里既测数据表（谁挂什么、谁吃什么），也测真实结算（层数会不会被清、伤害有没有真的变高）。
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
require('../src/moves.js');
require('../src/toon.js');
require('../src/engine.js');
require('../src/ui.js');
require('../src/game.js');

function mockCtx() {
  const c = {
    canvas: { width: 960, height: 540 },
    measureText: () => ({ width: 8 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    getImageData: () => ({ data: [] }),
  };
  const noop = () => {};
  for (const m of ['fillRect', 'strokeRect', 'clearRect', 'beginPath', 'moveTo', 'lineTo', 'closePath',
    'fill', 'stroke', 'save', 'restore', 'translate', 'scale', 'rotate', 'setTransform', 'transform',
    'fillText', 'strokeText', 'drawImage', 'clip', 'rect', 'arc', 'arcTo', 'ellipse',
    'quadraticCurveTo', 'bezierCurveTo', 'setLineDash']) c[m] = noop;
  return c;
}
const canvas = {
  width: 960, height: 540,
  addEventListener() {}, focus() {},
  getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 540 }; },
  getContext() { return mockCtx(); },
};

function newGame(charIndex) {
  XY.Input.clearVirtual(); XY.Input.endFrame();
  global.localStorage._d = {};
  const g = new XY.Game(canvas);
  g.charIndex = charIndex;
  g.initRun();
  g.startLevel(0);
  g.now = 5000;
  return g;
}
function dummyEnemy(g, hp) {
  const e = g.level.enemies[0];
  e.alive = true;
  e.hp = hp || 99999;
  e.maxHp = hp || 99999;
  e.marks = null;
  e.stunUntil = 0;
  return e;
}

// —— 数据面 ——
test('每个角色三招，且每招挂/引的印记都在 MARKS 里', () => {
  for (const cid of XY.CHARACTER_ORDER) {
    const list = XY.skillsOf(cid);
    assert.equal(list.length, 3, cid + ' 应该正好三个技能');
    for (const sk of list) {
      if (sk.apply) assert.ok(XY.MARKS[sk.apply], sk.id + ' 挂的印记 ' + sk.apply + ' 不存在');
      for (const key of [sk.use, sk.bonusMark, sk.rootVs]) {
        if (key) assert.ok(XY.MARKS[key], sk.id + ' 引用的印记 ' + key + ' 不存在');
      }
      assert.ok(sk.link && sk.link.length > 6, sk.id + ' 缺少联动说明');
    }
  }
});

test('每个角色都形成「留痕 → 引动」闭环', () => {
  for (const cid of XY.CHARACTER_ORDER) {
    const list = XY.skillsOf(cid);
    const givers = list.filter((s) => s.apply);
    const takers = list.filter((s) => s.use || s.bonusMark || s.rootVs);
    assert.ok(givers.length >= 1, cid + ' 没有一招会留印记，后面无从联动');
    assert.ok(takers.length >= 1, cid + ' 没有一招会引动印记，留了也白留');
    // 留下的印记得有人吃：giver 的 apply 必须出现在某个 taker 的引用里
    for (const g of givers) {
      const used = list.some((s) => s.use === g.apply || s.bonusMark === g.apply || s.rootVs === g.apply);
      assert.ok(used, cid + ' 的「' + g.name + '」留下的 ' + g.apply + ' 没有任何招式吃它');
    }
  }
});

// —— 纯函数 ——
test('印记层数：上限封顶、到期作废', () => {
  let m = null;
  m = XY.addMark(m, 'bopen', 1, 0);
  m = XY.addMark(m, 'bopen', 1, 0);
  assert.equal(XY.markStacks(m, 'bopen', 0), 2);
  m = XY.addMark(m, 'bopen', 5, 0);
  assert.equal(XY.markStacks(m, 'bopen', 0), XY.MARKS.bopen.max, '不能超过上限');
  // 过期
  const late = XY.MARKS.bopen.dur + 10;
  assert.equal(XY.markStacks(m, 'bopen', late), 0, '过期后不该还算层数');
});

test('印记增伤只对对应角色生效，别人的伤害不吃', () => {
  let m = null;
  m = XY.addMark(m, 'jingu', 3, 0);
  assert.ok(XY.markBonus(m, 'tangseng', 0) > 0.3, '唐僧吃自己念的紧箍');
  assert.equal(XY.markBonus(m, 'bajie', 0), 0, '八戒不该吃唐僧的紧箍');
  // 破绽是通用弱点，谁都吃
  let b = null;
  b = XY.addMark(b, 'bopen', 2, 0);
  assert.ok(XY.markBonus(b, 'bajie', 0) > 0, '破绽对所有人都生效');
});

test('引动会清空印记', () => {
  let m = null;
  m = XY.addMark(m, 'pahen', 3, 0);
  const r = XY.useMark(m, 'pahen', 0);
  assert.equal(r.n, 3);
  assert.equal(XY.markStacks(r.marks, 'pahen', 0), 0, '引动后应该清干净');
});

// —— 真结算 ——
test('悟空：神针照出破绽，一棒打进去伤害明显更高', () => {
  const g = newGame(0);
  const a = XY.getSkill('wk_smash');
  let plain = 0, marked = 0;
  for (let i = 0; i < 24; i++) {
    const e1 = dummyEnemy(g);
    const h1 = e1.hp;
    g.hitWithSkill(e1, a.multiplier, a);
    plain += h1 - e1.hp;

    const e2 = dummyEnemy(g);
    const h2 = e2.hp;
    g.addMark(e2, 'bopen', 3);
    g.hitWithSkill(e2, a.multiplier, a);
    marked += h2 - e2.hp;
  }
  assert.ok(marked > plain * 1.4, '三层破绽该让这一棒明显更疼：' + plain + ' → ' + marked);
});

test('悟空：没破绽时一棒只留痕，有破绽才引爆', () => {
  const g = newGame(0);
  const a = XY.getSkill('wk_smash');
  const e = dummyEnemy(g);
  g.hitWithSkill(e, a.multiplier, a);
  assert.equal(g.markN(e, 'bopen'), 1, '打空的一棒只照出一道破绽');
  g.addMark(e, 'bopen', 2);
  g.hitWithSkill(e, a.multiplier, a);
  assert.equal(g.markN(e, 'bopen'), 0, '引爆后破绽要清干净，不能打完还挂着');
});

test('八戒：饱食期间耙痕能叠到 5 层，平时只有 3 层', () => {
  const g = newGame(1);
  const e = dummyEnemy(g);
  for (let i = 0; i < 6; i++) g.addMark(e, 'pahen', 1);
  assert.equal(g.markN(e, 'pahen'), 3, '平时耙痕上限 3');
  g.player.satiatedUntil = g.now + 5000;
  g.addMark(e, 'pahen', 1);
  for (let i = 0; i < 4; i++) g.addMark(e, 'pahen', 1);
  assert.equal(g.markN(e, 'pahen'), 5, '饱食时上限提到 5');
});

test('八戒：饱食把攻击抬起来，到点自己落回去', () => {
  const g = newGame(1);
  const base = g.player.atkMul;
  g.player.now = g.now;
  g.player.satiatedUntil = g.now + 1000;
  assert.ok(g.player.atkMul > base, '饱食期间攻击应该更高');
  g.now += 1500;
  g.player.now = g.now;
  assert.equal(g.player.atkMul, base, '饱食结束要落回去');
});

test('唐僧：真言叠紧箍，真经一口气引爆并清空', () => {
  const g = newGame(2);
  const zeal = XY.getSkill('ts_zeal');
  const e = dummyEnemy(g);
  for (let i = 0; i < 3; i++) g.hitWithSkill(e, zeal.multiplier, zeal);
  assert.equal(g.markN(e, 'jingu'), 3, '三下真言应叠到三层');

  const before = e.hp;
  g.act(Object.assign({}, XY.getSkill('ts_sutra'), { _fired: true }));
  assert.equal(g.markN(e, 'jingu'), 0, '真经念完紧箍该散了');
  assert.ok(e.hp < before, '引爆紧箍要掉血');
});

test('沙僧：宝杖铺沙，沙里的妖会被磨血并陷住', () => {
  const g = newGame(3);
  const e = dummyEnemy(g);
  e.x = g.player.x + g.player.w + 40; e.y = g.player.y;
  g.act(XY.getSkill('ss_staff'));
  assert.ok(g.zones.length >= 1, '宝杖砸地应留下流沙');
  const hp0 = e.hp;
  for (let i = 0; i < 60; i++) { g.now += 16; g.update(0.016); }
  assert.ok(g.markN(e, 'liusha') > 0 || e.hp < hp0, '流沙里的妖应被磨血或陷入沙中');
});

test('白龙马：带水痕被龙身撞上就冻住，措辞与陷沙分开', () => {
  const g = newGame(4);
  const e = dummyEnemy(g);
  e.frozenUntil = 0;
  e.x = g.player.x + 40; e.y = g.player.y;
  g.addMark(e, 'shuihen', 1);
  const charge = XY.getSkill('bl_charge');
  g.hitWithSkill(e, charge.multiplier, charge);
  assert.ok(e.frozenUntil > g.now, '带着水痕被撞应该冻住');
  assert.ok(e.stunUntil > g.now, '冻住同时必须动不了');
  // 冻住和陷沙在界面上是两套表现（冰壳 vs ★），文案也不能混
  assert.equal(XY.MARKS.shuihen.rootWord, '冻住');
  assert.equal(XY.MARKS.liusha.rootWord, '陷住');
});

test('白龙马：寒气打在冻住的目标上会碎冰，倍率翻倍', () => {
  const g = newGame(4);
  const e = dummyEnemy(g);
  const breath = XY.getSkill('bl_breath');
  // 同一只怪、同一个角色打两遍，才比得清"冻住"带来的差别：
  // 暴击是随机的（翻倍），跨两只角色比会被暴击和随机起手属性搅乱
  g.player.stats.critRate = 0;

  e.frozenUntil = g.now + 3000;               // 先冻住
  g.addMark(e, 'shuihen', 1);
  const h0 = e.hp;
  g.hitWithSkill(e, breath.multiplier, breath);
  const frozenHit = h0 - e.hp;

  e.frozenUntil = 0;                          // 同一只怪，这次没冻
  g.addMark(e, 'shuihen', 1);
  const h1 = e.hp;
  g.hitWithSkill(e, breath.multiplier, breath);
  const plainHit = h1 - e.hp;

  assert.ok(frozenHit > plainHit * 1.8, '碎冰那一下应明显更疼，实际 ' + frozenHit + ' vs ' + plainHit);
  assert.equal(e.frozenUntil, 0, '碎冰后冻状态应该解除');
});
