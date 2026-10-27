// 严格渲染门禁：模拟真实浏览器的 Canvas 行为（非法颜色/负半径/非有限数直接抛错），
// 跑完整流程（标题→选角→CG→前情→战斗→背包→合成→暂停→结算）与全部 5 个角色。
const test = require('node:test');
const assert = require('node:assert');

// —— 浏览器桩 ——
global.window = { addEventListener() {}, requestAnimationFrame() {}, focus() {} };
global.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] == null ? null : this._d[k]; },
  setItem(k, v) { this._d[k] = v; },
  removeItem(k) { delete this._d[k]; },
};

const COLOR_RE = /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla)\([^)]*\)|[a-z]+)$/i;
const badLog = [];

function makeStrictCtx() {
  const state = { fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, lineWidth: 1, font: '10px sans-serif' };
  const target = {
    canvas: { width: 960, height: 540 },
    measureText(t) {
      assert.strictEqual(typeof t, 'string', 'measureText 必须收到字符串，收到 ' + typeof t + ' (' + t + ')');
      return { width: String(t).length * 8 };
    },
    createLinearGradient(...a) { num('createLinearGradient', a); return grad(); },
    createRadialGradient(...a) { num('createRadialGradient', a); return grad(); },
    createPattern() { return null; },
    getImageData() { return { data: [] }; },
  };

  function grad() {
    return {
      addColorStop(o, c) {
        if (!(typeof o === 'number' && isFinite(o) && o >= 0 && o <= 1)) badLog.push('addColorStop 位置非法: ' + o);
        if (typeof c !== 'string' || !COLOR_RE.test(c)) badLog.push('addColorStop 颜色非法: ' + c);
      },
    };
  }
  function num(name, args) {
    for (const v of args) {
      if (typeof v === 'number' && !isFinite(v)) badLog.push(name + ' 收到非法数字: ' + v);
    }
  }
  const methods = ['fillRect', 'strokeRect', 'clearRect', 'beginPath', 'moveTo', 'lineTo', 'closePath',
    'fill', 'stroke', 'save', 'restore', 'translate', 'scale', 'rotate', 'setTransform', 'transform',
    'fillText', 'strokeText', 'drawImage', 'clip', 'rect', 'quadraticCurveTo', 'bezierCurveTo',
    'setLineDash', 'createRadialGradient2'];
  for (const m of methods) target[m] = (...a) => num(m, a);
  target.arc = (...a) => { num('arc', a); if (a[2] < 0) badLog.push('arc 半径为负: ' + a[2]); };
  target.arcTo = (...a) => { num('arcTo', a); if (a[4] < 0) badLog.push('arcTo 半径为负: ' + a[4]); };
  target.ellipse = (...a) => { num('ellipse', a); if (a[2] < 0 || a[3] < 0) badLog.push('ellipse 半径为负'); };

  // 真实的 save/restore 需要恢复绘图状态，桩必须照做，否则 alpha/颜色会"泄漏"出假错误
  const stack = [];
  target.save = () => { stack.push(Object.assign({}, state)); };
  target.restore = () => {
    const prev = stack.pop();
    if (!prev) return;
    for (const k of Object.keys(prev)) state[k] = prev[k];
  };

  return new Proxy(target, {
    get(t, p) {
      if (p in state) return state[p];
      if (p in t) return t[p];
      return () => {};
    },
    set(t, p, v) {
      if (p === 'fillStyle' || p === 'strokeStyle') {
        const ok = (v && typeof v === 'object') || (typeof v === 'string' && COLOR_RE.test(v));
        if (!ok) badLog.push(p + ' 颜色非法: ' + String(v));
      }
      if (p === 'globalAlpha') {
        if (typeof v !== 'number' || !isFinite(v) || v < 0 || v > 1) badLog.push('globalAlpha 越界: ' + v);
      }
      if (p === 'lineWidth') {
        if (typeof v !== 'number' || !isFinite(v) || v < 0) badLog.push('lineWidth 非法: ' + v);
      }
      if (p === 'font') {
        if (typeof v !== 'string' || !/\d/.test(v)) badLog.push('font 非法: ' + String(v));
      }
      state[p] = v; t[p] = v;
      return true;
    },
    has() { return true; },
  });
}

const ctx = makeStrictCtx();
const canvas = { width: 960, height: 540, getContext: () => ctx, addEventListener() {}, focus() {} };

const XY = require('../src/data.js');
require('../src/logic.js');
require('../src/audio.js');
require('../src/art.js');
require('../src/fx.js');
require('../src/scenery.js');
require('../src/engine.js');
require('../src/ui.js');
require('../src/game.js');

