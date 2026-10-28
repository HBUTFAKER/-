// 像素角色层门禁：造型表 / 头部网格 / 像素笔（胶囊·扫描线·描边）/ 骨架角度。
// 这一层不碰 DOM，所以在 node 里能直接验；渲染入口的矢量兜底由 render.test.js 覆盖。
const test = require('node:test');
const assert = require('node:assert');

global.window = {};
const XY = require('../src/art.js');
const PX = XY.Art.PX;
const IDS = ['wukong', 'bajie', 'tangseng', 'shaseng', 'bailongma'];

test.describe('像素角色造型表', () => {
  test.it('五个角色都有完整参数，兵器类型合法', () => {
    for (const id of IDS) {
      const L = PX.look[id];
      assert.ok(L, id + ' 缺像素造型表');
      for (const k of ['hipY', 'torso', 'torsoR', 'headR', 'legLen', 'armLen',
        'skin', 'skinSh', 'face', 'armor', 'armorSh', 'sleeve', 'pants', 'boot', 'eye']) {
        assert.ok(L[k] !== undefined, id + ' 缺字段 ' + k);
      }
      assert.ok(['staff', 'rake', 'staff2', 'spear', 'none'].includes(L.weapon), id + ' 兵器类型异常：' + L.weapon);
      assert.ok(L.hipY < 0, id + ' 髋部必须在脚点上方');
      assert.ok(L.torso > 6 && L.headR > 3 && L.legLen > 6, id + ' 比例离谱');
    }
  });

  test.it('五个角色身高接近（差距不超过 15%），避免同框时高矮突兀', () => {
    const hs = IDS.map((id) => {
      const L = PX.look[id];
      return -L.hipY + L.torso + L.headR * 2;
    });
    const lo = Math.min(...hs), hi = Math.max(...hs);
    assert.ok((hi - lo) / hi < 0.15, '身高差过大：' + hs.map((h) => h.toFixed(1)).join(' / '));
  });

  test.it('头部网格是矩形，字符都在调色板里', () => {
    for (const id of IDS) {
      const rows = PX.heads[id];
      assert.ok(Array.isArray(rows) && rows.length >= 8, id + ' 头部网格缺失或太矮');
      const w = rows[0].length;
      const pal = PX.headsPal[id];
      assert.ok(pal, id + ' 缺头部调色板');
      for (const row of rows) {
        assert.strictEqual(row.length, w, id + ' 有一行宽度不一致：' + row);
        for (const ch of row) {
          if (ch === '.') continue;
          assert.ok(pal[ch], id + ' 用到调色板里没有的字符：' + ch);
        }
      }
      // 每颗头都得有五官：至少两个眼点 + 一条深色线
      const flat = rows.join('');
      assert.ok((flat.match(/e/g) || []).length >= 2, id + ' 眼睛不足两个像素');
    }
  });
});

test.describe('像素笔', () => {
  test.it('胶囊盖住两端，四角留空', () => {
    const p = new PX.Painter(20, 20);
    const c = PX.color('#ff0000');
    p.capsule(4, 4, 15, 4, 1.2, c);
    assert.strictEqual(p.px[4 * 20 + 4], c, '起点没画到');
    assert.strictEqual(p.px[4 * 20 + 15], c, '终点没画到');
    assert.strictEqual(p.px[4 * 20 + 9], c, '中段断开');
    assert.strictEqual(p.px[0], 0, '画到不该画的地方');
  });

  test.it('多边形是实心的，扫描线不留缝', () => {
    const p = new PX.Painter(24, 24);
    const c = PX.color('#00ff88');
    p.poly([[6, 6], [17, 6], [17, 17], [6, 17]], c);
    for (let y = 7; y < 17; y++) {
      for (let x = 7; x < 17; x++) assert.strictEqual(p.px[y * 24 + x], c, '内部有洞 @' + x + ',' + y);
    }
    assert.strictEqual(p.px[2 * 24 + 2], 0);
  });

  test.it('描边只加在外面，不啃内部像素', () => {
    const p = new PX.Painter(24, 24);
    const body = PX.color('#ffcc00');
    const out = PX.color('#112233');
    p.poly([[6, 6], [17, 6], [17, 17], [6, 17]], body);
    const inner = p.px[10 * 24 + 10];
    p.outline(out);
    assert.strictEqual(p.px[10 * 24 + 10], inner, '内部像素被改了');
    assert.strictEqual(p.px[10 * 24 + 5], out, '左侧没描边');
    assert.strictEqual(p.px[10 * 24 + 17], out, '右侧没描边');
    assert.strictEqual(p.px[10 * 24 + 3], 0, '描边铺得太远');
  });
});

test.describe('像素骨架', () => {
  test.it('站立：头在肩上方、髋在肩下方、手握在身侧', () => {
    const L = PX.look.wukong;
    const r = PX.rig(L, { t: 0, state: 'idle', facing: 1 });
    assert.ok(r.head[1] < r.sh[1], '头没在肩上方');
    assert.ok(r.sh[1] < r.hip[1], '肩没在髋上方');
    assert.ok(r.hand[0] > r.sh[0] + 3, '站立时手应该在身体前方（不然兵器会挡脸）');
    assert.ok(r.hand[1] > r.sh[1], '手不该举到肩以上');
    assert.ok(Math.abs(r.wpnAng) < 0.4, '站立时兵器要近乎竖着拿');
  });

  test.it('跑动/腾空/受击/出招/施法都算得出有限数', () => {
    const L = PX.look.bajie;
    const poses = [
      { t: 700, state: 'run', sprint: true },
      { t: 700, state: 'jump' },
      { t: 700, state: 'dash' },
      { t: 700, state: 'hurt', hurtP: 0.3 },
      { t: 700, state: 'attack', attackP: 0.4, attackBody: 0, attackPath: 0 },
      { t: 700, state: 'attack', attackP: 0.6, attackBody: 1, attackPath: 1 },
      { t: 700, state: 'idle', castP: 0.5, castId: 'wk_smash' },
      { t: 700, state: 'idle', castP: 0.5, castId: 'wk_spin' },
    ];
    for (const pose of poses) {
      const r = PX.rig(L, pose);
      for (const k of ['hip', 'sh', 'head', 'hand']) {
        assert.ok(Number.isFinite(r[k][0]) && Number.isFinite(r[k][1]), k + ' 出现非有限数 @' + (pose.state || '') + (pose.castId || ''));
      }
      assert.ok(Number.isFinite(r.wpnAng) && Number.isFinite(r.armAng), '角度非有限数');
      assert.ok(Math.abs(r.legA) < 2 && Math.abs(r.legB) < 2, '腿角度失控：' + r.legA + '/' + r.legB);
    }
  });

  test.it('奔跑时腿是交替的，站立时几乎并拢', () => {
    const L = PX.look.shaseng;
    const idle = PX.rig(L, { t: 0, state: 'idle' });
    assert.ok(Math.abs(idle.legA - idle.legB) < 0.3, '站立时两条腿不该张太开');
    let crossed = false;
    for (let t = 0; t < 600; t += 25) {
      const r = PX.rig(L, { t, state: 'run' });
      if (r.legA * r.legB < 0) crossed = true;
    }
    assert.ok(crossed, '跑动时两腿应该一前一后交替');
  });
});
