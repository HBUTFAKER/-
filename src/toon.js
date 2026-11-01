// ============================================================
// 卡通 Q 版层：造梦西游式的三头身 / 粗描边 / 双色平涂
// 像素栅格在 60px 这个尺寸下画不出圆润卡通感（格子太少，
// 头只剩十几格），所以角色与小怪改走矢量：圆头、大眼、
// 粗墨边、暗部压一档。像素层保留给需要颗粒感的旧存档/测试。
// ============================================================
(function () {
  const XY = (window.XY = window.XY || {});
  const OUT = '#1a1210';
  const LW = 2.2;

  // —— 基础笔：全部带墨边 ——
  function shape(ctx, fill, lw) {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw === undefined ? LW : lw;
    ctx.stroke();
  }
  function ball(ctx, x, y, r, fill, lw) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    shape(ctx, fill, lw);
  }
  function ellipse(ctx, x, y, rx, ry, fill, rot, lw) {
    ctx.beginPath();
    if (ctx.ellipse) ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
    else ctx.arc(x, y, Math.max(rx, ry), 0, Math.PI * 2);
    shape(ctx, fill, lw);
  }
  // 圆头圆尾的粗肢：先粗黑描一遍，再细彩描一遍
  function limb(ctx, a, b, w, fill) {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = w + LW * 1.3;
    ctx.stroke();
    ctx.strokeStyle = fill;
    ctx.lineWidth = w;
    ctx.stroke();
  }
  // 带关节的两段肢
  function limb2(ctx, a, m, b, w, fill) {
    limb(ctx, a, m, w, fill);
    limb(ctx, m, b, w * 0.94, fill);
  }
  function polyPath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }
  function poly(ctx, pts, fill, lw) {
    polyPath(ctx, pts);
    shape(ctx, fill, lw);
  }
  // 曲边块（披风、裙摆这类会飘的）
  function curveShape(ctx, pts, fill, lw) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i += 2) {
      const c = pts[i], e = pts[i + 1];
      if (e) ctx.quadraticCurveTo(c[0], c[1], e[0], e[1]);
    }
    ctx.closePath();
    shape(ctx, fill, lw);
  }

  // ============================================================
  // 角色配色：主色 / 暗部 / 皮肤 / 衣 / 衣暗 / 点缀
  // ============================================================
  const LOOK = {
    wukong: {
      fur: '#e8a93c', furD: '#b5721f', skin: '#f6d8a6', skinD: '#d9ac70',
      cloth: '#d94a2e', clothD: '#9a2a17', trim: '#ffd75e', trimD: '#c08a24',
      hair: '#8a4f1a', eye: '#2b1a10', iris: '#e8b830',
      weapon: 'staff', cape: true, crown: true,
    },
    bajie: {
      fur: '#efb6a0', furD: '#c2836f', skin: '#f9ddbe', skinD: '#dbaf85',
      cloth: '#5b6b8a', clothD: '#3b4761', trim: '#d9b45c', trimD: '#a4802e',
      hair: '#4a3a2c', eye: '#2b1a10', iris: '#8a5a30',
      weapon: 'rake', cape: false, crown: false,
    },
    shaseng: {
      fur: '#c98a58', furD: '#8e5a30', skin: '#e8bd92', skinD: '#bd8c62',
      cloth: '#3f6f7a', clothD: '#284a52', trim: '#c8a45a', trimD: '#94742e',
      hair: '#2f3a44', eye: '#2b1a10', iris: '#5aa0b0',
      weapon: 'spade', cape: false, crown: false,
    },
    tangseng: {
      fur: '#f2d3b0', furD: '#cbab86', skin: '#fae2c8', skinD: '#dcbb9a',
      cloth: '#e8dcc0', clothD: '#c0b094', trim: '#c8452e', trimD: '#922a18',
      hair: '#2a2018', eye: '#2b1a10', iris: '#7a5a3a',
      weapon: 'khakkhara', cape: true, crown: false,
    },
    bailongma: {
      fur: '#dfe8f2', furD: '#a9b8c8', skin: '#f2f6fb', skinD: '#c8d4e0',
      cloth: '#3f6ec8', clothD: '#284a8c', trim: '#8ad0ff', trimD: '#4a94c8',
      hair: '#b9d8ee', eye: '#2b1a10', iris: '#4aa0e0',
      weapon: 'spear', cape: true, crown: false,
    },
  };

  // ============================================================
  // 人形主体：三头身
  //   总高 72：腿 18 / 躯干 22 / 头 32(直径)
  // ============================================================
  function humanoid(ctx, L, charId, pose, t) {
    const state = pose.state || 'idle';
    const run = state === 'run';
    const air = state === 'jump' || state === 'dash';
    const hurtK = pose.hurtP === undefined ? 0 : Math.sin(Math.min(1, 0.24 + pose.hurtP * 0.76) * Math.PI);
    const atk = pose.attackP;
    const cast = pose.castP;
    const ph = t / 82;
    const bob = run ? Math.abs(Math.sin(ph)) * 2.2 : Math.sin(t / 420) * 1.1;
    const lean = run ? 4.5 : (pose.sprint ? 7 : 0);

    const hipY = -22 + bob * 0.3;
    const shY = -40 + bob;
    const headY = shY - 14;
    const headR = 14;

    // 步态
    let legA = run ? Math.sin(ph) * 0.78 : 0.13;
    let legB = run ? -Math.sin(ph) * 0.78 : -0.13;
    if (air) { legA = 0.5; legB = -0.42; }
    if (hurtK) { legA += 0.22 * hurtK; legB -= 0.26 * hurtK; }

    // —— 后腿（暗一档，压在后面）——
    const backFoot = [Math.sin(legB) * 11 - 2, -3];
    limb2(ctx, [-3.5, hipY], [-3.5 + Math.sin(legB) * 6, hipY + 9], backFoot, 7.2, L.clothD);
    ellipse(ctx, backFoot[0] + 1.6, backFoot[1] + 1, 5.4, 3.2, L.skinD);

    // —— 披风（在身后飘）——
    if (L.cape) {
      const sway = Math.sin(t / 260) * 2 + (run ? -5 : 0);
      curveShape(ctx, [
        [-3, shY - 5],
        [-13 + sway * 0.3, shY + 4], [-19 + sway, hipY],
        [-13 + sway * 0.5, hipY + 16], [-5, hipY + 6],
      ], L.clothD);
    }

    // —— 躯干：上衣 + 腰带 + 下摆 ——
    ctx.save();
    ctx.translate(lean * 0.35, 0);
    // 下摆（虎皮裙 / 战裙）
    curveShape(ctx, [
      [-10, hipY + 1],
      [-13.5, hipY + 6], [-11.5, hipY + 8.5],
      [0, hipY + 9.5], [11.5, hipY + 8.5],
      [13.5, hipY + 6], [10, hipY + 1],
    ], L.cloth);
    // 上衣（肩宽、腰收）
    poly(ctx, [
      [-11, shY + 1], [-12.5, shY + 7], [-9.5, hipY - 1],
      [9.5, hipY - 1], [12.5, shY + 7], [11, shY + 1],
    ], L.cloth);
    // 胸口亮面
    poly(ctx, [
      [-1.5, shY + 2], [-9, shY + 4], [-9, hipY - 2], [-0.5, hipY - 2],
    ], L.clothD, 0);
    // 肩线（左右两片护肩）
    ellipse(ctx, -10.5, shY + 3.5, 5.4, 4.2, L.trim, -0.3, LW - 0.6);
    ellipse(ctx, 10.5, shY + 3.5, 5.4, 4.2, L.trim, 0.3, LW - 0.6);
    // 金腰带
    poly(ctx, [[-10.6, hipY - 4], [10.6, hipY - 4], [10.2, hipY + 1.6], [-10.2, hipY + 1.6]], L.trim);
    ellipse(ctx, 0, hipY - 1.2, 3, 2.3, L.trimD, 0, 1.2);
    ctx.restore();

    // —— 前腿 ——
    const frontFoot = [Math.sin(legA) * 11 + 2.5, -3];
    limb2(ctx, [2, hipY], [2.5 + Math.sin(legA) * 6, hipY + 9], frontFoot, 7.4, L.cloth);
    ellipse(ctx, frontFoot[0] + 1.8, frontFoot[1] + 1, 5.8, 3.4, L.skin);

    // —— 后臂 ——
    const armSw = run ? -Math.sin(ph) * 12 : 0;
    limb2(ctx, [-8, shY + 4], [-13, shY + 11], [-11 + armSw * 0.3, shY + 18], 5.4, L.clothD);
    ball(ctx, -11 + armSw * 0.3, shY + 18, 3.3, L.skinD);

    // —— 脖子 ——
    limb(ctx, [0, shY + 1], [0, headY + headR * 0.75], 7.4, L.skinD);
    // —— 头 ——
    drawHead(ctx, L, charId, 0, headY, headR, t, pose, hurtK);

    // —— 前臂 + 兵器 ——
    const swing = atk !== undefined ? Math.sin(Math.min(1, atk) * Math.PI) : 0;
    const handX = 15 + swing * 6 + (cast !== undefined ? 3 : 0);
    const handY = shY + 12 - swing * 9 + armSw * 0.2;
    limb2(ctx, [9, shY + 4], [14, shY + 9], [handX, handY], 5.6, L.clothD);
    ball(ctx, 14.6, shY + 9.6, 3.6, L.trim, 1.6);
    drawWeapon(ctx, L, handX, handY, swing, t, pose);
    ball(ctx, handX, handY, 3.4, L.skin);
    return { headY, headR, hipY, shY };
  }

  // —— 头：大圆脑袋 + 大眼 + 金箍 ——
  function drawHead(ctx, L, charId, x, y, r, t, pose, hurtK) {
    // 耳朵（先画，压在头后面）
    ball(ctx, x - r * 0.94, y + r * 0.12, r * 0.3, L.skin, LW - 0.6);
    ball(ctx, x + r * 1.0, y + r * 0.12, r * 0.28, L.skin, LW - 0.6);

    // 后脑毛团（横向扁圆，比正圆可爱）
    ellipse(ctx, x, y, r * 1.06, r * 0.97, L.fur);
    // 头顶暗块（顶光）
    ctx.save();
    ctx.globalAlpha = 0.42;
    ball(ctx, x - r * 0.34, y - r * 0.52, r * 0.4, L.furD, 0);
    ctx.restore();
    // 额前的一撮毛
    curveShape(ctx, [
      [x - r * 0.56, y - r * 0.72],
      [x - r * 0.22, y - r * 1.06], [x + r * 0.06, y - r * 0.66],
      [x + r * 0.42, y - r * 1.02], [x + r * 0.6, y - r * 0.6],
    ], L.furD, LW - 1.2);

    // 脸盘：只铺下半张（裁在头圆里），上半张留给毛和眼睛
    const fy = y + r * 0.36;
    ctx.save();
    ctx.beginPath();
    if (ctx.ellipse) ctx.ellipse(x, y, r * 1.06, r * 0.97, 0, 0, Math.PI * 2);
    else ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ellipse(ctx, x + r * 0.1, fy + r * 0.34, r * 0.95, r * 0.78, L.skin, 0, 0);
    ctx.restore();
    // 毛与脸的分界弧
    ctx.beginPath();
    if (ctx.ellipse) ctx.ellipse(x + r * 0.1, fy + r * 0.34, r * 0.95, r * 0.78, 0, Math.PI * 1.08, Math.PI * 1.92);
    ctx.strokeStyle = OUT; ctx.lineWidth = LW - 0.7; ctx.stroke();
    // 腮红
    ctx.save();
    ctx.globalAlpha = 0.3;
    ball(ctx, x - r * 0.56, fy + r * 0.1, r * 0.2, '#e8825e', 0);
    ball(ctx, x + r * 0.68, fy + r * 0.1, r * 0.19, '#e8825e', 0);
    ctx.restore();

    // —— 眼睛：Q 版的脸一半是眼睛 ——
    const eyeY = y + r * 0.12;
    const eyeR = r * 0.37;
    const hurtE = hurtK > 0.3;
    if (hurtE) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + s * r * 0.14, eyeY - r * 0.08);
        ctx.lineTo(x + s * r * 0.62, eyeY + r * 0.06);
        ctx.strokeStyle = OUT; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.stroke();
      }
    } else {
      // 远眼（略小）
      ellipse(ctx, x - r * 0.38, eyeY, eyeR * 0.84, eyeR, L.eye, 0, 0);
      ball(ctx, x - r * 0.4, eyeY - eyeR * 0.38, eyeR * 0.36, '#fff', 0);
      // 近眼（大而有神）
      ellipse(ctx, x + r * 0.44, eyeY, eyeR, eyeR * 1.1, L.eye, 0, 0);
      ball(ctx, x + r * 0.31, eyeY - eyeR * 0.44, eyeR * 0.42, '#fff', 0);
      ball(ctx, x + r * 0.53, eyeY + eyeR * 0.46, eyeR * 0.2, '#fff', 0);
      // 瞳色（贴在下方，像反光）
      ctx.save();
      ctx.globalAlpha = 0.85;
      ellipse(ctx, x + r * 0.4, eyeY + eyeR * 0.52, eyeR * 0.42, eyeR * 0.26, L.iris, 0, 0);
      ctx.restore();
    }

    // 鼻子 + 嘴（小，别抢眼睛）
    ball(ctx, x + r * 0.12, fy + r * 0.02, r * 0.085, 'rgba(120,70,50,0.75)', 0);
    ctx.beginPath();
    if (hurtE) ctx.arc(x + r * 0.18, fy + r * 0.42, r * 0.13, Math.PI, Math.PI * 2);
    else ctx.arc(x + r * 0.18, fy + r * 0.26, r * 0.14, Math.PI * 0.12, Math.PI * 0.88);
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.stroke();

    // —— 头饰 ——
    if (charId === 'wukong') {
      // 金箍：额前一道箍 + 中间宝珠
      ctx.beginPath();
      ctx.arc(x, y - r * 0.12, r * 0.94, Math.PI * 1.12, Math.PI * 1.88);
      ctx.strokeStyle = OUT; ctx.lineWidth = 8; ctx.stroke();
      ctx.strokeStyle = L.trim; ctx.lineWidth = 4.4; ctx.stroke();
      ball(ctx, x + r * 0.06, y - r * 1.06, r * 0.15, L.trim, 1.6);
      // 雉翎：一根红翎从脑后向上飘
      const sw = Math.sin(t / 230) * 3.4;
      curveShape(ctx, [
        [x - r * 0.5, y - r * 0.92],
        [x - r * 1.24, y - r * 1.5 + sw * 0.35], [x - r * 2.05, y - r * 1.24 + sw],
        [x - r * 1.6, y - r * 1.14 + sw * 0.6], [x - r * 0.62, y - r * 0.72],
      ], L.cloth, LW - 1);
    } else {
      // 其他：发髻 + 头带
      ball(ctx, x - r * 0.08, y - r * 0.9, r * 0.34, L.hair, LW - 0.8);
      ctx.beginPath();
      ctx.arc(x, y - r * 0.16, r * 0.9, Math.PI * 1.16, Math.PI * 1.84);
      ctx.strokeStyle = OUT; ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = L.trim; ctx.lineWidth = 3.6; ctx.stroke();
    }
    // 白龙马的龙角
    if (charId === 'bailongma') {
      limb(ctx, [x - r * 0.5, y - r * 0.82], [x - r * 0.82, y - r * 1.34], 3, L.trim);
      limb(ctx, [x + r * 0.46, y - r * 0.86], [x + r * 0.7, y - r * 1.4], 3, L.trim);
    }
  }

  // —— 兵器 ——
  function drawWeapon(ctx, L, hx, hy, swing, t, pose) {
    ctx.save();
    ctx.translate(hx + 5, hy);
    ctx.rotate(1.15 - swing * 1.9);
    if (L.weapon === 'staff') {
      // 金箍棒：红杆 + 两端金箍
      limb(ctx, [-2, 20], [-2, -30], 4.6, '#c8402a');
      ball(ctx, -2, -30, 3.6, L.trim, 2);
      ball(ctx, -2, 20, 3.6, L.trim, 2);
      // 棒身高光
      ctx.beginPath();
      ctx.moveTo(-3.4, 16); ctx.lineTo(-3.4, -24);
      ctx.strokeStyle = 'rgba(255,220,180,0.55)'; ctx.lineWidth = 1.4; ctx.stroke();
    } else if (L.weapon === 'rake') {
      limb(ctx, [0, 18], [0, -22], 4.2, '#8a6a3a');
      poly(ctx, [[-9, -22], [9, -22], [7, -30], [-7, -30]], '#c9cfd6');
      for (let i = 0; i < 4; i++) limb(ctx, [-6 + i * 4, -29], [-6 + i * 4, -22], 1.6, '#e8eef4');
    } else if (L.weapon === 'spade') {
      limb(ctx, [0, 20], [0, -18], 4.2, '#7a5a34');
      ellipse(ctx, 0, -22, 6, 7.5, '#c9cfd6', 0, 2);
    } else if (L.weapon === 'spear') {
      limb(ctx, [-1, 22], [-1, -26], 3.2, '#d8e2ee');
      poly(ctx, [[-6, -26], [4, -26], [-1, -36]], '#e8f2ff');
    } else {
      // 九环锡杖
      limb(ctx, [0, 22], [0, -24], 3.6, '#c8a45a');
      for (let i = 0; i < 3; i++) ball(ctx, 0, -12 + i * 7, 2.6, '#e8c878', 1.2);
    }
    ctx.restore();
  }

  // ============================================================
  // 入口
  // ============================================================
  // ============================================================
  // 小怪：同样走 Q 版卡通（大脑袋、粗描边、双色）
  // ============================================================
  const FOE = {
    imp:    { body: '#c9523f', dark: '#8e2f26', belly: '#eaa286', horn: '#f2e4c8', eye: '#2b1210', fang: '#fff8e6' },
    wolf:   { fur: '#8a5f38', dark: '#4d2f18', eye: '#ff4d4d', fang: '#f8efdc', nose: '#2b1a14' },
    spider: { skin: '#6a3380', dark: '#3f1a4c', eye: '#ff6b6b', eye2: '#ffb0b0' },
  };

  function foeImp(ctx, L, t, e) {
    const ph = t / 110;
    const bob = Math.sin(ph) * 1.1;
    const hurt = e.hitFlash > 0;
    const body = hurt ? '#f5f2ea' : L.body;
    // 腿
    limb(ctx, [-4.5, -11 + bob], [-5.5 - Math.sin(ph) * 2.4, -1], 5, L.dark);
    limb(ctx, [4.5, -11 + bob], [5.5 + Math.sin(ph) * 2.4, -1], 5, L.dark);
    ellipse(ctx, -6, -0.5, 4, 2.3, L.dark, 0, LW - 0.6);
    ellipse(ctx, 6, -0.5, 4, 2.3, L.dark, 0, LW - 0.6);
    // 身体（梨形）
    ellipse(ctx, 0, -16 + bob, 10.5, 9.4, body);
    ellipse(ctx, 0.5, -13.5 + bob, 6.4, 5, L.belly, 0, 0);
    // 手臂
    limb(ctx, [-8, -19 + bob], [-12.5, -13 + bob], 4, body);
    limb(ctx, [8, -19 + bob], [12.5, -13 + bob], 4, body);
    ball(ctx, -12.5, -13 + bob, 2.8, L.belly, LW - 0.8);
    ball(ctx, 12.5, -13 + bob, 2.8, L.belly, LW - 0.8);
    // 头（比身体大，Q 版）
    ellipse(ctx, 1, -27 + bob, 11.4, 10.4, body);
    // 角
    limb(ctx, [-6, -34 + bob], [-10, -41 + bob], 3.6, L.horn);
    limb(ctx, [7, -34.5 + bob], [11, -41.5 + bob], 3.6, L.horn);
    // 眼睛
    ellipse(ctx, -3.6, -28 + bob, 3.1, 3.6, L.eye, 0, 0);
    ellipse(ctx, 5.2, -28 + bob, 3.3, 3.8, L.eye, 0, 0);
    ball(ctx, -4.4, -29.4 + bob, 1.2, '#fff', 0);
    ball(ctx, 4.4, -29.4 + bob, 1.3, '#fff', 0);
    // 嘴 + 獠牙
    ctx.beginPath();
    ctx.arc(1, -23.5 + bob, 2.6, Math.PI * 0.12, Math.PI * 0.88);
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.7; ctx.stroke();
    poly(ctx, [[-1.4, -22.4 + bob], [0.4, -22.4 + bob], [-0.6, -19.6 + bob]], L.fang, 1.1);
    poly(ctx, [[2.4, -22.4 + bob], [4.2, -22.4 + bob], [3.3, -19.8 + bob]], L.fang, 1.1);
  }

  function foeWolf(ctx, L, t, e) {
    const ph = t / 105;
    const g = Math.sin(ph);
    const hurt = e.hitFlash > 0;
    const fur = hurt ? '#f5f2ea' : L.fur;
    // 远侧腿
    limb(ctx, [-11, -13], [-12 - g * 3, -1], 4.4, L.dark);
    limb(ctx, [10, -13], [11 + g * 3, -1], 4.4, L.dark);
    // 尾
    ctx.beginPath();
    ctx.moveTo(-15, -19);
    ctx.quadraticCurveTo(-24, -26, -21, -33 + g * 2);
    ctx.strokeStyle = OUT; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = fur; ctx.lineWidth = 4.6; ctx.stroke();
    // 躯干
    ellipse(ctx, -4, -19, 13.5, 10, fur);
    // 高光脊线
    ctx.save(); ctx.globalAlpha = 0.3;
    ellipse(ctx, -5, -25, 9, 3, '#fff', 0, 0);
    ctx.restore();
    // 近侧腿
    limb(ctx, [-8, -14], [-9 + g * 3, -1], 5, fur);
    limb(ctx, [7, -14], [8 - g * 3, -1], 5, fur);
    ellipse(ctx, -9 + g * 3, -0.5, 4, 2.2, fur, 0, LW - 0.8);
    ellipse(ctx, 8 - g * 3, -0.5, 4, 2.2, fur, 0, LW - 0.8);
    // 头
    ellipse(ctx, 12, -27, 9.6, 8.6, fur);
    // 长吻
    poly(ctx, [[16, -30], [26, -26.5], [26, -20], [16, -21]], fur);
    ellipse(ctx, 24.5, -23, 2.4, 1.9, L.nose, 0, 1.2);
    // 尖耳
    poly(ctx, [[6, -33], [4, -43], [13, -35]], L.dark);
    poly(ctx, [[13, -34.5], [16, -43.5], [19, -33]], fur);
    // 眼
    ellipse(ctx, 15.5, -29, 2.5, 2.9, L.eye, 0, 0);
    ball(ctx, 15, -30, 1, '#fff', 0);
    // 獠牙
    poly(ctx, [[23, -20.4], [25, -20.4], [24, -17.6]], L.fang, 1);
  }

  function foeSpider(ctx, L, t, e) {
    const ph = t / 120;
    const hurt = e.hitFlash > 0;
    const skin = hurt ? '#f5f2ea' : L.skin;
    // 八条腿：四对，带相位
    for (let i = 0; i < 4; i++) {
      const bx = -6 + i * 5.5;
      const a1 = Math.sin(ph + i * 0.9) * 0.3;
      const far = i % 2 === 0;
      const kneeX = bx - 6 - i * 1.2;
      const kneeY = -24 - (far ? 3 : 0);
      const footX = kneeX - 4 + a1 * 3;
      limb2(ctx, [bx, -16], [kneeX, kneeY], [footX, -1], far ? 3.2 : 3.8, far ? L.dark : skin);
      // 右侧对称
      limb2(ctx, [bx + 1, -16], [bx + 12 + i * 1.4, kneeY], [bx + 16 + a1 * 3, -1], far ? 3 : 3.6, far ? L.dark : skin);
    }
    // 腹
    ellipse(ctx, -10, -18, 12, 10, skin);
    // 背纹
    ctx.save(); ctx.globalAlpha = 0.5;
    ellipse(ctx, -11, -21, 5, 3.2, L.dark, 0, 0);
    ellipse(ctx, -13, -15, 3, 2, L.dark, 0, 0);
    ctx.restore();
    // 头胸
    ellipse(ctx, 6, -19, 9, 7.6, skin);
    // 眼（四只）
    ellipse(ctx, 6, -22, 2.2, 2.4, L.eye, 0, 0);
    ellipse(ctx, 11, -22, 2, 2.2, L.eye, 0, 0);
    ellipse(ctx, 3, -21, 1.6, 1.8, L.eye2, 0, 0);
    ellipse(ctx, 13, -20.5, 1.4, 1.6, L.eye2, 0, 0);
    ball(ctx, 5.4, -22.8, 0.8, '#fff', 0);
    ball(ctx, 10.6, -22.8, 0.7, '#fff', 0);
    // 螯
    limb(ctx, [12, -16], [16, -11], 2.6, L.dark);
    limb(ctx, [10, -15], [13, -10], 2.2, L.dark);
  }


  // ============================================================
  // 首领：Q 版放大版（体量压人、头大、角夸张）
  // 人形模板覆盖 demon/bear/bone/bull 四套；queen/dragon/beast 单独画
  // ============================================================
  function bossHumanoid(ctx, o, t, e) {
    const hurt = e.hitFlash > 0;
    const W = (c) => (hurt ? '#f5f2ea' : c);
    const skin = W(o.skin), cloth = W(o.cloth), clothD = W(o.clothD);
    const trim = W(o.trim || '#c9a24a'), metal = W(o.metal || '#8e939e');
    const ph = t / 150;
    const bob = Math.sin(ph * 2) * 1.5;
    const hipY = -30 + bob * 0.3;
    const shY = -56 + bob;
    const headY = shY - 19;
    const headR = o.headR || 17;

    // 腿 + 靴
    const legCol = o.skull ? '#ddd0b4' : cloth;
    limb2(ctx, [-8, hipY], [-10, hipY + 15], [-9, -4], o.skull ? 7.4 : 11.5, o.skull ? '#c8b998' : clothD);
    limb2(ctx, [8, hipY], [10, hipY + 15], [9, -4], o.skull ? 7.4 : 11.5, legCol);
    ellipse(ctx, -10, -2.5, o.skull ? 5.6 : 7.5, 4, o.skull ? '#ddd0b4' : metal, 0, LW);
    ellipse(ctx, 10, -2.5, o.skull ? 5.6 : 7.5, 4, metal, 0, LW);

    // 披风 / 背后红缨
    if (o.plume) {
      const sw = Math.sin(t / 250) * 3;
      curveShape(ctx, [
        [-6, shY - 8],
        [-24 + sw * 0.3, shY + 2], [-34 + sw, hipY + 10],
        [-25 + sw * 0.5, hipY + 24], [-8, hipY + 8],
      ], W(o.plume));
    }

    if (o.skull) {
      // 白骨：脊柱 + 肋骨 + 盆腔
      limb(ctx, [0, shY + 2], [0, hipY - 1], 6.4, '#e2d6bc');
      for (let i = 0; i < 3; i++) {
        const ry = shY + 6 + i * 6.4;
        ctx.beginPath();
        ctx.moveTo(-12, ry + 2);
        ctx.quadraticCurveTo(0, ry - 3.4, 12, ry + 2);
        ctx.strokeStyle = OUT; ctx.lineWidth = 7.4; ctx.stroke();
        ctx.strokeStyle = '#e2d6bc'; ctx.lineWidth = 4; ctx.stroke();
      }
      ellipse(ctx, 0, hipY - 2, 11, 6.4, '#d8cbaf', 0, LW);
      ellipse(ctx, 0, shY + 3, 12.4, 5, '#d8cbaf', 0, LW);
    } else {
      // 躯干
      poly(ctx, [
        [-15, shY + 2], [-17.5, shY + 10], [-13, hipY - 2],
        [13, hipY - 2], [17.5, shY + 10], [15, shY + 2],
      ], cloth);
      // 胸甲
      poly(ctx, [
        [-11, shY + 1], [-9, shY + 12], [0, shY + 15], [9, shY + 12], [11, shY + 1],
      ], metal);
      for (let i = -1; i <= 1; i++) ball(ctx, i * 5.5, shY + 7, 1.6, W('#d8dde6'), 0);
    }
    // 金腰带
    poly(ctx, [[-13.5, hipY - 5], [13.5, hipY - 5], [13, hipY + 1], [-13, hipY + 1]], trim);
    ellipse(ctx, 0, hipY - 2, 4.2, 3.2, W('#8a6a2a'), 0, 1.4);
    // 护肩
    ellipse(ctx, -16, shY + 4, 7.4, 5.6, trim, -0.3, LW);
    ellipse(ctx, 16, shY + 4, 7.4, 5.6, trim, 0.3, LW);

    // 后臂
    limb2(ctx, [-14, shY + 6], [-22, shY + 18], [-19, shY + 30], 7, clothD);
    ball(ctx, -19, shY + 30, 4.4, skin);

    // 头
    drawBossHead(ctx, o, headY, headR, t, hurt, skin, trim);
    // 脖子
    limb(ctx, [0, shY + 2], [0, headY + headR * 0.8], 9.5, skin);

    // 前臂 + 兵器
    const atk = e.atkUntil > 0 && e.atkUntil > t ? 0 : 0;
    const swing = e.state === 'windup' ? -(e.tele || 0) : 0;
    limb2(ctx, [14, shY + 6], [22, shY + 16], [24, shY + 8], 7.4, cloth);
    ball(ctx, 24, shY + 8, 4.6, skin);
    drawBossWeapon(ctx, o, 26, shY + 8, swing, t);
  }

  function drawBossHead(ctx, o, y, r, t, hurt, skin, trim) {
    // 熊耳（画在头后面）
    if (o.bearHead) {
      ball(ctx, -r * 0.8, y - r * 0.8, r * 0.36, skin, LW - 0.5);
      ball(ctx, r * 0.8, y - r * 0.8, r * 0.36, skin, LW - 0.5);
      ball(ctx, -r * 0.8, y - r * 0.8, r * 0.16, '#3a2a1c', 0);
      ball(ctx, r * 0.8, y - r * 0.8, r * 0.16, '#3a2a1c', 0);
    }
    // 头
    ellipse(ctx, 0, y, r * 1.06, r * 0.98, skin);
    // 额前暗块
    ctx.save(); ctx.globalAlpha = 0.35;
    ellipse(ctx, -r * 0.3, y - r * 0.55, r * 0.44, r * 0.3, '#000', 0, 0);
    ctx.restore();

    // 角
    if (o.horn === 'curved') {
      limb(ctx, [-r * 0.66, y - r * 0.74], [-r * 1.18, y - r * 1.24], 5.6, '#efe6d2');
      limb(ctx, [-r * 1.18, y - r * 1.24], [-r * 1.02, y - r * 1.6], 3.8, '#efe6d2');
      limb(ctx, [r * 0.68, y - r * 0.74], [r * 1.22, y - r * 1.26], 5.6, '#efe6d2');
      limb(ctx, [r * 1.22, y - r * 1.26], [r * 1.08, y - r * 1.62], 3.8, '#efe6d2');
    } else if (o.horn === 'bull') {
      limb(ctx, [-r * 0.66, y - r * 0.6], [-r * 1.6, y - r * 1.1], 6, '#f0e8d6');
      limb(ctx, [r * 0.66, y - r * 0.6], [r * 1.6, y - r * 1.1], 6, '#f0e8d6');
    }
    // 火焰发
    if (o.flame) {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * 0.85 + i * 0.36;
        const wob = Math.sin(t / 90 + i) * 3;
        poly(ctx, [
          [Math.cos(a) * r * 0.9, y - r * 0.7 + Math.sin(a) * r * 0.35],
          [Math.cos(a) * r * 1.5 + wob * 0.4, y - r * 1.55 + Math.sin(a) * r * 0.5],
          [Math.cos(a + 0.24) * r * 0.9, y - r * 0.72 + Math.sin(a + 0.24) * r * 0.35],
        ], W2(hurt, '#ff7a2e'), 1.6);
      }
    }
    // 眼
    if (o.skull) {
      // 骷髅：黑洞眼窝 + 幽绿点
      ellipse(ctx, -r * 0.38, y + r * 0.02, r * 0.3, r * 0.34, '#14100c', 0, 1.4);
      ellipse(ctx, r * 0.38, y + r * 0.02, r * 0.3, r * 0.34, '#14100c', 0, 1.4);
      ball(ctx, -r * 0.38, y + r * 0.04, r * 0.11, '#7dff9b', 0);
      ball(ctx, r * 0.38, y + r * 0.04, r * 0.11, '#7dff9b', 0);
    } else {
      // 发光眼
      ctx.save();
      ctx.globalAlpha = 0.35;
      ball(ctx, -r * 0.4, y + r * 0.02, r * 0.34, '#ffd479', 0);
      ball(ctx, r * 0.4, y + r * 0.02, r * 0.34, '#ffd479', 0);
      ctx.restore();
      ellipse(ctx, -r * 0.4, y + r * 0.02, r * 0.22, r * 0.26, '#2b1a10', 0, 0);
      ellipse(ctx, r * 0.4, y + r * 0.02, r * 0.22, r * 0.26, '#2b1a10', 0, 0);
      ball(ctx, -r * 0.46, y - r * 0.08, r * 0.08, '#fff', 0);
      ball(ctx, r * 0.34, y - r * 0.08, r * 0.08, '#fff', 0);
      // 怒眉
      limb(ctx, [-r * 0.72, y - r * 0.34], [-r * 0.16, y - r * 0.16], 3.2, '#2b1a10');
      limb(ctx, [r * 0.72, y - r * 0.34], [r * 0.16, y - r * 0.16], 3.2, '#2b1a10');
    }
    // 口 + 獠牙
    if (o.skull) {
      poly(ctx, [[-r * 0.3, y + r * 0.5], [r * 0.3, y + r * 0.5], [r * 0.24, y + r * 0.72], [-r * 0.24, y + r * 0.72]], '#14100c', 1.2);
      for (let i = -2; i <= 2; i++) limb(ctx, [i * r * 0.12, y + r * 0.5], [i * r * 0.12, y + r * 0.68], 1.6, '#e8dcc4');
    } else if (o.bullHead) {
      // 牛：宽口鼻 + 鼻环
      ellipse(ctx, r * 0.06, y + r * 0.5, r * 0.5, r * 0.34, '#c2685e', 0, LW - 0.6);
      ball(ctx, -r * 0.12, y + r * 0.48, r * 0.07, '#4a1a1a', 0);
      ball(ctx, r * 0.26, y + r * 0.48, r * 0.07, '#4a1a1a', 0);
      ctx.beginPath();
      ctx.arc(r * 0.08, y + r * 0.62, r * 0.16, 0, Math.PI);
      ctx.strokeStyle = '#ffd479'; ctx.lineWidth = 2.6; ctx.stroke();
    } else if (o.bearHead) {
      // 熊：长口鼻 + 黑鼻头
      ellipse(ctx, r * 0.08, y + r * 0.44, r * 0.46, r * 0.34, '#b9946a', 0, LW - 0.7);
      ball(ctx, r * 0.08, y + r * 0.36, r * 0.16, '#1a1210', 0);
      ctx.beginPath();
      ctx.arc(r * 0.08, y + r * 0.56, r * 0.18, Math.PI * 0.1, Math.PI * 0.9);
      ctx.strokeStyle = '#2b1a10'; ctx.lineWidth = 2.4; ctx.stroke();
      poly(ctx, [[-r * 0.16, y + r * 0.66], [r * 0.02, y + r * 0.66], [-r * 0.07, y + r * 0.86]], '#fff8e6', 1.1);
      poly(ctx, [[r * 0.16, y + r * 0.66], [r * 0.34, y + r * 0.66], [r * 0.26, y + r * 0.86]], '#fff8e6', 1.1);
    } else {
      // 咧嘴 + 双獠牙
      ctx.beginPath();
      ctx.arc(0, y + r * 0.34, r * 0.36, Math.PI * 0.12, Math.PI * 0.88);
      ctx.strokeStyle = '#2b1a10'; ctx.lineWidth = 3; ctx.stroke();
      poly(ctx, [[-r * 0.34, y + r * 0.5], [-r * 0.12, y + r * 0.5], [-r * 0.24, y + r * 0.78]], '#fff8e6', 1.2);
      poly(ctx, [[r * 0.34, y + r * 0.5], [r * 0.12, y + r * 0.5], [r * 0.24, y + r * 0.78]], '#fff8e6', 1.2);
    }
    // 冠 / 盔缨
    if (o.crown) {
      ctx.beginPath();
      ctx.arc(0, y - r * 0.2, r * 1.02, Math.PI * 1.1, Math.PI * 1.9);
      ctx.strokeStyle = OUT; ctx.lineWidth = 9; ctx.stroke();
      ctx.strokeStyle = trim; ctx.lineWidth = 5; ctx.stroke();
      ball(ctx, 0, y - r * 1.12, r * 0.18, trim, 1.8);
    }
  }
  function W2(hurt, c) { return hurt ? '#f5f2ea' : c; }

  function drawBossWeapon(ctx, o, hx, hy, swing, t) {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(0.9 - swing * 2.2);
    if (o.weapon === 'spear') {
      limb(ctx, [0, 30], [0, -38], 4.4, '#6b5232');
      poly(ctx, [[-5, -38], [5, -38], [0, -52]], '#dfe6ee');
    } else {
      // 大刀
      limb(ctx, [0, 30], [0, -30], 5, '#5b4326');
      poly(ctx, [[-3, -30], [10, -42], [13, -26], [2, -22]], '#cfd6e0');
      poly(ctx, [[2, -27], [9, -33], [10, -26], [3, -23]], '#8e97a4', 1.4);
    }
    ctx.restore();
  }

  // ——— 四足兽形首领（猪/狮/猿/鱼）———
  function bossBeast(ctx, o, t, e) {
    const hurt = e.hitFlash > 0;
    const W = (c) => (hurt ? '#f5f2ea' : c);
    const fur = W(o.fur || '#6b5442'), dark = W(o.furDark || '#493729');
    const ph = t / 135;
    const g = Math.sin(ph);
    // 远侧腿
    limb(ctx, [-18, -22], [-20 - g * 5, -2], 9, dark);
    limb(ctx, [16, -22], [18 + g * 5, -2], 9, dark);
    ellipse(ctx, -20 - g * 5, -1.5, 6, 3.4, dark, 0, LW - 0.6);
    ellipse(ctx, 18 + g * 5, -1.5, 6, 3.4, dark, 0, LW - 0.6);
    // 尾
    ctx.beginPath();
    ctx.moveTo(-26, -34);
    ctx.quadraticCurveTo(-38, -44, -34, -54 + g * 3);
    ctx.strokeStyle = OUT; ctx.lineWidth = 11; ctx.stroke();
    ctx.strokeStyle = fur; ctx.lineWidth = 6; ctx.stroke();
    // 躯干
    ellipse(ctx, -6, -34, 23, 17, fur);
    ctx.save(); ctx.globalAlpha = 0.26;
    ellipse(ctx, -8, -45, 14, 4.5, '#fff', 0, 0);
    ctx.restore();
    // 近侧腿
    limb(ctx, [-14, -24], [-16 + g * 5, -2], 10.5, fur);
    limb(ctx, [12, -24], [14 - g * 5, -2], 10.5, fur);
    ellipse(ctx, -16 + g * 5, -1.5, 6.6, 3.8, fur, 0, LW);
    ellipse(ctx, 14 - g * 5, -1.5, 6.6, 3.8, fur, 0, LW);
    // 头
    const hx = 22, hy = -52;
    bossBeastHead(ctx, o, hx, hy, 18, t, hurt, fur, dark);
  }

  function bossBeastHead(ctx, o, x, y, r, t, hurt, fur, dark) {
    const W = (c) => (hurt ? '#f5f2ea' : c);
    ctx.save();
    if (o.snout === 'lion') {
      // 鬃毛环
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        ball(ctx, x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92, r * 0.34, W(o.mane || '#1f4a3a'), 1.6);
      }
    }
    ellipse(ctx, x, y, r, r * 0.94, fur);
    if (o.snout === 'pig') {
      // 猪鼻 + 大獠牙
      ellipse(ctx, x + r * 0.5, y + r * 0.18, r * 0.34, r * 0.26, '#d98f92', 0, LW - 0.6);
      ball(ctx, x + r * 0.42, y + r * 0.16, r * 0.07, '#7a3038', 0);
      ball(ctx, x + r * 0.6, y + r * 0.16, r * 0.07, '#7a3038', 0);
      poly(ctx, [[x + r * 0.06, y + r * 0.42], [x + r * 0.24, y + r * 0.42], [x + r * 0.08, y + r * 0.86]], '#fff8e6', 1.3);
      poly(ctx, [[x + r * 0.62, y + r * 0.42], [x + r * 0.8, y + r * 0.42], [x + r * 0.78, y + r * 0.9]], '#fff8e6', 1.3);
      // 耳
      poly(ctx, [[x - r * 0.5, y - r * 0.7], [x - r * 0.2, y - r * 1.28], [x + r * 0.12, y - r * 0.66]], dark);
    } else if (o.snout === 'ape') {
      // 深色面罩 + 垂地长臂
      ellipse(ctx, x + r * 0.22, y + r * 0.06, r * 0.62, r * 0.66, W('#241a14'), 0, LW - 0.6);
      ball(ctx, x + r * 0.3, y - r * 0.06, r * 0.1, '#e8b45e', 0);
      ball(ctx, x + r * 0.62, y - r * 0.06, r * 0.1, '#e8b45e', 0);
      limb(ctx, [x + r * 0.1, y + r * 0.36], [x + r * 0.5, y + r * 0.4], 2.6, '#241a14');
      limb(ctx, [x - r * 0.2, y - r * 0.68], [x + r * 0.9, y - r * 0.6], 3, '#241a14');
    } else if (o.snout === 'fish') {
      // 鱼头：巨眼 + 背鳍 + 鳃
      ball(ctx, x + r * 0.24, y - r * 0.12, r * 0.46, '#fff4dc', 0);
      ball(ctx, x + r * 0.28, y - r * 0.12, r * 0.24, '#2b1a10', 0);
      ball(ctx, x + r * 0.2, y - r * 0.24, r * 0.09, '#fff', 0);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x - r * 0.1 - i * r * 0.16, y + r * 0.1, r * 0.4, -0.5, 0.5);
        ctx.strokeStyle = dark; ctx.lineWidth = 2.4; ctx.stroke();
      }
      // 背鳍
      poly(ctx, [[x - r * 0.6, y - r * 0.86], [x - r * 0.1, y - r * 1.5], [x + r * 0.4, y - r * 0.84]], W(o.fin || '#e8b48a'), LW - 0.6);
      // 嘴
      limb(ctx, [x + r * 0.6, y + r * 0.3], [x + r * 0.86, y + r * 0.24], 3, '#3a1a12');
    } else {
      // 默认兽面（狮子/熊）：方吻 + 獠牙
      ellipse(ctx, x + r * 0.36, y + r * 0.26, r * 0.44, r * 0.3, W('#d8bc8a'), 0, LW - 0.8);
      ball(ctx, x + r * 0.5, y + r * 0.16, r * 0.09, '#2a1a1a', 0);
      poly(ctx, [[x + r * 0.12, y + r * 0.42], [x + r * 0.3, y + r * 0.42], [x + r * 0.16, y + r * 0.84]], '#fff8e6', 1.3);
      poly(ctx, [[x + r * 0.56, y + r * 0.42], [x + r * 0.74, y + r * 0.42], [x + r * 0.7, y + r * 0.86]], '#fff8e6', 1.3);
    }
    // 眼（通用，已有则跳过）
    if (o.snout !== 'fish' && o.snout !== 'ape') {
      ellipse(ctx, x + r * 0.16, y - r * 0.16, r * 0.13, r * 0.16, '#2b1a10', 0, 0);
      ellipse(ctx, x + r * 0.56, y - r * 0.18, r * 0.13, r * 0.16, '#2b1a10', 0, 0);
      ball(ctx, x + r * 0.12, y - r * 0.22, r * 0.05, '#fff', 0);
      ball(ctx, x + r * 0.52, y - r * 0.24, r * 0.05, '#fff', 0);
    }
    ctx.restore();
  }


  // ——— 蜘蛛女王：人形上身 + 蛛腹八腿 ———
  function bossQueen(ctx, o, t, e) {
    const hurt = e.hitFlash > 0;
    const W = (c) => (hurt ? '#f5f2ea' : c);
    const skin = W(o.skin || '#8a4bb0'), cloth = W(o.cloth || '#3a1746');
    const ph = t / 190;
    // 八条腿（后四条先画）
    for (let i = 0; i < 4; i++) {
      const bx = -18 + i * 9;
      const sw = Math.sin(ph + i * 0.8) * 4;
      const far = i % 2 === 0;
      limb2(ctx, [bx, -40], [bx - 16 - i * 2, -58 - (far ? 6 : 0)],
        [bx - 26 - i * 3 + sw, -2], far ? 5 : 5.6, far ? W('#2c1036') : cloth);
    }
    // 蛛腹
    ellipse(ctx, -12, -42, 21, 17, skin);
    // 背纹
    ctx.save(); ctx.globalAlpha = 0.55;
    ellipse(ctx, -14, -48, 8, 5, W('#5c2a78'), 0, 0);
    ellipse(ctx, -18, -38, 5, 3.4, W('#5c2a78'), 0, 0);
    ctx.restore();
    // 人形上身
    poly(ctx, [[-9, -52], [-12, -68], [-7, -78], [7, -78], [12, -68], [9, -52]], cloth);
    // 前四条腿
    for (let i = 0; i < 4; i++) {
      const bx = -10 + i * 9;
      const sw = Math.sin(ph + 2 + i * 0.8) * 4;
      limb2(ctx, [bx, -40], [bx + 14 + i * 2, -56],
        [bx + 24 + i * 3 + sw, -2], 5.8, skin);
    }
    // 手臂 + 垂丝
    limb2(ctx, [-9, -72], [-16, -62], [-13, -50], 5.4, skin);
    limb2(ctx, [9, -72], [17, -64], [19, -52], 5.4, skin);
    ball(ctx, -13, -50, 3.4, skin, LW - 0.6);
    ball(ctx, 19, -52, 3.4, skin, LW - 0.6);
    // 头
    const hy = -88;
    ellipse(ctx, 0, hy, 14, 13.4, skin);
    // 发髻 + 金冠
    ball(ctx, -3, hy - 12, 6.4, cloth, LW - 0.6);
    ctx.beginPath();
    ctx.arc(0, hy - 2, 13.4, Math.PI * 1.1, Math.PI * 1.9);
    ctx.strokeStyle = OUT; ctx.lineWidth = 8; ctx.stroke();
    ctx.strokeStyle = '#e8c25a'; ctx.lineWidth = 4.4; ctx.stroke();
    ball(ctx, 0, hy - 15, 2.6, '#e8c25a', 1.6);
    // 六只眼（两排）
    for (let i = -1; i <= 1; i++) {
      ball(ctx, i * 6.4, hy - 2, 2.9, '#ff4d6a', 0);
      ball(ctx, i * 5.2, hy + 4.6, 1.9, '#ffd479', 0);
    }
    ball(ctx, -3.4, hy - 3.4, 1.1, '#fff', 0);
    ball(ctx, 3, hy - 3.4, 1.1, '#fff', 0);
    // 嘴
    ctx.beginPath();
    ctx.arc(0, hy + 8.6, 3.4, Math.PI * 0.12, Math.PI * 0.88);
    ctx.strokeStyle = '#2b0a1a'; ctx.lineWidth = 2.2; ctx.stroke();
    poly(ctx, [[-1.6, hy + 11], [0.6, hy + 11], [-0.6, hy + 16]], '#fff8e6', 1.1);
  }

  // ——— 毒龙：蛇形长身 ———
  function bossDragon(ctx, o, t, e) {
    const hurt = e.hitFlash > 0;
    const W = (c) => (hurt ? '#f5f2ea' : c);
    const sc = W(o.sc || '#2f7d6b'), belly = W(o.belly || '#d9e8a8');
    const sway = Math.sin(t / 380) * 3;
    const sway2 = Math.sin(t / 380 + 1.1) * 3.6;
    // 尾 → 身 → 肩（粗链）
    limb2(ctx, [-52, -14], [-38, -26], [-24, -38], 12, sc);
    limb2(ctx, [-24, -38], [-10, -46], [2, -52], 14, sc);
    // 腹鳞
    for (let i = 0; i < 4; i++) {
      const x = -44 + i * 12, y = -18 - i * 6.4;
      ctx.beginPath();
      ctx.arc(x, y, 5.2, -0.6, 0.9);
      ctx.strokeStyle = belly; ctx.lineWidth = 3; ctx.stroke();
    }
    // 背鳍
    for (let i = 0; i < 4; i++) {
      const x = -40 + i * 12, y = -32 - i * 6;
      poly(ctx, [[x, y], [x + 4, y - 9], [x + 9, y + 1]], W('#3fa88e'), LW - 1);
    }
    // 前爪
    limb2(ctx, [0, -50], [8, -34], [4, -14], 7.4, sc);
    limb(ctx, [4, -14], [-2, -10], 4.4, W('#e8dcc4'));
    // 脖 + 头
    limb2(ctx, [2, -52], [16, -60], [26 + sway2, -64], 11, sc);
    const hx = 34 + sway2, hy = -70;
    ellipse(ctx, hx, hy, 15, 12, sc);
    // 长吻
    poly(ctx, [[hx + 4, hy - 4], [hx + 26, hy - 1], [hx + 26, hy + 7], [hx + 6, hy + 9]], sc);
    // 角
    limb(ctx, [hx - 4, hy - 10], [hx - 9, hy - 22], 4.6, W(o.horn || '#e6dcc4'));
    limb(ctx, [hx + 4, hy - 10], [hx + 2, hy - 22], 4, W(o.horn || '#e6dcc4'));
    // 须
    ctx.beginPath();
    ctx.moveTo(hx + 24, hy + 2);
    ctx.quadraticCurveTo(hx + 34, hy + 6, hx + 30, hy + 16);
    ctx.strokeStyle = W('#ffd479'); ctx.lineWidth = 2.8; ctx.stroke();
    // 眼
    ball(ctx, hx + 6, hy - 3, 6, W(o.eye || '#ffd479'), 0);
    ball(ctx, hx + 7.6, hy - 2.6, 2.8, '#1a1410', 0);
    ball(ctx, hx + 5.4, hy - 4.6, 1.2, '#fff', 0);
    // 鼻息
    ball(ctx, hx + 25, hy + 1, 1.4, '#2b1a10', 0);
  }

  function drawBossByKind(ctx, kind, art, e, t) {
    if (kind === 'queen') return bossQueen(ctx, art, t, e);
    if (kind === 'dragon') return bossDragon(ctx, art, t, e);
    if (kind === 'beast') return bossBeast(ctx, art, t, e);
    // 人形系：demon / bear / bone / bull
    const o = {
      skin: art.skin || art.fur || '#6b5442',
      cloth: art.cloth || art.furDark || '#3b2f24',
      clothD: art.furDark || '#2b2118',
      trim: kind === 'bone' ? '#8a8f9c' : '#c9a24a',
      metal: kind === 'bone' ? '#c8ccd4' : (kind === 'bear' ? '#6b5a44' : '#8e939e'),
      horn: art.horn === true ? 'curved' : (kind === 'bull' ? 'bull' : null),
      plume: art.plume || null,
      weapon: art.weapon || (kind === 'bull' ? 'axe' : 'blade'),
      flame: !!art.flame,
      skull: kind === 'bone',
      bullHead: kind === 'bull',
      bearHead: kind === 'bear',
      crown: kind === 'bull',
      headR: art.small ? 14 : 17,
    };
    return bossHumanoid(ctx, o, t, e);
  }

  XY.Toon = {
    enabled: true,
    has(charId) { return !!LOOK[charId]; },
    drawCharacter(ctx, cx, footY, scale, charId, pose) {
      const L = LOOK[charId] || LOOK.wukong;
      pose = pose || {};
      const facing = pose.facing >= 0 ? 1 : -1;
      const s = (scale || 1) * 1.02;   // 造型总高 74 单位，比原像素层（约 60px）大一圈
      ctx.save();
      ctx.translate(cx, footY);
      // 落地投影
      if (ctx.ellipse) {
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = '#0a0705';
        ctx.beginPath();
        ctx.ellipse(0, -1, 17 * s, 5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.scale(facing * s, s);
      ctx.lineJoin = 'round';
      humanoid(ctx, L, charId, pose, pose.t || 0);
      ctx.restore();
    },
    LOOK,
    FOE,
    drawEnemy(ctx, e, t) {
      if (e.isBoss) {
        const art = e.art || {};
        const sc = ((e.h || 86) / 86) * (art.small ? 0.86 : 1);
        ctx.save();
        ctx.translate(e.x + e.w / 2, e.y + e.h);
        if (ctx.ellipse) {
          ctx.save(); ctx.globalAlpha = 0.36; ctx.fillStyle = '#0a0705';
          ctx.beginPath(); ctx.ellipse(0, -1, (e.w || 60) * 0.5, (e.w || 60) * 0.15, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        const bsx = (e.facing || -1) < 0 ? -1 : 1;
        ctx.scale(bsx * sc, sc);
        ctx.lineJoin = 'round';
        const bw = e.state === 'windup' ? (e.tele || 0) : 0;
        if (bw > 0) { ctx.translate(-4 * bw, 2 * bw); ctx.rotate(-0.05 * bw); }
        const lunge = (e.atkUntil || 0) - t;
        if (lunge > 0) ctx.translate(Math.sin(Math.min(1, lunge / 300) * Math.PI) * 8, 0);
        drawBossByKind(ctx, art.kind || 'bull', art, e, t);
        ctx.restore();
        return true;
      }
      const L = FOE[e.kind];
      if (!L) return false;
      const scaleY = (e.h || 34) / (e.kind === 'wolf' ? 36 : e.kind === 'spider' ? 32 : 34);
      ctx.save();
      ctx.translate(e.x + e.w / 2, e.y + e.h);
      // 落地影
      if (ctx.ellipse) {
        ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#0a0705';
        ctx.beginPath(); ctx.ellipse(0, -1, (e.w || 30) * 0.46, (e.w || 30) * 0.13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      const sx = (e.facing || -1) < 0 ? -1 : 1;
      ctx.scale(sx * scaleY, scaleY);
      ctx.lineJoin = 'round';
      const wind = e.state === 'windup' ? (e.tele || 0) : 0;
      if (wind > 0) { ctx.translate(-3.2 * wind, 1.4 * wind); ctx.rotate(-0.05 * wind); }
      if (e.kind === 'wolf') foeWolf(ctx, L, t, e);
      else if (e.kind === 'spider') foeSpider(ctx, L, t, e);
      else foeImp(ctx, L, t, e);
      ctx.restore();
      return true;
    },
  };
})();
