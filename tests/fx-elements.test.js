// 元素特效的门禁：火/雷/水/尘四种要有各自的"质感"，
// 不能退化成"一堆半透明圆点"——火焰得是竖着的火舌、尘土不能糊成实心饼、
// 水花要能看出是往一个方向溅出去的。
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
require('../src/fx.js');

// 记账用的假画笔：把"画了什么形状、用多大透明度"记下来
function recorder() {
  const log = { arc: [], fillAlpha: [], bezier: 0, quad: 0, rotate: 0, fill: 0, stroke: 0 };
  const ctx = {
    globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt',
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    arc(x, y, r) { log.arc.push(r); },
    ellipse() {},
    bezierCurveTo() { log.bezier++; },
    quadraticCurveTo() { log.quad++; },
    save() {}, restore() {},
    translate() {}, rotate() { log.rotate++; }, scale() {},
    fill() { log.fill++; log.fillAlpha.push(ctx.globalAlpha); },
    stroke() { log.stroke++; },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
  };
  return { ctx, log };
}
function drawOnce(fx) {
  const { ctx, log } = recorder();
  fx.draw(ctx, 'back');
  fx.draw(ctx, 'front');
  return log;
}

test('火焰画成火舌（贝塞尔曲线收尖），不是三层圆', () => {
  const fx = new XY.FXLayer();
  fx.fire(0, 0, 6, { r: 10 });
  const log = drawOnce(fx);
  // 每个粒子三层火舌，每层两条贝塞尔；不能再用正圆
  assert.equal(log.arc.length, 0, '火焰不该再用整圆画');
  assert.ok(log.bezier >= 6 * 3 * 2, `火舌曲线太少，只有 ${log.bezier} 条`);
  assert.equal(log.fill, 6 * 3, '每个粒子应该有外焰/中焰/心焰三层');
  // 三层叠起来整体仍然要透，不能糊成一块实心橙
  const maxA = Math.max.apply(null, log.fillAlpha);
  assert.ok(maxA <= 1 && maxA > 0.5, `火焰最亮的一层透明度异常：${maxA}`);
});

test('火焰贴着热气流上升，不是原地堆着', () => {
  const fx = new XY.FXLayer();
  fx.fire(0, 0, 8, { r: 8 });
  const y0 = Math.min.apply(null, fx.items.map((it) => it.y));
  for (let i = 0; i < 12; i++) fx.update(0.016);
  const y1 = Math.min.apply(null, fx.items.map((it) => it.y));
  assert.ok(y1 < y0 - 8, `12 帧后火苗几乎没往上窜（${y0.toFixed(1)} → ${y1.toFixed(1)}）`);
});

test('尘土是淡的软团，不能糊成一大块实心色块', () => {
  const fx = new XY.FXLayer();
  fx.smoke(0, 0, 20, { r: 12 });
  for (let i = 0; i < 10; i++) fx.update(0.016);
  const log = drawOnce(fx);
  assert.ok(log.arc.length > 0, '尘土由多个软圆叠出来');
  const maxA = Math.max.apply(null, log.fillAlpha);
  assert.ok(maxA <= 0.35, `单层尘土太实，透明度 ${maxA.toFixed(2)}（层数一多就成实心饼）`);
  const maxR = Math.max.apply(null, log.arc);
  assert.ok(maxR <= 24, `尘土半径 ${maxR.toFixed(1)} 过大，会盖住角色`);
  // 尘团要往外散开，不是原地鼓
  const spread = () => {
    const xs = fx.items.map((it) => it.x);
    return Math.max.apply(null, xs) - Math.min.apply(null, xs);
  };
  const s0 = spread();
  for (let i = 0; i < 14; i++) fx.update(0.016);
  assert.ok(spread() > s0 + 4, '尘土没有扩散开');
});

test('水花是顺着速度方向拉长的水滴，不是一堆小圆点', () => {
  const fx = new XY.FXLayer();
  fx.splash(0, 0, 12, { r: 30 });
  const log = drawOnce(fx);
  assert.ok(log.rotate >= 12, `水滴没有按方向旋转（只转了 ${log.rotate} 次）`);
  assert.ok(log.quad >= 12 * 2, '水滴应该是曲线收尖的形状');
});

test('四种元素都会自己散掉，不会永远挂在场上', () => {
  const fx = new XY.FXLayer();
  fx.fire(0, 0, 8, { r: 8 });
  fx.bolt(0, -200, 0, 0, {});
  fx.splash(60, 0, 8, { r: 20 });
  fx.smoke(-60, 0, 8, { r: 8 });
  assert.ok(fx.items.length >= 24);
  for (let i = 0; i < 200; i++) fx.update(0.016);
  assert.equal(fx.items.length, 0, '还有特效没清干净');
});
