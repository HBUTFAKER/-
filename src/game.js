// 游戏主控：状态机 / 主循环 / 战斗结算 / 法宝特效 / 背包 / 合成 / 存档 / 过场。挂到 XY.Game。
(function (root) {
  const XY = (root.XY = root.XY || {});
  const W = 960, H = 540;
  const SAVE_KEY = 'xiyou_save_v1';
  const SLOT_N = 3;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  const SLOT_NAME = { weapon: '兵器', armor: '护甲', trinket: '佩饰' };

  XY.Game = class {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.state = 'title';
      this.uiTime = 0; this.now = 0; this.lastT = 0;
      this.toasts = []; this.floaters = []; this.expPops = [];
      this.charIndex = 0; this.craftIndex = 0;
      this.levelIndex = 0;
      this.projectiles = [];
      this.specials = [];       // 掷出的兵器等"有自己生命周期的招式"
      this.pending = [];        // 延迟结算（重劈的落点判定）
      this.cam = { x: 0 };
      this.cutIndex = 0; this.cutTimer = 0;
      this.inventory = {}; this.equipped = {}; this.treasures = [];
      this.treasureSlots = [null, null, null];
      this.charId = 'wukong';
      this.player = null; this.level = null;
      this.fx = new XY.FXLayer();
      this.shake = 0; this.hurtFlash = 0;
      this.bagTab = 0; this.bagIndex = 0;
      this._replaceAt = 0;
      this.persist = this.load();

      XY.Input.init();
      if (canvas && canvas.addEventListener) {
        canvas.addEventListener('mousedown', () => {
          XY.Input._pressed['Mouse0'] = true;
          try {
            if (canvas.focus) canvas.focus();
            if (typeof window !== 'undefined' && window.focus) window.focus();
          } catch (err) { /* 忽略 */ }
        });
      }
    }

    confirmPressed(I) {
      return I.pressed('Enter') || I.pressed('Space') || I.pressed('Mouse0');
    }

    // —— 存档 ——
    load() {
      const fresh = {
        inventory: {}, equipped: {}, treasures: [], treasureSlots: [null, null, null],
        charId: 'wukong', levelReached: 0,
      };
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return fresh;
        const d = JSON.parse(raw);
        if (!d || typeof d !== 'object') return fresh;
        // 旧档迁移：没有 treasureSlots 就把已拥有的前 3 件塞进槽
        const owned = Array.isArray(d.treasures) ? d.treasures.filter((id) => XY.TREASURES[id]) : [];
        let slots = Array.isArray(d.treasureSlots) ? d.treasureSlots.slice(0, SLOT_N) : [];
        while (slots.length < SLOT_N) slots.push(null);
        slots = slots.map((id) => (id && XY.TREASURES[id] ? id : null));
        if (slots.every((s) => !s) && owned.length) {
          for (let i = 0; i < Math.min(SLOT_N, owned.length); i++) slots[i] = owned[i];
        }
        return {
          inventory: (d.inventory && typeof d.inventory === 'object') ? d.inventory : {},
          equipped: (d.equipped && typeof d.equipped === 'object') ? d.equipped : {},
          treasures: owned,
          treasureSlots: slots,
          charId: XY.CHARACTERS[d.charId] ? d.charId : 'wukong',
          levelReached: Number.isInteger(d.levelReached) ? d.levelReached : 0,
        };
      } catch (e) { return fresh; }
    }
    save() {
      this.persist.inventory = this.inventory;
      this.persist.equipped = this.equipped;
      this.persist.treasures = this.treasures;
      this.persist.treasureSlots = this.treasureSlots;
      this.persist.charId = this.charId;
      this.persist.levelReached = this.levelIndex;
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.persist)); } catch (e) { /* 忽略 */ }
    }

    toast(text) { this.toasts.push({ text, left: 1700 }); if (this.toasts.length > 4) this.toasts.shift(); }
    floater(x, y, text, color) { this.floaters.push({ x, y, text, color: color || '#fff', life: 0.85 }); }

    // —— 角色创建 / 重建 ——
    rebuildPlayer() {
      const old = this.player;
      const ratio = old ? old.hp / old.maxHp : 1;
      const lvl = old ? old.level : 1;
      const exp = old ? old.exp : 0;
      const charDef = XY.CHARACTERS[this.charId];
      const slots = ['weapon', 'armor', 'trinket'];
      const equippedItems = slots.map((s) => (this.equipped[s] ? XY.ITEMS[this.equipped[s]] : null)).filter(Boolean);
      const p = XY.makePlayer(charDef, equippedItems, this.treasureSlots);
      p.level = lvl; p.exp = exp;
      for (let i = 2; i <= lvl; i++) { p.stats.maxHp += 20; p.stats.attack += 4; p.stats.defense += 2; }
      p.maxHp = p.stats.maxHp;
      p.hp = Math.max(1, Math.round(p.maxHp * ratio));
      // 关键：换装不能把人传送回出生点
      if (old) {
        p.x = old.x; p.y = old.y; p.vx = old.vx; p.vy = old.vy;
        p.facing = old.facing; p.onGround = old.onGround;
        p.energy = old.energy; p.invuln = old.invuln;
        p.skillCd = old.skillCd; p.treasureCd = old.treasureCd;
      }
      this.player = p;
    }

    initRun() {
      this.inventory = Object.assign({}, this.persist.inventory);
      this.equipped = Object.assign({}, this.persist.equipped);
      this.treasures = this.persist.treasures.slice();
      this.treasureSlots = (this.persist.treasureSlots || []).slice(0, SLOT_N);
      while (this.treasureSlots.length < SLOT_N) this.treasureSlots.push(null);
      this.charId = XY.CHARACTER_ORDER[this.charIndex];
      const st = XY.CHARACTERS[this.charId].startTreasure;
      if (st && XY.TREASURES[st]) {
        if (!this.treasures.includes(st)) this.treasures.push(st);
        if (!this.treasureSlots.includes(st)) {
          const free = this.treasureSlots.indexOf(null);
          this.treasureSlots[free >= 0 ? free : 0] = st;
        }
      }
      this.levelIndex = this.persist.levelReached || 0;
      this.rebuildPlayer();
      this.save();
    }

    startLevel(idx) {
      this.levelIndex = idx;
      this.level = new XY.Level(XY.LEVELS[idx]);
      this.projectiles = []; this.floaters = []; this.expPops = [];
      this.specials = []; this.pending = [];
      this.fx.clear();
      const pl = this.player;
      pl.x = 80; pl.y = 360; pl.vx = 0; pl.vy = 0; pl.facing = 1;
      pl.hp = pl.maxHp;
      pl.attackUntil = -9999; pl.castUntil = -9999;
      pl.noWeaponUntil = 0; pl.cloudAuraUntil = 0; pl.dashUntil = 0; pl.dashSpeed = 0;
      this.state = 'playing';
      // 首关开一次操作提示（二段跳 / 奔跑是本轮新增）
      if (idx === 0 && !this._hintShown) {
        this._hintShown = true;
        this.toast('双击 A/D 可奔跑 · 空中再按 W 可二段跳');
      }
    }

    // —— 主循环 ——
    start() {
      const loop = (t) => {
        const dt = this.lastT ? clamp((t - this.lastT) / 1000, 0, 0.05) : 0;
        if (this._frozen) { requestAnimationFrame(loop); return; }
        this.lastT = t; this.now = t; this.uiTime += dt * 1000;
        try {
          this.update(dt);
          this.render();
        } catch (err) {
          this.crash(err);
        }
        XY.Input.endFrame();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    crash(err) {
      this._crashCount = (this._crashCount || 0) + 1;
      try { console.error('[西游·降妖录] 运行错误:', err); } catch (e) { /* 忽略 */ }
      if (typeof window !== 'undefined' && window.__diag) window.__diag('[运行错误] ' + (err && err.message));
      if (this._crashCount > 3) return;
      try {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, 130);
        ctx.fillStyle = '#ff6b6b'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText('运行出错（已保护，未崩溃）：', 20, 34);
        ctx.fillStyle = '#ffd0d0'; ctx.font = '12px Consolas, monospace';
        ctx.fillText(String((err && err.message) || err).slice(0, 100), 20, 60);
        const frame2 = String((err && err.stack) || '').split('\n')[1] || '';
        ctx.fillText(frame2.trim().slice(0, 100), 20, 82);
        ctx.fillStyle = '#9fb0c8';
        ctx.fillText('刷新页面可重来；把这段文字发我就能定位', 20, 108);
      } catch (e) { /* 绘图也失败就只留控制台 */ }
    }

    update(dt) {
      const I = XY.Input, now = this.now;
      switch (this.state) {
        case 'title':
          if (this.confirmPressed(I)) this.state = 'charselect';
          break;
        case 'charselect':
          if (I.pressed('KeyA') || I.pressed('ArrowLeft')) this.charIndex = (this.charIndex + XY.CHARACTER_ORDER.length - 1) % XY.CHARACTER_ORDER.length;
          if (I.pressed('KeyD') || I.pressed('ArrowRight')) this.charIndex = (this.charIndex + 1) % XY.CHARACTER_ORDER.length;
          if (this.confirmPressed(I)) {
            this.initRun();
            // 按当前角色取自己的前史 CG
            this.cutBeats = (XY.STORY.charCg && XY.STORY.charCg[this.charId]) || XY.STORY.prologue;
            this.state = (this.levelIndex === 0) ? 'cutscene' : 'levelIntro';
            this.cutIndex = 0; this.cutTimer = 0;
          }
          break;
        case 'cutscene': {
          const beats = this.cutBeats || XY.STORY.prologue;
          if (this.confirmPressed(I)) { this.state = 'levelIntro'; break; }
          this.cutTimer += dt * 1000;
          const cur = beats[this.cutIndex];
          if (!cur || this.cutTimer > cur.duration) {
            this.cutIndex++; this.cutTimer = 0;
            if (this.cutIndex >= beats.length) this.state = 'levelIntro';
          }
          break;
        }
        case 'levelIntro':
          if (this.confirmPressed(I)) this.startLevel(this.levelIndex);
          break;
        case 'playing': this.updatePlaying(dt); break;
        case 'bag': this.updateBag(); break;
        case 'craft': this.updateCraft(); break;
        case 'pause':
          if (I.pressed('KeyP') || I.pressed('Escape')) this.state = 'playing';
          if (I.pressed('KeyR')) this.state = 'title';
          break;
        case 'gameover':
          if (this.confirmPressed(I)) this.state = 'title';
          break;
        case 'win':
          if (this.confirmPressed(I)) this.state = 'title';
          break;
      }
      // 计时器 / 飘字 / 特效
      for (const t of this.toasts) t.left -= dt * 1000;
      this.toasts = this.toasts.filter((t) => t.left > 0);
      for (const f of this.floaters) { f.life -= dt; f.y -= dt * 34; }
      this.floaters = this.floaters.filter((f) => f.life > 0);
      for (const p of this.expPops) p.life -= dt;
      this.expPops = this.expPops.filter((p) => p.life > 0);
      if (this.fx) this.fx.update(dt);
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 90);
      if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dt * 3.2);
      if (this._dump && typeof document !== 'undefined') {
        this._dumpT = (this._dumpT || 0) + dt;
        if (this._dumpT > 0.4) {
          this._dumpT = 0;
          const el = document.getElementById('diag');
          if (el) {
            const pl = this.player, lv = this.level;
            el.style.display = 'block';
            el.textContent = 'DUMP ' + JSON.stringify({
              state: this.state, cam: Math.round(this.cam.x),
              player: pl ? { x: Math.round(pl.x), y: Math.round(pl.y), onGround: pl.onGround, vy: Math.round(pl.vy) } : null,
              platforms: lv ? lv.platforms.map((p2) => [p2.x, p2.y, p2.w, p2.h]) : null,
              enemies: lv ? lv.enemies.map((e) => ({ k: e.kind, x: Math.round(e.x), y: Math.round(e.y), w: e.w, h: e.h, hp: Math.round(e.hp), alive: e.alive })) : null,
            });
          }
        }
      }
    }

    // 把玩家逻辑层抛出的动作事件翻译成特效
    drainPlayerFx(pl) {
      const q = pl.fxQueue;
      if (!q || !q.length) return;
      const cx = pl.x + pl.w / 2, fy = pl.y + pl.h;
      for (const ev of q) {
        if (ev.type === 'jump') {
          this.fx.dust(cx, fy, 5, 'rgba(226,230,245,0.55)', 3, 26);
        } else if (ev.type === 'doubleJump') {
          this.fx.ring(cx, fy - 8, 8, 44, '#d8ecff', 0.32, 4);
          this.fx.spark(cx, fy - 6, 9, '#dcefff', { speed: 170, angle: Math.PI / 2, spread: 1.3 });
          this.fx.dust(cx, fy, 6, 'rgba(230,240,255,0.5)', 3, 30);
        } else if (ev.type === 'runDust') {
          this.fx.dust(cx - (ev.data && ev.data.dir ? ev.data.dir * 8 : 0), fy, 2, 'rgba(214,204,180,0.45)', 3, 20);
        } else if (ev.type === 'sprintStart') {
          const d = ev.data && ev.data.dir ? ev.data.dir : pl.facing;
          this.fx.spark(cx + d * 6, fy - 26, 7, '#ffe9a8', { speed: 150, angle: d > 0 ? Math.PI : 0, spread: 0.9 });
          this.fx.dust(cx, fy, 4, 'rgba(230,220,190,0.5)', 4, 24);
        }
      }
      q.length = 0;
    }

    updatePlaying(dt) {
      const I = XY.Input, now = this.now, pl = this.player, lv = this.level;
      if (I.pressed('KeyP') || I.pressed('Escape')) { this.state = 'pause'; return; }
      if (I.pressed('KeyB')) { this.bagTab = 0; this.bagIndex = 0; this.state = 'bag'; return; }
      if (I.pressed('KeyL') || I.pressed('KeyC')) { this.craftIndex = 0; this.state = 'craft'; return; }

      pl.update(dt, I, lv, now);
      this.drainPlayerFx(pl);

      // 演示模式（仅 ?demo=1）：连续普攻，偶尔放技能与法宝
      if (this._demo) {
        this._demoT += dt;
        this.act(pl.tryBasic(now));
        if (this._demoT > 1.5) { this._demoT = 0; this.act(pl.trySkill(0, now)); this.act(pl.tryTreasure(0, now)); }
      }

      // —— 操作 ——
      if (I.pressed('KeyJ')) this.act(pl.tryBasic(now));
      if (I.pressed('KeyK')) this.act(pl.trySkill(0, now));
      if (I.pressed('KeyU')) this.act(pl.trySkill(1, now));
      if (I.pressed('KeyI')) this.act(pl.trySkill(2, now));
      if (I.pressed('Digit1')) this.act(pl.tryTreasure(0, now));
      if (I.pressed('Digit2')) this.act(pl.tryTreasure(1, now));
      if (I.pressed('Digit3')) this.act(pl.tryTreasure(2, now));

      // 冲刺残影
      if (now < pl.dashUntil && (!this._ghostAt || now - this._ghostAt > 52)) {
        this._ghostAt = now;
        this.fx.afterimage(pl.x + pl.w / 2, pl.y + pl.h + 2, XY.PLAYER_SCALE || 1.15, pl.char.id, pl.pose(now), -pl.facing * 40);
      }
      // 筋斗云：冲刺途中一路拖云
      if (now < pl.dashUntil && now < (pl.cloudAuraUntil || 0) && (!this._cloudAt || now - this._cloudAt > 72)) {
        this._cloudAt = now;
        this.fx.cloudPuff(pl.x + pl.w / 2 - pl.facing * 10, pl.y + pl.h - 12, 0.58, 0.5,
          { vx: -pl.facing * 40, vy: -30, grow: 1.8 });
      }

      // 掷出的金箍棒：飞行 → 插地 → 冲击波
      for (const s of this.specials) {
        if (s.dead) continue;
        if (s.state === 'fly') {
          s.vy += 2300 * dt;
          s.x += s.vx * dt; s.y += s.vy * dt;
          s.spin += dt * 22;
          this.fx.trail(s.x, s.y, 'rgba(255,214,120,0.9)', 4);
          if (s.vy > 0 && s.y >= s.ground) {
            s.y = s.ground; s.state = 'stuck'; s.landAt = now;
            this.aoeHitAt(s.x, s.y - 12, s.radius, s.mult2);
            this.fx.ring(s.x, s.y, 12, s.radius * 1.05, '#ffd479', 0.5, 10);
            this.fx.ring(s.x, s.y, 6, s.radius * 0.7, '#fff6cc', 0.38, 5);
            this.fx.spark(s.x, s.y, 26, '#ffe9a8', { speed: 380, spread: 2.4, gravity: 700, jitter: 10 });
            this.fx.dust(s.x, s.y, 18, '#c9a06a', 80, 50);
            this.shake = Math.min(18, this.shake + 14);
          }
        } else if (s.state === 'stuck') {
          s.fade = Math.max(0, 1 - (now - s.landAt - 700) / 400);
          if (s.fade <= 0) s.dead = true;
        }
      }
      if (this.specials.length) this.specials = this.specials.filter((s) => !s.dead);

      // 延迟结算：如意棒击砸到地面的那一刻
      if (this.pending.length) {
        const rest = [];
        for (const q of this.pending) {
          if (now >= q.at) q.run();
          else rest.push(q);
        }
        this.pending = rest;
      }

      for (const e of lv.enemies) if (e.alive) e.update(dt, pl, lv, now);
      // 灼烧/持续伤害致死：补一次统一结算（掉落、经验、特效）
      for (const e of lv.enemies) if (e.alive && e.pendingKill) this.killEnemy(e);

      for (const p of this.projectiles) p.update(dt, lv);
      for (const p of this.projectiles) {
        if (!p.alive) continue;
        if (p.owner === 'player') this.fx.trail(p.x - p.vx * 0.006, p.y, p.color, p.r * 0.8);
        if (p.owner === 'player') {
          for (const e of lv.enemies) {
            if (!e.alive) continue;
            if (XY.aabb({ x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 }, e)) {
              this.damageEnemy(e, p.damage, true, true);
              this.fx.spark(p.x, p.y, 8, p.color, { speed: 200 });
              p.alive = false; break;
            }
          }
        } else {
          if (pl.hp > 0 && pl.invuln <= now && XY.aabb({ x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 }, pl)) { this.hurtPlayer(p.damage); p.alive = false; }
        }
      }
      this.projectiles = this.projectiles.filter((p) => p.alive);

      // 敌人近身攻击
      for (const e of lv.enemies) {
        if (!e.alive) continue;
        if (now >= e.atkReady && pl.invuln <= now && now >= pl.dashUntil && XY.aabb(e, pl)) {
          const d = XY.computeDamage({ attack: e.stats.attack, critRate: 0 }, { defense: pl.stats.defense * pl.defMul }, 1, Math.random);
          e.atkUntil = now + 260;
          this.hurtPlayer(d.amount);
          this.fx.slash(pl.x + pl.w / 2, pl.y + 12, pl.facing * -1, '#ff8a5e', 0.75, 0.18);
          e.atkReady = now + 900;
        }
      }

      // 冲刺撞击
      if (now < pl.dashUntil) {
        if (!pl.dashHits) pl.dashHits = new Set();
        for (const e of lv.enemies) {
          if (!e.alive || pl.dashHits.has(e)) continue;
          if (XY.aabb(e, pl)) {
            this.damageEnemy(e, (pl.dashMult || 0.8) * pl.atkMul, false, false);
            pl.dashHits.add(e);
            e.knockUntil = now + 320;
            e.vx = pl.dashDir * (pl.dashSpeed > 600 ? 460 : 360);
            this.fx.spark(e.x + e.w / 2, e.y + e.h / 2, 8, '#fff2cf', { speed: 240, angle: pl.dashDir > 0 ? 0 : Math.PI, spread: 1.2 });
          }
        }
      }

      this.cam.x = clamp(pl.x + pl.w / 2 - W / 2, 0, lv.width - W);

      if (pl.hp <= 0) { this.state = 'gameover'; this.save(); return; }
      const bossAlive = lv.enemies.some((e) => e.isBoss && e.alive);
      const cleared = lv.hasBoss ? !bossAlive : (pl.x + pl.w >= lv.goal.x);
      if (cleared) {
        if (this.levelIndex + 1 < XY.LEVELS.length) { this.levelIndex++; this.save(); this.state = 'levelIntro'; }
        else { this.levelIndex = 0; this.persist.levelReached = 0; this.save(); this.state = 'win'; }
      }
    }

    // —— 动作执行 + 特效 ——
    act(a) {
      if (!a) return;
      const now = this.now, pl = this.player;
      const cx = pl.x + pl.w / 2, cy = pl.y + pl.h / 2;
      // 普攻用 mult，技能数据用 multiplier —— 统一取一次，避免 undefined 传进伤害公式变成 NaN
      const mult = Number.isFinite(a.multiplier) ? a.multiplier
        : (Number.isFinite(a.mult) ? a.mult : 1);
      if (a.kind === 'melee') {
        const dir = pl.facing;
        if (a.anim === 'giantChop') {
          // —— 如意棒击：金箍棒暴涨，抡下来砸地 ——
          // 伤害比动作晚一点点结算，让"棒子砸到地"和"数字跳出来"同步
          this.fx.giantStaff(cx + dir * 30, pl.y + 6, dir, 0.62);
          const tipX = cx + dir * 326, tipY = pl.y + pl.h - 2;
          const lv = this.level;
          this.pending.push({
            at: now + 205,
            run: () => {
              if (this.level !== lv) return;
              this.meleeHit(a.range, mult, true);
              this.fx.ring(tipX, tipY, 8, 148, '#ffd479', 0.5, 12);
              this.fx.ring(tipX, tipY, 4, 88, '#fff6cc', 0.36, 5);
              this.fx.ring(tipX, tipY, 2, 42, '#ffffff', 0.22, 14);
              this.fx.spark(tipX, tipY, 26, '#fff0b8', { speed: 380, spread: 1.8, angle: dir > 0 ? 0 : Math.PI, gravity: 640, jitter: 10 });
              this.fx.dust(tipX, tipY, 20, '#c9a06a', 80, 48);
              this.shake = Math.min(18, this.shake + 14);
            },
          });
          return;
        }
        const k = a.atkKind || 0;
        const style = k === 1 ? 'thrust' : (k === 2 ? 'lift' : 'arc');
        this.fx.slashStyle(cx + dir * (k === 1 ? 16 : 12), cy + (k === 2 ? 4 : 2), dir,
          a.heavy ? '#ffb648' : '#ffd15c', a.heavy ? 1.4 : 1.12,
          k === 1 ? 0.16 : (a.heavy ? 0.28 : 0.22), style);
        const hits = this.meleeHit(a.range, mult, a.heavy);
        if (hits > 0) {
          this.fx.spark(cx + dir * a.range * 0.72, cy, a.heavy ? 12 : 7, '#ffe9a8', { speed: a.heavy ? 300 : 210, spread: 1.3, angle: dir > 0 ? 0 : Math.PI });
          this.shake = Math.min(7, this.shake + (a.heavy ? 5 : 2.4));
        }
      } else if (a.kind === 'aoe') {
        if (a.anim === 'throw') {
          // —— 定海神针：把棒子掷出去，空中急旋 → 插地 → 冲击波 ——
          const dir = pl.facing;
          pl.noWeaponUntil = now + 1500;
          const sx = cx + dir * 26, sy = pl.y + 16;
          const ground = XY.groundYAt(this.level.platforms, sx + dir * 118, pl.y + pl.h);
          this.specials.push({
            x: sx, y: sy, vx: dir * 300, vy: -440, spin: 0, state: 'fly',
            ground: ground, radius: a.radius || 132, mult2: mult,
            dir: dir, landAt: 0, fade: 1, dead: false,
          });
          this.fx.spark(sx, sy, 10, '#ffd479', { speed: 220, angle: dir > 0 ? 0 : Math.PI, spread: 1.2 });
          this.shake = Math.min(6, this.shake + 2);
          return;
        }
        this.fx.ring(cx, cy, 10, a.radius || 140, pl.char.color, 0.42, 6);
        this.fx.spark(cx, cy, 14, pl.char.accent, { speed: 260, jitter: 20 });
        this.aoeHit(a.radius || 140, mult);
        this.shake = Math.min(9, this.shake + 4);
      } else if (a.kind === 'dash') {
        const ms = a.dashMs || 260;
        const mul = a.dashMul || 2.4;
        pl.dashUntil = now + ms;
        pl.dashDir = pl.facing;
        pl.dashSpeed = pl.stats.moveSpeed * pl.speedMul * mul;
        pl.dashMult = mult;
        pl.dashHits = new Set();
        pl.invuln = now + ms + 60;
        if (a.cloud) {
          // 筋斗云：起手炸开一圈祥云，落点前一路拖云
          pl.cloudAuraUntil = now + ms + 430;
          for (let i = 0; i < 6; i++) {
            const a2 = (i / 6) * Math.PI * 2;
            this.fx.cloudPuff(cx + Math.cos(a2) * 20, cy + Math.sin(a2) * 13, 0.85, 0.6,
              { vx: Math.cos(a2) * 130 - pl.facing * 70, vy: Math.sin(a2) * 70 - 34, grow: 2.2 });
          }
          this.fx.ring(cx, cy, 8, 62, '#fff2cf', 0.4, 5);
        }
        this.fx.ring(cx, cy, 6, 46, '#bfe9ff', 0.28, 4);
        this.fx.spark(cx - pl.facing * 16, cy, 8, '#bfe9ff', { speed: 180, angle: pl.facing > 0 ? Math.PI : 0, spread: 1.1 });
      } else if (a.kind === 'ranged') {
        const d = XY.computeDamage({ attack: pl.stats.attack * pl.atkMul, critRate: pl.stats.critRate }, { defense: 0 }, a.multiplier, Math.random).amount;
        this.projectiles.push(new XY.Projectile(cx + pl.facing * 18, cy, pl.facing * 540, 0, d, 'player', 9, pl.char.color, (a.range || 320) / 540));
        this.fx.spark(cx + pl.facing * 22, cy, 7, pl.char.color, { speed: 170, angle: pl.facing > 0 ? 0 : Math.PI, spread: 0.9 });
        this.shake = Math.min(5, this.shake + 1.6);
      } else if (a.kind === 'heal') {
        pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * (a.healPct || 0.3));
        this.fx.dust(cx, pl.y + pl.h, 16, '#7CFC9B', 46, 90);
        this.fx.ring(cx, cy, 8, 60, '#7CFC9B', 0.4, 3);
        this.floater(cx, pl.y - 6, '回复', '#7CFC9B');
      } else if (a.kind === 'buff') {
        if (a.id === 'ts_sutra') { pl.buffAtkUntil = now + 6000; this.toast('大乘真经 · 攻击大增'); this.fx.dust(cx, pl.y + pl.h, 14, '#ffd479', 40, 80); }
        else if (a.id === 'ts_kasaya') { pl.buffDefUntil = now + 6000; this.toast('袈裟护体 · 防御大增'); this.fx.dust(cx, pl.y + pl.h, 14, '#8bc8ff', 40, 80); }
        this.fx.ring(cx, cy, 6, 54, '#ffe9a8', 0.36, 3);
      } else if (a.kind === 'treasure') this.execTreasure(a.treasure);
    }

    meleeHit(range, mult, heavy) {
      const pl = this.player;
      const rx = pl.facing > 0 ? pl.x + pl.w : pl.x - range;
      const rect = { x: rx, y: pl.y + 4, w: range, h: pl.h - 8 };
      let hits = 0;
      for (const e of this.level.enemies) if (e.alive && XY.aabb(rect, e)) { this.damageEnemy(e, mult * pl.atkMul, false, false); hits++; }
      return hits;
    }
    aoeHit(radius, mult) {
      const pl = this.player;
      this.aoeHitAt(pl.x + pl.w / 2, pl.y + pl.h / 2, radius, mult);
    }
    // 以世界坐标某点为圆心的范围伤害（定海神针的落点冲击波）
    aoeHitAt(x, y, radius, mult) {
      for (const e of this.level.enemies) {
        if (!e.alive) continue;
        const dx = (e.x + e.w / 2) - x, dy = (e.y + e.h / 2) - y;
        if (Math.hypot(dx, dy) <= radius + e.w * 0.4) this.damageEnemy(e, mult * this.player.atkMul, false, false);
      }
    }
    damageEnemy(e, multOrDmg, isAbs, isCrit) {
      let dmg;
      if (isAbs) dmg = multOrDmg;
      else {
        const r = XY.computeDamage({ attack: this.player.stats.attack, critRate: this.player.stats.critRate }, { defense: e.stats.defense }, multOrDmg, Math.random);
        dmg = r.amount; isCrit = r.crit;
      }
      if (!Number.isFinite(dmg)) dmg = 1;           // 兜底：绝不让 NaN 进入血量
      dmg = Math.max(1, Math.round(dmg));
      e.hp = Math.max(0, (Number.isFinite(e.hp) ? e.hp : e.maxHp) - dmg);
      e.hitFlash = 0.12;
      this.floater(e.x + e.w / 2, e.y, '-' + dmg + (isCrit ? '!' : ''), isCrit ? '#ff5e5e' : '#fff');
      this.fx.spark(e.x + e.w / 2, e.y + e.h / 2, isCrit ? 10 : 5, isCrit ? '#ff8a5e' : '#ffe9a8', { speed: 190 });
      if (e.hp <= 0) this.killEnemy(e);
    }
    killEnemy(e) {
      if (!e.alive) return;
      e.alive = false;
      const drops = XY.rollDrops(e.stats.dropTable, Math.random);
      this.inventory = XY.mergeInventory(this.inventory, drops);
      const names = Object.keys(drops).map((id) => XY.ITEMS[id].name + '×' + drops[id]).join(' ');
      if (names) this.toast('获得 ' + names);

      // —— 经验值：世界飘字 + HUD 弹出 + 击杀特效 ——
      const exp = XY.killExp(e.level || 1);
      this.player.gainExp(exp, this);
      this.floater(e.x + e.w / 2, e.y - 18, '+' + exp + ' EXP', '#9be7ff');
      this.expPops.push({ text: '+' + exp + ' EXP', life: 1.1, color: '#9be7ff' });

      this.fx.spark(e.x + e.w / 2, e.y + e.h / 2, e.isBoss ? 26 : 10, '#ffd479', { speed: e.isBoss ? 320 : 200 });
      if (e.isBoss) { this.fx.ring(e.x + e.w / 2, e.y + e.h / 2, 10, 220, '#ffd479', 0.7, 8); this.shake = 12; this.toast('击败 ' + e.name + '！'); }
      this.save();
    }
    hurtPlayer(amount) {
      const pl = this.player;
      if (pl.shieldUntil > this.now) amount = Math.round(amount * 0.3);
      pl.hp -= amount; pl.invuln = this.now + 600;
      this.floater(pl.x + pl.w / 2, pl.y, '-' + amount, '#ff8a5e');
      const dir = (pl.x < (this.level.enemies[0] ? this.level.enemies[0].x : pl.x)) ? -1 : 1;
      pl.vx = dir * 260; pl.vy = -260;
      this.hurtFlash = 0.55;
      this.shake = Math.min(10, this.shake + 3);
      this.fx.spark(pl.x + pl.w / 2, pl.y + pl.h / 2, 6, '#ff8a5e', { speed: 160 });
    }

    execTreasure(t) {
      const now = this.now, pl = this.player, cx = pl.x + pl.w / 2, cy = pl.y + pl.h / 2;
      const inR = (r) => this.level.enemies.filter((e) => e.alive && Math.hypot((e.x + e.w / 2) - cx, (e.y + e.h / 2) - cy) <= r + e.w / 2);
      this.toast('施放 ' + t.name);
      this.fx.ring(cx, cy, 8, 90, '#d6b3ff', 0.4, 5);
      this.fx.dust(cx, pl.y + pl.h, 10, '#d6b3ff', 36, 70);
      switch (t.effect) {
        case 'aoe_damage': {
          const list = inR(t.radius || 140);
          for (const e of list) this.damageEnemy(e, t.power, true, false);
          this.fx.ring(cx, cy, 14, (t.radius || 140) * 1.1, '#c39bff', 0.55, 7);
          this.fx.spark(cx, cy, 24, '#c39bff', { speed: 300, jitter: 24 });
          this.shake = Math.min(10, this.shake + 5);
          break;
        }
        case 'stun': {
          const list = inR(t.range || 260);
          for (const e of list) { e.stunUntil = now + (t.duration || 2000); this.fx.ring(e.x + e.w / 2, e.y + e.h / 2, 4, 34, '#ff8fb1', 0.4, 3); }
          this.fx.ring(cx, cy, 10, (t.range || 260), '#ff8fb1', 0.5, 4);
          break;
        }
        case 'knockback': {
          const list = inR(t.range || 220);
          for (const e of list) {
            this.damageEnemy(e, t.power, true, false);
            e.vx = (e.x + e.w / 2 < cx ? -1 : 1) * 420;
            e.knockUntil = now + 350;
          }
          this.fx.spark(cx + pl.facing * 30, cy, 18, '#8fe3c0', { speed: 320, angle: pl.facing > 0 ? 0 : Math.PI, spread: 1.0 });
          this.shake = Math.min(9, this.shake + 4);
          break;
        }
        case 'dot': {
          const list = inR(t.radius || 150);
          for (const e of list) { e.dotUntil = now + (t.duration || 4000); e.dotTick = now; this.fx.dust(e.x + e.w / 2, e.y + e.h, 8, '#ff7b7b', 24, 60); }
          break;
        }
        case 'heal':
          pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * 0.4);
          this.fx.dust(cx, pl.y + pl.h, 22, '#7CFC9B', 50, 110);
          this.fx.ring(cx, cy, 10, 76, '#7CFC9B', 0.5, 4);
          break;
        case 'speed':
          pl.buffSpdUntil = now + (t.duration || 5000);
          this.fx.dust(cx, pl.y + pl.h, 16, '#7fd0ff', 40, 90);
          break;
        case 'shield':
          pl.shieldUntil = now + (t.duration || 6000);
          this.fx.ring(cx, cy, 8, 66, '#ffd479', 0.5, 5);
          this.fx.dust(cx, pl.y + pl.h, 16, '#ffd479', 44, 80);
          break;
        case 'instant_kill_weak': {
          const list = inR(t.range || 320);
          for (const e of list) {
            if (e.hp <= e.maxHp * 0.4) { this.fx.ring(e.x + e.w / 2, e.y + e.h / 2, 6, 60, '#e0675a', 0.45, 4); this.killEnemy(e); }
            else this.damageEnemy(e, 40, true, false);
          }
          break;
        }
      }
    }

    // —— 合成 ——
    updateCraft() {
      const I = XY.Input;
      if (I.pressed('Escape') || I.pressed('KeyL') || I.pressed('KeyC')) { this.state = 'playing'; return; }
      if (I.pressed('KeyB')) { this.bagTab = 0; this.bagIndex = 0; this.state = 'bag'; return; }
      if (I.pressed('ArrowUp') || I.pressed('KeyW')) this.craftIndex = (this.craftIndex + XY.RECIPES.length - 1) % XY.RECIPES.length;
      if (I.pressed('ArrowDown') || I.pressed('KeyS')) this.craftIndex = (this.craftIndex + 1) % XY.RECIPES.length;
      if (I.pressed('Enter') || I.pressed('Space')) {
        const r = XY.RECIPES[this.craftIndex];
        if (XY.canCraft(this.inventory, r)) {
          this.inventory = XY.craft(this.inventory, r);
          const out = XY.ITEMS[r.output.itemId];
          if (out.slot) this.equipped[out.slot] = out.id;
          this.rebuildPlayer();
          this.toast('合成成功：' + out.name + '（已自动装备）');
          this.fx.levelUp(this.player.x + this.player.w / 2, this.player.y + this.player.h);
          this.save();
        } else this.toast('材料不足');
      }
    }

    // —— 背包 ——
    bagItems() {
      const out = [];
      if (this.bagTab === 0) {
        for (const id of Object.keys(XY.ITEMS)) {
          const it = XY.ITEMS[id];
          if (it.kind !== 'material') continue;
          out.push({
            id, name: it.name, count: this.inventory[id] || 0, icon: 'material',
            kindName: '材料', desc: it.description,
            action: (this.inventory[id] || 0) > 0 ? null : '尚未获得 · 打怪可掉落',
          });
        }
      } else if (this.bagTab === 1) {
        for (const id of this.treasures) {
          const t = XY.getTreasure(id);
          if (!t) continue;
          const slot = this.treasureSlots.indexOf(id);
          out.push({
            id, name: t.name, count: 1, icon: 'treasure',
            kindName: slot >= 0 ? ('法宝 · 已装备到栏 ' + (slot + 1)) : '法宝 · 未装备',
            desc: t.description || '',
            effectText: '出处：' + (t.story || '—') + ' · 冷却 ' + (t.cooldown / 1000) + ' 秒',
            action: slot >= 0 ? 'Enter 从法宝栏卸下' : 'Enter 装到法宝栏（1/2/3 键施放）',
            equipped: slot >= 0,
          });
        }
      } else {
        for (const id of Object.keys(XY.ITEMS)) {
          const it = XY.ITEMS[id];
          if (!it.slot) continue;
          const count = this.inventory[id] || 0;
          const equipped = this.equipped[it.slot] === id;
          if (count <= 0 && !equipped) continue;
          out.push({
            id, name: it.name, count: Math.max(1, count), icon: 'equip',
            kindName: '装备 · ' + (SLOT_NAME[it.slot] || it.slot),
            desc: it.description || '',
            bonusText: it.bonus ? Object.keys(it.bonus).map((k) => XY.UI.statName(k) + ' +' + (it.bonus[k] > 1 ? it.bonus[k] : Math.round(it.bonus[k] * 100) + '%')).join('   ') : '',
            action: equipped ? 'Enter 卸下' : 'Enter 装备',
            equipped,
          });
        }
      }
      return out;
    }

    equipTreasure(id) {
      const at = this.treasureSlots.indexOf(id);
      if (at >= 0) {
        this.treasureSlots[at] = null;
        this.toast('已卸下 ' + XY.getTreasure(id).name);
      } else {
        let free = this.treasureSlots.indexOf(null);
        if (free < 0) { free = this._replaceAt % SLOT_N; this._replaceAt++; }
        const old = this.treasureSlots[free];
        this.treasureSlots[free] = id;
        this.toast('『' + XY.getTreasure(id).name + '』装入法宝栏 ' + (free + 1) + (old ? '（替换 ' + XY.getTreasure(old).name + '）' : ''));
      }
      this.player.treasures = this.treasureSlots;
      this.save();
    }

    toggleEquip(id) {
      const it = XY.ITEMS[id];
      if (!it || !it.slot) return;
      if (this.equipped[it.slot] === id) {
        delete this.equipped[it.slot];
        this.toast('卸下 ' + it.name);
      } else {
        this.equipped[it.slot] = id;
        this.toast('装备 ' + it.name);
      }
      this.rebuildPlayer();
      this.save();
    }

    updateBag() {
      const I = XY.Input;
      if (I.pressed('KeyB') || I.pressed('Escape')) { this.state = 'playing'; return; }
      if (I.pressed('Digit1')) { this.bagTab = 0; this.bagIndex = 0; }
      if (I.pressed('Digit2')) { this.bagTab = 1; this.bagIndex = 0; }
      if (I.pressed('Digit3')) { this.bagTab = 2; this.bagIndex = 0; }
      if (I.pressed('KeyQ')) { this.bagTab = (this.bagTab + 2) % 3; this.bagIndex = 0; }
      if (I.pressed('KeyE')) { this.bagTab = (this.bagTab + 1) % 3; this.bagIndex = 0; }

      const items = this.bagItems();
      const maxI = Math.max(0, items.length - 1);
      if (I.pressed('KeyA') || I.pressed('ArrowLeft')) this.bagIndex = clamp(this.bagIndex - 1, 0, maxI);
      if (I.pressed('KeyD') || I.pressed('ArrowRight')) this.bagIndex = clamp(this.bagIndex + 1, 0, maxI);
      if (I.pressed('KeyW') || I.pressed('ArrowUp')) this.bagIndex = clamp(this.bagIndex - 5, 0, maxI);
      if (I.pressed('KeyS') || I.pressed('ArrowDown')) this.bagIndex = clamp(this.bagIndex + 5, 0, maxI);

      if (I.pressed('Enter') || I.pressed('Space') || I.pressed('Mouse0')) {
        const it = items[this.bagIndex];
        if (!it) return;
        if (this.bagTab === 1) this.equipTreasure(it.id);
        else if (this.bagTab === 2) this.toggleEquip(it.id);
        else this.toast(it.name + ' ×' + it.count);
      }
    }

    // 调试/预览入口：index.html?scene=play&char=0&lv=0 可直接落到指定界面（方便截图与排查）
    debugScene(params) {
      const scene = params.get('scene') || 'play';
      const ci = parseInt(params.get('char') || '0', 10);
      const lv = parseInt(params.get('lv') || '0', 10);
      this.charIndex = isFinite(ci) ? clamp(ci, 0, XY.CHARACTER_ORDER.length - 1) : 0;
      this.initRun();
      this.startLevel(isFinite(lv) ? clamp(lv, 0, XY.LEVELS.length - 1) : 0);
      // 预置一些战利品，方便看背包/图标
      this.inventory = { mat_wood: 7, mat_stone: 5, mat_herb: 3, mat_fire: 2, mat_soul: 4, eq_robe: 1 };
      this.treasures = ['tr_wuxing', 'tr_kunxian', 'tr_bajiao', 'tr_qixing', 'tr_yujing'];
      this.treasureSlots = ['tr_wuxing', 'tr_kunxian', 'tr_bajiao'];
      this.player.treasures = this.treasureSlots;
      this.equipped.weapon = 'eq_staff';
      this.rebuildPlayer();
      this.player.x = 300;
      const map = {
        title: 'title', charselect: 'charselect', cutscene: 'cutscene', intro: 'levelIntro',
        play: 'playing', bag: 'bag', craft: 'craft', pause: 'pause', gameover: 'gameover', win: 'win',
      };
      this.state = map[scene] || 'playing';
      if (this.state === 'charselect') this.player = this.player || null;
      this.debugHint = true;
      if (params.get('dump')) this._dump = true;
      // ?demo=1：自动走位 + 连续出招，方便截图看清动作与特效
      if (params.get('demo')) {
        this._demo = true;
        this._demoT = 0;
        if (!params.get('still')) XY.Input.setVirtual('KeyD', true);
      }
      // ?sim=N：同步推进 N 帧并输出状态（无头环境下不依赖 rAF，便于核对坐标）
      const simN = parseInt(params.get('sim') || '0', 10);
      if (simN > 0) {
        const right = params.get('right') !== '0';
        for (let i = 0; i < simN; i++) {
          this.now += 16;
          if (right) XY.Input.setVirtual('KeyD', true);
          if (this.player && i === simN - (parseInt(params.get('actAt') || '5', 10))) {
            const sk = params.get('skill');
            if (sk !== null) this.act(this.player.trySkill(parseInt(sk, 10) || 0, this.now));
            else if (params.get('act')) this.act(this.player.tryBasic(this.now));
          }
          this.update(0.016);
          XY.Input.endFrame();
        }
        if (right) XY.Input.setVirtual('KeyD', false);
        this.render();
        const pl = this.player, lv = this.level;
        const data = {
          state: this.state, cam: Math.round(this.cam.x),
          player: pl ? { x: Math.round(pl.x), y: Math.round(pl.y), onGround: pl.onGround, vy: Math.round(pl.vy) } : null,
          platforms: lv ? lv.platforms.map((q) => [q.x, q.y, q.w, q.h]) : null,
          enemies: lv ? lv.enemies.map((e) => ({ k: e.kind, x: Math.round(e.x), y: Math.round(e.y), w: e.w, h: e.h, hp: Math.round(e.hp), alive: e.alive })) : null,
        };
        if (typeof document !== 'undefined') {
          const el = document.getElementById('diag');
          if (el) { el.style.display = 'block'; el.textContent = 'DUMP ' + JSON.stringify(data); }
        }
        this._dumpData = data;
        if (params.get('freeze')) this._frozen = true; // 冻结画面，便于逐帧核对
      }
    }

    // —— 渲染 ——
    render() {
      const ctx = this.ctx;
      switch (this.state) {
        case 'title': XY.UI.drawTitle(ctx, this.uiTime); break;
        case 'charselect': XY.UI.drawCharSelect(ctx, this); break;
        case 'cutscene': {
          const beats = this.cutBeats || (XY.STORY.charCg && XY.STORY.charCg[this.charId]) || XY.STORY.prologue;
          const beat = beats[this.cutIndex] || beats[0];
          XY.UI.drawCutscene(ctx, beat, 1, this.uiTime, this.charId, this.cutIndex, beats.length);
          break;
        }
        case 'levelIntro': XY.UI.drawLevelIntro(ctx, this); break;
        case 'playing': this.renderPlaying(); break;
        case 'pause': this.renderPlaying(); XY.UI.drawPause(ctx); break;
        case 'bag': XY.UI.drawBag(ctx, this); break;
        case 'craft': XY.UI.drawCraft(ctx, this); break;
        case 'gameover': XY.UI.drawGameOver(ctx, this); break;
        case 'win': XY.UI.drawWin(ctx, this); break;
      }
    }
    renderPlaying() {
      const ctx = this.ctx;
      XY.UI.drawBackground(ctx, this.levelIndex, this.uiTime, this.cam.x);
      const sh = this.shake > 0 ? this.shake : 0;
      const ox = sh ? (Math.random() - 0.5) * sh : 0;
      const oy = sh ? (Math.random() - 0.5) * sh : 0;
      ctx.save(); ctx.translate(-this.cam.x + ox, oy);
      XY.UI.drawWorld(ctx, this);
      for (const f of this.floaters) {
        ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 0.45));
        ctx.fillStyle = f.color;
        ctx.font = 'bold 14px "PingFang SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }
      ctx.restore();
      // 受击红晕
      if (this.hurtFlash > 0) {
        const g = ctx.createRadialGradient ? ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.82) : null;
        if (g && g.addColorStop) {
          g.addColorStop(0, 'rgba(180,20,20,0)');
          g.addColorStop(1, 'rgba(180,20,20,' + (0.5 * this.hurtFlash) + ')');
          ctx.fillStyle = g;
        } else {
          ctx.fillStyle = 'rgba(180,20,20,' + (0.22 * this.hurtFlash) + ')';
        }
        ctx.fillRect(0, 0, W, H);
      }
      XY.UI.drawHUD(ctx, this);
      XY.UI.drawToast(ctx, this);
    }
  };

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const boot = () => {
      if (window.__game) return;
      const canvas = document.getElementById('game');
      if (!canvas) { console.error('[西游] 找不到 #game 画布'); return; }
      const game = new XY.Game(canvas);
      window.__game = game;
      // 调试预览：?scene=play / charselect / bag / craft ... 直达指定界面
      try {
        if (typeof location !== 'undefined' && location.search && /[?&]scene=/.test(location.search)) {
          const params = (typeof URLSearchParams !== 'undefined') ? new URLSearchParams(location.search) : null;
          if (params) game.debugScene(params);
        }
      } catch (e) { /* 忽略 */ }
      game.start();
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
    setTimeout(() => {
      if (!window.__game) {
        const el = document.getElementById('diag');
        if (el && el.style) { el.style.display = 'block'; el.textContent += '[西游] 启动失败：游戏对象未创建\n'; }
      }
    }, 2000);
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = XY;
})(typeof window !== 'undefined' ? window : globalThis);
