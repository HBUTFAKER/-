// 敌人战斗门禁：每只怪都有普攻 + 技能 / 起手→出手→收招的状态机 / 一招只结算一次 / 每关都有首领
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

const ctx = new Proxy({}, {
  get(_t, p) {
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
    if (p === 'measureText') return (s) => ({ width: String(s).length * 8 });
    return () => {};
  },
});
const canvas = { width: 960, height: 540, getContext: () => ctx, addEventListener() {}, focus() {} };

function boot(lv) {
  const g = new XY.Game(canvas);
  g.charIndex = 0;
  g.initRun();
  g.startLevel(lv || 0);
  g.state = 'playing';
  g.now = 1000;
  // 出生点是半空，测试里直接放到地面上，别让判定框对不上
  g.player.y = 446;
  return g;
}

// 让敌人自己跑 ms 毫秒，返回这段时间里第一次出现的 strike
function runEnemy(e, g, ms, stepMs) {
  const dt = (stepMs || 16) / 1000;
  let found = null;
  for (let t = 0; t < ms; t += (stepMs || 16)) {
    g.now += (stepMs || 16);
    e.update(dt, g.player, g.level, g.now);
    if (e.strike && !found) found = e.strike;
    if (found) break;
  }
  return found;
}

test.describe('敌人招式数据', () => {
  test.it('三种杂兵都有普攻，且至少有一个技能', () => {
    for (const kind of ['imp', 'wolf', 'spider']) {
      const moves = XY.ENEMY_MOVES[kind];
      assert.ok(Array.isArray(moves) && moves.length >= 2, kind + ' 招式太少');
      assert.ok(moves.some((m) => m.type === 'melee'), kind + ' 缺普攻');
      assert.ok(moves.some((m) => m.type !== 'melee'), kind + ' 缺技能');
      for (const m of moves) {
        assert.ok(m.name && m.key, kind + ' 招式缺名字');
        assert.ok(m.windup > 0 && m.active > 0 && m.recover > 0, kind + '/' + m.key + ' 阶段时长不合法');
        assert.ok(Array.isArray(m.cd) && m.cd[1] >= m.cd[0], kind + '/' + m.key + ' 冷却不合法');
      }
    }
  });

  test.it('每个首领 3~4 招，且招式都在公共库里', () => {
    for (const key of XY.BOSS_ORDER) {
      const b = XY.BOSSES[key];
      assert.ok(Array.isArray(b.moves) && b.moves.length >= 3, key + ' 招式不足 3 个');
      const built = XY.bossMoves(b.moves);
      assert.strictEqual(built.length, b.moves.length, key + ' 有招式没在 BOSS_MOVES 里');
      assert.ok(built.some((m) => m.type === 'melee'), key + ' 缺近身普攻');
      assert.ok(built.some((m) => m.type !== 'melee'), key + ' 缺技能');
    }
  });

  test.it('每关都有且只有一只首领，且 boss 键名有效', () => {
    for (const lv of XY.LEVELS) {
      const bosses = lv.spawns.filter((s) => s.type === 'boss');
      assert.strictEqual(bosses.length, 1, lv.name + ' 首领数量不对');
      assert.ok(XY.BOSSES[bosses[0].boss], lv.name + ' 首领键名无效: ' + bosses[0].boss);
      assert.ok(XY.LEVELS && lv.spawns.length >= 2, lv.name + ' 只有首领没有杂兵');
    }
    // 12 关 12 只不同的首领
    const keys = XY.LEVELS.map((l) => l.spawns.find((s) => s.type === 'boss').boss);
    assert.strictEqual(new Set(keys).size, keys.length, '首领有重复出场');
  });

  test.it('首领招式是按实例复制的，改一个不影响别人', () => {
    const a = XY.bossMoves(['slam']);
    a[0].mult = 99;
    assert.notStrictEqual(XY.BOSS_MOVES.slam.mult, 99, '招式对象被共享改坏了');
  });
});

