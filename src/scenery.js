// 场景层：为每一关绘制一张程序化"主题立绘"（远景 + 中景 + 视差 + 动态）。
// 一关：花果山 —— 云海之上，大闹天宫后留下的宫殿废墟与歪斜的南天门。
// 二关：黑风洞 —— 钟乳石洞窟，深处黑风旋涡，石壁火盆。
// 三关：火焰山 —— 火山群、岩浆河、半塌的牛魔王寨塔。
// 挂到 XY.Scenery。纯绘制，不依赖其他模块。
(function (root) {
  const XY = (root.XY = root.XY || {});
  const S = (XY.Scenery = {});
  const W = 960, H = 540;

  // ---------- 通用小工具 ----------
  function grad(ctx, y0, y1, stops) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }
  function radial(ctx, x, y, r, stops) {
    if (!ctx.createRadialGradient) return null;
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    if (!g || !g.addColorStop) return null;
    for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }
  // 实心椭圆（带 arc 兜底）
  function ell(ctx, cx, cy, rx, ry) {
    rx = Math.max(0.6, rx); ry = Math.max(0.6, ry);
    ctx.beginPath();
    if (ctx.ellipse) ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    else { ctx.save(); ctx.translate(cx, cy); ctx.scale(rx, ry); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.restore(); }
    ctx.fill();
  }
  function softBlob(ctx, x, y, r, color, stops) {
    const g = radial(ctx, x, y, r, stops);
    if (!g) return;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // 一条连续云带：整条 path 一次填充，避免多个半透明椭圆叠出"串珠"
  function cloudBand(ctx, y, shift, color, sc) {
    const step = 208 * sc;
    const off = ((shift % step) + step) % step;
    const bottom = y + 40 * sc;
    const n = Math.ceil(W / step) + 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-step, bottom);
    let lastX = -step;
    for (let i = -1; i <= n; i++) {
      const x = i * step - off;
      const bob = Math.sin((i + shift / step) * 1.31) * 5 * sc;
      ctx.lineTo(x, y + bob);
      ctx.quadraticCurveTo(x + step * 0.13, y - 19 * sc + bob, x + step * 0.29, y - 3 * sc + bob);
      ctx.quadraticCurveTo(x + step * 0.42, y - 28 * sc + bob, x + step * 0.62, y - 5 * sc + bob);
      ctx.quadraticCurveTo(x + step * 0.78, y - 21 * sc + bob, x + step, y + bob);
      lastX = x + step;
    }
    ctx.lineTo(lastX, bottom);
    ctx.closePath();
    ctx.fill();
  }
  // 起伏山脊：段落宽窄、峰高都随机，避免"等高馒头"
  function ridge(ctx, baseY, color, camX, par, seed, amp, step) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-140, H + 60);
    ctx.lineTo(-140, baseY);
    const off = camX * par;
    for (let i = 0; i < 14; i++) {
      const x0 = -140 + i * step - (off % step);
      const r1 = Math.abs(Math.sin((i + seed * 7.3) * 12.9898) * 43758.5453) % 1;
      const r2 = Math.abs(Math.sin((i + seed * 3.1) * 7.233) * 12345.6789) % 1;
      const peak = amp * (0.34 + r1 * 1.05);
      ctx.bezierCurveTo(
        x0 + step * (0.12 + r2 * 0.16), baseY - peak * 0.92,
        x0 + step * (0.42 + r2 * 0.24), baseY - peak * (0.62 + r2 * 0.46),
        x0 + step, baseY - amp * (0.05 + r2 * 0.2)
      );
    }
    ctx.lineTo(W + 200, H + 60);
    ctx.closePath();
    ctx.fill();
  }

  // ---------- 中式屋顶（反宇飞檐：檐口远宽于墙身，两端上翘） ----------
  function eaveRoof(ctx, w, h, fill) {
    const eaveY = -h * 0.7;
    const ridgeY = -h * 1.0;
    const hb = w * 0.94;
    const ht = w * 0.2;
    const lift = h * 0.1;
    const thick = Math.max(5, h * 0.09);

    ctx.fillStyle = fill;
    ctx.beginPath();
    // 上表面：右檐角 → 屋脊 → 左檐角（反宇曲线）
    ctx.moveTo(hb, eaveY - lift);
    ctx.quadraticCurveTo(hb * 0.46, eaveY - h * 0.44, ht, ridgeY);
    ctx.lineTo(-ht, ridgeY);
    ctx.quadraticCurveTo(-hb * 0.46, eaveY - h * 0.44, -hb, eaveY - lift);
    // 檐板下缘（微凸，形成厚度）
    ctx.lineTo(-hb * 0.72, eaveY - lift + thick * 1.3);
    ctx.quadraticCurveTo(0, eaveY + thick * 2.4, hb * 0.72, eaveY - lift + thick * 1.3);
    ctx.closePath();
    ctx.fill();

    // 正脊
    ctx.strokeStyle = 'rgba(255,214,150,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-ht - w * 0.05, ridgeY - h * 0.015);
    ctx.lineTo(ht + w * 0.05, ridgeY - h * 0.015);
    ctx.stroke();
    // 脊端鸱吻（小翘角）
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(-ht - w * 0.05, ridgeY);
    ctx.quadraticCurveTo(-ht - w * 0.19, ridgeY - h * 0.09, -ht - w * 0.09, ridgeY - h * 0.2);
    ctx.lineTo(-ht, ridgeY);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ht + w * 0.05, ridgeY);
    ctx.quadraticCurveTo(ht + w * 0.19, ridgeY - h * 0.09, ht + w * 0.09, ridgeY - h * 0.2);
    ctx.lineTo(ht, ridgeY);
    ctx.closePath(); ctx.fill();
    // 檐下阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(-hb * 0.7, eaveY - lift + thick * 1.2);
    ctx.quadraticCurveTo(0, eaveY + thick * 2.2, hb * 0.7, eaveY - lift + thick * 1.2);
    ctx.lineTo(hb * 0.7, eaveY - lift + thick * 1.2 + 4);
    ctx.quadraticCurveTo(0, eaveY + thick * 2.4 + 4, -hb * 0.7, eaveY - lift + thick * 1.2 + 4);
    ctx.closePath();
    ctx.fill();
  }

  // 一座宫殿：台基 + 柱列 + 墙 + 飞檐（可带断口）
  function hall(ctx, x, y, w, h, broken, tumble) {
    const INK = '#17293a', INK2 = '#20374b';
    ctx.save();
    ctx.translate(x, y);
    if (tumble) ctx.rotate(tumble);
    ctx.fillStyle = INK;
    // 台基
    ctx.fillRect(-w * 0.72, -6, w * 1.44, 7);
    ctx.fillStyle = INK2;
    ctx.fillRect(-w * 0.72, -6, w * 1.44, 2);
    // 柱
    ctx.fillStyle = INK;
    const cols = 4;
    for (let i = 0; i < cols; i++) {
      const cxp = -w * 0.44 + (w * 0.88 / (cols - 1)) * i;
      const ch = broken && i > 1 ? h * 0.62 : h * 0.86;
      ctx.fillRect(cxp - 2.2, -ch, 4.4, ch - 6);
    }
    // 墙体（破损时留出缺口）
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, -4);
    ctx.lineTo(-w * 0.5, -h * 0.92);
    if (broken) {
      ctx.lineTo(-w * 0.18, -h * 0.72);
      ctx.lineTo(w * 0.06, -h * 0.96);
      ctx.lineTo(w * 0.3, -h * 0.68);
      ctx.lineTo(w * 0.5, -h * 0.88);
    } else {
      ctx.lineTo(-w * 0.5, -h * 0.96);
      ctx.lineTo(w * 0.5, -h * 0.96);
    }
    ctx.lineTo(w * 0.5, -4);
    ctx.closePath();
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fill();
    // 窗（残存的暖光）
    ctx.fillStyle = 'rgba(255,186,104,0.26)';
    ctx.fillRect(-w * 0.34, -h * 0.6, w * 0.16, h * 0.22);
    ctx.fillRect(w * 0.1, -h * 0.54, w * 0.16, h * 0.2);
    // 飞檐
    eaveRoof(ctx, w, h, INK);
    ctx.restore();
  }

  // 南天门：整体倾斜，右柱断裂错位，横梁一头下垂
  function southGate(ctx, x, y, tilt) {
    const INK = '#17293a';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    // 台基（两级）
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(-80, 0); ctx.lineTo(80, -4); ctx.lineTo(72, 11); ctx.lineTo(-72, 14);
    ctx.closePath(); ctx.fill();

    // 左柱
    ctx.fillRect(-60, -132, 17, 130);
    ctx.fillRect(-69, -140, 35, 10);
    ctx.fillRect(-67, -9, 31, 10);

    // 右柱：下段完整，上段断裂错位
    ctx.fillRect(44, -9, 17, 63);
    ctx.fillRect(35, -14, 35, 10);
    ctx.save();
    ctx.translate(7, -9);
    ctx.rotate(0.13);
    ctx.fillRect(44, -58, 17, 52);
    ctx.fillRect(35, -67, 35, 10);
    ctx.restore();

    // 横梁（右端下垂，两端出头）
    ctx.beginPath();
    ctx.moveTo(-84, -150);
    ctx.lineTo(72, -130);
    ctx.lineTo(70, -113);
    ctx.lineTo(-82, -133);
    ctx.closePath(); ctx.fill();
    // 斗拱
    for (let i = 0; i < 6; i++) ctx.fillRect(-72 + i * 27, -138 + i * 3.3, 13, 9);

    // 匾额（挂在横梁正中，带金框）
    ctx.save();
    ctx.translate(-4, -134);
    ctx.rotate(0.08);
    ctx.fillStyle = '#1d3346';
    ctx.fillRect(-36, -24, 72, 28);
    ctx.strokeStyle = 'rgba(255,206,128,0.55)';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-36, -24, 72, 28);
    ctx.fillStyle = 'rgba(255,206,128,0.8)';
    for (let i = 0; i < 3; i++) ctx.fillRect(-26 + i * 21, -15, 14, 12);
    ctx.restore();

    // 逆光亮边
    ctx.strokeStyle = 'rgba(255,214,150,0.45)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-52, -140); ctx.lineTo(-52, 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-84, -150); ctx.lineTo(72, -130); ctx.stroke();

    // 坠落中的碎石
    ctx.fillStyle = '#22394c';
    ctx.fillRect(48, 26, 7, 6);
    ctx.fillRect(58, 50, 6, 5);
    ctx.fillRect(34, 72, 5, 5);
    ctx.restore();
  }

  function heavenRuins(ctx, cx, baseY, t) {
    const INK = '#17293a';
    ctx.save();
    ctx.translate(cx, baseY);

    // 悬浮碎块（在台基后方远处）
    const frags = [[-286, -76, 14], [268, -104, 11], [-176, -152, 9], [300, 6, 9], [-320, -18, 8], [150, -186, 8]];
    for (let i = 0; i < frags.length; i++) {
      const f = frags[i];
      const fy = f[1] + Math.sin(t / 1100 + i * 1.7) * 6;
      ctx.save();
      ctx.translate(f[0], fy);
      ctx.rotate(Math.sin(t / 1700 + i) * 0.28);
      ctx.fillStyle = '#1b3042';
      ctx.beginPath();
      ctx.moveTo(-f[2], -f[2] * 0.4);
      ctx.lineTo(f[2] * 0.5, -f[2]);
      ctx.lineTo(f[2], f[2] * 0.4);
      ctx.lineTo(-f[2] * 0.4, f[2] * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 参差的碎裂台基
    ctx.beginPath();
    ctx.moveTo(-224, 2);
    ctx.lineTo(-160, -5);
    ctx.lineTo(-66, 0);
    ctx.lineTo(32, -7);
    ctx.lineTo(134, -1);
    ctx.lineTo(226, 5);
    ctx.lineTo(206, 24);
    ctx.lineTo(158, 37);
    ctx.lineTo(108, 28);
    ctx.lineTo(58, 49);
    ctx.lineTo(12, 31);
    ctx.lineTo(-40, 41);
    ctx.lineTo(-94, 25);
    ctx.lineTo(-150, 34);
    ctx.lineTo(-206, 19);
    ctx.closePath();
    ctx.fillStyle = INK;
    ctx.fill();
    // 台面逆光边
    ctx.strokeStyle = 'rgba(255,214,150,0.38)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-224, 2); ctx.lineTo(-160, -5); ctx.lineTo(-66, 0);
    ctx.lineTo(32, -7); ctx.lineTo(134, -1); ctx.lineTo(226, 5);
    ctx.stroke();
    // 台面砖缝
    ctx.strokeStyle = 'rgba(120,152,172,0.2)';
    ctx.lineWidth = 1;
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath(); ctx.moveTo(i * 40, -1); ctx.lineTo(i * 36, 22); ctx.stroke();
    }

    // 建筑：配殿 / 主殿 / 残殿
    hall(ctx, -128, -1, 96, 64, false, -0.02);
    hall(ctx, 14, -2, 140, 92, true, 0.012);
    hall(ctx, 168, -1, 86, 52, true, 0.06);

    // 南天门脚下的独立浮岩
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(-346, 4); ctx.lineTo(-330, -6); ctx.lineTo(-232, -2);
    ctx.lineTo(-226, 14); ctx.lineTo(-268, 32); ctx.lineTo(-320, 24);
    ctx.closePath(); ctx.fill();

    // 南天门（更夸张的倾斜）
    southGate(ctx, -286, -2, -0.12);

    // 向外悬伸的断桥
    ctx.save();
    ctx.translate(232, -2);
    ctx.rotate(-0.16);
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, 92, 8);
    ctx.fillRect(8, 8, 7, 18);
    ctx.fillRect(40, 8, 7, 26);
    ctx.fillRect(74, 8, 7, 15);
    ctx.fillStyle = 'rgba(255,214,150,0.3)';
    ctx.fillRect(0, 0, 92, 2);
    ctx.restore();

    // 悬空断阶（从台基左侧向下延伸，像被炸断的天梯）
    ctx.fillStyle = '#1a2f40';
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(-250 - i * 34, 22 + i * 30);
      ctx.rotate(-0.24 + i * 0.1);
      ctx.fillRect(0, 0, 46, 7);
      ctx.restore();
    }
    ctx.restore();
  }

  // 瀑布（水带 + 流动高光 + 潭底水雾）
  function waterfall(ctx, x, yTop, yBot, w, t) {
    ctx.fillStyle = 'rgba(216,238,248,0.22)';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.42, yTop);
    ctx.quadraticCurveTo(x - w * 0.56, (yTop + yBot) * 0.5, x - w * 0.88, yBot);
    ctx.lineTo(x + w * 0.88, yBot);
    ctx.quadraticCurveTo(x + w * 0.56, (yTop + yBot) * 0.5, x + w * 0.42, yTop);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) {
      const p = (t / 1100 + i * 0.21) % 1;
      const yy = yTop + (yBot - yTop) * p;
      const xx = x + (i - 2) * w * 0.28 + Math.sin(t / 520 + i) * 2;
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 15); ctx.stroke();
    }
    softBlob(ctx, x, yBot + 4, w * 1.6, null, [[0, 'rgba(226,244,250,0.34)'], [1, 'rgba(226,244,250,0)']]);
  }

  // 桃树剪影
  function peachTree(ctx, x, y, sc, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.quadraticCurveTo(-4, -22, -11, -36);
    ctx.lineTo(-4, -38);
    ctx.quadraticCurveTo(2, -22, 6, 0);
    ctx.closePath();
    ctx.fill();
    // 枝
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-6, -32); ctx.lineTo(-24, -46); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(20, -50); ctx.stroke();
    const blobs = [[-30, -52, 15], [-12, -62, 19], [10, -60, 17], [28, -52, 14], [0, -44, 15]];
    for (let i = 0; i < blobs.length; i++) ell(ctx, blobs[i][0], blobs[i][1], blobs[i][2], blobs[i][2] * 0.86);
    ctx.restore();
  }

  // ========== 场景一：花果山 · 云上天宫废墟 ==========
  function sceneMountain(ctx, t, camX) {
    ctx.fillStyle = grad(ctx, 0, H, [
      [0, '#0e2742'], [0.26, '#2c5b78'], [0.5, '#6a90a0'],
      [0.68, '#c3a97f'], [0.84, '#7d7a66'], [1, '#0e1a24'],
    ]);
    ctx.fillRect(0, 0, W, H);

    // 日轮（位于废墟后方，形成逆光）
    const sunX = 716, sunY = 156;
    softBlob(ctx, sunX, sunY, 300, null, [
      [0, 'rgba(255,232,176,0.55)'], [0.22, 'rgba(255,206,140,0.28)'],
      [0.55, 'rgba(255,170,96,0.1)'], [1, 'rgba(255,150,80,0)'],
    ]);
    ctx.fillStyle = 'rgba(255,238,196,0.9)';
    ctx.beginPath(); ctx.arc(sunX, sunY, 44, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,248,0.85)';
    ctx.beginPath(); ctx.arc(sunX - 8, sunY - 8, 24, 0, Math.PI * 2); ctx.fill();

    // 云海上方的天宫废墟
    heavenRuins(ctx, 616 - camX * 0.08, 278, t);

    // 云海：三层，最下一层暖白，越往上越淡
    cloudBand(ctx, 272, t * 5 + camX * 0.09, 'rgba(206,220,232,0.28)', 0.9);
    cloudBand(ctx, 302, t * 9 + camX * 0.15, 'rgba(228,232,232,0.36)', 1.15);
    cloudBand(ctx, 342, t * 15 + camX * 0.24, 'rgba(248,244,234,0.42)', 1.5);
    softBlob(ctx, 480, 300, 320, null, [[0, 'rgba(255,226,180,0.16)'], [1, 'rgba(255,226,180,0)']]);

    // 远山（雾中两层，刻意压低对比度）
    ridge(ctx, 408, 'rgba(52,86,102,0.7)', camX, 0.14, 5, 104, 190);
    ridge(ctx, 456, '#2b5060', camX, 0.24, 11, 88, 165);
    // 中景主山（花果山本体）
    ridge(ctx, 502, '#1b3543', camX, 0.36, 2, 68, 150);

    // 崖壁 + 瀑布
    const wx = 268 - camX * 0.36;
    ctx.fillStyle = '#132832';
    ctx.beginPath();
    ctx.moveTo(wx - 118, 540);
    ctx.lineTo(wx - 92, 470);
    ctx.lineTo(wx - 54, 412);
    ctx.lineTo(wx - 16, 396);
    ctx.lineTo(wx + 26, 414);
    ctx.lineTo(wx + 56, 470);
    ctx.lineTo(wx + 74, 540);
    ctx.closePath();
    ctx.fill();
    // 岩层
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(wx - 70, 452, 130, 3);
    ctx.fillRect(wx - 52, 486, 104, 2);
    waterfall(ctx, wx + 2, 400, 508, 24, t);

    // 近景桃树
    peachTree(ctx, 74 - camX * 0.52, 524, 1.3, '#0d1e26');
    peachTree(ctx, 906 - camX * 0.52, 526, 1.1, '#0f2230');

    // 花瓣
    for (let i = 0; i < 11; i++) {
      const px = ((i * 137 + t * 14) % (W + 80)) - 40;
      const py = ((i * 103 + t * 30) % (H + 60)) - 30;
      ctx.fillStyle = 'rgba(255,206,222,0.42)';
      ctx.beginPath(); ctx.arc(px, py, 2.1, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ========== 场景二：黑风洞 ==========
  function sceneCave(ctx, t, camX) {
    ctx.fillStyle = grad(ctx, 0, H, [[0, '#1c132c'], [0.42, '#140e22'], [1, '#06040a']]);
    ctx.fillRect(0, 0, W, H);

    // 深处的洞府石门（黑熊精老巢）：两侧石柱 + 门楣 + 拱形门洞
    const gx = 690 - camX * 0.1, gy = 318;
    softBlob(ctx, gx, gy - 70, 380, null, [
      [0, 'rgba(120,214,172,0.22)'], [0.42, 'rgba(56,132,116,0.12)'], [1, 'rgba(0,0,0,0)'],
    ]);

    ctx.fillStyle = '#191228';
    ctx.fillRect(gx - 140, gy - 186, 42, 186);
    ctx.fillRect(gx + 98, gy - 186, 42, 186);
    ctx.fillRect(gx - 162, gy - 210, 324, 32);
    // 石柱逆光边（幽绿冷光）
    ctx.fillStyle = 'rgba(120,214,178,0.22)';
    ctx.fillRect(gx - 140, gy - 186, 3, 186);
    ctx.fillRect(gx + 137, gy - 186, 3, 186);
    ctx.fillRect(gx - 162, gy - 210, 324, 3);
    // 柱身砖缝
    ctx.strokeStyle = 'rgba(126,158,190,0.11)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 6; i++) {
      const yy = gy - 186 + i * 31;
      ctx.beginPath(); ctx.moveTo(gx - 140, yy); ctx.lineTo(gx - 98, yy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx + 98, yy); ctx.lineTo(gx + 140, yy); ctx.stroke();
    }
    // 门洞
    ctx.fillStyle = '#05030a';
    ctx.beginPath();
    ctx.moveTo(gx - 96, gy);
    ctx.lineTo(gx - 96, gy - 128);
    ctx.quadraticCurveTo(gx, gy - 192, gx + 96, gy - 128);
    ctx.lineTo(gx + 96, gy);
    ctx.closePath();
    ctx.fill();
    // 门内幽光
    const dg = radial(ctx, gx, gy - 44, 136, [
      [0, 'rgba(120,220,180,0.16)'], [0.5, 'rgba(60,150,124,0.08)'], [1, 'rgba(0,0,0,0)'],
    ]);
    if (dg) { ctx.fillStyle = dg; ctx.fillRect(gx - 136, gy - 180, 272, 200); }
    // 门楣牌匾
    ctx.fillStyle = '#161026';
    ctx.fillRect(gx - 46, gy - 204, 92, 26);
    ctx.strokeStyle = 'rgba(126,214,178,0.34)';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(gx - 46, gy - 204, 92, 26);
    ctx.fillStyle = 'rgba(126,214,178,0.42)';
    for (let i = 0; i < 2; i++) ctx.fillRect(gx - 24 + i * 32, gy - 198, 17, 13);

    // 风眼旋涡（黑色风带 + 几点碎光，读起来像"卷"的东西）
    ctx.save();
    ctx.translate(gx, gy - 58);
    for (let arm = 0; arm < 3; arm++) {
      ctx.save();
      ctx.rotate(t / 2200 + (arm * Math.PI * 2) / 3);
      for (let k = 0; k < 2; k++) {
        ctx.strokeStyle = k === 0 ? 'rgba(140,240,196,0.26)' : 'rgba(80,170,146,0.18)';
        ctx.lineWidth = k === 0 ? 7 : 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(8 + k * 6, 0);
        ctx.quadraticCurveTo(44, -10, 66, 16);
        ctx.quadraticCurveTo(84, 38, 60, 54);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();

    // 洞顶钟乳石（疏密不一，避免等距三角）
    const offTop = camX * 0.07;
    ctx.fillStyle = '#0b0714';
    ctx.beginPath();
    ctx.moveTo(-80, -30);
    let cx2 = -80;
    const lens = [34, 78, 22, 54, 96, 30, 68, 44, 110, 26, 60, 40, 84, 20];
    for (let i = 0; i < lens.length; i++) {
      const wid = 34 + ((i * 29) % 46);
      const hh = lens[i];
      ctx.lineTo(cx2 + wid * 0.25, hh * 0.7);
      ctx.lineTo(cx2 + wid * 0.52, hh);
      ctx.lineTo(cx2 + wid * 0.78, hh * 0.45);
      cx2 += wid;
    }
    ctx.lineTo(cx2 + 120, -30);
    ctx.closePath();
    ctx.fill();

    // 洞壁石幔（两侧）
    ctx.fillStyle = '#0f0a1a';
    for (let s = 0; s < 2; s++) {
      const dir = s === 0 ? 1 : -1;
      const bx = s === 0 ? -40 - camX * 0.18 : W + 40 - camX * 0.18;
      ctx.beginPath();
      ctx.moveTo(bx, -30);
      ctx.quadraticCurveTo(bx + dir * 120, 150, bx + dir * 58, 300);
      ctx.quadraticCurveTo(bx + dir * 130, 400, bx + dir * 44, 540);
      ctx.lineTo(bx - dir * 90, 540);
      ctx.lineTo(bx - dir * 90, -30);
      ctx.closePath();
      ctx.fill();
    }

    // 中景石笋
    const pillars = [[168, 176, 34], [410, 108, 22], [596, 224, 38], [864, 148, 26]];
    for (let i = 0; i < pillars.length; i++) {
      const p = pillars[i];
      const px = p[0] - camX * 0.3;
      ctx.fillStyle = '#171025';
      ctx.beginPath();
      ctx.moveTo(px - p[2], 540);
      ctx.quadraticCurveTo(px - p[2] * 0.42, 540 - p[1] * 0.6, px, 540 - p[1]);
      ctx.quadraticCurveTo(px + p[2] * 0.42, 540 - p[1] * 0.6, px + p[2], 540);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(104,196,164,0.16)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(px - p[2] * 0.74, 528);
      ctx.quadraticCurveTo(px - p[2] * 0.26, 540 - p[1] * 0.55, px, 540 - p[1]);
      ctx.stroke();
    }

    // 火盆
    const braziers = [[112, 416], [812, 416]];
    for (let i = 0; i < braziers.length; i++) {
      const bx = braziers[i][0] - camX * 0.42, by = braziers[i][1];
      const flick = 0.84 + Math.sin(t / 88 + i * 2) * 0.12 + Math.sin(t / 41 + i) * 0.04;
      softBlob(ctx, bx, by - 18, 108 * flick, null, [
        [0, 'rgba(255,180,96,0.5)'], [0.4, 'rgba(255,128,54,0.16)'], [1, 'rgba(255,110,40,0)'],
      ]);
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.moveTo(bx - 17, by - 12);
      ctx.lineTo(bx + 17, by - 12);
      ctx.lineTo(bx + 10, by + 4);
      ctx.lineTo(bx - 10, by + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(bx - 2.5, by + 4, 5, 16);
      ctx.fillRect(bx - 11, by + 18, 22, 4);
      ctx.fillStyle = '#ffab4a';
      ctx.beginPath();
      ctx.moveTo(bx - 8, by - 14);
      ctx.quadraticCurveTo(bx - 6, by - 30 - flick * 12, bx, by - 40 - flick * 10);
      ctx.quadraticCurveTo(bx + 6, by - 30 - flick * 12, bx + 8, by - 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffe7ac';
      ctx.beginPath();
      ctx.moveTo(bx - 3.4, by - 14);
      ctx.quadraticCurveTo(bx, by - 26 - flick * 7, bx + 3.4, by - 14);
      ctx.closePath();
      ctx.fill();
    }

    // 地面雾
    ctx.fillStyle = grad(ctx, H - 150, H, [[0, 'rgba(64,140,124,0)'], [1, 'rgba(64,140,124,0.2)']]);
    ctx.fillRect(0, H - 150, W, 150);

    // 尘埃
    for (let i = 0; i < 14; i++) {
      const px = ((i * 179 + t * 8) % (W + 40)) - 20;
      const py = ((i * 113 + t * 15) % (H + 40)) - 20;
      ctx.fillStyle = 'rgba(148,228,190,0.2)';
      ctx.beginPath(); ctx.arc(px, py, 1.3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ========== 场景三：火焰山 ==========
  function sceneFire(ctx, t, camX) {
    ctx.fillStyle = grad(ctx, 0, H, [
      [0, '#1d0503'], [0.2, '#6b1c0c'], [0.38, '#b23c11'],
      [0.55, '#db6a22'], [0.72, '#7a2410'], [1, '#130403'],
    ]);
    ctx.fillRect(0, 0, W, H);

    // 血日
    const sunX = 286, sunY = 138;
    softBlob(ctx, sunX, sunY, 340, null, [
      [0, 'rgba(255,206,142,0.55)'], [0.22, 'rgba(255,128,60,0.22)'], [1, 'rgba(200,60,20,0)'],
    ]);
    ctx.fillStyle = 'rgba(255,206,150,0.92)';
    ctx.beginPath(); ctx.arc(sunX, sunY, 50, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,150,88,0.45)';
    ctx.beginPath(); ctx.arc(sunX + 20, sunY + 10, 50, 0, Math.PI * 2); ctx.fill();

    // 低空烟云（压在火上，别盖住太阳）
    cloudBand(ctx, 96, t * 16 + camX * 0.05, 'rgba(30,7,4,0.55)', 2.2);
    cloudBand(ctx, 162, t * 26 + camX * 0.1, 'rgba(52,14,8,0.38)', 2.7);

    // 火山群
    const volc = [[152, 548, 158, 136], [456, 548, 202, 178], [796, 548, 168, 148]];
    for (let i = 0; i < volc.length; i++) {
      const v = volc[i];
      const vx = v[0] - camX * 0.1;
      const base = v[1], halfW = v[2], topY = base - v[3];
      ctx.fillStyle = grad(ctx, topY, base, [
        [0, '#3d1409'], [0.45, i === 1 ? '#1c0704' : '#230a05'], [1, '#0d0202'],
      ]);
      ctx.beginPath();
      ctx.moveTo(vx - halfW, base);
      ctx.quadraticCurveTo(vx - halfW * 0.5, base - v[3] * 0.58, vx - halfW * 0.22, topY);
      ctx.lineTo(vx + halfW * 0.22, topY);
      ctx.quadraticCurveTo(vx + halfW * 0.5, base - v[3] * 0.58, vx + halfW, base);
      ctx.closePath();
      ctx.fill();
      // 火山口光
      const crater = radial(ctx, vx, topY + 2, halfW * 0.56, [
        [0, 'rgba(255,214,140,0.85)'], [0.38, 'rgba(255,120,40,0.45)'], [1, 'rgba(255,90,20,0)'],
      ]);
      if (crater) { ctx.fillStyle = crater; ctx.fillRect(vx - halfW * 0.6, topY - halfW * 0.6, halfW * 1.2, halfW * 1.2); }
      ctx.fillStyle = 'rgba(255,196,110,0.95)';
      ctx.beginPath();
      ctx.moveTo(vx - halfW * 0.2, topY + 1);
      ctx.quadraticCurveTo(vx, topY - 7, vx + halfW * 0.2, topY + 1);
      ctx.closePath(); ctx.fill();
      // 山坡熔岩流
      ctx.strokeStyle = 'rgba(255,132,48,0.6)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(vx + halfW * 0.05, topY + 4);
      ctx.quadraticCurveTo(vx + halfW * 0.3, base - v[3] * 0.48, vx + halfW * 0.22, base - 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(vx - halfW * 0.1, topY + 4);
      ctx.quadraticCurveTo(vx - halfW * 0.34, base - v[3] * 0.4, vx - halfW * 0.42, base - 26);
      ctx.stroke();
      // 火山口烟柱（柔和渐变，不画成球串）
      for (let k = 0; k < 2; k++) {
        const pp = (t / 5200 + i * 0.24 + k * 0.46) % 1;
        const alpha = (0.22 * (1 - pp)).toFixed(2);
        softBlob(ctx, vx + Math.sin(pp * 5 + i) * 22, topY - 26 - pp * 120, 20 + pp * 34, null, [
          [0, 'rgba(24,6,3,' + alpha + ')'], [1, 'rgba(24,6,3,0)'],
        ]);
      }
      // 逆光轮廓（把火山从背景里拔出来）
      ctx.strokeStyle = 'rgba(255,150,70,0.4)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(vx - halfW * 0.22, topY);
      ctx.lineTo(vx + halfW * 0.22, topY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(vx + halfW * 0.22, topY);
      ctx.quadraticCurveTo(vx + halfW * 0.5, base - v[3] * 0.58, vx + halfW, base);
      ctx.stroke();
    }

    // 地平线热气（柔光带，不是硬边横条）
    softBlob(ctx, W / 2, 470, 620, null, [
      [0, 'rgba(255,140,56,0.26)'], [0.45, 'rgba(255,104,30,0.1)'], [1, 'rgba(255,90,20,0)'],
    ]);

    // 火山脚下的熔岩瀑布（从火山口一路淌到谷底）
    for (let i = 0; i < 3; i++) {
      const vx = [152, 456, 796][i] - camX * 0.1;
      const topY = 548 - [136, 178, 148][i];
      const fx = vx + (i === 1 ? 58 : -44);
      const fg2 = grad(ctx, topY, 500, [
        [0, 'rgba(255,242,190,1)'], [0.45, 'rgba(255,168,64,0.92)'], [1, 'rgba(220,70,10,0.55)'],
      ]);
      ctx.fillStyle = fg2;
      ctx.beginPath();
      ctx.moveTo(fx - 5, topY + 8);
      ctx.quadraticCurveTo(fx - 11, 460, fx - 19, 504);
      ctx.lineTo(fx + 18, 504);
      ctx.quadraticCurveTo(fx + 9, 460, fx + 5, topY + 8);
      ctx.closePath();
      ctx.fill();
      // 分叉细流
      ctx.strokeStyle = 'rgba(255,180,72,0.75)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(fx - 4, topY + 30);
      ctx.quadraticCurveTo(fx - 24, 440, fx - 32, 492);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx + 4, topY + 46);
      ctx.quadraticCurveTo(fx + 22, 452, fx + 33, 496);
      ctx.stroke();
      softBlob(ctx, fx, 500, 54, null, [
        [0, 'rgba(255,168,70,0.34)'], [1, 'rgba(255,140,50,0)'],
      ]);
    }

    // 近景山脊
    ridge(ctx, 494, '#180704', camX, 0.32, 7, 66, 215);

    // 牛魔王寨塔（右侧远处剪影，避开平台）
    const tx = 862 - camX * 0.16;
    ctx.save();
    ctx.translate(tx, 502);
    ctx.rotate(-0.05);
    for (let i = 0; i < 5; i++) {
      const w = 72 - i * 10, hh = 26;
      const yy = -i * hh - 4;
      const shift = Math.sin(i * 1.7) * 4;
      ctx.fillStyle = '#0e0302';
      ctx.fillRect(-w / 2 + shift, yy - hh, w, hh);
      ctx.beginPath();
      ctx.moveTo(-w / 2 - 10 + shift, yy - hh);
      ctx.lineTo(-w / 2 + shift, yy - hh - 11);
      ctx.lineTo(w / 2 + shift, yy - hh - 11);
      ctx.lineTo(w / 2 + 10 + shift, yy - hh);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#0e0302';
    ctx.beginPath();
    ctx.moveTo(-9, -140); ctx.lineTo(2, -166); ctx.lineTo(10, -132);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // 火星
    for (let i = 0; i < 14; i++) {
      const px = ((i * 197 + t * 24) % (W + 80)) - 40;
      const py = 520 - (((i * 89 + t * 56) % (H + 70)) - 20);
      ctx.fillStyle = i % 4 ? 'rgba(255,170,80,0.6)' : 'rgba(255,236,178,0.85)';
      ctx.beginPath(); ctx.arc(px, py, i % 3 ? 1.5 : 2.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---------- 统一压暗 / 暗角 ----------
  function overlay(ctx) {
    ctx.fillStyle = grad(ctx, 0, H, [
      [0, 'rgba(6,10,18,0.34)'], [0.22, 'rgba(6,10,18,0.0)'],
      [0.68, 'rgba(6,10,18,0.02)'], [1, 'rgba(6,10,18,0.42)'],
    ]);
    ctx.fillRect(0, 0, W, H);
    const side = ctx.createLinearGradient(0, 0, W * 0.18, 0);
    side.addColorStop(0, 'rgba(4,7,12,0.38)');
    side.addColorStop(1, 'rgba(4,7,12,0)');
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, W * 0.18, H);
    const side2 = ctx.createLinearGradient(W, 0, W * 0.82, 0);
    side2.addColorStop(0, 'rgba(4,7,12,0.38)');
    side2.addColorStop(1, 'rgba(4,7,12,0)');
    ctx.fillStyle = side2;
    ctx.fillRect(W * 0.82, 0, W * 0.18, H);
  }

  S.draw = function (ctx, levelIndex, t, camX) {
    const idx = (((levelIndex | 0) % 3) + 3) % 3;
    camX = camX || 0;
    ctx.save();
    if (idx === 0) sceneMountain(ctx, t || 0, camX);
    else if (idx === 1) sceneCave(ctx, t || 0, camX);
    else sceneFire(ctx, t || 0, camX);
    overlay(ctx);
    ctx.restore();
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = XY;
})(typeof window !== 'undefined' ? window : globalThis);
