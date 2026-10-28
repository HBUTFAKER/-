// 关卡系统门禁：12 关数据 / 解锁规则 / 选关页命中 / 只能选打过的关
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

// 只测状态逻辑：拿原型拼实例，不跑渲染
function gameLite(cleared) {
  const g = Object.create(XY.Game.prototype);
  g.persist = {
    inventory: {}, equipped: {}, treasures: [], treasureSlots: [null, null, null],
    charId: 'wukong', levelReached: 0, cleared: (cleared || []).slice(), cgSeen: [],
    gold: 0, jade: 0, level: 1, exp: 0, attr: {}, skillLv: {},
  };
  g.inventory = {}; g.equipped = {}; g.treasures = []; g.treasureSlots = [null, null, null];
  g.charId = 'wukong'; g.levelIndex = 0; g.levelCursor = 0;
  g.toasts = []; g.floaters = []; g.expPops = []; g.now = 1000;
  g.state = 'levelselect';
  return g;
}
function tap(code) { XY.Input.setVirtual(code, true); XY.Input.setVirtual(code, false); }
function step(g) { g.update(0.016); XY.Input.endFrame(); }

test.describe('关卡 · 数据结构', () => {
  test.it('共 12 关：8 主线 + 4 支线，id 唯一', () => {
    assert.strictEqual(XY.LEVELS.length, 12, '关卡总数应为 12');
    assert.strictEqual(XY.mainLevels().length, 8, '主线应为 8 关');
    const sides = XY.LEVELS.filter((l) => l.kind === 'side');
    assert.strictEqual(sides.length, 4, '支线应为 4 关');
    const ids = XY.LEVELS.map((l) => l.id);
    assert.strictEqual(new Set(ids).size, ids.length, '关卡 id 不应重复');
  });

  test.it('每关都有名字、章节、三句以上前情、后话、奖励、终点', () => {
    for (const lv of XY.LEVELS) {
      assert.ok(lv.name && lv.name.length > 2, lv.id + ' 缺名字');
      assert.ok(Number.isFinite(lv.theme), lv.id + ' 缺 theme（场景会串）');
      assert.ok(Array.isArray(lv.intro) && lv.intro.length >= 3, lv.id + ' 前情不足三句');
      assert.ok(typeof lv.outro === 'string' && lv.outro.length > 4, lv.id + ' 缺过关后话');
      assert.ok(lv.reward && lv.reward.jade > 0, lv.id + ' 缺仙玉奖励');
      assert.ok(lv.goal && Number.isFinite(lv.goal.x), lv.id + ' 缺终点');
      assert.ok(lv.width > 960 && lv.platforms.length >= 4, lv.id + ' 关卡尺寸/平台不足');
      assert.ok(lv.spawns.length >= 2, lv.id + ' 敌人太少');
      // 敌人等级不能超过玩家一路打过来的合理范围
      for (const s of lv.spawns) assert.ok(s.level >= 1 && s.level <= 12, lv.id + ' 敌人等级越界');
    }
  });

  test.it('首领关的首领都在 BOSSES 表里，且章节号严格递增', () => {
    const bossLevels = XY.LEVELS.filter((l) => l.spawns.some((s) => s.type === 'boss'));
    assert.ok(bossLevels.length >= 3, '至少三个首领关');
    for (const lv of bossLevels) {
      for (const s of lv.spawns) {
        if (s.type !== 'boss') continue;
        assert.ok(XY.BOSSES[s.boss], lv.id + ' 的首领 ' + s.boss + ' 不在 BOSSES 表里');
      }
    }
    // 主线章节号 1..8 递增，支线用 chapter 0 或自带标记不参与比较
    const chapters = XY.mainLevels().map((l) => l.chapter);
    for (let i = 1; i < chapters.length; i++) {
      assert.ok(chapters[i] > chapters[i - 1], '主线章节号应递增：' + chapters.join(','));
    }
    // 最后一关必须是最终首领
    assert.ok(XY.LEVELS[11].spawns.some((s) => s.type === 'boss'), '最后一关应是首领战');
  });
});