// 真实输入模块（不用假桩，避免遮住接线问题）
// tap：按一下立刻松（pressed 只在本帧有效）；hold：持续按住
function tap(code) { XY.Input.setVirtual(code, true); XY.Input.setVirtual(code, false); }
function hold(code, on) { XY.Input.setVirtual(code, on !== false); }
function step(game, dt) { game.update(dt); game.render(); XY.Input.endFrame(); }
function fresh() {
  XY.Input.clearVirtual(); XY.Input.endFrame();
  global.localStorage._d = {}; // 每个用例独立存档，避免互相污染
  return new XY.Game(canvas);
}

test.it('严格 Canvas：标题→选角→CG→前情→战斗 全流程不产生非法绘制', () => {
  badLog.length = 0;
  const game = fresh();
  game.charIndex = 0;
  game.initRun();

  // 标题 → 选角
  tap('Enter'); step(game, 0.016);
  assert.strictEqual(game.state, 'charselect', '按 Enter 应进入选角');
  // 选角左右切换
  tap('KeyD'); step(game, 0.016);
  assert.strictEqual(game.charIndex, 1, 'D 键应切到下一个角色');
  tap('KeyA'); step(game, 0.016);
  assert.strictEqual(game.charIndex, 0);
  // 进入 CG
  tap('Enter'); step(game, 0.016);
  assert.strictEqual(game.state, 'cutscene');
  // 跳过 CG → 前情
  tap('Enter'); step(game, 0.016);
  assert.strictEqual(game.state, 'levelIntro');
  // 进入战斗
  tap('Enter'); step(game, 0.016);
  assert.strictEqual(game.state, 'playing');

  // 走、跳、普攻、三技能、三法宝
  for (let i = 0; i < 420; i++) {
    hold('KeyD', true);
    if (i % 37 === 0) tap('KeyW');
    if (i % 11 === 0) tap('KeyJ');
    if (i % 53 === 0) tap('KeyK');
    if (i % 61 === 0) tap('KeyU');
    if (i % 71 === 0) tap('KeyI');
    if (i % 97 === 0) tap('Digit1');
    if (i % 101 === 0) tap('Digit2');
    hold('KeyS', i % 29 === 0);
    step(game, 0.016);
    hold('KeyD', false);
  }
  assert.deepStrictEqual(badLog.slice(0, 6), [], '出现非法绘制：\n' + badLog.slice(0, 6).join('\n'));
  assert.ok(game.player.x > 100, '玩家应能向右移动，当前 x=' + game.player.x);
});

test.it('严格 Canvas：5 位角色都能选角与进战斗（造型/头像/图标全覆盖）', () => {
  badLog.length = 0;
  for (let i = 0; i < XY.CHARACTER_ORDER.length; i++) {
    const g = fresh();
    g.charIndex = i;
    g.state = 'charselect';
    g.render();
    g.initRun();
    g.startLevel(0);
    for (let f = 0; f < 80; f++) {
      hold('KeyD', true);
      if (f % 9 === 0) tap('KeyJ');
      if (f % 17 === 0) tap('KeyK');
      step(g, 0.016);
      hold('KeyD', false);
    }
    // 角色技能图标 / 头像都画一遍
    XY.UI.drawCharSelect(ctx, g);
    XY.UI.drawHUD(ctx, g);
  }
  assert.deepStrictEqual(badLog.slice(0, 6), [], '角色渲染出现非法绘制：\n' + badLog.slice(0, 6).join('\n'));
});

test.it('严格 Canvas：背包三个分页 + 合成坊 + 暂停 + 结算都能渲染', () => {
  badLog.length = 0;
  const g = fresh();
  g.charIndex = 0;
  g.initRun();
  g.startLevel(0);
  g.inventory = { mat_wood: 9, mat_stone: 9, mat_soul: 9, mat_herb: 9, mat_fire: 9 };
  g.inventory = XY.craft(g.inventory, XY.RECIPES[0]);
  g.equipped.weapon = 'eq_staff';
  g.rebuildPlayer();
  g.treasures = ['tr_wuxing', 'tr_kunxian', 'tr_yujing', 'tr_bajiao', 'tr_qixing'];
  g.treasureSlots = ['tr_wuxing', 'tr_kunxian', null];
  g.player.treasures = g.treasureSlots;

  for (const tab of [0, 1, 2]) {
    g.bagTab = tab; g.bagIndex = 0; g.state = 'bag';
    g.render();
    // 遍历格子
    const n = g.bagItems().length;
    for (let i = 0; i < Math.max(1, n); i++) { g.bagIndex = i; g.render(); }
  }
  // 装备/卸下、法宝装栏
  g.bagTab = 2; g.bagIndex = 0;
  const eqId = g.bagItems()[0].id;
  g.toggleEquip(eqId);
  g.toggleEquip(eqId);
  g.equipTreasure('tr_qixing');
  g.equipTreasure('tr_qixing');
  assert.strictEqual(g.treasureSlots.includes('tr_qixing'), false, '再按一次应卸下法宝');

  g.craftIndex = 0; g.state = 'craft'; g.render();
  g.state = 'pause'; g.render();
  g.state = 'gameover'; g.render();
  g.state = 'win'; g.render();
  g.state = 'levelIntro'; g.render();
  g.cutIndex = 0; g.state = 'cutscene'; g.render();

  assert.deepStrictEqual(badLog.slice(0, 6), [], '界面渲染出现非法绘制：\n' + badLog.slice(0, 6).join('\n'));
});

