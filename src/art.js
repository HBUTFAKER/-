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

    // 肩颈衣领（先画，脸盖在上面——头不再"悬空"）
    const neckW = r * 0.62;
    ctx.fillStyle = A.skin;
    ctx.beginPath();
    ctx.rect(cx - neckW / 2, cy + r * 0.72, neckW, r * 0.5);
    ctx.fill();
    // 领口
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.24, cy + r * 2.4);
    ctx.quadraticCurveTo(cx - r * 1.05, cy + r * 1.1, cx, cy + r * 1.06);
    ctx.quadraticCurveTo(cx + r * 1.05, cy + r * 1.1, cx + r * 1.24, cy + r * 2.4);
    ctx.closePath();
    ctx.fillStyle = A.cape || A.armor; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = r * 0.07; ctx.stroke();
    // 衣领滚边（鎏金）
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.06, cy + r * 1.32);
    ctx.quadraticCurveTo(cx - r * 0.9, cy + r * 1.12, cx, cy + r * 1.12);
    ctx.quadraticCurveTo(cx + r * 0.9, cy + r * 1.12, cx + r * 1.06, cy + r * 1.32);
    ctx.strokeStyle = A.trim; ctx.lineWidth = r * 0.1; ctx.stroke();

    // 脸
    circle(ctx, cx, cy, r); shape(ctx, A.skin, r * 0.085);
    // —— 面部立体：额顶高光 / 下颌暗影 / 眼窝淡影 ——
    ctx.save();
    circle(ctx, cx, cy, r); ctx.clip();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#fff8ea';
    ctx.beginPath();
    ctx.ellipse ? ctx.ellipse(cx - r * 0.14, cy - r * 0.5, r * 0.5, r * 0.26, -0.3, 0, Math.PI * 2) : ctx.arc(cx, cy - r * 0.5, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#8a5a34';
    ctx.beginPath();
    ctx.ellipse ? ctx.ellipse(cx, cy + r * 0.78, r * 0.72, r * 0.34, 0, 0, Math.PI * 2) : ctx.arc(cx, cy + r * 0.78, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

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
      ctx.moveTo(cx + sx * r * 0.52, cy - r * (mood === 'hurt' ? 0.36 : 0.22));
      ctx.lineTo(cx + sx * r * 0.2, cy - r * (mood === 'angry' ? 0.3 : (mood === 'hurt' ? 0.14 : 0.18)));
      ctx.stroke();
    }
    // 眼（小尺寸下放大一档，才读得出神态）
    const eyeY = cy + r * 0.06, eyeDx = r * 0.33;
    if (mood === 'hurt') {
      // 疼得眯起眼：两条下弯的弧线
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sx * eyeDx - r * 0.15, eyeY - r * 0.05);
        ctx.quadraticCurveTo(cx + sx * eyeDx, eyeY + r * 0.14, cx + sx * eyeDx + r * 0.15, eyeY - r * 0.05);
        ctx.strokeStyle = A.eyes; ctx.lineWidth = r * 0.1; ctx.stroke();
      }
    } else if (blink) {
      for (const sx of [-1, 1]) line(ctx, cx + sx * eyeDx - r * 0.14, eyeY, cx + sx * eyeDx + r * 0.14, eyeY, r * 0.08, A.eyes);
    } else {
      for (const sx of [-1, 1]) {
        circle(ctx, cx + sx * eyeDx, eyeY, r * 0.15); ctx.fillStyle = '#fff'; ctx.fill();
        circle(ctx, cx + sx * eyeDx + r * 0.03, eyeY, r * 0.1); ctx.fillStyle = A.eyes; ctx.fill();
        circle(ctx, cx + sx * eyeDx + r * 0.06, eyeY - r * 0.02, r * 0.035); ctx.fillStyle = '#fff'; ctx.fill();
      }
    }
    // 腮红（血色，让脸不蜡）
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#e06a4a';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse ? ctx.ellipse(cx + sx * r * 0.58, cy + r * 0.28, r * 0.2, r * 0.12, 0, 0, Math.PI * 2) : ctx.arc(cx + sx * r * 0.58, cy + r * 0.28, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 鼻 / 嘴
    if (A.head === 'pig') {
      ctx.beginPath();
      ctx.ellipse ? ctx.ellipse(cx, cy + r * 0.4, r * 0.24, r * 0.18, 0, 0, Math.PI * 2) : ctx.arc(cx, cy + r * 0.4, r * 0.2, 0, Math.PI * 2);
      shape(ctx, '#e79c8f', r * 0.06);
      ctx.fillStyle = '#8c4b46';
      for (const sx of [-1, 1]) { circle(ctx, cx + sx * r * 0.09, cy + r * 0.4, r * 0.045); ctx.fill(); }
    } else if (mood === 'hurt') {
      // 疼得张嘴：一个小竖椭圆
      ctx.beginPath();
      if (ctx.ellipse) ctx.ellipse(cx, cy + r * 0.48, r * 0.15, r * 0.2, 0, 0, Math.PI * 2);
      else ctx.arc(cx, cy + r * 0.48, r * 0.17, 0, Math.PI * 2);
      ctx.fillStyle = '#8f4a3e'; ctx.fill();
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
  function drawCharVector(ctx, cx, footY, scale, charId, pose) {
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
    // 受击：0..1 的进度。抬一个底数让"挨打那一帧"就立刻后仰，再慢慢回正
    const hurt = pose.hurtP;
    const hurtK = hurt === undefined ? 0 : Math.sin(Math.min(1, 0.22 + hurt * 0.78) * Math.PI);
    // 风的强度：跑动/冲刺/出招时盔缨与雉翎向后掠
    const windAmt = Math.min(1, (state === 'dash' ? 1 : 0) + (run ? (sprint ? 0.9 : 0.55) : 0)
      + (atk !== undefined ? 0.5 : 0) + (cast !== undefined ? 0.3 : 0));

    const ph = sprint ? t / 58 : t / 85; // 奔跑时步频更密
    const bob = air ? 0 : (run ? Math.abs(Math.sin(ph)) * (sprint ? 2.6 : 1.8) : Math.sin(t / 430) * 1.1);
    let legA = run ? Math.sin(ph) * (sprint ? 0.86 : 0.62) : (air ? 0.35 : 0.06);
    let legB = run ? -Math.sin(ph) * (sprint ? 0.86 : 0.62) : (air ? -0.3 : -0.06);
    const armBase = run ? Math.sin(ph) * (sprint ? 0.58 : 0.4) : 0.08;
    // 挨打时两腿撑开、脚下一沉，站桩不再板正
    if (hurtK) { legA += 0.2 * hurtK; legB -= 0.26 * hurtK; }

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

    // 出招时的重心变化（同样以脚底为轴）：每段招式一套自己的重心/弓步/低头
    let bodyTilt = 0, bodyShift = null, headDx = 0, headDy = 0;
    if (hurt !== undefined) {
      // 受击：被顶得向后仰，再慢慢把重心收回来
      bodyTilt = -0.34 * Math.sin(Math.min(1, hurt * 1.25) * Math.PI);
      ctx.translate(-7 * hurtK, 3 * hurtK);
    } else if (atk !== undefined) {
      const m = attackMotion(pose.attackBody || pose.attackKind || 0, atk);
      bodyTilt = m.tilt;
      legA += m.legA; legB += m.legB;      // 弓步/马步：腿也跟着招式走
      headDx = m.headX; headDy = m.headY;  // 头比躯干慢半拍
      bodyShift = m;
    } else if (state === 'dash') bodyTilt = 0.17;
    else if (pose.castId === 'wk_smash') bodyTilt = -0.08;
    if (bodyTilt) ctx.rotate(bodyTilt);
    if (bodyShift) ctx.translate(bodyShift.x, bodyShift.y);

    // —— 手臂 / 兵器姿态：先算好，才知道要不要画在躯干后面 ——
    // 手臂与兵器分开驱动：arm 控手臂，wpn 是兵器的绝对角 → 兵器始终握在手里。
    // weaponBehind：像"甩"的反手蓄力，棒子要甩到背脊后面去，画在躯干前会从脸上穿过去。
    const SHX = 6, SHY = -41, ARM = 14;   // 肩点、手臂长度（角色坐标）
    let armAng, wpnAng, offX = 0, offY = 0, wpnShift = 0, weaponBehind = false, armLen = ARM, backArmAng = null;
    if (hurt !== undefined) {
      // 挨打：手臂被甩到身后，兵器顺手往下滑，护不住架势
      armAng = 0.62 + 0.5 * hurtK; wpnAng = 0.2 + 1.05 * hurtK;
      offX = -2 * hurtK; offY = 2 * hurtK;
    } else if (atk !== undefined) {
      const sp = swingProfile(pose.attackPath || pose.attackKind || 0, atk);
      armAng = sp.arm; wpnAng = sp.wpn; offX = sp.x; offY = sp.y; wpnShift = sp.g || 0;
      armLen = sp.armLen || ARM;   // 手臂跟着招式伸缩，握点不会飞离手掌
      weaponBehind = !!sp.behind;
      if (sp.backArm !== undefined) backArmAng = sp.backArm;  // 空手招式要两条胳膊一起动
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
      // 站立：棒子斜靠在身侧。倾斜给足，不然一根竖着的棒正好压在脸上
      armAng = armBase * 0.5 - 0.34; wpnAng = 0.46 + armBase * 0.12;
    }
    // 握点：肩点 + 手臂旋转（+ 招式带来的前送/下沉）
    const handX = SHX - Math.sin(armAng) * armLen + offX;
    const handY = SHY + Math.cos(armAng) * armLen + offY;

    const drawArmAndWeapon = () => {
      ctx.save();
      ctx.translate(SHX, SHY);
      ctx.rotate(armAng);
      drawArm(ctx, 0, 0, 0, A, armLen);
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
    };
    if (weaponBehind) drawArmAndWeapon();

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
    drawArm(ctx, -4.5, -42, backArmAng !== null ? backArmAng : armBase + 0.3, A, 15);

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
    const mood = state === 'attack' ? 'angry' : (state === 'hurt' ? 'hurt' : 'calm');
    // 受击时头比身体更"慢半步"：先往后一挫，再跟着躯干回正
    Art.drawFace(ctx, 1 + headDx - 2.8 * hurtK, -56 + headDy + 1.4 * hurtK, 10, charId, { t: t, mood: mood, wind: windAmt, hurt: hurtK });
    if (!weaponBehind) drawArmAndWeapon();



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

  // ============================================================
  // 像素角色（真·像素栅格）
  // 不靠"把矢量图缩小再放大"——那种做法脸会糊、边会起毛刺。
  // 这里所有形体先算成多边形/胶囊，再按像素扫描线填，天然无抗锯齿。
  // 一个"美术像素"= PX_UNIT 个世界单位：进游戏（1.15）/ 选角卡（1.55）/
  // 立绘（3.15）只是把同一张像素图放大，造型不会跑形。
  // ============================================================
  const PX_UNIT = 1.74;
  const PX_OUT = '#191210';
  const _cin = {};

  function pxC(hex) {
    let c = _cin[hex];
    if (c !== undefined) return c;
    let h = hex.charAt(0) === '#' ? hex.slice(1) : hex;
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    c = (((255 << 24) | (parseInt(h.slice(4, 6), 16) << 16) | (parseInt(h.slice(2, 4), 16) << 8) | parseInt(h.slice(0, 2), 16)) >>> 0);
    _cin[hex] = c;
    return c;
  }

  function Painter(w, h) {
    this.w = w; this.h = h;
    this.px = new Uint32Array(w * h);
  }
  Painter.prototype.dot = function (x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = c;
  };
  Painter.prototype.rect = function (x, y, w, h, c) {
    const x0 = Math.round(x), y0 = Math.round(y);
    const x1 = Math.round(x + w), y1 = Math.round(y + h);
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) this.dot(xx, yy, c);
  };
  Painter.prototype.disc = function (cx, cy, r, c) {
    const r2 = r * r + r * 0.22;
    const x0 = Math.floor(cx - r - 1), x1 = Math.ceil(cx + r + 1);
    const y0 = Math.floor(cy - r - 1), y1 = Math.ceil(cy + r + 1);
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy <= r2) this.dot(x, y, c);
      }
    }
  };
  Painter.prototype.capsule = function (x1, y1, x2, y2, r, c) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 0.0001;
    const r2 = r * r + r * 0.22;
    const x0 = Math.floor(Math.min(x1, x2) - r - 1), x1e = Math.ceil(Math.max(x1, x2) + r + 1);
    const y0 = Math.floor(Math.min(y1, y2) - r - 1), y1e = Math.ceil(Math.max(y1, y2) + r + 1);
    for (let y = y0; y <= y1e; y++) {
      for (let x = x0; x <= x1e; x++) {
        const mx = x + 0.5, my = y + 0.5;
        let t = ((mx - x1) * dx + (my - y1) * dy) / len2;
        t = t < 0 ? 0 : (t > 1 ? 1 : t);
        const ex = x1 + dx * t - mx, ey = y1 + dy * t - my;
        if (ex * ex + ey * ey <= r2) this.dot(x, y, c);
      }
    }
  };
  // 扫描线多边形：一条一条横线填，边缘天然是硬像素
  Painter.prototype.poly = function (pts, c) {
    const n = pts.length;
    if (n < 3) return;
    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < n; i++) { if (pts[i][1] < minY) minY = pts[i][1]; if (pts[i][1] > maxY) maxY = pts[i][1]; }
    const xs = [];
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const cy = y + 0.5;
      xs.length = 0;
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        if ((a[1] <= cy && b[1] > cy) || (b[1] <= cy && a[1] > cy)) {
          xs.push(a[0] + (b[0] - a[0]) * ((cy - a[1]) / (b[1] - a[1])));
        }
      }
      if (xs.length < 2) continue;
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = Math.round(xs[i]), xb = Math.round(xs[i + 1]);
        for (let x = xa; x < xb; x++) this.dot(x, y, c);
      }
    }
  };
  // 1px 墨线描边：只描在"空像素贴着实心像素"的地方，不往里吃
  Painter.prototype.outline = function (c) {
    const w = this.w, h = this.h, src = this.px.slice(0);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (src[i]) continue;
        if ((x > 0 && src[i - 1]) || (x < w - 1 && src[i + 1]) ||
            (y > 0 && src[i - w]) || (y < h - 1 && src[i + w])) this.px[i] = c;
      }
    }
  };
  // 轮廓光：把"朝光侧露在外面的墨线"染成高光色，一圈金边把角色从背景里抠出来。
  // 必须在 outline() 之后调用。dirX/dirY 是光的来向（默认右上）。
  Painter.prototype.rimLight = function (lineCol, rimCol, dirX, dirY) {
    const w = this.w, h = this.h, src = this.px.slice(0);
    const dx = dirX === undefined ? 1 : dirX;
    const dy = dirY === undefined ? -1 : dirY;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (src[i] !== lineCol) continue;
        const nx = x + dx, ny = y + dy;
        const outside = nx < 0 || nx >= w || ny < 0 || ny >= h;
        if (outside || !src[ny * w + nx]) this.px[i] = rimCol;
      }
    }
  };
  // 颜色明暗：把 uint32 颜色乘一个系数（<1 压暗，>1 提亮）
  function shadeCol(c, mul) {
    const a = (c >>> 24) & 255;
    const r = Math.min(255, Math.round(((c >>> 16) & 255) * mul));
    const g = Math.min(255, Math.round(((c >>> 8) & 255) * mul));
    const b = Math.min(255, Math.round((c & 255) * mul));
    return ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
  }
  // 自动暗部（AO）：贴着墨线或虚空的下/左侧压暗一档，平涂立刻有体积
  Painter.prototype.ao = function (lineCol, mul) {
    const w = this.w, h = this.h, src = this.px.slice(0);
    const k = mul === undefined ? 0.8 : mul;
    for (let y = 1; y < h; y++) {
      for (let x = 1; x < w; x++) {
        const i = y * w + x;
        const v = src[i];
        if (!v || v === lineCol) continue;
        const l = src[i - 1];
        const d = y + 1 < h ? src[i + w] : 0;
        if (l === lineCol || !l || d === lineCol || !d) this.px[i] = shadeCol(v, k);
      }
    }
  };
  // 落地投影：椭圆软影，让角色"站在地上"而不是贴在背景上
  function groundShadow(ctx, cx, footY, halfW, alpha) {
    if (!ctx.ellipse) return;
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 0.3 : alpha;
    ctx.fillStyle = '#0a0705';
    ctx.beginPath();
    ctx.ellipse(cx, footY - 1.5, halfW, halfW * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const _pxCv = {};
  function pxBlit(ctx, p, dx, dy, k) {
    const key = p.w + 'x' + p.h;
    let cv = _pxCv[key];
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = p.w; cv.height = p.h;
      _pxCv[key] = cv;
    }
    const g = cv.getContext('2d');
    const img = g.createImageData(p.w, p.h);
    new Uint32Array(img.data.buffer).set(p.px);
    g.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cv, dx, dy, p.w * k, p.h * k);
  }

  // ===== 五人的像素造型表 =====
  // 配色戒律：衣服必须和皮肤换一个色系（只差明度不算）。像素小、还有垫墨底压暗，
  // 暖褐袍 + 暖褐皮会糊成一整块肉色——八戒第一版就是这个翻车法，改成藏青才立起来。
  const PX_LOOK = {
    wukong: {
      hipY: -13.2, torso: 11.2, torsoR: 3.6, headR: 4.6, legLen: 10.4, armLen: 8.6,
      sleeve: '#8a5a08',
      skin: '#f7d3ac', skinSh: '#d8a87c', face: '#ffe9d2', fur: '#7a4a22',
      armor: '#f2c02c', armorSh: '#a8760a', armorHi: '#ffe27a', belt: '#c0392b',
      pants: '#a8760a', boot: '#4b2f1a', bootHi: '#77502c',
      cape: '#c0392b', capeIn: '#8e2b20', plume: '#e0432f', metal: '#ffe9a8',
      eye: '#191210', white: '#fff6e6', hair: '#7a4a22', weapon: 'staff',
    },
    bajie: {
      hipY: -12.4, torso: 10, torsoR: 4.3, headR: 5.2, legLen: 10.2, armLen: 8.2,
      sleeve: '#5b6a85',
      skin: '#f3c39c', skinSh: '#cc9469', face: '#f8d6b6', fur: '#5b4632',
      // 僧衣用藏青：原来的土褐和肤色同明度，整个人看着像没穿衣服
      armor: '#48546b', armorSh: '#2f3a4b', armorHi: '#71809a', belt: '#c0392b',
      pants: '#2f3a4b', boot: '#2b2117', bootHi: '#4d3a26',
      snout: '#e79c8f', snoutSh: '#b96f66', metal: '#c9d0d6',
      eye: '#191210', white: '#fff6e6', hair: '#3b2d20', weapon: 'rake',
    },
    tangseng: {
      hipY: -13.6, torso: 11, torsoR: 3.3, headR: 4.4, legLen: 10.8, armLen: 8.8,
      sleeve: '#c9c0ad',
      skin: '#f9e5d0', skinSh: '#d8b49a', face: '#fff2e2', fur: '#cfc6b4',
      armor: '#fbfbf8', armorSh: '#cfc6b4', armorHi: '#ffffff', belt: '#e0b020',
      pants: '#d6cab4', boot: '#5a4a38', bootHi: '#7d6a52',
      cape: '#b03a3a', capeIn: '#7e2626', metal: '#e0b020',
      eye: '#2c2c2c', white: '#ffffff', hair: '#2b2b2b', weapon: 'none',
    },
    shaseng: {
      hipY: -13.2, torso: 11.2, torsoR: 4.1, headR: 4.7, legLen: 10.4, armLen: 9,
      sleeve: '#465253',
      skin: '#e2b489', skinSh: '#b98a5f', face: '#efc79e', fur: '#2f2f2f',
      armor: '#7f8c8d', armorSh: '#4f5b5c', armorHi: '#c8d0d1', belt: '#3f4a4b',
      pants: '#4f5b5c', boot: '#3a2a1c', bootHi: '#5c422a',
      cape: '#5b6b6c', capeIn: '#3a4648', metal: '#c8d0d1',
      eye: '#20232a', white: '#ffffff', hair: '#2f2f2f', beard: '#2f2f2f', weapon: 'staff2',
    },
    bailongma: {
      hipY: -14, torso: 11.2, torsoR: 3.5, headR: 4.5, legLen: 11.2, armLen: 8.8,
      sleeve: '#3f9bd6',
      skin: '#eedcc2', skinSh: '#cbaa8b', face: '#f9ecda', fur: '#cfe8ff',
      armor: '#aed6f1', armorSh: '#2e86c1', armorHi: '#eaf6ff', belt: '#2e86c1',
      pants: '#3f9bd6', boot: '#2e6f96', bootHi: '#59a9cf',
      cape: '#2e86c1', capeIn: '#1f5f8b', metal: '#eaf6ff',
      eye: '#1f5f8b', white: '#ffffff', hair: '#cfe8ff', horn: '#bdd9ef', weapon: 'spear',
    },
  };

  // 骨架：角度/位移沿用手感一致的一套曲线，只是换到像素坐标（1 单位≈0.58px）
  function pxRig(L, pose) {
    const t = pose.t || 0;
    const state = pose.state || 'idle';
    const run = state === 'run';
    const sprint = !!pose.sprint && run;
    const air = state === 'jump';
    const hurt = pose.hurtP;
    const hurtK = hurt === undefined ? 0 : Math.sin(Math.min(1, 0.22 + hurt * 0.78) * Math.PI);
    const atk = pose.attackP;
    const ph = sprint ? t / 58 : t / 85;
    const bob = air ? 0 : (run ? Math.abs(Math.sin(ph)) * (sprint ? 1.3 : 0.85) : Math.sin(t / 430) * 0.45);
    let legA = run ? Math.sin(ph) * (sprint ? 0.86 : 0.62) : (air ? 0.42 : 0.07);
    let legB = run ? -Math.sin(ph) * (sprint ? 0.86 : 0.62) : (air ? -0.34 : -0.07);
    const armBase = run ? Math.sin(ph) * (sprint ? 0.52 : 0.34) : 0.06;
    if (hurtK) { legA += 0.2 * hurtK; legB -= 0.26 * hurtK; }

    let tilt = 0, shiftX = 0, shiftY = 0, headX = 0, headY = 0;
    if (hurt !== undefined) {
      tilt = -0.3 * Math.sin(Math.min(1, hurt * 1.25) * Math.PI);
      shiftX = -3.4 * hurtK; shiftY = 1.5 * hurtK;
    } else if (atk !== undefined) {
      const m = attackMotion(pose.attackBody || pose.attackKind || 0, atk);
      tilt = m.tilt;
      legA += m.legA; legB += m.legB;
      headX = m.headX * 0.5; headY = m.headY * 0.5;
      shiftX = m.x * 0.34; shiftY = m.y * 0.42;   // 像素身体小，位移要收着，否则人整个飘出去
    } else if (state === 'dash') tilt = 0.16;

    let armAng, wpnAng, armLen = L.armLen, weaponBehind = false, backArmAng = null;
    if (hurt !== undefined) {
      armAng = 0.6 + 0.5 * hurtK; wpnAng = 0.2 + 1.0 * hurtK;
    } else if (atk !== undefined) {
      const sp = swingProfile(pose.attackPath || pose.attackKind || 0, atk);
      armAng = sp.arm; wpnAng = sp.wpn; armLen = (sp.armLen || 14) * 0.62;
      weaponBehind = !!sp.behind;
      if (sp.backArm !== undefined) backArmAng = sp.backArm;
    } else if (pose.castId === 'wk_smash') {
      const q = pose.castP === undefined ? 0 : pose.castP;
      armAng = -2.0 + q * 0.2; wpnAng = -0.5 + q * 0.14;
    } else if (pose.castId === 'wk_spin') {
      armAng = -0.95 + (pose.castP === undefined ? 0 : pose.castP) * 0.9;
      wpnAng = 0.55;
    } else if (state === 'dash') {
      armAng = 1.0; wpnAng = -0.46;
    } else if (pose.castP !== undefined) {
      armAng = -0.62; wpnAng = -0.5;
    } else {
      // 站立：棍子竖着提在身侧（斜着会从脸上穿过去）
      armAng = -0.92 + armBase * 0.1; wpnAng = 0.1;
    }

    const hip = [shiftX, L.hipY + shiftY - bob];
    const tl = L.torso;
    const sh = [hip[0] + Math.sin(tilt) * tl, hip[1] - Math.cos(tilt) * tl];
    const head = [sh[0] + Math.sin(tilt) * 2.6 + headX, sh[1] - (L.headR + 2.6) + headY];
    const hand = [sh[0] + 1.2 - Math.sin(armAng) * armLen, sh[1] + 1 + Math.cos(armAng) * armLen];
    return {
      t, state, run, sprint, air, hurtK, tilt, hip, sh, head, hand,
      legA, legB, armBase, armAng, wpnAng, armLen, weaponBehind, backArmAng,
      mood: state === 'attack' ? 'angry' : (state === 'hurt' ? 'hurt' : 'calm'),
    };
  }

  // 局部坐标 → 随兵器角度旋转（兵器的"上"是 -y）
  function wpnPt(hand, ang, x, y) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return [hand[0] + x * c - y * s, hand[1] + x * s + y * c];
  }

  // 像素笔：每个部件都先垫一圈墨色、再填色。
  // 四肢压在躯干上时全靠这圈墨线分得开——这是像素角色的筋骨，不是描边特效。
  const UND = 0.55;

  function pxWeapon(p, L, hand, ang, ox, oy) {
    const C = pxC;
    const OUT = C(PX_OUT);
    const W = (pts, col) => p.poly(pts.map((q) => {
      const t = wpnPt(hand, ang, q[0], q[1]);
      return [t[0] + ox, t[1] + oy];
    }), C(col));
    const raw = (pts, col) => p.poly(pts.map((q) => {
      const t = wpnPt(hand, ang, q[0], q[1]);
      return [t[0] + ox, t[1] + oy];
    }), col);
    // 带墨线底的方条：外框 1px 墨色，里面才是形
    const box = (x, y, w, h, col) => {
      const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
      const grow = [[x - 1, y - 1], [x + w + 1, y - 1], [x + w + 1, y + h + 1], [x - 1, y + h + 1]];
      raw(grow, OUT);
      W(pts, col);
    };
    if (L.weapon === 'staff') {              // 如意金箍棒
      box(-1, -19, 2, 27, '#c0392b');
      box(-1.5, -21.4, 3, 2.8, '#f2c02c');
      box(-1.5, 6.4, 3, 2.8, '#f2c02c');
      raw([[-0.6, -16], [0.2, -16], [0.2, 4], [-0.6, 4]], C('#e2633f'));   // 杆上高光（不垫墨）
    } else if (L.weapon === 'rake') {        // 九齿钉耙
      box(-1, -15, 2, 24, '#6d5138');
      box(-4, -18.4, 8, 2.2, '#b9c0c6');
      for (let i = 0; i < 4; i++) box(-3.4 + i * 2.1, -20.6, 1.1, 2.4, '#d7dde2');
    } else if (L.weapon === 'staff2') {      // 降妖宝杖（月牙铲）
      box(-1, -16, 2, 25, '#8c7a5c');
      box(-1.6, -18.4, 3.2, 2.2, '#c8d0d1');
      W([[-3.8, -22.4], [-1, -24], [0.4, -24], [3, -22.4], [1.4, -20.8], [0, -22.6], [-1.6, -20.8]], '#c8d0d1');
      box(-1.6, 6.4, 3.2, 2.2, '#c8d0d1');
    } else if (L.weapon === 'spear') {       // 龙枪
      box(-0.8, -15, 1.6, 24, '#2e86c1');
      box(-1.2, -17, 2.4, 2, '#c8e2f5');
      W([[0, -23.6], [1.6, -17.4], [0, -15.8], [-1.6, -17.4]], '#eaf6ff');
    }
  }

  // ===== 头：五官全靠 1px 落点，位置随头半径走 =====
  // ===== 头：逐像素的网格设计 =====
  // 圆头 + 程序化五官在这个尺寸下永远读不出来，头必须一格一格摆。
  // 每行等宽，'.' 透空；字符含义见 HEAD_PAL。
  const HEADS = {
    // 眼睛统一做成 2px 宽 × 1px 高：1px 眼睛竖向两行会糊成一条黑槽，读不出"在看"。
    // 九格宽的脸，眼落在 2~3 和 5~6 两格，中间留一格放鼻/嘴，左右才对称。
    wukong: [
      '..hhhhh..',
      '.hhhhhhh.',
      'hgggggggh',
      'hfffffffh',
      'hfeefeefh',
      '.hfffffh.',
      '..ffSSf..',
      '..fffff..',
      '...fff...',
      '....f....',
    ],
    bajie: [
      '...hhh...',
      '..hhhhh..',
      '.sssssss.',
      'sssssssss',
      'sseeseess',
      'sssssssss',
      'ssnnnnnss',
      'ssnSnnSss',
      '..sssss..',
      '...sss...',
    ],
    tangseng: [
      '..rrrrr..',
      '.mmmmmmm.',
      '.sssssss.',
      '.sssRsss.',
      'sseeseess',
      'sssssssss',
      '.sssssss.',
      '..ssSSs..',
      '...sss...',
      '....s....',
    ],
    shaseng: [
      '..sssss..',
      '.sssssss.',
      'sssssssss',
      'sbsssssbs',
      'sseeseess',
      'sssssssss',
      '.sbbbbbs.',
      '..bbbbb..',
      '...sss...',
      '....s....',
    ],
    bailongma: [
      '..hhhhh..',
      '.hhhhhhh.',
      '.sssssss.',
      '.sssssss.',
      'sseeseess',
      'sssssssss',
      '.sssssss.',
      '..ssSSs..',
      '...sss...',
      '....s....',
    ],
  };
  const HEAD_PAL = {
    wukong: { h: '#7a4a22', H: '#5a3418', g: '#f2c02c', m: '#ffe9a8', f: '#ffe9d2', s: '#f7d3ac', S: '#b9744a', e: '#191210', r: '#c0392b', R: '#c0392b', b: '#7a4a22', n: '#e79c8f', w: '#fff6e6' },
    bajie: { h: '#3b2d20', H: '#2a2017', g: '#c9a06a', m: '#c9d0d6', f: '#f8d6b6', s: '#f3c39c', S: '#b96f66', e: '#191210', r: '#8c5a3c', R: '#c0392b', b: '#3b2d20', n: '#e79c8f', w: '#fff6e6' },
    tangseng: { h: '#2b2b2b', H: '#1d1d1d', g: '#e0b020', m: '#e0b020', f: '#fff2e2', s: '#f9e5d0', S: '#d8b49a', e: '#2c2c2c', r: '#b03a3a', R: '#c0392b', b: '#2b2b2b', n: '#f0be9a', w: '#ffffff' },
    shaseng: { h: '#2f2f2f', H: '#232323', g: '#c8d0d1', m: '#c8d0d1', f: '#efc79e', s: '#e2b489', S: '#b98a5f', e: '#20232a', r: '#5b6b6c', R: '#c0392b', b: '#2f2f2f', n: '#e2b489', w: '#ffffff' },
    bailongma: { h: '#86bce2', H: '#6aa6d0', g: '#eaf6ff', m: '#eaf6ff', f: '#f9ecda', s: '#eedcc2', S: '#cbaa8b', e: '#1f5f8b', r: '#2e86c1', R: '#c0392b', b: '#cfe8ff', n: '#f0be9a', w: '#ffffff' },
  };

  function pxHeadGrid(p, id, hx, hy, ox, oy) {
    const rows = HEADS[id] || HEADS.wukong;
    const pal = HEAD_PAL[id] || HEAD_PAL.wukong;
    const C = pxC, OUT = C(PX_OUT);
    const w = rows[0].length, h = rows.length;
    const x0 = Math.round(hx + ox - w / 2), y0 = Math.round(hy + oy - h / 2);
    const mask = new Uint8Array(w * h);
    for (let r = 0; r < h; r++) {
      const row = rows[r];
      for (let c = 0; c < w; c++) {
        const ch = row.charAt(c);
        if (ch === '.' || ch === '') continue;
        p.dot(x0 + c, y0 + r, C(pal[ch] || pal.s));
        mask[r * w + c] = 1;
      }
    }
    // 只给这颗头描边：空像素贴着头的实心像素 → 墨线（下巴、鬓角、头顶都有）
    for (let r = -1; r <= h; r++) {
      for (let c = -1; c <= w; c++) {
        if (c >= 0 && c < w && r >= 0 && r < h && mask[r * w + c]) continue;
        const near = (c >= 1 && c - 1 < w && r >= 0 && r < h && mask[r * w + c - 1])
          || (c + 1 < w && c >= -1 && r >= 0 && r < h && mask[r * w + c + 1])
          || (r >= 1 && r - 1 < h && c >= 0 && c < w && mask[(r - 1) * w + c])
          || (r + 1 < h && c >= 0 && c < w && mask[(r + 1) * w + c]);
        if (near) p.dot(x0 + c, y0 + r, OUT);
      }
    }
  }

  function pxHead(p, L, id, hx, hy, R, mood, ox, oy) {
    const C = pxC;
    pxHeadGrid(p, id, hx, hy, ox, oy);
    const X = (x) => hx + x + ox, Y = (y) => hy + y + oy;
    const dot = (x, y, c) => p.dot(X(x), Y(y), C(c));
    if (id === 'bailongma') {
      // 龙角：两根 1px 折线，从头顶两侧斜着往后上挑
      for (const sx of [-1, 1]) {
        dot(sx * 3.4, -5.4, L.horn); dot(sx * 4.2, -6.2, L.horn); dot(sx * 5, -7, L.horn);
      }
    } else if (id === 'bajie') {
      // 耳朵从脸颊两侧支出来一格
      for (const sx of [-1, 1]) {
        dot(sx * 4.6, -1.6, L.skin); dot(sx * 5, -1.6, L.skinSh);
        dot(sx * 4.6, -0.6, L.skin); dot(sx * 5, -0.6, L.skinSh);
      }
    } else if (id === 'wukong') {
      // 耳
      dot(-4.6, 0.4, L.skin); dot(4.6, 0.4, L.skin);
      dot(-4.6, 1.4, L.skinSh);
    }
    if (mood === 'hurt') {
      dot(1.6, 0.4, L.eye); dot(1.6, 1.4, L.eye);
      dot(3.4, 0.4, L.eye); dot(3.4, 1.4, L.eye);
    }
  }

  // 雉鸡翎：两根本命羽毛，跑起来往后掠
  function pxPlume(p, L, rig, R, ox, oy) {
    const wind = Math.min(1, (rig.run ? (rig.sprint ? 1 : 0.7) : 0) + (rig.air ? 0.8 : 0)
      + (rig.state === 'dash' ? 1 : 0) + (rig.state === 'attack' ? 0.6 : 0));
    const hx = rig.head[0] + ox, hy = rig.head[1] + oy;
    const OUT = pxC(PX_OUT);
    for (let k = 0; k < 2; k++) {
      // 根部贴着后脑上沿，斜后方挑出去；跑起来整根往后压
      const bx = hx - 1.6 - k * 1.2, by = hy - R - 2.4 + k * 1.2;
      const midX = bx - 3.4 - wind * 1.8, midY = by - 3.6 + wind * 1.2;
      const tipX = midX - 3.2 - wind * 2.4, tipY = midY - 2.6 + wind * 1.6;
      const col = pxC(k ? L.plume : '#f0873a');
      p.capsule(bx, by, midX, midY, 1.2, OUT);
      p.capsule(midX, midY, tipX, tipY, 1.0, OUT);
      p.capsule(bx, by, midX, midY, 0.6, col);
      p.capsule(midX, midY, tipX, tipY, 0.35, col);
    }
  }

  function drawCharacterPx(ctx, cx, footY, scale, charId, pose) {
    const L = PX_LOOK[charId] || PX_LOOK.wukong;
    const rig = pxRig(L, pose);
    const W = 92, H = 78, OX = 52, OY = 70;
    const p = new Painter(W, H);
    const C = pxC, OUT = C(PX_OUT);
    const X = (x) => x + OX, Y = (y) => y + OY;
    // 垫墨 + 填色（像素角色的“筋骨”）
    const cap = (a, b, r, col, noOut) => {
      if (!noOut) p.capsule(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), r + UND, OUT);
      if (col) p.capsule(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), r, C(col));
    };
    const disc = (x, y, r, col, noOut) => {
      if (!noOut) p.disc(X(x), Y(y), r + UND, OUT);
      if (col) p.disc(X(x), Y(y), r, C(col));
    };
    const rect = (x, y, w, h, col) => p.rect(X(x), Y(y), w, h, C(col));
    const wire = (a, b, col) => p.capsule(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), 0.45, C(col));
    const poly = (pts, col, noOut) => {
      if (!noOut) {
        let mx = 0, my = 0;
        for (const q of pts) { mx += q[0]; my += q[1]; }
        mx /= pts.length; my /= pts.length;
        p.poly(pts.map((q) => {
          const dx = q[0] - mx, dy = q[1] - my;
          const d = Math.hypot(dx, dy) || 1;
          return [X(q[0] + dx / d), Y(q[1] + dy / d)];
        }), OUT);
      }
      p.poly(pts.map((q) => [X(q[0]), Y(q[1])]), C(col));
    };

    const facing = pose.facing >= 0 ? 1 : -1;
    const hip = rig.hip, sh = rig.sh;
    const ax = Math.sin(rig.tilt), ay = -Math.cos(rig.tilt);
    const nx = -ay, ny = ax;                    // 躯干法线（朝前）

    // 地面投影
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    if (ctx.ellipse) ctx.ellipse(cx, footY, 14 * scale, 3.6 * scale, 0, 0, Math.PI * 2);
    else ctx.arc(cx, footY, 9 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // —— 披风（身后）——
    if (L.cape) {
      const flap = Math.sin(rig.t / 120) * 1.2 + (rig.run ? 2.4 : 0) + (rig.air ? 3.2 : 0);
      // 披风是一块从肩后垂到膝弯的布：上窄下宽，别做成一条斜杠
      poly([
        [sh[0] - 2.6, sh[1] + 0.4],
        [hip[0] - 6.2 - flap * 0.4, hip[1] + 4.4],
        [hip[0] - 6 - flap, hip[1] + 6.6],
        [hip[0] - 1.6 - flap * 0.5, hip[1] + 7],
        [sh[0] + 1.4, sh[1] + 2.2],
      ], L.cape);
      wire([hip[0] - 5 - flap * 0.5, hip[1] + 3.6], [hip[0] - 3 - flap * 0.8, hip[1] + 6], L.capeIn);
    }

    // 反手蓄力：兵器甩到背后，得压在躯干之前画
    if (rig.weaponBehind && !pose.noWeapon) pxWeapon(p, L, [rig.hand[0], rig.hand[1]], rig.wpnAng, OX, OY);

    // —— 后臂 / 后腿 ——
    const backAng = rig.backArmAng !== null ? rig.backArmAng : rig.armBase + 0.42;
    const shB = [sh[0] - 1.2, sh[1] + 1];
    const handB = [shB[0] - Math.sin(backAng) * L.armLen, shB[1] + Math.cos(backAng) * L.armLen];
    cap(shB, handB, 1.35, L.sleeve);
    disc(handB[0], handB[1], 1.3, L.skinSh);

    const footB = [hip[0] - 2 - Math.sin(rig.legB) * L.legLen, hip[1] + Math.cos(rig.legB) * L.legLen];
    cap([hip[0] - 2, hip[1] + 0.4], footB, 1.25, L.pants);
    rect(footB[0] - 1.8, footB[1] - 1.6, 4, 2.8, L.boot);

    // —— 躯干 ——
    cap([hip[0], hip[1]], [sh[0], sh[1]], L.torsoR, L.armor);
    // 背侧暗部 + 胸前亮边（一条 1px 线就够，别糊成渐变）
    wire([hip[0] - nx * (L.torsoR - 0.5), hip[1] - ny * (L.torsoR - 0.5)],
      [sh[0] - nx * (L.torsoR - 0.5), sh[1] - ny * (L.torsoR - 0.5)], L.armorSh);
    wire([hip[0] + nx * (L.torsoR - 0.3), hip[1] + ny * (L.torsoR - 0.3)],
      [sh[0] + nx * (L.torsoR - 0.3), sh[1] + ny * (L.torsoR - 0.3)], L.armorHi);

    // 腰带
    const beltY = [hip[0] + ax * 1.8, hip[1] + ay * 1.8];
    cap([beltY[0] - nx * (L.torsoR + 0.1), beltY[1] - ny * (L.torsoR + 0.1)],
      [beltY[0] + nx * (L.torsoR + 0.1), beltY[1] + ny * (L.torsoR + 0.1)], 0.9, L.belt);

    if (charId === 'wukong') {
      // 护心镜 + 披膊 + 三片战裙
      disc(sh[0] + ax * 2.6, sh[1] + ay * 2.6, 1.9, L.armorHi, true);
      disc(sh[0] + ax * 2.6, sh[1] + ay * 2.6, 1.0, L.metal, true);
      for (const sx of [-1, 1]) {
        const bx = sh[0] + nx * sx * 2, by = sh[1] + ny * sx * 2 + 0.6;
        disc(bx, by, 1.5, sx > 0 ? L.armorHi : L.armorSh, true);
      }
      for (let i = -1; i <= 1; i++) {
        const sx = hip[0] + i * 2.1, sy = hip[1] + 1;
        poly([[sx - 1.3, sy], [sx + 1.3, sy], [sx + 1.5, sy + 2.8], [sx - 1.5, sy + 2.8]], i === 0 ? L.armor : L.armorSh, true);
      }
    } else if (charId === 'bajie') {
      disc(hip[0] + 1.2, hip[1] - 3, 2.8, L.skin);                 // 大肚
      wire([hip[0] - 0.4, hip[1] - 1.4], [hip[0] + 1.4, hip[1] - 5], L.armorHi);
      wire([sh[0] + 0.2, sh[1] + 1], [hip[0] + 0.2, hip[1] - 2], L.armorHi);
    } else if (charId === 'tangseng') {
      poly([[sh[0] - 2, sh[1] + 0.2], [sh[0] + 2.6, sh[1] + 1],
        [hip[0] + 2.2, hip[1] + 0.4], [hip[0] - 1.4, hip[1] - 0.4]], L.cape, true);   // 斜披袈裟
      for (let i = 0; i < 4; i++) disc(sh[0] - 1.2 + i * 0.9, sh[1] + 2 + i * 1.3, 0.55, L.metal, true);
    } else if (charId === 'shaseng') {
      wire([sh[0] - nx * 2.4, sh[1] - ny * 2.4 + 2.4], [sh[0] + nx * 2.4, sh[1] + ny * 2.4 + 2.4], L.armorHi);
      for (const sx of [-1, 1]) {
        const bx = sh[0] + nx * sx * 2, by = sh[1] + ny * sx * 2 + 0.4;
        disc(bx, by, 1.4, sx > 0 ? L.armorHi : L.armorSh, true);
      }
    } else if (charId === 'bailongma') {
      poly([[sh[0] - 1.6, sh[1] + 0.2], [sh[0] + 2.2, sh[1] + 0.6],
        [hip[0] + 1.8, hip[1] + 0.2], [hip[0] - 1.2, hip[1] - 0.4]], L.armorSh, true);
      for (let i = 0; i < 2; i++) disc(sh[0] + 0.4, sh[1] + 3.4 + i * 2.2, 0.5, L.armorHi, true);
    }

    // —— 前腿 ——
    const footF = [hip[0] + 2 - Math.sin(rig.legA) * L.legLen, hip[1] + Math.cos(rig.legA) * L.legLen];
    cap([hip[0] + 2, hip[1] + 0.4], footF, 1.25, L.pants);
    rect(footF[0] - 1.8, footF[1] - 1.6, 4.2, 2.8, L.boot);
    rect(footF[0] - 1.8, footF[1] - 1.6, 4.2, 1, L.bootHi);

    // —— 脖子 + 头 ——
    cap([sh[0] + 0.4, sh[1] + 0.4], [rig.head[0] - 0.2, rig.head[1] + L.headR - 0.8], 1.2, L.skin);
    pxHead(p, L, charId, rig.head[0], rig.head[1], L.headR, rig.mood, OX, OY);
    if (charId === 'wukong') pxPlume(p, L, rig, L.headR, OX, OY);

    // —— 前臂 + 兵器 ——
    cap([sh[0] + 2.2, sh[1] + 1.4], rig.hand, 1.5, L.sleeve);
    if (charId === 'wukong' || charId === 'shaseng') wire([sh[0] + 2.2, sh[1] + 1.4], rig.hand, L.armorSh);
    if (!rig.weaponBehind && !pose.noWeapon) pxWeapon(p, L, [rig.hand[0], rig.hand[1]], rig.wpnAng, OX, OY);
    disc(rig.hand[0], rig.hand[1], 1.5, L.skin);

    const k = PX_UNIT * scale;
    const dx = cx - OX * k, dy = footY - OY * k;
    p.ao(OUT, 0.82);
    p.rimLight(OUT, C('#e8b45e'), facing < 0 ? -1 : 1, -1);
    groundShadow(ctx, cx, footY, 20 * scale, 0.32);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (facing < 0) {
      ctx.translate(cx, 0);
      ctx.scale(-1, 1);
      ctx.translate(-cx, 0);
    }
    pxBlit(ctx, p, dx, dy, k);
    ctx.restore();
    ctx.imageSmoothingEnabled = true;
  }

  // 统一入口：浏览器里走像素栅格，node 测试环境（无 document）退回矢量
  function canPixel() {
    return typeof document !== 'undefined' && !!document.createElement;
  }
  Art.pixelMode = true;
  Art.drawCharacter = function (ctx, cx, footY, scale, charId, pose) {
    // 落地压扁回弹：0.17s 内把身体往脚下压（横宽竖短），打击感全在这一下
    if (pose.landP !== undefined) {
      const sq = Math.sin(Math.min(1, pose.landP) * Math.PI) * 0.14;
      if (sq > 0.01) {
        ctx.save();
        ctx.translate(cx, footY);
        ctx.scale(1 + sq * 0.8, 1 - sq);
        ctx.translate(-cx, -footY);
        drawCharacterInner(ctx, cx, footY, scale, charId, pose);
        ctx.restore();
        return;
      }
    }
    return drawCharacterInner(ctx, cx, footY, scale, charId, pose);
  };
  function drawCharacterInner(ctx, cx, footY, scale, charId, pose) {
    // pose.vector 可以强制走矢量（过场剪影这类大倍率场景用）
    if (!pose.vector && XY.Toon && XY.Toon.enabled && XY.Toon.has(charId)) {
      return XY.Toon.drawCharacter(ctx, cx, footY, scale, charId, pose);
    }
    if (Art.pixelMode && !pose.vector && canPixel()) return drawCharacterPx(ctx, cx, footY, scale, charId, pose);
    return drawCharVector(ctx, cx, footY, scale, charId, pose);
  }
  Art.PX_UNIT = PX_UNIT;
  // 像素层对外开放一点，测试和调试页都要用（矢量层仍是兜底）
  Art.PX = {
    unit: PX_UNIT, look: PX_LOOK, heads: HEADS, headsPal: HEAD_PAL,
    get monLook() { return MON_LOOK; },
    get bossDef() { return BOSS_PX_DEF; },
    Painter, color: pxC, rig: pxRig, outline: PX_OUT,
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

  // ============================================================
  // 普攻动作：path（兵器轨迹）× body（身体语言）两套曲线
  // 每个角色的四式在 data.js 的 XY.BASIC_COMBO 里指定用哪条曲线，
  // 所以五个人打起来是五种身法，不是同一套动作换皮。
  // ============================================================
  function seg(p, a, b) { return Math.min(1, Math.max(0, (p - a) / (b - a))); }
  function easeOut(p) { return 1 - (1 - p) * (1 - p); }
  function easeIn(p) { return p * p; }
  function easeInOut(p) { return p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p); }

  // —— 身体语言 ——
  // 返回：tilt 躯干倾角 / x,y 整体位移（y 正=下沉）/ headX,headY 头部滞后 / legA,legB 前后腿
  // 约定：tilt 正=往前压，负=后仰；legA/legB 负=腿往前迈
  const BODIES = {
    // 劈：举棒过顶（后仰、踮起）→ 劈下来（前压、屈膝、扎马步）→ 压住重心
    chop(p) {
      const rai = easeOut(seg(p, 0, 0.26));
      const down = easeOut(seg(p, 0.34, 0.58));
      const ret = seg(p, 0.8, 1);
      return {
        tilt: -0.22 * rai + 0.55 * down - 0.32 * ret,
        x: -4 * rai + 12 * down - 8 * ret,
        y: -3 * rai + 7 * down - 4 * ret,
        headX: 2 * down - 2 * ret, headY: -2 * rai + 5 * down - 3 * ret,
        legA: 0.15 - 0.85 * down + 0.6 * ret,
        legB: -0.06 + 0.5 * rai + 0.2 * down,
      };
    },
    // 戳：沉腰后坐 → 弓步捅出去，身体几乎不上下
    thrust(p) {
      const back = easeOut(seg(p, 0, 0.22));
      const out = easeOut(seg(p, 0.3, 0.5));
      const ret = seg(p, 0.7, 1);
      return {
        tilt: -0.2 * back + 0.44 * out - 0.2 * ret,
        x: -9 * back + 17 * out - 10 * ret,
        y: 3.4 - 2 * out + 1.4 * ret,
        headX: 2.6 * out - 1.6 * ret, headY: 2 * back + 2.2 * out - 3 * ret,
        legA: 0.18 - 0.92 * out + 0.68 * ret,
        legB: -0.05 + 0.7 * back + 0.26 * out - 0.42 * ret,
      };
    },
    // 挑：先蹲到底 → 拔身撩起，整个人往上"长"
    lift(p) {
      const low = easeOut(seg(p, 0, 0.26));
      const up = easeOut(seg(p, 0.34, 0.62));
      const ret = seg(p, 0.8, 1);
      return {
        tilt: 0.24 * low - 0.42 * up + 0.2 * ret,
        x: -3 * low + 6 * up - 3 * ret,
        y: 8 * low - 8 * up + 3 * ret,
        headX: -1.4 * low + 1.4 * up, headY: 4 * low - 7 * up + 3.5 * ret,
        legA: -0.1 + 0.5 * low - 0.3 * up,
        legB: 0.16 + 0.7 * low - 0.35 * up,
      };
    },
    // 甩：拧腰蓄力 → 一圈横扫 → 收势偏后、腿扎马步
    sweep(p) {
      const wind = easeOut(seg(p, 0, 0.24));
      const sw = easeOut(seg(p, 0.32, 0.6));
      const ret = seg(p, 0.76, 1);
      return {
        tilt: -0.26 * wind + 0.46 * sw - 0.24 * ret,
        x: -9 * wind + 17 * sw - 10 * ret,
        y: 3 + 2 * wind - 3 * sw + 1.5 * ret,
        headX: -3 * wind + 4.5 * sw - 1.5 * ret, headY: 1.6 * wind + 1.6 * sw,
        legA: -0.3 - 0.35 * wind + 0.3 * sw,
        legB: 0.35 + 0.28 * wind - 0.2 * sw,
      };
    },
    // 砸（八戒筑 / 沙僧铲）：双手举过头顶 → 整个人压下去，蹲得最深
    smash(p) {
      const up = easeOut(seg(p, 0, 0.26));
      const down = easeIn(seg(p, 0.32, 0.56));
      const ret = seg(p, 0.8, 1);
      return {
        tilt: -0.3 * up + 0.66 * down - 0.34 * ret,
        x: -3 * up + 9 * down - 6 * ret,
        y: -7 * up + 11 * down - 4 * ret,
        headX: 1.5 * down - 1 * ret, headY: -4 * up + 7 * down - 3 * ret,
        legA: 0.3 - 0.95 * down + 0.65 * ret,
        legB: -0.2 + 0.6 * up + 0.3 * down,
      };
    },
    // 搂（八戒）：耙子探出去 → 整个人往后坐、往回拽
    reel(p) {
      const out = easeOut(seg(p, 0, 0.2));
      const pull = easeOut(seg(p, 0.22, 0.52));
      const ret = seg(p, 0.8, 1);
      return {
        tilt: 0.16 * out - 0.44 * pull + 0.28 * ret,
        x: 5 * out - 9 * pull + 4 * ret,
        y: 2 * out + 3 * pull - 2 * ret,
        headX: 2 * out - 3 * pull + 1 * ret, headY: 1 * out + 2 * pull,
        legA: 0.2 * out + 0.45 * pull - 0.45 * ret,
        legB: -0.1 * out - 0.5 * pull + 0.35 * ret,
      };
    },
    // 撞（八戒）：先正面压低蓄力 → 整个人前倾冲出去
    charge(p) {
      const crouch = easeOut(seg(p, 0, 0.18));
      const go = easeOut(seg(p, 0.2, 0.46));
      const ret = seg(p, 0.7, 1);
      return {
        tilt: 0.1 * crouch + 0.42 * go - 0.3 * ret,
        x: -3 * crouch + 11 * go - 8 * ret,
        y: 5 * crouch - 4 * go + 1 * ret,
        headX: 3 * go - 1 * ret, headY: 3 * crouch - 2 * go,
        legA: 0.35 * crouch + 0.75 * go - 0.7 * ret,
        legB: -0.25 * crouch - 0.65 * go + 0.55 * ret,
      };
    },
    // 踢（唐僧）：抬膝 → 侧踢出去 → 收腿，上身反着后仰
    kick(p) {
      const chamber = easeOut(seg(p, 0, 0.22));
      const out = easeOut(seg(p, 0.26, 0.5));
      const ret = seg(p, 0.72, 1);
      return {
        tilt: 0.18 * chamber - 0.42 * out + 0.22 * ret,
        x: -1 * chamber + 4 * out - 3 * ret,
        y: -1 * chamber - 2 * out + 1 * ret,
        headX: 1.6 * out - 1 * ret, headY: -1 * chamber,
        legA: 0.25 * chamber - 1.5 * out + 1.3 * ret,
        legB: 0.1 * chamber - 0.12 * out,
      };
    },
    // 站定（唐僧金刚掌）：身体几乎不动，只有一点前送——靠手臂和光效撑住
    calm(p) {
      const push = easeOut(seg(p, 0.2, 0.55));
      const ret = seg(p, 0.8, 1);
      return {
        tilt: 0.1 * push - 0.05 * ret,
        x: 1 * push - 1 * ret,
        y: 4 * push - 1 * ret,
        headX: 1 * push, headY: 2.4 * push,
        legA: 0.28 * push - 0.1 * ret, legB: -0.32 * push + 0.1 * ret,
      };
    },
  };
  const BODY_BY_KIND = ['chop', 'thrust', 'lift', 'sweep'];
  function attackMotion(body, p) {
    if (typeof body === 'number') body = BODY_BY_KIND[body] || 'chop';
    return (BODIES[body] || BODIES.chop)(p);
  }
  Art.attackMotion = attackMotion;

  // —— 兵器轨迹 ——
  // 返回：手臂角 arm（0 垂下，正=往后摆）、兵器绝对角 wpn（0 竖直向上，正=棒头往前倒）、
  //       握点偏移 x/y、握把偏移 g（正=握点靠近棒头）、手臂伸展 armLen、behind 画在躯干后
  const PATHS = {
    // 劈：棒子先抡到肩后 → 一整条圆弧劈到前下方
    arc(p) {
      const raiArm = easeOut(seg(p, 0, 0.14));
      const rai = easeOut(seg(p, 0.06, 0.26));
      const down = easeIn(seg(p, 0.28, 0.52));
      const over = easeOut(seg(p, 0.58, 0.7));
      const ret = seg(p, 0.8, 1);
      return {
        arm: -0.34 + raiArm * 0.84 - down * 1.59 + over * 0.02 + ret * 0.75,
        wpn: -0.2 - rai * 0.8 + down * 3.12 - ret * 2.8,
        armLen: 14 - raiArm * 1 + down * 2 - ret * 1,
        x: -rai * 2 + down * 6 + over * 2 - ret * 6,
        y: -rai * 2.5 + down * 4 - ret * 1.5,
        g: -down * 7 - over * 2 + ret * 9,
      };
    },
    // 戳：身前斜举 → 手往前一送、棒子平捅出去
    thrust(p) {
      const out = easeOut(seg(p, 0.14, 0.42));
      const hold = seg(p, 0.42, 0.58);
      const ret = seg(p, 0.72, 1);
      return {
        arm: 0.36 - out * 0.92 - hold * 0.03 + ret * 0.55,
        wpn: 0.5 + out * 0.86 - ret * 1.1,
        armLen: 12.5 + out * 3.4 - ret * 3,
        x: -1.5 + out * 8.5 - ret * 6,
        y: -9 + out * 0.5 + ret * 4,
        g: -2 - out * 5,
      };
    },
    // 挑：棒梢压到前下方 → 一路撩到头顶
    lift(p) {
      const low = easeOut(seg(p, 0, 0.26));
      const up = easeOut(seg(p, 0.34, 0.62));
      const over = seg(p, 0.62, 0.76);
      const ret = seg(p, 0.8, 1);
      return {
        arm: -0.06 + low * 0.66 - up * 1.9 - over * 0.16 + ret * 1.1,
        wpn: -0.14 + low * 2.42 - up * 2.17 - over * 0.14 + ret * 0.05,
        armLen: 14 + low * 1 - up * 2.5 - over * 1 + ret * 2.5,
        x: -low * 2 + up * 3 + over * 1 - ret * 2,
        y: low * 4 - up * 7 - over * 2 + ret * 5,
        g: low * 3 - up * 2,
      };
    },
    // 甩：棒子甩到背后（画在躯干后）→ 抡一圈横抽
    sweep(p) {
      const wind = easeOut(seg(p, 0, 0.24));
      const sw = easeOut(seg(p, 0.32, 0.6));
      const over = easeOut(seg(p, 0.6, 0.74));
      const ret = seg(p, 0.76, 1);
      return {
        behind: p < 0.43,
        arm: 0.06 + wind * 1.05 - sw * 2.0 - over * 0.2 + ret * 1.05,
        wpn: -0.1 - wind * 1.1 + sw * 3.1 + over * 0.3 - ret * 1.62,
        armLen: 14 + sw * 4 - ret * 4,
        x: -wind * 3 + sw * 7 - ret * 4,
        y: wind * 2 + sw * 1 - ret * 3,
        g: -wind * 5 + sw * 8 - ret * 3,
      };
    },
    // 砸：举到头顶 → 直直压到前下方，落点比劈更靠里
    smash(p) {
      const up = easeOut(seg(p, 0, 0.24));
      const down = easeIn(seg(p, 0.3, 0.54));
      const hold = seg(p, 0.54, 0.68);
      const ret = seg(p, 0.8, 1);
      return {
        arm: 0.1 + up * 0.46 - down * 1.42 + hold * 0.04 + ret * 0.9,
        wpn: -0.12 - up * 0.62 + down * 2.95 - ret * 2.2,
        armLen: 14 - up * 1 + down * 2,
        x: -up * 2 + down * 6 - ret * 5,
        y: -up * 3 + down * 2 - ret * 1,
        g: -up * 3 + down * 6 - ret * 3,
      };
    },
    // 搂：耙子先探出去 → 连人带耙往回搂，耙头从前方翻到脑后
    reel(p) {
      const out = easeOut(seg(p, 0, 0.2));
      const pull = easeOut(seg(p, 0.22, 0.52));
      const ret = seg(p, 0.78, 1);
      return {
        arm: -0.2 + out * 0.7 - pull * 1.55 + ret * 1.0,
        wpn: 1.5 + out * 0.32 - pull * 2.2 + ret * 0.4,
        armLen: 13 + out * 2 - pull * 3,
        x: out * 6 - pull * 9 + ret * 3,
        y: out * 1 - pull * 2 + ret * 1,
        g: out * 4 - pull * 5,
      };
    },
    // 抡：原地把兵器转一整圈，前后都能打到
    spin(p) {
      const wind = easeOut(seg(p, 0, 0.18));
      const go = easeInOut(seg(p, 0.2, 0.62));
      const ret = seg(p, 0.8, 1);
      return {
        behind: p < 0.3,
        arm: 0.05 + wind * 0.5 - go * 0.85 + ret * 0.3,
        wpn: -0.25 - wind * 0.5 + go * 6.85 - ret * 0.1,
        armLen: 13 + go * 3 - ret * 2,
        x: -wind * 2 + go * 4 - ret * 2,
        y: -wind * 1 - go * 1,
        g: go * 3,
      };
    },
    // 扫：人沉下去，兵器贴地横扫
    sweepLow(p) {
      const wind = easeOut(seg(p, 0, 0.2));
      const sw = easeOut(seg(p, 0.26, 0.56));
      const ret = seg(p, 0.76, 1);
      return {
        arm: 0.5 + wind * 0.5 - sw * 1.3 + ret * 0.7,
        wpn: -0.9 - wind * 0.5 + sw * 2.85 - ret * 1.1,
        armLen: 14 + sw * 2 - ret * 2,
        x: -wind * 2 + sw * 5 - ret * 3,
        y: 5 + wind * 2 - sw * 1 + ret * 3,
        g: -wind * 3 + sw * 5 - ret * 2,
      };
    },
    // 压：举起来竖着往下摁，杖头始终朝前
    press(p) {
      const up = easeOut(seg(p, 0, 0.26));
      const down = easeIn(seg(p, 0.32, 0.58));
      const ret = seg(p, 0.8, 1);
      return {
        arm: -0.2 + up * 0.9 - down * 1.5 + ret * 0.8,
        wpn: 0.9 - up * 1.5 + down * 1.35 - ret * 0.7,
        armLen: 14 + up * 1 - down * 1,
        x: -up * 1 + down * 4 - ret * 3,
        y: -up * 5 + down * 6 - ret * 3,
        g: -up * 5 + down * 7 - ret * 2,
      };
    },
    // 铲（沙僧）：棒头先杵到身前地面上，贴着地往前推一段——是"铲"，不是往上兜
    scoop(p) {
      const dig = easeOut(seg(p, 0, 0.24));
      const up = easeIn(seg(p, 0.3, 0.62));
      const ret = seg(p, 0.8, 1);
      return {
        arm: 0.5 + dig * 0.24 - up * 0.3 + ret * 0.2,
        wpn: 2.02 + dig * 0.4 - up * 0.1 + ret * 0.3,
        armLen: 14 + dig * 1 + up * 2 - ret * 2,
        x: -dig * 2 + up * 9 - ret * 5,
        y: dig * 6 - up * 8 + ret * 3,
        g: dig * 5 - up * 5,
      };
    },
    // 拨（白龙马）：竖枪一挡，顺着挡势把枪尖斜着送出去（角度比直刺高，身架更直）
    parry(p) {
      const guard = easeOut(seg(p, 0, 0.22));
      const jab = easeOut(seg(p, 0.34, 0.56));
      const ret = seg(p, 0.78, 1);
      return {
        arm: 0.05 + guard * 0.45 - jab * 1.15 + ret * 0.8,
        wpn: 0.15 + guard * 0.1 + jab * 0.75 + jab * 0.15 - ret * 1.2,
        armLen: 12.5 + jab * 3 - ret * 2.5,
        x: -guard * 1 + jab * 6 - ret * 5,
        y: -4 - guard * 2 + jab * 0,
        g: -2 - jab * 3,
      };
    },
    // 顶：握着棒尾，用棒尾往前撞（棒头朝后）
    butt(p) {
      const wind = easeOut(seg(p, 0, 0.16));
      const out = easeOut(seg(p, 0.2, 0.4));
      const hold = seg(p, 0.4, 0.56);
      const ret = seg(p, 0.72, 1);
      return {
        arm: 0.3 + wind * 0.4 - out * 1.35 + hold * 0.03 + ret * 0.6,
        wpn: -0.55 - wind * 0.3 - out * 0.51 - ret * 0.5,    // 杖身斜向脑后，棒尾朝前下方顶出去
        armLen: 13 + out * 3 - ret * 2,
        x: -wind * 2 + out * 9 - ret * 7,
        y: -2 - out * 1 + ret * 1,
        g: 10 + out * 6 - ret * 12,
      };
    },
    // 推掌（唐僧）：空手，胸前推出→手臂伸直
    palm(p) {
      const wind = easeOut(seg(p, 0, 0.18));
      const out = easeOut(seg(p, 0.22, 0.46));
      const hold = seg(p, 0.46, 0.62);
      const ret = seg(p, 0.74, 1);
      return {
        arm: -0.1 + wind * 0.55 - out * 1.2 - hold * 0.04 + ret * 0.65,
        wpn: 0.2 - out * 0.3,
        armLen: 12 + out * 4.5 - ret * 2.5,
        backArm: 0.5 - out * 0.8 + ret * 0.4,
        x: -wind * 2 + out * 6 - ret * 4,
        y: -3 + out * 1 + ret * 2,
        g: 0,
      };
    },
    // 拂袖（唐僧）：长袖横着一记大扫
    sleeve(p) {
      const wind = easeOut(seg(p, 0, 0.22));
      const sw = easeOut(seg(p, 0.28, 0.58));
      const ret = seg(p, 0.78, 1);
      return {
        arm: 0.7 + wind * 0.5 - sw * 1.95 + ret * 0.7,
        wpn: 0.6 - wind * 0.4 + sw * 0.3,
        armLen: 13 + sw * 2.5 - ret * 2,
        backArm: 0.62 + wind * 0.3 - sw * 0.7,
        x: -wind * 2 + sw * 5 - ret * 3,
        y: -6 + sw * 1 + ret * 4,
        g: 0,
      };
    },
    // 踢（唐僧）：手往后一收让开，腿才是主角（见 BODIES.kick）
    kick(p) {
      const chamber = easeOut(seg(p, 0, 0.22));
      const out = easeOut(seg(p, 0.26, 0.5));
      const ret = seg(p, 0.72, 1);
      return {
        arm: 0.2 + chamber * 0.55 - out * 0.45 + ret * 0.2,
        wpn: 0.3 + chamber * 0.4 - out * 0.5,
        armLen: 13 - out * 1,
        backArm: 0.2 + chamber * 0.7 - out * 0.5,
        x: -chamber * 1 + out * 2 - ret * 1,
        y: -2 + out * 1,
        g: 0,
      };
    },
    // 金刚掌（唐僧）：双手在胸前合一 → 沉马步，双掌往下按（跟推掌的平推是两个劲）
    pray(p) {
      const gather = easeOut(seg(p, 0, 0.4));
      const push = easeOut(seg(p, 0.42, 0.62));
      const ret = seg(p, 0.8, 1);
      return {
        arm: 0.05 + gather * 0.5 - push * 1.0 + ret * 0.45,
        wpn: 0.02 - push * 0.1,
        armLen: 12 + push * 5 - ret * 4,
        backArm: 0.05 + gather * 0.5 - push * 1.0 + ret * 0.45,
        x: -gather * 1 + push * 4 - ret * 3,
        y: -2 + push * 3 + ret * 1,
        g: 0,
      };
    },
    // 撞（八戒）：兵器收在身侧，全靠肩膀和肚子
    ram(p) {
      const crouch = easeOut(seg(p, 0, 0.18));
      const go = easeOut(seg(p, 0.2, 0.46));
      const ret = seg(p, 0.7, 1);
      return {
        arm: 0.5 + crouch * 0.55 - go * 0.7 + ret * 0.15,
        wpn: -0.5 - crouch * 0.6 + go * 0.55,
        armLen: 12 + go * 1,
        x: -crouch * 2 + go * 4 - ret * 2,
        y: 2 - go * 2,
        g: -4,
      };
    },
    // 刺（白龙马）：枪尖几乎水平，手往前送得最远
    thrust2(p) {
      const wind = easeOut(seg(p, 0, 0.18));
      const out = easeOut(seg(p, 0.2, 0.42));
      const hold = seg(p, 0.42, 0.6);
      const ret = seg(p, 0.75, 1);
      return {
        arm: 0.5 + wind * 0.55 - out * 1.08 + hold * 0.03 + ret * 0.5,
        wpn: 0.35 + wind * 0.25 + out * 0.85 - ret * 1.3,   // 枪尖最后走平，是一记平刺
        armLen: 12 + out * 5 - ret * 3,
        x: -wind * 3 + out * 13 - ret * 9,
        y: -6 + out * 1 + ret * 3,
        g: 6 - out * 10 + ret * 4,
      };
    },
    // 撩（白龙马）：枪头先垂到前下方 → 一路挑到头顶
    lift2(p) {
      const low = easeOut(seg(p, 0, 0.22));
      const up = easeOut(seg(p, 0.28, 0.56));
      const over = seg(p, 0.56, 0.7);
      const ret = seg(p, 0.8, 1);
      return {
        arm: -0.2 + low * 0.5 - up * 1.5 - over * 0.1 + ret * 1.0,
        wpn: 0.7 + low * 1.6 - up * 2.35 - over * 0.2 + ret * 0.4,
        armLen: 13 + low * 1 - up * 2 + ret * 1.5,
        x: -low * 2 + up * 4 - ret * 2,
        y: low * 5 - up * 8 + ret * 4,
        g: low * 3 - up * 2,
      };
    },
    // 回马枪：手转到身后，枪尖朝后下方扎
    back(p) {
      const turn = easeOut(seg(p, 0, 0.3));
      const jab = easeOut(seg(p, 0.34, 0.56));
      const ret = seg(p, 0.76, 1);
      return {
        behind: p < 0.42,
        arm: 0.1 + turn * 1.05 - jab * 0.2 + ret * 0.2,
        wpn: 0.2 - turn * 1.75 - jab * 0.1 + ret * 1.7,     // 枪尖转到身后，别扎进地里
        armLen: 13 + jab * 3 - ret * 2,
        x: -turn * 3 - jab * 6 + ret * 8,
        y: -2 - jab * 1 + ret * 2,
        g: -jab * 6,
      };
    },
  };
  const PATH_BY_KIND = ['arc', 'thrust', 'lift', 'sweep'];
  function swingProfile(path, p) {
    if (typeof path === 'number') path = PATH_BY_KIND[path] || 'arc';
    return (PATHS[path] || PATHS.arc)(p);
  }
  Art.swingProfile = swingProfile;
  Art.PATHS = PATHS; Art.BODIES = BODIES;
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
  // ===== 首领骨架（按 art.kind 分派）=====
  // 局部坐标：脚在 (0,0)，头在 -90 ~ -105，整体高度对齐牛魔王
  function bossDemon(ctx, art, body, t) {
    const skin = body || art.skin || '#5d6b52';
    const cloth = body || art.cloth || '#3b2f24';
    const trim = body || art.plume || '#c0392b';
    const s = art.small ? 0.9 : 1;       // 红孩儿是个孩子，矮一头
    ctx.save();
    ctx.scale(s, s);
    const breath = Math.sin(t / 460) * 1.2;
    // 腿 + 战靴
    rr(ctx, -16, -40, 13, 40, 5); shape(ctx, cloth, 1.3);
    rr(ctx, 4, -40, 13, 40, 5); shape(ctx, cloth, 1.3);
    rr(ctx, -19, -11, 18, 12, 3); shape(ctx, body || '#22181a', 1.1);
    rr(ctx, 2, -11, 18, 12, 3); shape(ctx, body || '#22181a', 1.1);
    // 后臂
    line(ctx, -16, -78, -30, -56, 8, cloth);
    circle(ctx, -31, -54, 5.5); shape(ctx, skin, 1.1);
    // 躯干：腰甲 + 肩甲
    rr(ctx, -18, -86 + breath, 36, 50, 11); shape(ctx, cloth, 1.6);
    rr(ctx, -19, -66 + breath, 38, 9, 3); shape(ctx, body || '#c9a24a', 1.1);
    for (const sx2 of [-1, 1]) {
      circle(ctx, sx2 * 18, -84 + breath, 9.5); shape(ctx, body || '#4a4038', 1.4);
      circle(ctx, sx2 * 18, -84 + breath, 4.2); shape(ctx, body || '#8a7f70', 0.9);
    }
    // 头
    circle(ctx, 4, -102 + breath, 15); shape(ctx, skin, 1.6);
    // 眉骨 + 眼
    line(ctx, -7, -108 + breath, 15, -106 + breath, 3.4, body || '#2a1e18');
    for (const ex of [-4, 11]) {
      circle(ctx, ex, -101 + breath, 3.1); ctx.fillStyle = body || '#ffd479'; ctx.fill();
      circle(ctx, ex + 0.6, -101.4 + breath, 1.3); ctx.fillStyle = '#1a0d08'; ctx.fill();
    }
    // 獠牙
    ctx.fillStyle = body || '#fff6e2';
    for (const sx2 of [-2, 8]) {
      ctx.beginPath(); ctx.moveTo(sx2, -92 + breath); ctx.lineTo(sx2 + 3, -86 + breath); ctx.lineTo(sx2 + 5, -92 + breath);
      ctx.closePath(); ctx.fill();
    }
    // 角
    if (art.horn) {
      ctx.strokeStyle = body || '#e8dcc8'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (const sx2 of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(4 + sx2 * 12, -112 + breath);
        ctx.quadraticCurveTo(4 + sx2 * 26, -124 + breath, 4 + sx2 * 22, -104 + breath);
        ctx.stroke();
      }
    }
    // 火焰头发（红孩儿）
    if (art.flame) {
      for (let i = 0; i < 5; i++) {
        const bx = -6 + i * 5, ph = Math.sin(t / 120 + i * 1.3) * 4;
        ctx.beginPath();
        ctx.moveTo(bx, -112 + breath);
        ctx.quadraticCurveTo(bx - 3, -126 + ph, bx + 1, -136 - ph);
        ctx.quadraticCurveTo(bx + 4, -124, bx + 5, -112 + breath);
        ctx.closePath();
        shape(ctx, i % 2 ? '#ffb03a' : '#ff6a1e', 0.8);
      }
    } else {
      // 头巾 / 冠
      ctx.beginPath();
      ctx.moveTo(-11, -110 + breath); ctx.quadraticCurveTo(4, -122 + breath, 19, -110 + breath);
      ctx.lineTo(17, -105 + breath); ctx.quadraticCurveTo(4, -114 + breath, -9, -105 + breath);
      ctx.closePath(); shape(ctx, trim, 1);
    }
    // 武器
    const wAng = -0.12 + Math.sin(t / 520) * 0.06;
    ctx.save();
    ctx.translate(26, -66 + breath); ctx.rotate(wAng);
    if (art.weapon === 'spear') {
      line(ctx, 0, -40, 0, 44, 4, '#5b4a32');
      ctx.beginPath();                                  // 火尖枪头
      ctx.moveTo(0, -52); ctx.quadraticCurveTo(7, -40, 0, -34); ctx.quadraticCurveTo(-7, -40, 0, -52);
      ctx.closePath(); shape(ctx, art.flame ? '#ffb03a' : '#cfd6de', 1.2);
    } else {
      line(ctx, 0, -34, 0, 34, 5, '#5b4a32');
      // 大刀：窄长的刀身 + 深色刀脊，别做成一面白旗
      ctx.beginPath();
      ctx.moveTo(3, -36);
      ctx.quadraticCurveTo(22, -28, 17, 2);
      ctx.quadraticCurveTo(12, -12, 3, -18);
      ctx.closePath(); shape(ctx, '#cfd6de', 1.3);
      ctx.beginPath();
      ctx.moveTo(3, -36); ctx.quadraticCurveTo(10, -26, 8, -8);
      ctx.lineTo(3, -12); ctx.closePath(); shape(ctx, '#7d858f', 1);
      // 护手
      rr(ctx, -6, -8, 14, 5, 2); shape(ctx, '#c9a24a', 0.9);
    }
    ctx.restore();
    // 前臂压到武器上
    line(ctx, 15, -82 + breath, 26, -66 + breath, 8, skin);
    circle(ctx, 26, -66 + breath, 5.6); shape(ctx, skin, 1.1);
    ctx.restore();
  }

  function bossBeast(ctx, art, body, t) {
    const fur = body || art.fur || '#6b5442';
    const dark = body || art.furDark || '#493729';
    const g = Math.sin(t / 130) * 2.2;
    const snout = art.snout || 'pig';
    // 后腿
    line(ctx, -22, -26, -30, -6, 7, dark);
    line(ctx, 16, -26, 24, -6, 7, dark);
    // 近腿
    line(ctx, -16, -26, -12 + g, -2, 8, fur);
    line(ctx, 12, -26, 16 - g, -2, 8, fur);
    // 身体
    ctx.beginPath();
    ctx.moveTo(-30, -30);
    ctx.quadraticCurveTo(-34, -62, -6, -66);
    ctx.quadraticCurveTo(22, -70, 30, -52);
    ctx.quadraticCurveTo(34, -34, 18, -28);
    ctx.quadraticCurveTo(-8, -24, -30, -30);
    ctx.closePath();
    shape(ctx, fur, 1.8);
    // 肚皮浅色
    ctx.beginPath();
    ctx.moveTo(-14, -30); ctx.quadraticCurveTo(0, -26, 16, -32);
    ctx.quadraticCurveTo(6, -46, -12, -44); ctx.closePath();
    shape(ctx, 'rgba(255,235,205,0.22)', 0);
    // 鬃毛（狮 / 猪）
    if (art.mane) {
      for (let i = 0; i < 9; i++) {
        const a = -2.5 + i * 0.36;
        const bx = 26 + Math.cos(a) * 16, by = -62 + Math.sin(a) * 16;
        circle(ctx, bx, by, 8.5); shape(ctx, body || art.mane, 1.2);
      }
    }
    // 头
    if (snout === 'fish') {
      // 鱼妖：圆头、巨眼、厚唇、鳃线、背鳍、尾鳍——靠"鱼"的特征，别做成老鼠
      ctx.beginPath();
      if (ctx.ellipse) ctx.ellipse(40, -54, 18, 15, -0.12, 0, Math.PI * 2); else ctx.arc(40, -54, 16, 0, Math.PI * 2);
      shape(ctx, fur, 1.6);
      // 宽扁的鱼嘴：一条往下的弧，不再往前凸成尖嘴
      ctx.beginPath();
      ctx.moveTo(50, -62); ctx.quadraticCurveTo(58, -54, 50, -46);
      ctx.strokeStyle = '#3a1a12'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.stroke();
      // 鳃
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(30, -62 + i * 8);
        ctx.quadraticCurveTo(26, -56 + i * 8, 30, -50 + i * 8);
        ctx.strokeStyle = dark; ctx.lineWidth = 1.6; ctx.stroke();
      }
      // 巨眼
      circle(ctx, 38, -60, 7.2); ctx.fillStyle = body || '#fff8e6'; ctx.fill();
      circle(ctx, 40.5, -60, 3.4); ctx.fillStyle = '#161018'; ctx.fill();
      circle(ctx, 41.6, -61.4, 1.2); ctx.fillStyle = '#fff'; ctx.fill();
      // 背鳍 + 侧鳍 + 尾鳍
      ctx.beginPath();
      ctx.moveTo(12, -66); ctx.quadraticCurveTo(22, -88, 34, -66); ctx.closePath();
      shape(ctx, body || art.fin || '#e8b48a', 1.2);
      ctx.beginPath();
      ctx.moveTo(12, -44); ctx.quadraticCurveTo(4, -30, 24, -32); ctx.closePath();
      shape(ctx, body || art.fin || '#e8b48a', 1.1);
      ctx.beginPath();
      ctx.moveTo(-30, -46); ctx.quadraticCurveTo(-52, -58, -48, -40);
      ctx.quadraticCurveTo(-52, -24, -30, -34); ctx.closePath();
      shape(ctx, body || art.fin || '#e8b48a', 1.2);
      // 鳞片
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(-14 + i * 11, -50 + (i % 2) * 5, 5.5, 0.2, Math.PI - 0.2);
        ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.2; ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(18, -64); ctx.quadraticCurveTo(42, -76, 52, -58);
      ctx.quadraticCurveTo(56, -44, 40, -40);
      ctx.quadraticCurveTo(24, -38, 18, -48);
      ctx.closePath();
      shape(ctx, fur, 1.6);
      if (snout === 'pig') {
        // 猪鼻：椭圆 + 两孔 + 獠牙
        ctx.beginPath();
        if (ctx.ellipse) ctx.ellipse(50, -54, 8, 6.5, 0, 0, Math.PI * 2); else ctx.arc(50, -54, 7, 0, Math.PI * 2);
        shape(ctx, body || '#c98a8a', 1.1);
        circle(ctx, 48, -55, 1.7); ctx.fillStyle = '#5a2a2a'; ctx.fill();
        circle(ctx, 53, -55, 1.7); ctx.fillStyle = '#5a2a2a'; ctx.fill();
      } else if (snout === 'lion') {
        // 方吻 + 鼻 + 大獠牙
        rr(ctx, 42, -60, 16, 16, 5); shape(ctx, body || '#d8bc8a', 1.2);
        circle(ctx, 50, -54, 2.4); ctx.fillStyle = '#2a1a1a'; ctx.fill();
      } else {
        // 猿：短吻 + 大眉骨
        ctx.beginPath();
        if (ctx.ellipse) ctx.ellipse(47, -52, 8, 7, 0, 0, Math.PI * 2); else ctx.arc(47, -52, 7, 0, Math.PI * 2);
        shape(ctx, body || '#c9ab84', 1.1);
        line(ctx, 24, -68, 46, -64, 4, dark);
      }
      if (art.tusk) {
        ctx.fillStyle = body || '#fff6e2';
        for (const s2 of [1, -1]) {
          ctx.beginPath();
          ctx.moveTo(46 + s2 * 2, -46); ctx.quadraticCurveTo(50 + s2 * 3, -34, 44 + s2 * 2, -40);
          ctx.closePath(); ctx.fill();
        }
      }
      // 眼
      circle(ctx, 38, -62, 4.2); ctx.fillStyle = body || '#ffce4a'; ctx.fill();
      circle(ctx, 39, -62, 1.8); ctx.fillStyle = '#1a1008'; ctx.fill();
    }
    // 尾
    ctx.beginPath();
    ctx.moveTo(-30, -44);
    ctx.quadraticCurveTo(-44, -50 + Math.sin(t / 240) * 6, -40, -30);
    ctx.strokeStyle = dark; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.stroke();
    // 猿：长臂垂到地上 + 深色面罩，别和猪/狮混成一团
    if (snout === 'ape') {
      line(ctx, -10, -56, 4, -10, 9, dark);
      circle(ctx, 5, -7, 7); shape(ctx, dark, 1.2);
      line(ctx, 14, -60, 30, -14, 9.5, fur);
      circle(ctx, 31, -9, 7.5); shape(ctx, body || '#c9ab84', 1.2);
      ctx.beginPath();
      if (ctx.ellipse) ctx.ellipse(45, -54, 9.5, 8.5, 0, 0, Math.PI * 2); else ctx.arc(45, -54, 8.5, 0, Math.PI * 2);
      shape(ctx, 'rgba(26,36,32,0.5)', 0);
      line(ctx, 38, -60, 44, -58, 2.2, '#0f1614');
    }
  }

  function bossDragon(ctx, art, body, t) {
    const sc = body || art.scale || '#2f7d6b';
    const belly = body || art.belly || '#d9e8a8';
    const sway = Math.sin(t / 420) * 5;
    // 尾 + 身躯：一条粗线顺着身体爬上去（蛇形，不用方块）
    ctx.beginPath();
    ctx.moveTo(-46, -6);
    ctx.quadraticCurveTo(-22, -10, -12, -30);
    ctx.quadraticCurveTo(-4, -54, 10, -62);
    ctx.strokeStyle = sc; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = belly; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
    // 背鳍
    for (let i = 0; i < 5; i++) {
      const bx = -34 + i * 10, by = -12 - i * 10;
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(bx + 3, by - 9); ctx.lineTo(bx + 7, by - 1);
      ctx.closePath(); shape(ctx, body || '#7fd8b8', 0.9);
    }
    // 前爪
    line(ctx, 4, -56, 12, -36, 6, sc);
    for (let i = 0; i < 3; i++) line(ctx, 12, -36, 20 + i * 3, -30 - i * 2, 2.4, body || '#f2f7e8');
    line(ctx, -2, -48, -6, -28, 5.5, sc);
    // 脖子
    ctx.beginPath();
    ctx.moveTo(6, -58); ctx.quadraticCurveTo(16 + sway * 0.2, -84, 26 + sway * 0.4, -92);
    ctx.strokeStyle = sc; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();
    // 头：长吻 + 角 + 须 + 红眼
    const hx = 28 + sway * 0.4, hy = -94;
    ctx.save();
    ctx.translate(hx, hy); ctx.rotate(0.1 + Math.sin(t / 700) * 0.05);
    ctx.beginPath();
    ctx.moveTo(-6, 4); ctx.quadraticCurveTo(14, -6, 26, -2);
    ctx.quadraticCurveTo(30, 2, 22, 6); ctx.quadraticCurveTo(8, 10, -6, 4);
    ctx.closePath(); shape(ctx, sc, 1.4);
    // 嘴线 + 牙
    line(ctx, 8, 3, 24, 1, 1.6, '#1a2b24');
    ctx.fillStyle = body || '#fff6e2';
    ctx.beginPath(); ctx.moveTo(16, 2); ctx.lineTo(19, 7); ctx.lineTo(21, 1); ctx.closePath(); ctx.fill();
    // 角
    ctx.strokeStyle = body || art.horn || '#e6dcc4'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(-2, -16, 8, -14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-12, -12, -2, -12); ctx.stroke();
    // 须
    ctx.strokeStyle = body || '#ffd479'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(24, 4); ctx.quadraticCurveTo(34, 8, 30, 16); ctx.stroke();
    // 眼
    circle(ctx, 12, -2, 3.4); ctx.fillStyle = body || art.eye || '#ffd479'; ctx.fill();
    circle(ctx, 13, -2, 1.4); ctx.fillStyle = '#141a16'; ctx.fill();
    ctx.restore();
  }

  function bossQueen(ctx, art, body, t) {
    const skin = body || art.skin || '#8a4bb0';
    const cloth = body || art.cloth || '#3a1746';
    const g = Math.sin(t / 110) * 1.4;
    // 八条蜘蛛腿（从腰后撑开）
    for (let i = 0; i < 8; i++) {
      const left = i < 4, k = i % 4;
      const sgn = left ? -1 : 1;
      const fx = sgn * (26 + k * 11);
      const ph = Math.sin(t / 95 + i * 0.8) * 1.6;
      ctx.beginPath();
      ctx.moveTo(sgn * 4, -52 + k * 3);
      ctx.quadraticCurveTo(sgn * (24 + k * 7), -68 + ph, fx, -2 + ph * 0.5);
      ctx.strokeStyle = body || '#4a1f5e'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
    }
    // 蛛腹
    ctx.beginPath();
    if (ctx.ellipse) ctx.ellipse(-10, -40, 22, 18, 0.2, 0, Math.PI * 2); else ctx.arc(-10, -40, 19, 0, Math.PI * 2);
    shape(ctx, cloth, 1.5);
    for (let i = 0; i < 3; i++) { circle(ctx, -16 + i * 6, -44 + i * 2, 3.4); shape(ctx, body || '#c9a6ff', 0.8); }
    // 人形上身
    ctx.beginPath();
    ctx.moveTo(-6, -50); ctx.quadraticCurveTo(0, -76, 6, -80);
    ctx.quadraticCurveTo(14, -72, 12, -50);
    ctx.closePath(); shape(ctx, skin, 1.4);
    // 裙褶
    ctx.beginPath();
    ctx.moveTo(-8, -50); ctx.lineTo(14, -50); ctx.lineTo(18, -34); ctx.lineTo(-12, -34);
    ctx.closePath(); shape(ctx, cloth, 1.1);
    // 手臂 + 垂丝
    line(ctx, 4, -74, 20, -62, 4.5, skin);
    line(ctx, 2, -72, -12, -60, 4.5, skin);
    ctx.strokeStyle = body || 'rgba(230,220,255,0.75)'; ctx.lineWidth = 1.2;
    for (const s2 of [20, -12]) {
      ctx.beginPath(); ctx.moveTo(s2, -60); ctx.quadraticCurveTo(s2 + 4, -40, s2 - 2, -24 + g); ctx.stroke();
    }
    // 头 + 发髻 + 六眼
    circle(ctx, 5, -92, 13); shape(ctx, skin, 1.5);
    circle(ctx, 5, -104, 6.5); shape(ctx, body || '#22162a', 1);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();                        // 头冠尖
      ctx.moveTo(-4 + i * 7, -104); ctx.lineTo(-2 + i * 7, -114); ctx.lineTo(2 + i * 7, -104);
      ctx.closePath(); shape(ctx, body || '#c9a24a', 0.8);
    }
    for (let i = 0; i < 3; i++) {
      circle(ctx, -1 + i * 6, -94, 2.1); ctx.fillStyle = '#ff5e8a'; ctx.fill();
      circle(ctx, -1 + i * 6, -88, 1.5); ctx.fillStyle = '#ff9bb5'; ctx.fill();
    }
    ctx.fillStyle = '#2a1020';
    ctx.beginPath(); ctx.moveTo(-2, -83); ctx.lineTo(12, -83); ctx.lineTo(5, -79); ctx.closePath(); ctx.fill();
  }

  // ===== 小怪像素层 =====
  // 人物像素化之后小怪还是矢量，同框风格打架最凶的就是它们（天天贴脸）。
  // BOSS 保持矢量：86px 的大块头矢量细节反而撑得住气场，像素化性价比太低。
  const MON_LOOK = {
    imp:    { body: '#b5483b', dark: '#8e2f26', belly: '#e8a184', horn: '#f0e0c0', eye: '#2b1210', fang: '#fff8e6' },
    wolf:   { fur: '#7a5432', dark: '#462d17', hi: '#96693e', eye: '#ff4d4d', glint: '#fff2c0', fang: '#f2e8d5' },
    spider: { skin: '#5a2b6b', dark: '#3a1746', leg: '#6a2f80', hi: '#8e44ad', eye: '#ff6b6b', eye2: '#ff9b9b' },
  };

  function drawEnemyPx(ctx, e, t, scale) {
    const flash = e.hitFlash > 0;
    const k = scale || 1;
    // 变换栈与矢量版完全一致：出手前冲 / 受击顿身 / 起手下蹲
    const atkLeft = (e.atkUntil || 0) - t;
    const lunge = atkLeft > 0 ? Math.sin(Math.min(1, atkLeft / 260) * Math.PI) * 7 : 0;
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h);
    groundShadow(ctx, 0, 0, e.w * 0.42, 0.34);
    const sx = (e.facing || -1) < 0 ? -1 : 1;
    ctx.scale(sx * k, k);
    ctx.translate(lunge, 0);
    const hurtLeft = (e.hurtUntil || 0) - t;
    const hurtK = hurtLeft > 0 ? Math.sin(Math.min(1, hurtLeft / 200) * Math.PI) : 0;
    if (hurtK) { ctx.translate(-4.5 * hurtK, 0); ctx.rotate(-0.11 * hurtK); }
    const wind = e.state === 'windup' ? (e.tele || 0) : 0;
    if (wind > 0) { ctx.translate(-5.5 * wind, 1.6 * wind); ctx.rotate(-0.055 * wind); }

    const L = MON_LOOK[e.kind];
    const W = (c) => (flash ? '#f5f2ea' : c);
    const C = pxC, OUT = C(PX_OUT);
    const g = Math.sin(t / 130);              // 走路相位：腿前后交替
    const bob = Math.sin(t / 95) * 0.6;       // 身体起伏

    let BW, BH, OX, OY;
    if (e.kind === 'wolf') { BW = 32; BH = 24; OX = 16; OY = 23; }
    else if (e.kind === 'spider') { BW = 36; BH = 22; OX = 18; OY = 21; }
    else { BW = 28; BH = 24; OX = 14; OY = 23; }
    const p = new Painter(BW, BH);
    const X = (x) => x + OX, Y = (y) => y + OY;
    const cap = (a, b, r, col, noOut) => {
      if (!noOut) p.capsule(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), r + UND, OUT);
      p.capsule(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), r, C(W(col)));
    };
    const disc = (x, y, r, col, noOut) => {
      if (!noOut) p.disc(X(x), Y(y), r + UND, OUT);
      p.disc(X(x), Y(y), r, C(W(col)));
    };
    const poly = (pts, col, noOut) => {
      if (!noOut) {
        let mx = 0, my = 0;
        for (const q of pts) { mx += q[0]; my += q[1]; }
        mx /= pts.length; my /= pts.length;
        p.poly(pts.map((q) => [X(mx + (q[0] - mx) * 1.24), Y(my + (q[1] - my) * 1.24)]), OUT);
      }
      p.poly(pts.map((q) => [X(q[0]), Y(q[1])]), C(W(col)));
    };
    const dot = (x, y, c) => p.dot(X(x), Y(y), C(W(c)));
    const rect = (x, y, w, h, col) => p.rect(X(x), Y(y), w, h, C(W(col)));

    if (e.kind === 'wolf') {
      // 妖狼：弓背剪影 + 大尖耳 + 红瞳，靠轮廓认人
      cap([-9, -10], [-12.5, -14], 1.2, L.dark);                  // 尾巴上扬
      cap([-4, -7], [-4 - g, 0], 1.1, L.dark);                    // 远侧腿
      cap([3, -7], [3 + g, 0], 1.1, L.dark);
      poly([[-10, -8], [-11, -13.5], [-4, -16], [2, -16], [5.5, -12], [5, -7]], L.fur);   // 弓背身体
      cap([-8, -14], [0, -16.5], 0.45, L.hi, true);               // 背线高光
      poly([[4, -14], [9, -16], [12.5, -13], [11.5, -10.5], [5, -10]], L.fur);           // 长吻头
      poly([[4.2, -15], [2.8, -21.5], [8, -15.5]], L.dark);       // 大尖耳
      poly([[8.3, -16], [10, -22], [11.8, -15.5]], L.dark);
      dot(11.5, -11.5, L.fang);                                   // 獠牙
      dot(10.4, -10.8, L.fang);
      disc(8.2, -13, 0.95, L.eye, true);
      dot(8.5, -13.4, L.glint);
      cap([-5.5, -7], [-5.5 + g, 0], 1.3, L.fur);                 // 近侧腿
      cap([4.5, -7], [4.5 - g, 0], 1.3, L.fur);
    } else if (e.kind === 'spider') {
      // 毒蛛：八条细腿 + 大圆腹，腿带爬行相位
      // 这个尺寸画膝关节必糊成带子：经典小尺寸蜘蛛就是"圆身 + 斜刺腿"，每侧三条直线腿。
      // 腿根必须落在身体轮廓外（±5 以上），否则被后画的圆身盖住，只剩下垂的外半截
      for (let i = 0; i < 6; i++) {
        const sgn = i < 3 ? -1 : 1, kk = i % 3;
        const ph = Math.sin(t / 90 + i * 0.8) * 0.9;
        cap([sgn * (4.6 + kk * 0.9), -12], [sgn * (7.2 + kk * 3.6), -0.4 + ph], 0.62, L.leg);
      }
      disc(-2.5, -10, 4.6, L.skin);                               // 腹部
      disc(-2.5, -12.2, 2.1, L.hi, true);                         // 背脊亮斑
      disc(3.5, -10.5, 2.9, L.skin);                              // 头胸部
      poly([[5.5, -9], [8, -6.5], [4.5, -7.5]], L.dark);          // 螯肢
      disc(4.6, -11.6, 1, L.eye, true);
      disc(6.2, -10.6, 0.8, L.eye, true);
      dot(3, -12.2, L.eye2);
    } else {
      // 小妖：短腿圆身 + 双角 + 獠牙
      cap([-3, -6], [-4 - g, 0], 1.5, L.dark);
      cap([3, -6], [4 + g, 0], 1.5, L.dark);
      cap([-8, -13 + bob], [-12, -7], 1.2, L.dark);               // 外撑的手臂
      cap([8, -13 + bob], [12, -7], 1.2, L.dark);
      disc(0, -11 + bob, 5, L.body);                              // 圆身
      disc(0, -14.5 + bob, 3.9, L.body);
      disc(0.5, -9.5 + bob, 2.2, L.belly, true);                  // 肚皮
      poly([[-3, -17.5 + bob], [-5.5, -22 + bob], [-1.2, -18 + bob]], L.horn);
      poly([[3, -17.5 + bob], [5.5, -22 + bob], [1.2, -18 + bob]], L.horn);
      disc(-1.8, -13.5 + bob, 0.95, L.eye, true);
      disc(1.8, -13.5 + bob, 0.95, L.eye, true);
      rect(-2.2, -7.5 + bob, 1, 1.6, L.fang);
      rect(1.2, -7.5 + bob, 1, 1.6, L.fang);
    }
    if (e.kind !== 'spider') {
      p.outline(OUT);
      p.ao(OUT, 0.8);
      p.rimLight(OUT, C('#e8b45e'), sx > 0 ? 1 : -1, -1);
    }
    const kk = PX_UNIT;
    ctx.imageSmoothingEnabled = false;
    pxBlit(ctx, p, -OX * kk, -OY * kk, kk);
    ctx.imageSmoothingEnabled = true;
    ctx.restore();
  }

  // ============================================================
  // ===== 首领像素层：七套骨架覆盖 12 只首领 =====
  // 人物/小怪已像素化，首领再留矢量就同框打架——全部改走像素栅格。
  // 像素密度与小怪一致（约 2.8 世界单位/像素），同一套墨线笔法。
  //   demon  ：人形魔头（混世魔王/黄袍怪/红孩儿——角、火焰发、枪刀参数化）
  //   beast  ：四足兽（猪/狮/猿/鱼——口鼻、鬃毛、鳍参数化）
  //   dragon ：蛇形龙（鹰愁涧毒龙）
  //   queen  ：蛛后人形（盘丝洞蜘蛛精）
  //   bear   ：黑熊精（披袈裟）
  //   bone   ：白骨精（骨裙+双骨刃）
  //   bull   ：牛魔王（重甲+巨斧）
  // ============================================================
  function makePen(p, ox, oy, flash) {
    const C = pxC, OUT = C(PX_OUT);
    const W = (c) => (flash ? '#f5f2ea' : c);
    const X = (x) => x + ox, Y = (y) => y + oy;
    const cap = (a, b, r, col, noOut) => {
      if (!noOut) p.capsule(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), r + UND, OUT);
      p.capsule(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), r, C(W(col)));
    };
    const disc = (x, y, r, col, noOut) => {
      if (!noOut) p.disc(X(x), Y(y), r + UND, OUT);
      p.disc(X(x), Y(y), r, C(W(col)));
    };
    const wire = (a, b, col) => p.capsule(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), 0.45, C(W(col)));
    const poly = (pts, col, noOut) => {
      if (!noOut) {
        let mx = 0, my = 0;
        for (const q of pts) { mx += q[0]; my += q[1]; }
        mx /= pts.length; my /= pts.length;
        // 首领形体大，描边按"每点向外顶 1 格"而不是按比例放大（比例放大在 15 格半径上会顶出 3 格粗线）
        p.poly(pts.map((q) => {
          const dx = q[0] - mx, dy = q[1] - my;
          const d = Math.hypot(dx, dy) || 1;
          return [X(q[0] + dx / d), Y(q[1] + dy / d)];
        }), OUT);
      }
      p.poly(pts.map((q) => [X(q[0]), Y(q[1])]), C(W(col)));
    };
    const dot = (x, y, c) => p.dot(X(x), Y(y), C(W(c)));
    const rect = (x, y, w, h, col) => p.rect(X(x), Y(y), w, h, C(W(col)));
    const chain = (pts, r, col, noOut) => {
      for (let i = 0; i + 1 < pts.length; i++) cap(pts[i], pts[i + 1], r, col, noOut);
    };
    return { C, OUT, W, cap, disc, wire, poly, dot, rect, chain };
  }

  const BOSS_PX_DEF = {
    // —— 人形魔头（默认约 54 格身高的战斗姿态）——
    demon: { w: 52, h: 76, ox: 24, oy: 70, bodyH: 54, draw(pen, art, t) {
      const skin = art.skin || '#5d6b52', cloth = art.cloth || '#3b2f24';
      const dark = '#2a1e16', gold = '#c9a24a';
      const bob = Math.sin(t / 460) * 0.8;
      // 后臂 / 双腿（先画，躯干压住腿根）
      pen.cap([-4, -41 + bob], [-7.5, -28 + bob], 1.9, dark);
      pen.cap([-6, -21 + bob], [-7.5, 0], 2.7, dark);
      pen.cap([5.5, -21 + bob], [7, 0], 2.7, dark);
      pen.rect(-10, -3.4, 6, 3.4, '#1c130d'); pen.rect(4, -3.4, 6.4, 3.4, '#1c130d');
      // 躯干 + 胸口纹样 + 腰带
      pen.cap([0, -45 + bob], [0, -21 + bob], 6.6, cloth);
      pen.wire([4.6, -43 + bob], [4.6, -25 + bob], gold);
      pen.cap([-6.4, -25 + bob], [6.4, -25 + bob], 1.2, gold);
      pen.disc(1.2, -37 + bob, 1.8, gold, true);
      // 头
      pen.disc(3, -52 + bob, 5.2, skin);
      pen.wire([-0.6, -53.6 + bob], [7, -53.2 + bob], '#1d1510');
      for (const ex of [1.4, 6]) {
        pen.disc(ex, -51.4 + bob, 0.95, '#ffd479', true);
        pen.dot(ex + 0.4, -51.4 + bob, '#1a0d08');
      }
      pen.dot(2.4, -47.6 + bob, '#fff8e6'); pen.dot(5.2, -47.9 + bob, '#fff8e6');
      // 束发金环 / 后飘盔缨
      pen.wire([-1.6, -55.2 + bob], [7.8, -54.6 + bob], art.plume || '#c0392b');
      pen.chain([[0, -55 + bob], [-5, -57 + bob], [-9, -55.5 + bob]], 0.9, art.plume || '#c0392b');
      // 角（混世魔王）——短而贴头，避免"兔耳"感
      if (art.horn) {
        pen.chain([[1, -55.4 + bob], [-0.2, -58.8 + bob], [-2.6, -60.2 + bob]], 0.85, '#e8dcc8');
        pen.chain([[5, -55.8 + bob], [6.2, -59 + bob], [8.6, -60 + bob]], 0.85, '#e8dcc8');
      }
      // 火焰发（红孩儿）
      if (art.flame) {
        for (let i = 0; i < 4; i++) {
          const f = Math.sin(t / 120 + i * 1.3) * 2;
          pen.poly([[-1 + i * 2.6, -56 + bob], [-2.6 + i * 2.6, -63 - f + bob], [0.4 + i * 2.6, -57 + bob]],
            i % 2 ? '#ff6a1e' : '#ffb03a', true);
        }
      }
      // 兵器（枪 / 大刀）
      if (art.weapon === 'spear') {
        pen.rect(11.4, -60 + bob, 2, 42, '#5b4a32');
        pen.poly([[12.4, -68 + bob], [14.2, -63 + bob], [12.4, -60.5 + bob], [10.6, -63 + bob]],
          art.flame ? '#ffb03a' : '#cfd6de');
      } else {
        pen.rect(11.4, -58 + bob, 2, 40, '#5b4a32');
        pen.poly([[11.2, -58 + bob], [19.5, -52 + bob], [20.5, -45 + bob], [12, -49 + bob]], '#cfd6de');
        pen.poly([[11.6, -52 + bob], [17, -49 + bob], [16.4, -45 + bob], [11.8, -48 + bob]], '#7d858f', true);
        pen.rect(9, -50 + bob, 7, 2, gold);
      }
      // 前臂压在兵器上
      pen.cap([4.2, -42 + bob], [11.2, -32 + bob], 2.1, cloth);
      pen.disc(11.4, -31 + bob, 1.7, skin);
    } },

    // —— 四足兽（猪 / 狮 / 猿 / 鱼）——
    beast: { w: 70, h: 54, ox: 34, oy: 48, bodyH: 46, draw(pen, art, t) {
      const fur = art.fur || '#6b5442', dark = art.furDark || '#493729';
      const snout = art.snout || 'pig';
      const g = Math.sin(t / 130);
      // 远侧腿（起点埋进躯干内部，避免与身体脱节悬空）
      pen.cap([-14, -25], [-14 - g * 2, 0], 1.6, dark);
      pen.cap([8, -25], [8 + g * 2, 0], 1.6, dark);
      // 尾（鱼的尾鳍另画）
      if (snout !== 'fish') {
        pen.chain([[-20, -28], [-26, -31], [-24.5, -34.5]], 0.9, dark);
      }
      // 躯干
      pen.cap([-16, -29], [14, -31], 8, fur);
      pen.wire([-12, -24], [-2, -23.4], dark);
      // 近侧腿（同样埋进躯干）
      pen.cap([-9, -26], [-9 + g * 2, 0], 1.9, fur);
      pen.cap([13, -26], [13 - g * 2, 0], 1.9, fur);
      // 鬃毛（猪的金钱鬃 / 狮的深色鬃）——狮用更深的墨绿拉开与皮毛的对比
      if (art.mane) {
        const maneC = snout === 'lion' ? '#0e2e22' : art.mane;
        for (let i = 0; i < 5; i++) {
          const a = -1.9 + i * 0.42;
          pen.disc(22 + Math.cos(a) * 9, -34 + Math.sin(a) * 9, snout === 'pig' ? 3.5 : 3, maneC);
        }
      }
      // 头
      pen.disc(24, -35, 6, fur);
      if (snout === 'pig') {
        pen.disc(30.5, -33, 3.4, '#e79c8f');
        pen.dot(29.4, -33, '#8c4b46'); pen.dot(31.8, -33, '#8c4b46');
        pen.dot(28.6, -29.6, '#fff8e6'); pen.dot(32.4, -29.6, '#fff8e6');
      } else if (snout === 'lion') {
        pen.rect(28, -37, 7.4, 6.4, '#d8bc8a');
        pen.dot(31.4, -35.4, '#2a1a1a');
        pen.poly([[28.4, -30.2], [27, -24.8], [30.8, -29.6]], '#fff8e6', true);
        pen.poly([[34.2, -30.2], [35.6, -24.8], [32, -29.6]], '#fff8e6', true);
      } else if (snout === 'ape') {
        // 猿：深色面罩 + 长臂垂地（面罩用近黑的深绿，和皮毛拉开层次）
        pen.disc(25.5, -35.5, 4.6, '#14231b');
        pen.disc(29, -33, 2.9, '#c9ab84');
        pen.wire([23, -38.4], [28, -37.6], '#0f1614');
        pen.cap([-4, -31], [-3, -3], 3, dark);
        pen.disc(-3, -2, 2.1, '#c9ab84');
        pen.cap([5, -33], [9, -4], 3.2, fur);
        pen.disc(9.4, -3, 2.2, '#c9ab84');
      } else {
        // 鱼：巨眼 + 背鳍 + 尾鳍 + 鳃线
        pen.disc(24, -35, 6.6, fur);
        pen.disc(23.4, -37, 2.7, '#fff8e6');
        pen.dot(24.4, -37, '#161018');
        pen.wire([27, -31.4], [31, -30.8], '#3a1a12');
        pen.wire([19.8, -39], [18.6, -33.4], '#5a2c10');
        pen.wire([17.6, -38.6], [16.6, -34.2], '#5a2c10');
        pen.poly([[-4, -37], [-1.6, -45], [4.4, -39]], art.fin || '#e8b48a', true);
        pen.poly([[-13, -29.4], [-9.4, -25.6], [-5, -30.4]], art.fin || '#e8b48a', true);
        pen.poly([[-22, -30], [-30, -38.4], [-30, -22]], art.fin || '#e8b48a');
        for (let i = 0; i < 3; i++) pen.dot(-8 + i * 6, -33 + (i % 2) * 3, dark);
      }
      if (snout !== 'fish') {
        pen.disc(23, -38.4, 1.05, '#ffd479', true);
        pen.dot(23.5, -38.4, '#1a1008');
      }
      if (art.tusk && snout === 'pig') {
        pen.poly([[28.8, -31], [28, -26.4], [30.4, -30.4]], '#fff8e6', true);
        pen.poly([[32.2, -31], [33.2, -26.4], [30.8, -30.4]], '#fff8e6', true);
      }
    } },

    // —— 蛇形龙（鹰愁涧毒龙）——
    dragon: { w: 78, h: 74, ox: 44, oy: 68, bodyH: 58, draw(pen, art, t) {
      const sc = art.sc || '#2f7d6b', belly = art.belly || '#d9e8a8';
      const sway = Math.sin(t / 420) * 1.4;
      // 尾 → 身 → 肩 的蛇形链
      pen.chain([[-38, -8], [-24, -13], [-10, -26], [2, -40]], 5.2, sc);
      // 腹鳞（顺着链的下缘走三段 + 一排鳞点，加强"肚皮"识别度）
      pen.wire([-24, -10], [-13, -20], belly);
      pen.wire([-13, -20], [-3, -33], belly);
      pen.wire([-3, -33], [3, -42], belly);
      for (const s of [[-23, -12], [-15, -19], [-7, -28], [0, -38]]) pen.disc(s[0], s[1], 1.1, belly, true);
      // 背鳍
      for (const f of [[-25, -18], [-13, -30], [-1, -44]]) {
        pen.poly([[f[0] - 2.4, f[1]], [f[0] - 0.4, f[1] - 6], [f[0] + 2.8, f[1] - 0.8]], '#7fd8b8', true);
      }
      // 前爪
      pen.cap([1, -40], [5, -30], 2, sc);
      for (let i = 0; i < 3; i++) pen.dot(5.4 + i * 1.6, -29 - i * 0.8, '#f2f7e8');
      pen.cap([-4, -32], [-6, -24], 1.8, sc);
      // 脖子
      pen.cap([2, -43], [10 + sway * 0.4, -54], 3.7, sc);
      // 头：长吻 + 角 + 须 + 红瞳
      const hx = 13 + sway * 0.5;
      pen.disc(hx + 2, -55, 4.4, sc);
      pen.poly([[hx + 4, -57.4], [hx + 12, -56.4], [hx + 11.4, -52.6], [hx + 4, -52]], sc);
      pen.wire([hx + 4, -53.4], [hx + 10.4, -53], '#1a2b24');
      pen.dot(hx + 10.6, -53.4, '#fff6e2');
      pen.chain([[hx - 1, -58.6], [hx - 3, -63], [hx - 7.4, -63.4]], 0.85, art.horn || '#e6dcc4');
      // 龙须（金色，加粗成小链而不是细线）
      pen.chain([[hx + 11.6, -52], [hx + 14, -50], [hx + 16.2, -47.6]], 0.7, '#ffd479');
      pen.disc(hx + 2.4, -56.6, 1.7, art.eye || '#ffd479', true);
      pen.disc(hx + 3, -56.6, 0.75, '#141a16', true);
    } },

    // —— 蛛后（盘丝洞蜘蛛精：人形上身 + 蛛腹 + 六腿）——
    queen: { w: 74, h: 62, ox: 37, oy: 58, bodyH: 50, noOutline: true, draw(pen, art, t) {
      const skin = art.skin || '#8a4bb0', cloth = art.cloth || '#3a1746';
      // 六条蛛腿（先画，腹压住腿根）
      for (let i = 0; i < 6; i++) {
        const sgn = i < 3 ? -1 : 1, k = i % 3;
        const ph = Math.sin(t / 95 + i * 0.8) * 1.4;
        pen.cap([sgn * 2.4, -26], [sgn * (14 + k * 9.5), -0.6 + ph], 1.1, '#4a1f5e');
      }
      // 蛛腹 + 背纹
      pen.disc(-9, -22, 8.6, cloth);
      for (let i = 0; i < 3; i++) pen.disc(-14 + i * 5, -25 + i * 2.2, 1.5, '#c9a6ff', true);
      // 人形：裙腰 + 上身
      pen.poly([[-4, -26], [8, -26], [10, -32], [-6, -32]], cloth);
      pen.cap([1, -41], [1, -30], 3.9, skin);
      pen.wire([4.2, -39], [4.2, -31], '#5e2f80');
      // 手臂 + 垂丝
      pen.cap([3, -37], [9, -31], 1.6, skin);
      pen.cap([-1, -37], [-7, -30], 1.6, skin);
      const sw = Math.sin(t / 300) * 1.2;
      pen.wire([9, -30], [10 + sw, -15], '#e6dcff');
      pen.wire([-7, -29], [-8 - sw, -14], '#e6dcff');
      // 头 + 发髻 + 冠 + 六眼
      pen.disc(2, -46, 4.5, skin);
      pen.disc(1, -51, 2.1, '#22162a');
      for (let i = 0; i < 3; i++) pen.dot(-1.4 + i * 2.6, -51.6, '#c9a24a');
      for (let i = 0; i < 3; i++) {
        pen.disc(-0.4 + i * 2.4, -46.4, 0.72, '#ff5e8a', true);
        pen.disc(0.2 + i * 2.2, -44.6, 0.5, '#ff9bb5', true);
      }
      pen.poly([[-0.6, -43], [4, -43], [1.8, -41.4]], '#2a1020', true);
    } },

    // —— 黑熊精 ——
    bear: { w: 46, h: 78, ox: 22, oy: 72, bodyH: 52, draw(pen, art, t) {
      const fur = '#41301f', dark = '#2a1d12';
      const bob = Math.sin(t / 460) * 0.7;
      // 腿
      pen.cap([-10, -16], [-11.5, 0], 3.4, dark);
      pen.cap([8, -16], [9.5, 0], 3.4, fur);
      pen.rect(-14.6, -3.6, 7, 3.6, '#1a120a'); pen.rect(6, -3.6, 7.4, 3.6, '#1a120a');
      // 身（大圆）+ 肩
      pen.disc(-1, -28 + bob, 13, fur);
      pen.disc(4, -38 + bob, 8, fur);
      // 偷来的袈裟：斜披红带 + 金腰带
      pen.poly([[-10, -40 + bob], [-4, -41.5 + bob], [8, -22 + bob], [2, -17 + bob]], '#b8442c', true);
      pen.cap([-10, -24 + bob], [8, -24 + bob], 1.5, '#e0a03a');
      // 头 + 耳 + 口鼻
      pen.disc(3, -54 + bob, 2.7, dark);
      pen.disc(13, -54 + bob, 2.7, dark);
      pen.disc(8, -48 + bob, 7, fur);
      pen.disc(12, -46 + bob, 3.3, '#c8ab84');
      pen.dot(13, -47.4 + bob, '#20140e');
      pen.disc(7, -49.6 + bob, 1.05, '#ffd479', true);
      pen.disc(12.6, -50 + bob, 1.05, '#ffd479', true);
      pen.dot(7.4, -49.6 + bob, '#120a06'); pen.dot(13, -50 + bob, '#120a06');
      // 黑缨枪
      pen.rect(20, -64 + bob, 2, 58, '#3a2e20');
      pen.poly([[21, -68 + bob], [23.6, -62 + bob], [21, -59.6 + bob], [18.4, -62 + bob]], '#c9cfd6');
      pen.chain([[21, -59 + bob], [18.8, -55 + bob]], 1.3, '#1c1a22');
      // 前臂搭在枪上
      pen.cap([8, -38 + bob], [20, -40 + bob], 2.7, fur);
      pen.disc(20, -40 + bob, 1.9, dark);
    } },

    // —— 白骨精（骨裙 + 双骨刃）——
    bone: { w: 52, h: 60, ox: 25, oy: 54, bodyH: 50, scaleMul: 1.12, draw(pen, art, t) {
      const bone = '#ece6d8', cloth = '#1a1622';
      const sway = Math.sin(t / 380) * 0.8;
      // 破裙（锯齿下摆）
      pen.poly([[-9, -38], [9, -38], [13, -2], [-13, -2]], cloth);
      for (let i = 0; i < 4; i++) {
        const x = -12 + i * 6.6;
        pen.poly([[x, -3], [x + 4.4, -3], [x + 2.2, 2.6]], cloth, true);
      }
      // 脊柱 + 肋骨
      pen.wire([0, -38], [0, -14], bone);
      pen.wire([-7, -32], [7, -32], bone);
      pen.wire([-6.2, -28], [6.2, -28], bone);
      pen.wire([-5.2, -24], [5.2, -24], bone);
      // 双肩 + 手臂
      pen.disc(-7, -38, 1.9, bone);
      pen.disc(7, -38, 1.9, bone);
      pen.wire([-7, -38], [-11, -27 + sway], bone);
      pen.wire([7, -38], [13, -30 - sway], bone);
      // 双骨刃（一上一下）
      pen.poly([[13, -31 - sway], [22, -40 - sway], [24, -44 - sway], [15, -35 - sway]], bone);
      pen.poly([[-11, -27 + sway], [-19, -20 + sway], [-21, -15 + sway], [-13, -24 + sway]], bone);
      // 头骨：眼窝幽绿 + 牙
      pen.disc(1, -46, 5.1, bone);
      pen.rect(-1.6, -42.4, 6.6, 2.8, bone);
      pen.wire([-0.4, -42.2], [-0.4, -39.8], '#8d8578');
      pen.wire([1.6, -42.2], [1.6, -39.8], '#8d8578');
      pen.wire([3.6, -42.2], [3.6, -39.8], '#8d8578');
      pen.disc(-0.6, -47, 1.75, '#0b0f12', true);
      pen.disc(4, -47, 1.75, '#0b0f12', true);
      pen.dot(-0.2, -47, '#7ef0c0'); pen.dot(4.4, -47, '#7ef0c0');
      pen.dot(1.8, -44.4, '#0b0f12');
    } },

    // —— 牛魔王（重甲 + 巨斧）——
    bull: { w: 56, h: 78, ox: 28, oy: 72, bodyH: 56, draw(pen, art, t) {
      const hide = '#8e2b2b', hideDark = '#5e1a1a', iron = '#3b3f4a';
      const bob = Math.sin(t / 460) * 0.8;
      // 后臂（甩在身后）
      pen.cap([-6, -46 + bob], [-14, -36 + bob], 2.7, hideDark);
      pen.disc(-14.6, -35.4 + bob, 2, hideDark);
      // 双腿 + 蹄
      pen.cap([-11, -24 + bob], [-12.5, 0], 3.5, hideDark);
      pen.cap([7, -24 + bob], [8.5, 0], 3.5, hide);
      pen.rect(-16.8, -4, 8.4, 4, '#2a2028'); pen.rect(4.4, -4, 8.8, 4, '#2a2028');
      // 躯干 + 胸甲 + 铆钉 + 金腰带
      pen.cap([0, -50 + bob], [0, -26 + bob], 9.2, hide);
      pen.rect(-8.6, -49 + bob, 17.4, 10.5, iron);
      for (let i = 0; i < 3; i++) pen.disc(-4.4 + i * 4.6, -43.6 + bob, 1.05, '#b8c0cc', true);
      pen.cap([-8.8, -27 + bob], [8.8, -27 + bob], 1.5, '#c9a24a');
      // 头：宽口鼻 + 怒眉（两段斜压）+ 鼻环
      pen.disc(4, -58 + bob, 6.6, hide);
      pen.disc(8.6, -53 + bob, 4, '#c2685e');
      pen.dot(7, -53.6 + bob, '#4a1a1a'); pen.dot(10.2, -53.6 + bob, '#4a1a1a');
      pen.wire([-0.2, -61.8 + bob], [5, -60.8 + bob], '#2a0c0a');
      pen.wire([7.4, -60.8 + bob], [12.4, -59.6 + bob], '#2a0c0a');
      pen.disc(3, -59.4 + bob, 1.15, '#ffd479', true);
      pen.disc(9.4, -59.8 + bob, 1.15, '#ffd479', true);
      pen.dot(3.5, -59.4 + bob, '#1a0d08'); pen.dot(9.9, -59.8 + bob, '#1a0d08');
      // 鼻环：金色小环挂在鼻中隔（游戏内约 1 逻辑像素/格，做大一点才看得见）
      pen.chain([[8.2, -48.8 + bob], [7, -46 + bob], [9, -44.6 + bob]], 1.1, '#ffd479');
      // 双角（左右对称）
      pen.chain([[-1, -63 + bob], [-4, -68.5 + bob], [-9, -68 + bob]], 1.5, '#e8dcc8');
      pen.chain([[9, -63 + bob], [12, -68.5 + bob], [17, -68 + bob]], 1.5, '#e8dcc8');
      pen.dot(-8, -67.4 + bob, '#f7f2e6'); pen.dot(16, -67.4 + bob, '#f7f2e6');
      // 巨斧（刃面加大一圈，配"巨"字）
      pen.rect(19, -66 + bob, 2.8, 46, '#5b4a32');
      pen.poly([[21, -66 + bob], [32.4, -58 + bob], [33.4, -44 + bob], [21.8, -52 + bob]], '#c9cfd6');
      pen.poly([[21.6, -58 + bob], [29, -54 + bob], [28.4, -47 + bob], [21.8, -52 + bob]], '#7d858f', true);
      // 前臂压在斧柄上
      pen.cap([8, -46 + bob], [20, -38 + bob], 2.9, hide);
      pen.disc(20, -38 + bob, 2.1, hide);
    } },
  };

  function drawBossPx(ctx, e, t) {
    const art = e.art || {};
    const kind = art.kind || e.variant || 'bull';
    const def = BOSS_PX_DEF[kind] || BOSS_PX_DEF.bull;
    const flash = e.hitFlash > 0;
    // 像素密度与小怪对齐（约 2.8 世界单位/格）；变体按开方温和放大
    const rawScale = typeof art.scale === 'number' && art.scale > 0 ? art.scale : 1;
    const pk = 2.8 * (def.scaleMul || 1) * (art.small ? 0.86 : Math.sqrt(rawScale));

    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h);
    groundShadow(ctx, 0, 0, e.w * 0.46, 0.38);
    const sx = (e.facing || -1) < 0 ? -1 : 1;
    ctx.scale(sx, 1);
    // 出手前冲 / 受击顿身 / 起手下蹲（位移按像素格换算，量级与小怪一致）
    const atkLeft = (e.atkUntil || 0) - t;
    const lunge = atkLeft > 0 ? Math.sin(Math.min(1, atkLeft / 260) * Math.PI) * 9 : 0;
    ctx.translate(lunge * pk, 0);
    const hurtLeft = (e.hurtUntil || 0) - t;
    const hurtK = hurtLeft > 0 ? Math.sin(Math.min(1, hurtLeft / 200) * Math.PI) : 0;
    if (hurtK) { ctx.translate(-5.5 * hurtK * pk, 0); ctx.rotate(-0.09 * hurtK); }
    const wind = e.state === 'windup' ? (e.tele || 0) : 0;
    if (wind > 0) { ctx.translate(-6 * wind * pk, 1.8 * wind * pk); ctx.rotate(-0.05 * wind); }

    const p = new Painter(def.w, def.h);
    const pen = makePen(p, def.ox, def.oy, flash);
    def.draw(pen, art, t);
    if (!def.noOutline) {
      p.outline(pen.OUT);
      p.ao(pen.OUT, 0.8);
      p.rimLight(pen.OUT, pxC('#e8b45e'), sx > 0 ? 1 : -1, -1);
    }
    ctx.imageSmoothingEnabled = false;
    pxBlit(ctx, p, -def.ox * pk, -def.oy * pk, pk);
    ctx.imageSmoothingEnabled = true;
    ctx.restore();
  }

  Art.drawEnemy = function (ctx, e, t, scale) {
    // Q 版卡通层优先（人物/小怪同风格）；像素层保留作兜底
    if (XY.Toon && XY.Toon.enabled && XY.Toon.drawEnemy && XY.Toon.drawEnemy(ctx, e, t)) return;
    // 小怪与首领都走像素层（与角色同一套像素笔、同一档像素密度）；测试环境（无 document）走矢量
    if (Art.pixelMode && canPixel()) {
      if (e.isBoss) { drawBossPx(ctx, e, t); return; }
      if (MON_LOOK[e.kind]) { drawEnemyPx(ctx, e, t, scale); return; }
    }
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
    // 被打：身体向后一顿 + 后仰，让每次命中都有反馈
    const hurtLeft = (e.hurtUntil || 0) - t;
    const hurtK = hurtLeft > 0 ? Math.sin(Math.min(1, hurtLeft / 200) * Math.PI) : 0;
    if (hurtK) { ctx.translate(-4.5 * hurtK, 0); ctx.rotate(-0.11 * hurtK); }
    // 起手：往后一沉 + 微微下蹲，让玩家看得出"要打了"
    const wind = e.state === 'windup' ? (e.tele || 0) : 0;
    if (wind > 0) { ctx.translate(-5.5 * wind, 1.6 * wind); ctx.rotate(-0.055 * wind); }
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
      const art = e.art || { kind: e.variant || 'bull' };
      const ak = art.kind || e.variant || 'bull';
      if (ak === 'bear') {
        // 黑熊精：又壮又圆，披了件偷来的袈裟，手里一杆黑缨枪
        const fur = body || '#41301f', furDark = body || '#2a1d12';
        // 腿
        rr(ctx, -20, -22, 15, 22, 6); shape(ctx, furDark, 1.2);
        rr(ctx, 4, -22, 15, 22, 6); shape(ctx, fur, 1.2);
        // 身子
        rr(ctx, -25, -66, 50, 50, 18); shape(ctx, fur, 1.8);
        // 偷来的袈裟：斜披 + 腰带
        ctx.save();
        rr(ctx, -25, -66, 50, 50, 18); ctx.clip();
        ctx.beginPath();
        ctx.moveTo(-26, -66); ctx.lineTo(-2, -66); ctx.lineTo(-14, -16); ctx.lineTo(-26, -20);
        ctx.closePath(); shape(ctx, body || '#b8442c', 1.2);
        rr(ctx, -26, -34, 52, 8, 2); shape(ctx, body || '#e0a03a', 1);
        ctx.restore();
        // 头 + 耳朵
        circle(ctx, 4, -72, 19); shape(ctx, fur, 1.6);
        circle(ctx, -8, -88, 7); shape(ctx, furDark, 1.2);
        circle(ctx, 15, -89, 7); shape(ctx, furDark, 1.2);
        // 口鼻
        ctx.beginPath();
        if (ctx.ellipse) ctx.ellipse(12, -66, 9, 7, 0, 0, Math.PI * 2); else ctx.arc(12, -66, 8, 0, Math.PI * 2);
        shape(ctx, body || '#c8ab84', 1);
        circle(ctx, 17, -69, 3.2); ctx.fillStyle = '#20140e'; ctx.fill();
        // 眼睛：小、亮、狠
        circle(ctx, 6, -78, 3.2); ctx.fillStyle = body || '#ffd479'; ctx.fill();
        circle(ctx, 14, -77, 2.6); ctx.fillStyle = body || '#ffd479'; ctx.fill();
        // 黑缨枪
        ctx.save(); ctx.translate(28, -46); ctx.rotate(-0.16 + Math.sin(t / 520) * 0.06);
        rr(ctx, -2.5, -44, 5, 92, 2.5); shape(ctx, '#4a3a26', 1.2);
        ctx.beginPath();
        ctx.moveTo(0, -56); ctx.lineTo(6, -42); ctx.lineTo(0, -46); ctx.lineTo(-6, -42);
        ctx.closePath(); shape(ctx, '#c9cfd6', 1.2);
        for (let i = 0; i < 5; i++) {
          const a = -0.5 + i * 0.25;
          line(ctx, 0, -40, Math.sin(a) * 12, -40 + Math.cos(a) * 12, 2, body || '#1c1a22');
        }
        ctx.restore();
      } else if (ak === 'bone') {
        // 白骨精：一副骨架披着破黑裙，双手两把骨刃
        const boneCol = body || '#ece6d8', cloth = body || '#1a1622';
        ctx.save();
        ctx.scale(1.2, 1.2);   // 骨架瘦，放大一点才压得住首领的气场
        // 裙摆
        ctx.beginPath();
        ctx.moveTo(-16, -40); ctx.lineTo(14, -40); ctx.lineTo(20, 0); ctx.lineTo(-20, 0);
        ctx.closePath(); shape(ctx, cloth, 1.2);
        for (let i = 0; i < 4; i++) {   // 破布条
          ctx.beginPath();
          ctx.moveTo(-18 + i * 10, -6); ctx.lineTo(-14 + i * 10, 4); ctx.lineTo(-10 + i * 10, -4);
          ctx.closePath(); shape(ctx, cloth, 0.8);
        }
        // 肋骨
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-11, -40 + i * 7); ctx.quadraticCurveTo(0, -44 + i * 7, 11, -40 + i * 7);
          ctx.strokeStyle = boneCol; ctx.lineWidth = 2.4; ctx.stroke();
        }
        // 脊椎
        line(ctx, 0, -44, 0, -16, 3, boneCol);
        // 头骨
        circle(ctx, 2, -66, 16); shape(ctx, boneCol, 1.6);
        ctx.beginPath();   // 下颌
        rr(ctx, -7, -56, 18, 9, 4); shape(ctx, boneCol, 1.2);
        for (let i = 0; i < 4; i++) line(ctx, -4 + i * 4.5, -56, -4 + i * 4.5, -49, 1.2, '#8d8578');
        // 眼窝：空的两孔，里面一点幽绿
        circle(ctx, -3, -70, 4.4); ctx.fillStyle = '#0b0f12'; ctx.fill();
        circle(ctx, 9, -70, 4.4); ctx.fillStyle = '#0b0f12'; ctx.fill();
        circle(ctx, -2.4, -69.6, 1.8); ctx.fillStyle = body || '#7ef0c0'; ctx.fill();
        circle(ctx, 9.6, -69.6, 1.8); ctx.fillStyle = body || '#7ef0c0'; ctx.fill();
        // 两只骨刃（一上一下）
        ctx.save(); ctx.translate(20, -44); ctx.rotate(-0.55 + Math.sin(t / 380) * 0.08);
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.quadraticCurveTo(20, -6, 30, -22);
        ctx.quadraticCurveTo(16, -14, 0, -6); ctx.closePath(); shape(ctx, boneCol, 1.2);
        ctx.restore();
        ctx.save(); ctx.translate(16, -30); ctx.rotate(0.5 - Math.sin(t / 380) * 0.08);
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.quadraticCurveTo(18, 4, 28, 16);
        ctx.quadraticCurveTo(14, 10, 0, 4); ctx.closePath(); shape(ctx, boneCol, 1.2);
        ctx.restore();
        ctx.restore();
      } else if (ak === 'bull') {
        // 牛魔王：壮硕红牛妖，黑铁胸甲 + 金腰带，肩扛一柄巨斧
        const hide = body || '#8e2b2b', hideDark = '#5e1a1a', iron = '#3b3f4a';
        // 腿 + 蹄
        rr(ctx, -21, -27, 16, 27, 5); shape(ctx, hideDark, 1.3);
        rr(ctx, 5, -27, 16, 27, 5); shape(ctx, hide, 1.3);
        rr(ctx, -24, -9, 21, 10, 3); shape(ctx, '#2a2028', 1.1);
        rr(ctx, 3, -9, 21, 10, 3); shape(ctx, '#2a2028', 1.1);
        // 后臂（甩在身后，画在躯干之前）
        line(ctx, -20, -62, -34, -44, 9, hideDark);
        circle(ctx, -35, -42, 6.5); shape(ctx, hideDark, 1.2);
        // 躯干
        rr(ctx, -24, -72, 48, 48, 14); shape(ctx, hide, 1.8);
        // 胸甲 + 腰带
        ctx.save();
        rr(ctx, -24, -72, 48, 48, 14); ctx.clip();
        rr(ctx, -25, -73, 50, 27, 11); shape(ctx, iron, 1.3);
        for (let i = 0; i < 3; i++) { circle(ctx, -14 + i * 14, -59, 2.2); ctx.fillStyle = '#8a8f9c'; ctx.fill(); }
        rr(ctx, -25, -45, 50, 7, 2); shape(ctx, '#c9a24a', 1);
        ctx.restore();
        // 头：宽口鼻 + 怒眉 + 粗角
        rr(ctx, -18, -96, 36, 28, 11); shape(ctx, hide, 1.7);
        ctx.beginPath();
        if (ctx.ellipse) ctx.ellipse(9, -78, 14, 10, 0, 0, Math.PI * 2); else ctx.arc(9, -78, 11, 0, Math.PI * 2);
        shape(ctx, '#c2685e', 1.2);
        for (const s of [-1, 1]) {          // 鼻孔
          circle(ctx, 9 + s * 5, -80, 2.1); ctx.fillStyle = '#4a1a1a'; ctx.fill();
        }
        // 眼睛 + 怒眉
        for (const s of [-1, 1]) {
          circle(ctx, s * 8 + 1, -86, 3.6); ctx.fillStyle = '#ffd479'; ctx.fill();
          circle(ctx, s * 8 + 1, -86, 1.6); ctx.fillStyle = '#1a0d08'; ctx.fill();
          line(ctx, s * 8 + 1 - 6, -92, s * 8 + 1 + 6, -89, 2.6, '#3d1210');
        }
        // 牛角：从头顶两侧往外再往上勾
        ctx.strokeStyle = '#e8dcc8'; ctx.lineWidth = 6.5; ctx.lineCap = 'round';
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(s * 15, -94);
          ctx.quadraticCurveTo(s * 38, -100, s * 34, -74);
          ctx.stroke();
        }
        ctx.strokeStyle = '#f7f2e6'; ctx.lineWidth = 2.4;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(s * 31, -80); ctx.lineTo(s * 35, -75);
          ctx.stroke();
        }
        // 鼻环
        ctx.strokeStyle = '#ffd479'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(9, -70, 5.5, 0.1, Math.PI - 0.1); ctx.stroke();
        // 巨斧：握在身前，随呼吸轻晃
        ctx.save();
        ctx.translate(30, -50); ctx.rotate(0.06 + Math.sin(t / 400) * 0.09);
        line(ctx, 0, -34, 0, 26, 5, '#5b4a32');       // 斧柄
        ctx.beginPath();                               // 斧刃
        ctx.moveTo(1, -36); ctx.quadraticCurveTo(24, -30, 18, -4); ctx.lineTo(1, -9);
        ctx.closePath(); shape(ctx, '#c9cfd6', 1.5);
        ctx.beginPath();
        ctx.moveTo(-1, -34); ctx.quadraticCurveTo(-15, -28, -11, -8); ctx.lineTo(-1, -12);
        ctx.closePath(); shape(ctx, '#a7aeb8', 1.2);
        ctx.restore();
        // 前臂：从肩膀压到斧柄上
        line(ctx, 20, -62, 30, -50, 9, hide);
        circle(ctx, 30, -50, 6.5); shape(ctx, hide, 1.2);
      } else if (ak === 'dragon') {
        ctx.save(); ctx.scale(1.26, 1.26); bossDragon(ctx, art, body, t); ctx.restore();
      } else if (ak === 'queen') {
        ctx.save(); ctx.scale(1.06, 1.06); bossQueen(ctx, art, body, t); ctx.restore();
      } else if (ak === 'beast') {
        ctx.save(); ctx.scale(1.08, 1.08); bossBeast(ctx, art, body, t); ctx.restore();
      } else {
        ctx.save(); ctx.scale(1.08, 1.08); bossDemon(ctx, art, body, t); ctx.restore();
      }
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
    const sid = skill.id || '';
    ctx.save();
    // —— 底框：墨玉径向渐变 + 双线描边（外鎏金内暗）+ 四角金点 ——
    const grd = ctx.createRadialGradient ? ctx.createRadialGradient(x + size / 2, y + size * 0.36, size * 0.1, x + size / 2, y + size / 2, size * 0.72) : null;
    rr(ctx, x, y, size, size, size * 0.2);
    ctx.fillStyle = '#15120c'; ctx.fill();
    if (grd && grd.addColorStop) {
      grd.addColorStop(0, 'rgba(58,46,26,0.95)');
      grd.addColorStop(1, 'rgba(12,10,6,0)');
      rr(ctx, x, y, size, size, size * 0.2); ctx.fill();
    }
    rr(ctx, x + 0.8, y + 0.8, size - 1.6, size - 1.6, size * 0.19);
    ctx.strokeStyle = ready ? (col || '#c9a24a') : '#454033';
    ctx.lineWidth = Math.max(1.6, size * 0.05); ctx.stroke();
    rr(ctx, x + size * 0.09, y + size * 0.09, size * 0.82, size * 0.82, size * 0.15);
    ctx.strokeStyle = ready ? 'rgba(255,224,150,0.35)' : 'rgba(120,108,84,0.28)';
    ctx.lineWidth = 1; ctx.stroke();
    // 四角金点
    ctx.fillStyle = ready ? 'rgba(255,224,150,0.85)' : 'rgba(120,108,84,0.5)';
    const cp = size * 0.13, cd = Math.max(1.1, size * 0.035);
    for (const [qx, qy] of [[x + cp, y + cp], [x + size - cp, y + cp], [x + cp, y + size - cp], [x + size - cp, y + size - cp]]) {
      circle(ctx, qx, qy, cd); ctx.fill();
    }

    // —— 徽记图形 ——
    const cx = x + size / 2, cy = y + size / 2, r = size * 0.3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(2, size * 0.07); ctx.lineCap = 'round';
    if (sid === 'wk_smash') {
      // 如意金箍棒：暴涨的棒 + 两道金箍 + 砸地冲击弧
      rr(ctx, -r * 0.34, -r * 1.15, r * 0.68, r * 1.6, r * 0.14); ctx.fillStyle = col; ctx.fill();
      rr(ctx, -r * 0.62, -r * 1.42, r * 1.24, r * 0.42, r * 0.12); ctx.fillStyle = '#ffe27a'; ctx.fill();
      rr(ctx, -r * 0.62, r * 0.42, r * 1.24, r * 0.42, r * 0.12); ctx.fillStyle = '#ffe27a'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,246,214,0.9)'; ctx.lineWidth = Math.max(1.6, size * 0.055);
      ctx.beginPath();
      if (ctx.arc) ctx.arc(0, r * 1.02, r * 0.78, Math.PI * 0.22, Math.PI * 0.78);
      ctx.stroke();
    } else if (sid === 'wk_dash') {
      // 筋斗云：三团圆云 + 金边 + 前冲箭头
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
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, size * 0.075);
      ctx.beginPath();
      ctx.moveTo(-r * 1.15, r * 0.95); ctx.lineTo(r * 0.95, r * 0.95);
      ctx.moveTo(r * 0.45, r * 0.6); ctx.lineTo(r * 0.95, r * 0.95); ctx.lineTo(r * 0.45, r * 1.3);
      ctx.stroke();
    } else if (sid === 'wk_spin') {
      // 定海神针：斜插的棒 + 旋风轨迹 + 轨迹箭头
      ctx.save();
      ctx.rotate(-0.62);
      rr(ctx, -r * 0.2, -r * 1.12, r * 0.4, r * 1.9, r * 0.1); ctx.fillStyle = col; ctx.fill();
      rr(ctx, -r * 0.38, -r * 1.3, r * 0.76, r * 0.34, r * 0.1); ctx.fillStyle = '#ffe27a'; ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,246,214,0.85)'; ctx.lineWidth = Math.max(1.6, size * 0.05);
      ctx.beginPath();
      if (ctx.arc) ctx.arc(0, 0, r * 0.95, -2.5, 1.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r * 0.62, -r * 0.78); ctx.lineTo(r * 1.2, -r * 0.42); ctx.lineTo(r * 0.56, -r * 0.3);
      ctx.fill();
    } else if (sid === 'bj_rake') {
      // 九齿钉耙：横柄 + 九根耙齿
      rr(ctx, -r * 1.05, -r * 0.16, r * 1.5, r * 0.34, r * 0.1); ctx.fillStyle = '#8a5c34'; ctx.fill();
      ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = Math.max(1.4, size * 0.05);
      for (let i = 0; i < 5; i++) {
        const ty = -r * 0.55 + i * r * 0.28;
        ctx.beginPath();
        ctx.moveTo(r * 0.46, ty * 0.2);
        ctx.lineTo(r * 1.12, ty);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffe27a';
      for (let i = 0; i < 5; i++) {
        const ty = -r * 0.55 + i * r * 0.28;
        circle(ctx, r * 1.12, ty, Math.max(1, size * 0.032)); ctx.fill();
      }
    } else if (sid === 'bj_counter') {
      // 倒打一耙：反向回旋的三道爪痕 + 回旋箭头
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.6, size * 0.055);
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        if (ctx.arc) ctx.arc(r * 0.2 - k * r * 0.28, 0, r * 0.95, -0.85, 0.85);
        ctx.stroke();
      }
      ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = Math.max(1.8, size * 0.06);
      ctx.beginPath();
      if (ctx.arc) ctx.arc(-r * 0.15, 0, r * 1.05, -1.35, 1.35);
      ctx.stroke();
      ctx.fillStyle = '#ffe27a';
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, r * 0.86); ctx.lineTo(-r * 1.42, r * 0.42); ctx.lineTo(-r * 0.68, r * 0.3);
      ctx.closePath(); ctx.fill();
    } else if (sid === 'bj_eat') {
      // 贪吃回元：一枚仙桃 + 向内吸入的光点
      ctx.fillStyle = '#ffb3a0';
      ctx.beginPath();
      ctx.moveTo(0, r * 0.95);
      ctx.bezierCurveTo(-r * 1.1, r * 0.1, -r * 0.55, -r * 0.95, 0, -r * 0.35);
      ctx.bezierCurveTo(r * 0.55, -r * 0.95, r * 1.1, r * 0.1, 0, r * 0.95);
      ctx.fill();
      ctx.strokeStyle = '#d86a52'; ctx.lineWidth = Math.max(1.2, size * 0.04);
      ctx.beginPath(); ctx.moveTo(0, -r * 0.35); ctx.lineTo(0, -r * 0.95); ctx.stroke();
      ctx.fillStyle = '#8fd48a';
      ctx.beginPath(); ctx.ellipse ? ctx.ellipse(-r * 0.22, -r * 0.82, r * 0.34, r * 0.16, -0.6, 0, Math.PI * 2) : ctx.arc(-r * 0.22, -r * 0.82, r * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe27a';
      for (const [px2, py2] of [[-r * 1.3, -r * 0.7], [r * 1.3, -r * 0.7], [-r * 1.3, r * 0.7], [r * 1.3, r * 0.7]]) {
        circle(ctx, px2, py2, Math.max(1, size * 0.03)); ctx.fill();
      }
    } else if (sid === 'ts_zeal') {
      // 紧箍真言：一枚金环 + 环上符齿 + 中央佛光点
      ctx.strokeStyle = '#ffd479'; ctx.lineWidth = Math.max(2.2, size * 0.08);
      ctx.beginPath(); if (ctx.arc) ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = Math.max(1.2, size * 0.04);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
        ctx.lineTo(Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.68);
        ctx.stroke();
      }
      ctx.fillStyle = '#fff6d8';
      circle(ctx, 0, 0, r * 0.22); ctx.fill();
    } else if (sid === 'ts_sutra') {
      // 大乘真经：展开的经卷 + 卷轴两端 + 经文行
      ctx.fillStyle = '#f2dfae';
      rr(ctx, -r * 0.95, -r * 0.62, r * 1.9, r * 1.24, r * 0.12); ctx.fill();
      ctx.strokeStyle = '#b8934e'; ctx.lineWidth = Math.max(1.1, size * 0.038);
      rr(ctx, -r * 0.95, -r * 0.62, r * 1.9, r * 1.24, r * 0.12); ctx.stroke();
      ctx.fillStyle = '#8a6a34';
      ctx.fillRect(-r * 0.7, -r * 0.34, r * 1.4, r * 0.14);
      ctx.fillRect(-r * 0.7, -r * 0.02, r * 1.4, r * 0.14);
      ctx.fillRect(-r * 0.7, r * 0.3, r * 0.9, r * 0.14);
      ctx.fillStyle = '#c9a24a';
      for (const ex of [-r * 1.05, r * 1.05]) {
        rr(ctx, ex - r * 0.13, -r * 0.78, r * 0.26, r * 1.56, r * 0.12); ctx.fill();
      }
    } else if (sid === 'ts_kasaya') {
      // 袈裟护体：菱形格纹袈裟 + 外围光罩弧
      ctx.strokeStyle = '#d86a52'; ctx.lineWidth = Math.max(1.6, size * 0.055);
      for (let row = -2; row <= 2; row++) {
        const ry = row * r * 0.42;
        const wide = 1 - Math.abs(row) * 0.22;
        ctx.beginPath();
        ctx.moveTo(-r * 0.95 * wide, ry);
        ctx.lineTo(0, ry + r * 0.42 * 0.5);
        ctx.lineTo(r * 0.95 * wide, ry);
        ctx.lineTo(0, ry - r * 0.42 * 0.5);
        ctx.closePath();
        if (row % 2 === 0) { ctx.fillStyle = 'rgba(216,106,82,0.32)'; ctx.fill(); }
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,224,150,0.75)'; ctx.lineWidth = Math.max(1.2, size * 0.04);
      ctx.beginPath(); if (ctx.arc) ctx.arc(0, 0, r * 1.22, -0.6, 0.6); ctx.stroke();
      ctx.beginPath(); if (ctx.arc) ctx.arc(0, 0, r * 1.22, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
    } else if (sid === 'ss_staff') {
      // 降妖宝杖：竖柄 + 顶上一弯月牙刃
      rr(ctx, -r * 0.14, -r * 0.5, r * 0.28, r * 1.5, r * 0.08); ctx.fillStyle = '#8a5c34'; ctx.fill();
      ctx.strokeStyle = '#8fd8c0'; ctx.lineWidth = Math.max(2.2, size * 0.08);
      ctx.beginPath();
      ctx.arc(0, r * 0.28, r * 0.95, -Math.PI * 0.78, -Math.PI * 0.22);
      ctx.stroke();
      ctx.lineWidth = Math.max(1.3, size * 0.045);
      ctx.beginPath();
      ctx.arc(0, r * 0.28, r * 0.66, -Math.PI * 0.72, -Math.PI * 0.28);
      ctx.stroke();
      ctx.fillStyle = '#8fd8c0';
      circle(ctx, 0, -r * 0.55, Math.max(1.4, size * 0.05)); ctx.fill();
    } else if (sid === 'ss_quicksand') {
      // 流沙卷：三层收拢的沙纹漩涡 + 中心沙点
      const sc = ['#e8cf9a', '#c9a06a', '#8a6a42'];
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = sc[k]; ctx.lineWidth = Math.max(1.6, size * 0.055);
        ctx.beginPath();
        if (ctx.arc) ctx.arc(0, 0, r * (1.15 - k * 0.34), 0.6 + k * 0.9, 2.6 + k * 0.9);
        ctx.stroke();
      }
      ctx.fillStyle = '#c9a06a';
      circle(ctx, 0, 0, Math.max(1.8, size * 0.06)); ctx.fill();
      ctx.fillStyle = '#e8cf9a';
      circle(ctx, -r * 0.5, -r * 0.62, Math.max(1, size * 0.032)); ctx.fill();
      circle(ctx, r * 0.55, -r * 0.5, Math.max(1, size * 0.032)); ctx.fill();
    } else if (sid === 'ss_bind') {
      // 降妖缚：锁链环环相扣 + 两端符结
      ctx.strokeStyle = '#d8a84a'; ctx.lineWidth = Math.max(1.8, size * 0.06);
      let bx = -r * 1.15;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        if (ctx.ellipse) ctx.ellipse(bx, 0, r * 0.3, r * 0.2, i % 2 ? 0.5 : -0.5, 0, Math.PI * 2);
        else ctx.arc(bx, 0, r * 0.24, 0, Math.PI * 2);
        ctx.stroke();
        bx += r * 0.52;
      }
      ctx.fillStyle = '#ffd479';
      circle(ctx, r * 1.1, -r * 0.4, Math.max(1.4, size * 0.045)); ctx.fill();
      circle(ctx, r * 1.1, r * 0.4, Math.max(1.4, size * 0.045)); ctx.fill();
    } else if (sid === 'bl_tail') {
      // 龙尾扫：一道甩出去的龙尾弧线 + 鳞纹节点
      ctx.strokeStyle = '#9be7ff'; ctx.lineWidth = Math.max(2.4, size * 0.085); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 1.1, r * 0.7);
      ctx.quadraticCurveTo(r * 0.1, -r * 1.2, r * 1.2, -r * 0.3);
      ctx.stroke();
      ctx.lineWidth = Math.max(1.2, size * 0.04);
      ctx.strokeStyle = '#e8f8ff';
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, r * 0.52);
      ctx.quadraticCurveTo(r * 0.06, -r * 0.95, r * 1.02, -r * 0.28);
      ctx.stroke();
      ctx.fillStyle = '#9be7ff';
      for (const q of [0.28, 0.52, 0.76]) {
        const px2 = -r * 1.1 + (r * 2.3) * q, py2 = r * 0.7 * (1 - q) * (1 - q) + (-r * 1.2) * 2 * q * (1 - q) + (-r * 0.3) * q * q;
        circle(ctx, px2, py2, Math.max(1, size * 0.03)); ctx.fill();
      }
      ctx.fillStyle = '#fff6d8';
      circle(ctx, r * 1.2, -r * 0.3, Math.max(1.4, size * 0.05)); ctx.fill();
    } else if (sid === 'bl_charge') {
      // 化龙击：龙首剪影 + 前冲速度线
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.42);
      ctx.quadraticCurveTo(r * 0.85, -r * 0.95, r * 1.3, -r * 0.2);
      ctx.quadraticCurveTo(r * 0.9, -r * 0.05, r * 1.05, r * 0.28);
      ctx.quadraticCurveTo(r * 0.5, r * 0.2, r * 0.28, r * 0.5);
      ctx.quadraticCurveTo(r * 0.05, r * 0.05, -r * 0.2, r * 0.42);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff6d8';
      circle(ctx, r * 0.72, -r * 0.38, Math.max(1.3, size * 0.042)); ctx.fill();
      ctx.strokeStyle = 'rgba(155,231,255,0.7)'; ctx.lineWidth = Math.max(1.2, size * 0.04);
      for (const qy of [-r * 0.5, 0, r * 0.5]) {
        ctx.beginPath();
        ctx.moveTo(-r * 1.3, qy); ctx.lineTo(-r * 0.55, qy);
        ctx.stroke();
      }
    } else if (sid === 'bl_breath') {
      // 龙息：从一点渐开的三层锥形吐息
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const wm = [1, 0.62, 0.3][k];
        ctx.globalAlpha = [0.35, 0.6, 0.95][k];
        ctx.fillStyle = k === 2 ? '#f2fdff' : col;
        ctx.beginPath();
        ctx.moveTo(-r * 1.05, 0);
        ctx.lineTo(r * 0.3, -r * 1.1 * wm);
        ctx.lineTo(r * 1.35, -r * 0.85 * wm);
        ctx.lineTo(r * 1.35, r * 0.85 * wm);
        ctx.lineTo(r * 0.3, r * 1.1 * wm);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff6d8';
      circle(ctx, -r * 1.05, 0, Math.max(1.6, size * 0.055)); ctx.fill();
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