test.describe('关卡 · 解锁规则', () => {
  test.it('空档只开第一关', () => {
    assert.strictEqual(XY.levelUnlocked(0, []), true);
    for (let i = 1; i < XY.LEVELS.length; i++) {
      assert.strictEqual(XY.levelUnlocked(i, []), false, '空档不该解锁第 ' + i + ' 关');
    }
  });

  test.it('主线只认前一主线；支线只认 require 那一关', () => {
    assert.strictEqual(XY.levelUnlocked(1, [0]), true, '通了第 1 关应开第 2 关');
    assert.strictEqual(XY.levelUnlocked(2, [0]), false, '跳关不该被解锁');
    assert.strictEqual(XY.levelUnlocked(2, [0, 1]), true);
    // 支线 4：require=3，通第 4 关（下标 3）才开
    assert.strictEqual(XY.LEVELS[4].kind, 'side');
    assert.strictEqual(XY.levelUnlocked(4, [0, 1, 2]), false, 'require 未达成不该开支线');
    assert.strictEqual(XY.levelUnlocked(4, [0, 1, 2, 3]), true, 'require 达成应开支线');
    // 支线夹在主线之间不会挡住主线推进
    assert.strictEqual(XY.levelUnlocked(5, [0, 1, 2, 3]), true, '支线不该挡住下一主线');
  });

  test.it('打过的关永久可重打（cleared 里有没有都算开）', () => {
    for (let i = 0; i < XY.LEVELS.length; i++) {
      assert.strictEqual(XY.levelUnlocked(i, [i]), true, '第 ' + i + ' 关打过了却算没解锁');
    }
  });

  test.it('nextMainAfter 跳过支线，最后一关返回 -1', () => {
    assert.strictEqual(XY.nextMainAfter(0), 1, '第 1 关之后是第 2 关');
    assert.strictEqual(XY.nextMainAfter(3), 5, '第 4 关（下标 3）之后应跳过支线到下标 5');
    assert.strictEqual(XY.nextMainAfter(11), -1, '最后一关之后没有主线了');
  });

  test.it('levelGrid：主线在前、支线在后，且覆盖全部关卡不重复', () => {
    const grid = XY.levelGrid();
    assert.strictEqual(grid.length, XY.LEVELS.length);
    assert.strictEqual(new Set(grid).size, grid.length, '排列里不该有重复');
    const firstSide = grid.findIndex((i) => XY.LEVELS[i].kind === 'side');
    assert.ok(firstSide >= 8, '支线应排在第 8 位之后（主线先排满）');
    for (let k = firstSide; k < grid.length; k++) {
      assert.strictEqual(XY.LEVELS[grid[k]].kind, 'side', '支线区里混进了主线');
    }
  });

  test.it('frontierLevel：光标默认落在"下一个没打过且已解锁"的关', () => {
    assert.strictEqual(XY.frontierLevel([]), 0);
    assert.strictEqual(XY.frontierLevel([0]), 1);
    assert.strictEqual(XY.frontierLevel([0, 1, 2, 3]), 5, '跳过还没开的支线，指向下一主线');
    const all = XY.LEVELS.map((_, i) => i);
    const f = XY.frontierLevel(all);
    assert.ok(f >= 0 && f < XY.LEVELS.length, '全通关后光标仍应落在合法关卡上');
  });
});