test.it('特效层：刀光/火花/光环/残影不越界、会自然消亡', () => {
  const fx = new XY.FXLayer();
  fx.slash(100, 100, 1, '#fff0c8', 1.2, 0.2);
  fx.spark(100, 100, 20, '#ffd479', { speed: 300 });
  fx.ring(100, 100, 4, 160, '#c39bff', 0.4, 6);
  fx.afterimage(100, 100, 0.86, 'wukong', { t: 0, state: 'dash', facing: 1 }, -20);
  fx.dust(100, 100, 10, '#7CFC9B', 40, 80);
  fx.levelUp(100, 100);
  fx.trail(100, 100, '#9be7ff', 4);
  const n0 = fx.items.length;
  assert.ok(n0 > 20, '应生成足量特效，实际 ' + n0);
  for (let i = 0; i < 120; i++) fx.update(0.016);
  assert.strictEqual(fx.items.length, 0, '2 秒后特效应全部消失，实际剩余 ' + fx.items.length);
  fx.draw(ctx, 'back'); fx.draw(ctx, 'front');
  assert.deepStrictEqual(badLog.slice(0, 4), []);
});

test.it('背包：材料/法宝/装备 分页内容与装备逻辑正确', () => {
  const g = fresh();
  g.initRun();
  g.inventory = { mat_wood: 4, eq_robe: 1, mat_soul: 2 };
  g.treasures = ['tr_wuxing', 'tr_bajiao'];
  g.treasureSlots = ['tr_wuxing', null, null];

  g.bagTab = 0;
  const mats = g.bagItems();
  assert.ok(mats.every((m) => m.icon === 'material'), '材料页应只含材料');
  assert.strictEqual(mats.find((m) => m.id === 'mat_wood').count, 4);

  g.bagTab = 1;
  const trs = g.bagItems();
  assert.strictEqual(trs.length, 2, '法宝页应列出 2 件法宝');
  assert.strictEqual(trs.find((t) => t.id === 'tr_wuxing').equipped, true, '已装栏的应标记已装备');

  g.bagTab = 2;
  const eqs = g.bagItems();
  assert.strictEqual(eqs.length, 1, '装备页应只有锁子黄金甲');
  g.toggleEquip('eq_robe');
  assert.strictEqual(g.equipped.armor, 'eq_robe', '装备后应记录到 equipment');
  assert.ok(g.player.stats.defense > XY.CHARACTERS.wukong.base.defense, '装备后防御应提升');

  g.bagTab = 1; g.bagIndex = 1;
  g.equipTreasure('tr_bajiao');
  assert.strictEqual(g.treasureSlots.indexOf('tr_bajiao'), 1, '应装入第 2 个空栏');
});

test.it('换装不传送：合成/装备后角色位置保持不变', () => {
  const g = fresh();
  g.charIndex = 0;
  g.initRun();
  g.startLevel(0);
  g.player.x = 640; g.player.y = 300;
  g.inventory = { mat_wood: 5, mat_stone: 5, mat_soul: 5 };
  g.craftIndex = 0;
  tap('Enter'); g.updateCraft(); XY.Input.endFrame();
  assert.ok(Math.abs(g.player.x - 640) < 0.001, '合成后位置应保持在 640，实际 ' + g.player.x);
});

test.it('经验值：击杀怪物后经验增加并产生 HUD 飘字', () => {
  const g = fresh();
  g.charIndex = 0;
  g.initRun();
  g.startLevel(0);
  const e = g.level.enemies[0];
  const expBefore = g.player.exp;
  g.killEnemy(e);
  assert.ok(g.player.exp > expBefore, '击杀后经验应增加');
  assert.ok(g.expPops.length > 0, '应产生经验飘字');
  assert.ok(g.floaters.some((f) => String(f.text).indexOf('EXP') >= 0), '世界内应有 +EXP 飘字');
});

