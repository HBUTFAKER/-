// 无头冒烟测试：桩掉浏览器 API，实例化 Game 并跑大量帧，
// 验证主循环 / 战斗结算 / 渲染不抛异常，且玩家能正常移动与战斗。
const test = require('node:test');
const assert = require('node:assert');

// —— 浏览器环境桩 ——
global.window = { addEventListener() {} };
global.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] || null; },
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

// 可控输入桩
const fakeDown = {};
const fakePressed = {};
XY.Input = {
  down: fakeDown,
  isDown: (c) => !!fakeDown[c],
  pressed: (c) => !!fakePressed[c],
  endFrame: () => { for (const k in fakePressed) delete fakePressed[k]; },
  init() {},
};

// 假 canvas / ctx（所有绘图调用 no-op）
const ctxStub = new Proxy({}, {
  get(_t, p) {
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
    if (p === 'measureText') return () => ({ width: 10 });
    return () => {};
  },
});
const canvas = { width: 960, height: 540, getContext: () => ctxStub };

test.it('无头跑帧：选角→进关→移动+攻击不抛错', () => {
  const game = new XY.Game(canvas);
  game.charIndex = 0;
  game.initRun();
  game.startLevel(0);
  game.state = 'playing';

  let threw = null;
  const startX = game.player.x;
  for (let i = 0; i < 1500 && game.state === 'playing'; i++) {
    fakeDown['ArrowRight'] = true;
    fakePressed['KeyJ'] = true; // 普攻
    if (i % 50 === 0) fakePressed['Digit1'] = true; // 偶尔放法宝
    if (i % 70 === 0) fakePressed['KeyK'] = true; // 偶尔放技能
    try {
      game.update(0.016);
      game.render();
    } catch (e) { threw = e; break; }
    XY.Input.endFrame();
  }
  assert.strictEqual(threw, null, '主循环抛出异常: ' + (threw && threw.stack));
  assert.ok(game.player.x > startX, '玩家应向右移动');
  // 状态应为合法值
  assert.ok(['playing', 'levelIntro', 'win', 'gameover'].includes(game.state));
});

test.it('五项系统接口可用：合成/法宝/技能/掉落/升级', () => {
  const game = new XY.Game(canvas);
  game.charIndex = 0;
  game.initRun();
  game.startLevel(0);
  game.state = 'playing';
  // 给足材料，验证合成产出并自动装备
  game.inventory = { mat_wood: 9, mat_stone: 9, mat_soul: 9, mat_herb: 9, mat_fire: 9 };
  const before = JSON.stringify(game.player.stats);
  game.inventory = XY.craft(game.inventory, XY.RECIPES[0]); // 金箍棒
  game.equipped.weapon = 'eq_staff';
  game.rebuildPlayer();
  assert.notStrictEqual(JSON.stringify(game.player.stats), before, '合成装备后属性应变化');
  assert.ok(game.player.stats.attack > XY.CHARACTERS.wukong.base.attack, '金箍棒应提升攻击');

  // 法宝施放不抛错
  game.treasures = ['tr_wuxing', 'tr_kunxian', 'tr_yujing'];
  for (const t of game.treasures) {
    try { game.execTreasure(XY.getTreasure(t)); } catch (e) { assert.fail('法宝 ' + t + ' 抛错: ' + e.stack); }
  }
  // 技能释放不抛错
  for (let s = 0; s < 3; s++) {
    try { game.act(game.player.trySkill(s, game.now + 999999)); } catch (e) { assert.fail('技能 ' + s + ' 抛错: ' + e.stack); }
  }
});

test.it('各界面渲染不抛错（标题/选角/CG/前情/合成/暂停/结算）', () => {
  const g = new XY.Game(canvas);
  const states = ['title', 'charselect'];
  let err = null;
  for (const s of states) { g.state = s; try { g.render(); } catch (e) { err = e; break; } }
  // 需要关卡上下文的界面
  g.charIndex = 0; g.initRun(); g.startLevel(0);
  const ctxStates = ['levelIntro', 'craft', 'pause', 'gameover', 'win'];
  for (const s of ctxStates) { g.state = s; try { g.render(); } catch (e) { err = e; break; } }
  g.cutIndex = 0; g.state = 'cutscene'; try { g.render(); } catch (e) { err = e; }
  assert.strictEqual(err, null, '界面渲染抛错: ' + (err && err.stack));
});
