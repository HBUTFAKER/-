// Horizon 门禁测试：战斗 / 掉落 / 合成 / 数据完整性。零依赖，node --test 运行。
const test = require('node:test');
const assert = require('node:assert');
const XY = require('../src/logic.js');
require('../src/data.js'); // 确保数据挂到同一 XY

const noCrit = () => 0.99;
const forceCrit = () => 0.0;

test.describe('combat · 伤害公式', () => {
  test.it('基础伤害 = 攻击*倍率 - 防御*0.5，下限1', () => {
    assert.strictEqual(XY.computeDamage({ attack: 20, critRate: 0 }, { defense: 0 }, 1, noCrit).amount, 20);
  });
  test.it('防御减伤（防御10 -> 减5）', () => {
    assert.strictEqual(XY.computeDamage({ attack: 20, critRate: 0 }, { defense: 10 }, 1, noCrit).amount, 15);
  });
  test.it('暴击翻倍', () => {
    const r = XY.computeDamage({ attack: 20, critRate: 0.12 }, { defense: 10 }, 1, forceCrit);
    assert.strictEqual(r.crit, true);
    assert.strictEqual(r.amount, 30);
  });
  test.it('伤害不低于1', () => {
    assert.strictEqual(XY.computeDamage({ attack: 1, critRate: 0 }, { defense: 999 }, 1, noCrit).amount, 1);
  });
  test.it('applyDamage 不扣成负数', () => {
    assert.strictEqual(XY.applyDamage(10, 50), 0);
    assert.strictEqual(XY.applyDamage(30, 5), 25);
  });
  test.it('经验曲线与击杀经验', () => {
    assert.strictEqual(XY.expToNext(1), 50);
    assert.strictEqual(XY.expToNext(2), 80);
    assert.strictEqual(XY.killExp(1), 30);
    assert.strictEqual(XY.killExp(5), 70);
  });
});

test.describe('drops · 掉落', () => {
  test.it('相同种子可复现', () => {
    const table = [
      { itemId: 'a', weight: 1, chance: 0.5, min: 1, max: 2 },
      { itemId: 'b', weight: 1, chance: 0.5, min: 1, max: 3 },
    ];
    assert.deepStrictEqual(XY.rollDrops(table, XY.mulberry32(12345)), XY.rollDrops(table, XY.mulberry32(12345)));
  });
  test.it('chance=1 必掉，chance=0 必不掉', () => {
    const table = [
      { itemId: 'always', weight: 1, chance: 1, min: 1, max: 1 },
      { itemId: 'never', weight: 1, chance: 0, min: 1, max: 1 },
    ];
    const r = XY.rollDrops(table, () => 0.5);
    assert.strictEqual(r.always, 1);
    assert.strictEqual(r.never, undefined);
  });
  test.it('mergeInventory 不改动入参', () => {
    const a = { x: 1 };
    const b = XY.mergeInventory(a, { x: 2, y: 3 });
    assert.deepStrictEqual(a, { x: 1 });
    assert.deepStrictEqual(b, { x: 3, y: 3 });
  });
});

test.describe('crafting · 法宝合成', () => {
  const recipe = XY.RECIPES[0];
  test.it('材料足够可合成，消耗正确', () => {
    const inv = { mat_wood: 5, mat_stone: 5, mat_soul: 5 };
    assert.strictEqual(XY.canCraft(inv, recipe), true);
    const out = XY.craft(inv, recipe);
    assert.strictEqual(out[recipe.output.itemId], recipe.output.count);
    assert.strictEqual(out.mat_wood, 5 - recipe.inputs.mat_wood);
    assert.strictEqual(out.mat_soul, 5 - recipe.inputs.mat_soul);
  });
  test.it('材料不足返回 null，不改动入参', () => {
    const inv = { mat_wood: 0, mat_stone: 0, mat_soul: 0 };
    const before = Object.assign({}, inv);
    assert.strictEqual(XY.canCraft(inv, recipe), false);
    assert.strictEqual(XY.craft(inv, recipe), null);
    assert.deepStrictEqual(inv, before);
  });
  test.it('totalStats 叠加 bonus', () => {
    const base = { maxHp: 200, attack: 20, defense: 5, moveSpeed: 180, critRate: 0.1 };
    const t = XY.totalStats(base, [XY.ITEMS.eq_staff, XY.ITEMS.eq_robe]);
    assert.strictEqual(t.attack, 38);
    assert.strictEqual(t.maxHp, 260);
    assert.ok(Math.abs(t.critRate - 0.2) < 1e-9);
  });
});

test.describe('数据完整性（门禁）', () => {
  test.it('每位角色至少3技能且归属正确', () => {
    for (const id of XY.CHARACTER_ORDER) {
      const c = XY.CHARACTERS[id];
      assert.ok(c.skills.length >= 3, `${id} 技能不足3个`);
      for (const sid of c.skills) {
        assert.ok(XY.SKILLS[sid], `技能 ${sid} 缺失`);
        assert.strictEqual(XY.SKILLS[sid].characterId, id);
      }
    }
  });
  test.it('技能数值合理', () => {
    for (const s of Object.values(XY.SKILLS)) {
      assert.ok(s.multiplier >= 0);
      assert.ok(s.cooldown > 0);
      assert.ok(s.cost >= 0);
    }
  });
  test.it('12 件法宝 effect 合法', () => {
    const valid = ['aoe_damage', 'stun', 'knockback', 'dot', 'heal', 'speed', 'instant_kill_weak', 'shield'];
    const ids = Object.keys(XY.TREASURES);
    assert.strictEqual(ids.length, 12);
    for (const t of Object.values(XY.TREASURES)) {
      assert.ok(valid.includes(t.effect));
      assert.ok(t.cooldown > 0);
    }
  });
  test.it('合成产出物均已定义', () => {
    for (const r of XY.RECIPES) assert.ok(XY.ITEMS[r.output.itemId], `产出 ${r.output.itemId} 未定义`);
  });
  test.it('关卡敌人类型合法', () => {
    const kinds = ['imp', 'wolf', 'spider', 'boss'];
    for (const lv of XY.LEVELS) {
      assert.ok(lv.spawns.length > 0);
      for (const s of lv.spawns) assert.ok(kinds.includes(s.type));
    }
  });
  test.it('孙悟空初始法宝存在', () => {
    assert.ok(XY.CHARACTERS.wukong.startTreasure);
    assert.ok(XY.TREASURES[XY.CHARACTERS.wukong.startTreasure]);
  });
});
