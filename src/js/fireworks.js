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
  }

  _pastelPool() {
    return [
      '#FFD8A8', '#FFC8A2', '#FFB5C2', '#FFDAC1',
      '#FAD0C4', '#FFE4B5', '#FFF5E6', '#E8D5B7',
      '#FFC9B6', '#FFDAB8', '#FCE4C8', '#F8E0D0',
    ];
  }

  _vibrantPool() {
    return [
      '#FF4444', '#FF6655', '#FF8844',
      '#FFD700', '#FFEE80',
      '#44DD66', '#66FF88',
      '#4488FF', '#66AAFF',
      '#FF66FF', '#FF88CC',
      '#44EEEE', '#88EEFF',
      '#FF9966', '#FFB3A0',
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
    if (!this.running) return;
    const delay = 600 + Math.random() * 900;
    this._timerId = setTimeout(() => {
      if (!this.running) return;
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

    this.launchers.push({
      x, y: h, targetY,
      speed,
      color,
      size: 0.8 + Math.random() * 0.6,
      explodeType: 'spherical',
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
    const count = 50 + Math.floor(Math.random() * 30);

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
    this._explodeSpherical(l);
  }

  /** 主循环 */
  _animate() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this._w, this._h);

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