test.it('键位：WASD 可移动/跳跃，J 普攻有攻击动作与刀光', () => {
  badLog.length = 0;
  const g = fresh();
  g.charIndex = 0;
  g.initRun();
  g.startLevel(0);
  // 与真实 rAF 一致：每帧推进游戏时钟，避免 now 恒为 0 造成的时间窗边界问题
  const tick = (n) => { for (let i = 0; i < n; i++) { g.now += 16; step(g, 0.016); } };
  tick(10);

  const pl = g.player;
  const x0 = pl.x;
  hold('KeyD', true);       // 持续按住 = 走路（不会触发双击奔跑）
  tick(30);
  assert.ok(pl.x > x0 + 20, 'D 键应向右移动，Δx=' + (pl.x - x0).toFixed(1));
  hold('KeyD', false);
  tick(8);

  // 跳跃
  assert.strictEqual(pl.onGround, true, '静止后应站在地面');
  const y0 = pl.y;
  tap('KeyW'); tick(1);
  assert.ok(pl.vy < 0, 'W 应产生向上速度，实际 vy=' + pl.vy);
  assert.ok(pl.y <= y0 + 0.001, '起跳当帧不应下沉');

  // 普攻动作（刀光与判定都压在 strike 那一帧，所以要走到动作中段）
  tap('KeyJ'); tick(1);
  assert.ok(pl.attackUntil > g.now, '普攻应进入攻击动作时间窗');
  assert.ok(pl.pose(g.now).attackP !== undefined, '应能取到攻击进度');
  const hasSlash = () => g.fx.items.some((it) => it.type === 'slash');
  assert.ok(!hasSlash(), '刀光不该在出招第一帧就冒出来（要等兵器打出去）');
  tick(12);
  assert.ok(hasSlash(), '普攻应产生刀光特效');
});

// —— 回归：技能倍率缺失导致 -NaN、怪物杀不死（用户 2026-10-28 反馈）——
test.it('全角色全技能：伤害必须是有限数字，攻击型技能能把小怪打死', () => {
  const DMG = ['melee', 'aoe', 'ranged', 'dash'];
  for (const cid of XY.CHARACTER_ORDER) {
    for (let i = 0; i < 3; i++) {
      const g = fresh();
      g.charIndex = XY.CHARACTER_ORDER.indexOf(cid);
      g.rebuildPlayer();
      g.startLevel(0);
      const pl = g.player;
      const e = g.level.enemies[0];
      // 贴脸站位
      const place = () => { pl.x = e.x - 50; pl.y = e.y; pl.facing = 1; pl.vx = 0; pl.vy = 0; g.cam.x = 0; };
      place();
      g.now = 5000;
      const act = pl.trySkill(i, g.now);
      assert.ok(act, cid + ' 技能' + i + ' 应可释放');
      const gap = act.kind === 'dash' ? 22 : 50;   // 冲刺伤害靠身体碰撞，必须真的贴上
      const place2 = () => { pl.x = e.x - gap; pl.y = e.y; pl.facing = 1; pl.vx = 0; pl.vy = 0; g.cam.x = 0; };
      place2();
      g.act(act);
      // 弹道/冲刺类要在帧循环里才结算
      if (act.kind === 'ranged' || act.kind === 'dash') {
        for (let k = 0; k < 30; k++) { place2(); g.update(0.016); }
      }
      assert.ok(Number.isFinite(e.hp), cid + ' 技能' + i + '（' + act.kind + '）打出非有限血量: ' + e.hp);
      if (DMG.indexOf(act.kind) < 0) continue; // 治疗/增益不伤害，跳过击杀断言

      // 连续释放直到击杀
      for (let n = 0; n < 30 && e.alive; n++) {
        place2();
        pl.skillCd = {}; pl.energy = 999; pl.attackReady = 0;
        g.now += 400;
        const a2 = pl.trySkill(i, g.now);
        if (!a2) break;
        g.act(a2);
        for (let k = 0; k < 24; k++) { place2(); g.update(0.016); }
      }
      assert.strictEqual(e.alive, false, cid + ' 技能' + i + '（' + act.kind + '）应能击杀小妖，剩余 hp=' + e.hp);
    }
  }
});

test.it('普攻可击杀并正常结算经验与掉落', () => {
  const g = fresh();
  g.charIndex = 0;
  g.initRun();
  g.startLevel(0);
  const pl = g.player;
  const e = g.level.enemies[0];
  pl.x = e.x - 48; pl.y = e.y; pl.facing = 1;
  for (let t = 0; t < 20000 && e.alive; t += 300) {
    g.now = t;
    const a = pl.tryBasic(g.now);
    if (a) g.act(a);
    g.now = t + 200;                 // 走到 strike 之后
    g.update(0.016);                 // 推进一帧，让延迟判定真正落地
    assert.ok(Number.isFinite(e.hp), '普攻后血量必须有限，实际 ' + e.hp);
  }
  assert.strictEqual(e.alive, false, '普攻应能打死小妖');
  assert.ok(g.player.exp > 0, '击杀应获得经验');
});

test.it('computeDamage 对缺失/非法参数兜底为有限正整数', () => {
  const cases = [
    [{ attack: 30 }, { defense: 4 }, undefined],
    [{ attack: 30 }, {}, 1.2],
    [{}, { defense: 4 }, 1],
    [{ attack: NaN }, { defense: NaN }, NaN],
  ];
  for (const [a, d, m] of cases) {
    const r = XY.computeDamage(a, d, m, () => 0.99);
    assert.ok(Number.isFinite(r.amount), '伤害应为有限数，实际 ' + r.amount);
    assert.ok(r.amount >= 1, '伤害下限 1，实际 ' + r.amount);
    assert.ok(Number.isInteger(r.amount));
  }
});

