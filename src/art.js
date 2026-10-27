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
      ctx.moveTo(cx + sx * r * 0.52, cy - r * (mood === 'hurt' ? 0.36 : 0.22));
      ctx.lineTo(cx + sx * r * 0.2, cy - r * (mood === 'angry' ? 0.3 : (mood === 'hurt' ? 0.14 : 0.18)));
      ctx.stroke();
    }
    // 眼
    const eyeY = cy + r * 0.06, eyeDx = r * 0.33;
    if (mood === 'hurt') {
      // 疼得眯起眼：两条下弯的弧线
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sx * eyeDx - r * 0.13, eyeY - r * 0.05);
        ctx.quadraticCurveTo(cx + sx * eyeDx, eyeY + r * 0.12, cx + sx * eyeDx + r * 0.13, eyeY - r * 0.05);
        ctx.strokeStyle = A.eyes; ctx.lineWidth = r * 0.09; ctx.stroke();
      }
    } else if (blink) {
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
    // 被打：身体向后一顿 + 后仰，让每次命中都有反馈
    const hurtLeft = (e.hurtUntil || 0) - t;
    const hurtK = hurtLeft > 0 ? Math.sin(Math.min(1, hurtLeft / 200) * Math.PI) : 0;
    if (hurtK) { ctx.translate(-4.5 * hurtK, 0); ctx.rotate(-0.11 * hurtK); }
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
