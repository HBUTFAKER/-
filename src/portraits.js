// 角色立绘：标题 / 选角 / 过场 CG 用的大图。
// 双通道加载：打包单文件时 build.js 会把 JPEG 转成 base64 注入 window.__XY_PORTRAITS__；
// 开发模式（index.html 直接跑）走 assets/portraits/*.jpg 相对路径。
// 两条路都失败时所有调用方自动退回原来的程序化绘制，游戏照常能玩。
(function (root) {
  const XY = (root.XY = root.XY || {});
  const IDS = ['wukong', 'bajie', 'tangseng', 'shaseng', 'bailongma'];

  const P = { imgs: {}, ready: false, loading: false };

  P.get = function (id) { return P.imgs[id] || null; };

  // 四边羽化：原图直接贴是有硬边的"贴图感"，烘一个四边渐透明的离屏 canvas，
  // 左右 34px / 上 26px / 下 70px 过渡，哪张界面用都融得进底色。每个 id 只烘一次。
  function softCanvas(img) {
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d');
    c.drawImage(img, 0, 0);
    c.globalCompositeOperation = 'destination-out';
    const F = { left: 34, top: 26, right: 34, bottom: 70 };
    let g;
    g = c.createLinearGradient(0, 0, F.left, 0);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, F.left, cv.height);
    g = c.createLinearGradient(cv.width - F.right, 0, cv.width, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = g; c.fillRect(cv.width - F.right, 0, F.right, cv.height);
    g = c.createLinearGradient(0, 0, 0, F.top);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, cv.width, F.top);
    g = c.createLinearGradient(0, cv.height - F.bottom, 0, cv.height);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = g; c.fillRect(0, cv.height - F.bottom, cv.width, F.bottom);
    c.globalCompositeOperation = 'source-over';
    return cv;
  }
  const soft = {};
  function softImg(id) {
    if (soft[id]) return soft[id];
    const img = P.imgs[id];
    if (!img || !img.width) return null;
    soft[id] = (typeof document !== 'undefined' && document.createElement) ? softCanvas(img) : img;
    return soft[id];
  }

  P.load = function (cb) {
    if (typeof document === 'undefined' || typeof Image === 'undefined') { if (cb) cb(); return; }
    if (P.ready || P.loading) { if (cb) cb(); return; }
    P.loading = true;
    const srcs = root.__XY_PORTRAITS__ || {};
    let left = IDS.length;
    let any = false;
    for (const id of IDS) {
      const img = new Image();
      img.onload = function () { P.imgs[id] = img; any = true; done(); };
      img.onerror = done;
      img.src = srcs[id] || ('assets/portraits/' + id + '.jpg');
    }
    function done() {
      if (--left > 0) return;
      P.loading = false;
      P.ready = any; // 一张都没有才算没准备好（部分失败时 ready，能用的照用）
      if (cb) cb();
    }
  };

  // 把立绘按 cover 模式画进矩形（等比裁切铺满，不变形）。
  // opt.bias: 竖向裁切重心 0=顶部（取头胸） 0.5=居中；默认 0.1，人物重心偏上。
  // opt.fade: 底部渐隐高度，让立绘下缘融进底色而不是一条硬边。
  // opt.alpha: 整体透明度。
  // 返回 false 表示这张没加载出来，调用方走自己的兜底绘制。
  P.draw = function (ctx, id, x, y, w, h, opt) {
    const img = softImg(id);
    if (!img || !img.width) return false;
    opt = opt || {};
    const ir = img.width / img.height, rr = w / h;
    let sx = 0, sy = 0, sw, sh;
    if (ir > rr) { sh = img.height; sw = sh * rr; sx = (img.width - sw) / 2; }
    else { sw = img.width; sh = sw / rr; sy = (img.height - sh) * (opt.bias != null ? opt.bias : 0.1); }
    if (opt.alpha != null) ctx.globalAlpha *= opt.alpha;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    if (opt.fade) {
      const g = ctx.createLinearGradient(0, y + h - opt.fade, 0, y + h);
      if (g.addColorStop) {
        g.addColorStop(0, 'rgba(16,12,7,0)');
        g.addColorStop(1, opt.fadeColor || 'rgba(16,12,7,0.92)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y + h - opt.fade, w, opt.fade);
      }
    }
    if (opt.alpha != null) ctx.globalAlpha /= opt.alpha;
    return true;
  };

  XY.Portraits = P;
  P.load();
})(typeof window !== 'undefined' ? window : globalThis);
