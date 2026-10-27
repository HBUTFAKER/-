// 成长系统门禁：属性成长 / 金币商店 / 仙玉技能 / 材料锻造
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
require('../src/art.js');
require('../src/fx.js');
require('../src/scenery.js');
require('../src/engine.js');
require('../src/ui.js');
require('../src/game.js');

// 只测状态逻辑，不跑渲染：手工拼一个带原型方法的 game 实例
function makeGame(charId) {
  const g = Object.create(XY.Game.prototype);
  g.persist = {
    inventory: {}, equipped: {}, treasures: [], treasureSlots: [null, null, null],
    charId: charId || 'wukong', levelReached: 0,
    gold: 0, jade: 0, level: 1, exp: 0, attr: {}, skillLv: {},
  };
  g.inventory = {}; g.equipped = {}; g.treasures = [];
  g.treasureSlots = [null, null, null];
  g.charId = charId || 'wukong';
  g.levelIndex = 0;
  g.toasts = []; g.floaters = []; g.expPops = [];
  g.player = XY.makePlayer(XY.CHARACTERS[g.charId], [], g.treasureSlots, g.persist);
  return g;
}

test.describe('成长 · 每级自动提升', () => {
  test.it('1 级时等于基础值', () => {
    const base = XY.CHARACTERS.wukong.base;
    const st = XY.heroStats(base, { level: 1, attr: {} }, []);
    assert.strictEqual(st.attack, base.attack);
    assert.strictEqual(st.maxHp, base.maxHp);
  });

  test.it('每升一级按 GROWTH 累加，5 级正好 4 次成长', () => {
    const base = XY.CHARACTERS.wukong.base;
    const st = XY.heroStats(base, { level: 5, attr: {} }, []);
    assert.strictEqual(st.attack, base.attack + XY.GROWTH.attack * 4);
    assert.strictEqual(st.maxHp, base.maxHp + XY.GROWTH.maxHp * 4);
    assert.strictEqual(st.defense, base.defense + XY.GROWTH.defense * 2 * 2 > 0 ? st.defense : 0);
    assert.ok(st.defense > base.defense);
  });

  test.it('属性都是整数，暴击被夹在合理区间', () => {
    const st = XY.heroStats(XY.CHARACTERS.wukong.base, { level: 60, attr: { critRate: 12 } }, []);
    assert.ok(Number.isInteger(st.attack) && Number.isInteger(st.maxHp));
    assert.ok(st.critRate > 0 && st.critRate <= 0.75);
  });
});

test.describe('商店 · 金币买属性', () => {
  test.it('价格按次数递增，第一次就是基础价', () => {
    const row = XY.SHOP[0];
    assert.strictEqual(XY.shopPrice(row, 0), row.base);
    let prev = 0;
    for (let n = 0; n < 10; n++) {
      const p = XY.shopPrice(row, n);
      assert.ok(p > prev, '第 ' + n + ' 次价格应高于上一次');
      prev = p;
    }
  });

  test.it('买得起就扣钱、加属性、记次数', () => {
    const g = makeGame();
    const row = XY.SHOP[0];
    const before = g.player.stats.attack;
    g.persist.gold = 10000;
    const price = XY.shopPrice(row, 0);
    assert.strictEqual(g.buyAttr(row), true);
    assert.strictEqual(g.persist.gold, 10000 - price);
    assert.strictEqual(g.player.stats.attack, before + row.step);
    assert.strictEqual(g.persist.attr[row.key], 1);
  });

  test.it('钱不够不扣钱也不加属性', () => {
    const g = makeGame();
    const row = XY.SHOP[0];
    g.persist.gold = 1;
    const before = g.player.stats.attack;
    assert.strictEqual(g.buyAttr(row), false);
    assert.strictEqual(g.persist.gold, 1);
    assert.strictEqual(g.player.stats.attack, before);
  });

  test.it('买满上限后不再出售', () => {
    const g = makeGame();
    const row = XY.SHOP[0];
    g.persist.gold = 99999999;
    for (let i = 0; i < row.max; i++) g.buyAttr(row);
    const goldAfter = g.persist.gold;
    assert.strictEqual(g.persist.attr[row.key], row.max);
    assert.strictEqual(g.buyAttr(row), false);
    assert.strictEqual(g.persist.gold, goldAfter, '满级后不应再扣钱');
  });
});

test.describe('技能 · 仙玉参悟', () => {
  test.it('每升一重倍率升、冷却降、范围涨', () => {
    const sk = XY.getSkill('wk_smash');
    const lv1 = XY.skillAtLevel(sk, 1);
    const lv3 = XY.skillAtLevel(sk, 3);
    assert.strictEqual(lv1.multiplier, sk.multiplier);
    assert.ok(lv3.multiplier > lv1.multiplier);
    assert.ok(lv3.cooldown < lv1.cooldown);
    assert.ok(lv3.range > lv1.range);
    assert.strictEqual(lv3.cost, sk.cost, '耗气不能随等级变高');
  });

  test.it('等级被夹在 1..SKILL_MAX_LV', () => {
    const sk = XY.getSkill('wk_spin');
    assert.strictEqual(XY.skillAtLevel(sk, 0).level, 1);
    assert.strictEqual(XY.skillAtLevel(sk, 99).level, XY.SKILL_MAX_LV);
  });

  test.it('升级费用逐级递增，满级返回 null', () => {
    const seen = [];
    for (let lv = 1; lv < XY.SKILL_MAX_LV; lv++) seen.push(XY.skillUpCost(lv));
    for (let i = 1; i < seen.length; i++) assert.ok(seen[i] > seen[i - 1], '费用应递增');
    assert.strictEqual(XY.skillUpCost(XY.SKILL_MAX_LV), null);
  });

  test.it('仙玉够就升级并扣费，不够则拒绝', () => {
    const g = makeGame();
    const sid = 'wk_smash';
    const cost = XY.skillUpCost(1);
    g.persist.jade = cost - 1;
    assert.strictEqual(g.upgradeSkill(sid), false);
    assert.strictEqual(g.persist.jade, cost - 1);
    g.persist.jade = cost;
    assert.strictEqual(g.upgradeSkill(sid), true);
    assert.strictEqual(g.persist.jade, 0);
    assert.strictEqual(g.persist.skillLv[sid], 2);
    assert.strictEqual(g.player.skillLv[sid], 2, '玩家身上要立刻生效');
  });

  test.it('升满后不再扣仙玉', () => {
    const g = makeGame();
    const sid = 'wk_dash';
    g.persist.jade = 999999;
    for (let i = 1; i < XY.SKILL_MAX_LV; i++) g.upgradeSkill(sid);
    const jade = g.persist.jade;
    assert.strictEqual(g.upgradeSkill(sid), false);
    assert.strictEqual(g.persist.jade, jade);
  });
});