// —— 新增机制：二段跳 / 双击奔跑（用户 2026-10-28 需求）——
test.it('二段跳：空中可再跳一次，第三次无效，落地补满', () => {
  badLog.length = 0;
  const g = fresh();
  g.charIndex = 0; g.initRun(); g.startLevel(0);
  const pl = g.player;
  for (let i = 0; i < 60; i++) step(g, 0.016);   // 先落地稳定
  assert.strictEqual(pl.onGround, true, '起始应站在地面');
  assert.strictEqual(pl.jumpsLeft, 2, '落地后跳跃次数应为 2');

  tap('KeyW'); step(g, 0.016);
  assert.strictEqual(pl.jumpsLeft, 1, '一段跳后剩 1 次');
  assert.ok(pl.vy < 0, '一段跳应向上');

  for (let i = 0; i < 10; i++) step(g, 0.016);
  assert.strictEqual(pl.onGround, false, '此时应仍在空中');
  const vyBefore = pl.vy;
  tap('KeyW'); step(g, 0.016);
  assert.strictEqual(pl.jumpsLeft, 0, '二段跳后剩 0 次');
  assert.ok(pl.vy < vyBefore, '二段跳应重新获得向上速度');

  const vyAfter = pl.vy;
  tap('KeyW'); step(g, 0.016);
  assert.ok(pl.vy > vyAfter, '第三次按跳应无效（只有重力）');
  assert.strictEqual(pl.jumpsLeft, 0);

  for (let i = 0; i < 240 && !pl.onGround; i++) step(g, 0.016);
  assert.strictEqual(pl.onGround, true, '应落回地面');
  assert.strictEqual(pl.jumpsLeft, 2, '落地后跳跃次数补满');
});

test.it('双击 D 进入奔跑且速度显著更快，松手立即退出', () => {
  badLog.length = 0;
  const g = fresh();
  g.charIndex = 0; g.initRun(); g.startLevel(0);
  const pl = g.player;
  // 该用例关心"按键间隔"，必须让游戏时钟随帧推进（rAF 里 now 是真实时间戳）
  const tick = (n) => { for (let i = 0; i < n; i++) { g.now += 16; step(g, 0.016); } };
  tick(60);

  // 单次按住 = 走
  hold('KeyD', true);
  tick(12);
  const walkVx = pl.vx;
  assert.strictEqual(pl.runDir, 0, '只按住一次不应奔跑');
  assert.ok(walkVx > 0, '应向右移动');

  // 松手一帧，320ms 内再按 → 奔跑
  hold('KeyD', false); tick(1);
  hold('KeyD', true); tick(1);
  assert.strictEqual(pl.runDir, 1, '双击后应进入奔跑');
  tick(14);
  const runVx = pl.vx;
  assert.ok(runVx > walkVx * 1.35, '奔跑应明显快于走路: walk=' + walkVx.toFixed(1) + ' run=' + runVx.toFixed(1));
  assert.ok(Math.abs(runVx - pl.stats.moveSpeed * XY.RUN_MUL) < 30, '奔跑速度应贴近 moveSpeed*RUN_MUL');

  // 姿态层应标记 sprint
  const pose = pl.pose(g.now);
  assert.strictEqual(pose.state, 'run');
  assert.strictEqual(pose.sprint, true, '奔跑姿态应带 sprint 标记');

  // 松手退出
  hold('KeyD', false); tick(1);
  assert.strictEqual(pl.runDir, 0, '松手应退出奔跑');
  // 等过双击窗口（320ms ≈ 21 帧）再按一次，不应再次奔跑
  tick(26);
  hold('KeyD', true);
  tick(14);
  assert.strictEqual(pl.runDir, 0, '间隔过久的两下单击不应触发奔跑');
});

test.it('三关主题立绘：任意相机位置均可绘制，无非法颜色/负半径/越界 alpha', () => {
  badLog.length = 0;
  for (let lv = 0; lv < 3; lv++) {
    for (const camX of [0, 320, 760, 1440]) {
      ctx.save();
      XY.Scenery.draw(ctx, lv, 1200 + camX, camX);
      ctx.restore();
    }
  }
  assert.deepStrictEqual(badLog, [], '场景层产生非法绘制: ' + badLog.join(' | '));
});

