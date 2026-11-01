// 动作模组的门禁：普攻四段、技能十五式各自要有独立动作，
// 不能出现"换个特效、动作还是同一套"的情况。
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
const FIELDS = ['ln', 'cr', 'lf', 'lb', 'hx', 'hy', 'bx', 'by', 'wa', 'wg', 'ws', 'hd', 'cape'];

// 把一个动作在若干进度上的骨架采样成一串数字，用来比较"像不像"
function trace(tbl, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const p = i / n;
    const s = {};
    for (const k in tbl) if (k !== 't') s[k] = M.kf(p, tbl[k].map((v, idx) => [(tbl.t || [0, 0.24, 0.5, 0.74, 1])[idx], v]));
    for (const f of FIELDS) out.push(s[f] === undefined ? 0 : s[f]);
  }
  return out;
}
function dist(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
  return d / a.length;
}

test.it('五名角色各四段普攻：动作表齐备且互不相同', () => {
  for (const cid of XY.CHARACTER_ORDER) {
    const table = XY.comboFor(cid);
    assert.strictEqual(table.length, 4, cid + ' 应有四段普攻');
    for (const seg of table) {
      assert.ok(M.BASIC[seg.path], cid + ' 的第 ' + seg.key + ' 式没有对应动作: ' + seg.path);
    }
    const paths = table.map((s) => s.path);
    assert.strictEqual(new Set(paths).size, 4, cid + ' 四段普攻应各走各的动作，实际 ' + paths.join('/'));
    // 两两比较：任意两段的骨架轨迹不能几乎重合
    const traces = paths.map((p) => trace(M.BASIC[p], 8));
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const d = dist(traces[i], traces[j]);
        assert.ok(d > 1.2, cid + ' 的 ' + paths[i] + ' 与 ' + paths[j] + ' 动作太像（差异 ' + d.toFixed(2) + '）');
      }
    }
  }
});

test.it('十五个技能各有独立动作长段，不是共用一套挥手', () => {
  const ids = Object.keys(XY.SKILLS);
  assert.ok(ids.length >= 15, '技能数不足 15 个');
  const seen = {};
  for (const id of ids) {
    const sk = XY.SKILLS[id];
    const anim = M.animForSkill(sk);
    assert.ok(anim, id + ' 没有动作模组');
    assert.ok(M.SKILL[anim], id + ' 的动作 ' + anim + ' 不在 SKILL 表里');
    assert.ok(sk.cast >= 300 && sk.cast <= 900, id + ' 的施法时长不合理: ' + sk.cast);
    assert.ok(sk.strike > 0.05 && sk.strike < 0.95, id + ' 的出手时机不合理: ' + sk.strike);
    (seen[anim] = seen[anim] || []).push(id);
  }
  // 允许少数技能共用同一"家族"动作（比如三种冲刺），但不能大半个技能表重合
  const reuse = Object.keys(seen).filter((k) => seen[k].length > 1);
  assert.strictEqual(reuse.length, 0, '以下动作被多个技能共用: ' + reuse.map((k) => k + '=' + seen[k].join(',')).join(' | '));
});

test.it('同一角色的七个动作两两可辨（技能 vs 普攻）', () => {
  for (const cid of XY.CHARACTER_ORDER) {
    const basics = XY.comboFor(cid).map((s) => trace(M.BASIC[s.path], 8));
    const skills = XY.getCharacter(cid).skills.map((id) => trace(M.SKILL[M.animForSkill(XY.getSkill(id))], 8));
    const all = basics.concat(skills);
    const names = XY.comboFor(cid).map((s) => s.path).concat(XY.getCharacter(cid).skills);
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const d = dist(all[i], all[j]);
        assert.ok(d > 1.0, cid + ' 的 ' + names[i] + ' 与 ' + names[j] + ' 几乎同一个动作（差异 ' + d.toFixed(2) + '）');
      }
    }
  }
});

test.it('骨架数值全部有限，且幅度落在可绘制范围', () => {
  const poses = [];
  for (const cid of XY.CHARACTER_ORDER) {
    for (const seg of XY.comboFor(cid)) poses.push({ charId: cid, state: 'attack', attackPath: seg.path, attackP: 0.5 });
    for (const id of XY.getCharacter(cid).skills) poses.push({ charId: cid, state: 'idle', castId: id, castP: 0.45 });
  }
  // 再扫一遍全进度，防止中间帧飙出天际
  for (const base of poses) {
    for (let p = 0; p <= 1.001; p += 0.05) {
      const pose = Object.assign({}, base, base.castId ? { castP: p } : { attackP: p });
      const r = M.rig(pose, 700);
      for (const f of FIELDS) {
        assert.ok(Number.isFinite(r[f]), JSON.stringify(base.charId) + ' 的 ' + (base.castId || base.attackPath) + ' 在 p=' + p.toFixed(2) + ' 的 ' + f + ' 不是有限数: ' + r[f]);
      }
      assert.ok(Math.abs(r.ln) < 1.2, '躯干倾角过大: ' + r.ln);
      assert.ok(Math.abs(r.hx) < 40 && Math.abs(r.hy) < 42, '手的位置离谱: ' + r.hx + ',' + r.hy);
      assert.ok(Math.abs(r.lf) < 3 && Math.abs(r.lb) < 3, '腿角离谱: ' + r.lf + ',' + r.lb);
    }
  }
});

test.it('拳脚招式不持械，兵器招式才画武器', () => {
  for (const [name, tbl] of Object.entries(M.BASIC)) {
    const r = M.rig({ charId: 'tangseng', state: 'attack', attackPath: name, attackP: 0.5 }, 700);
    const bare = ['palm', 'sleeve', 'kick', 'pray'].indexOf(name) >= 0;
    assert.strictEqual(r.bh, bare ? 1 : 0, name + (bare ? ' 应空手' : ' 应持械'));
  }
  // 掷出兵器后手上一律是空的
  const r = M.rig({ charId: 'wukong', state: 'idle', attackP: 0.5, attackPath: 'arc', noWeapon: true }, 700);
  assert.strictEqual(r.bh, 1, '兵器脱手后应空手');
});

test.it('普攻动作的出手帧明显偏离待机（看得出"在打"，不是站着）', () => {
  for (const cid of XY.CHARACTER_ORDER) {
    for (const seg of XY.comboFor(cid)) {
      const idle = M.rig({ charId: cid, state: 'idle' }, 700);
      const at = M.rig({ charId: cid, state: 'attack', attackPath: seg.path, attackP: seg.strike || 0.5 }, 700);
      const move = Math.abs(at.hx - idle.hx) + Math.abs(at.hy - idle.hy) + Math.abs(at.wa - idle.wa) * 6;
      assert.ok(move > 6, cid + ' 的 ' + seg.path + ' 出手帧离待机太近（' + move.toFixed(1) + '）');
    }
  }
});
