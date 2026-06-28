/**
 * 画布渲染引擎（轻量版）
 *
 * 职责：
 *   1) 静态噪点纹理（半透明叠层）
 *   2) 雨滴效果 ← weather rainy
 *   3) 金色光斑 ← weather sunny
 *   4) 纸飞机 / 学位帽 拖尾粒子
 *
 * 3D 粒子系统已移至 particles3d.js
 */

const rand = (min, max) => Math.random() * (max - min) + min;

/* ---- 噪声生成（半尺寸 + pixelated） ---- */
function generateNoise(canvas) {
  const scale = 3;
  const w = Math.ceil(innerWidth / scale);
  const h = Math.ceil(innerHeight / scale);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rand(0, 255) | 0;
    img.data[i] = v; img.data[i + 1] = v;
    img.data[i + 2] = v; img.data[i + 3] = 28;
  }
  ctx.putImageData(img, 0, 0);
}

/* ================================================================
   CanvasController
   ================================================================ */

export default class CanvasController {
  /**
   * @param {HTMLCanvasElement} canvas    主画布（雨滴/光斑/拖尾）
   * @param {HTMLCanvasElement} noiseEl   噪点画布
   */
  constructor(canvas, noiseEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.noiseEl = noiseEl;
    this.rainEnabled = false;
    this.spotsEnabled = false;
    this.rainDrops = [];
    this.lightSpots = [];
    this.stars = [];
    this.starsEnabled = false;
    this.shootingStars = [];
    this._lastSSCheck = 0;
    this.sunEnabled = false;
    this.trailParticles = [];
    this.time = 0;
    this.animFrame = null;
    this._resize();
    addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.canvas.width = innerWidth;
    this.canvas.height = innerHeight;
    generateNoise(this.noiseEl);
    this._initStars(80);
  }

  /* ================================================================
      启动 / 停止
     ================================================================ */

  start() {
    this._initRain(150);
    this._initSpots(18);
    this._initStars(80);
    const loop = (ts) => { this.time = ts; this._update(); this._draw(); this.animFrame = requestAnimationFrame(loop); };
    this.animFrame = requestAnimationFrame(loop);
  }

  stop() { if (this.animFrame) cancelAnimationFrame(this.animFrame); }

  /* ================================================================
      天气联动
     ================================================================ */

  setWeather(condition) {
    this.rainEnabled = condition !== 'sunny';
    this.spotsEnabled = condition === 'sunny';
  }

  setRainIntensity(level = 2) {
    if (!this.rainEnabled) { this.rainDrops = []; return; }
    if (level <= 0) { this.rainDrops = []; return; }
    let count, speedM, sizeM;
    if (level === 1) { count = 60;  speedM = 0.6; sizeM = 0.6; }
    else if (level === 2) { count = 150; speedM = 1.0; sizeM = 1.0; }
    else { count = 250; speedM = 1.5; sizeM = 1.4; }
    this.rainDrops = Array.from({ length: count }, () => ({
      x: rand(0, this.canvas.width), y: rand(-this.canvas.height, 0),
      len: rand(6 * sizeM, 14 * sizeM),
      speed: rand(3 * speedM, 7 * speedM),
      t: rand(0.3 * sizeM, 0.7 * sizeM),
      o: rand(0.12, 0.28),
      angle: rand(-0.35, -0.10)
    }));
  }

  /* ================================================================
      拖尾
     ================================================================ */