// —— 用户 2026-10-28 需求：悟空招式重做 + 盔甲盔缨 ——
test.it('普攻四式为「劈/戳/挑/甩」，判定与手感各不相同', () => {
  badLog.length = 0;
  const g = fresh();
  g.charIndex = 0; g.initRun(); g.startLevel(0);
  const pl = g.player;
  const kinds = [], ranges = [];
  let t = 3000;
  for (let i = 0; i < 8; i++) {
    t += 500;                       // 超过 820ms 会回到第一段，用 500ms 保持连段节奏
    const a = pl.tryBasic(t);
    assert.ok(a, '第 ' + (i + 1) + ' 次普攻应可释放');
    kinds.push(a.atkKind); ranges.push(a.range);
    assert.strictEqual(pl.pose(t).attackKind, a.atkKind, '姿态层应带上招式类型');
  }
  assert.deepStrictEqual(kinds.slice(0, 4), [0, 1, 2, 3], '连段应为 劈→戳→挑→甩，实际 ' + kinds);
  assert.deepStrictEqual(kinds.slice(4, 8), [0, 1, 2, 3], '四段之后应回到第一段，实际 ' + kinds);
  assert.strictEqual(new Set(ranges.slice(0, 4)).size, 4, '四段判定长度应互不相同，实际 ' + ranges);
  assert.ok(ranges[1] > ranges[0], '戳比劈探得更远');
  // 每个人一套四式：判定长度、倍率、曲线都得互不相同，不然就是换皮
  const table = XY.BASIC_COMBO;
  for (const id of XY.CHARACTER_ORDER) assert.ok(Array.isArray(table[id]) && table[id].length === 4, id + ' 应有一套四式');
  const sigs = new Set();
  for (const id of XY.CHARACTER_ORDER) {
    const cfg = XY.comboFor(id);
    assert.strictEqual(new Set(cfg.map((c) => c.range)).size, 4, id + ' 四段的判定长度应互不相同');
    assert.strictEqual(new Set(cfg.map((c) => c.name)).size, 4, id + ' 四段的招式名应互不相同');
    for (const c of cfg) {
      assert.ok(c.dur > 0 && c.mult > 0 && c.range > 0 && c.strike > 0 && c.strike < 1, id + '·' + c.name + ' 的招式参数不全');
      for (let q = 0; q <= 1.0001; q += 0.05) {
        const sp = XY.Art.swingProfile(c.path, q);
        assert.ok(Number.isFinite(sp.arm) && Number.isFinite(sp.wpn) && Number.isFinite(sp.g || 0), id + '·' + c.name + ' 的轨迹在 p=' + q + ' 出现非法值');
        const mv = XY.Art.attackMotion(c.body, q);
        assert.ok(Number.isFinite(mv.tilt) && Number.isFinite(mv.x) && Number.isFinite(mv.y), id + '·' + c.name + ' 的身体动作在 p=' + q + ' 出现非法值');
      }
      sigs.add(c.path + '/' + c.body);
    }
  }
  assert.ok(sigs.size >= 12, '五个角色的招式曲线应有明显区分，实际只有 ' + sigs.size + ' 种');
  assert.ok(XY.comboFor('bajie')[3].back > 0.5, '八戒抡一圈应该能打到身后');
  assert.ok(XY.comboFor('bailongma')[0].range > XY.comboFor('wukong')[1].range, '龙枪直刺应比金箍棒平捅更长');
});

test.it('如意棒击：金箍棒暴涨重劈，特效生成且延迟到落点才结算伤害', () => {
  badLog.length = 0;
  const g = fresh();
  g.charIndex = 0; g.initRun(); g.startLevel(0);
  const pl = g.player, e = g.level.enemies[0];
  pl.x = e.x - 60; pl.y = e.y; pl.facing = 1; pl.energy = 999;
  g.now = 5000;
  const a = pl.trySkill(0, g.now);
  assert.strictEqual(a.anim, 'giantChop', '如意棒击应走重劈分支');
  const hp0 = e.hp;
  g.act(a);
  assert.ok(g.fx.items.some((i) => i.type === 'giantStaff'), '应生成巨型金箍棒特效');
  assert.strictEqual(e.hp, hp0, '伤害应延迟到棒子砸地那一刻');
  assert.ok(g.pending.length > 0, '应有待结算的落点判定');
  for (let i = 0; i < 20; i++) { g.now += 16; g.update(0.016); }
  assert.ok(Number.isFinite(e.hp), '血量必须有限，实际 ' + e.hp);
  assert.ok(e.hp < hp0, '砸地后应造成伤害');
  assert.strictEqual(g.pending.length, 0, '结算后待办应清空');
});

