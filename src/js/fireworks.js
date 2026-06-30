/**
 * 烟花系统 · 简约版
 *
 * 卡顿修复：
 *   1. 彻底移除 shadowBlur
 *   2. 改用 alpha 叠层模拟发光
 *   3. DPR 上限 2
 *
 * 特性：
 *   - 统一球形爆炸，无特殊类型
 *   - 15% 粒子带有二次爆炸
 *   - 上升段保留头部三层光晕
 */

const rand = (min, max) => Math.random() * (max - min) + min;

export class FireworkSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.launchers = [];
    this.particles = [];
    this.running = false;
    this._loopId = null;
    this._timerId = null;
    this._w = 0;
    this._h = 0;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._w = w;
      this._h = h;
    };
    window.addEventListener('resize', resize);
    resize();

    // 切到后台时暂停，回来时清空堆积
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._paused = true;
        if (this._timerId) { clearTimeout(this._timerId); this._timerId = null; }
      } else {
        this._paused = false;
        // 清空堆积的发射器和粒子，避免卡顿
        this.launchers = [];
        this.particles = [];
        this.ctx.clearRect(0, 0, this._w, this._h);
        // 重新调度
        if (this.running) this._scheduleNext();
      }
    });
  }

  _pastelPool() {
    return [
      '#FFE4C4', '#FFD8B0', '#FFD0A8', '#FFC8B0',
      '#FFDAC5', '#FFE8C8', '#FFF0D8', '#F5E0C8',
      '#FFD5B8', '#FFE0C0', '#FFEAD4', '#FCE4CC',
    ];
  }

  _vibrantPool() {
    return [
      '#FF4444', '#FF6655', '#FF8844',
      '#FFD700', '#FFEE80',
      '#FFAA44', '#FFCC66',
      '#FF9966', '#FFB380',
      '#FF7799', '#FF99AA',
      '#FFCC99', '#FFDDBB',
      '#FF8C66', '#FFB3A0',
    ];
  }

  _randColor(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  startLoop() {
    if (this.running) return;
    this.running = true;
    this._animate();
    this._scheduleNext();
  }

  stopLoop() {
    this.running = false;
    if (this._timerId) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }
  }

  clear() {
    this.launchers = [];
    this.particles = [];
    this.ctx.clearRect(0, 0, this._w, this._h);
  }

  stop() {
    this.stopLoop();
    this.clear();
    if (this._loopId) {
      cancelAnimationFrame(this._loopId);
      this._loopId = null;
    }
  }

  _scheduleNext() {
    if (!this.running || this._paused) return;
    // 频率再减少八分之一（原 600~1500ms → 771~1928ms）
    const delay = (600 + Math.random() * 900) * 64 / 49;
    this._timerId = setTimeout(() => {
      if (!this.running || this._paused) return;
      this._launch();
      this._scheduleNext();
    }, delay);
  }

  /** 发射—彗星式上升 */
  _launch() {
    const w = this._w;
    const h = this._h;
    const x = w * 0.12 + Math.random() * w * 0.76;
    const targetY = Math.random() * (h / 3) + h * 0.02;
    const color = this._randColor(this._pastelPool());
    const speed = 3.5 + Math.random() * 1.2;

    // 5.20% 心形 | 其余球形
    const explodeType = Math.random() * 100 < 5.20 ? 'heart' : 'spherical';

    this.launchers.push({
      x, y: h, targetY,
      speed,
      color,
      size: (0.8 + Math.random() * 0.6) * 0.8,
      explodeType,
      palette: this._vibrantPool().sort(() => Math.random() - 0.5).slice(0, 3),
    });
  }

  /* ================================================================
     爆炸类型
     ================================================================ */

  /** 球形爆炸（多色混合） */
  _explodeSpherical(l) {
    const { x, y } = l;
    const colors = l.palette;
    const count = Math.floor(50 + Math.random() * 30);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 1.6;
      const p = this._mkParticle(x, y, angle, speed, colors,
        0.006 + Math.random() * 0.009,
        0.010 + Math.random() * 0.012);
      // 15% 二次爆炸
      if (Math.random() < 0.15) {
        p._secondaryTimer = 0.3 + Math.random() * 0.3;
        p._secondaryColor = colors[Math.floor(Math.random() * colors.length)];
      }
      this.particles.push(p);
    }
  }

  /** 心形爆炸（金色暖调，持久闪烁） */
  _explodeHeart(l) {
    const { x, y } = l;
    const colors = ['#FFD700', '#FFEE80', '#FFC107', '#FFB300', '#FF6F00', '#FF4444', '#FF7799'];
    // 主心形轮廓 — 更密采样
    for (let i = 0; i < 80; i++) {
      const t = (i / 80) * Math.PI * 2;
      const scale = 7 + Math.random() * 2.5;
      const hx = 16 * Math.pow(Math.sin(t), 3) * scale * 0.55;
      const hy = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * scale * 0.55;
      const angle = Math.atan2(-hy, hx) + (Math.random() - 0.5) * 0.25;
      const speed = Math.hypot(hx, hy) * 0.035 + Math.random() * 0.25;
      const p = this._mkParticle(x, y, angle, speed, colors,
        0.004 + Math.random() * 0.004,  // 更慢衰减
        0.005 + Math.random() * 0.004);
      p.size = 1.2 + Math.random() * 1.0;
      // 金色闪烁高光标记
      if (Math.random() < 0.3) p._shimmer = true;
      this.particles.push(p);
    }
    // 内部填充粒子（金色散落）
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.8;
      const p = this._mkParticle(x, y, angle, speed, colors,
        0.005 + Math.random() * 0.005,
        0.006 + Math.random() * 0.004);
      p.size = 0.8 + Math.random() * 0.7;
      if (Math.random() < 0.2) p._shimmer = true;
      this.particles.push(p);
    }
  }


  /** 创建粒子 */
  _mkParticle(x, y, angle, speed, colors, decay, gravity) {
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay,
      size: 0.7 + Math.random() * 1.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity,
    };
  }

  /** 爆炸分发 */
  _explode(l) {
    if (l.explodeType === 'heart') {
      this._explodeHeart(l);
    } else {
      this._explodeSpherical(l);
    }
  }

  /** 主循环 */
  _animate() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this._w, this._h);
    this._shimmerT = (this._shimmerT || 0) + 0.05;

    /* ================================================================
       上升弹 — 头部光晕
       ================================================================ */
    for (let i = this.launchers.length - 1; i >= 0; i--) {
      const l = this.launchers[i];
      l.y -= l.speed;
      l.speed *= 0.998;

      // 头部光晕（三层）
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.size * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.size * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.size * 0.6, 0, Math.PI * 2);
      ctx.fill();

      if (l.y <= l.targetY) {
        this._explode(l);
        this.launchers.splice(i, 1);
      }
    }

    /* ================================================================
       爆炸粒子
       ================================================================ */
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.99;
      p.life -= p.decay;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // 二次爆炸
      if (p._secondaryTimer && p.life < p._secondaryTimer && !p._burst) {
        p._burst = true;
        this._miniBurst(p);
      }

      const alpha = p.life;

      // 发光层
      ctx.globalAlpha = alpha * 0.12;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fill();

      // 心形粒子金色闪烁高光
      if (p._shimmer) {
        const shimmer = 0.5 + 0.5 * Math.sin(this._shimmerT || 0);
        ctx.globalAlpha = alpha * shimmer * 0.35;
        ctx.fillStyle = '#FFF8E0';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 本体
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
      ctx.fill();

      // 高光
      if (p.size > 0.9 && alpha > 0.4) {
        ctx.globalAlpha = alpha * 0.20;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x - 0.5, p.y - 0.5, p.size * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;

    if (this.running || this.launchers.length > 0 ||
        this.particles.length > 0) {
      this._loopId = requestAnimationFrame(() => this._animate());
    } else {
      this._loopId = null;
    }
  }

  /** 二次小爆 */
  _miniBurst(p) {
    const count = 6 + Math.floor(Math.random() * 6);
    for (let j = 0; j < count; j++) {
      const a = Math.random() * Math.PI * 2;
      const s = 0.3 + Math.random() * 0.5;
      this.particles.push({
        x: p.x, y: p.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 1,
        decay: 0.015 + Math.random() * 0.015,
        size: 0.3 + Math.random() * 0.5,
        color: p._secondaryColor || '#FFD700',
        gravity: 0.006,
      });
    }
  }
}
