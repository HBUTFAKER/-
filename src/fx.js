// 特效层：刀光 / 火花 / 冲击环 / 冲刺残影 / 升级光柱 / 治疗光尘。
// 只负责"看得爽"，不参与任何战斗判定，可随时清空。
(function (root) {
  const XY = (root.XY = root.XY || {});
  const FX = (XY.FX = {});
  const MAX = 340;

  function seg(p, a, b) { return Math.min(1, Math.max(0, (p - a) / (b - a))); }
  function easeOut(p) { return 1 - (1 - p) * (1 - p); }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); }

  // 十丈金箍棒：一根被放大到离谱的棒子，从头顶抡下来砸地
  function drawGiantStaff(ctx, L, Wd) {
    // 棒身
    ctx.beginPath();
    ctx.rect(-Wd / 2, -L, Wd, L);
    ctx.fillStyle = '#b8331f'; ctx.fill();
    ctx.strokeStyle = '#2a1208'; ctx.lineWidth = 3; ctx.stroke();
    // 受光面
    ctx.beginPath();
    ctx.rect(-Wd / 2 + Wd * 0.14, -L, Wd * 0.16, L);
    ctx.fillStyle = 'rgba(255,236,190,0.22)'; ctx.fill();
    // 两端金箍
    for (const yy of [-L - Wd * 1.1, -Wd * 1.2]) {
      ctx.beginPath();
      ctx.rect(-Wd * 0.74, yy, Wd * 1.48, Wd * 1.4);
      ctx.fillStyle = '#f4c430'; ctx.fill();
      ctx.strokeStyle = '#2a1208'; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath();
      ctx.rect(-Wd * 0.74 + 3, yy + 4, Wd * 0.3, Wd * 1.4 - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.fill();
    }
  }

  XY.FXLayer = class {
    constructor() {
      this.items = [];
      this.t = 0;
    }
    clear() { this.items.length = 0; }
    _push(it) {
      if (this.items.length >= MAX) this.items.shift();
      this.items.push(it);
    }

    update(dt) {
      this.t += dt * 1000;
      const out = [];
      for (let i = 0; i < this.items.length; i++) {
        const it = this.items[i];
        it.life -= dt;
        if (it.life <= 0) continue;
        if (it.type === 'spark' || it.type === 'trail') {
          it.x += it.vx * dt;
          it.y += it.vy * dt;
          it.vy += (it.gravity === undefined ? 780 : it.gravity) * dt;
          it.vx *= 0.985;
        } else if (it.type === 'ghost') {
          it.x += (it.drift || 0) * dt;
        } else if (it.type === 'cloud') {
          it.x += it.vx * dt;
          it.y += it.vy * dt;
          it.vx *= 0.99;
        }
        out.push(it);
      }
      this.items = out;
    }

    // —— 刀光：弧形横扫 ——
    slash(x, y, dir, color, scale, life) {
      const l = life || 0.24;
      this._push({ type: 'slash', x, y, dir: dir < 0 ? -1 : 1, color: color || '#ffe9a8', scale: scale || 1, life: l, maxLife: l, style: 'arc' });
    }
    // —— 同上的花样版：arc 横扫 / thrust 直刺 / lift 上撩 ——
    slashStyle(x, y, dir, color, scale, life, style) {
      const l = life || 0.24;
      this._push({ type: 'slash', x, y, dir: dir < 0 ? -1 : 1, color: color || '#ffe9a8', scale: scale || 1, life: l, maxLife: l, style: style || 'arc' });
    }

    // —— 十丈金箍棒：从头顶抡下砸地 ——
    giantStaff(x, y, dir, life) {
      const l = life || 0.62;
      this._push({ type: 'giantStaff', x, y, dir: dir < 0 ? -1 : 1, len: 340, wid: 40, life: l, maxLife: l });
    }

    // —— 祥云：一片软乎乎的云，会飘、会散 ——
    cloudPuff(x, y, scale, life, opts) {
      opts = opts || {};
      const l = life || 0.6;
      this._push({
        type: 'cloud', x, y, scale: scale || 1,
        vx: opts.vx === undefined ? 0 : opts.vx,
        vy: opts.vy === undefined ? -16 : opts.vy,
        grow: opts.grow === undefined ? 1.7 : opts.grow,
        color: opts.color || 'rgba(255,252,240,0.98)',
        rot: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 1.6,
        life: l, maxLife: l,
      });
    }

    // —— 火花：命中/爆裂 ——
    spark(x, y, count, color, opts) {
      opts = opts || {};
      const spd = opts.speed || 200;
      const n = count || 6;
      for (let i = 0; i < n; i++) {
        const a = opts.angle !== undefined ? opts.angle + (Math.random() - 0.5) * (opts.spread || 1.6) : Math.random() * Math.PI * 2;
        const s = spd * (0.35 + Math.random() * 0.9);
        const life = (opts.life || 0.45) * (0.6 + Math.random() * 0.7);
        this._push({
          type: 'spark',
          x: x + (Math.random() - 0.5) * (opts.jitter || 6),
          y: y + (Math.random() - 0.5) * (opts.jitter || 6),
          vx: Math.cos(a) * s, vy: Math.sin(a) * s - (opts.rise || 0),
          r: (opts.size || 2.6) * (0.6 + Math.random() * 0.8),
          color: color || '#ffd479',
          life,
          maxLife: life,
          gravity: opts.gravity,
        });
      }
    }

    // —— 冲击环：AoE / 落地 / 升级 ——
    ring(x, y, r0, r1, color, life, width) {
      const l = life || 0.4;
      this._push({ type: 'ring', x, y, r0: r0 || 8, r1: r1 || 120, color: color || '#ffd479', life: l, maxLife: l, width: width || 5 });
    }

    // —— 冲刺残影 ——
    afterimage(cx, footY, scale, charId, pose, drift) {
      this._push({
        type: 'ghost', x: cx, footY, scale, charId, pose: pose || {},
        drift: drift || 0, life: 0.26, maxLife: 0.26,
      });
    }

    // —— 光尘：治疗 / 增益 ——
    dust(x, y, count, color, radius, rise) {
      const n = count || 8;
      for (let i = 0; i < n; i++) {
        this._push({
          type: 'spark',
          x: x + (Math.random() - 0.5) * (radius || 40),
          y: y - Math.random() * 34,
          vx: (Math.random() - 0.5) * 24,
          vy: -(rise || 70) * (0.5 + Math.random()),
          r: 2.2 + Math.random() * 2.2,
          color: color || '#7CFC9B',
          life: 0.6 + Math.random() * 0.45, maxLife: 1,
          gravity: -40,
        });
      }
    }

    // —— 升级：金环 + 光柱 + 上升光点 ——
    levelUp(x, y) {
      this.ring(x, y, 10, 110, '#ffd479', 0.6, 6);
      this.ring(x, y, 4, 74, '#fff6cc', 0.45, 3);
      for (let i = 0; i < 22; i++) {
        this._push({
          type: 'spark',
          x: x + (Math.random() - 0.5) * 46,
          y: y - Math.random() * 10,
          vx: (Math.random() - 0.5) * 60,
          vy: -220 * (0.5 + Math.random()),
          r: 2 + Math.random() * 3,
          color: Math.random() > 0.5 ? '#ffd479' : '#fff6cc',
          life: 0.7 + Math.random() * 0.5, maxLife: 1.2,
          gravity: -60,
        });
      }
    }

    // —— 弹道拖尾 ——
    trail(x, y, color, r) {
      this._push({
        type: 'spark', x, y, vx: 0, vy: 0, r: r || 4, color: color || '#9be7ff',
        life: 0.22, maxLife: 0.22, gravity: 0,
      });
    }

    // pass: 'back' 只画残影（在角色身后）；'front' 画刀光/火花/光环（在角色身前）
    draw(ctx, pass) {
      const back = pass === 'back';
      for (let i = 0; i < this.items.length; i++) {
        const it = this.items[i];
        if (back && it.type !== 'ghost') continue;
        if (!back && it.type === 'ghost') continue;
        const p = Math.min(1, Math.max(0, 1 - Math.max(0, it.life) / (it.maxLife || 1)));
        const A = (k) => Math.min(1, Math.max(0, (1 - p) * (k === undefined ? 1 : k)));
        if (it.type === 'spark' || it.type === 'trail') {
          ctx.globalAlpha = A();
          ctx.fillStyle = it.color;
          ctx.beginPath();
          if (ctx.arc) ctx.arc(it.x, it.y, Math.max(0.4, it.r * (1 - p * 0.55)), 0, Math.PI * 2);
          ctx.fill();
        } else if (it.type === 'ring') {
          const r = it.r0 + (it.r1 - it.r0) * (p < 0.75 ? p / 0.75 : 1);
          ctx.globalAlpha = A(0.95);
          ctx.strokeStyle = it.color;
          ctx.lineWidth = Math.max(0.6, it.width * (1 - p));
          ctx.beginPath();
          if (ctx.ellipse) ctx.ellipse(it.x, it.y, r, r * 0.92, 0, 0, Math.PI * 2);
          else ctx.arc(it.x, it.y, r, 0, Math.PI * 2);
          ctx.stroke();
        } else if (it.type === 'slash') {
          // 一记横扫：锥形泪滴弧（两头收尖）+ 暖金辉光 + 白芯 + 刃尖亮点
          const a0 = -1.02, a1 = 1.02;
          const head = a0 + (a1 - a0) * Math.min(1, p * 1.45);
          const r = (22 + 26 * p) * it.scale;
          const fade = 1 - p * 0.55;          // 越到后面越淡
          // 锥形弧：外缘半径 r+w、内缘 r-w，两头 w→0
          const swoosh = (wMax, dy) => {
            const n = 11;
            const outer = [];
            const inner = [];
            for (let i = 0; i <= n; i++) {
              const t = i / n;
              const a = a0 + (head - a0) * t;
              const w = wMax * Math.sin(Math.PI * Math.pow(t, 0.85)) * (0.35 + 0.65 * t);
              const ca = Math.cos(a), sa = Math.sin(a);
              outer.push([ca * (r + w), sa * (r + w) + dy]);
              inner.push([ca * (r - w * 0.55), sa * (r - w * 0.55) + dy]);
            }
            ctx.beginPath();
            ctx.moveTo(outer[0][0], outer[0][1]);
            for (let i = 1; i <= n; i++) ctx.lineTo(outer[i][0], outer[i][1]);
            for (let i = n; i >= 0; i--) ctx.lineTo(inner[i][0], inner[i][1]);
            ctx.closePath();
            ctx.fill();
          };
          ctx.save();
          ctx.translate(it.x, it.y);
          // 直刺拉长压扁、上撩整体转向上方、横甩压成一道宽横扇
          const st = it.style || 'arc';
          if (st === 'lift') ctx.rotate(-1.02);
          else if (st === 'thrust') ctx.rotate(-0.1);
          else if (st === 'sweep') ctx.rotate(0.1);
          ctx.scale(it.dir * (st === 'thrust' ? 2.15 : (st === 'sweep' ? 1.58 : 1)),
            st === 'thrust' ? 0.52 : (st === 'sweep' ? 0.84 : 1));
          // 外辉光（叠加发光）
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = A(0.18) * fade;
          ctx.fillStyle = it.color;
          swoosh((14 - 6 * p) * it.scale, 0);
          // 金色主刃（正常混合，保住颜色不发白）
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.min(1, A(1.0) * fade + 0.12);
          ctx.fillStyle = it.color;
          swoosh((9 - 4 * p) * it.scale, 0);
          // 白芯（细，压在中线偏外）
          ctx.globalAlpha = A(0.55) * fade;
          ctx.fillStyle = '#fffdf0';
          swoosh((2.8 - 1.4 * p) * it.scale, 0);
          // 刃尖亮点 + 拖尾星点
          const tipX = Math.cos(head) * r, tipY = Math.sin(head) * r;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(1, A(0.9) * fade);
          ctx.fillStyle = '#fff6d8';
          ctx.beginPath();
          ctx.arc(tipX, tipY, Math.max(1.5, 5 * it.scale * (1 - p * 0.7)), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = A(0.35) * fade;
          ctx.fillStyle = it.color;
          ctx.beginPath();
          ctx.arc(tipX * 0.55, tipY * 0.55, Math.max(1, 2.4 * it.scale * (1 - p)), 0, Math.PI * 2);
          ctx.fill();
          // —— 每招的"签名"：直刺一根白线、横甩两圈错开的扇、上挑一串上升碎光 ——
          if (st === 'thrust') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.min(1, A(0.75) * fade);
            ctx.strokeStyle = '#fffdf0';
            ctx.lineWidth = Math.max(1.2, 3.4 * it.scale * (1 - p));
            ctx.beginPath();
            ctx.moveTo(-r * 0.5, 0);
            ctx.lineTo(r * 1.52, 0);
            ctx.stroke();
            ctx.globalAlpha = Math.min(1, A(0.32) * fade);
            ctx.fillStyle = it.color;
            ctx.beginPath();
            ctx.moveTo(r * 1.5, -3.6 * it.scale);
            ctx.lineTo(r * 2.02, 0);
            ctx.lineTo(r * 1.5, 3.6 * it.scale);
            ctx.closePath();
            ctx.fill();
          } else if (st === 'sweep') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.min(1, A(0.22) * fade);
            ctx.fillStyle = it.color;
            swoosh((16 - 7 * p) * it.scale, -3.4 * it.scale);
            ctx.globalAlpha = Math.min(1, A(0.15) * fade);
            swoosh((11 - 4 * p) * it.scale, 4.6 * it.scale);
          } else if (st === 'lift') {
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 4; i++) {
              const q = i / 3;
              const aa = a0 + (a1 - a0) * (0.25 + q * 0.7);
              const rr2 = r * (0.75 + q * 0.5);
              ctx.globalAlpha = Math.min(1, A(0.5) * fade * (1 - q * 0.5));
              ctx.fillStyle = '#fff6d8';
              ctx.beginPath();
              ctx.arc(Math.cos(aa) * rr2, Math.sin(aa) * rr2 - p * 9, Math.max(1, 2.6 * it.scale * (1 - p)), 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.restore();
        } else if (it.type === 'giantStaff') {
          // 十丈金箍棒：放大 → 抡下来 → 压在身前
          const Wd = it.wid, L = it.len;
          const grow = easeOut(seg(p, 0, 0.16));
          const angAt = (q) => -1.2 + 2.92 * easeOut(seg(q, 0.16, 0.56));
          const alpha = p > 0.8 ? Math.max(0, 1 - (p - 0.8) / 0.2) : 1;
          ctx.save();
          ctx.translate(it.x, it.y);
          ctx.scale(it.dir, 1);
          // 抡下来的残影
          for (let g = 3; g >= 1; g--) {
            const q = p - g * 0.05;
            if (q < 0.16) continue;
            ctx.save();
            ctx.rotate(angAt(q));
            ctx.globalAlpha = alpha * (0.08 + 0.05 * (3 - g));
            drawGiantStaff(ctx, L, Wd * 0.9);
            ctx.restore();
          }
          ctx.rotate(angAt(p));
          ctx.globalAlpha = alpha;
          drawGiantStaff(ctx, L, Wd * (0.45 + 0.55 * grow));
          // 棒身外沿的金光（描一层亮边，压住暗背景）
          ctx.beginPath();
          ctx.rect(-Wd * 0.5, -L, Wd * 0.09, L);
          ctx.fillStyle = 'rgba(255,226,140,0.5)';
          ctx.fill();
          ctx.restore();
        } else if (it.type === 'cloud') {
          // 祥云：几团圆叠在一起，飘着散开
          const s = it.scale * (1 + (it.grow - 1) * p);
          if (s > 0) {
            ctx.save();
            ctx.translate(it.x, it.y);
            ctx.rotate(it.rot + it.spin * p);
            ctx.globalAlpha = A(0.92);
            ctx.fillStyle = it.color;
            const puffs = [[-10, 2, 8], [0, -4.5, 11], [10, 1.5, 8], [0, 5, 9]];
            for (let i = 0; i < puffs.length; i++) {
              circle(ctx, puffs[i][0] * s, puffs[i][1] * s, puffs[i][2] * s);
              ctx.fill();
            }
            // 云头亮边
            ctx.strokeStyle = 'rgba(255,214,150,0.55)';
            ctx.lineWidth = Math.max(0.8, 1.5 * s);
            ctx.beginPath();
            ctx.arc(0, -4.5 * s, 10.6 * s, Math.PI * 1.06, Math.PI * 1.94);
            ctx.stroke();
            ctx.restore();
          }
        } else if (it.type === 'ghost') {
          if (!XY.Art || !XY.Art.drawCharacter) continue;
          ctx.globalAlpha = A(0.42);
          XY.Art.drawCharacter(ctx, it.x, it.footY, it.scale, it.charId, it.pose);
        }
      }
      ctx.globalAlpha = 1;
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = XY;
})(typeof window !== 'undefined' ? window : globalThis);