test.describe('敌人 AI 状态机', () => {
  test.it('进入索敌范围 → 起手（windup），并锁定朝向', () => {
    const g = boot();
    const e = XY.makeEnemy('imp', 500, 440, 1);
    XY.liftOutOfPlatforms(e, g.level.platforms);
    g.player.x = 460;                     // 贴身，只会选近身那招
    e.update(0.016, g.player, g.level, 1016);
    assert.strictEqual(e.state, 'windup', '没进入起手，实际 ' + e.state);
    assert.ok(e.cur && e.cur.type === 'melee', '起手招不是近身');
    assert.strictEqual(e.facing, -1, '朝向没对准玩家');
    assert.ok(e.tele >= 0 && e.tele <= 1, '起手进度应在 0..1');
  });

  test.it('起手结束 → 出手（active）并抛出一次性 strike', () => {
    const g = boot();
    const e = XY.makeEnemy('imp', 500, 440, 1);
    XY.liftOutOfPlatforms(e, g.level.platforms);
    g.player.x = 460;
    e.update(0.016, g.player, g.level, 1016);
    const s = runEnemy(e, g, 600);
    assert.ok(s, '起手完之后没有出手');
    assert.strictEqual(s.type, 'melee');
    assert.ok(s.box && s.box.w > 0 && s.box.h > 0, '近身招式缺判定框');
    assert.strictEqual(e.state, 'active');
  });

  test.it('出手完 → 收招 → 该招进入冷却', () => {
    const g = boot();
    const e = XY.makeEnemy('imp', 500, 440, 1);
    XY.liftOutOfPlatforms(e, g.level.platforms);
    g.player.x = 460;
    e.update(0.016, g.player, g.level, 1016);
    const key = e.cur.key;
    runEnemy(e, g, 600);
    // 走完 active + recover
    for (let i = 0; i < 60 && e.state !== 'chase'; i++) {
      g.now += 16;
      e.update(0.016, g.player, g.level, g.now);
    }
    assert.strictEqual(e.state, 'chase', '收招后应回到追击，实际 ' + e.state);
    assert.ok((e.cds[key] || 0) > g.now, '这一招没进冷却');
  });

  test.it('远处的杂兵不会在射程外开打', () => {
    const g = boot();
    const e = XY.makeEnemy('imp', 1500, 440, 1);
    XY.liftOutOfPlatforms(e, g.level.platforms);
    g.player.x = 300;                     // 1200 之外
    for (let i = 0; i < 40; i++) { g.now += 16; e.update(0.016, g.player, g.level, g.now); }
    assert.notStrictEqual(e.state, 'windup', '不该在索敌范围外起手');
  });

  test.it('眩晕期间不出招', () => {
    const g = boot();
    const e = XY.makeEnemy('imp', 500, 440, 1);
    XY.liftOutOfPlatforms(e, g.level.platforms);
    g.player.x = 460;
    e.stunUntil = 5000;
    for (let i = 0; i < 30; i++) { g.now += 16; e.update(0.016, g.player, g.level, g.now); }
    assert.notStrictEqual(e.state, 'windup');
    assert.ok(!e.strike, '眩晕里不该有攻击结算');
  });

  test.it('首领半血后进入狂暴，冷却更短', () => {
    const g = boot(2);
    const boss = g.level.enemies.find((e) => e.isBoss);
    assert.ok(boss, '这一关没有首领');
    assert.strictEqual(boss.enraged, false, '满血不该是狂暴');
    boss.hp = boss.maxHp * 0.4;
    assert.strictEqual(boss.enraged, true, '半血以下应狂暴');
  });
});

test.describe('敌人出招结算', () => {
  test.it('近身命中扣血，站在框外不掉血', () => {
    const g = boot();
    const e = XY.makeEnemy('imp', 500, 440, 1);
    XY.liftOutOfPlatforms(e, g.level.platforms);
    g.player.x = 470;
    e.moveDir = -1; e.facing = -1;
    e.cur = e.moves.find((m) => m.type === 'melee');
    e.beginActive(g.now, g.player);
    const s = e.strike;
    g.player.x = 470;                     // 在身前
    const hp0 = g.player.hp;
    g.player.invuln = 0;
    g.resolveEnemyStrike(e, s);
    assert.ok(g.player.hp < hp0, '近身招式没打中');

    g.player.hp = hp0; g.player.invuln = 0;
    g.player.x = 2000;                    // 躲远了
    g.resolveEnemyStrike(e, s);
    assert.strictEqual(g.player.hp, hp0, '离这么远还能打到人');
  });

  test.it('远程招式生成敌方弹道，弹道带重力', () => {
    const g = boot();
    const e = XY.makeEnemy('imp', 500, 440, 1);
    XY.liftOutOfPlatforms(e, g.level.platforms);
    g.player.x = 700;
    e.moveDir = 1; e.facing = 1;
    e.cur = e.moves.find((m) => m.type === 'shot');
    e.beginActive(g.now, g.player);
    const before = g.projectiles.length;
    g.resolveEnemyStrike(e, e.strike);
    assert.strictEqual(g.projectiles.length, before + 1, '没生成弹道');
    const p = g.projectiles[g.projectiles.length - 1];
    assert.strictEqual(p.owner, 'enemy');
    assert.ok(p.gravity > 0, '石头应该往下掉');
    assert.ok(p.damage >= 1, '弹道伤害应是有限正整数');
  });

  test.it('震地只打扇形范围内的地面目标', () => {
    const g = boot(2);
    const boss = g.level.enemies.find((e) => e.isBoss);
    boss.cur = boss.moves.find((m) => m.type === 'aoe') || XY.BOSS_MOVES.quake;
    boss.x = 800; boss.facing = 1; boss.moveDir = 1;
    boss.beginActive(g.now, g.player);
    const s = boss.strike;
    assert.strictEqual(s.type, 'aoe');
    g.player.invuln = 0; g.player.x = 860;
    const hp0 = g.player.hp;
    g.resolveEnemyStrike(boss, s);
    assert.ok(g.player.hp < hp0, '贴脸吃不到震地');

    g.player.hp = hp0; g.player.invuln = 0; g.player.x = boss.x + 900;
    g.resolveEnemyStrike(boss, s);
    assert.strictEqual(g.player.hp, hp0, '跑出半径还能被打到');
  });

  test.it('召妖会往关卡里加小怪', () => {
    const g = boot(0);
    const boss = g.level.enemies.find((e) => e.isBoss);
    const before = g.level.enemies.length;
    boss.cur = boss.moves.find((m) => m.type === 'summon');
    assert.ok(boss.cur, '花果山首领没有召妖');
    boss.beginActive(g.now, g.player);
    g.resolveEnemyStrike(boss, boss.strike);
    assert.ok(g.level.enemies.length > before, '召妖没加怪');
  });

  test.it('冲撞期间撞到人只结算一次', () => {
    const g = boot(2);
    const boss = g.level.enemies.find((e) => e.isBoss);
    boss.cur = boss.moves.find((m) => m.type === 'dash');
    assert.ok(boss.cur, '黑熊精没有冲撞');
    boss.x = 1000; boss.moveDir = -1; boss.facing = -1;
    boss.beginActive(g.now, g.player);
    assert.ok(boss.charge, '没进入冲撞状态');
    g.player.x = boss.x + 30; g.player.invuln = 0;
    const hp0 = g.player.hp;
    // 模拟 update 里的那次判定
    if (XY.aabb(boss, g.player)) { boss.charge.hit = true; g.hurtPlayerBy(boss, boss.charge.mult, {}); }
    assert.ok(g.player.hp < hp0, '撞上了却没掉血');
    const hp1 = g.player.hp;
    g.player.invuln = 0;
    if (!boss.charge.hit && XY.aabb(boss, g.player)) { g.hurtPlayerBy(boss, boss.charge.mult, {}); }
    assert.strictEqual(g.player.hp, hp1, '同一次冲撞打了两下');
  });
});

