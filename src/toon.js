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
      weapon: 'khakkhara', cape: true, crown: false, sleeve: true,
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
  // 人形主体：三头身，动作全部由 XY.Moves 给的骨架驱动
  //   总高 74：腿 19 / 躯干 18 / 头 28(直径)
  //   骨架字段：ln 躯干倾角 / cr 下蹲 / lf,lb 两腿 / hx,hy 前手（相对前肩）
  //            bx,by 后手 / wa 兵器角 / wg 握点滑动 / ws 兵器缩放
  //            wb 兵器在身后 / bh 空手 / rot 拧身 / up 上抬 / hd 头偏移 / cape 披风
  // ============================================================
  const DEF_RIG = {
    ln: 0, cr: 0, lf: 0.13, lb: -0.13,
    hx: 4.5, hy: 8.5, bx: -3, by: 14,
    wa: 1.15, wg: 0, ws: 1, wb: 0, bh: 0,
    rot: 0, up: 0, hd: 0, cape: 0.5,
  };
  function humanoid(ctx, L, charId, pose, t) {
    const state = pose.state || 'idle';
    const run = state === 'run';
    const rig = (XY.Moves && XY.Moves.rig) ? XY.Moves.rig(pose, t) : DEF_RIG;
    const hurtK = pose.hurtP === undefined ? 0 : Math.sin(Math.min(1, 0.24 + pose.hurtP * 0.76) * Math.PI);
    const ph = t / 82;
    const bob = run ? Math.abs(Math.sin(ph)) * 2.2 : Math.sin(t / 420) * 1.1;

    const hipY = -22 + rig.cr + bob * 0.3;
    const shY = hipY - 18 + bob * 0.7;
    const headY = shY - 14 + rig.hd;
    const headR = 14;
    const legA = rig.lf;
    const legB = rig.lb;

    // 前手 / 后手（相对肩），肘部按"略向后下弯"求解
    const shFY = shY + 4;
    const SHX = 11.2;                                  // 前肩位置（手从这里长出去）
    const handF = [SHX + rig.hx, shFY + rig.hy];
    const elbowF = [SHX + rig.hx * 0.5 - 1.6, shFY + rig.hy * 0.5 + 2.4];
    const handB = [-9 + rig.bx, shFY + rig.by];
    const elbowB = [-9 + rig.bx * 0.5, shFY + rig.by * 0.5 + 2.6];
    // 下蹲时两脚往外撑（不然腿被压短，读不出"扎马步"）
    const stance = Math.max(0, rig.cr) / 13;

    ctx.save();
    // 拧身（横扫/回马枪这类"整个人转过去"的招）
    if (rig.rot) { ctx.translate(0, -34); ctx.rotate(rig.rot); ctx.translate(0, 34); }
    if (rig.up) ctx.translate(0, -rig.up);

    // —— 后腿（暗一档，压在后面）——
    const backFoot = [Math.sin(legB) * 11 - 2 - stance * 7, -3];
    limb2(ctx, [-3.5, hipY], [-3.5 + Math.sin(legB) * 6 - stance * 4, hipY + 9], backFoot, 7.2, L.clothD);
    ellipse(ctx, backFoot[0] + 1.6, backFoot[1] + 1, 5.4, 3.2, L.skinD);

    // —— 上半身：绕髋部旋转（前倾/后仰/拧腰）——
    const upper = (draw) => {
      ctx.save();
      ctx.translate(0, hipY);
      ctx.rotate(rig.ln);
      ctx.translate(0, -hipY);
      draw();
      ctx.restore();
    };

    upper(() => {
      // 披风（在身后飘；挥击时被带起来）
      if (L.cape) {
        const capeK = rig.cape === undefined ? 0.5 : rig.cape;
        const sway = Math.sin(t / 260) * 2 + (run ? -5 : 0) - capeK * 4;
        curveShape(ctx, [
          [-3, shY - 5],
          [-13 + sway * 0.3, shY + 4], [-19 + sway - capeK * 3, hipY + 2 - capeK * 4],
          [-13 + sway * 0.5, hipY + 16 - capeK * 5], [-5, hipY + 6],
        ], L.clothD);
      }
      // 兵器先画（这一下是抡到身后去的）
      if (rig.wb) drawWeapon(ctx, L, handF[0], handF[1], rig, t);

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
      // 胸口暗面
      poly(ctx, [
        [-1.5, shY + 2], [-9, shY + 4], [-9, hipY - 2], [-0.5, hipY - 2],
      ], L.clothD, 0);
      // 护肩
      ellipse(ctx, -11, shY + 3.5, 5.6, 4.4, L.trim, -0.3, LW - 0.6);
      ellipse(ctx, 11.5, shY + 3.5, 5.6, 4.4, L.trim, 0.3, LW - 0.6);
      // 金腰带
      poly(ctx, [[-10.6, hipY - 4], [10.6, hipY - 4], [10.2, hipY + 1.6], [-10.2, hipY + 1.6]], L.trim);
      ellipse(ctx, 0, hipY - 1.2, 3, 2.3, L.trimD, 0, 1.2);

      // —— 后臂（跟着招式摆，双手举棒时才撑得住）——
      limb2(ctx, [-8, shFY], elbowB, handB, 5.4, L.clothD);
      ball(ctx, handB[0], handB[1], 3.3, L.skinD);

      // —— 脖子 + 头 ——
      limb(ctx, [0, shY + 1], [0, headY + headR * 0.75], 7.4, L.skinD);
      drawHead(ctx, L, charId, 0, headY, headR, t, pose, hurtK);
    });

    // —— 前腿（压在最前面，盖住裙摆下缘）——
    // 抬得越高说明这一下是"踢"：脚离开地面，膝盖跟着提起来
    const kickLift = Math.max(0, Math.abs(legA) - 1.1) * 30;
    const frontFoot = [Math.sin(legA) * 11 + 2.5 + stance * 9, -3 - kickLift];
    limb2(ctx, [2, hipY], [2.5 + Math.sin(legA) * 7 + stance * 5, hipY + 9 - kickLift * 0.55], frontFoot, 7.4, L.cloth);
    ellipse(ctx, frontFoot[0] + 1.8, frontFoot[1] + 1, 5.8, 3.4, L.skin);

    upper(() => {
      // —— 前臂 + 兵器 ——
      limb2(ctx, [SHX - 1.5, shFY], elbowF, handF, 5.6, L.clothD);
      if (rig.bh && L.sleeve) {
        // 宽袍大袖：从肘到手张成一只喇叭袖，空手招式全靠它撑剪影
        const dx = handF[0] - elbowF[0], dy = handF[1] - elbowF[1];
        const ln = Math.hypot(dx, dy) || 1;
        const nx = -dy / ln, ny = dx / ln;
        poly(ctx, [
          [elbowF[0] - nx * 5.2, elbowF[1] - ny * 5.2],
          [handF[0] - nx * 8.2, handF[1] - ny * 8.2],
          [handF[0] + nx * 8.2, handF[1] + ny * 8.2],
          [elbowF[0] + nx * 5.2, elbowF[1] + ny * 5.2],
        ], L.cloth, LW - 0.8);
      }
      ball(ctx, elbowF[0], elbowF[1], 3.4, L.trim, 1.6);   // 护腕
      if (!rig.wb) drawWeapon(ctx, L, handF[0], handF[1], rig, t);
      ball(ctx, handF[0], handF[1], 3.4, L.skin);
    });
    ctx.restore();
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

  // —— 兵器（角度与握点由骨架给，所以同一根棒子能劈/戳/挑/甩）——
  function drawWeapon(ctx, L, hx, hy, rig, t) {
    if (rig.bh) return;                       // 拳脚招式：空手
    ctx.save();
    ctx.translate(hx + 5, hy);
    const wa = rig.wa === undefined ? 1.15 : rig.wa;
    ctx.rotate(wa);
    if (rig.ws !== undefined && rig.ws !== 1) ctx.scale(rig.ws, rig.ws);
    if (rig.wg) ctx.translate(0, rig.wg);     // 握点沿兵器滑动（正=握尾端，棒头伸更远）
    if (L.weapon === 'staff') {
      // 金箍棒：红杆 + 两端金箍
      limb(ctx, [-2, 17], [-2, -27], 4.6, '#c8402a');
      ball(ctx, -2, -27, 3.6, L.trim, 2);
      ball(ctx, -2, 17, 3.6, L.trim, 2);
      // 棒身高光
      ctx.beginPath();
      ctx.moveTo(-3.4, 14); ctx.lineTo(-3.4, -22);
      ctx.strokeStyle = 'rgba(255,220,180,0.55)'; ctx.lineWidth = 1.4; ctx.stroke();
    } else if (L.weapon === 'rake') {
      limb(ctx, [0, 16], [0, -20], 4.2, '#8a6a3a');
      poly(ctx, [[-9, -20], [9, -20], [7, -28], [-7, -28]], '#c9cfd6');
      for (let i = 0; i < 4; i++) limb(ctx, [-6 + i * 4, -27], [-6 + i * 4, -20], 1.6, '#e8eef4');
    } else if (L.weapon === 'spade') {
      limb(ctx, [0, 17], [0, -16], 4.2, '#7a5a34');
      ellipse(ctx, 0, -20, 6, 7.5, '#c9cfd6', 0, 2);
    } else if (L.weapon === 'spear') {
      limb(ctx, [-1, 18], [-1, -23], 3.2, '#d8e2ee');
      poly(ctx, [[-6, -23], [4, -23], [-1, -33]], '#e8f2ff');
    } else {
      // 九环锡杖
      limb(ctx, [0, 19], [0, -21], 3.6, '#c8a45a');
      for (let i = 0; i < 3; i++) ball(ctx, 0, -10 + i * 6.5, 2.6, '#e8c878', 1.2);
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

  // 手臂/腿：极坐标，正角 = 往前抡（三头身短肢，用角度比用位移读得清）
  function armPt(sx, sy, len, base, a) {
    const ang = base + (a || 0);
    return [sx + Math.sin(ang) * len, sy + Math.cos(ang) * len];
  }
  // 肘：肩手连线的中点往外顶一段，抬手时自然拐弯
  function elbowFor(sx, sy, hx, hy, bend) {
    const mx = (sx + hx) / 2, my = (sy + hy) / 2;
    const dx = hx - sx, dy = hy - sy;
    const len = Math.hypot(dx, dy) || 1;
    return [mx - (dy / len) * bend, my + (dx / len) * bend];
  }

  function foeImp(ctx, L, t, e, P) {
    const ph = t / 110;
    const bob = Math.sin(ph) * 1.1;
    const cr = P.crouch;
    const hurt = e.hitFlash > 0;
    const body = hurt ? '#f5f2ea' : L.body;
    const hipY = -11 + bob + cr;
    const shY = -19 + bob + cr * 0.95;
    const hx = 1 + P.hdx, hy = -27 + bob + cr + P.hdy;
    // 腿：脚钉在地上，蹲下去腿自然压短、两脚外撇
    const sp = 4.5 + cr * 0.3;
    limb(ctx, [-sp, hipY], [-5.5 - Math.sin(ph) * 2.4 - cr * 0.26, -1], 5, L.dark);
    limb(ctx, [sp, hipY], [5.5 + Math.sin(ph) * 2.4 + cr * 0.26, -1], 5, L.dark);
    ellipse(ctx, -6 - cr * 0.2, -0.5, 4, 2.3, L.dark, 0, LW - 0.6);
    ellipse(ctx, 6 + cr * 0.2, -0.5, 4, 2.3, L.dark, 0, LW - 0.6);
    // 身体（梨形）
    ellipse(ctx, 0, -16 + bob + cr, 10.5, 9.4, body);
    ellipse(ctx, 0.5, -13.5 + bob + cr, 6.4, 5, L.belly, 0, 0);
    // 手臂：后手先画
    const bh = armPt(-8, shY, 7.5, -0.64, P.armB);
    const fh = armPt(8, shY, 7.5, 0.64, P.armF);
    limb(ctx, [-8, shY], bh, 4, body);
    limb(ctx, [8, shY], fh, 4, body);
    ball(ctx, bh[0], bh[1], 2.8, L.belly, LW - 0.8);
    ball(ctx, fh[0], fh[1], 2.8, L.belly, LW - 0.8);
    // 头（比身体大，Q 版）
    ellipse(ctx, hx, hy, 11.4, 10.4, body);
    // 角
    limb(ctx, [hx - 7, hy - 7], [hx - 11, hy - 14], 3.6, L.horn);
    limb(ctx, [hx + 6, hy - 7.5], [hx + 10, hy - 14.5], 3.6, L.horn);
    // 眼睛
    ellipse(ctx, hx - 4.6, hy - 1, 3.1, 3.6, L.eye, 0, 0);
    ellipse(ctx, hx + 4.2, hy - 1, 3.3, 3.8, L.eye, 0, 0);
    ball(ctx, hx - 5.4, hy - 2.4, 1.2, '#fff', 0);
    ball(ctx, hx + 3.4, hy - 2.4, 1.3, '#fff', 0);
    // 嘴 + 獠牙：jaw 张开时露出黑洞，獠牙跟着分开
    const my = hy + 3.5, jw = P.jaw;
    if (jw > 0.06) {
      ellipse(ctx, hx, my + jw * 1.1, 3.2, 1.0 + jw * 2.4, '#40141a', 0, 1.2);
    } else {
      ctx.beginPath();
      ctx.arc(hx, my - 1, 2.6, Math.PI * 0.12, Math.PI * 0.88);
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.7; ctx.stroke();
    }
    const open = jw * 2.2;
    poly(ctx, [[hx - 2.4, my - 1.2], [hx - 0.6, my - 1.2], [hx - 1.6, my + 1.9 + open]], L.fang, 1.1);
    poly(ctx, [[hx + 1.4, my - 1.2], [hx + 3.2, my - 1.2], [hx + 2.3, my + 1.7 + open]], L.fang, 1.1);
  }

  function foeWolf(ctx, L, t, e, P) {
    const ph = t / 105;
    const g = Math.sin(ph);
    const hurt = e.hitFlash > 0;
    const fur = hurt ? '#f5f2ea' : L.fur;
    const cr = P.crouch;
    const legF = (P.armF || 0) * 5;      // 前腿蹬出去
    const tailW = g + (P.tail || 0) * 0.6;
    // 远侧腿
    limb(ctx, [-11, -13 + cr], [-12 - g * 3, -1], 4.4, L.dark);
    limb(ctx, [10, -13 + cr], [11 + g * 3 + legF, -1], 4.4, L.dark);
    // 尾
    ctx.beginPath();
    ctx.moveTo(-15, -19 + cr);
    ctx.quadraticCurveTo(-24, -26 + cr, -21 - tailW * 2, -33 + cr + tailW * 2);
    ctx.strokeStyle = OUT; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = fur; ctx.lineWidth = 4.6; ctx.stroke();
    // 躯干
    ellipse(ctx, -4, -19 + cr, 13.5, 10, fur);
    // 高光脊线
    ctx.save(); ctx.globalAlpha = 0.3;
    ellipse(ctx, -5, -25 + cr, 9, 3, '#fff', 0, 0);
    ctx.restore();
    // 近侧腿
    limb(ctx, [-8, -14 + cr], [-9 + g * 3, -1], 5, fur);
    limb(ctx, [7, -14 + cr], [8 - g * 3 + legF, -1], 5, fur);
    ellipse(ctx, -9 + g * 3, -0.5, 4, 2.2, fur, 0, LW - 0.8);
    ellipse(ctx, 8 - g * 3 + legF, -0.5, 4, 2.2, fur, 0, LW - 0.8);
    // 头（撕咬时整颗头往前弹）
    const hx0 = 12 + P.hdx, hy0 = -27 + cr + P.hdy;
    ellipse(ctx, hx0, hy0, 9.6, 8.6, fur);
    // 上吻
    poly(ctx, [[hx0 + 4, hy0 - 3], [hx0 + 14, hy0 + 0.5], [hx0 + 14, hy0 + 7], [hx0 + 4, hy0 + 6]], fur);
    ellipse(ctx, hx0 + 12.5, hy0 + 4, 2.4, 1.9, L.nose, 0, 1.2);
    // 下颌 / 口腔：张嘴时下颌绕吻根转下去
    const jw = P.jaw;
    if (jw > 0.04) {
      poly(ctx, [[hx0 + 4, hy0 + 5], [hx0 + 14, hy0 + 5.5], [hx0 + 12, hy0 + 9 + jw * 3], [hx0 + 4, hy0 + 8 + jw * 2]], '#5a1a20', 1.1);
      ctx.save();
      ctx.translate(hx0 + 4, hy0 + 8);
      ctx.rotate(jw * 0.42);
      poly(ctx, [[0, -1], [10.5, 1], [9.6, 4.4], [0, 3.4]], fur, LW - 0.4);
      poly(ctx, [[7.6, -0.4], [9.4, -0.4], [8.4, 3.6]], L.fang, 1);
      ctx.restore();
    }
    // 尖耳
    poly(ctx, [[hx0 - 6, hy0 - 6], [hx0 - 8, hy0 - 16], [hx0 + 1, hy0 - 8]], L.dark);
    poly(ctx, [[hx0 + 1, hy0 - 7.5], [hx0 + 4, hy0 - 16.5], [hx0 + 7, hy0 - 6]], fur);
    // 眼
    ellipse(ctx, hx0 + 3.5, hy0 - 2, 2.5, 2.9, L.eye, 0, 0);
    ball(ctx, hx0 + 3, hy0 - 3, 1, '#fff', 0);
    // 上獠牙
    poly(ctx, [[hx0 + 11, hy0 + 6.4], [hx0 + 13, hy0 + 6.4], [hx0 + 12, hy0 + 10 + jw * 1.6]], L.fang, 1);
  }

  function foeSpider(ctx, L, t, e, P) {
    const ph = t / 120;
    const hurt = e.hitFlash > 0;
    const skin = hurt ? '#f5f2ea' : L.skin;
    const cr = P.crouch;
    const hdx = P.hdx, hdy = P.hdy;
    // 八条腿：膝节拱到身体上方再踩下去（侧视蜘蛛的招牌剪影）
    const LEGS = [
      { f: -33, k: -16, ky: -33, w: 4.2, far: 1 },
      { f: -22, k: -11, ky: -40, w: 4.6, far: 0 },
      { f: 24, k: 16, ky: -39, w: 4.2, far: 1 },
      { f: 32, k: 22, ky: -32, w: 4.6, far: 0 },
    ];
    for (let i = 0; i < LEGS.length; i++) {
      const lg = LEGS[i];
      const sw = Math.sin(ph + i * 0.9) * 2.6;
      const sx = 1 - lg.far * 3, sy = -16 + cr - lg.far * 2;
      limb2(ctx, [sx, sy], [lg.k - lg.far * 2 + sw, lg.ky + cr * 0.6],
        [lg.f - lg.far * 3 + sw * 1.5, -1], lg.w, lg.far ? L.dark : skin);
    }
    // 腹
    ellipse(ctx, -10, -18 + cr, 12, 10, skin);
    // 背纹
    ctx.save(); ctx.globalAlpha = 0.5;
    ellipse(ctx, -11, -21 + cr, 5, 3.2, L.dark, 0, 0);
    ellipse(ctx, -13, -15 + cr, 3, 2, L.dark, 0, 0);
    ctx.restore();
    // 头胸（毒牙/吐丝时前半身高高抬起再压下）
    const tx = 6 + hdx, ty = -19 + cr + hdy;
    ellipse(ctx, tx, ty, 9, 7.6, skin);
    // 眼（四只）
    ellipse(ctx, tx, ty - 3, 2.2, 2.4, L.eye, 0, 0);
    ellipse(ctx, tx + 5, ty - 3, 2, 2.2, L.eye, 0, 0);
    ellipse(ctx, tx - 3, ty - 2, 1.6, 1.8, L.eye2, 0, 0);
    ellipse(ctx, tx + 7, ty - 1.5, 1.4, 1.6, L.eye2, 0, 0);
    ball(ctx, tx - 0.6, ty - 3.8, 0.8, '#fff', 0);
    ball(ctx, tx + 4.6, ty - 3.8, 0.7, '#fff', 0);
    // 螯：jaw 越大张得越开
    const op = 1 + P.jaw * 0.8;
    limb(ctx, [tx + 6, ty + 3], [tx + 10 + op * 1.6, ty + 8 - op * 1.4], 2.6, L.dark);
    limb(ctx, [tx + 4, ty + 4], [tx + 7 + op * 1.2, ty + 9 + op * 0.8], 2.2, L.dark);
  }


  // ============================================================
  // 首领：Q 版放大版（体量压人、头大、角夸张）
  // 人形模板覆盖 demon/bear/bone/bull 四套；queen/dragon/beast 单独画
  // ============================================================
  function bossHumanoid(ctx, o, t, e, P) {
    const hurt = e.hitFlash > 0;
    const W = (c) => (hurt ? '#f5f2ea' : c);
    const skin = W(o.skin), cloth = W(o.cloth), clothD = W(o.clothD);
    const trim = W(o.trim || '#c9a24a'), metal = W(o.metal || '#8e939e');
    const ph = t / 150;
    const bob = Math.sin(ph * 2) * 1.5;
    const cr = P.crouch;
    const hipY = -30 + bob * 0.3 + cr;
    const shY = -56 + bob + cr;
    const headY = shY - 19 + P.hdy;
    const headR = o.headR || 17;

    // 腿 + 靴：脚钉在地上，蹲下去腿压短、两脚外撑
    const legCol = o.skull ? '#ddd0b4' : cloth;
    const spread = cr * 0.18;
    limb2(ctx, [-8 - spread, hipY], [-10 - spread * 1.4, hipY + 15], [-9 - spread * 1.6, -4], o.skull ? 7.4 : 11.5, o.skull ? '#c8b998' : clothD);
    limb2(ctx, [8 + spread, hipY], [10 + spread * 1.4, hipY + 15], [9 + spread * 1.6, -4], o.skull ? 7.4 : 11.5, legCol);
    ellipse(ctx, -9 - spread * 1.6, -2.5, o.skull ? 5.6 : 7.5, 4, o.skull ? '#ddd0b4' : metal, 0, LW);
    ellipse(ctx, 9 + spread * 1.6, -2.5, o.skull ? 5.6 : 7.5, 4, metal, 0, LW);

    // 上身绕胯转：前倾 / 后仰 / 砸下去，整个人跟着动
    ctx.save();
    ctx.translate(0, hipY);
    ctx.rotate(P.lean);
    ctx.translate(0, -hipY);

    // 披风 / 背后红缨
    if (o.plume) {
      const sw = Math.sin(t / 250) * 3;
      curveShape(ctx, [
        [-6, shY - 8],
        [-24 + sw * 0.3, shY + 2], [-34 + sw, hipY + 10],
        [-25 + sw * 0.5, hipY + 24], [-8, hipY + 8],
      ], W(o.plume));
    }

    // 后臂：手往前甩的时候要画在身前，否则整条手臂都被躯干盖住
    const bsx = -14, bsy = shY + 6;
    const bhx = bsx + P.bx, bhy = bsy + P.by;
    const backArm = () => {
      const be = elbowFor(bsx, bsy, bhx, bhy, 6.5);
      limb2(ctx, [bsx, bsy], be, [bhx, bhy], 7, clothD);
      ball(ctx, bhx, bhy, 4.4, skin);
    };
    const backFront = P.bx > 2;
    if (!backFront) backArm();

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

    // 前手位置（兵器与手都要用）
    const fsx = 14, fsy = shY + 6;
    const fhx = fsx + P.hx, fhy = fsy + P.hy;
    // 脖子（压在头下面）
    limb(ctx, [0, shY + 2], [P.hdx * 0.6, headY + headR * 0.8], 9.5, skin);
    // 头
    ctx.save();
    ctx.translate(P.hdx, 0);
    drawBossHead(ctx, o, headY, headR, t, hurt, skin, trim, P.jaw);
    ctx.restore();
    if (backFront) backArm();
    // 前臂 + 手压在兵器上（握得住）
    const fe = elbowFor(fsx, fsy, fhx, fhy, 6.5);
    limb2(ctx, [fsx, fsy], fe, [fhx, fhy], 7.4, cloth);
    ball(ctx, fhx, fhy, 4.6, skin);
    // 兵器最后画（压在手上），举起来时才不会被身子吃掉
    drawBossWeapon(ctx, o, fhx, fhy, P.wa, P.wg || 0);
    ctx.restore();
  }

  function drawBossHead(ctx, o, y, r, t, hurt, skin, trim, jaw) {
    const jw = jaw || 0;
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
      if (jw > 0.08) ellipse(ctx, r * 0.08, y + r * 0.72, r * 0.3, r * 0.1 + jw * r * 0.14, '#40141a', 0, 1.4);
      ctx.beginPath();
      ctx.arc(r * 0.08, y + r * 0.62, r * 0.16, 0, Math.PI);
      ctx.strokeStyle = '#ffd479'; ctx.lineWidth = 2.6; ctx.stroke();
    } else if (o.bearHead) {
      // 熊：长口鼻 + 黑鼻头
      ellipse(ctx, r * 0.08, y + r * 0.44, r * 0.46, r * 0.34, '#b9946a', 0, LW - 0.7);
      ball(ctx, r * 0.08, y + r * 0.36, r * 0.16, '#1a1210', 0);
      if (jw > 0.08) {
        // 张嘴咆哮
        ellipse(ctx, r * 0.08, y + r * (0.62 + jw * 0.06), r * 0.26, r * 0.06 + jw * r * 0.16, '#40141a', 0, 1.4);
        poly(ctx, [[-r * 0.18, y + r * 0.6], [-r * 0.02, y + r * 0.6], [-r * 0.09, y + r * (0.8 + jw * 0.1)]], '#fff8e6', 1.1);
        poly(ctx, [[r * 0.18, y + r * 0.6], [r * 0.34, y + r * 0.6], [r * 0.27, y + r * (0.8 + jw * 0.1)]], '#fff8e6', 1.1);
      } else {
        ctx.beginPath();
        ctx.arc(r * 0.08, y + r * 0.56, r * 0.18, Math.PI * 0.1, Math.PI * 0.9);
        ctx.strokeStyle = '#2b1a10'; ctx.lineWidth = 2.4; ctx.stroke();
        poly(ctx, [[-r * 0.16, y + r * 0.66], [r * 0.02, y + r * 0.66], [-r * 0.07, y + r * 0.86]], '#fff8e6', 1.1);
        poly(ctx, [[r * 0.16, y + r * 0.66], [r * 0.34, y + r * 0.66], [r * 0.26, y + r * 0.86]], '#fff8e6', 1.1);
      }
    } else {
      // 咧嘴 + 双獠牙：出招时张口怒吼
      if (jw > 0.1) {
        ellipse(ctx, 0, y + r * (0.46 + jw * 0.08), r * (0.3 + jw * 0.06), r * 0.06 + jw * r * 0.2, '#40141a', 0, 1.6);
        poly(ctx, [[-r * 0.34, y + r * 0.34], [-r * 0.12, y + r * 0.34], [-r * 0.24, y + r * (0.62 + jw * 0.1)]], '#fff8e6', 1.2);
        poly(ctx, [[r * 0.34, y + r * 0.34], [r * 0.12, y + r * 0.34], [r * 0.24, y + r * (0.62 + jw * 0.1)]], '#fff8e6', 1.2);
      } else {
        ctx.beginPath();
        ctx.arc(0, y + r * 0.34, r * 0.36, Math.PI * 0.12, Math.PI * 0.88);
        ctx.strokeStyle = '#2b1a10'; ctx.lineWidth = 3; ctx.stroke();
        poly(ctx, [[-r * 0.34, y + r * 0.5], [-r * 0.12, y + r * 0.5], [-r * 0.24, y + r * 0.78]], '#fff8e6', 1.2);
        poly(ctx, [[r * 0.34, y + r * 0.5], [r * 0.12, y + r * 0.5], [r * 0.24, y + r * 0.78]], '#fff8e6', 1.2);
      }
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

  function drawBossWeapon(ctx, o, hx, hy, wa, wg) {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(wa);
    ctx.translate(0, wg || 0);
    if (o.weapon === 'spear') {
      // 短矛：杆不宜过长，否则举起来一定横穿脑袋
      limb(ctx, [0, 20], [0, -24], 4.4, '#6b5232');
      poly(ctx, [[-4.4, -24], [4.4, -24], [0, -35]], '#dfe6ee');
    } else {
      // 大刀（单手斧大小）
      limb(ctx, [0, 22], [0, -24], 5, '#5b4326');
      poly(ctx, [[-3, -24], [9, -33], [11, -21], [2, -17]], '#cfd6e0');
      poly(ctx, [[2, -22], [8, -26], [9, -21], [3, -18]], '#8e97a4', 1.4);
    }
    ctx.restore();
  }

  // ——— 四足兽形首领（猪/狮/猿/鱼）———
  function bossBeast(ctx, o, t, e, P) {
    const hurt = e.hitFlash > 0;
    const W = (c) => (hurt ? '#f5f2ea' : c);
    const fur = W(o.fur || '#6b5442'), dark = W(o.furDark || '#493729');
    const ph = t / 135;
    const g = Math.sin(ph);
    const cr = P.crouch;
    // 远侧腿
    limb(ctx, [-18, -22 + cr], [-20 - g * 5, -2], 9, dark);
    limb(ctx, [16, -22 + cr], [18 + g * 5, -2], 9, dark);
    ellipse(ctx, -20 - g * 5, -1.5, 6, 3.4, dark, 0, LW - 0.6);
    ellipse(ctx, 18 + g * 5, -1.5, 6, 3.4, dark, 0, LW - 0.6);
    // 尾
    ctx.beginPath();
    ctx.moveTo(-26, -34 + cr);
    ctx.quadraticCurveTo(-38, -44 + cr, -34, -54 + cr + g * 3);
    ctx.strokeStyle = OUT; ctx.lineWidth = 11; ctx.stroke();
    ctx.strokeStyle = fur; ctx.lineWidth = 6; ctx.stroke();
    // 躯干
    ellipse(ctx, -6, -34 + cr, 23, 17, fur);
    ctx.save(); ctx.globalAlpha = 0.26;
    ellipse(ctx, -8, -45 + cr, 14, 4.5, '#fff', 0, 0);
    ctx.restore();
    // 近侧腿
    limb(ctx, [-14, -24 + cr], [-16 + g * 5, -2], 10.5, fur);
    limb(ctx, [12, -24 + cr], [14 - g * 5, -2], 10.5, fur);
    ellipse(ctx, -16 + g * 5, -1.5, 6.6, 3.8, fur, 0, LW);
    ellipse(ctx, 14 - g * 5, -1.5, 6.6, 3.8, fur, 0, LW);
    // 头（低头冲锋时整颗头往前压）
    const hx = 22 + P.hdx, hy = -52 + cr + P.hdy;
    bossBeastHead(ctx, o, hx, hy, 18, t, hurt, fur, dark, P.jaw);
  }

  function bossBeastHead(ctx, o, x, y, r, t, hurt, fur, dark, jaw) {
    const W = (c) => (hurt ? '#f5f2ea' : c);
    const jw = jaw || 0;
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
      if (jw > 0.1) {
        // 张口咆哮
        ellipse(ctx, x + r * 0.34, y + r * (0.46 + jw * 0.06), r * 0.3, r * 0.05 + jw * r * 0.15, '#40141a', 0, 1.5);
      }
      poly(ctx, [[x + r * 0.12, y + r * 0.42], [x + r * 0.3, y + r * 0.42], [x + r * 0.16, y + r * (0.84 + jw * 0.08)]], '#fff8e6', 1.3);
      poly(ctx, [[x + r * 0.56, y + r * 0.42], [x + r * 0.74, y + r * 0.42], [x + r * 0.7, y + r * (0.86 + jw * 0.08)]], '#fff8e6', 1.3);
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
  function bossQueen(ctx, o, t, e, P) {
    const hurt = e.hitFlash > 0;
    const W = (c) => (hurt ? '#f5f2ea' : c);
    const skin = W(o.skin || '#8a4bb0'), cloth = W(o.cloth || '#3a1746');
    const ph = t / 190;
    const cr = P.crouch;
    const jw = P.jaw || 0;
    // 八条腿：从腹侧按角度扇形铺开（原来四根并排，像栅栏）
    const rx = -10, ry = -42 + cr * 0.6;
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * (1.03 - i * 0.35);
      const sw = Math.sin(ph + i * 0.85) * 4;
      const far = i % 2 === 0;
      const rr = far ? 34 : 43;
      const kx = rx + Math.cos(a) * rr * 0.6, ky = ry + Math.sin(a) * 15 - 13;
      const fx = rx + Math.cos(a) * rr + sw;
      limb2(ctx, [rx, ry], [kx, ky], [fx, -2], far ? 5 : 6, far ? W('#2c1036') : cloth);
    }
    // 蛛腹
    ellipse(ctx, -12, -42 + cr, 21, 17, skin);
    // 背纹
    ctx.save(); ctx.globalAlpha = 0.55;
    ellipse(ctx, -14, -48 + cr, 8, 5, W('#5c2a78'), 0, 0);
    ellipse(ctx, -18, -38 + cr, 5, 3.4, W('#5c2a78'), 0, 0);
    ctx.restore();
    // 人形上身
    poly(ctx, [[-9, -52 + cr], [-12, -68 + cr], [-7, -78 + cr], [7, -78 + cr], [12, -68 + cr], [9, -52 + cr]], cloth);
    // 近侧四条腿（比远侧略高、略靠前，才有前后层次）
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * (0.94 - i * 0.35);
      const sw = Math.sin(ph + 1.6 + i * 0.85) * 4;
      const rr = 47;
      const kx = rx + Math.cos(a) * rr * 0.58, ky = ry + Math.sin(a) * 15 - 17;
      const fx = rx + Math.cos(a) * rr + sw;
      limb2(ctx, [rx + 2, ry + 2], [kx, ky], [fx, -2], 5.4, skin);
    }
    // 手臂 + 垂丝：手位由动作表给（施法时抬起来）
    const bsx = -9, bsy = -72 + cr;
    const bhx = bsx + P.bx, bhy = bsy + P.by;
    const be = elbowFor(bsx, bsy, bhx, bhy, 6);
    limb2(ctx, [bsx, bsy], be, [bhx, bhy], 5.4, skin);
    ball(ctx, bhx, bhy, 3.4, skin, LW - 0.6);
    const fsx = 9, fsy = -72 + cr;
    const fhx = fsx + P.hx, fhy = fsy + P.hy * 0.9 + 18;
    const fe = elbowFor(fsx, fsy, fhx, fhy, 6);
    limb2(ctx, [fsx, fsy], fe, [fhx, fhy], 5.4, skin);
    ball(ctx, fhx, fhy, 3.4, skin, LW - 0.6);
    // 头（先补一段脖子，抬头时不会飘在半空）
    const hx0 = P.hdx, hy = -88 + cr + P.hdy;
    limb(ctx, [0, -74 + cr], [hx0 * 0.6, hy + 8], 9.6, skin);
    ellipse(ctx, hx0, hy, 14, 13.4, skin);
    // 发髻 + 金冠
    ball(ctx, hx0 - 3, hy - 12, 6.4, cloth, LW - 0.6);
    ctx.beginPath();
    ctx.arc(hx0, hy - 2, 13.4, Math.PI * 1.1, Math.PI * 1.9);
    ctx.strokeStyle = OUT; ctx.lineWidth = 8; ctx.stroke();
    ctx.strokeStyle = '#e8c25a'; ctx.lineWidth = 4.4; ctx.stroke();
    ball(ctx, hx0, hy - 15, 2.6, '#e8c25a', 1.6);
    // 六只眼（两排）
    for (let i = -1; i <= 1; i++) {
      ball(ctx, hx0 + i * 6.4, hy - 2, 2.9, '#ff4d6a', 0);
      ball(ctx, hx0 + i * 5.2, hy + 4.6, 1.9, '#ffd479', 0);
    }
    ball(ctx, hx0 - 3.4, hy - 3.4, 1.1, '#fff', 0);
    ball(ctx, hx0 + 3, hy - 3.4, 1.1, '#fff', 0);
    // 嘴：出招时张开吐丝
    if (jw > 0.1) {
      ellipse(ctx, hx0, hy + 9.4, 3.4, 1.2 + jw * 3, '#2b0a1a', 0, 1.4);
      poly(ctx, [[hx0 - 1.6, hy + 8.4], [hx0 + 0.6, hy + 8.4], [hx0 - 0.6, hy + 12.6]], '#fff8e6', 1.1);
    } else {
      ctx.beginPath();
      ctx.arc(hx0, hy + 8.6, 3.4, Math.PI * 0.12, Math.PI * 0.88);
      ctx.strokeStyle = '#2b0a1a'; ctx.lineWidth = 2.2; ctx.stroke();
      poly(ctx, [[hx0 - 1.6, hy + 11], [hx0 + 0.6, hy + 11], [hx0 - 0.6, hy + 16]], '#fff8e6', 1.1);
    }
  }

  // ——— 毒龙：蛇形长身 ———
  function bossDragon(ctx, o, t, e, P) {
    const hurt = e.hitFlash > 0;
    const W = (c) => (hurt ? '#f5f2ea' : c);
    const sc = W(o.sc || '#2f7d6b'), belly = W(o.belly || '#d9e8a8');
    const sway = Math.sin(t / 380) * 3;
    const sway2 = Math.sin(t / 380 + 1.1) * 3.6;
    const jw = P.jaw || 0;
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
    // 头位由动作表给：蓄力时头往后仰，喷吐时整颗头探出去
    const hx = 34 + sway2 + P.hdx * 1.4, hy = -70 + P.hdy * 1.5;
    // 脖 + 头
    limb2(ctx, [2, -52], [16, -58], [hx - 9, hy + 6], 11, sc);
    ellipse(ctx, hx, hy, 15, 12, sc);
    // 长吻
    poly(ctx, [[hx + 4, hy - 4], [hx + 26, hy - 1], [hx + 26, hy + 7], [hx + 6, hy + 9]], sc);
    // 下颌：张嘴时绕吻根张下去
    if (jw > 0.05) {
      ctx.save();
      ctx.translate(hx + 5, hy + 7);
      ctx.rotate(jw * 0.4);
      poly(ctx, [[0, -1], [21, 0.5], [20, 5 + jw * 2], [0, 3.4]], sc, LW - 0.5);
      poly(ctx, [[15, 0], [18, 0], [17, 4.4]], '#fff8e6', 1);
      ctx.restore();
    }
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

  function drawBossByKind(ctx, kind, art, e, t, P) {
    const pose = P || XY.Moves.BOSS_BASE;
    if (kind === 'queen') return bossQueen(ctx, art, t, e, pose);
    if (kind === 'dragon') return bossDragon(ctx, art, t, e, pose);
    if (kind === 'beast') return bossBeast(ctx, art, t, e, pose);
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
    return bossHumanoid(ctx, o, t, e, pose);
  }

  XY.Toon = {
    enabled: true,
    has(charId) { return !!LOOK[charId]; },
    drawCharacter(ctx, cx, footY, scale, charId, pose) {
      const L = LOOK[charId] || LOOK.wukong;
      pose = pose || {};
      // 动作层要知道是谁（同一个 kind 在不同角色上默认动作不同）
      if (pose.charId !== charId) pose = Object.assign({}, pose, { charId: charId });
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
      const MV = XY.Moves;
      if (e.isBoss) {
        const art = e.art || {};
        const sc = ((e.h || 86) / 86) * (art.small ? 0.86 : 1);
        const P = MV && MV.bossPose ? MV.bossPose(e, t) : MV.BOSS_BASE;
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
        // 出招：整体绕胯前倾/后仰，再往前顶出去
        ctx.translate(P.lunge, 0);
        ctx.translate(0, -34); ctx.rotate(P.lean); ctx.translate(0, 34);
        const sq = P.sq || 1;
        if (sq !== 1) ctx.scale(1 / sq, sq);
        drawBossByKind(ctx, art.kind || 'bull', art, e, t, P);
        ctx.restore();
        return true;
      }
      const L = FOE[e.kind];
      if (!L) return false;
      const scaleY = (e.h || 34) / (e.kind === 'wolf' ? 36 : e.kind === 'spider' ? 32 : 34);
      const P = MV && MV.foePose ? MV.foePose(e, t) : MV.FOE_BASE;
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
      // 出招：绕重心转 + 往前顶（蜘蛛腿铺得宽，绕身上转才不像整体翻倒）
      const pivot = e.kind === 'spider' ? -16 : -10;
      ctx.translate(P.lunge, 0);
      ctx.translate(0, pivot); ctx.rotate(P.lean); ctx.translate(0, -pivot);
      if (e.kind === 'wolf') foeWolf(ctx, L, t, e, P);
      else if (e.kind === 'spider') foeSpider(ctx, L, t, e, P);
      else foeImp(ctx, L, t, e, P);
      ctx.restore();
      return true;
    },
  };
})();