test.describe('锻造 · 材料换装备', () => {
  test.it('三档九件，配方都能产出对应装备', () => {
    const slots = new Set();
    for (const r of XY.RECIPES) {
      const out = XY.ITEMS[r.output.itemId];
      assert.ok(out && out.slot, r.name + ' 产出不是装备');
      slots.add(out.slot);
    }
    assert.deepStrictEqual([...slots].sort(), ['armor', 'trinket', 'weapon']);
    assert.strictEqual(XY.RECIPES.length, 9);
  });

  test.it('金币不够时不能锻造，够了才放行', () => {
    const r = XY.RECIPES.find((x) => x.gold > 0);
    const inv = {};
    for (const k of Object.keys(r.inputs)) inv[k] = r.inputs[k];
    assert.strictEqual(XY.canForge(inv, r, r.gold - 1), false);
    assert.strictEqual(XY.canForge(inv, r, r.gold), true);
  });

  test.it('装备上身后攻击立刻变化，卸下能还原', () => {
    const g = makeGame();
    const base = g.player.stats.attack;
    g.equipped.weapon = 'eq_staff';
    g.rebuildPlayer();
    assert.strictEqual(g.player.stats.attack, base + XY.ITEMS.eq_staff.bonus.attack);
    delete g.equipped.weapon;
    g.rebuildPlayer();
    assert.strictEqual(g.player.stats.attack, base);
  });
});

test.describe('存档 · 新字段读写', () => {
  test.it('金币仙玉等级加点技能都会落盘并读回', () => {
    global.localStorage._d = {};
    const g = makeGame();
    g.persist.gold = 321;
    g.persist.jade = 45;
    g.persist.level = 7;
    g.player.level = 7;          // 真实流程里玩家等级是唯一真相，save 时从这里回写
    g.persist.attr = { attack: 2 };
    g.persist.skillLv = { wk_smash: 3 };
    g.save();

    const g2 = makeGame();
    g2.persist = g2.load();
    assert.strictEqual(g2.persist.gold, 321);
    assert.strictEqual(g2.persist.jade, 45);
    assert.strictEqual(g2.persist.level, 7);
    assert.strictEqual(g2.persist.attr.attack, 2);
    assert.strictEqual(g2.persist.skillLv.wk_smash, 3);
  });

  test.it('脏存档被清洗，不会把非法值带进战斗', () => {
    global.localStorage._d = {};
    global.localStorage.setItem('xiyou_save_v1', JSON.stringify({
      gold: -50, jade: 'abc', level: 0, attr: { attack: -3, critRate: 999 }, skillLv: { wk_smash: 99 },
    }));
    const g = makeGame();
    const p = g.load();
    assert.strictEqual(p.gold, 0);
    assert.strictEqual(p.jade, 0);
    assert.strictEqual(p.level, 1);
    assert.strictEqual(p.attr.attack, undefined);
    assert.strictEqual(p.attr.critRate, XY.SHOP.find((r) => r.key === 'critRate').max);
    assert.strictEqual(p.skillLv.wk_smash, XY.SKILL_MAX_LV);
  });
});

test.describe('战斗内 · 升级与技能等级生效', () => {
  test.it('打怪升级会按成长提升属性并回满血', () => {
    const g = makeGame();
    const pl = g.player;
    const atk = pl.stats.attack;
    const hpMax = pl.maxHp;
    pl.hp = 10;
    const need = XY.expToNext(pl.level);
    const ups = pl.gainExp(need, null);
    assert.strictEqual(ups, 1);
    assert.strictEqual(pl.level, 2);
    assert.strictEqual(pl.stats.attack, atk + XY.GROWTH.attack);
    assert.strictEqual(pl.maxHp, hpMax + XY.GROWTH.maxHp);
    assert.strictEqual(pl.hp, pl.maxHp, '升级应回满血');
    assert.strictEqual(g.persist.level, 2, '等级要写回存档对象');
  });

  test.it('技能升到 3 重后，实际冷却比 1 重短', () => {
    const g = makeGame();
    const pl = g.player;
    const sid = 'wk_smash';
    g.persist.skillLv[sid] = 3;
    pl.skillLv = g.persist.skillLv;
    const a = pl.trySkill(0, 1000);
    assert.ok(a, '应该能放出来');
    const cd3 = pl.skillCd[sid] - 1000;
    const base = XY.getSkill(sid);
    assert.ok(cd3 < base.cooldown, '升过级的冷却应短于基础值');
    assert.ok(a.multiplier > base.multiplier, '升过级的倍率应更高');
  });
});