  trackElement(elId, rate = 2) {
    const el = document.getElementById(elId);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    for (let i = 0; i < rate; i++) {
      this.trailParticles.push({
        x: cx + rand(-6, 6), y: cy + rand(-6, 6),
        vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4),
        size: rand(2, 5), opacity: rand(0.5, 0.9),
        color: elId === 'paperPlane'
          ? `hsla(48, 100%, 80%, 1)` : `hsla(45, 100%, 85%, 1)`
      });
    }
    if (this.trailParticles.length > 400) this.trailParticles.splice(0, this.trailParticles.length - 400);
  }

  /* ================================================================
      雨滴
     ================================================================ */

  _initRain(count) {
    this.rainDrops = Array.from({ length: count }, () => ({
      x: rand(0, this.canvas.width), y: rand(-this.canvas.height, 0),
      len: rand(6, 14), speed: rand(3, 7),
      t: rand(0.3, 0.7), o: rand(0.12, 0.28),
      angle: rand(-0.35, -0.10)    // 随机飘向角度（负值 = 左倾）
    }));
  }

  _updateRain() {
    if (!this.rainEnabled) return;
    for (const d of this.rainDrops) {
      d.y += d.speed;
      d.x += d.speed * d.angle;                 // 角度影响水平偏移
      if (d.y > this.canvas.height + 20) {
        d.y = -d.len - 10;
        d.x = rand(0, this.canvas.width);
        d.angle = rand(-0.35, -0.10);            // 换位时重新随机角度
      }
      if (d.x < -20) d.x = this.canvas.width + 20;
    }
  }

  _drawRain() {
    if (!this.rainEnabled) return;
    const ctx = this.ctx;
    // 批量绘制：先统一设 alpha，避免反复读写 globalAlpha
    ctx.globalAlpha = 1;
    for (const d of this.rainDrops) {
      const lx = d.x + d.len * d.angle * 0.4;   // 线末端水平偏移（跟随角度）
      const ly = d.y - d.len;                     // 线末端垂直偏移

      // 外层柔光
      ctx.strokeStyle = `rgba(210,225,250,${d.o * 0.35 * 0.15})`;
      ctx.lineWidth = d.t * 2.5;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(lx, ly);
      ctx.stroke();

      // 核心亮线
      ctx.strokeStyle = `rgba(220,235,255,${d.o * 0.85})`;
      ctx.lineWidth = d.t;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(lx, ly);
      ctx.stroke();
    }
  }

  /* ================================================================
      光斑（晴天）
     ================================================================ */

  _initSpots(count) {
    this.lightSpots = Array.from({ length: count }, () => ({
      x: rand(0, this.canvas.width), y: rand(0, this.canvas.height),
      vx: rand(-0.15, 0.15), vy: rand(-0.15, 0.15),
      radius: rand(20, 50), baseO: rand(0.04, 0.1), phase: rand(0, Math.PI * 2)
    }));
  }

  /* ================================================================
      星星（夜间闪烁）
     ================================================================ */

  _initStars(count) {
    this.stars = Array.from({ length: count }, () => ({
      x: rand(0, this.canvas.width),
      y: rand(0, this.canvas.height),
      size: rand(0.3, 1.2),
      baseAlpha: rand(0.3, 0.8),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.15, 1.0),
      warm: Math.random() < 0.3   // 30% 暖白，70% 冷白
    }));
  }

  _updateSpots() {
    if (!this.spotsEnabled) return;
    const t = this.time * 0.001;
    for (const s of this.lightSpots) {
      s.x += s.vx; s.y += s.vy;
      s.curO = s.baseO * (0.5 + 0.5 * Math.sin(t + s.phase));
      if (s.x < -s.radius) s.x = this.canvas.width + s.radius;
      if (s.x > this.canvas.width + s.radius) s.x = -s.radius;
      if (s.y < -s.radius) s.y = this.canvas.height + s.radius;
      if (s.y > this.canvas.height + s.radius) s.y = -s.radius;
    }
  }

  _drawSpots() {
    if (!this.spotsEnabled) return;
    const ctx = this.ctx;
    for (const s of this.lightSpots) {
      if (!s.curO || s.curO < 0.01) continue;
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
      g.addColorStop(0, `rgba(255,248,210,${s.curO})`);
      g.addColorStop(0.4, `rgba(255,248,210,${s.curO * 0.5})`);
      g.addColorStop(1, 'rgba(255,248,210,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ================================================================
      星星（夜间闪烁）
     ================================================================ */

  _drawStars() {
    if (!this.starsEnabled) return;
    const ctx = this.ctx;
    const t = this.time * 0.001;

    // 先画较大的星星（带光晕），再画小星星
    const sorted = [...this.stars].sort((a, b) => a.size - b.size);
    for (const s of sorted) {
      // 非对称呼吸：sine² 在 0~1 之间，闪亮时长更短更锐利
      const wave = Math.sin(t * s.speed * Math.PI + s.phase);
      const breathe = wave * wave; // 0 → 1 → 0
      const alpha = s.baseAlpha * (0.1 + 0.9 * breathe);
      if (alpha < 0.02) continue;
      ctx.globalAlpha = alpha;

      // 冷暖色调
      ctx.fillStyle = s.warm ? '#FFE8D0' : '#E0EEFF';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();

      // 大一点的星星带微光晕
      if (s.size > 0.7 && alpha > 0.25) {
        ctx.globalAlpha = alpha * 0.10;
        ctx.fillStyle = s.warm ? '#FFE8D0' : '#D0E4FF';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ================================================================
      流星（晴天夜晚，20% 概率 / 秒）
     ================================================================ */

  _updateShootingStars() {
    // 只在星星启用时（night + sunny）检查生成
    if (this.starsEnabled) {
      if (this._lastSSCheck === 0) this._lastSSCheck = this.time;
      if (this.time - this._lastSSCheck >= 1000) {
        this._lastSSCheck = this.time;
        if (Math.random() < 0.2) this._spawnShootingStar();
      }
    }
    // 更新已有流星
    this.shootingStars = this.shootingStars.filter(s => {
      s.x += s.vx;
      s.y += s.vy;
      s.life -= 1;
      s.opacity = Math.max(0, s.life / s.maxLife);
      return s.life > 0;
    });
  }

  _spawnShootingStar() {
    const angle = rand(0.35, 0.8);   // 与水平夹角 ~20°~46°
    const speed = rand(22, 38);      // 像素/帧（更快）
    const maxLife = rand(26, 44);    // 帧数
    this.shootingStars.push({
      x: rand(this.canvas.width * 0.5, this.canvas.width),  // 从右侧天空出现
      y: rand(0, this.canvas.height * 0.28),
      vx: -Math.cos(angle) * speed,  // 向左坠落
      vy: Math.sin(angle) * speed,   // 向下
      life: maxLife,
      maxLife,
      length: rand(180, 350),        // 更长的尾迹
      opacity: 1
    });
  }

  _drawShootingStars() {
    if (!this.shootingStars.length) return;
    const ctx = this.ctx;
    for (const s of this.shootingStars) {
      const tailLen = s.length * (s.life / s.maxLife);
      const norm = Math.sqrt(s.vx * s.vx + s.vy * s.vy) || 1;
      const nx = s.vx / norm;
      const ny = s.vy / norm;
      const tx = s.x - nx * tailLen;
      const ty = s.y - ny * tailLen;

      // 外层柔光晕
      ctx.strokeStyle = `rgba(200,220,255,${s.opacity * 0.12})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      // 尾迹渐变（头亮尾淡）
      const grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
      grad.addColorStop(0, `rgba(255,255,255,${s.opacity})`);
      grad.addColorStop(0.25, `rgba(255,248,230,${s.opacity * 0.55})`);
      grad.addColorStop(1, 'rgba(255,248,230,0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      // 流星头部亮点
      ctx.fillStyle = `rgba(255,255,255,${s.opacity * 0.9})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ================================================================
      拖尾更新 & 绘制
     ================================================================ */

  _updateTrails() {
    this.trailParticles = this.trailParticles.filter(p => {
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.96; p.vy *= 0.96;
      p.opacity -= 0.025; p.size *= 0.99;
      return p.opacity > 0;
    });
  }

  _drawTrails() {
    const ctx = this.ctx;
    for (const p of this.trailParticles) {
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = p.opacity * 0.3;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ================================================================
      主循环
     ================================================================ */

  _update() {
    if (this.rainEnabled) this._updateRain();
    if (this.spotsEnabled) this._updateSpots();
    this._updateTrails();
    this._updateShootingStars();
  }

  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.sunEnabled) this._drawSun();
    this._drawRain();
    this._drawStars();
    this._drawShootingStars();
    if (this.starsEnabled) this._drawMoon();
    this._drawSpots();
    this._drawTrails();
  }

  /** 晴日暖阳—可见太阳 + 旋转光线 */
  _drawSun() {
    const ctx = this.ctx;
    const cx = this.canvas.width - 90;
    const cy = 75;
    const t = this.time * 0.0004;

    // 外层大柔光
    const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 130);
    g1.addColorStop(0, 'rgba(255,248,210,0.10)');
    g1.addColorStop(0.4, 'rgba(255,240,190,0.05)');
    g1.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = g1;
    ctx.beginPath(); ctx.arc(cx, cy, 130, 0, Math.PI * 2); ctx.fill();

    // 旋转光线（12条）
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t);
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const len = 38 + Math.sin(t * 0.7 + i) * 6;
      ctx.globalAlpha = 0.06 + Math.sin(t * 0.5 + i * 2) * 0.02;
      ctx.strokeStyle = '#FFE8B0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * 18, Math.sin(ang) * 18);
      ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
      ctx.stroke();
    }
    ctx.restore();

    // 中层暖晕
    const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28);
    g2.addColorStop(0, 'rgba(255,252,235,0.30)');
    g2.addColorStop(0.5, 'rgba(255,245,210,0.15)');
    g2.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fill();

    // 核心发光球
    ctx.globalAlpha = 0.50;
    ctx.fillStyle = '#FFF8E0';
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** 夜晚新月 */
  _drawMoon() {
    const ctx = this.ctx;
    const cx = 110;
    const cy = 65;
    const r = 28;

    // 外层柔光
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 65);
    g.addColorStop(0, 'rgba(255,250,235,0.12)');
    g.addColorStop(0.4, 'rgba(255,250,235,0.06)');
    g.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 65, 0, Math.PI * 2);
    ctx.fill();

    // 月牙：画圆后用 destination-out 裁掉偏移圆
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,248,230,0.50)';
    ctx.fill();

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx + 10, cy - 4, r - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 月牙外侧边缘高光
    ctx.save();
    ctx.globalAlpha = 0.15;
    const eg = ctx.createRadialGradient(cx - 2, cy - 2, r * 0.6, cx - 2, cy - 2, r + 4);
    eg.addColorStop(0, 'rgba(255,252,240,0)');
    eg.addColorStop(0.75, 'rgba(255,252,240,0)');
    eg.addColorStop(0.92, 'rgba(255,252,240,0.15)');
    eg.addColorStop(1, 'rgba(255,252,240,0)');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 2, r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = 1;
  }
}
