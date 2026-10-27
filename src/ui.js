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

  UI.drawWorld = function (ctx, game) {
    const now = game.now;
    UI.drawPlatforms(ctx, game);
    UI.drawGoal(ctx, game);

    // 残影（在角色后面）
    if (game.fx) game.fx.draw(ctx, 'back');

    // 敌人
    for (const e of game.level.enemies) {
      if (!e.alive) continue;
      const k = (e.h / (ENEMY_ART_H[e.kind] || 34)) * 1.02;
      Art().drawEnemy(ctx, e, now, k);
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
    ctx.fillText(game.level.hasBoss ? '击败牛魔王即可通关' : '妖物 ' + killed + '/' + total + ' · 抵达终点旗帜通关', W - 20, 48);
    ctx.textAlign = 'left';

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
    ctx.fillText('B 背包 · L 合成 · P 暂停 · 双击 A/D 奔跑 · 空中再按 W 二段跳', W / 2, H - 6);
    ctx.textAlign = 'left';

    if (XY.Input && XY.Input.keyCount === 0) {
      ctx.fillStyle = 'rgba(255,212,121,0.92)'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('键盘未接管 · 用画面下方按钮操作（或先点一下画面再按键）', W / 2, 112);
      ctx.textAlign = 'left';
    }
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
    ctx.fillText('K U I 技能 · 1 2 3 法宝 · B 背包 · L 合成', 94, 484);
    ctx.textAlign = 'left';
  };

  // ===== 选角 =====
  UI.drawCharSelect = function (ctx, game) {
    UI.drawBackground(ctx, 0, game.uiTime);
    center(ctx, '选择你的角色', 52, 'bold 34px serif', '#ffd479');
    const order = XY.CHARACTER_ORDER;
    const cardW = 168, gap = 14, total = order.length * cardW + (order.length - 1) * gap;
    const x0 = (W - total) / 2;
    for (let i = 0; i < order.length; i++) {
      const c = XY.CHARACTERS[order[i]];
      const x = x0 + i * (cardW + gap), y = 80;
      const sel = i === game.charIndex;
      rrect(ctx, x, y, cardW, 384, 12);
      ctx.fillStyle = sel ? 'rgba(42,53,80,0.96)' : 'rgba(20,26,38,0.9)'; ctx.fill();
      ctx.strokeStyle = sel ? '#ffd479' : '#33405c'; ctx.lineWidth = sel ? 3 : 1; ctx.stroke();
      if (sel) {
        ctx.save();
        ctx.shadowColor = 'rgba(255,212,121,0.55)'; ctx.shadowBlur = 18;
        rrect(ctx, x, y, cardW, 384, 12); ctx.stroke();
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
    center(ctx, 'A / D 或 ← → 选择 · Enter 确认', 498, '16px "PingFang SC", sans-serif', '#fff');
  };

  // ===== 过场 CG =====
  UI.drawCutscene = function (ctx, beat, alpha, t) {
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
    center(ctx, beat.glyph, 206, '86px serif', 'rgba(255,255,255,0.95)');
    center(ctx, beat.title, 282, 'bold 30px serif', '#ffd479');
    for (let i = 0; i < beat.lines.length; i++) center(ctx, beat.lines[i], 330 + i * 30, '17px "PingFang SC", sans-serif', '#eae4d8');
    center(ctx, '按 Enter / 空格 跳过', 500, '13px "PingFang SC", sans-serif', '#8a93a6');
  };

  // ===== 关卡前情 =====
  UI.drawLevelIntro = function (ctx, game) {
    const data = (game.level && game.level.data) || XY.LEVELS[game.levelIndex] || XY.LEVELS[0];
    UI.drawBackground(ctx, game.levelIndex, game.uiTime);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
    center(ctx, data.name, 220, 'bold 38px serif', '#ffd479');
    center(ctx, XY.STORY.levelIntros[data.id] || '', 280, '17px "PingFang SC", sans-serif', '#e6e6e6');
    const a = 0.6 + Math.sin(game.uiTime / 300) * 0.4;
    ctx.globalAlpha = a;
    center(ctx, '按 Enter 进入', 366, '18px "PingFang SC", sans-serif', '#fff');
    ctx.globalAlpha = 1;
  };

  UI.drawPause = function (ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0, 0, W, H);
    center(ctx, '暂停', 230, 'bold 44px serif', '#ffd479');
    center(ctx, 'P 继续', 296, '18px "PingFang SC", sans-serif', '#fff');
    center(ctx, 'R 放弃本关回到标题', 332, '14px "PingFang SC", sans-serif', '#8a93a6');
  };

  UI.drawGameOver = function (ctx) {
    ctx.fillStyle = 'rgba(40,0,0,0.72)'; ctx.fillRect(0, 0, W, H);
    center(ctx, '英雄落败', 230, 'bold 48px serif', '#e74c3c');
    center(ctx, '按 Enter 回到标题', 300, '18px "PingFang SC", sans-serif', '#fff');
  };

  UI.drawWin = function (ctx) {
    ctx.fillStyle = 'rgba(14,36,10,0.72)'; ctx.fillRect(0, 0, W, H);
    center(ctx, '通关！取经之路开启', 210, 'bold 44px serif', '#7CFC9B');
    center(ctx, '你已扫平花果山、黑风洞、火焰山', 264, '18px "PingFang SC", sans-serif', '#e6e6e6');
    center(ctx, '按 Enter 回到标题', 322, '18px "PingFang SC", sans-serif', '#fff');
  };

  // ===== 合成坊 =====
  UI.drawCraft = function (ctx, game) {
    UI.drawBackground(ctx, game.levelIndex, game.uiTime);
    ctx.fillStyle = 'rgba(6,9,14,0.72)'; ctx.fillRect(0, 0, W, H);
    center(ctx, '法宝合成坊', 56, 'bold 32px serif', '#ffd479');
    center(ctx, 'W/S 或 ↑↓ 选择 · Enter 合成 · B 背包 · Esc 返回', 86, '13px "PingFang SC", sans-serif', '#cfe0f5');
    const panelW = 720, px = (W - panelW) / 2;
    for (let i = 0; i < XY.RECIPES.length; i++) {
      const r = XY.RECIPES[i];
      const y = 118 + i * 96;
      const sel = i === game.craftIndex;
      const can = XY.canCraft(game.inventory, r);
      rrect(ctx, px, y, panelW, 82, 10);
      ctx.fillStyle = sel ? 'rgba(42,53,80,0.96)' : 'rgba(18,24,36,0.9)'; ctx.fill();
      ctx.strokeStyle = sel ? (can ? '#7CFC9B' : '#ffd479') : '#2a3550'; ctx.lineWidth = sel ? 3 : 1; ctx.stroke();

      const out = XY.ITEMS[r.output.itemId];
      if (out) {
        if (out.slot) Art().drawEquipIcon(ctx, px + 16, y + 13, 56, out);
        else Art().drawMaterialIcon(ctx, px + 16, y + 13, 56, out.id);
      }
      ctx.fillStyle = '#fff'; ctx.font = 'bold 17px "PingFang SC", sans-serif';
      ctx.fillText(r.name, px + 86, y + 26);
      ctx.fillStyle = '#93a0b5'; ctx.font = '11.5px "PingFang SC", sans-serif';
      ctx.fillText(r.description, px + 86, y + 45);
      // 材料需求 + 图标
      let ix = px + 86;
      for (const id of Object.keys(r.inputs)) {
        const it = XY.ITEMS[id];
        const need = r.inputs[id];
        const have = game.inventory[id] || 0;
        Art().drawMaterialIcon(ctx, ix, y + 52, 22, id);
        ctx.fillStyle = have >= need ? '#7CFC9B' : '#e0675a';
        ctx.font = '11px "PingFang SC", sans-serif';
        ctx.fillText(it.name + ' ' + have + '/' + need, ix + 26, y + 68);
        ix += 128;
      }
      if (out && out.bonus) {
        const txt = Object.keys(out.bonus).map((k) => statName(k) + '+' + (out.bonus[k] > 1 ? out.bonus[k] : Math.round(out.bonus[k] * 100) + '%')).join('  ');
        ctx.fillStyle = '#9be7ff'; ctx.font = '11px "PingFang SC", sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(txt, px + panelW - 16, y + 68);
        ctx.textAlign = 'left';
      }
    }
  };

  function statName(k) {
    return ({ maxHp: '气血', attack: '攻击', defense: '防御', moveSpeed: '身法', critRate: '暴击' })[k] || k;
  }
  UI.statName = statName;

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
    let y = 150; // 让开顶部 HUD 与"键盘未接管"提示条，避免文字叠在一起
    for (const t of game.toasts) {
      ctx.globalAlpha = Math.min(1, t.left / 600);
      center(ctx, t.text, y, 'bold 17px "PingFang SC", sans-serif', '#ffd479');
      ctx.globalAlpha = 1; y += 25;
    }
  };

  UI.W = W; UI.H = H;
  if (typeof module !== 'undefined' && module.exports) module.exports = XY;
})(typeof window !== 'undefined' ? window : globalThis);
