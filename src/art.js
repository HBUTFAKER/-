// 程序化 2D 美术层：角色造型 / 头像 / 技能图标 / 法宝图标 / 材料图标 / 怪物。
// 全部用 Canvas 矢量绘制，零外部资源，保证单文件可玩、可动画。
(function (root) {
  const XY = (root.XY = root.XY || {});
  const Art = (XY.Art = {});

  const OUT = '#231610'; // 统一描边色（造梦西游风的墨线感）

  function rr(ctx, x, y, w, h, r) {
    const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); }
  function shape(ctx, fill, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw !== 0) { ctx.strokeStyle = OUT; ctx.lineWidth = lw || 1.2; ctx.stroke(); }
  }
  function line(ctx, x1, y1, x2, y2, w, color) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke();
  }
  Art.rr = rr; Art.circle = circle;

  // ===== 角色配色（孙悟空按"美猴王"思路：金甲 + 红披风 + 双雉鸡翎）=====
  const ART = {
    wukong: { skin: '#f3cba6', hair: '#7a4a22', armor: '#f4c430', armorDark: '#b8860b', trim: '#ffe27a', cape: '#c0392b', weapon: 'staff', head: 'monkey', feathers: '#f8ecc0', eyes: '#23180f', helmet: true, plume: '#e0432f', mirror: '#ffe9a8' },
    bajie: { skin: '#f0be9a', hair: '#3b2d20', armor: '#9b7653', armorDark: '#6d5138', trim: '#c9a06a', weapon: 'rake', head: 'pig', belly: true, eyes: '#23180f' },
    tangseng: { skin: '#f8e2cc', hair: '#2b2b2b', armor: '#fbfbf8', armorDark: '#d9d2c4', trim: '#e0b020', weapon: 'none', head: 'monk', cape: '#b03a3a', eyes: '#2c2c2c' },
    shaseng: { skin: '#e2b489', hair: '#2f2f2f', armor: '#7f8c8d', armorDark: '#4f5b5c', trim: '#c8d0d1', weapon: 'staff2', head: 'bald', beard: '#2f2f2f', eyes: '#20232a' },
    bailongma: { skin: '#f9efe4', hair: '#cfe8ff', armor: '#aed6f1', armorDark: '#2e86c1', trim: '#eaf6ff', weapon: 'spear', head: 'dragon', cape: '#2e86c1', eyes: '#1f5f8b' },
  };
  Art.ART = ART;

  // ===== 头部（头像 / 角色共用）=====
  // cx,cy 头心，r 半径
  Art.drawFace = function (ctx, cx, cy, r, charId, pose) {
    const A = ART[charId] || ART.wukong;
    const t = (pose && pose.t) || 0;
    const blink = Math.sin(t / 820) > 0.965;
    const mood = (pose && pose.mood) || 'calm';

    // 猴耳 / 猪耳 / 龙角
    if (A.head === 'monkey') {
      for (const sx of [-1, 1]) {
        circle(ctx, cx + sx * r * 0.95, cy - r * 0.02, r * 0.24);
        shape(ctx, A.skin, r * 0.075);
        circle(ctx, cx + sx * r * 0.95, cy - r * 0.02, r * 0.12);
        ctx.fillStyle = 'rgba(180,110,80,0.55)'; ctx.fill();
      }
    } else if (A.head === 'pig') {
      for (const sx of [-1, 1]) {
        ctx.save(); ctx.translate(cx + sx * r * 0.9, cy - r * 0.1); ctx.rotate(sx * 0.5);
        rr(ctx, -r * 0.16, -r * 0.34, r * 0.32, r * 0.66, r * 0.14);
        shape(ctx, A.skin, r * 0.07);
        ctx.restore();
      }
    } else if (A.head === 'dragon') {
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sx * r * 0.45, cy - r * 0.8);
        ctx.quadraticCurveTo(cx + sx * r * 0.95, cy - r * 1.5, cx + sx * r * 0.55, cy - r * 1.85);
        ctx.strokeStyle = A.trim; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round'; ctx.stroke();
      }
    }

    // 脸
    circle(ctx, cx, cy, r); shape(ctx, A.skin, r * 0.085);

    // 猴脸盘
    if (A.head === 'monkey') {
      ctx.beginPath();
      ctx.ellipse ? ctx.ellipse(cx, cy + r * 0.12, r * 0.66, r * 0.54, 0, 0, Math.PI * 2) : ctx.arc(cx, cy + r * 0.1, r * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe6cd'; ctx.fill();
    }

    // 眉
    ctx.strokeStyle = A.eyes; ctx.lineWidth = r * 0.09; ctx.lineCap = 'round';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * r * 0.52, cy - r * 0.22);
      ctx.lineTo(cx + sx * r * 0.2, cy - r * (mood === 'angry' ? 0.3 : 0.18));
      ctx.stroke();
    }
    // 眼
    const eyeY = cy + r * 0.06, eyeDx = r * 0.33;
    if (blink) {
      for (const sx of [-1, 1]) line(ctx, cx + sx * eyeDx - r * 0.12, eyeY, cx + sx * eyeDx + r * 0.12, eyeY, r * 0.07, A.eyes);
    } else {
      for (const sx of [-1, 1]) {
        circle(ctx, cx + sx * eyeDx, eyeY, r * 0.13); ctx.fillStyle = '#fff'; ctx.fill();
        circle(ctx, cx + sx * eyeDx + r * 0.03, eyeY, r * 0.085); ctx.fillStyle = A.eyes; ctx.fill();
      }
    }
    // 鼻 / 嘴
    if (A.head === 'pig') {
      ctx.beginPath();
      ctx.ellipse ? ctx.ellipse(cx, cy + r * 0.4, r * 0.24, r * 0.18, 0, 0, Math.PI * 2) : ctx.arc(cx, cy + r * 0.4, r * 0.2, 0, Math.PI * 2);
      shape(ctx, '#e79c8f', r * 0.06);
      ctx.fillStyle = '#8c4b46';
      for (const sx of [-1, 1]) { circle(ctx, cx + sx * r * 0.09, cy + r * 0.4, r * 0.045); ctx.fill(); }
    } else {
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.18, cy + r * 0.44);
      ctx.quadraticCurveTo(cx, cy + r * 0.58, cx + r * 0.18, cy + r * 0.44);
      ctx.strokeStyle = '#a4644a'; ctx.lineWidth = r * 0.07; ctx.stroke();
    }

    // 络腮胡
    if (A.beard) {
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.72, cy + r * 0.35);
      ctx.quadraticCurveTo(cx, cy + r * 1.35, cx + r * 0.72, cy + r * 0.35);
      ctx.quadraticCurveTo(cx, cy + r * 0.95, cx - r * 0.72, cy + r * 0.35);
      ctx.fillStyle = A.beard; ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
    }

    // 头发 / 头饰
    if (A.head === 'monkey') {
      const wind = Math.min(1, Math.max(0, (pose && pose.wind) || 0));
      const sway = Math.sin(t / 300) * 0.06 + wind * 0.5;

      // 双雉鸡翎（从头盔后侧向上扬起，跑动/出招时向后掠）
      for (const sx of [-1, 1]) {
        const bx = cx + sx * r * 0.3, by = cy - r * 0.95;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(
          cx + sx * r * (1.02 - sway * 0.25) - r * wind * 0.9, cy - r * (2.3 - sway * 0.2),
          cx + sx * r * (1.56 - sway * 0.45) - r * wind * 1.5, cy - r * (1.5 + sway * 0.35)
        );
        ctx.strokeStyle = A.feathers; ctx.lineWidth = r * 0.14; ctx.lineCap = 'round'; ctx.stroke();
        ctx.strokeStyle = 'rgba(184,134,11,0.62)'; ctx.lineWidth = r * 0.045; ctx.stroke();
      }

      // 鬓毛：盔下露出的短毛
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sx * r * 0.96, cy - r * 0.3);
        ctx.quadraticCurveTo(cx + sx * r * 1.18, cy + r * 0.02, cx + sx * r * 0.9, cy + r * 0.3);
        ctx.strokeStyle = A.hair; ctx.lineWidth = r * 0.18; ctx.lineCap = 'round'; ctx.stroke();
      }

      // 紫金盔：盔体
      ctx.beginPath();
      ctx.moveTo(cx - r * 1.0, cy - r * 0.46);
      ctx.quadraticCurveTo(cx - r * 0.9, cy - r * 1.32, cx, cy - r * 1.3);
      ctx.quadraticCurveTo(cx + r * 0.9, cy - r * 1.32, cx + r * 1.0, cy - r * 0.46);
      ctx.closePath();
      shape(ctx, A.armor, r * 0.09);
      // 盔面受光
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.6, cy - r * 0.74);
      ctx.quadraticCurveTo(cx - r * 0.26, cy - r * 1.16, cx + r * 0.24, cy - r * 1.12);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = r * 0.13; ctx.lineCap = 'round'; ctx.stroke();
      // 盔檐（金箍压住额前，保留紧箍的辨识度）
      ctx.beginPath();
      ctx.moveTo(cx - r * 1.04, cy - r * 0.5);
      ctx.quadraticCurveTo(cx, cy - r * 0.16, cx + r * 1.04, cy - r * 0.5);
      ctx.strokeStyle = A.trim; ctx.lineWidth = r * 0.22; ctx.stroke();
      ctx.strokeStyle = '#b8860b'; ctx.lineWidth = r * 0.055; ctx.stroke();
      // 凤翅：贴盔的小翅，不外扩
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sx * r * 0.86, cy - r * 0.66);
        ctx.quadraticCurveTo(cx + sx * r * 1.12, cy - r * 0.98, cx + sx * r * 1.0, cy - r * 1.24);
        ctx.quadraticCurveTo(cx + sx * r * 0.94, cy - r * 0.94, cx + sx * r * 0.78, cy - r * 0.82);
        ctx.closePath();
        shape(ctx, A.armor, r * 0.06);
      }
      // 盔顶金管 + 红缨（盔缨）
      ctx.fillStyle = A.armorDark;
      ctx.fillRect(cx - r * 0.1, cy - r * 1.44, r * 0.2, r * 0.24);
      for (let i = 0; i < 3; i++) {
        const k = i - 1;
        ctx.beginPath();
        ctx.moveTo(cx + k * r * 0.06, cy - r * 1.38);
        ctx.quadraticCurveTo(
          cx - r * 0.3 + k * r * 0.16, cy - r * (2.02 - Math.abs(k) * 0.1),
          cx - r * (1.05 + wind * 0.9) + k * r * 0.2, cy - r * (1.46 - wind * 0.3) + k * r * 0.26
        );
        ctx.strokeStyle = i === 1 ? A.plume : 'rgba(196,54,38,0.92)';
        ctx.lineWidth = r * (0.19 - Math.abs(k) * 0.04);
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      circle(ctx, cx, cy - r * 1.36, r * 0.13); shape(ctx, A.trim, r * 0.05);
    } else if (A.head === 'monk') {
      // 毗卢帽
      ctx.beginPath();
      ctx.moveTo(cx - r * 1.0, cy - r * 0.42);
      ctx.quadraticCurveTo(cx, cy - r * 1.75, cx + r * 1.0, cy - r * 0.42);
      ctx.closePath();
      shape(ctx, '#a83232', r * 0.08);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.9, cy - r * 0.55);
      ctx.lineTo(cx + r * 0.9, cy - r * 0.55);
      ctx.strokeStyle = A.trim; ctx.lineWidth = r * 0.16; ctx.stroke();
      circle(ctx, cx, cy - r * 1.2, r * 0.14); shape(ctx, A.trim, r * 0.05);
    } else if (A.head === 'bald') {
      // 戒疤
      ctx.fillStyle = 'rgba(120,80,60,0.75)';
      for (let i = -1; i <= 1; i++) { circle(ctx, cx + i * r * 0.28, cy - r * 0.72, r * 0.07); ctx.fill(); }
      // 头箍
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.95, cy - r * 0.45);
      ctx.quadraticCurveTo(cx, cy - r * 0.2, cx + r * 0.95, cy - r * 0.45);
      ctx.strokeStyle = A.trim; ctx.lineWidth = r * 0.14; ctx.stroke();
    } else if (A.head === 'dragon') {
      // 龙鬃
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.85, cy - r * 0.35);
      ctx.quadraticCurveTo(cx, cy - r * 1.5, cx + r * 0.85, cy - r * 0.35);
      ctx.quadraticCurveTo(cx, cy - r * 0.9, cx - r * 0.85, cy - r * 0.35);
      ctx.fillStyle = A.hair; ctx.fill();
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sx * r * 0.75, cy - r * 0.15);
        ctx.quadraticCurveTo(cx + sx * r * 1.5, cy - r * 0.5, cx + sx * r * 1.35, cy + r * 0.5);
        ctx.strokeStyle = A.hair; ctx.lineWidth = r * 0.13; ctx.stroke();
      }
    } else if (A.head === 'pig') {
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.95, cy - r * 0.3);
      ctx.quadraticCurveTo(cx, cy - r * 1.15, cx + r * 0.95, cy - r * 0.3);
      ctx.quadraticCurveTo(cx, cy - r * 0.62, cx - r * 0.95, cy - r * 0.3);
      ctx.fillStyle = '#5b4632'; ctx.fill();
    }
  };

  // ===== 角色全身（2D 横版造型 + 跑动/攻击/施法姿态）=====
  // footY: 脚底 y；scale: 1 对应约 1px/单位（角色高约 64 单位）
  Art.drawCharacter = function (ctx, cx, footY, scale, charId, pose) {
    const A = ART[charId] || ART.wukong;
    pose = pose || {};
    const t = pose.t || 0;
    const state = pose.state || 'idle';
    const facing = pose.facing >= 0 ? 1 : -1;
    const run = state === 'run';
    const sprint = !!pose.sprint && run;
    const air = state === 'jump';
    const atk = pose.attackP; // 0..1
    const cast = pose.castP;
    // 风的强度：跑动/冲刺/出招时盔缨与雉翎向后掠
    const windAmt = Math.min(1, (state === 'dash' ? 1 : 0) + (run ? (sprint ? 0.9 : 0.55) : 0)
      + (atk !== undefined ? 0.5 : 0) + (cast !== undefined ? 0.3 : 0));

    const ph = sprint ? t / 58 : t / 85; // 奔跑时步频更密
    const bob = air ? 0 : (run ? Math.abs(Math.sin(ph)) * (sprint ? 2.6 : 1.8) : Math.sin(t / 430) * 1.1);
    const legA = run ? Math.sin(ph) * (sprint ? 0.86 : 0.62) : (air ? 0.35 : 0.06);
    const legB = run ? -Math.sin(ph) * (sprint ? 0.86 : 0.62) : (air ? -0.3 : -0.06);
    const armBase = run ? Math.sin(ph) * (sprint ? 0.58 : 0.4) : 0.08;

    ctx.save();
    ctx.translate(cx, footY);

    // 地面投影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    if (ctx.ellipse) ctx.ellipse(0, 0, 15 * scale, 4 * scale, 0, 0, Math.PI * 2);
    else ctx.arc(0, 0, 10 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.scale(facing * scale, scale);
    // 奔跑时整体前倾（旋转中心在脚底，脚不会离地）
    if (sprint) ctx.rotate(0.085);
    ctx.translate(0, -bob);

    // 出招时的重心变化（同样以脚底为轴）：劈/戳前压，挑先沉后起
    let bodyTilt = 0;
    if (atk !== undefined) {
      const k = pose.attackKind || 0;
      if (k === 0) bodyTilt = -0.05 + easeOut(seg(atk, 0.32, 0.82)) * 0.17;
      else if (k === 1) bodyTilt = -0.02 + easeOut(seg(atk, 0.28, 0.52)) * 0.13;
      else bodyTilt = -0.1 + easeOut(seg(atk, 0.28, 0.68)) * 0.04;
    } else if (state === 'dash') bodyTilt = 0.17;
    else if (pose.castId === 'wk_smash') bodyTilt = -0.08;
    if (bodyTilt) ctx.rotate(bodyTilt);

    // —— 奔跑速度线（身后拖几道细线，强化"更快"的感觉）——
    if (sprint) {
      ctx.strokeStyle = 'rgba(255,247,220,0.28)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const yy = -46 + i * 15;
        const len = 20 + ((t / 3 + i * 17) % 16);
        ctx.beginPath();
        ctx.moveTo(-16 - len * 0.4, yy);
        ctx.lineTo(-16 - len, yy + 1.5);
        ctx.stroke();
      }
    }

    // —— 披风（身后，随风摆动） ——
    if (A.cape) {
      const flap = Math.sin(t / 120) * 4 + (run ? 7 : 0) + (air ? 10 : 0);
      ctx.beginPath();
      ctx.moveTo(-2, -48);
      ctx.quadraticCurveTo(-22 - flap * 0.6, -34, -26 - flap, -2);
      ctx.quadraticCurveTo(-14 - flap * 0.3, -12, -6, -20);
      ctx.closePath();
      ctx.fillStyle = A.cape; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = 1.2; ctx.stroke();
      // 内层高光，避免死板色块
      ctx.beginPath();
      ctx.moveTo(-3, -45);
      ctx.quadraticCurveTo(-16 - flap * 0.4, -32, -19 - flap * 0.7, -8);
      ctx.quadraticCurveTo(-11, -16, -6, -22);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fill();
    }

    // —— 后腿 ——
    drawLeg(ctx, -3.5, legB, A);
    // —— 后臂 ——
    drawArm(ctx, -4.5, -42, armBase + 0.3, A, 15);

    // —— 脖子 ——
    rr(ctx, -3.2, -52, 6.4, 8, 2.6); shape(ctx, A.skin, 1.1);

    // —— 身体 ——
    ctx.save();
    // 腰/裙甲
    ctx.fillStyle = A.armorDark;
    rr(ctx, -9.5, -27, 19, 12, 5); shape(ctx, A.armorDark, 1.3);
    // 胸甲
    rr(ctx, -10.5, -47, 21, 22, 7); shape(ctx, A.armor, 1.5);
    // 胸口纹样
    ctx.beginPath();
    ctx.moveTo(-5, -42); ctx.quadraticCurveTo(0, -36, 5, -42);
    ctx.strokeStyle = A.trim; ctx.lineWidth = 2; ctx.stroke();
    if (A.helmet) {
      // 护心镜：金甲正中的圆镜，一并压出"重甲"感
      circle(ctx, 0, -39, 5.4); shape(ctx, A.mirror, 1.4);
      circle(ctx, 0, -39, 2.6); ctx.fillStyle = 'rgba(184,134,11,0.5)'; ctx.fill();
      circle(ctx, -1.3, -40.4, 1.5); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
      // 披膊：肩下两层甲片
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * 4.6, -46);
        ctx.lineTo(sx * 10.6, -44);
        ctx.lineTo(sx * 9.6, -34);
        ctx.lineTo(sx * 5.2, -36);
        ctx.closePath();
        shape(ctx, A.armorDark, 1.1);
      }
    }
    if (A.belly) { // 八戒的肚子
      ctx.beginPath();
      if (ctx.ellipse) ctx.ellipse(6, -28, 7, 6, 0, 0, Math.PI * 2);
      else ctx.arc(6, -28, 6, 0, Math.PI * 2);
      shape(ctx, '#e6c6a4', 1.2);
    }
    // 腰带
    rr(ctx, -9.5, -27.5, 19, 4, 2); shape(ctx, A.trim, 1);
    // 缠颈红巾
    if (A.cape) {
      rr(ctx, -6.4, -50.5, 12.8, 5, 2.4); shape(ctx, A.cape, 1.2);
      ctx.beginPath();
      ctx.moveTo(4, -47); ctx.lineTo(9, -44); ctx.lineTo(6, -40);
      ctx.closePath(); shape(ctx, A.cape, 1);
    }
    ctx.restore();

    // —— 前腿 ——
    drawLeg(ctx, 4, legA, A);

    // —— 战裙（三片甲，压在腿上）——
    if (A.helmet) {
      for (let i = -1; i <= 1; i++) {
        const bx = i * 5.9;
        ctx.beginPath();
        ctx.moveTo(bx - 3, -24.6);
        ctx.lineTo(bx + 3, -24.6);
        ctx.lineTo(bx + 3.8, -15.2);
        ctx.lineTo(bx - 3.8, -15.2);
        ctx.closePath();
        shape(ctx, i === 0 ? A.armor : A.armorDark, 1.1);
        // 甲片下缘金边
        line(ctx, bx - 3.4, -16.2, bx + 3.4, -16.2, 1.2, A.trim);
      }
    }

    // —— 头 ——
    Art.drawFace(ctx, 1, -56, 10, charId, { t: t, mood: state === 'attack' ? 'angry' : 'calm', wind: windAmt });

    // —— 前臂 + 武器 ——
    // 手臂与兵器分开驱动：arm 控手臂，wpn 是兵器的绝对角 → 兵器始终握在手里、不穿身。
    const SHX = 6, SHY = -41, ARM = 14;   // 肩点、手臂长度（角色坐标）
    let armAng, wpnAng, offX = 0, offY = 0, wpnShift = 0;
    if (atk !== undefined) {
      const sp = swingProfile(pose.attackKind || 0, atk);
      armAng = sp.arm; wpnAng = sp.wpn; offX = sp.x; offY = sp.y; wpnShift = sp.g || 0;
    } else if (pose.castId === 'wk_smash') {
      const q = cast === undefined ? 0 : cast;
      armAng = -2.0 + q * 0.2; wpnAng = -0.5 + q * 0.14;      // 举棒过顶，蓄力
    } else if (pose.castId === 'wk_spin') {
      armAng = -0.95 + (cast === undefined ? 0 : cast) * 0.9; // 抖腕掷出
      wpnAng = 0.55;
    } else if (state === 'dash') {
      armAng = 1.0; wpnAng = -0.46;                            // 棒背身后
    } else if (cast !== undefined) {
      armAng = -0.62; wpnAng = -0.5;                           // 其余施法：抬臂
    } else {
      // 站立：棒子略微前倾、握在身侧，别挡住脸
      armAng = armBase * 0.5 - 0.34; wpnAng = 0.14 + armBase * 0.12;
    }

    // 兵器残影：沿同一条挥动曲线回退几帧 → 棒影连成一片，动作与兵器是一体的
    if (atk !== undefined) {
      for (let g = 8; g >= 1; g--) {
        const gp = atk - g * 0.032;
        if (gp < 0) break;
        const sp = swingProfile(pose.attackKind || 0, gp);
        const ghx = SHX - Math.sin(sp.arm) * ARM + sp.x;
        const ghy = SHY + Math.cos(sp.arm) * ARM + sp.y;
        ctx.save();
        ctx.translate(ghx + 1.2, ghy);
        ctx.rotate(sp.wpn);
        ctx.translate(0, sp.g || 0);
        ctx.globalAlpha = 0.05 + 0.012 * (8 - g);
        drawWeapon(ctx, A);
        ctx.restore();
      }
    }

    // 握点：肩点 + 手臂旋转（+ 招式带来的前送/下沉）。兵器在角色坐标系里按绝对角摆放，
    // 所以无论手臂怎么甩，棒子始终落在手里。
    const handX = SHX - Math.sin(armAng) * ARM + offX;
    const handY = SHY + Math.cos(armAng) * ARM + offY;
    ctx.save();
    ctx.translate(SHX, SHY);
    ctx.rotate(armAng);
    drawArm(ctx, 0, 0, 0, A, ARM);
    ctx.restore();
    if (!pose.noWeapon) {
      ctx.save();
      ctx.translate(handX + 1.2, handY);
      ctx.rotate(wpnAng);
      if (wpnShift) ctx.translate(0, wpnShift);
      drawWeapon(ctx, A);
      ctx.restore();
      // 手（画在兵器之后，形成"握住"的遮挡关系）
      circle(ctx, handX + 1.2, handY, 3.6); shape(ctx, A.skin, 1.1);
      circle(ctx, handX + 1.2, handY, 1.6); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill();
    }

    // —— 护肩（贴在前臂根部，做出重甲感）——
    ctx.beginPath();
    if (ctx.ellipse) ctx.ellipse(7.2, -45.2, 5.6, 4.2, -0.3, 0, Math.PI * 2);
    else ctx.arc(7.2, -45.2, 4.8, 0, Math.PI * 2);
    shape(ctx, A.armorDark, 1.3);
    ctx.beginPath();
    if (ctx.ellipse) ctx.ellipse(7.4, -46.2, 3.4, 1.8, -0.3, 0, Math.PI * 2);
    else ctx.arc(7.4, -46.2, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fill();

    ctx.restore();
  };

  function drawLeg(ctx, hx, ang, A) {
    ctx.save();
    ctx.translate(hx, -23);
    ctx.rotate(ang);
    rr(ctx, -4.2, 0, 8.4, 19, 4); shape(ctx, A.armorDark, 1.3);
    // 靴
    rr(ctx, -4.8, 15, 10, 6.5, 2.5); shape(ctx, '#3a2a1c', 1.2);
    ctx.restore();
  }
  function drawArm(ctx, sx, sy, ang, A, len) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang);
    rr(ctx, -3.2, 0, 6.4, len, 3.2); shape(ctx, A.armor, 1.2);
    if (A.helmet) { // 护腕（金箍环）
      rr(ctx, -3.7, len * 0.4, 7.4, 5.4, 2.2); shape(ctx, A.armorDark, 1);
      line(ctx, -3.1, len * 0.43, 3.1, len * 0.43, 1, A.trim);
    }
    circle(ctx, 0, len, 3.2); shape(ctx, A.skin, 1.1);
    ctx.restore();
  }

  // —— 三段普攻的兵器轨迹 ——
  // 返回：手臂角 arm、兵器绝对角 wpn、握点偏移 x/y。p 为动作进度 0..1。
  function seg(p, a, b) { return Math.min(1, Math.max(0, (p - a) / (b - a))); }
  function easeOut(p) { return 1 - (1 - p) * (1 - p); }
  function swingProfile(kind, p) {
    if (kind === 1) {              // 戳：收棒蓄力 → 直刺 → 回收
      const back = easeOut(seg(p, 0, 0.3));
      const out = easeOut(seg(p, 0.3, 0.54));
      const ret = seg(p, 0.66, 1);
      return {
        arm: 0.12 + back * 0.62 - out * 0.66 - ret * 0.08,
        wpn: -0.16 + back * 1.5 + out * 0.04 - ret * 1.4,
        x: -back * 8 + out * 26 - ret * 18,
        y: -7 - back * 3,
        g: 11,                     // 握点前移：棒尾不穿身，刺出去的是前半截
      };
    }
    if (kind === 2) {              // 挑：棒梢沉到身前 → 一路撩起
      const low = easeOut(seg(p, 0, 0.3));
      const up = easeOut(seg(p, 0.3, 0.68));
      const ret = seg(p, 0.68, 1);
      return {
        arm: -0.08 + low * 0.72 - up * 1.5 + ret * 0.12,
        wpn: -0.12 + low * 2.55 - up * 2.15 + ret * 0.3,
        x: -low * 2 + up * 4,
        y: low * 3 - up * 6 + ret * 2,
      };
    }
    // 劈：举棒过顶 → 砸向前下（第三段之外，普攻首段也是这个）
    const rai = easeOut(seg(p, 0, 0.34));
    const down = easeOut(seg(p, 0.34, 0.8));
    const ret = seg(p, 0.8, 1);
    return {
      arm: -0.3 - rai * 0.92 + down * 1.5 - ret * 0.18,
      wpn: -0.18 - rai * 0.95 + down * 3.28 - ret * 0.28,
      x: down * 4,
      y: -rai * 2 + down * 3,
      g: -down * 6,               // 劈到末端时握把往后收，棒身更多压向前方
    };
  }
  Art.swingProfile = swingProfile;
  function drawWeapon(ctx, A) {
    switch (A.weapon) {
      case 'staff': { // 金箍棒（红杆金箍）
        rr(ctx, -2.3, -46, 4.6, 66, 2.2); shape(ctx, '#c0392b', 1.5);
        rr(ctx, -3.2, -51, 6.4, 9, 2.4); shape(ctx, '#f4c430', 1.2);
        rr(ctx, -3.2, 13, 6.4, 9, 2.4); shape(ctx, '#f4c430', 1.2);
        line(ctx, -1.1, -40, -1.1, 12, 1.2, 'rgba(255,255,255,0.35)');
        break;
      }
      case 'rake': { // 九齿钉耙
        rr(ctx, -2, -34, 4, 50, 2); shape(ctx, '#6d5138', 1.3);
        rr(ctx, -9, -41, 18, 7, 3); shape(ctx, '#b9c0c6', 1.3);
        for (let i = -1; i <= 1; i++) { rr(ctx, i * 6 - 1.2, -35, 2.4, 7, 1); shape(ctx, '#d7dde2', 0.8); }
        break;
      }
      case 'staff2': { // 降妖宝杖
        rr(ctx, -2, -44, 4, 62, 2); shape(ctx, '#8c7a5c', 1.3);
        circle(ctx, 0, -44, 4.4); shape(ctx, '#c8d0d1', 1.2);
        circle(ctx, 0, 16, 3.6); shape(ctx, '#c8d0d1', 1.1);
        break;
      }
      case 'spear': { // 龙枪
        rr(ctx, -1.8, -36, 3.6, 50, 2); shape(ctx, '#2e86c1', 1.2);
        ctx.beginPath();
        ctx.moveTo(0, -54); ctx.lineTo(5, -36); ctx.lineTo(0, -30); ctx.lineTo(-5, -36);
        ctx.closePath(); shape(ctx, '#eaf6ff', 1.2);
        break;
      }
      default: break;
    }
  }

  // 掷出去的金箍棒：空中急旋 / 插进大地（供 UI 层绘制）
  Art.drawSpinStaff = function (ctx, s, now) {
    const fade = (typeof s.fade === 'number' && isFinite(s.fade)) ? Math.max(0, Math.min(1, s.fade)) : 1;
    if (fade <= 0.01) return;
    ctx.save();
    ctx.translate(s.x, s.y);
    if (s.state === 'stuck') {
      const age = Math.max(0, (now - (s.landAt || now)) / 1000);
      const a = fade * (age > 0.8 ? Math.max(0, 1 - (age - 0.8) / 0.3) : 1);
      if (a <= 0.01) { ctx.restore(); return; }
      // 砸出来的坑 + 几块碎石（不做放射状裂纹，免得读成"钟面"）
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.beginPath();
      if (ctx.ellipse) ctx.ellipse(0, 1, 36, 9, 0, 0, Math.PI * 2);
      else ctx.arc(0, 1, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(150,112,72,0.95)';
      for (let i = 0; i < 4; i++) {
        const rx = (i % 2 ? 1 : -1) * (22 + i * 7);
        ctx.fillRect(rx, -4 - (i % 3) * 3, 6, 4);
      }
      ctx.rotate(-0.06 + Math.sin(age * 26) * 0.035 * Math.max(0, 1 - age * 1.6));
      ctx.globalAlpha = a;
      ctx.scale(1.9, 1.9);
      drawWeapon(ctx, ART.wukong);
      ctx.restore();
      return;
    }
    // 飞行：棒身自旋 + 两道旋转金弧
    ctx.globalAlpha = fade;
    ctx.save();
    ctx.rotate(-s.spin * 0.45);
    ctx.strokeStyle = 'rgba(255,246,214,0.3)';
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(0, 0, 42, 0.5, 2.2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,120,0.55)';
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(0, 0, 42, 0.35, 2.5); ctx.stroke();
    ctx.restore();
    ctx.rotate(s.spin);
    ctx.scale(1.75, 1.75);
    drawWeapon(ctx, ART.wukong);
    ctx.restore();
  };

  // ===== 怪物 =====
  // scale：按碰撞盒高度自动缩放（Boss 的碰撞盒比小怪大得多）
  Art.drawEnemy = function (ctx, e, t, scale) {
    const flash = e.hitFlash > 0;
    const k = scale || 1;
    // 出手前冲：让"打人"有动作，而不是站着贴图
    const atkLeft = (e.atkUntil || 0) - t;
    const lunge = atkLeft > 0 ? Math.sin(Math.min(1, atkLeft / 260) * Math.PI) * 7 : 0;
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h);
    const sx = (e.facing || -1) < 0 ? -1 : 1;
    ctx.scale(sx * k, k);
    ctx.translate(lunge, 0);
    const body = flash ? '#ffffff' : null;

    if (e.kind === 'wolf') {
      // 妖狼：靠剪影认人——弓背、长吻、大尖耳、粗尾、四条粗腿
      const fur = body || '#7a5432', dark = body || '#462d17';
      const g = Math.sin(t / 95) * 2.6;
      // 尾巴：向后扬起
      ctx.beginPath();
      ctx.moveTo(-18, -23);
      ctx.quadraticCurveTo(-31, -27, -28, -36);
      ctx.strokeStyle = dark; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
      // 远侧两腿（暗一档，垫在后面）
      line(ctx, -11, -14, -8 + g, -1, 3.2, dark);
      line(ctx, 9, -14, 12 - g, -1, 3.2, dark);
      // 近侧两腿：后腿带弯，前腿直撑
      line(ctx, -14, -15, -15 - g, -7, 4.2, fur);
      line(ctx, -15 - g, -7, -12 - g * 0.5, -1, 3.8, fur);
      line(ctx, 8, -15, 10 + g, -1, 4.2, fur);
      // 身体：背线拱起，前胸高后腰低
      ctx.beginPath();
      ctx.moveTo(-20, -14);
      ctx.quadraticCurveTo(-23, -29, -8, -30);
      ctx.quadraticCurveTo(6, -31, 12, -24);
      ctx.quadraticCurveTo(15, -16, 6, -13);
      ctx.quadraticCurveTo(-8, -11, -20, -14);
      ctx.closePath();
      shape(ctx, fur, 1.5);
      // 头：大，长吻前探
      ctx.beginPath();
      ctx.moveTo(5, -27);
      ctx.quadraticCurveTo(16, -34, 25, -28);
      ctx.quadraticCurveTo(29, -23.5, 24.5, -19.5);
      ctx.lineTo(8, -19);
      ctx.closePath();
      shape(ctx, fur, 1.5);
      // 大尖耳（最醒目的狼特征）
      ctx.beginPath(); ctx.moveTo(8.5, -28); ctx.lineTo(6, -38); ctx.lineTo(15.5, -30.5); ctx.closePath(); shape(ctx, dark, 1);
      ctx.beginPath(); ctx.moveTo(17, -31); ctx.lineTo(20, -39); ctx.lineTo(23.5, -30); ctx.closePath(); shape(ctx, dark, 1);
      // 獠牙
      ctx.beginPath(); ctx.moveTo(22.5, -22); ctx.lineTo(23.5, -17.5); ctx.lineTo(20.5, -21); ctx.closePath(); shape(ctx, '#f2e8d5', 0.6);
      // 红瞳
      circle(ctx, 19, -26.5, 2.2); ctx.fillStyle = '#ff4d4d'; ctx.fill();
      circle(ctx, 19.7, -27.1, 0.85); ctx.fillStyle = '#fff2c0'; ctx.fill();
    } else if (e.kind === 'spider') {
      // 毒蛛：大圆身 + 小头，八条腿从身下向外撑开、脚齐地面
      const skin = body || '#5a2b6b', dark = body || '#3a1746', leg = body || '#6a2f80';
      const bcx = -3, bcy = -15, br = 10.5;
      // 腹部
      circle(ctx, bcx, bcy, br); shape(ctx, skin, 1.5);
      // 背脊亮线
      ctx.beginPath();
      ctx.moveTo(bcx - 6.5, bcy - 7.5);
      ctx.quadraticCurveTo(bcx, bcy - 11.5, bcx + 6.5, bcy - 6.5);
      ctx.strokeStyle = body || '#8e44ad'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.stroke();
      // 八条腿：越靠外的腿撑得越开，带轻微爬行相位
      for (let i = 0; i < 8; i++) {
        const left = i < 4, k = i % 4;
        const sgn = left ? -1 : 1;
        const fx = bcx + sgn * (9.5 + k * 4.3);
        const ph = Math.sin(t / 90 + i * 0.7) * 1.1;
        const rx0 = bcx + sgn * (1.4 + k * 2.1);
        const ry0 = -12.5 + k * 1.1;
        ctx.beginPath();
        ctx.moveTo(rx0, ry0);
        ctx.quadraticCurveTo((rx0 + fx) * 0.5, -15 + ph, fx, -0.8 + ph * 0.4);
        ctx.strokeStyle = leg; ctx.lineWidth = 2.2;
        ctx.lineCap = 'round'; ctx.stroke();
      }
      // 头胸部
      circle(ctx, 10, -16.5, 6.2); shape(ctx, skin, 1.4);
      // 螯肢
      ctx.beginPath(); ctx.moveTo(13.5, -13); ctx.lineTo(18, -8.5); ctx.lineTo(12, -11); ctx.closePath(); shape(ctx, dark, 0.8);
      // 眼：两颗大的在前
      circle(ctx, 12.4, -19.6, 1.9); ctx.fillStyle = '#ff6b6b'; ctx.fill();
      circle(ctx, 15, -16.8, 1.5); ctx.fillStyle = '#ff6b6b'; ctx.fill();
      circle(ctx, 8.6, -20.4, 1.1); ctx.fillStyle = '#ff9b9b'; ctx.fill();
    } else if (e.kind === 'boss') {
      // 牛魔王
      ctx.fillStyle = body || '#8e2b2b';
      rr(ctx, -22, -76, 44, 62, 12); shape(ctx, body || '#8e2b2b', 1.8);
      // 牛角
      ctx.strokeStyle = body || '#e8dcc8'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 14, -74);
        ctx.quadraticCurveTo(s * 34, -86, s * 30, -66);
        ctx.stroke();
      }
      // 眼睛
      for (const s of [-1, 1]) { circle(ctx, s * 9, -58, 3.4); ctx.fillStyle = '#ffd479'; ctx.fill(); }
      // 鼻环
      ctx.strokeStyle = '#ffd479'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -44, 6, 0, Math.PI); ctx.stroke();
      // 斧
      ctx.save(); ctx.translate(26, -50); ctx.rotate(Math.sin(t / 400) * 0.1);
      rr(ctx, -2, -26, 4, 50, 2); shape(ctx, '#5b4a32', 1.2);
      ctx.beginPath();
      ctx.moveTo(0, -30); ctx.quadraticCurveTo(18, -24, 14, -6); ctx.lineTo(0, -10);
      ctx.closePath(); shape(ctx, '#c9cfd6', 1.4);
      ctx.restore();
    } else { // imp 小妖：短腿 + 圆身 + 角 + 獠牙，比纯色块好辨认
      const dark = body || '#8e2f26';
      // 腿
      line(ctx, -6, -8, -8, 0, 3.2, dark);
      line(ctx, 6, -8, 8, 0, 3.2, dark);
      // 手臂
      line(ctx, -11, -18, -17, -10, 3, dark);
      line(ctx, 11, -18, 17, -10, 3, dark);
      // 身子
      ctx.beginPath();
      if (ctx.ellipse) ctx.ellipse(0, -18, 13, 14, 0, 0, Math.PI * 2);
      else ctx.arc(0, -18, 13, 0, Math.PI * 2);
      shape(ctx, body || '#b5483b', 1.5);
      // 肚皮
      ctx.beginPath();
      if (ctx.ellipse) ctx.ellipse(1, -15, 7, 8, 0, 0, Math.PI * 2);
      else ctx.arc(1, -15, 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,220,190,0.35)'; ctx.fill();
      // 角
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 6, -29); ctx.quadraticCurveTo(s * 11, -37, s * 4, -39);
        ctx.lineTo(s * 2.5, -30); ctx.closePath();
        shape(ctx, body || '#f0e0c0', 1.2);
      }
      // 眼
      for (const s of [-1, 1]) { circle(ctx, s * 4.5, -21, 2.4); ctx.fillStyle = '#2b1210'; ctx.fill(); }
      // 獠牙
      ctx.fillStyle = '#fff8e6';
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * 3, -14); ctx.lineTo(s * 5, -11); ctx.lineTo(s * 1.5, -12); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  };

  // ===== 技能图标 =====
  // kind: melee/dash/aoe/ranged/heal/buff，按类型给不同图形
  Art.drawSkillIcon = function (ctx, x, y, size, skill, cdPct, ready) {
    const col = skillColor(skill);
    ctx.save();
    // 底
    rr(ctx, x, y, size, size, size * 0.2);
    ctx.fillStyle = '#141a26'; ctx.fill();
    ctx.strokeStyle = ready ? col : '#3a4a66'; ctx.lineWidth = 2; ctx.stroke();
    // 图形
    const cx = x + size / 2, cy = y + size / 2, r = size * 0.3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(2, size * 0.07); ctx.lineCap = 'round';
    const sid = skill.id || '';
    if (sid === 'wk_smash') {
      // 暴涨的金箍棒 + 砸地冲击
      rr(ctx, -r * 0.34, -r * 1.15, r * 0.68, r * 1.6, r * 0.14); ctx.fillStyle = col; ctx.fill();
      rr(ctx, -r * 0.62, -r * 1.42, r * 1.24, r * 0.42, r * 0.12); ctx.fillStyle = '#ffe27a'; ctx.fill();
      rr(ctx, -r * 0.62, r * 0.42, r * 1.24, r * 0.42, r * 0.12); ctx.fillStyle = '#ffe27a'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,246,214,0.9)'; ctx.lineWidth = Math.max(1.6, size * 0.055);
      ctx.beginPath();
      if (ctx.arc) ctx.arc(0, r * 1.02, r * 0.78, Math.PI * 0.22, Math.PI * 0.78);
      ctx.stroke();
    } else if (sid === 'wk_dash') {
      // 祥云 + 速度线
      const u = size / 60;
      const puffs = [[-11, 3, 7], [0, -3, 9.5], [10, 3, 6.5]];
      ctx.fillStyle = 'rgba(255,247,226,0.95)';
      for (let i = 0; i < puffs.length; i++) {
        circle(ctx, puffs[i][0] * u, puffs[i][1] * u, puffs[i][2] * u); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,206,128,0.9)'; ctx.lineWidth = Math.max(1.4, size * 0.05);
      ctx.beginPath();
      if (ctx.arc) ctx.arc(0, -3 * u, 9 * u, Math.PI * 1.06, Math.PI * 1.94);
      ctx.stroke();
      // 前冲箭头
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, size * 0.075);
      ctx.beginPath();
      ctx.moveTo(-r * 1.15, r * 0.95); ctx.lineTo(r * 0.95, r * 0.95);
      ctx.moveTo(r * 0.45, r * 0.6); ctx.lineTo(r * 0.95, r * 0.95); ctx.lineTo(r * 0.45, r * 1.3);
      ctx.stroke();
    } else if (sid === 'wk_spin') {
      // 斜插的棒子 + 旋转轨迹
      ctx.save();
      ctx.rotate(-0.62);
      rr(ctx, -r * 0.2, -r * 1.12, r * 0.4, r * 1.9, r * 0.1); ctx.fillStyle = col; ctx.fill();
      rr(ctx, -r * 0.38, -r * 1.3, r * 0.76, r * 0.34, r * 0.1); ctx.fillStyle = '#ffe27a'; ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,246,214,0.85)'; ctx.lineWidth = Math.max(1.6, size * 0.05);
      ctx.beginPath();
      if (ctx.arc) ctx.arc(0, 0, r * 0.95, -2.5, 1.3);
      ctx.stroke();
      // 轨迹箭头
      ctx.beginPath();
      ctx.moveTo(r * 0.62, -r * 0.78); ctx.lineTo(r * 1.2, -r * 0.42); ctx.lineTo(r * 0.56, -r * 0.3);
      ctx.fill();
    } else switch (skill.kind) {
      case 'melee': // 交叉刀光
        ctx.beginPath(); ctx.arc(0, 0, r, -1.2, 1.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r * 0.8, r * 0.9); ctx.lineTo(r * 0.8, -r * 0.9); ctx.stroke();
        break;
      case 'dash': { // 前冲箭头
        ctx.beginPath();
        ctx.moveTo(-r, -r * 0.7); ctx.lineTo(r * 0.2, 0); ctx.lineTo(-r, r * 0.7);
        ctx.stroke();
        ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.7); ctx.lineTo(r * 1.05, 0); ctx.lineTo(-r * 0.1, r * 0.7); ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case 'aoe': // 爆裂环
        ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          line(ctx, Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05, Math.max(1.5, size * 0.05), col);
        }
        break;
      case 'ranged': // 飞弹
        ctx.beginPath(); ctx.arc(r * 0.25, 0, r * 0.42, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.5;
        line(ctx, -r, 0, -r * 0.35, 0, Math.max(2, size * 0.08), col);
        ctx.globalAlpha = 1;
        break;
      case 'heal': // 十字
        rr(ctx, -r * 0.24, -r * 0.8, r * 0.48, r * 1.6, r * 0.14); ctx.fill();
        rr(ctx, -r * 0.8, -r * 0.24, r * 1.6, r * 0.48, r * 0.14); ctx.fill();
        break;
      case 'buff': // 上升箭头
        ctx.beginPath();
        ctx.moveTo(0, -r); ctx.lineTo(r * 0.8, 0); ctx.lineTo(r * 0.32, 0);
        ctx.lineTo(r * 0.32, r); ctx.lineTo(-r * 0.32, r); ctx.lineTo(-r * 0.32, 0);
        ctx.lineTo(-r * 0.8, 0); ctx.closePath(); ctx.fill();
        break;
      default:
        circle(ctx, 0, 0, r); ctx.stroke();
    }
    ctx.restore();
    // 冷却遮罩（自上而下）
    if (cdPct > 0) {
      ctx.save();
      rr(ctx, x, y, size, size, size * 0.2); ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(x, y, size, size * cdPct);
      ctx.restore();
    }
    ctx.restore();
  };
  function skillColor(skill) {
    switch (skill.kind) {
      case 'melee': return '#ffb35c';
      case 'dash': return '#7fd0ff';
      case 'aoe': return '#ff7b7b';
      case 'ranged': return '#c39bff';
      case 'heal': return '#7CFC9B';
      case 'buff': return '#ffd479';
      default: return '#cfe0f5';
    }
  }

  // ===== 法宝图标（12 件各不同）=====
  Art.drawTreasureIcon = function (ctx, x, y, size, tr, cdPct, owned) {
    const cx = x + size / 2, cy = y + size / 2, r = size * 0.31;
    ctx.save();
    rr(ctx, x, y, size, size, size * 0.2);
    ctx.fillStyle = '#1c1526'; ctx.fill();
    ctx.strokeStyle = owned ? '#d6b3ff' : '#3d3450'; ctx.lineWidth = 2; ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = owned ? 1 : 0.42;
    const GOLD = '#f4c430', JADE = '#8fe3c0', RED = '#e0675a', BLUE = '#8bc8ff', PURPLE = '#c39bff';
    const pen = (col, w) => { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.6, w || size * 0.06); ctx.lineCap = 'round'; };

    switch (tr.id) {
      case 'tr_wuxing': { // 五行珠：五色小珠绕圈
        const cols = ['#f4c430', '#7CFC9B', '#8bc8ff', '#e0675a', '#c39bff'];
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          circle(ctx, Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.26);
          shape(ctx, cols[i], 1.2);
        }
        circle(ctx, 0, 0, r * 0.26); shape(ctx, '#fff8dc', 1.2);
        break;
      }
      case 'tr_kunxian': { // 捆仙绳：盘起来的绳圈 + 甩出的绳尾
        pen(RED, size * 0.072);
        for (let i = 0; i < 3; i++) {
          const k = 0.82 - i * 0.22;
          ctx.beginPath();
          if (ctx.ellipse) ctx.ellipse(0, r * 0.12, r * k, r * k * 0.66, 0.2, 0, Math.PI * 2);
          else ctx.arc(0, r * 0.1, r * k * 0.8, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(r * 0.5, r * 0.28);
        ctx.quadraticCurveTo(r * 1.15, -r * 0.15, r * 0.95, -r * 0.85);
        ctx.stroke();
        circle(ctx, r * 0.95, -r * 0.88, r * 0.12); shape(ctx, RED, 1);
        break;
      }
      case 'tr_bajiao': { // 芭蕉扇
        ctx.beginPath();
        ctx.moveTo(0, r * 0.95);
        ctx.quadraticCurveTo(r * 1.25, r * 0.1, r * 0.35, -r * 0.95);
        ctx.lineTo(-r * 0.35, -r * 0.95);
        ctx.quadraticCurveTo(-r * 1.25, r * 0.1, 0, r * 0.95);
        shape(ctx, JADE, 1.4);
        pen('#2f7d5e', 1.4);
        for (let i = -2; i <= 2; i++) { line(ctx, 0, r * 0.9, i * r * 0.3, -r * 0.85, 1.2, '#2f7d5e'); }
        line(ctx, 0, r * 0.95, 0, r * 1.3, size * 0.06, '#8c6b3f');
        break;
      }
      case 'tr_zijin': { // 紫金铃
        ctx.beginPath();
        ctx.moveTo(-r * 0.7, r * 0.45);
        ctx.quadraticCurveTo(-r * 0.7, -r * 0.85, 0, -r * 0.85);
        ctx.quadraticCurveTo(r * 0.7, -r * 0.85, r * 0.7, r * 0.45);
        ctx.closePath(); shape(ctx, PURPLE, 1.4);
        rr(ctx, -r * 0.85, r * 0.4, r * 1.7, r * 0.24, r * 0.1); shape(ctx, GOLD, 1.2);
        circle(ctx, 0, r * 0.8, r * 0.16); shape(ctx, GOLD, 1);
        break;
      }
      case 'tr_qixing': { // 七星剑
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.05); ctx.lineTo(r * 0.22, -r * 0.55);
        ctx.lineTo(r * 0.22, r * 0.35); ctx.lineTo(-r * 0.22, r * 0.35);
        ctx.lineTo(-r * 0.22, -r * 0.55); ctx.closePath();
        shape(ctx, '#dbe7f5', 1.3);
        rr(ctx, -r * 0.75, r * 0.32, r * 1.5, r * 0.16, r * 0.06); shape(ctx, GOLD, 1);
        rr(ctx, -r * 0.1, r * 0.46, r * 0.2, r * 0.5, r * 0.08); shape(ctx, '#8c6b3f', 1);
        ctx.fillStyle = '#ffe27a';
        for (let i = 0; i < 3; i++) { circle(ctx, 0, -r * 0.7 + i * r * 0.32, r * 0.07); ctx.fill(); }
        break;
      }
      case 'tr_yujing': { // 玉净瓶
        ctx.beginPath();
        ctx.moveTo(-r * 0.28, -r * 0.9); ctx.lineTo(r * 0.28, -r * 0.9);
        ctx.lineTo(r * 0.28, -r * 0.4);
        ctx.quadraticCurveTo(r * 0.85, r * 0.1, r * 0.55, r * 0.9);
        ctx.lineTo(-r * 0.55, r * 0.9);
        ctx.quadraticCurveTo(-r * 0.85, r * 0.1, -r * 0.28, -r * 0.4);
        ctx.closePath(); shape(ctx, '#eaf6ff', 1.4);
        pen(JADE, 1.3);
        line(ctx, -r * 0.18, -r * 0.95, -r * 0.5, -r * 1.3, 1.6, JADE);
        break;
      }
      case 'tr_fenghuo': { // 风火轮
        circle(ctx, 0, 0, r * 0.85); shape(ctx, 'rgba(224,103,90,0.85)', 1.4);
        pen(GOLD, 1.4);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          line(ctx, 0, 0, Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, 1.6, GOLD);
        }
        circle(ctx, 0, 0, r * 0.22); shape(ctx, GOLD, 1);
        break;
      }
      case 'tr_hulu': { // 红葫芦
        circle(ctx, 0, r * 0.35, r * 0.55); shape(ctx, RED, 1.4);
        circle(ctx, 0, -r * 0.35, r * 0.36); shape(ctx, RED, 1.4);
        rr(ctx, -r * 0.16, -r * 0.95, r * 0.32, r * 0.3, r * 0.08); shape(ctx, GOLD, 1);
        break;
      }
      case 'tr_huntian': { // 混天绫：飘带
        pen('#ff8fb1', size * 0.09);
        ctx.beginPath();
        ctx.moveTo(-r, -r * 0.5);
        ctx.quadraticCurveTo(-r * 0.2, -r * 1.1, r * 0.4, -r * 0.2);
        ctx.quadraticCurveTo(r * 0.9, r * 0.5, -r * 0.2, r * 0.55);
        ctx.quadraticCurveTo(-r * 0.8, r * 0.6, -r * 0.9, r * 1.0);
        ctx.stroke();
        break;
      }
      case 'tr_qiankun': { // 乾坤圈
        pen(GOLD, size * 0.09);
        ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2); ctx.stroke();
        pen('#b8860b', 1.2);
        ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case 'tr_jingang': { // 金刚琢
        pen('#dfe6ee', size * 0.1);
        ctx.beginPath(); ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2); ctx.stroke();
        circle(ctx, 0, -r * 0.75, r * 0.22); shape(ctx, BLUE, 1.2);
        break;
      }
      case 'tr_dingfeng': { // 定风丹
        circle(ctx, 0, 0, r * 0.6); shape(ctx, '#eaf6ff', 1.4);
        pen(JADE, 1.3);
        ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0.4, Math.PI * 1.6); ctx.stroke();
        break;
      }
      default: {
        circle(ctx, 0, 0, r * 0.7); shape(ctx, PURPLE, 1.3);
      }
    }
    ctx.restore();

    if (cdPct > 0) {
      ctx.save();
      rr(ctx, x, y, size, size, size * 0.2); ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(x, y, size, size * cdPct);
      ctx.restore();
    }
    ctx.restore();
  };

  // ===== 材料图标 =====
  Art.drawMaterialIcon = function (ctx, x, y, size, itemId) {
    const cx = x + size / 2, cy = y + size / 2, r = size * 0.32;
    ctx.save();
    rr(ctx, x, y, size, size, size * 0.22);
    ctx.fillStyle = '#141a26'; ctx.fill();
    ctx.strokeStyle = '#33405c'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.translate(cx, cy);
    switch (itemId) {
      case 'mat_wood': // 桃木
        rr(ctx, -r * 0.9, -r * 0.3, r * 1.8, r * 0.6, r * 0.28); shape(ctx, '#8c6b3f', 1.2);
        circle(ctx, r * 0.75, 0, r * 0.18); shape(ctx, '#e8d3a8', 1);
        break;
      case 'mat_stone': // 玄石
        ctx.beginPath();
        ctx.moveTo(-r * 0.85, r * 0.5); ctx.lineTo(-r * 0.3, -r * 0.75);
        ctx.lineTo(r * 0.6, -r * 0.5); ctx.lineTo(r * 0.9, r * 0.45);
        ctx.closePath(); shape(ctx, '#9aa6b2', 1.2);
        break;
      case 'mat_herb': // 灵草
        line(ctx, 0, r * 0.9, 0, -r * 0.3, 2.2, '#3f7a4a');
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.2); ctx.quadraticCurveTo(r * 0.95, -r * 0.35, r * 0.35, -r * 0.95);
        ctx.quadraticCurveTo(r * 0.15, -r * 0.4, 0, -r * 0.2);
        shape(ctx, '#7CFC9B', 1);
        ctx.beginPath();
        ctx.moveTo(0, r * 0.15); ctx.quadraticCurveTo(-r * 0.95, 0, -r * 0.35, -r * 0.6);
        ctx.quadraticCurveTo(-r * 0.15, -r * 0.05, 0, r * 0.15);
        shape(ctx, '#5ec97a', 1);
        break;
      case 'mat_fire': // 火晶
        ctx.beginPath();
        ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.8, r * 0.1, r * 0.2, r * 0.85);
        ctx.quadraticCurveTo(0, r * 0.3, -r * 0.2, r * 0.85);
        ctx.quadraticCurveTo(-r * 0.8, r * 0.1, 0, -r);
        shape(ctx, '#ff8a3d', 1.2);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.2); ctx.quadraticCurveTo(r * 0.3, r * 0.3, 0, r * 0.7);
        ctx.quadraticCurveTo(-r * 0.3, r * 0.3, 0, -r * 0.2);
        shape(ctx, '#ffd479', 0);
        break;
      case 'mat_soul': // 妖魂
        circle(ctx, 0, 0, r * 0.62); shape(ctx, 'rgba(195,155,255,0.9)', 1.2);
        circle(ctx, -r * 0.18, -r * 0.12, r * 0.1); ctx.fillStyle = '#2b1a3d'; ctx.fill();
        circle(ctx, r * 0.18, -r * 0.12, r * 0.1); ctx.fillStyle = '#2b1a3d'; ctx.fill();
        break;
      default:
        circle(ctx, 0, 0, r * 0.6); shape(ctx, '#9fb0c8', 1.2);
    }
    ctx.restore();
  };

  // 装备图标（武器/护甲/饰品）
  Art.drawEquipIcon = function (ctx, x, y, size, item) {
    const cx = x + size / 2, cy = y + size / 2, r = size * 0.31;
    ctx.save();
    rr(ctx, x, y, size, size, size * 0.2);
    ctx.fillStyle = '#141a26'; ctx.fill();
    ctx.strokeStyle = '#5a4a7a'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.translate(cx, cy);
    if (item && item.slot === 'armor') {
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 0.7); ctx.lineTo(-r * 0.25, -r * 0.95);
      ctx.lineTo(r * 0.25, -r * 0.95); ctx.lineTo(r * 0.8, -r * 0.7);
      ctx.lineTo(r * 0.6, r * 0.9); ctx.lineTo(-r * 0.6, r * 0.9);
      ctx.closePath(); shape(ctx, '#b08d4f', 1.2);
    } else if (item && item.slot === 'trinket') {
      circle(ctx, 0, 0, r * 0.6); shape(ctx, '#8fe3c0', 1.2);
      line(ctx, 0, -r * 0.6, 0, -r * 1.0, 1.6, '#f4c430');
    } else {
      rr(ctx, -r * 0.14, -r * 1.0, r * 0.28, r * 1.5, r * 0.1); shape(ctx, '#dbe7f5', 1.2);
      rr(ctx, -r * 0.55, r * 0.4, r * 1.1, r * 0.2, r * 0.08); shape(ctx, '#f4c430', 1);
      rr(ctx, -r * 0.12, r * 0.55, r * 0.24, r * 0.5, r * 0.08); shape(ctx, '#8c6b3f', 1);
    }
    ctx.restore();
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = XY;
})(typeof window !== 'undefined' ? window : globalThis);