test.describe('关卡 · 选关页交互', () => {
  test.it('levelCardAt：4 列布局，卡片命中、缝隙与界外都不命中', () => {
    const L = XY.UI.levelSelectLayout();
    assert.strictEqual(L.n, 12);
    assert.strictEqual(L.cols, 4);
    for (let p = 0; p < L.n; p++) {
      const cx = L.x0 + (p % 4) * (L.cardW + L.gapX) + L.cardW / 2;
      const cy = L.y0 + Math.floor(p / 4) * (L.cardH + L.gapY) + L.cardH / 2;
      assert.strictEqual(XY.UI.levelCardAt(cx, cy, L.n), p, '第 ' + p + ' 格没命中');
    }
    // 卡片左侧空白 / 列间缝隙
    assert.strictEqual(XY.UI.levelCardAt(L.x0 - 12, L.y0 + 20, L.n), -1);
    assert.strictEqual(XY.UI.levelCardAt(L.x0 + L.cardW + L.gapX / 2, L.y0 + 20, L.n), -1);
    // 行间缝隙
    const yGap = L.y0 + L.cardH + L.gapY / 2;
    assert.strictEqual(XY.UI.levelCardAt(L.x0 + 10, yGap, L.n), -1);
    // 卡片下方（底部引子区）
    assert.strictEqual(XY.UI.levelCardAt(L.x0 + 10, 520, L.n), -1);
    // 最后一行不足 4 张时，空位不该命中
    assert.strictEqual(XY.UI.levelCardAt(L.x0 + 3 * (L.cardW + L.gapX) + 10, L.y0, 2), -1);
  });

  test.it('chooseLevel：没解锁的关点了不进去，已解锁的能进', () => {
    const g = gameLite([]);
    assert.strictEqual(g.chooseLevel(5), false, '未解锁的关不该能进');
    assert.strictEqual(g.state, 'levelselect', '被拒绝后应留在选关页');
    assert.ok(g.toasts.some((t) => /解锁/.test(t.text)), '应提示还没解锁');

    const g2 = gameLite([]);
    assert.strictEqual(g2.chooseLevel(0), true, '第一关应该能进');
    assert.strictEqual(g2.levelIndex, 0);
    // 头一次玩这个角色 → 先看 CG
    assert.strictEqual(g2.state, 'cutscene', '首次出战应先播该角色的前史 CG');
    // 看过之后再进就直接是关卡前情
    const g3 = gameLite([]);
    g3.persist.cgSeen = ['wukong'];
    g3.chooseLevel(0);
    assert.strictEqual(g3.state, 'levelIntro', '看过 CG 的角色应直接进关卡前情');
  });

  test.it('选关页方向键：只能落在已解锁的格子上，不会被推到锁着的关', () => {
    const g = gameLite([]);
    g.levelCursor = 0;
    tap('KeyD'); step(g);
    assert.strictEqual(g.levelCursor, 0, '右边全是锁着的关，光标不该动');
    tap('KeyS'); step(g);
    assert.strictEqual(g.levelCursor, 0, '下面也全是锁着的关');

    const g2 = gameLite([0]);
    g2.levelCursor = 0;
    tap('KeyD'); step(g2);
    assert.strictEqual(g2.levelCursor, 1, '通了第 1 关后右移应到第 2 关');
    // 第 2 关之后（下标 2）还锁着，再按右不该动
    tap('KeyD'); step(g2);
    assert.strictEqual(g2.levelCursor, 1, '再往右是锁着的关，光标不该动');
  });

  test.it('选关页 Enter 进关；Esc 回选角', () => {
    const g = gameLite([]);
    g.levelCursor = 0;
    tap('Enter'); step(g);
    assert.ok(['cutscene', 'levelIntro'].includes(g.state), '选关页 Enter 应进关，实际: ' + g.state);

    const g2 = gameLite([]);
    tap('Escape'); step(g2);
    assert.strictEqual(g2.state, 'charselect', 'Esc 应回到选角页');
  });

  test.it('过关结算：记录通关、解锁下一关，并给出关卡选择入口', () => {
    const g = gameLite([]);
    g.now = 5000;
    g.runStart = { gold: 0, jade: 0, at: 0 };
    g.runKills = 3;
    g.addJade = XY.Game.prototype.addJade;
    g.addGold = XY.Game.prototype.addGold;
    g.toast = XY.Game.prototype.toast;
    g.save = XY.Game.prototype.save;
    g.levelIndex = 1;                       // 打第 2 关（下标 1）—— 正常是要先通第 1 关
    g.persist.cleared = [0];
    g.level = { enemies: [{}, {}, {}] };
    g.player = { level: 3 };
    XY.Game.prototype.finishLevel.call(g);
    assert.strictEqual(g.state, 'levelClear');
    assert.ok(g.persist.cleared.indexOf(1) >= 0, '通关后应把这一关记进 cleared');
    assert.strictEqual(g.clearStats.firstTime, true, '首通应标记 firstTime');
    assert.ok(g.clearStats.outro && g.clearStats.outro.length > 0, '结算应带本关后话');
    const ids = g.clearOptions().map((o) => o.id);
    assert.ok(ids.indexOf('levels') >= 0, '结算应有关卡选择入口');
    // 通关后下一关也开了
    assert.strictEqual(XY.levelUnlocked(2, g.persist.cleared), true, '通关应解锁下一关');

    // 重打老关：firstTime = false，cleared 不重复记
    const before = g.persist.cleared.length;
    XY.Game.prototype.finishLevel.call(g);
    const g2 = gameLite(g.persist.cleared);
    g2.now = 6000; g2.runStart = { gold: 0, jade: 0, at: 0 }; g2.runKills = 1;
    g2.addJade = XY.Game.prototype.addJade; g2.addGold = XY.Game.prototype.addGold;
    g2.toast = XY.Game.prototype.toast; g2.save = XY.Game.prototype.save;
    g2.levelIndex = 1; g2.level = { enemies: [{}] }; g2.player = { level: 3 };
    XY.Game.prototype.finishLevel.call(g2);
    assert.strictEqual(g2.clearStats.firstTime, false, '重打不该算首通');
    assert.strictEqual(g2.persist.cleared.length, before, '重打不该往 cleared 里重复记');
  });
});
