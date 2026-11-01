// 把 12 只 Boss 像素骨架在静止状态渲染成 BMP（4 倍放大），供视觉验收。
// 用法：node render_bosses.js <输出目录>
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || __dirname;

// —— 浏览器桩：让 art.js 的 canPixel() 在 node 下为真 ——
const fakeCtx = () => ({
  canvas: { width: 8, height: 8 },
  createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
  putImageData() {},
  getImageData(x, y, w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
  fillStyle: '', fillRect() {}, strokeStyle: '', lineWidth: 1, beginPath() {}, moveTo() {}, lineTo() {},
  stroke() {}, fill() {}, arc() {}, ellipse() {}, closePath() {}, quadraticCurveTo() {}, bezierCurveTo() {},
  save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, clearRect() {}, rect() {},
  strokeRect() {}, drawImage() {}, setTransform() {}, clip() {}, createLinearGradient() { return { addColorStop() {} }; },
  createRadialGradient() { return { addColorStop() {} }; }, globalAlpha: 1, font: '', textAlign: 'left',
  textBaseline: 'alphabetic', fillText() {}, strokeText() {}, measureText() { return { width: 0 }; },
  setLineDash() {}, getImageSmoothingEnabled: false, imageSmoothingEnabled: false, filter: 'none',
});
global.document = {
  createElement() {
    const c = fakeCtx();
    return { getContext: () => c, width: 8, height: 8, style: {} };
  },
  createElementNS() { return this.createElement(); },
};
global.window = global;
global.requestAnimationFrame = () => {};
global.performance = { now: () => 0 };

const XY = {};
require(path.join(__dirname, '..', 'src', 'data.js'));
const art = require(path.join(__dirname, '..', 'src', 'art.js'));
// art.js 挂到全局 XY 上（UMD）
const XYG = global.XY || art;
const Art = XYG.Art || art.Art;
const PX = Art.PX;

// —— 抓 Painter 像素：pxBlit 会按 w x h 缓存离屏 canvas（同尺寸骨架复用），
// 所以用全局"最后一次 putImageData"来抓，而不是按 canvas 记录 ——
let lastPixels = null;
global.document.createElement = (tag) => {
  const ctx = fakeCtx();
  ctx.putImageData = (img) => { lastPixels = { w: img.width, h: img.height, data: img.data }; };
  return { getContext: () => ctx, width: 8, height: 8, style: {} };
};

const BOSS_ORDER = XYG.BOSS_ORDER || require(path.join(__dirname, '..', 'src', 'data.js')).BOSS_ORDER;
const BOSSES = XYG.BOSSES;

// Boss 实体桩：drawEnemy 需要的字段
function bossStub(def, kindId) {
  return {
    isBoss: true, kind: kindId, art: def.art,
    x: 100, y: 400, w: 86 * (def.art.scale || 1), h: 86 * (def.art.scale || 1),
    alive: true, facing: 1, vx: 0, vy: 0, state: 'idle', stateUntil: 0,
    hitFlash: 0, stunUntil: 0, anim: 0,
    name: def.name,
  };
}

function writeBMP(file, rgba, w, h, zoom) {
  const W = w * zoom, H = h * zoom;
  const rowSize = Math.ceil((W * 3) / 4) * 4;
  const dataSize = rowSize * H;
  const buf = Buffer.alloc(54 + dataSize);
  buf.write('BM'); buf.writeUInt32LE(54 + dataSize, 2); buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14); buf.writeInt32LE(W, 18); buf.writeInt32LE(H, 22);
  buf.writeUInt16LE(1, 26); buf.writeUInt16LE(24, 28); buf.writeUInt32LE(dataSize, 34);
  for (let y = 0; y < H; y++) {
    const sy = Math.floor(y / zoom);       // BMP 从下往上
    const row = 54 + (H - 1 - y) * rowSize;
    for (let x = 0; x < W; x++) {
      const sx = Math.floor(x / zoom);
      const i = (sy * w + sx) * 4;
      buf[row + x * 3] = rgba[i + 2];
      buf[row + x * 3 + 1] = rgba[i + 1];
      buf[row + x * 3 + 2] = rgba[i];
    }
  }
  fs.writeFileSync(file, buf);
}

let fail = 0;
for (const kindId of BOSS_ORDER) {
  const def = BOSSES[kindId];
  lastPixels = null;
  const e = bossStub(def, kindId);
  // 直接调 Art.drawEnemy —— 走真实入口（含像素分流）
  try {
    Art.drawEnemy({ save() {}, restore() {}, translate() {}, scale() {}, fillRect() {}, fillStyle: '', drawImage() {} }, e, 0);
  } catch (err) { console.log('DRAW FAIL', kindId, err.message); fail++; continue; }
  if (!lastPixels) { console.log('NO PIXELS', kindId); fail++; continue; }
  const { w, h, data } = lastPixels;
  // 透明背景填浅灰，便于看剪影
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) { out[i] = 226; out[i + 1] = 222; out[i + 2] = 214; out[i + 3] = 255; }
  }
  const zoom = Math.max(2, Math.round(220 / Math.max(w, h)));
  const f = path.join(OUT, `sk_${kindId}.bmp`);
  writeBMP(f, out, w, h, zoom);
  console.log('OK', kindId, `${w}x${h}`, 'zoom', zoom);
}
console.log(fail ? `FAILED: ${fail}` : 'ALL OK');