test.it('筋斗云突：突进更快更远，并带祥云缠身', () => {
  badLog.length = 0;
  const g = fresh();
  g.charIndex = 0; g.initRun(); g.startLevel(0);
  const pl = g.player;
  for (let i = 0; i < 40; i++) { g.now += 16; g.update(0.016); }
  pl.x = 120; pl.y = 360; pl.facing = 1; pl.energy = 999; pl.skillCd = {};
  g.now += 100;
  const x0 = pl.x;
  const a = pl.trySkill(1, g.now);
  assert.strictEqual(a.anim, 'cloudDash');
  g.act(a);
  assert.ok(pl.cloudAuraUntil > g.now, '应开启祥云缠身');
  let peak = 0, cloudSeen = 0;
  for (let i = 0; i < 60; i++) {
    g.now += 16; g.update(0.016);
    peak = Math.max(peak, Math.abs(pl.vx));
    cloudSeen = Math.max(cloudSeen, g.fx.items.filter((it) => it.type === 'cloud').length);
  }
  assert.ok(pl.x - x0 > 250, '一次筋斗云应突进 250px 以上，实际 ' + (pl.x - x0).toFixed(1));
  assert.ok(peak > pl.stats.moveSpeed * 3, '峰值速度应超过走速 3 倍，实际 ' + peak.toFixed(0));
  assert.ok(cloudSeen > 0, '途中应飘出祥云');
});

test.it('定海神针：掷棒空中旋转，插地后产生冲击波并结算伤害', () => {
  badLog.length = 0;
  const g = fresh();
  g.charIndex = 0; g.initRun(); g.startLevel(0);
  const pl = g.player, e = g.level.enemies[0];
  pl.x = e.x - 90; pl.y = e.y; pl.facing = 1; pl.energy = 999;
  g.now = 6000;
  const a = pl.trySkill(2, g.now);
  assert.strictEqual(a.anim, 'throw', '定海神针应走掷棒分支');
  const hp0 = e.hp;
  g.act(a);
  assert.strictEqual(g.specials.length, 1, '应掷出一根棒子');
  assert.strictEqual(g.specials[0].state, 'fly', '棒子先在空中飞');
  assert.strictEqual(pl.pose(g.now).noWeapon, true, '棒子离手，角色应空手');
  assert.strictEqual(e.hp, hp0, '落地前不应有伤害');

  let frames = 0;
  while (g.specials.length && g.specials[0].state === 'fly' && frames < 150) {
    g.now += 16; g.update(0.016); frames++;
  }
  assert.ok(frames > 5 && frames < 90, '飞行时长应短促，实际 ' + frames + ' 帧');
  assert.strictEqual(g.specials[0].state, 'stuck', '应插进地面');
  assert.ok(e.hp < hp0, '冲击波应造成伤害');
  assert.ok(Number.isFinite(e.hp), '血量必须有限');

  // 一段时间后自行消散
  for (let i = 0; i < 130; i++) { g.now += 16; g.update(0.016); }
  assert.strictEqual(g.specials.length, 0, '插地的棒子应自行消失');
});

test.it('三段普攻与盔甲盔缨：任意进度都能安全绘制', () => {
  badLog.length = 0;
  const ctx2 = makeStrictCtx();
  for (const kind of [0, 1, 2]) {
    for (let i = 0; i <= 20; i++) {
      XY.Art.drawCharacter(ctx2, 200, 400, 1.15, 'wukong', {
        t: 900, state: 'attack', facing: 1, attackP: i / 20, attackKind: kind,
      });
    }
  }
  // 举棒蓄力 / 掷棒（空手）/ 其它角色也要能画
  XY.Art.drawCharacter(ctx2, 200, 400, 1.15, 'wukong', { t: 900, state: 'idle', facing: 1, castP: 0.4, castId: 'wk_smash' });
  XY.Art.drawCharacter(ctx2, 200, 400, 1.15, 'wukong', { t: 900, state: 'idle', facing: 1, castP: 0.4, castId: 'wk_spin', noWeapon: true });
  assert.deepStrictEqual(badLog, [], '绘制产生非法调用: ' + badLog.join(' | '));
});

test.it('五名角色各有独立的四幕前史 CG', () => {
  const ids = XY.CHARACTER_ORDER;
  const firstTitles = new Set();
  for (const id of ids) {
    const beats = XY.STORY.charCg && XY.STORY.charCg[id];
    assert.ok(Array.isArray(beats) && beats.length === 4, id + ' 应有四幕开场 CG');
    for (const b of beats) {
      assert.ok(b.title && b.glyph && b.bgTop && b.bgBottom, id + ' 的 CG 字段不全');
      assert.ok(Array.isArray(b.lines) && b.lines.length >= 1, id + ' 的 CG 缺文案');
      assert.ok(b.duration >= 2000, id + ' 的 CG 时长过短');
    }
    firstTitles.add(beats[0].title);
  }
  assert.strictEqual(firstTitles.size, ids.length, '五段开场标题不应重复');
});

test.it('选角后播放该角色自己的 CG，并能逐幕推进到关卡前情', () => {
  badLog.length = 0;
  for (let i = 0; i < XY.CHARACTER_ORDER.length; i++) {
    const g = fresh();
    tap('Enter'); step(g, 0.016);       // 标题 → 选角
    g.charIndex = i;
    tap('Enter'); step(g, 0.016);       // 确认角色 → CG
    assert.strictEqual(g.state, 'cutscene', '第 ' + i + ' 个角色没进入 CG');
    assert.strictEqual(g.cutBeats, XY.STORY.charCg[XY.CHARACTER_ORDER[i]], 'CG 没按角色切换');
    for (let n = 0; n < 12 && g.state === 'cutscene'; n++) step(g, 1.2);
    assert.strictEqual(g.state, 'levelIntro', '第 ' + i + ' 个角色的 CG 没走完');
  }
  assert.deepStrictEqual(badLog, [], 'CG 渲染产生非法绘制：\n' + badLog.join('\n'));
});

