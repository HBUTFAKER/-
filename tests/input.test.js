// 输入链路回归测试：验证键盘监听真的被注册、Enter 能驱动状态推进。
// 之前 Game 里漏了 XY.Input.init()，导致按任何键都没反应，这里专门守住。
const test = require('node:test');
const assert = require('node:assert');

// —— 捕获 window 上注册的监听器 ——
const listeners = {};
global.window = {
  addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
};
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

const ctxStub = new Proxy({}, {
  get(_t, p) {
    if (p === 'createLinearGradient') return () => ({ addColorStop() {} });
    if (p === 'measureText') return () => ({ width: 10 });
    return () => {};
  },
});
const canvas = {
  width: 960, height: 540,
  getContext: () => ctxStub,
  addEventListener(type, fn) { this['_on' + type] = fn; },
};

function fire(type, code) {
  for (const fn of (listeners[type] || [])) fn({ code, preventDefault() {} });
}

test.it('键盘监听已注册：按下 Enter 能产生按键事件', () => {
  new XY.Game(canvas); // 构造时应调用 Input.init()
  assert.ok((listeners.keydown || []).length > 0, '未注册 keydown 监听');
  assert.ok((listeners.keyup || []).length > 0, '未注册 keyup 监听');

  fire('keydown', 'Enter');
  assert.equal(XY.Input.pressed('Enter'), true, '按下 Enter 后 pressed 应为 true');
  XY.Input.endFrame();
  assert.equal(XY.Input.pressed('Enter'), false, 'endFrame 后应清空');
  fire('keyup', 'Enter');
  assert.equal(XY.Input.isDown('Enter'), false, '抬起后 isDown 应为 false');
});

test.it('按 Enter 能从标题页进入选角页，再按进入剧情', () => {
  const game = new XY.Game(canvas);
  assert.equal(game.state, 'title');

  fire('keydown', 'Enter');
  game.update(0.016);
  XY.Input.endFrame();
  assert.equal(game.state, 'charselect', '标题页按 Enter 应进入选角页');

  fire('keyup', 'Enter');
  fire('keydown', 'Enter');
  game.update(0.016);
  XY.Input.endFrame();
  fire('keyup', 'Enter');
  assert.notEqual(game.state, 'charselect', '选角页按 Enter 应离开选角页');
  assert.ok(['cutscene', 'levelIntro'].includes(game.state), '应进入剧情或关卡前情，实际: ' + game.state);
});

test.it('鼠标点击canvas也能确认（键盘失灵兜底）', () => {
  const game = new XY.Game(canvas);
  assert.equal(game.state, 'title');
  assert.equal(typeof canvas._onmousedown, 'function', '未注册 mousedown 兜底');
  canvas._onmousedown({ preventDefault() {} });
  game.update(0.016);
  XY.Input.endFrame();
  assert.equal(game.state, 'charselect');
});

test.it('回归：关卡前情界面在关卡还没创建时不崩（曾导致蓝屏卡死）', () => {
  const game = new XY.Game(canvas);
  for (const idx of [0, 1, 2]) {
    game.levelIndex = idx;
    game.state = 'levelIntro'; // 此时 game.level 仍是 null，和真实流程一致
    assert.equal(game.level, null);
    assert.doesNotThrow(() => game.render(), 'levelIndex=' + idx + ' 渲染关卡前情抛错');
  }
});

test.it('完整流程：标题 → 选角 → CG → 关卡前情 → 实战', () => {
  const game = new XY.Game(canvas);
  const step = (code) => {
    fire('keydown', code);
    game.update(0.016);
    game.render();
    XY.Input.endFrame();
    fire('keyup', code);
  };
  assert.equal(game.state, 'title');
  step('Enter'); assert.equal(game.state, 'charselect', '标题页 Enter 未进入选角');
  step('Enter'); assert.equal(game.state, 'cutscene', '选角页 Enter 未进入 CG');
  step('Enter'); assert.equal(game.state, 'levelIntro', 'CG 按 Enter 未进入关卡前情');
  step('Enter'); assert.equal(game.state, 'playing', '关卡前情按 Enter 未开始战斗');
  assert.ok(game.player && game.level, '进入实战后 player / level 应存在');

  // 连续跑 120 帧（含移动与攻击），确认不会中途抛出把循环打断
  for (let i = 0; i < 120; i++) {
    if (i % 20 === 0) fire('keydown', 'KeyJ');
    game.update(0.016);
    game.render();
    XY.Input.endFrame();
  }
  assert.equal(game.state, 'playing', '战斗中途状态异常');
});

test.it('单帧异常被兜住：crash 不抛错，游戏不会直接僵死', () => {
  const game = new XY.Game(canvas);
  assert.doesNotThrow(() => game.crash(new Error('模拟错误')));
});

test.it('屏幕按钮可用：虚拟按键能驱动移动与普攻（键盘失灵环境兜底）', () => {
  const game = new XY.Game(canvas);
  game.charIndex = 0;
  game.initRun();
  game.startLevel(0);
  assert.equal(game.state, 'playing');

  const x0 = game.player.x;
  XY.Input.setVirtual('ArrowRight', true);
  for (let i = 0; i < 30; i++) { game.update(0.016); XY.Input.endFrame(); }
  XY.Input.clearVirtual();
  const moved = game.player.x - x0;
  assert.ok(moved > 20, '虚拟右键应让角色右移，实际位移 ' + moved.toFixed(1));

  XY.Input.setVirtual('KeyJ', true);
  game.update(0.016);
  XY.Input.endFrame();
  XY.Input.clearVirtual();
  assert.ok(game.player.attackReady > 0, '虚拟 J 键未触发普攻');
});


