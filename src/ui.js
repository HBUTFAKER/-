// 渲染层：背景 / 世界 / HUD / 背包 / 各类界面。挂到 XY.UI。纯绘制，不处理逻辑。
(function (root) {
  const XY = (root.XY = root.XY || {});
  const UI = (XY.UI = {});
  const Art = () => XY.Art;

  const W = 960, H = 540;

  function rrect(ctx, x, y, w, h, r) {
    const rad = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
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
  function bar(ctx, x, y, w, h, pct, fg, bgc) {
    pct = Math.max(0, Math.min(1, pct));
    ctx.fillStyle = bgc || '#1a2130';
    rrect(ctx, x, y, w, h, h / 2); ctx.fill();
    if (pct > 0) {
      ctx.fillStyle = fg;
      rrect(ctx, x, y, Math.max(h, w * pct), h, h / 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1;
    rrect(ctx, x, y, w, h, h / 2); ctx.stroke();
  }
  // 祥云：一片软云（筋斗云缠身时绕角色飘）
  function xiangyun(ctx, x, y, s, alpha) {
    if (!(alpha > 0.01) || !(s > 0.01)) return;
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = Math.min(1, Math.max(0, alpha));
    const puffs = [[-7, 1, 6], [0, -3, 8], [7, 1, 6], [0, 4, 6.5]];
    ctx.fillStyle = 'rgba(255,246,226,0.95)';
    for (let i = 0; i < puffs.length; i++) {
      ctx.beginPath();
      ctx.arc(x + puffs[i][0] * s, y + puffs[i][1] * s, Math.max(0.4, puffs[i][2] * s), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,206,128,0.7)';
    ctx.lineWidth = Math.max(0.8, 1.3 * s);
    ctx.beginPath();
    ctx.arc(x, y - 3 * s, 7.6 * s, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.globalAlpha = prev;
  }

  function center(ctx, text, y, font, color) {    ctx.fillStyle = color || '#fff'; ctx.font = font; ctx.textAlign = 'center';
    ctx.fillText(text, W / 2, y); ctx.textAlign = 'left';
  }
  // maxLines：超出后自动省略，避免文字溢出卡片
  function wrapText(ctx, text, x, y, maxW, lh, maxLines) {
    const chars = String(text || '').split('');
    let line = '', yy = y, lines = 0;
    for (const ch of chars) {
      if (ch === '\n' || ctx.measureText(line + ch).width > maxW) {
        if (maxLines && lines >= maxLines - 1) {
          let cut = line;
          while (cut.length > 1 && ctx.measureText(cut + '…').width > maxW) cut = cut.slice(0, -1);
          ctx.fillText(cut + '…', x, yy);
          return yy;
        }
        ctx.fillText(line, x, yy);
        line = ch === '\n' ? '' : ch;
        yy += lh; lines++;
      } else line += ch;
    }
    ctx.fillText(line, x, yy);
    return yy;
  }
  UI.wrapText = wrapText;

  // ===== 背景 =====
  const SKIES = [
    { top: '#3f6f96', bottom: '#0d1a2a', sun: '#ffe9a8', far: '#24405c', near: '#16324a', ground: '#2a2019', top2: '#4f7a3a', mist: 'rgba(150,200,240,0.10)' }, // 花果山
    { top: '#3a2b52', bottom: '#0c0814', sun: '#c8a6ff', far: '#241a38', near: '#150f24', ground: '#241a2c', top2: '#6a4f8a', mist: 'rgba(180,140,255,0.10)' }, // 黑风洞
    { top: '#7a2a18', bottom: '#180705', sun: '#ff9b5e', far: '#4a1a12', near: '#300f0a', ground: '#2b1510', top2: '#8a3a20', mist: 'rgba(255,140,80,0.12)' }, // 火焰山
  ];
  UI.SKIES = SKIES;

  // 背景交由场景层绘制：每关一张主题立绘（远 / 中景 + 视差 + 动态元素）
  UI.drawBackground = function (ctx, levelIndex, t, camX) {
    if (XY.Scenery && XY.Scenery.draw) { XY.Scenery.draw(ctx, levelIndex, t || 0, camX || 0); return; }
    // 兜底：场景层缺失时至少铺一层天空色
    const sky = SKIES[levelIndex % SKIES.length];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, sky.top); g.addColorStop(1, sky.bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };

  // ===== 世界（已 translate 到相机坐标）=====
  const ENEMY_ART_H = { imp: 34, wolf: 36, spider: 32, boss: 86 };

  // 每关平台材质：岩体主色 / 表层色 / 亮边 / 装饰类型
  const PLATFORM_STYLE = [
    { body: '#241d16', top: '#4b7a3c', lit: '#6aa052', deco: 'grass' },  // 花果山：青苔岩
    { body: '#191327', top: '#5c4580', lit: '#8a6cb4', deco: 'moss' },   // 黑风洞：黑曜石
    { body: '#1e0d08', top: '#7c2f18', lit: '#e07a2e', deco: 'lava' },   // 火焰山：焦岩
  ];

  UI.drawPlatforms = function (ctx, game) {
    const st = PLATFORM_STYLE[(game.levelIndex || 0) % 3];
    for (const p of game.level.platforms) {
      // 岩体：下沿做不规则断裂，避免出现规整的矩形板子
      const segs = Math.max(2, Math.round(p.w / 64));
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.w, p.y);
      for (let i = segs; i >= 0; i--) {
        const xx = p.x + (p.w / segs) * i;
        const rr = Math.abs(Math.sin((xx + p.y * 3.1) * 0.37) * 9137.13) % 1;
        ctx.lineTo(xx, p.y + p.h + rr * (p.h > 30 ? 0 : 7));
      }
      ctx.closePath();
      ctx.fillStyle = st.body;
      ctx.fill();

      // 岩体竖向层理
      ctx.strokeStyle = 'rgba(0,0,0,0.26)';
      ctx.lineWidth = 1;
      for (let x = p.x + 30; x < p.x + p.w; x += 56) {
        const rr = Math.abs(Math.sin(x * 1.7) * 5171.3) % 1;
        ctx.beginPath();
        ctx.moveTo(x, p.y + 8);
        ctx.lineTo(x + (rr - 0.5) * 10, p.y + p.h);
        ctx.stroke();
      }
      // 底部压暗
      ctx.fillStyle = 'rgba(0,0,0,0.34)';
      ctx.fillRect(p.x, p.y + p.h - 5, p.w, 5);

      // 表层
      ctx.fillStyle = st.top;
      ctx.fillRect(p.x, p.y, p.w, 7);
      ctx.fillStyle = st.lit;
      ctx.fillRect(p.x, p.y, p.w, 2);

      if (st.deco === 'grass') {
        ctx.strokeStyle = st.lit;
        ctx.lineWidth = 2;
        for (let x = p.x + 7; x < p.x + p.w; x += 32) {
          const hh = 4 + (Math.abs(Math.sin(x * 0.9) * 7919) % 1) * 6;
          ctx.beginPath();
          ctx.moveTo(x, p.y);
          ctx.quadraticCurveTo(x + 1.5, p.y - hh * 0.6, x + 3.5, p.y - hh);
          ctx.stroke();
        }
      } else if (st.deco === 'moss') {
        for (let x = p.x + 10; x < p.x + p.w; x += 41) {
          const rr = Math.abs(Math.sin(x * 2.3) * 4021.7) % 1;
          ctx.fillStyle = 'rgba(126,214,178,' + (0.12 + rr * 0.18).toFixed(2) + ')';
          ctx.beginPath();
          ctx.arc(x, p.y - 2 - rr * 3, 2.2 + rr * 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // 熔岩裂缝（发光）
        for (let x = p.x + 34; x < p.x + p.w; x += 78) {
          const rr = Math.abs(Math.sin(x * 3.1) * 6131.7) % 1;
          ctx.strokeStyle = 'rgba(255,138,48,0.85)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, p.y + 4);
          ctx.lineTo(x + (rr - 0.5) * 16, p.y + 12 + rr * 10);
          ctx.lineTo(x + (rr - 0.5) * 24, p.y + p.h - 2);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,196,110,0.4)';
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      }
    }
  };

  UI.drawGoal = function (ctx, game) {
    const gx = game.level.goal.x, gy = game.level.goal.y;
    ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy - 84); ctx.stroke();
    // 旗面（飘动）
    const flap = Math.sin(game.now / 260) * 4;
    ctx.beginPath();
    ctx.moveTo(gx, gy - 84);
    ctx.quadraticCurveTo(gx + 26, gy - 78 + flap, gx + 46, gy - 70);
    ctx.lineTo(gx + 44, gy - 44);
    ctx.quadraticCurveTo(gx + 24, gy - 48 - flap, gx, gy - 46);
    ctx.closePath();
    ctx.fillStyle = '#c0392b'; ctx.fill();
    ctx.strokeStyle = '#ffd479'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 14px serif'; ctx.fillText('终', gx + 14, gy - 56);
  };

  // 出招预警：地面上画出「这一下够得着的范围」，再用一段扫过来的亮扇形表示蓄力进度
  UI.drawEnemyTell = function (ctx, e, now) {
    const m = e.cur;
    if (!m) return;
    const t = e.state === 'windup' ? (e.tele || 0) : 1;
    const col = m.tell || '#ff8a5e';
    const cx = e.x + e.w / 2, feet = e.y + e.h;
    const reach = Array.isArray(m.range) ? Math.max(90, m.range[0]) : (m.radius || m.range || 90);
    const dir = e.moveDir || e.facing || 1;
    const TAU = Math.PI * 2;
    const rx = Math.max(16, reach * (1.08 - 0.16 * t));
    // 压扁成贴地的一条：圈子再大也不会爬到大半身位上去挡住自己
    const ry = Math.max(12, Math.min(rx * 0.30, 24));

    // 冲撞：先把冲过去的那条道铺出来
    if (m.type === 'dash') {
      const far = Math.min(Array.isArray(m.range) ? m.range[1] : 300, 340);
      const x0 = cx + dir * e.w * 0.5;
      ctx.save();
      ctx.globalAlpha = 0.10 + 0.13 * t;
      ctx.fillStyle = col;
      ctx.fillRect(Math.min(x0, x0 + dir * far), feet - 26, far, 26);
      ctx.globalAlpha = 0.5 + 0.4 * t;
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      if (ctx.setLineDash) ctx.setLineDash([9, 7]);
      ctx.beginPath();
      ctx.moveTo(x0, feet - 1); ctx.lineTo(x0 + dir * far, feet - 1);
      ctx.stroke();
      if (ctx.setLineDash) ctx.setLineDash([]);
      // 指向箭头
      ctx.globalAlpha = 0.6 + 0.4 * t;
      const ax = x0 + dir * far * 0.98;
      ctx.beginPath();
      ctx.moveTo(ax, feet - 8);
      ctx.lineTo(ax - dir * 13, feet - 18);
      ctx.lineTo(ax - dir * 13, feet + 2);
      ctx.closePath(); ctx.fillStyle = col; ctx.fill();
      ctx.restore();
    }

    const ex = cx + dir * reach * (m.type === 'dash' ? 0.15 : 0.12);
    const ey = feet - 3;
    const ellipse = (x, y, r1, r2, a0, a1) => {
      ctx.beginPath();
      if (ctx.ellipse) ctx.ellipse(x, y, r1, r2, 0, a0, a1);
      else ctx.arc(x, y, r1, a0, a1);
    };

    ctx.save();
    // 1) 危险区底色
    ctx.globalAlpha = 0.16 + 0.30 * t;
    ctx.fillStyle = col;
    ellipse(ex, ey, rx, ry, 0, TAU); ctx.fill();
    // 2) 蓄力扇形：从正上方开始顺时针扫一圈，扫满就出手
    ctx.globalAlpha = 0.34 + 0.42 * t;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    if (ctx.ellipse) ctx.ellipse(ex, ey, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + TAU * t);
    else ctx.arc(ex, ey, rx, -Math.PI / 2, -Math.PI / 2 + TAU * t);
    ctx.closePath();
    ctx.fill();
    // 3) 亮边：先垫一圈深色描边，浅色地面上也能咬住边
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 5 + 1.8 * t;
    ellipse(ex, ey, rx, ry, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.9 + 0.1 * t;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.8 + 1.8 * t;
    ellipse(ex, ey, rx, ry, 0, TAU); ctx.stroke();
    // 白芯细线：不管地面是深是浅，这条边都咬得住
    ctx.globalAlpha = 0.55 + 0.35 * t;
    ctx.strokeStyle = '#fff6dd';
    ctx.lineWidth = 1.2;
    ellipse(ex, ey, rx, ry, 0, TAU); ctx.stroke();
    // 4) 快出手时再补一圈内收的细圈，压迫感更强
    if (t > 0.55) {
      ctx.globalAlpha = (t - 0.55) / 0.45 * 0.75;
      ctx.lineWidth = 1.5;
      ellipse(ex, ey, rx * (1 - 0.5 * t), ry * (1 - 0.5 * t), 0, TAU); ctx.stroke();
    }
    // 5) 临门一脚：整块范围再闪一下
    if (t > 0.86) {
      ctx.globalAlpha = 0.22 + 0.22 * Math.sin(now / 45);
      ctx.fillStyle = col;
      ellipse(ex, ey, rx, ry, 0, TAU); ctx.fill();
    }
    // 6) 头顶的叹号挪到 drawAlertMark（画在敌人之上，才不会被脑袋挡住）
    ctx.restore();
  };

  // 头上的"!"：单独画在敌人之后，小怪才用（首领个头太大，靠地面光圈 + 顶部血条闪红提示）
  UI.drawAlertMark = function (ctx, e, now) {
    if (e.isBoss || e.state !== 'windup') return;
    const cx = e.x + e.w / 2;
    const by = e.y - 24; // 让开头顶血条（血条在 y-10）
    const pulse = 0.62 + 0.38 * Math.sin(now / 70);
    ctx.save();
    ctx.globalAlpha = 0.62 * pulse;
    ctx.fillStyle = '#1a0f0c';
    ctx.beginPath(); ctx.arc(cx, by, 9.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.9 * pulse;
    ctx.strokeStyle = '#ffcf6a'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, by, 9.5, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffe08a';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', cx, by + 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();
  };

  UI.drawWorld = function (ctx, game) {
    const now = game.now;
    UI.drawPlatforms(ctx, game);
    UI.drawGoal(ctx, game);

    // 残影（在角色后面）
    if (game.fx) game.fx.draw(ctx, 'back');

    // 敌人
    for (const e of game.level.enemies) {
      if (!e.alive) continue;
      if (e.state === 'windup' || e.state === 'active') UI.drawEnemyTell(ctx, e, now);
      const k = (e.h / (ENEMY_ART_H[e.kind] || 34)) * 1.02;
      Art().drawEnemy(ctx, e, now, k);
      // 起手叹号画在身上面，别被脑袋糊住
      UI.drawAlertMark(ctx, e, now);
      // 血条
      if (!e.isBoss) {
        const bw = Math.max(30, e.w);
        bar(ctx, e.x + (e.w - bw) / 2, e.y - 10, bw, 4.5, e.hp / e.maxHp, '#e74c3c');
      }
      if (e.stunUntil > now) {
        ctx.fillStyle = '#ffd479'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('★', e.x + e.w / 2, e.y - 16);
        ctx.textAlign = 'left';
      }
    }

    // 掷出的金箍棒：空中急旋 / 插地余波
    if (game.specials) {
      for (const s of game.specials) {
        if (!s || s.dead) continue;
        if (Art().drawSpinStaff) Art().drawSpinStaff(ctx, s, now);
      }
    }

    // 弹道（带光晕拖尾）
    for (const p of game.projectiles) {
      const g2 = ctx.createRadialGradient ? ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.r * 3.2) : null;
      if (g2 && g2.addColorStop) { g2.addColorStop(0, p.color); g2.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = 0.55; ctx.fillStyle = g2; }
      else ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.55, 0, Math.PI * 2); ctx.fill();
    }

    // 玩家（2D 造型）
    const pl = game.player;
    const cloudOn = pl && now < (pl.cloudAuraUntil || 0);
    // 筋斗云的祥云：绕着角色转，后三片在身后
    if (cloudOn) {
      const fade = Math.min(1, (pl.cloudAuraUntil - now) / 240);
      const bx = pl.x + pl.w / 2, by = pl.y + pl.h * 0.58;
      for (let i = 0; i < 3; i++) {
        const ang = now / 175 + i * (Math.PI * 2 / 5);
        const rx = 30 + (i % 2) * 9;
        xiangyun(ctx, bx + Math.cos(ang) * rx, by + Math.sin(ang) * rx * 0.55,
          0.5 + 0.22 * (0.5 + 0.5 * Math.sin(ang)), 0.75 * fade);
      }
    }
    if (pl && pl.hp > 0) {
      const scale = XY.PLAYER_SCALE || 1.15;
      const pose = pl.pose(now);
      // 无敌闪烁
      if (pl.invuln > now && Math.floor(now / 90) % 2 === 0) ctx.globalAlpha = 0.45;
      // 护盾 / 加速光环
      if (now < pl.shieldUntil) {
        const prevA = ctx.globalAlpha;
        ctx.globalAlpha = prevA * 0.85;
        ctx.strokeStyle = 'rgba(255,212,121,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse ? ctx.ellipse(pl.x + pl.w / 2, pl.y + pl.h / 2, 32, 40, 0, 0, Math.PI * 2) : ctx.arc(pl.x + pl.w / 2, pl.y + pl.h / 2, 34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = prevA;
      }
      Art().drawCharacter(ctx, pl.x + pl.w / 2, pl.y + pl.h + 2, scale, pl.char.id, pose);
      // 另外两片祥云转到身前，形成"云缠身"的包围感
      if (now < (pl.cloudAuraUntil || 0)) {
        const fade = Math.min(1, (pl.cloudAuraUntil - now) / 240);
        const bx = pl.x + pl.w / 2, by = pl.y + pl.h * 0.58;
        for (let i = 0; i < 2; i++) {
          const ang = now / 175 + 2.4 + i * (Math.PI * 2 / 5);
          const rx = 34 + i * 6;
          xiangyun(ctx, bx + Math.cos(ang) * rx, by + Math.sin(ang) * rx * 0.55, 0.62, 0.8 * fade);
        }
      }
      ctx.globalAlpha = 1;
      if (now < pl.buffSpdUntil) {
        ctx.fillStyle = 'rgba(127,208,255,0.85)';
        for (let i = 0; i < 3; i++) {
          const yy = pl.y + 14 + i * 16;
          ctx.fillRect(pl.x - 14 - i * 5, yy, 10, 2);
        }
      }
    }

    // 特效（刀光/火花/冲击环在前）
    if (game.fx) game.fx.draw(ctx, 'front');
  };

  // ===== HUD =====
  UI.drawPortrait = function (ctx, game) {
    const pl = game.player;
    const x = 14, y = 12, size = 84;
    // 外框
    ctx.save();
    rrect(ctx, x - 2, y - 2, size + 4, size + 4, 14);
    const g = ctx.createLinearGradient(x, y, x + size, y + size);
    g.addColorStop(0, '#f4c430'); g.addColorStop(0.5, '#8a6a22'); g.addColorStop(1, '#f4c430');
    ctx.fillStyle = g; ctx.fill();
    rrect(ctx, x, y, size, size, 12);
    const bg = ctx.createLinearGradient(x, y, x, y + size);
    bg.addColorStop(0, '#243046'); bg.addColorStop(1, '#101724');
    ctx.fillStyle = bg; ctx.fill();
    // 头像
    ctx.save();
    rrect(ctx, x, y, size, size, 12); ctx.clip();
    Art().drawFace(ctx, x + size / 2, y + 57, 23, pl.char.id, { t: game.now, mood: 'calm' });
    ctx.restore();
    // 等级徽标
    const bw = 34, bh = 18;
    rrect(ctx, x + size - bw + 4, y + size - bh + 4, bw, bh, 9);
    ctx.fillStyle = 'rgba(12,16,24,0.92)'; ctx.fill();
    ctx.strokeStyle = '#ffd479'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#ffd479'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Lv.' + pl.level, x + size - bw / 2 + 4, y + size - 1);
    ctx.textAlign = 'left';
    ctx.restore();
  };

  UI.drawHUD = function (ctx, game) {
    const pl = game.player;
    UI.drawPortrait(ctx, game);

    const bx = 108, bw = 252;
    // 名字 + 称号
    ctx.fillStyle = '#fff'; ctx.font = 'bold 17px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(pl.char.name, bx, 30);
    const nameW = ctx.measureText(pl.char.name).width; // 必须在切换字号前量宽
    ctx.fillStyle = '#ffd479'; ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('· ' + pl.char.title, bx + nameW + 10, 29);

    // 气血
    bar(ctx, bx, 38, bw, 16, pl.hp / pl.maxHp, '#e0453a', '#221a1f');
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = 'bold 11px sans-serif';
    ctx.fillText(Math.ceil(pl.hp) + ' / ' + pl.maxHp, bx + 8, 50);
    // 法力（气）
    bar(ctx, bx, 58, bw * 0.78, 11, pl.energy / pl.maxEnergy, '#3da5ff', '#141d2b');
    ctx.fillStyle = '#cfe8ff'; ctx.font = '10px sans-serif';
    ctx.fillText('气 ' + Math.ceil(pl.energy), bx + 6, 67);
    // 经验
    const need = XY.expToNext(pl.level);
    bar(ctx, bx, 75, bw * 0.78, 6, pl.exp / need, '#a06bff', '#1a1626');
    ctx.fillStyle = '#b9a2e8'; ctx.font = '10px sans-serif';
    ctx.fillText('EXP ' + Math.floor(pl.exp) + '/' + need, bx + bw * 0.78 + 8, 81);

    // 关卡名 + 进度
    ctx.textAlign = 'right';
    ctx.fillStyle = '#dfe7f2'; ctx.font = 'bold 14px "PingFang SC", sans-serif';
    ctx.fillText(game.level.name, W - 20, 30);
    const total = game.level.enemies.length;
    const killed = game.level.enemies.filter((e) => !e.alive).length;
    ctx.fillStyle = '#8a93a6'; ctx.font = '11px sans-serif';
    if (game.level.hasBoss) {
      // 首领名从场上那只 boss 取，别写死"牛魔王"——12 关里首领各不相同
      let bossName = '';
      for (const e of game.level.enemies) if (e.isBoss && e.name) bossName = e.name;
      ctx.fillText(bossName ? '击败 ' + bossName + ' 即可通关' : '击败首领即可通关', W - 20, 48);
    } else {
      ctx.fillText('妖物 ' + killed + '/' + total + ' · 抵达终点旗帜通关', W - 20, 48);
    }
    ctx.textAlign = 'left';

    // 货币：右上角常驻
    currencyChip(ctx, W - 248, 56, '仙玉', game.jade, '#7CFC9B');
    currencyChip(ctx, W - 128, 56, '金', game.gold, '#f4c430');

    // 状态图标（护盾/加速/攻击/防御）
    let bxx = 108;
    const now = game.now;
    const buffs = [];
    if (now < pl.buffAtkUntil) buffs.push(['攻', '#ffb35c']);
    if (now < pl.buffDefUntil) buffs.push(['防', '#8bc8ff']);
    if (now < pl.buffSpdUntil) buffs.push(['速', '#7fd0ff']);
    if (now < pl.shieldUntil) buffs.push(['盾', '#ffd479']);
    for (const b of buffs) {
      rrect(ctx, bxx, 88, 22, 16, 5);
      ctx.fillStyle = 'rgba(20,26,38,0.9)'; ctx.fill();
      ctx.strokeStyle = b[1]; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = b[1]; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(b[0], bxx + 11, 100); ctx.textAlign = 'left';
      bxx += 26;
    }

    // —— 技能图标 ——
    // 底部操作条压暗：避免怪物/地形从图标缝隙里透出来，保证可读性
    const scrimTop = H - 108;
    if (ctx.createLinearGradient) {
      const sg = ctx.createLinearGradient(0, scrimTop, 0, H);
      sg.addColorStop(0, 'rgba(6,9,14,0)');
      sg.addColorStop(0.6, 'rgba(6,9,14,0.55)');
      sg.addColorStop(1, 'rgba(6,9,14,0.82)');
      ctx.fillStyle = sg;
    } else {
      ctx.fillStyle = 'rgba(6,9,14,0.62)';
    }
    ctx.fillRect(0, scrimTop, W, H - scrimTop);

    const skillKeys = ['K', 'U', 'I'];
    for (let i = 0; i < 3; i++) {
      const sid = pl.char.skills[i];
      const sk = sid ? XY.getSkill(sid) : null;
      const x = 18 + i * 62, y = H - 82, size = 54;
      if (!sk) {
        rrect(ctx, x, y, size, size, size * 0.2);
        ctx.fillStyle = 'rgba(20,26,38,0.85)'; ctx.fill();
        ctx.strokeStyle = '#2a3550'; ctx.stroke();
        continue;
      }
      const cd = pl.skillCd[sk.id] || 0;
      const cdPct = now < cd ? (cd - now) / sk.cooldown : 0;
      const ready = pl.energy >= sk.cost && cdPct <= 0;
      Art().drawSkillIcon(ctx, x, y, size, sk, cdPct, ready);
      // 按键角标
      rrect(ctx, x + size - 16, y + size - 16, 16, 16, 4);
      ctx.fillStyle = 'rgba(8,11,17,0.9)'; ctx.fill();
      ctx.fillStyle = ready ? '#ffd479' : '#6c788c'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(skillKeys[i], x + size - 8, y + size - 4);
      ctx.textAlign = 'left';
      // 名称
      ctx.fillStyle = '#9fb0c8'; ctx.font = '10px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(sk.name, x + size / 2, y - 6);
      ctx.textAlign = 'left';
    }

    // —— 法宝图标 ——
    for (let i = 0; i < 3; i++) {
      const tid = pl.treasures[i];
      const size = 54, x = W - 18 - size - (2 - i) * 62, y = H - 82;
      if (!tid) {
        rrect(ctx, x, y, size, size, size * 0.2);
        ctx.fillStyle = 'rgba(20,26,38,0.7)'; ctx.fill();
        ctx.strokeStyle = '#2a2a3a'; ctx.stroke();
        ctx.fillStyle = '#4b5468'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('空', x + size / 2, y + size / 2 + 4); ctx.textAlign = 'left';
        continue;
      }
      const t = XY.getTreasure(tid);
      const cd = pl.treasureCd[tid] || 0;
      const cdPct = now < cd ? (cd - now) / t.cooldown : 0;
      Art().drawTreasureIcon(ctx, x, y, size, t, cdPct, true);
      rrect(ctx, x + size - 16, y + size - 16, 16, 16, 4);
      ctx.fillStyle = 'rgba(8,11,17,0.9)'; ctx.fill();
      ctx.fillStyle = cdPct <= 0 ? '#d6b3ff' : '#6c788c'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), x + size - 8, y + size - 4);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#9a8fb8'; ctx.font = '10px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(t.name, x + size / 2, y - 6);
      ctx.textAlign = 'left';
    }

    // —— 经验飘字（在 EXP 条附近） ——
    if (game.expPops) {
      for (const p of game.expPops) {
        const a = Math.max(0, Math.min(1, p.life / 0.5));
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color || '#9be7ff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(p.text, bx + bw * 0.78 + 8, 96 - (1.1 - Math.min(1.1, p.life)) * 22);
        ctx.globalAlpha = 1;
      }
    }

    // 底部提示
    ctx.fillStyle = 'rgba(140,152,175,0.85)'; ctx.font = '11px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('B 背包 · L 锻造 · G 商店 · H 技能 · P 暂停 · M 静音', W / 2, H - 6);
    ctx.textAlign = 'left';

    if (XY.Input && XY.Input.keyCount === 0 && (game.bossBarA || 0) < 0.25) {
      ctx.fillStyle = 'rgba(255,212,121,0.92)'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('键盘未接管 · 用画面下方按钮操作（或先点一下画面再按键）', W / 2, 112);
      ctx.textAlign = 'left';
    }
  };

  // ===== 首领血条（屏幕上方，遇敌时滑下来）=====
  UI.drawBossBar = function (ctx, game) {
    const a = Math.min(1, game.bossBarA || 0);
    const boss = game.bossRef;
    if (!boss || a < 0.02) return;
    const enraged = boss.hp <= boss.maxHp * 0.5;
    const winding = boss.state === 'windup';
    const pulse = 0.6 + 0.4 * Math.sin((game.now || 0) / 90);
    const pw = 588, ph = 66, px = (W - pw) / 2, py = 86;
    const barX = px + 20, barY = py + 32, barW = pw - 40, barH = 15;
    const pct = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(0, (1 - a) * -24);
    // 底板
    rrect(ctx, px, py, pw, ph, 12);
    ctx.fillStyle = 'rgba(10,12,20,0.84)'; ctx.fill();
    if (winding) {
      // 首领起手：整条外框闪红，提醒"要出招了"
      ctx.globalAlpha = a * (0.45 + 0.5 * pulse);
      rrect(ctx, px - 2, py - 2, pw + 4, ph + 4, 13);
      ctx.strokeStyle = '#ff5e5e'; ctx.lineWidth = 3; ctx.stroke();
      ctx.globalAlpha = a;
    }
    ctx.strokeStyle = enraged ? 'rgba(255,94,94,0.92)' : 'rgba(255,212,121,0.62)';
    ctx.lineWidth = 1.8; ctx.stroke();
    // 两端的小回纹
    ctx.strokeStyle = enraged ? '#ff5e5e' : '#ffd479'; ctx.lineWidth = 2;
    for (const s of [0, 1]) {
      const x0 = s ? px + pw - 20 : px + 20;
      ctx.beginPath();
      ctx.moveTo(x0, py + 7); ctx.lineTo(s ? x0 + 14 : x0 - 14, py + 7);
      ctx.stroke();
    }
    // 名字 + 称号
    ctx.textAlign = 'center';
    ctx.fillStyle = enraged ? '#ff9a9a' : '#ffd479';
    ctx.font = 'bold 21px "PingFang SC", "Microsoft YaHei", serif';
    ctx.fillText(boss.name + (boss.level ? '  Lv.' + boss.level : ''), W / 2, py + 25);
    // 血条
    rrect(ctx, barX, barY, barW, barH, barH / 2);
    ctx.fillStyle = '#191a24'; ctx.fill();
    if (pct > 0) {
      if (ctx.createLinearGradient) {
        const g = ctx.createLinearGradient(barX, barY, barX + barW, barY);
        g.addColorStop(0, enraged ? '#8f1c1c' : '#9e2b2b');
        g.addColorStop(0.6, enraged ? '#e03a2a' : '#d94a35');
        g.addColorStop(1, enraged ? '#ff7a3a' : '#ef7a3f');
        ctx.fillStyle = g;
      } else ctx.fillStyle = '#c0392b';
      rrect(ctx, barX, barY, Math.max(barH, barW * pct), barH, barH / 2); ctx.fill();
      const prev = ctx.globalAlpha;
      ctx.globalAlpha = prev * 0.32; ctx.fillStyle = '#fff';
      rrect(ctx, barX + 3, barY + 2, Math.max(0, barW * pct - 6), barH * 0.32, 3); ctx.fill();
      ctx.globalAlpha = prev;
    }
    // 四分之一刻度
    ctx.strokeStyle = 'rgba(0,0,0,0.38)'; ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const tx = barX + (barW * i) / 4;
      ctx.beginPath(); ctx.moveTo(tx, barY); ctx.lineTo(tx, barY + barH); ctx.stroke();
    }
    // 半血狂暴线
    const mx = barX + barW * 0.5;
    ctx.strokeStyle = 'rgba(255,212,121,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(mx, barY - 3); ctx.lineTo(mx, barY + barH + 3); ctx.stroke();
    // 血量数字（条内右侧）
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = 'bold 11px sans-serif';
    ctx.fillText(Math.ceil(boss.hp) + ' / ' + boss.maxHp, barX + barW - 8, barY + barH - 3.5);
    // 称号 / 起手招式 / 狂暴提示
    ctx.textAlign = 'center';
    if (winding && boss.cur) {
      ctx.fillStyle = 'rgba(255,120,110,' + (0.65 + 0.35 * pulse) + ')';
      ctx.font = 'bold 11px "PingFang SC", sans-serif';
      ctx.fillText('！' + boss.cur.name + '  起手', W / 2, py + ph - 4);
    } else if (enraged) {
      ctx.fillStyle = 'rgba(255,140,110,' + (0.6 + 0.35 * Math.sin((game.now || 0) / 180)) + ')';
      ctx.font = 'bold 11px "PingFang SC", sans-serif';
      ctx.fillText('狂暴 · 出手更快', W / 2, py + ph - 4);
    } else {
      ctx.fillStyle = 'rgba(160,172,190,0.82)'; ctx.font = '11px "PingFang SC", sans-serif';
      ctx.fillText(boss.title ? '「' + boss.title + '」' : '', W / 2, py + ph - 4);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  };

  // ===== 标题 =====
  UI.drawTitle = function (ctx, t) {
    UI.drawBackground(ctx, 0, t);

    // 右侧：大圣立绘（标题页的视觉主角）
    const ax = W * 0.795, ay = H - 26;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    if (ctx.ellipse) ctx.ellipse(ax, ay + 6, 92, 15, 0, 0, Math.PI * 2);
    else ctx.arc(ax, ay, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.97;
    Art().drawCharacter(ctx, ax, ay, 2.45, 'wukong', { t: t, state: 'idle', facing: 1 });
    ctx.restore();

    // 左侧压暗，保证文字可读
    const vg = ctx.createLinearGradient(0, 0, W * 0.8, 0);
    vg.addColorStop(0, 'rgba(5,9,16,0.82)');
    vg.addColorStop(0.55, 'rgba(5,9,16,0.45)');
    vg.addColorStop(1, 'rgba(5,9,16,0)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    // 标题
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(255,180,60,0.35)'; ctx.shadowBlur = 26;
    ctx.fillStyle = '#ffd479'; ctx.font = 'bold 66px serif';
    ctx.fillText('西游', 92, 202);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('降妖录', 92, 274);
    ctx.shadowBlur = 0;
    // 金线
    const lg = ctx.createLinearGradient(92, 0, 470, 0);
    lg.addColorStop(0, 'rgba(255,212,121,0.9)'); lg.addColorStop(1, 'rgba(255,212,121,0)');
    ctx.fillStyle = lg; ctx.fillRect(92, 296, 380, 2);

    ctx.fillStyle = '#cfe0f5'; ctx.font = '16px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('横版动作闯关 · 法宝合成 · 五圣同行', 94, 330);

    // 开始提示
    const a = 0.5 + Math.sin(t / 320) * 0.5;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "PingFang SC", sans-serif';
    ctx.fillText('按 Enter 开始', 94, 400);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(92, 382, 156, 26);

    // 操作说明
    ctx.fillStyle = '#93a3bb'; ctx.font = '12.5px "PingFang SC", sans-serif';
    ctx.fillText('A D 移动（双击奔跑） · W 跳（可二段跳） · S 快落 · J 普攻', 94, 462);
    ctx.fillText('K U I 技能 · 1 2 3 法宝 · B 背包 · L 锻造 · G 商店 · H 技能 · M 静音', 94, 484);
    ctx.textAlign = 'left';
  };

  // ===== 选角 =====
  // 卡片与"确认出战"按钮的几何：绘制和鼠标命中共用一份，改版面不会只改到一边
  UI.CHAR_L = { cardW: 168, gap: 14, y: 74, h: 384, btnW: 216, btnH: 34, btnY: 472 };
  UI.charSelectLayout = function () {
    const L = UI.CHAR_L;
    const n = XY.CHARACTER_ORDER.length;
    const total = n * L.cardW + (n - 1) * L.gap;
    return {
      n, cardW: L.cardW, gap: L.gap, y: L.y, h: L.h, x0: (W - total) / 2,
      btn: { x: (W - L.btnW) / 2, y: L.btnY, w: L.btnW, h: L.btnH },
    };
  };
  UI.charSelectCardAt = function (px, py) {
    const L = UI.charSelectLayout();
    if (!(py >= L.y && py <= L.y + L.h)) return -1;
    for (let i = 0; i < L.n; i++) {
      const x = L.x0 + i * (L.cardW + L.gap);
      if (px >= x && px <= x + L.cardW) return i;
    }
    return -1;
  };
  UI.charSelectBtnHit = function (px, py) {
    const b = UI.charSelectLayout().btn;
    return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  };

  UI.drawCharSelect = function (ctx, game) {
    UI.drawBackground(ctx, 0, game.uiTime);
    center(ctx, '选择你的角色', 50, 'bold 32px serif', '#ffd479');
    const order = XY.CHARACTER_ORDER;
    const L = UI.charSelectLayout();
    const { cardW, gap, y } = L;
    const x0 = L.x0;
    const mx = (XY.Input && XY.Input.mouse) ? XY.Input.mouse.x : -999;
    const my = (XY.Input && XY.Input.mouse) ? XY.Input.mouse.y : -999;
    const hover = UI.charSelectCardAt(mx, my);
    for (let i = 0; i < order.length; i++) {
      const c = XY.CHARACTERS[order[i]];
      const x = x0 + i * (cardW + gap);
      const sel = i === game.charIndex;
      const hov = i === hover && !sel;
      rrect(ctx, x, y, cardW, L.h, 12);
      ctx.fillStyle = sel ? 'rgba(42,53,80,0.96)' : (hov ? 'rgba(30,38,54,0.95)' : 'rgba(20,26,38,0.9)'); ctx.fill();
      ctx.strokeStyle = sel ? '#ffd479' : (hov ? '#7f8fb0' : '#33405c'); ctx.lineWidth = sel ? 3 : (hov ? 2 : 1); ctx.stroke();
      if (sel) {
        ctx.save();
        ctx.shadowColor = 'rgba(255,212,121,0.55)'; ctx.shadowBlur = 18;
        rrect(ctx, x, y, cardW, L.h, 12); ctx.stroke();
        ctx.restore();
      }
      // 立绘
      ctx.save();
      rrect(ctx, x + 6, y + 6, cardW - 12, 172, 8); ctx.clip();
      const bgG = ctx.createLinearGradient(x, y, x, y + 180);
      bgG.addColorStop(0, 'rgba(255,255,255,0.06)'); bgG.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = bgG; ctx.fillRect(x + 6, y + 6, cardW - 12, 172);
      const bounce = sel ? Math.sin(game.uiTime / 420) * 3 : 0;
      Art().drawCharacter(ctx, x + cardW / 2, y + 168 + bounce, 1.55, c.id, { t: game.uiTime, state: 'idle', facing: 1 });
      ctx.restore();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "PingFang SC", sans-serif';
      ctx.fillText(c.name, x + cardW / 2, y + 208);
      ctx.fillStyle = '#ffd479'; ctx.font = '12px "PingFang SC", sans-serif';
      ctx.fillText(c.title, x + cardW / 2, y + 226);
      // 属性条
      const stats = [['气血', c.base.maxHp / 3.2, '#e0453a'], ['攻击', c.base.attack * 3.4, '#ffb35c'], ['防御', c.base.defense * 5, '#8bc8ff']];
      let sy = y + 244;
      for (const s of stats) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#8a93a6'; ctx.font = '10px "PingFang SC", sans-serif';
        ctx.fillText(s[0], x + 14, sy + 7);
        rrect(ctx, x + 44, sy, cardW - 58, 7, 3.5);
        ctx.fillStyle = '#1a2130'; ctx.fill();
        rrect(ctx, x + 44, sy, Math.min(cardW - 58, s[1]), 7, 3.5);
        ctx.fillStyle = s[2]; ctx.fill();
        sy += 16;
      }
      // 技能小图标
      for (let k = 0; k < c.skills.length; k++) {
        const sk = XY.getSkill(c.skills[k]);
        if (!sk) continue;
        Art().drawSkillIcon(ctx, x + 16 + k * 30, y + 296, 26, sk, 0, true);
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = '#9fb0c8'; ctx.font = '10px "PingFang SC", sans-serif';
      wrapText(ctx, c.backstory, x + 14, y + 340, cardW - 28, 12);
    }
    // 确认出战按钮（可点）：把"点了卡片还以为选上了"的坑堵死
    const b = L.btn;
    const bHover = UI.charSelectBtnHit(mx, my);
    ctx.save();
    if (bHover) { ctx.shadowColor = 'rgba(255,212,121,0.7)'; ctx.shadowBlur = 16; }
    rrect(ctx, b.x, b.y, b.w, b.h, 17);
    ctx.fillStyle = bHover ? '#ffe6a6' : '#f0c14b'; ctx.fill();
    ctx.restore();
    rrect(ctx, b.x, b.y, b.w, b.h, 17);
    ctx.strokeStyle = 'rgba(60,44,10,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    const cur = XY.CHARACTERS[order[game.charIndex]];
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3a2a06'; ctx.font = 'bold 15px "PingFang SC", sans-serif';
    ctx.fillText('以 ' + cur.name + ' 出战 · Enter', b.x + b.w / 2, b.y + 22);
    ctx.textAlign = 'left';
    center(ctx, 'A / D 或 ← → 选择 · 点卡片直接出战 · Esc 回主菜单', 522, '14px "PingFang SC", sans-serif', '#9fb0c8');
  };

  // ===== 关卡选择 =====
  // 4 列 × 3 行的卡片墙：主线 8 关排在前面，支线 4 关接在后面（顺序由 XY.levelGrid 定）
  UI.LEVEL_L = { cols: 4, cardW: 200, cardH: 114, gapX: 18, gapY: 14, y: 104 };
  UI.levelSelectLayout = function () {
    const L = UI.LEVEL_L;
    const order = XY.levelGrid ? XY.levelGrid() : [];
    const n = order.length;
    const rows = Math.max(1, Math.ceil(n / L.cols));
    const totalW = L.cols * L.cardW + (L.cols - 1) * L.gapX;
    return {
      n, rows, order, cols: L.cols, cardW: L.cardW, cardH: L.cardH,
      gapX: L.gapX, gapY: L.gapY, x0: (W - totalW) / 2, y0: L.y,
    };
  };
  // 鼠标命中：返回卡片在网格里的序号（不是关卡下标），跟 game.js 里 order[pos] 的换算一致
  UI.levelCardAt = function (px, py, n) {
    const L = UI.levelSelectLayout();
    const count = Number.isFinite(n) ? Math.min(n | 0, L.n) : L.n;
    if (!(py >= L.y0)) return -1;
    const r = Math.floor((py - L.y0) / (L.cardH + L.gapY));
    if (r < 0 || r >= L.rows) return -1;
    if (py > L.y0 + r * (L.cardH + L.gapY) + L.cardH) return -1;
    for (let c = 0; c < L.cols; c++) {
      const x = L.x0 + c * (L.cardW + L.gapX);
      if (px >= x && px <= x + L.cardW) {
        const pos = r * L.cols + c;
        return pos < count ? pos : -1;
      }
    }
    return -1;
  };

  // 三种场景各一套色：卡片左侧色条 + 锁定时的底色
  const LV_TINT = [
    { band: '#5f9c6a', dim: 'rgba(17,27,20,0.95)' },   // 花果山：山林绿
    { band: '#4b8fb5', dim: 'rgba(15,25,34,0.95)' },   // 涧 / 河：水蓝
    { band: '#c4614a', dim: 'rgba(33,18,14,0.95)' },   // 火焰山：火红
  ];
  // 关卡名拆成「第几回」+「地点」，卡片里分两行放才不挤
  function lvParts(lv) {
    const s = String(lv.name || '');
    const at = s.indexOf('·');
    if (at < 0) return { chapter: lv.kind === 'side' ? '支线' : '主线', title: s };
    return { chapter: s.slice(0, at).trim(), title: s.slice(at + 1).trim() };
  }
  // 未解锁时告诉玩家差哪一关
  function lvNeed(lv, idx) {
    if (lv.kind === 'side') {
      const rq = XY.LEVELS[lv.require];
      return rq ? '需先通关 ' + rq.name : '需先通关任意主线';
    }
    for (let i = idx - 1; i >= 0; i--) if (XY.LEVELS[i].kind === 'main') return '需先通关 ' + XY.LEVELS[i].name;
    return '';
  }

  UI.drawLevelSelect = function (ctx, game) {
    const cleared = (game.persist && game.persist.cleared) || [];
    UI.drawBackground(ctx, game.levelCursor || 0, game.uiTime);
    ctx.fillStyle = 'rgba(6,9,15,0.68)'; ctx.fillRect(0, 0, W, H);

    const L = UI.levelSelectLayout();
    const order = L.order;

    // —— 标题 + 进度 ——
    ctx.textAlign = 'left';
    ctx.save();
    ctx.shadowColor = 'rgba(255,180,60,0.4)'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffd479'; ctx.font = 'bold 30px serif';
    ctx.fillText('选择关卡', 40, 54);
    ctx.restore();
    let doneCount = 0;
    for (const i of order) if (cleared.indexOf(i) >= 0) doneCount++;
    ctx.fillStyle = '#8a93a6'; ctx.font = '13px "PingFang SC", sans-serif';
    ctx.fillText('已通关 ' + doneCount + ' / ' + L.n + ' · 通关过的关随时可以重打刷材料', 40, 78);
    // 右上角一条细进度
    const pw2 = 200, px2 = W - 40 - pw2;
    rrect(ctx, px2, 44, pw2, 6, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();
    if (doneCount > 0) {
      rrect(ctx, px2, 44, Math.max(6, pw2 * doneCount / L.n), 6, 3);
      ctx.fillStyle = '#7cfc9b'; ctx.fill();
    }

    const mx = (XY.Input && XY.Input.mouse) ? XY.Input.mouse.x : -999;
    const my = (XY.Input && XY.Input.mouse) ? XY.Input.mouse.y : -999;
    const hoverPos = UI.levelCardAt(mx, my, L.n);

    for (let p = 0; p < L.n; p++) {
      const idx = order[p];
      const lv = XY.LEVELS[idx];
      if (!lv) continue;
      const x = L.x0 + (p % L.cols) * (L.cardW + L.gapX);
      const y = L.y0 + Math.floor(p / L.cols) * (L.cardH + L.gapY);
      const seen = cleared.indexOf(idx) >= 0;
      const open = seen || XY.levelUnlocked(idx, cleared);
      const sel = idx === game.levelCursor;
      const hov = p === hoverPos && !sel;
      const tint = LV_TINT[((lv.theme | 0) % LV_TINT.length + LV_TINT.length) % LV_TINT.length];
      const side = lv.kind === 'side';

      // 卡面
      rrect(ctx, x, y, L.cardW, L.cardH, 11);
      ctx.fillStyle = open ? (sel ? 'rgba(38,47,68,0.97)' : (hov ? 'rgba(28,35,50,0.95)' : 'rgba(18,23,34,0.9)'))
        : tint.dim;
      ctx.fill();
      ctx.strokeStyle = sel ? '#ffd479' : (hov ? '#7f8fb0' : (open ? '#2f3b55' : 'rgba(255,255,255,0.07)'));
      ctx.lineWidth = sel ? 2.5 : (hov ? 1.8 : 1);
      ctx.stroke();
      if (sel) {
        ctx.save();
        ctx.shadowColor = 'rgba(255,212,121,0.5)'; ctx.shadowBlur = 16;
        rrect(ctx, x, y, L.cardW, L.cardH, 11); ctx.stroke();
        ctx.restore();
      }
      // 左侧色条（场景色，锁定时压暗）
      ctx.save();
      rrect(ctx, x, y, L.cardW, L.cardH, 11); ctx.clip();
      ctx.fillStyle = tint.band;
      ctx.globalAlpha = open ? 0.9 : 0.28;
      ctx.fillRect(x, y, 4, L.cardH);
      ctx.restore();

      const bx = x + 16;
      // 回目（或"支线"）
      ctx.fillStyle = open ? (side ? '#c9a6ff' : '#8a93a6') : 'rgba(140,150,170,0.45)';
      ctx.font = '11px "PingFang SC", sans-serif';
      ctx.fillText(side ? (open ? '支线 · 可选' : '支线') : lvParts(lv).chapter, bx, y + 22);
      // 地点
      ctx.fillStyle = open ? '#f2f6fc' : 'rgba(190,198,214,0.4)';
      ctx.font = 'bold 19px "PingFang SC", sans-serif';
      ctx.fillText(lvParts(lv).title, bx, y + 48);
      // 副题（多半是头目名）
      ctx.fillStyle = open ? '#9fb0c8' : 'rgba(150,160,180,0.35)';
      ctx.font = '11.5px "PingFang SC", sans-serif';
      ctx.fillText(lv.sub || '', bx, y + 68);

      // 右下：建议等级
      let maxLv = 1;
      for (const s of (lv.spawns || [])) maxLv = Math.max(maxLv, s.level || 1);
      ctx.textAlign = 'right';
      ctx.fillStyle = open ? '#5b6678' : 'rgba(120,130,150,0.3)';
      ctx.font = '10.5px "PingFang SC", sans-serif';
      ctx.fillText('敌 Lv' + maxLv, x + L.cardW - 14, y + L.cardH - 30);
      ctx.textAlign = 'left';

      // 底部状态行
      const sy = y + L.cardH - 13;
      if (seen) {
        ctx.fillStyle = '#7cfc9b'; ctx.font = 'bold 12px "PingFang SC", sans-serif';
        ctx.fillText('✓ 已通关', bx, sy);
      } else if (open) {
        const blink = 0.72 + Math.sin(game.uiTime / 260) * 0.28;
        ctx.globalAlpha = blink;
        ctx.fillStyle = '#ffd479'; ctx.font = 'bold 12px "PingFang SC", sans-serif';
        ctx.fillText('▶ 可挑战', bx, sy);
        ctx.globalAlpha = 1;
      } else {
        // 小锁
        const lx = bx + 5, ly = sy - 9;
        ctx.strokeStyle = 'rgba(150,160,180,0.5)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(lx, ly + 1, 3.2, Math.PI, 0); ctx.stroke();
        rrect(ctx, lx - 5, ly + 1, 10, 8, 2);
        ctx.fillStyle = 'rgba(150,160,180,0.45)'; ctx.fill();
        ctx.fillStyle = 'rgba(160,170,190,0.5)'; ctx.font = '11.5px "PingFang SC", sans-serif';
        ctx.fillText('未解锁', bx + 16, sy);
      }
    }

    // —— 底部：选中关卡的一句引子（剧情在选关页就能读到，不用开打才知道）——
    const cur = XY.LEVELS[game.levelCursor];
    if (cur) {
      const intro = (cur.intro && cur.intro[0]) || '';
      const open = cleared.indexOf(game.levelCursor) >= 0 || XY.levelUnlocked(game.levelCursor, cleared);
      ctx.fillStyle = 'rgba(255,212,121,0.7)'; ctx.fillRect(40, 490, 2, 18);
      ctx.fillStyle = '#cfd8e6'; ctx.font = '12.5px "PingFang SC", sans-serif';
      const line = open ? intro : (intro ? intro + '（' + lvNeed(cur, game.levelCursor) + '）' : lvNeed(cur, game.levelCursor));
      wrapText(ctx, line, 52, 504, 860, 16, 1);
    }
    center(ctx, 'WASD / 方向键 选关 · Enter 进入 · Esc 换角色', 526, '13px "PingFang SC", sans-serif', 'rgba(150,162,182,0.9)');
  };

  // ===== 过场 CG =====
  UI.drawCutscene = function (ctx, beat, alpha, t, charId, index, total) {
    if (!beat) beat = { bgTop: '#101018', bgBottom: '#1a1a28', glyph: '✦', title: '', lines: [] };
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, beat.bgTop); g.addColorStop(1, beat.bgBottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 放射光
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t / 5200;
      ctx.beginPath(); ctx.moveTo(W / 2, 240);
      ctx.lineTo(W / 2 + Math.cos(a) * 700, 240 + Math.sin(a) * 700); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 角色立绘：半透明剪影，缓缓呼吸起伏——每一幕都得有"人在场"的分量
    if (charId && XY.Art && XY.Art.drawCharacter) {
      const bob = Math.sin(t / 1400) * 2.6;
      ctx.save();
      // 脚下光晕：三层同心圆堆叠代替径向渐变，测试桩里也安全
      ctx.save();
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.09 - i * 0.028;
        ctx.fillStyle = '#ffde99';
        ctx.beginPath();
        ctx.arc(W / 2, 368, 190 - i * 56, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 0.36;
      XY.Art.drawCharacter(ctx, W / 2, 398 + bob, 3.15, charId, { state: 'idle', t, facing: 1 });
      ctx.restore();
    }

    // 文字区压暗：半透明立绘之上也要看得清
    const shade = ctx.createLinearGradient(0, 318, 0, H);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(0.3, 'rgba(0,0,0,0.64)');
    shade.addColorStop(1, 'rgba(0,0,0,0.84)');
    ctx.fillStyle = shade; ctx.fillRect(0, 318, W, H - 318);

    center(ctx, beat.glyph, 152, '26px serif', 'rgba(255,255,255,0.85)');
    center(ctx, beat.title, 406, 'bold 29px serif', '#ffd479');
    for (let i = 0; i < beat.lines.length; i++) center(ctx, beat.lines[i], 446 + i * 29, '17px "PingFang SC", sans-serif', '#eae4d8');

    // 幕次进度
    if (total > 1) {
      const gap = 17, sx = W - 46 - (total - 1) * gap;
      for (let i = 0; i < total; i++) {
        ctx.beginPath();
        ctx.arc(sx + i * gap, 34, i === index ? 4.2 : 2.6, 0, Math.PI * 2);
        ctx.fillStyle = i === index ? '#ffd479' : 'rgba(255,255,255,0.38)';
        ctx.fill();
      }
    }
    center(ctx, '按 Enter / 空格 跳过', 512, '13px "PingFang SC", sans-serif', '#8a93a6');
  };

  // ===== 关卡前情 =====
  UI.drawLevelIntro = function (ctx, game) {
    // 以「当前关卡序号」为准：从过关结算点下一关时，旧关卡的 level 还在，不能拿它当标题
    const data = XY.LEVELS[game.levelIndex] || (game.level && game.level.data) || XY.LEVELS[0];
    UI.drawBackground(ctx, game.levelIndex, game.uiTime);
    ctx.fillStyle = 'rgba(2,4,8,0.62)'; ctx.fillRect(0, 0, W, H);
    // 上下两条渐隐压暗，把文字区托出来
    let g = ctx.createLinearGradient(0, 0, 0, 200);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 200);
    g = ctx.createLinearGradient(0, H - 190, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = g; ctx.fillRect(0, H - 190, W, 190);

    // 主线 / 支线 小标
    const side = data.kind === 'side';
    ctx.textAlign = 'center';
    rrect(ctx, W / 2 - 30, 118, 60, 22, 6);
    ctx.fillStyle = side ? 'rgba(140,90,200,0.28)' : 'rgba(255,212,121,0.18)'; ctx.fill();
    ctx.strokeStyle = side ? '#9a6ae0' : '#c9a24a'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = side ? '#c9a6ff' : '#ffd479'; ctx.font = 'bold 11px "PingFang SC", sans-serif';
    ctx.fillText(side ? '支 线' : '主 线', W / 2, 133);
    ctx.textAlign = 'left';

    ctx.save();
    ctx.shadowColor = 'rgba(255,180,60,0.42)'; ctx.shadowBlur = 26;
    center(ctx, data.name, 178, 'bold 38px serif', '#ffd479');
    ctx.restore();
    if (data.sub) center(ctx, data.sub, 208, '15px "PingFang SC", sans-serif', '#9fb0c8');

    const lg = ctx.createLinearGradient(W / 2 - 190, 0, W / 2 + 190, 0);
    lg.addColorStop(0, 'rgba(255,212,121,0)'); lg.addColorStop(0.5, 'rgba(255,212,121,0.75)'); lg.addColorStop(1, 'rgba(255,212,121,0)');
    ctx.fillStyle = lg; ctx.fillRect(W / 2 - 190, 226, 380, 1.5);

    // 前情：一句一行，最多 4 行（剧情都写进关卡数据里了）
    const lines = (data.intro && data.intro.length) ? data.intro : [XY.STORY.levelIntros[data.id] || ''];
    let iy = 264;
    for (const line of lines.slice(0, 4)) {
      center(ctx, line, iy, '16.5px "PingFang SC", sans-serif', '#dbe4f0');
      iy += 30;
    }

    // 首通奖励
    const rw = data.reward || {};
    const bits = [];
    if (rw.jade) bits.push('仙玉 +' + rw.jade);
    if (rw.gold) bits.push('金币 +' + rw.gold);
    const seen = (game.persist && game.persist.cleared || []).indexOf(game.levelIndex) >= 0;
    if (bits.length) {
      center(ctx, (seen ? '重打可得：' : '首通奖励：') + bits.join(' · '), 404, '13px "PingFang SC", sans-serif', '#7cfc9b');
    }
    let boss = '';
    for (const s of (data.spawns || [])) if (s.type === 'boss' && s.boss && XY.BOSSES && XY.BOSSES[s.boss]) boss = XY.BOSSES[s.boss].name;
    // 副题已经写着首领名的就不用再重复一遍
    if (boss && boss !== data.sub) center(ctx, '首领 · ' + boss, 428, '13px "PingFang SC", sans-serif', '#ff9a6a');

    const a = 0.6 + Math.sin(game.uiTime / 300) * 0.4;
    ctx.globalAlpha = a;
    center(ctx, '按 Enter 进入', 480, '18px "PingFang SC", sans-serif', '#fff');
    ctx.globalAlpha = 1;
    center(ctx, 'Esc 回关卡选择', 510, '12.5px "PingFang SC", sans-serif', 'rgba(150,162,182,0.85)');
  };

  UI.drawPause = function (ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0, 0, W, H);
    center(ctx, '暂停', 230, 'bold 44px serif', '#ffd479');
    center(ctx, 'P 继续', 296, '18px "PingFang SC", sans-serif', '#fff');
    center(ctx, 'R 放弃本关回到关卡选择', 332, '14px "PingFang SC", sans-serif', '#8a93a6');
    center(ctx, 'M 关掉 / 打开音乐与音效', 358, '14px "PingFang SC", sans-serif', '#8a93a6');
  };

  UI.drawGameOver = function (ctx) {
    ctx.fillStyle = 'rgba(40,0,0,0.72)'; ctx.fillRect(0, 0, W, H);
    center(ctx, '英雄落败', 230, 'bold 48px serif', '#e74c3c');
    center(ctx, '按 Enter 回到关卡选择 · Esc 回主菜单', 300, '18px "PingFang SC", sans-serif', '#fff');
    center(ctx, '战果与等级都已存档，换个关练级或重打这一关都行', 336, '13px "PingFang SC", sans-serif', '#8a93a6');
  };

  // ===== 过关结算：给玩家一条岔路（下一关 / 商店 / 锻造 / 参悟 / 主菜单）=====
  // 过关结算右侧选项的几何（绘制与鼠标命中共用）
  UI.CLEAR_L = { x: 430, y: 126, w: 460, h: 50, gap: 8 };
  UI.levelClearOptionAt = function (px, py, n) {
    const L = UI.CLEAR_L;
    if (!(px >= L.x && px <= L.x + L.w)) return -1;
    const count = Math.max(0, n | 0);
    for (let i = 0; i < count; i++) {
      const y = L.y + i * (L.h + L.gap);
      if (py >= y && py <= y + L.h) return i;
    }
    return -1;
  };

  UI.drawLevelClear = function (ctx, game) {
    UI.drawBackground(ctx, game.levelIndex, game.uiTime, game.cam ? game.cam.x : 0);
    ctx.fillStyle = 'rgba(4,7,12,0.8)'; ctx.fillRect(0, 0, W, H);
    // 从上方斜洒下来的金色光柱
    for (let i = 0; i < 5; i++) {
      const x = 90 + i * 200 + Math.sin(game.uiTime / 1000 + i * 1.7) * 14;
      const g = ctx.createLinearGradient(x, 0, x + 80, H);
      g.addColorStop(0, 'rgba(255,212,121,0.14)');
      g.addColorStop(1, 'rgba(255,212,121,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + 54, 0); ctx.lineTo(x + 126, H); ctx.lineTo(x + 44, H);
      ctx.closePath(); ctx.fill();
    }

    const st = game.clearStats || { name: '', kills: 0, total: 0, jade: 0, gold: 0, level: 1, seconds: 0, last: false };
    // 标题
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(255,180,60,0.45)'; ctx.shadowBlur = 22;
    ctx.fillStyle = '#ffd479'; ctx.font = 'bold 46px serif';
    ctx.fillText('通 关', 70, 96);
    ctx.shadowBlur = 0;
    // 主线 / 支线 小标
    const isSide = st.kind === 'side';
    rrect(ctx, 232, 66, 52, 22, 6);
    ctx.fillStyle = isSide ? 'rgba(140,90,200,0.22)' : 'rgba(255,212,121,0.16)'; ctx.fill();
    ctx.strokeStyle = isSide ? '#9a6ae0' : '#c9a24a'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = isSide ? '#c9a6ff' : '#ffd479'; ctx.font = 'bold 11px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(isSide ? '支线' : '主线', 258, 81);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e8eef8'; ctx.font = 'bold 20px "PingFang SC", sans-serif';
    ctx.fillText(st.name, 296, 92);
    const lg = ctx.createLinearGradient(70, 0, 470, 0);
    lg.addColorStop(0, 'rgba(255,212,121,0.9)'); lg.addColorStop(1, 'rgba(255,212,121,0)');
    ctx.fillStyle = lg; ctx.fillRect(70, 112, 400, 2);

    // —— 左：战果 ——
    const px = 70, py = 150, pw = 330, ph = 286;
    rrect(ctx, px, py, pw, ph, 14);
    ctx.fillStyle = 'rgba(14,19,28,0.92)'; ctx.fill();
    ctx.strokeStyle = '#2a3550'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#8a93a6'; ctx.font = '11px "PingFang SC", sans-serif';
    ctx.fillText('本 关 战 果', px + 18, py + 26);

    const mm = Math.floor(st.seconds / 60), ss = st.seconds % 60;
    const rows = [
      ['妖物击杀', st.kills + ' / ' + st.total, '#e6ecf5'],
      ['获得仙玉', '+' + st.jade, '#7CFC9B'],
      ['获得金币', '+' + st.gold, '#f4c430'],
      ['当前等级', 'Lv.' + st.level, '#ffd479'],
      ['用时', mm + ':' + (ss < 10 ? '0' : '') + ss, '#9fb0c8'],
    ];
    let yy = py + 62;
    for (const r of rows) {
      ctx.fillStyle = '#8a93a6'; ctx.font = '13px "PingFang SC", sans-serif';
      ctx.fillText(r[0], px + 18, yy);
      ctx.fillStyle = r[2]; ctx.font = 'bold 16px "PingFang SC", sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(r[1], px + pw - 18, yy); ctx.textAlign = 'left';
      yy += 28;
    }
    // 过关后的一句后话：把剧情串起来，不然打完只剩数字
    if (st.outro) {
      ctx.fillStyle = 'rgba(255,212,121,0.16)'; ctx.fillRect(px + 18, py + 200, 2, 70);
      ctx.fillStyle = '#cfd8e6'; ctx.font = '13px "PingFang SC", sans-serif';
      wrapText(ctx, st.outro, px + 30, py + 214, pw - 48, 17, 3);
    }
    if (st.items) {
      ctx.fillStyle = '#7CFC9B'; ctx.font = '11.5px "PingFang SC", sans-serif';
      ctx.fillText('额外战利品：' + st.items, px + 18, py + ph - 14);
    } else {
      ctx.fillStyle = '#5b6678'; ctx.font = '11px "PingFang SC", sans-serif';
      wrapText(ctx, st.firstTime === false ? '本关已通关过，随时可以再打一遍刷材料。' : '战果已自动存档。从这里可以补装备、加点，再上路。',
        px + 18, py + ph - 32, pw - 36, 15, 2);
    }

    // —— 右：选项 ——
    const opts = game.clearOptions ? game.clearOptions() : [];
    const CL = UI.CLEAR_L;
    const ox = CL.x, ow = CL.w, oh = CL.h, gap = CL.gap, oy = CL.y;
    const cmx = (XY.Input && XY.Input.mouse) ? XY.Input.mouse.x : -999;
    const cmy = (XY.Input && XY.Input.mouse) ? XY.Input.mouse.y : -999;
    const hoverI = UI.levelClearOptionAt(cmx, cmy, opts.length);
    for (let i = 0; i < opts.length; i++) {
      const o = opts[i];
      const y = oy + i * (oh + gap);
      const sel = i === game.clearIndex;
      const hov = i === hoverI && !sel;
      rrect(ctx, ox, y, ow, oh, 10);
      ctx.fillStyle = sel ? 'rgba(255,212,121,0.13)' : (hov ? 'rgba(30,38,54,0.95)' : 'rgba(16,21,32,0.9)'); ctx.fill();
      ctx.strokeStyle = sel ? '#ffd479' : (hov ? '#7f8fb0' : '#232c3e');
      ctx.lineWidth = sel ? 2.5 : (hov ? 1.6 : 1); ctx.stroke();
      if (sel) {
        ctx.save();
        ctx.shadowColor = 'rgba(255,212,121,0.45)'; ctx.shadowBlur = 14;
        rrect(ctx, ox, y, ow, oh, 10); ctx.stroke();
        ctx.restore();
      }
      // 选中指示：小三角
      ctx.fillStyle = sel ? '#ffd479' : '#3a4560';
      ctx.beginPath();
      ctx.moveTo(ox + 18, y + oh / 2 - 6);
      ctx.lineTo(ox + 28, y + oh / 2);
      ctx.lineTo(ox + 18, y + oh / 2 + 6);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = sel ? '#fff' : '#dbe4f0'; ctx.font = 'bold 17px "PingFang SC", sans-serif';
      ctx.fillText(o.name, ox + 42, y + 22);
      ctx.fillStyle = '#7d8798'; ctx.font = '11.5px "PingFang SC", sans-serif';
      ctx.fillText(o.note || '', ox + 42, y + 39);

      // 快捷键角标
      const kw = 46;
      rrect(ctx, ox + ow - kw - 14, y + oh / 2 - 12, kw, 24, 6);
      ctx.fillStyle = 'rgba(8,11,17,0.85)'; ctx.fill();
      ctx.strokeStyle = sel ? '#8a6a22' : '#2a3550'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = sel ? '#ffd479' : '#6c788c'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(o.key, ox + ow - kw / 2 - 14, y + oh / 2 + 4);
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = 'rgba(150,162,182,0.9)'; ctx.font = '12px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('W/S 或点击 选择 · Enter 确认 · T 关卡选择 · G 商店 · L 锻造 · H 技能 · Esc 回主菜单', W / 2, H - 14);
    ctx.textAlign = 'left';
  };

  UI.drawWin = function (ctx, game) {
    const t = game ? game.uiTime : 0;
    const lines = (XY.STORY && XY.STORY.ending) || [];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(10,26,16,0.92)'); g.addColorStop(1, 'rgba(4,10,8,0.96)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 一点微光，别让黑屏太死
    const gl = ctx.createRadialGradient(W / 2, 150, 10, W / 2, 150, 340);
    gl.addColorStop(0, 'rgba(140,255,190,0.16)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);

    center(ctx, '西行圆满', 96, 'bold 44px serif', '#7CFC9B');
    const start = 190, step = 38;
    for (let i = 0; i < lines.length; i++) {
      const a = Math.max(0, Math.min(1, (t - i * 420) / 420));
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      const last = i === lines.length - 1;
      center(ctx, lines[i], start + i * step, last ? 'bold 20px serif' : '17px "PingFang SC", sans-serif',
        last ? '#ffd479' : '#dfe8e2');
      ctx.globalAlpha = 1;
    }
    const pulse = 0.55 + Math.sin(t / 320) * 0.35;
    ctx.globalAlpha = pulse;
    center(ctx, '按 Enter 回到主菜单 · 打过的关卡随时可以重打', H - 46, '15px "PingFang SC", sans-serif', '#fff');
    ctx.globalAlpha = 1;
  };

  // ===== 通用：货币标签 =====
  function currencyChip(ctx, x, y, name, value, color) {
    const txt = name + ' ' + value;
    ctx.font = 'bold 13px "PingFang SC", sans-serif';
    const w = ctx.measureText(txt).width + 30;
    rrect(ctx, x, y, w, 24, 12);
    ctx.fillStyle = 'rgba(16,21,32,0.94)'; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 13, y + 12, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.fillStyle = '#e6ecf5'; ctx.textAlign = 'left';
    ctx.fillText(txt, x + 23, y + 17);
    return w;
  }

  // ===== 锻造坊（材料 + 金币）=====
  // 三行对应三档品阶，三列对应 兵器 / 护甲 / 佩饰，一眼看出该先做哪件
  UI.drawCraft = function (ctx, game) {
    UI.drawBackground(ctx, game.levelIndex, game.uiTime);
    ctx.fillStyle = 'rgba(6,9,14,0.84)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd479'; ctx.font = 'bold 30px serif';
    ctx.fillText('锻 造 坊', 40, 50);
    ctx.fillStyle = '#7d8798'; ctx.font = '12px "PingFang SC", sans-serif';
    ctx.fillText('打怪掉材料 → 按品阶锻造 · 成品自动装备', 40, 70);

    currencyChip(ctx, 906 - 118, 30, '金', game.gold, '#f4c430');
    currencyChip(ctx, 906 - 118 - 108, 30, '仙玉', game.jade, '#7CFC9B');

    const cols = 3, cardW = 280, cardH = 104, gapX = 12, gapY = 12;
    const x0 = 40, y0 = 88;
    const tierName = { 1: '凡品', 2: '灵品', 3: '神品' };
    const tierColor = { 1: '#9fb0c8', 2: '#5cc8ff', 3: '#ffb35c' };

    for (let i = 0; i < XY.RECIPES.length; i++) {
      const r = XY.RECIPES[i];
      const col = i % cols, row = Math.floor(i / cols);
      const x = x0 + col * (cardW + gapX), y = y0 + row * (cardH + gapY);
      const sel = i === game.craftIndex;
      const hasMat = XY.canCraft(game.inventory, r);
      const hasGold = game.gold >= (r.gold || 0);
      const can = hasMat && hasGold;

      rrect(ctx, x, y, cardW, cardH, 9);
      ctx.fillStyle = sel ? 'rgba(42,53,80,0.97)' : 'rgba(16,21,32,0.92)'; ctx.fill();
      ctx.strokeStyle = sel ? (can ? '#7CFC9B' : '#e0675a') : '#232c3e';
      ctx.lineWidth = sel ? 2.5 : 1; ctx.stroke();

      const out = XY.ITEMS[r.output.itemId];
      if (out) Art().drawEquipIcon(ctx, x + 8, y + 10, 54, out);

      ctx.fillStyle = tierColor[r.tier] || '#9fb0c8';
      ctx.font = 'bold 10px "PingFang SC", sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(tierName[r.tier] || '', x + cardW - 10, y + 16); ctx.textAlign = 'left';

      ctx.fillStyle = sel ? '#fff' : '#dbe4f0'; ctx.font = 'bold 14px "PingFang SC", sans-serif';
      ctx.fillText(r.name.replace(/^[^·]*·/, ''), x + 70, y + 26);
      if (out && out.bonus) {
        const txt = Object.keys(out.bonus).map((k) => statName(k) + '+' + fmtStat(k, out.bonus[k])).join(' ');
        ctx.fillStyle = '#9be7ff'; ctx.font = '10.5px "PingFang SC", sans-serif';
        ctx.fillText(txt, x + 70, y + 44);
      }

      // 材料
      let ix = x + 12;
      for (const id of Object.keys(r.inputs)) {
        const need = r.inputs[id];
        const have = game.inventory[id] || 0;
        Art().drawMaterialIcon(ctx, ix, y + 56, 18, id);
        ctx.fillStyle = have >= need ? '#7CFC9B' : '#e0675a';
        ctx.font = '10px "PingFang SC", sans-serif';
        ctx.fillText(have + '/' + need, ix + 21, y + 70);
        ix += 60;
      }

      if (r.gold) {
        ctx.fillStyle = hasGold ? '#f4c430' : '#e0675a';
        ctx.font = 'bold 11px "PingFang SC", sans-serif'; ctx.textAlign = 'right';
        ctx.fillText('金 ' + r.gold, x + cardW - 10, y + 96); ctx.textAlign = 'left';
      }
    }

    ctx.fillStyle = 'rgba(150,162,182,0.9)'; ctx.font = '12px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('W/S 或 A/D 选择 · Enter 锻造 · G 商店 · H 技能 · B 背包 · Esc 返回', W / 2, H - 16);
    ctx.textAlign = 'left';
  };

  function statName(k) {
    return ({ maxHp: '气血', attack: '攻击', defense: '防御', moveSpeed: '身法', critRate: '暴击' })[k] || k;
  }
  UI.statName = statName;
  function fmtStat(k, v) {
    if (k === 'critRate') return Math.round(v * 100) + '%';
    return String(Math.round(v * 10) / 10);
  }

  // ===== 属性商店（金币）=====
  UI.drawShop = function (ctx, game) {
    UI.drawBackground(ctx, game.levelIndex, game.uiTime);
    ctx.fillStyle = 'rgba(6,9,14,0.84)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd479'; ctx.font = 'bold 30px serif';
    ctx.fillText('属 性 商 店', 40, 50);
    ctx.fillStyle = '#7d8798'; ctx.font = '12px "PingFang SC", sans-serif';
    ctx.fillText('升级会自动加成；在此用金币额外加点，越买越贵', 40, 70);

    let cx = 906;
    const gw = currencyChip(ctx, cx - 118, 30, '金', game.gold, '#f4c430');
    currencyChip(ctx, cx - 118 - (gw + 10) - 104, 30, '仙玉', game.jade, '#7CFC9B');

    const pl = game.player;
    // —— 左：当前面板 ——
    const px = 40, py = 96, pw = 268, ph = 386;
    rrect(ctx, px, py, pw, ph, 12);
    ctx.fillStyle = 'rgba(14,19,28,0.94)'; ctx.fill();
    ctx.strokeStyle = '#2a3550'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#8a93a6'; ctx.font = '11px "PingFang SC", sans-serif';
    ctx.fillText('当前战况', px + 16, py + 24);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 17px "PingFang SC", sans-serif';
    ctx.fillText(pl.char.name, px + 16, py + 50);
    ctx.fillStyle = '#ffd479'; ctx.font = 'bold 13px "PingFang SC", sans-serif';
    ctx.fillText('Lv.' + pl.level, px + pw - 60, py + 50);

    const rows = [
      ['气血', pl.stats.maxHp, ''],
      ['攻击', pl.stats.attack, ''],
      ['防御', pl.stats.defense, ''],
      ['暴击', Math.round(pl.stats.critRate * 100), '%'],
      ['身法', pl.stats.moveSpeed, ''],
    ];
    let yy = py + 80;
    for (const r of rows) {
      ctx.fillStyle = '#93a0b5'; ctx.font = '12px "PingFang SC", sans-serif';
      ctx.fillText(r[0], px + 16, yy);
      ctx.fillStyle = '#e6ecf5'; ctx.font = 'bold 15px "PingFang SC", sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(r[1] + r[2], px + pw - 16, yy); ctx.textAlign = 'left';
      yy += 30;
    }
    // 成长明细
    const grow = XY.GROWTH, lvUp = pl.level - 1;
    ctx.fillStyle = '#5b6678'; ctx.font = '10.5px "PingFang SC", sans-serif';
    ctx.fillText('成长 ×' + lvUp + '级  +攻' + Math.round(grow.attack * lvUp) + ' +血' + Math.round(grow.maxHp * lvUp), px + 16, py + 250);
    ctx.fillText('商店加点  ' + XY.SHOP.map((r) => (game.persist.attr[r.key] || 0)).reduce((a, b) => a + b, 0) + ' 次', px + 16, py + 268);
    ctx.fillText('装备加成  ' + ['weapon', 'armor', 'trinket'].filter((s) => game.equipped[s]).length + ' 件', px + 16, py + 286);

    ctx.fillStyle = '#5b6678'; ctx.font = '10.5px "PingFang SC", sans-serif';
    ctx.fillText('每升一级自动获得：', px + 16, py + 318);
    ctx.fillStyle = '#9be7ff';
    ctx.fillText('攻 +' + grow.attack + '  防 +' + grow.defense + '  血 +' + grow.maxHp, px + 16, py + 336);
    ctx.fillText('暴击 +' + (grow.critRate * 100).toFixed(1) + '%  身法 +' + grow.moveSpeed, px + 16, py + 354);

    // —— 右：属性列表 ——
    const lx = 328, lw = 578, lh = 62, gap = 9, ly = 96;
    for (let i = 0; i < XY.SHOP.length; i++) {
      const row = XY.SHOP[i];
      const own = game.persist.attr[row.key] || 0;
      const maxed = own >= row.max;
      const price = XY.shopPrice(row, own);
      const afford = game.gold >= price;
      const sel = i === game.shopIndex;
      const y = ly + i * (lh + gap);
      rrect(ctx, lx, y, lw, lh, 9);
      ctx.fillStyle = sel ? 'rgba(42,53,80,0.97)' : 'rgba(16,21,32,0.9)'; ctx.fill();
      ctx.strokeStyle = sel ? (maxed ? '#8a93a6' : (afford ? '#ffd479' : '#e0675a')) : '#232c3e';
      ctx.lineWidth = sel ? 2.5 : 1; ctx.stroke();

      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "PingFang SC", sans-serif';
      ctx.fillText(row.name, lx + 16, y + 26);
      ctx.fillStyle = '#7CFC9B'; ctx.font = 'bold 12px "PingFang SC", sans-serif';
      ctx.fillText('+' + game.attrStepText(row), lx + 16 + 46, y + 26);

      // 已买进度条
      const bx = lx + 120, bw = 210;
      ctx.fillStyle = '#1a2130'; rrect(ctx, bx, y + 16, bw, 8, 4); ctx.fill();
      if (own > 0) {
        ctx.fillStyle = '#ffd479';
        rrect(ctx, bx, y + 16, Math.max(4, bw * (own / row.max)), 8, 4); ctx.fill();
      }
      ctx.fillStyle = '#8a93a6'; ctx.font = '11px "PingFang SC", sans-serif';
      ctx.fillText(own + ' / ' + row.max, bx, y + 44);

      // 当前总属性
      ctx.fillStyle = '#c9d4e4'; ctx.font = '12px "PingFang SC", sans-serif';
      ctx.fillText('当前 ' + fmtStat(row.key, pl.stats[row.key] || 0) + row.unit, lx + 350, y + 26);

      // 价格 / 已满
      ctx.textAlign = 'right';
      if (maxed) {
        ctx.fillStyle = '#8a93a6'; ctx.font = 'bold 13px "PingFang SC", sans-serif';
        ctx.fillText('已达上限', lx + lw - 16, y + 32);
      } else {
        ctx.fillStyle = afford ? '#f4c430' : '#e0675a'; ctx.font = 'bold 15px "PingFang SC", sans-serif';
        ctx.fillText('金 ' + price, lx + lw - 16, y + 26);
        ctx.fillStyle = '#5b6678'; ctx.font = '10.5px "PingFang SC", sans-serif';
        ctx.fillText('第 ' + (own + 1) + ' 次', lx + lw - 16, y + 44);
      }
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = 'rgba(150,162,182,0.9)'; ctx.font = '12px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('W/S 选择 · Enter 购买 · H 技能参悟 · L 锻造 · B 背包 · Esc 返回', W / 2, H - 22);
    ctx.textAlign = 'left';
  };

  // ===== 技能参悟（仙玉）=====
  UI.drawSkillUp = function (ctx, game) {
    UI.drawBackground(ctx, game.levelIndex, game.uiTime);
    ctx.fillStyle = 'rgba(6,9,14,0.84)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd479'; ctx.font = 'bold 30px serif';
    ctx.fillText('技 能 参 悟', 40, 50);
    ctx.fillStyle = '#7d8798'; ctx.font = '12px "PingFang SC", sans-serif';
    ctx.fillText('用仙玉提升技能重数：每重 +10% 威力、-5.5% 冷却、+6% 范围', 40, 70);

    let cx = 906;
    const gw = currencyChip(ctx, cx - 118, 30, '金', game.gold, '#f4c430');
    currencyChip(ctx, cx - 118 - (gw + 10) - 104, 30, '仙玉', game.jade, '#7CFC9B');

    const ids = game.player.char.skills;
    const cardH = 108, gap = 14, y0 = 104;
    for (let i = 0; i < ids.length; i++) {
      const base = XY.getSkill(ids[i]);
      const lv = game.persist.skillLv[ids[i]] || 1;
      const cur = XY.skillAtLevel(base, lv);
      const next = lv < XY.SKILL_MAX_LV ? XY.skillAtLevel(base, lv + 1) : null;
      const cost = XY.skillUpCost(lv);
      const afford = cost != null && game.jade >= cost;
      const sel = i === game.skillIndex;
      const y = y0 + i * (cardH + gap);

      rrect(ctx, 48, y, 864, cardH, 11);
      ctx.fillStyle = sel ? 'rgba(42,53,80,0.97)' : 'rgba(16,21,32,0.9)'; ctx.fill();
      ctx.strokeStyle = sel ? (next ? (afford ? '#7CFC9B' : '#e0675a') : '#8a93a6') : '#232c3e';
      ctx.lineWidth = sel ? 2.5 : 1; ctx.stroke();

      Art().drawSkillIcon(ctx, 64, y + 24, 60, base, 0, true);

      ctx.fillStyle = '#fff'; ctx.font = 'bold 19px "PingFang SC", sans-serif';
      ctx.fillText(base.name, 142, y + 38);
      // 重数圆点
      for (let k = 0; k < XY.SKILL_MAX_LV; k++) {
        ctx.beginPath(); ctx.arc(146 + k * 16, y + 56, 5, 0, Math.PI * 2);
        ctx.fillStyle = k < lv ? '#ffd479' : '#2a3550'; ctx.fill();
      }
      ctx.fillStyle = '#ffd479'; ctx.font = 'bold 12px "PingFang SC", sans-serif';
      ctx.fillText(lv + ' / ' + XY.SKILL_MAX_LV + ' 重', 146 + XY.SKILL_MAX_LV * 16 + 8, y + 60);

      // 当前 → 下一重
      ctx.fillStyle = '#93a0b5'; ctx.font = '12px "PingFang SC", sans-serif';
      ctx.fillText('威力 ×' + cur.multiplier, 330, y + 36);
      ctx.fillText('冷却 ' + (cur.cooldown / 1000).toFixed(2) + 's', 330, y + 58);
      if (cur.radius) ctx.fillText('范围 ' + cur.radius, 330, y + 80);
      else if (cur.range) ctx.fillText('射程 ' + cur.range, 330, y + 80);

      if (next) {
        ctx.fillStyle = '#7CFC9B'; ctx.font = 'bold 12.5px "PingFang SC", sans-serif';
        ctx.fillText('→ 威力 ×' + next.multiplier + '   冷却 ' + (next.cooldown / 1000).toFixed(2) + 's', 470, y + 36);
        ctx.fillStyle = '#5b6678'; ctx.font = '11px "PingFang SC", sans-serif';
        ctx.fillText('+' + Math.round((next.multiplier / cur.multiplier - 1) * 100) + '% 伤害 · ' + Math.round((1 - next.cooldown / cur.cooldown) * 100) + '% 冷却', 470, y + 58);
      } else {
        ctx.fillStyle = '#8a93a6'; ctx.font = 'bold 13px "PingFang SC", sans-serif';
        ctx.fillText('已至化境', 470, y + 46);
      }

      ctx.textAlign = 'right';
      if (cost == null) {
        ctx.fillStyle = '#8a93a6'; ctx.font = 'bold 13px "PingFang SC", sans-serif';
        ctx.fillText('满级', 892, y + 60);
      } else {
        ctx.fillStyle = afford ? '#7CFC9B' : '#e0675a'; ctx.font = 'bold 17px "PingFang SC", sans-serif';
        ctx.fillText('仙玉 ' + cost, 892, y + 50);
        ctx.fillStyle = '#5b6678'; ctx.font = '10.5px "PingFang SC", sans-serif';
        ctx.fillText('参悟至 ' + (lv + 1) + ' 重', 892, y + 70);
      }
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = 'rgba(150,162,182,0.9)'; ctx.font = '12px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('W/S 选择 · Enter 参悟 · G 商店 · L 锻造 · B 背包 · Esc 返回', W / 2, H - 22);
    ctx.textAlign = 'left';
  };

  // ===== 背包 =====
  const TABS = ['材料', '法宝', '装备'];
  UI.BAG_TABS = TABS;

  UI.drawBag = function (ctx, game) {
    UI.drawBackground(ctx, game.levelIndex, game.uiTime);
    ctx.fillStyle = 'rgba(5,8,13,0.82)'; ctx.fillRect(0, 0, W, H);

    // 标题
    ctx.fillStyle = '#ffd479'; ctx.font = 'bold 28px serif';
    ctx.fillText('行 囊', 40, 54);
    ctx.fillStyle = '#8a93a6'; ctx.font = '12px "PingFang SC", sans-serif';
    ctx.fillText('打怪掉落材料 → 合成法宝装备 → 背包里装备上阵', 40, 74);

    // 分页
    let tx = 40;
    for (let i = 0; i < TABS.length; i++) {
      const on = i === game.bagTab;
      const w = 92;
      rrect(ctx, tx, 92, w, 30, 8);
      ctx.fillStyle = on ? 'rgba(255,212,121,0.16)' : 'rgba(22,28,42,0.9)'; ctx.fill();
      ctx.strokeStyle = on ? '#ffd479' : '#2a3550'; ctx.lineWidth = on ? 2 : 1; ctx.stroke();
      ctx.fillStyle = on ? '#ffd479' : '#93a0b5'; ctx.font = 'bold 14px "PingFang SC", sans-serif';
      ctx.textAlign = 'center'; ctx.fillText((i + 1) + ' · ' + TABS[i], tx + w / 2, 112); ctx.textAlign = 'left';
      tx += w + 10;
    }

    const items = game.bagItems();
    // 网格
    const cols = 5, cell = 86, gapX = 10, gapY = 10;
    const gx0 = 40, gy0 = 142;
    for (let i = 0; i < cols * 4; i++) {
      const cx = gx0 + (i % cols) * (cell + gapX);
      const cy = gy0 + Math.floor(i / cols) * (cell + gapY);
      const it = items[i];
      const sel = i === game.bagIndex && it;
      rrect(ctx, cx, cy, cell, cell, 10);
      ctx.fillStyle = sel ? 'rgba(42,53,80,0.98)' : 'rgba(16,21,32,0.86)'; ctx.fill();
      ctx.strokeStyle = sel ? '#ffd479' : '#232c3e'; ctx.lineWidth = sel ? 2.5 : 1; ctx.stroke();
      if (!it) continue;
      drawItemIcon(ctx, it, cx + (cell - 52) / 2, cy + 8, 52);
      // 数量
      if (it.count > 1) {
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText('×' + it.count, cx + cell - 6, cy + cell - 6); ctx.textAlign = 'left';
      }
      // 已装备标记
      if (it.equipped) {
        rrect(ctx, cx + 4, cy + 4, 34, 16, 5);
        ctx.fillStyle = 'rgba(124,252,155,0.9)'; ctx.fill();
        ctx.fillStyle = '#06210f'; ctx.font = 'bold 10px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('已装', cx + 21, cy + 15); ctx.textAlign = 'left';
      }
      // 名称
      ctx.fillStyle = '#c9d4e4'; ctx.font = '11px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(it.name, cx + cell / 2, cy + cell - 20); ctx.textAlign = 'left';
    }

    // 详情面板
    const dx = 610, dy = 142, dw = 310, dh = 306;
    rrect(ctx, dx, dy, dw, dh, 12);
    ctx.fillStyle = 'rgba(14,19,28,0.94)'; ctx.fill();
    ctx.strokeStyle = '#2a3550'; ctx.lineWidth = 1; ctx.stroke();

    const sel = items[game.bagIndex];
    if (!sel) {
      ctx.fillStyle = '#5b6678'; ctx.font = '13px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('这个分页还是空的', dx + dw / 2, dy + 80);
      ctx.fillText('去打怪、去合成吧', dx + dw / 2, dy + 104);
      ctx.textAlign = 'left';
    } else {
      drawItemIcon(ctx, sel, dx + 22, dy + 22, 74);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 19px "PingFang SC", sans-serif';
      ctx.fillText(sel.name, dx + 108, dy + 46);
      ctx.fillStyle = '#ffd479'; ctx.font = '12px "PingFang SC", sans-serif';
      ctx.fillText(sel.kindName, dx + 108, dy + 66);
      if (sel.count > 1) {
        ctx.fillStyle = '#9fb0c8'; ctx.font = '11px sans-serif';
        ctx.fillText('持有 ' + sel.count + ' 件', dx + 108, dy + 84);
      }
      ctx.fillStyle = '#a9b6c8'; ctx.font = '12px "PingFang SC", sans-serif';
      let ty2 = wrapText(ctx, sel.desc, dx + 22, dy + 122, dw - 44, 18);
      if (sel.bonusText) {
        ctx.fillStyle = '#9be7ff'; ctx.font = 'bold 12px "PingFang SC", sans-serif';
        ty2 = wrapText(ctx, sel.bonusText, dx + 22, ty2 + 26, dw - 44, 17);
      }
      if (sel.effectText) {
        ctx.fillStyle = '#c39bff'; ctx.font = '12px "PingFang SC", sans-serif';
        ty2 = wrapText(ctx, sel.effectText, dx + 22, ty2 + 24, dw - 44, 17);
      }
      if (sel.action) {
        ctx.fillStyle = '#ffd479'; ctx.font = 'bold 13px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(sel.action, dx + dw / 2, dy + dh - 20); ctx.textAlign = 'left';
      }
    }

    // 底部操作提示
    ctx.fillStyle = 'rgba(150,162,182,0.9)'; ctx.font = '12px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Q/E 或 1·2·3 换分页 · WASD 选格 · Enter 使用/装备 · B 或 Esc 关闭', W / 2, H - 26);
    ctx.textAlign = 'left';
  };

  function drawItemIcon(ctx, it, x, y, size) {
    if (it.icon === 'treasure') Art().drawTreasureIcon(ctx, x, y, size, XY.getTreasure(it.id), 0, true);
    else if (it.icon === 'equip') {
      const item = XY.ITEMS[it.id];
      if (item && item.slot) Art().drawEquipIcon(ctx, x, y, size, item);
    } else if (it.icon === 'material') Art().drawMaterialIcon(ctx, x, y, size, it.id);
  }

  // ===== Toast =====
  UI.drawToast = function (ctx, game) {
    let y = (game.bossBarA || 0) > 0.3 ? 172 : 150; // 首领血条在时往下让一格
    for (const t of game.toasts) {
      ctx.globalAlpha = Math.min(1, t.left / 600);
      center(ctx, t.text, y, 'bold 17px "PingFang SC", sans-serif', '#ffd479');
      ctx.globalAlpha = 1; y += 25;
    }
  };

  UI.W = W; UI.H = H;
  if (typeof module !== 'undefined' && module.exports) module.exports = XY;
})(typeof window !== 'undefined' ? window : globalThis);