test.it('选角：鼠标点哪张卡就出哪个角色，点空白不误触', () => {
  badLog.length = 0;
  const game = fresh();
  tap('Enter'); step(game, 0.016);      // 标题 → 选角
  assert.strictEqual(game.state, 'charselect');
  const L = XY.UI.charSelectLayout();
  const cardCenter = (i) => L.x0 + i * (L.cardW + L.gap) + L.cardW / 2;

  // 点空白：不该开打（原来这里的点击会被当成"确认"，于是永远出悟空）
  XY.Input.setMouse(4, 4);
  tap('Mouse0'); step(game, 0.016);
  assert.strictEqual(game.state, 'charselect', '点空白不应直接出战');
  assert.strictEqual(game.charIndex, 0, '点空白不应改选角色');

  // 点第三张卡（唐僧）
  XY.Input.setMouse(cardCenter(2), L.y + 120);
  tap('Mouse0'); step(game, 0.016);
  assert.strictEqual(game.charId, 'tangseng', '点唐僧卡片却出了 ' + game.charId);
  assert.strictEqual(game.player.char.id, 'tangseng', '玩家不是唐僧');
  assert.strictEqual(game.state, 'cutscene');
  assert.strictEqual(game.cutBeats, XY.STORY.charCg.tangseng, 'CG 没跟着角色走');
});

test.it('选角：命中判定覆盖 5 张卡与确认按钮', () => {
  const L = XY.UI.charSelectLayout();
  for (let i = 0; i < L.n; i++) {
    const cx = L.x0 + i * (L.cardW + L.gap) + L.cardW / 2;
    assert.strictEqual(XY.UI.charSelectCardAt(cx, L.y + 10), i, '第 ' + i + ' 张卡没命中');
    assert.strictEqual(XY.UI.charSelectCardAt(cx, L.y + L.h - 1), i, '卡片底部没命中');
  }
  assert.strictEqual(XY.UI.charSelectCardAt(L.x0 - 20, L.y + 10), -1, '卡片左边空白不该命中');
  assert.strictEqual(XY.UI.charSelectCardAt(L.x0 + 10, L.y - 10), -1, '卡片上方空白不该命中');
  const b = L.btn;
  assert.ok(XY.UI.charSelectBtnHit(b.x + b.w / 2, b.y + b.h / 2), '确认按钮没命中');
  assert.ok(!XY.UI.charSelectBtnHit(b.x - 30, b.y + b.h / 2), '按钮左边空白不该命中');
});

test.it('选角：默认高亮上次出战过的角色', () => {
  global.localStorage._d = {};
  const g1 = new XY.Game(canvas);
  g1.charIndex = XY.CHARACTER_ORDER.indexOf('tangseng');
  g1.initRun();
  assert.strictEqual(g1.charId, 'tangseng');
  const g2 = new XY.Game(canvas);       // 重新开一局（模拟刷新页面）
  assert.strictEqual(XY.CHARACTER_ORDER[g2.charIndex], 'tangseng', '重进游戏后没记住上次的角色');
});

test.it('过关结算：点哪条选项就执行哪条，点空白不响应', () => {
  badLog.length = 0;
  const g = fresh();
  g.charIndex = 0;
  g.initRun();
  g.startLevel(0);
  g.state = 'levelClear';
  g.clearStats = { levelIndex: 0, name: XY.LEVELS[0].name, kills: 1, total: 1, jade: 8, gold: 100, level: 2, seconds: 30, last: false };
  const opts = g.clearOptions();
  const L = XY.UI.CLEAR_L;

  // 点空白：状态不变
  XY.Input.setMouse(4, 4);
  tap('Mouse0'); step(g, 0.016);
  assert.strictEqual(g.state, 'levelClear', '点空白不该推进');

  // 直接点「属性商店」那一条
  const shopI = opts.findIndex((o) => o.id === 'shop');
  assert.ok(shopI >= 0, '结算里应有商店选项');
  XY.Input.setMouse(L.x + 40, L.y + shopI * (L.h + L.gap) + L.h / 2);
  tap('Mouse0'); step(g, 0.016);
  assert.strictEqual(g.state, 'shop', '点商店那一条应进商店');
  assert.strictEqual(g.menuFrom, 'levelClear', '从结算进商店应记着回去的路');
  assert.deepStrictEqual(badLog, [], '结算界面渲染非法：\n' + badLog.join('\n'));
});
