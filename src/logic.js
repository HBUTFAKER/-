// 纯逻辑层：随机数 / 战斗 / 掉落 / 合成。无 DOM 依赖，可被 Node 测试直接 require。
(function (root) {
  const XY = (root.XY = root.XY || {});

  // —— 可复现 RNG（mulberry32）——
  XY.mulberry32 = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  XY.randInt = function (rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; };
  XY.chance = function (rng, p) { return rng() < p; };

  // —— 战斗 ——
  // 伤害 = 攻击*倍率 - 防御*0.5（下限1）；暴击（按暴击率）翻倍
  // 任何参数缺失/非法都兜底成有限值：宁可少打，也不能让 NaN 污染血量（NaN 会让怪物永远打不死）
  XY.computeDamage = function (attacker, defender, multiplier, rng) {
    rng = rng || Math.random;
    const atk = Number(attacker && attacker.attack);
    const def = Number(defender && defender.defense);
    const mul = Number(multiplier);
    const A = Number.isFinite(atk) ? atk : 0;
    const D = Number.isFinite(def) ? def : 0;
    const M = Number.isFinite(mul) && mul > 0 ? mul : 1;
    const base = A * M - D * 0.5;
    const raw = Math.max(1, Math.round(base));
    const crit = XY.chance(rng, attacker && attacker.critRate ? attacker.critRate : 0);
    return { amount: crit ? raw * 2 : raw, crit: crit };
  };
  XY.applyDamage = function (curHp, amount) { return Math.max(0, curHp - amount); };
  XY.expToNext = function (level) { return 50 + (level - 1) * 30; };
  XY.killExp = function (enemyLevel) { return 20 + enemyLevel * 10; };

  // 敌人属性按等级缩放
  XY.scaleEnemyStats = function (base, level) {
    const f = 1 + (level - 1) * 0.18;
    return {
      name: base.name, aggroRange: base.aggroRange, dropTable: base.dropTable,
      maxHp: Math.round(base.hp * f), hp: Math.round(base.hp * f),
      attack: Math.round(base.attack * f), defense: Math.round(base.defense * f),
      moveSpeed: base.moveSpeed,
    };
  };

  // —— 掉落 ——
  XY.rollDrops = function (table, rng) {
    rng = rng || Math.random;
    const result = {};
    for (const e of table) {
      if (!XY.chance(rng, e.chance)) continue;
      const qty = XY.randInt(rng, e.min, e.max);
      if (qty <= 0) continue;
      result[e.itemId] = (result[e.itemId] || 0) + qty;
    }
    return result;
  };
  XY.mergeInventory = function (target, add) {
    const out = Object.assign({}, target);
    for (const k in add) out[k] = (out[k] || 0) + add[k];
    return out;
  };

  // —— 合成（法宝）——
  XY.canCraft = function (inv, recipe) {
    return Object.keys(recipe.inputs).every((id) => (inv[id] || 0) >= recipe.inputs[id]);
  };
  XY.craft = function (inv, recipe) {
    if (!XY.canCraft(inv, recipe)) return null;
    const out = Object.assign({}, inv);
    for (const id in recipe.inputs) {
      out[id] -= recipe.inputs[id];
      if (out[id] <= 0) delete out[id];
    }
    out[recipe.output.itemId] = (out[recipe.output.itemId] || 0) + recipe.output.count;
    return out;
  };
  // 基础属性 + 已装备法宝 bonus
  XY.totalStats = function (base, equipped) {
    const t = Object.assign({}, base);
    for (const item of equipped) {
      if (!item || !item.bonus) continue;
      for (const k in item.bonus) t[k] += item.bonus[k];
    }
    return t;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = XY;
})(typeof window !== 'undefined' ? window : globalThis);