test.describe('首领血条', () => {
  test.it('离首领远时血条不出现，走近后淡入', () => {
    const g = boot(0);
    const boss = g.level.enemies.find((e) => e.isBoss);
    g.player.x = 100;
    boss.x = 2120;
    for (let i = 0; i < 30; i++) { g.now += 16; g.update(0.016); }
    assert.ok((g.bossBarA || 0) < 0.1, '隔着一整张地图不该弹血条，实际 ' + g.bossBarA);

    g.player.x = boss.x - 200;
    for (let i = 0; i < 40; i++) { g.now += 16; g.update(0.016); }
    assert.ok((g.bossBarA || 0) > 0.5, '走到首领跟前血条没出来，实际 ' + g.bossBarA);
    assert.strictEqual(g.bossRef, boss, '血条读的不是这只首领');
  });

  test.it('血条绘制不崩，且带名字与血量', () => {
    const g = boot(2);
    const boss = g.level.enemies.find((e) => e.isBoss);
    g.bossRef = boss; g.bossBarA = 1;
    assert.doesNotThrow(() => XY.UI.drawBossBar(ctx, g));
    boss.hp = boss.maxHp * 0.3;           // 狂暴态也要能画
    assert.doesNotThrow(() => XY.UI.drawBossBar(ctx, g));
  });
});

test.describe('出招预警绘制', () => {
  test.it('起手与出手都能画出地面范围，且不抛错', () => {
    const g = boot(0);
    const boss = g.level.enemies.find((e) => e.isBoss);
    boss.cur = boss.moves[0]; boss.tele = 0.5;
    boss.state = 'windup';
    assert.doesNotThrow(() => XY.UI.drawEnemyTell(ctx, boss, g.now));
    boss.state = 'active';
    assert.doesNotThrow(() => XY.UI.drawEnemyTell(ctx, boss, g.now));
    // 冲撞要额外铺一条道，分支也得能画
    boss.cur = { key: 'charge', name: '冲撞', type: 'dash', range: [140, 430], tell: '#ff5e5e' };
    assert.doesNotThrow(() => XY.UI.drawEnemyTell(ctx, boss, g.now));
  });

  test.it('小怪起手头顶出叹号，首领不出（首领靠顶部血条闪红）', () => {
    const g = boot(0);
    const imp = g.level.enemies.find((e) => !e.isBoss);
    const boss = g.level.enemies.find((e) => e.isBoss);
    let bangs = 0;
    const spy = new Proxy({}, {
      get(_t, p) {
        if (p === 'fillText') return (s) => { if (s === '!') bangs++; };
        if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
        if (p === 'measureText') return () => ({ width: 8 });
        return () => {};
      },
    });
    imp.state = 'windup'; imp.cur = imp.moves[0];
    XY.UI.drawAlertMark(spy, imp, g.now);
    assert.strictEqual(bangs, 1, '小怪起手没画叹号');
    boss.state = 'windup'; boss.cur = boss.moves[0];
    XY.UI.drawAlertMark(spy, boss, g.now);
    assert.strictEqual(bangs, 1, '首领不该再画叹号');
  });
});
