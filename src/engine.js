// 引擎层：输入 / 物理 / 玩家 / 敌人 / 弹道 / 关卡。挂到 XY。无外部依赖。
(function (root) {
  const XY = (root.XY = root.XY || {});

  const GRAVITY = 2000;
  const JUMP_V = -720;
  const JUMP_V2 = -640;    // 二段跳略弱于起跳，避免无限拔高
  const MAX_JUMPS = 2;
  const RUN_MUL = 1.8;     // 双击方向键后的奔跑倍率
  const RUN_TAP_MS = 320;  // 双击判定窗口
  XY.GRAVITY = GRAVITY;
  XY.JUMP_V = JUMP_V;
  XY.JUMP_V2 = JUMP_V2;
  XY.MAX_JUMPS = MAX_JUMPS;
  XY.RUN_MUL = RUN_MUL;
  XY.PLAYER_SCALE = 1.15; // 角色 2D 造型的绘制缩放（碰撞盒不变）

  function approach(cur, target, maxDelta) {
    if (cur < target) return Math.min(cur + maxDelta, target);
    return Math.max(cur - maxDelta, target);
  }
  XY.approach = approach;

  XY.aabb = function (a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  };

  // 分轴 AABB 碰撞解算（实体 e 含 x,y,w,h,vx,vy；platforms 为 [x,y,w,h]）
  // 必须先纵向、后横向：否则贴着地面时，横向检测会把实体的"站在地上"误判成"撞到地板侧面"，
  // 直接被推出地图（曾导致怪物出生即被弹飞去地图边缘并坠落）。
  XY.moveAndCollide = function (e, platforms, dt) {
    e.y += e.vy * dt;
    e.onGround = false;
    for (const p of platforms) {
      if (XY.aabb(e, p)) {
        if (e.vy > 0) { e.y = p.y - e.h; e.vy = 0; e.onGround = true; }
        else if (e.vy < 0) { e.y = p.y + p.h; e.vy = 0; }
      }
    }
    e.x += e.vx * dt;
    for (const p of platforms) {
      if (XY.aabb(e, p)) {
        if (e.vx > 0) e.x = p.x - e.w;
        else if (e.vx < 0) e.x = p.x + p.w;
        e.vx = 0;
      }
    }
  };

  // 把实体抬到平台上方（出生点校正用），最多尝试 4 次避免死循环
  XY.liftOutOfPlatforms = function (e, platforms) {
    for (let k = 0; k < 4; k++) {
      let hit = null;
      for (const p of platforms) {
        if (XY.aabb(e, p) && p.y + p.h - e.y > 2) { hit = p; break; }
      }
      if (!hit) return;
      e.y = hit.y - e.h;
    }
  };

  // 找出 x 处、fromY 之下最近的平台顶面（掷出的兵器据此判断落点）
  XY.groundYAt = function (platforms, x, fromY) {
    let best = null;
    for (const p of platforms) {
      if (x < p.x - 2 || x > p.x + p.w + 2) continue;
      if (p.y < fromY - 4) continue;
      if (best === null || p.y < best) best = p.y;
    }
    return best === null ? fromY + 260 : best;
  };

  // ===== 输入 =====
  // 某些环境（预览面板 iframe / 部分 webview）keydown 只派发到 document，或只带 keyCode 没有 code，
  // 这里统一兜住：document + window 双绑、code 缺失时用 keyCode 映射、并记录按键计数用于诊断。
  const KEYCODE_MAP = {
    9: 'Tab', 13: 'Enter', 27: 'Escape', 32: 'Space',
    37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown',
    49: 'Digit1', 50: 'Digit2', 51: 'Digit3',
    65: 'KeyA', 66: 'KeyB', 67: 'KeyC', 68: 'KeyD', 69: 'KeyE',
    73: 'KeyI', 74: 'KeyJ', 75: 'KeyK', 76: 'KeyL', 80: 'KeyP', 81: 'KeyQ',
    82: 'KeyR', 83: 'KeyS', 85: 'KeyU', 87: 'KeyW',
  };

  XY.Input = {
    down: {},
    _pressed: {},
    virtual: {},          // 屏幕按钮按下状态
    _virtualPressed: {},
    keyCount: 0,          // 累计收到的真实按键数（0 表示键盘没接管）
    lastCode: '',
    init() {
      if (this._inited) return;
      this._inited = true;
      const codeOf = (e) => e.code || KEYCODE_MAP[e.keyCode] || KEYCODE_MAP[e.which] || '';
      const onDown = (e) => {
        const code = codeOf(e);
        if (!code) return;
        if (!this.down[code]) this._pressed[code] = true;
        this.down[code] = true;
        this.keyCount++; this.lastCode = code;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(code)) {
          if (e.preventDefault) e.preventDefault();
        }
      };
      const onUp = (e) => {
        const code = codeOf(e);
        if (code) this.down[code] = false;
      };
      const targets = [];
      if (typeof document !== 'undefined' && document.addEventListener) targets.push(document);
      if (typeof window !== 'undefined' && window.addEventListener) targets.push(window);
      for (const t of targets) {
        t.addEventListener('keydown', onDown, true);
        t.addEventListener('keyup', onUp, true);
      }
    },
    // 屏幕按钮 / 触屏调用：等价于按住某个键
    setVirtual(code, on) {
      if (on) {
        if (!this.virtual[code]) this._virtualPressed[code] = true;
        this.virtual[code] = true;
      } else {
        this.virtual[code] = false;
      }
    },
    clearVirtual() { this.virtual = {}; },
    isDown(code) { return !!this.down[code] || !!this.virtual[code]; },
    pressed(code) { return !!this._pressed[code] || !!this._virtualPressed[code]; },
    endFrame() { this._pressed = {}; this._virtualPressed = {}; },
  };

  // ===== 玩家 =====
  // 键位：WASD 为主，方向键兼容（单手也能玩）
  const KEYS = {
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    jump: ['KeyW', 'ArrowUp', 'Space'],
    down: ['KeyS', 'ArrowDown'],
  };
  XY.KEYS = KEYS;
  const anyPressed = (input, list) => list.some((k) => input.pressed(k));
  const anyDown = (input, list) => list.some((k) => input.isDown(k));

  XY.makePlayer = function (charDef, equippedItems, treasureIds) {
    const stats = XY.totalStats(charDef.base, equippedItems);
    return new XY.Player(charDef, stats, equippedItems, treasureIds || []);
  };

  XY.Player = class {
    constructor(charDef, stats, equipped, treasures) {
      this.char = charDef;
      this.base = charDef.base;
      this.stats = stats;
      this.equipped = equipped;
      this.treasures = treasures; // 可用法宝 id 列表（通常 3 格）
      this.w = 34; this.h = 54;
      this.x = 80; this.y = 360;
      this.vx = 0; this.vy = 0;
      this.facing = 1;
      this.onGround = false;
      this.maxHp = stats.maxHp; this.hp = stats.maxHp;
      this.maxEnergy = 100; this.energy = 100;
      this.skillCd = {}; this.treasureCd = {};
      this.attackReady = 0;
      this.invuln = 0;
      this.dashUntil = 0; this.dashDir = 1;
      this.dashSpeed = 0;            // 冲刺速度由技能数据决定（筋斗云突更远更快）
      this.cloudAuraUntil = 0;       // 祥云缠身的持续时间（表现层用）
      this.noWeaponUntil = 0;        // 掷出兵器后，手上暂时是空的
      this.dashHits = null;
      this.buffAtkUntil = 0; this.buffSpdUntil = 0; this.buffDefUntil = 0; this.shieldUntil = 0;
      this.level = 1; this.exp = 0;
      // —— 动画状态 ——
      this.animT = 0;
      this.attackStart = -9999; this.attackUntil = -9999;
      this.castStart = -9999; this.castUntil = -9999;
      this.combo = 0; this.lastAttackAt = -9999;
      this.attackKind = 0;           // 0 劈 / 1 戳 / 2 挑
      this.lungeUntil = 0;           // 普攻进步窗口
      this.castSkillId = null;       // 正在施放哪个技能（造型层据此摆姿势）
      this.walkPhase = 0;
      // —— 二段跳 ——
      this.maxJumps = MAX_JUMPS; this.jumpsLeft = MAX_JUMPS;
      // —— 双击方向键奔跑 ——
      this.runDir = 0; this.lastTapDir = 0; this.lastTapAt = -9999;
      this.sprintDustT = 0;
      // 供表现层消费的事件队列（起跳尘、二段跳气环、奔跑扬尘…）
      this.fxQueue = [];
    }
    // 逻辑层不直接画东西，把"发生了什么"交给 game 层转成特效
    emitFx(type, data) {
      if (!this.fxQueue) this.fxQueue = [];
      if (this.fxQueue.length < 60) this.fxQueue.push({ type: type, data: data || null });
    }
    get sprinting() { return this.runDir !== 0; }
    get speedMul() { return (this.now < this.buffSpdUntil) ? 1.5 : 1; }
    get atkMul() { return (this.now < this.buffAtkUntil) ? 1.4 : 1; }
    get defMul() { return (this.now < this.buffDefUntil) ? 2 : 1; }

    update(dt, input, level, now) {
      this.now = now;
      this.animT += dt * 1000;
      // 水平移动（A/D 或 ←/→）
      let dir = 0;
      const tapLeft = anyPressed(input, KEYS.left);
      const tapRight = anyPressed(input, KEYS.right);
      if (anyDown(input, KEYS.left)) dir -= 1;
      if (anyDown(input, KEYS.right)) dir += 1;
      if (dir !== 0) this.facing = dir;

      // 同一方向在 320ms 内连按两次 → 进入奔跑
      if (tapLeft || tapRight) {
        const tapDir = tapRight ? 1 : -1;
        if (this.lastTapDir === tapDir && now - this.lastTapAt <= RUN_TAP_MS) {
          if (this.runDir !== tapDir) this.emitFx('sprintStart', { dir: tapDir });
          this.runDir = tapDir;
        }
        this.lastTapDir = tapDir; this.lastTapAt = now;
      }
      // 松手或反向立刻退出奔跑
      if (dir === 0 || dir !== this.runDir) this.runDir = 0;
      const sprinting = this.runDir !== 0 && now >= this.dashUntil;

      // 出招时脚下扎住（手感：攻击定身），冲刺时高速突进
      const busy = now < this.attackUntil || now < this.castUntil;
      if (now < this.dashUntil) {
        this.vx = this.dashDir * (this.dashSpeed || this.stats.moveSpeed * 2.4);
      } else if (now < (this.lungeUntil || 0)) {
        // 普攻进步：这段时间保持冲出去的惯性，别被摩擦立刻吃掉
      } else {
        const spd = this.stats.moveSpeed * this.speedMul * (sprinting ? RUN_MUL : 1);
        const target = dir * spd * (busy ? 0.32 : 1);
        this.vx = approach(this.vx, target, this.stats.moveSpeed * (sprinting ? 20 : 12) * dt);
      }
      // 跳跃（W / ↑ / 空格）：地面起跳 + 空中一次二段跳
      if (anyPressed(input, KEYS.jump) && this.jumpsLeft > 0) {
        const isSecond = !this.onGround;
        this.vy = isSecond ? JUMP_V2 : JUMP_V;
        this.jumpsLeft -= 1;
        this.onGround = false;
        this.emitFx(isSecond ? 'doubleJump' : 'jump');
      }
      // S / ↓ 快速下落
      if (anyDown(input, KEYS.down) && this.vy > 0) this.vy += 1600 * dt;

      // 重力
      this.vy += GRAVITY * dt;
      if (this.vy > 1400) this.vy = 1400;
      XY.moveAndCollide(this, level.platforms, dt);
      // 落地补满跳跃次数
      if (this.onGround) this.jumpsLeft = this.maxJumps;

      // 奔跑扬尘
      if (sprinting && this.onGround && Math.abs(this.vx) > 60) {
        this.sprintDustT += dt;
        if (this.sprintDustT > 0.085) { this.sprintDustT = 0; this.emitFx('runDust', { dir: dir }); }
      } else {
        this.sprintDustT = 0;
      }

      // 能量回复
      this.energy = Math.min(this.maxEnergy, this.energy + 14 * dt);
      // 走路相位（给美术层做步频）
      if (Math.abs(this.vx) > 24 && this.onGround) this.walkPhase += dt * Math.abs(this.vx) * 0.06;
    }

    // 当前动作姿态（供 2D 造型层使用）
    pose(now) {
      const atk = now < this.attackUntil ? (now - this.attackStart) / Math.max(1, this.attackUntil - this.attackStart) : undefined;
      const cast = now < this.castUntil ? (now - this.castStart) / Math.max(1, this.castUntil - this.castStart) : undefined;
      let state = 'idle';
      if (now < this.dashUntil) state = 'dash';
      else if (atk !== undefined) state = 'attack';
      else if (!this.onGround) state = 'jump';
      else if (Math.abs(this.vx) > 28) state = 'run';
      return {
        t: this.animT, state, facing: this.facing,
        attackP: atk, castP: cast,
        attackKind: this.attackKind,
        castId: now < this.castUntil ? this.castSkillId : null,
        noWeapon: now < this.noWeaponUntil,
        combo: this.combo,
        sprint: this.runDir !== 0 && state === 'run',
      };
    }

    // 普攻三段：劈 → 戳 → 挑。不同的出手节奏、判定范围与位移，让三段读起来是三种招式
    tryBasic(now) {
      if (now < this.attackReady) return null;
      const quick = now - this.lastAttackAt < 820;
      this.combo = quick ? (this.combo + 1) % 3 : 0;
      this.lastAttackAt = now;
      const kind = this.combo;
      // dur=动作时长 / ready=下一次可出手 / range=身前判定长度 / mult=倍率 / lunge=前冲位移
      const cfg = [
        { dur: 250, ready: 306, range: 64, mult: 0.92, lunge: 40 },   // 劈：自上而下，砸身
        { dur: 210, ready: 268, range: 88, mult: 0.98, lunge: 150 },  // 戳：直刺，探得远
        { dur: 330, ready: 436, range: 74, mult: 1.36, lunge: 20 },   // 挑：贴身撩起，最重
      ][kind];
      this.attackKind = kind;
      this.attackStart = now; this.attackUntil = now + cfg.dur;
      this.attackReady = now + cfg.ready;
      // 戳的进步：脚下一蹬，身子跟上去
      if (cfg.lunge && this.onGround) { this.vx = this.facing * cfg.lunge; this.lungeUntil = now + 140; }
      return {
        kind: 'melee', atkKind: kind, range: cfg.range, mult: cfg.mult,
        hitKey: 'atk' + now, combo: this.combo, heavy: kind === 2,
      };
    }
    trySkill(i, now) {
      const sid = this.char.skills[i];
      if (!sid) return null;
      const sk = XY.getSkill(sid);
      if (now < (this.skillCd[sid] || 0)) return null;
      if (this.energy < sk.cost) return null;
      this.energy -= sk.cost;
      this.skillCd[sid] = now + sk.cooldown;
      this.castStart = now; this.castUntil = now + 340;
      this.castSkillId = sid;
      return Object.assign({ hitKey: sid + now }, sk);
    }
    tryTreasure(i, now) {
      const tid = this.treasures[i];
      if (!tid) return null;
      const t = XY.getTreasure(tid);
      if (now < (this.treasureCd[tid] || 0)) return null;
      this.treasureCd[tid] = now + t.cooldown;
      this.castStart = now; this.castUntil = now + 300;
      return { kind: 'treasure', treasure: t, hitKey: 'tr' + tid + now };
    }
    gainExp(amount, game) {
      this.exp += amount;
      let ups = 0;
      while (this.exp >= XY.expToNext(this.level)) {
        this.exp -= XY.expToNext(this.level);
        this.level++;
        this.stats.maxHp += 20; this.stats.attack += 4; this.stats.defense += 2;
        this.maxHp = this.stats.maxHp;
        this.hp = this.maxHp;
        ups++;
      }
      if (ups > 0 && game) {
        game.toast('升到 ' + this.level + ' 级！气血全满');
        if (game.fx) game.fx.levelUp(this.x + this.w / 2, this.y + this.h);
        if (game.expPops) game.expPops.push({ text: 'LEVEL UP! Lv.' + this.level, life: 1.6, color: '#ffd479' });
      }
      return ups;
    }
  };

  // ===== 敌人 =====
  XY.makeEnemy = function (kind, x, y, levelNum) {
    const lv = Number.isFinite(Number(levelNum)) && Number(levelNum) > 0 ? Number(levelNum) : 1;
    if (kind === 'boss') {
      const b = XY.BOSS_BASE;
      const f = 1 + (lv - 1) * 0.18;
      const boss = new XY.Enemy('boss', {
        name: b.name, maxHp: Math.round(b.hp * f), hp: Math.round(b.hp * f),
        attack: Math.round(b.attack * f), defense: Math.round(b.defense * f),
        moveSpeed: b.moveSpeed, aggroRange: b.aggroRange, dropTable: b.dropTable,
      }, x, y, 116, 152);
      boss.level = lv;
      return boss;
    }
    const base = XY.scaleEnemyStats(XY.ENEMY_BASE[kind], lv);
    const sizes = { imp: [44, 54], wolf: [66, 46], spider: [56, 40] };
    const [w, h] = sizes[kind];
    const e = new XY.Enemy(kind, base, x, y, w, h);
    e.level = lv;
    return e;
  };

  XY.Enemy = class {
    constructor(kind, stats, x, y, w, h) {
      this.kind = kind;
      this.stats = stats;
      this.name = stats.name;
      this.w = w; this.h = h;
      this.x = x; this.y = y;
      this.vx = 0; this.vy = 0;
      this.facing = -1;
      this.onGround = false;
      this.hp = stats.maxHp; this.maxHp = stats.maxHp;
      this.atkReady = 0; this.stunUntil = 0;
      this.dotUntil = 0; this.dotTick = 0;
      this.alive = true;
      this.hitFlash = 0;
      this.atkUntil = 0;
      this.isBoss = kind === 'boss';
    }
    update(dt, player, level, now) {
      this.now = now;
      if (this.hitFlash > 0) this.hitFlash -= dt;
      // 击退/眩晕：不动
      if (now < this.stunUntil) { this.vx = 0; this.vy += GRAVITY * dt; XY.moveAndCollide(this, level.platforms, dt); return; }
      const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
      const dist = Math.abs(dx);
      if (dist < this.stats.aggroRange) {
        this.facing = dx >= 0 ? 1 : -1;
        this.vx = approach(this.vx, this.facing * this.stats.moveSpeed, this.stats.moveSpeed * 8 * dt);
      } else {
        this.vx = approach(this.vx, 0, this.stats.moveSpeed * 8 * dt);
      }
      this.vy += GRAVITY * dt;
      if (this.vy > 1200) this.vy = 1200;
      XY.moveAndCollide(this, level.platforms, dt);
      // 兜底：不越出地图左右边界，万一掉出地图就从上空落回
      this.x = Math.max(0, Math.min(level.width - this.w, this.x));
      if (this.y > level.height + 160) { this.y = -80; this.vy = 0; this.x = Math.max(0, Math.min(level.width - this.w, this.x)); }
      // 灼烧（dot）
      if (now < this.dotUntil) {
        if (now - this.dotTick > 500) {
          this.dotTick = now;
          this.hp = Math.max(0, (Number.isFinite(this.hp) ? this.hp : this.maxHp) - 12);
          this.hitFlash = 0.1;
          if (this.hp <= 0) this.pendingKill = true; // 交给 game 走统一掉落/经验结算
        }
      }
    }
  };

  // ===== 弹道（远程技能/法宝）=====
  XY.Projectile = class {
    constructor(x, y, vx, vy, damage, owner, radius, color, life) {
      this.x = x; this.y = y; this.vx = vx; this.vy = vy;
      this.damage = damage; this.owner = owner; // 'player' | 'enemy'
      this.r = radius || 8; this.color = color || '#ffd479';
      this.life = life || 1.6; this.alive = true;
    }
    update(dt, level) {
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.life -= dt;
      if (this.life <= 0) this.alive = false;
      // 撞地/平台即消失
      for (const p of level.platforms) {
        if (XY.aabb({ x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }, p)) { this.alive = false; break; }
      }
    }
  };

  // ===== 关卡运行时 =====
  XY.Level = class {
    constructor(data) {
      this.data = data;
      this.name = data.name;
      this.width = data.width; this.height = data.height;
      this.platforms = data.platforms.map((p) => ({ x: p[0], y: p[1], w: p[2], h: p[3] }));
      this.goal = data.goal;
      this.hasBoss = data.spawns.some((s) => s.type === 'boss');
      this.enemies = data.spawns.map((s) => {
        const e = XY.makeEnemy(s.type, s.x, s.y, s.level);
        XY.liftOutOfPlatforms(e, this.platforms);
        return e;
      });
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = XY;
})(typeof window !== 'undefined' ? window : globalThis);
