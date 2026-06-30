/**
 * 校园建筑 — 底部氛围画卷
 *
 * 用 Canvas 在页面底部绘制校园全景：
 *   - 升旗台（三根旗杆）+ 图书馆（三层，左侧）
 *   - 主体大殿 + 配楼 + 钟楼 + 旗杆
 *   - 食堂（右侧）+ 校门（右侧远）
 *   - 枫树（校道7棵，三角树冠）+ 松树 + 灌木丛 + 路灯（避开建筑）
 *   - 暖光窗户（随机亮灯）
 *   - 低透明度，作为背景氛围
 */

const rand = (min, max) => Math.random() * (max - min) + min;

export class CampusScene {
  constructor(canvas, onEasterEgg) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._w = 0;
    this._h = 200; // 固定高度
    this._seed = Math.random() * 1000; // 固定随机种子，稳定窗户状态
    this._treePositions = []; // 枫树位置，用于点击检测
    this._onEasterEgg = onEasterEgg; // 第7棵枫树彩蛋回调
    this._lastTheme = 'sunny';
    this._dpr = Math.min(window.devicePixelRatio || 1, 2);
    this._resizeTimer = null;
    this._resize();
    window.addEventListener('resize', () => {
      if (this._resizeTimer) cancelAnimationFrame(this._resizeTimer);
      this._resizeTimer = requestAnimationFrame(() => this._resize());
    });
    this.draw('sunny');
    this._setupClick();
  }

  /** 点击检测：第7棵枫树触发彩蛋 */
  _setupClick() {
    this.canvas.addEventListener('click', (e) => {
      if (this._treePositions.length < 7) return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const t = this._treePositions[6]; // 第7棵
      const dist = Math.hypot(mx - t.x, my - t.y);
      if (dist < 30 && this._onEasterEgg) {
        this._onEasterEgg(t.x, t.y);
      }
    });
  }

  _resize() {
    const w = window.innerWidth;
    this._w = w;
    this.canvas.width = w * this._dpr;
    this.canvas.height = this._h * this._dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = this._h + 'px';
    this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    this._seed = Math.random() * 1000;
    this.draw(this._lastTheme);
  }

  /** 伪随机（基于种子） */
  _srnd(offset) {
    return Math.abs(Math.sin(this._seed + offset * 137.508)) % 1;
  }

  /** 重绘（天气变化时调用） */
  draw(theme = 'sunny') {
    this._lastTheme = theme;
    const ctx = this.ctx;
    const w = this._w;
    const h = this._h;

    ctx.clearRect(0, 0, w, h);

    // 根据天气 + 日夜选择色调
    const isNight = document.body.classList.contains('night-mode');
    const isRainy = theme === 'rainy';
    const alpha = isNight ? 0.05 : (isRainy ? 0.07 : 0.10);

    ctx.globalAlpha = alpha;

    const cx = w / 2;      // 画面中心
    const groundY = h - 6; // 地面线

    // 颜色定义
    const buildingColor = isNight ? '#2a3040' : (isRainy ? '#4a4a55' : '#3a3a45');
    const roofColor    = isNight ? '#353d50' : (isRainy ? '#555568' : '#4a4a55');
    const accentColor  = isNight ? '#1a2030' : (isRainy ? '#3a3a48' : '#2a2a35');
    const treeColor    = isNight ? '#1a2030' : (isRainy ? '#353a38' : '#2a3035');
    const trunkColor   = isNight ? '#151820' : (isRainy ? '#2a2d28' : '#252825');
    const winWarmth    = isNight ? 'rgba(255,200,120,0.35)' : 'rgba(255,210,140,0.25)';
    const mapleColor   = isNight ? '#1a1020' : (isRainy ? '#4a2820' : '#8a3520');

    // ─── 远处建筑剪影（左右边缘——宿舍/图书馆） ───
    for (const dir of [-1, 1]) {
      const bx = cx + dir * (w * 0.44);
      const bw = 30 + this._srnd(dir * 7) * 25;
      const bh = 30 + this._srnd(dir * 13) * 25;
      ctx.fillStyle = accentColor;
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillRect(bx, groundY - bh, bw, bh);
      // 小窗户
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
          if (this._srnd(dir * 100 + row * 10 + col) > 0.35) {
            ctx.fillStyle = winWarmth;
            ctx.globalAlpha = alpha * 0.15;
            ctx.fillRect(bx + 4 + col * 12, groundY - bh + 5 + row * 9, 5, 4);
            ctx.fillStyle = accentColor;
          }
        }
      }
    }

    // ─── 升旗台（最左侧三根旗杆） ───
    {
      const fx = cx - w * 0.46;
      // 台基（加宽）
      ctx.fillStyle = accentColor;
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillRect(fx - 16, groundY - 5, 32, 5);
      // 三根旗杆（中高、左次、右次）
      const poles = [
        { off: -10, ht: 42 },  // 28 * 1.5
        { off: 0,   ht: 54 },  // 36 * 1.5
        { off: 10,  ht: 39 },  // 26 * 1.5
      ];
      ctx.globalAlpha = alpha * 0.6;
      for (const p of poles) {
        const px = fx + p.off;
        const topY = groundY - 5 - p.ht;
        // 旗杆（粗线 + 实心色）
        ctx.strokeStyle = isNight ? '#5a6878' : '#8898a8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px, groundY - 5);
        ctx.lineTo(px, topY);
        ctx.stroke();
        // 顶球装饰
        ctx.fillStyle = isNight ? '#6a7888' : '#98a8b8';
        ctx.fillRect(px - 1.5, topY - 3, 3, 3);
        // 旗帜（放大）
        ctx.fillStyle = isNight ? '#b08878' : '#c09880';
        ctx.fillRect(px + 2, topY + 2, 10, 7);
      }
    }

    // ─── 图书馆（左侧，增大一倍+三层细节） ───
    {
      const libW = 90, libH = 70;
      const libX = cx - w * 0.36 - libW / 2;
      const libY = groundY - libH;
      ctx.globalAlpha = alpha;
      // 主体
      ctx.fillStyle = buildingColor;
      ctx.fillRect(libX, libY, libW, libH);
      // 屋顶（带山墙）
      ctx.fillStyle = roofColor;
      ctx.fillRect(libX - 5, libY - 5, libW + 10, 7);
      ctx.beginPath();
      ctx.moveTo(libX + libW * 0.1, libY - 5);
      ctx.lineTo(libX + libW / 2, libY - 18);
      ctx.lineTo(libX + libW * 0.9, libY - 5);
      ctx.closePath();
      ctx.fill();
      // 屋顶装饰线
      ctx.fillRect(libX - 2, libY + 5, libW + 4, 1.5);
      // 山墙圆窗（装饰钟）
      ctx.fillStyle = isNight ? 'rgba(200,200,220,0.08)' : 'rgba(220,220,240,0.12)';
      ctx.beginPath();
      ctx.arc(libX + libW / 2, libY - 11, 4, 0, Math.PI * 2);
      ctx.fill();
      // 楼层分隔线（3层）
      const flY = [libY + libH * 0.30, libY + libH * 0.55];
      ctx.fillStyle = accentColor;
      for (const fy of flY) ctx.fillRect(libX + 5, fy, libW - 10, 1.5);
      // 第3层圆顶窗（3扇）
      ctx.fillStyle = winWarmth;
      for (let i = 0; i < 3; i++) {
        const wx = libX + 12 + i * 28, wy = libY + 7;
        ctx.globalAlpha = alpha * (0.3 + this._srnd(i * 7 + 50) * 0.5);
        ctx.beginPath(); ctx.arc(wx + 7, wy + 6, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(wx, wy + 5, 14, 8);
        ctx.globalAlpha = alpha;
      }
      // 第2层圆顶窗（3扇）
      for (let i = 0; i < 3; i++) {
        const wx = libX + 12 + i * 28, wy = libY + libH * 0.31 + 7;
        ctx.fillStyle = winWarmth;
        ctx.globalAlpha = alpha * (0.3 + this._srnd(i * 11 + 60) * 0.5);
        ctx.beginPath(); ctx.arc(wx + 7, wy + 6, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(wx, wy + 5, 14, 8);
        ctx.globalAlpha = alpha;
      }
      // 第1层长窗（2扇）
      for (let i = 0; i < 2; i++) {
        const wx = libX + 10 + i * 50, wy = libY + libH * 0.56 + 6;
        ctx.fillStyle = winWarmth;
        ctx.globalAlpha = alpha * (0.3 + this._srnd(i * 13 + 70) * 0.5);
        ctx.fillRect(wx, wy, 12, 18);
        ctx.globalAlpha = alpha;
      }
      // 入口（拱门+上方装饰）
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(libX + libW / 2, groundY - 22, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(libX + libW / 2 - 12, groundY - 22, 24, 22);
      // 拱门上方装饰
      ctx.fillStyle = roofColor;
      ctx.fillRect(libX + libW / 2 - 7, groundY - 30, 14, 3);
      // 台阶（3级）
      for (let s = 0; s < 3; s++) {
        ctx.fillRect(libX + libW / 2 - 14 - s * 2, groundY - 2 + s * 2, 28 + s * 4, 2);
      }
    }

    // ─── 亭子（左侧，图书馆与枫树之间） ───
    {
      const pvX = cx - w * 0.34;
      ctx.globalAlpha = alpha;
      // 亭柱（2根可见）
      ctx.fillStyle = buildingColor;
      ctx.fillRect(pvX - 4, groundY - 20, 2, 20);
      ctx.fillRect(pvX + 4, groundY - 20, 2, 20);
      // 横梁
      ctx.fillStyle = accentColor;
      ctx.fillRect(pvX - 6, groundY - 20, 14, 1.5);
      // 底座
      ctx.fillRect(pvX - 7, groundY - 3, 16, 3);
      // 尖顶（飞檐）
      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.moveTo(pvX - 12, groundY - 20);
      ctx.lineTo(pvX, groundY - 30);
      ctx.lineTo(pvX + 12, groundY - 20);
      ctx.closePath();
      ctx.fill();
      // 飞檐翘角（两侧上翘）
      ctx.beginPath();
      ctx.moveTo(pvX - 12, groundY - 20);
      ctx.lineTo(pvX - 14, groundY - 23);
      ctx.lineTo(pvX - 10, groundY - 21);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(pvX + 12, groundY - 20);
      ctx.lineTo(pvX + 14, groundY - 23);
      ctx.lineTo(pvX + 10, groundY - 21);
      ctx.closePath();
      ctx.fill();
      // 顶珠
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(pvX, groundY - 30, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // ─── 松树（左右各两棵） ───
    ctx.globalAlpha = alpha;
    this._drawTree(ctx, cx - w * 0.38, groundY, 1.0, treeColor, trunkColor);
    this._drawTree(ctx, cx - w * 0.32, groundY, 0.8, treeColor, trunkColor);
    this._drawTree(ctx, cx + w * 0.32, groundY, 0.9, treeColor, trunkColor);
    this._drawTree(ctx, cx + w * 0.38, groundY, 0.7, treeColor, trunkColor);

    // ─── 枫树（校道一排，7棵统一尺寸，避开建筑） ───
    ctx.globalAlpha = alpha;
    this._treePositions = [];
    for (let i = 0; i < 7; i++) {
      const pos = -0.29 + i * 0.03;
      const tx = cx + pos * w;
      this._treePositions.push({ x: tx, y: groundY });
      this._drawMaple(ctx, tx, groundY, 0.8, mapleColor, trunkColor);
    }

    // ─── 食堂（右侧，比图书馆小） ───
    {
      const cw = 48, ch = 36;
      const cx2 = cx + w * 0.26;
      const cy = groundY - ch;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = buildingColor;
      ctx.fillRect(cx2 - cw/2, cy, cw, ch);
      // 屋顶
      ctx.fillStyle = roofColor;
      ctx.fillRect(cx2 - cw/2 - 3, cy - 3, cw + 6, 5);
      // 大窗户（食堂风格，4扇）
      ctx.fillStyle = winWarmth;
      for (let i = 0; i < 4; i++) {
        const wx = cx2 - cw/2 + 4 + i * 11;
        const wy = cy + 7;
        ctx.globalAlpha = alpha * (0.3 + this._srnd(i * 9 + 80) * 0.5);
        ctx.fillRect(wx, wy, 8, 14);
        ctx.globalAlpha = alpha;
      }
      // 窗框横线
      ctx.fillStyle = isNight ? '#2a3050' : '#3a3a50';
      ctx.globalAlpha = alpha * 0.3;
      for (let i = 0; i < 4; i++) {
        const wx = cx2 - cw/2 + 4 + i * 11;
        ctx.fillRect(wx, cy + 13, 8, 1);
      }
      // 入口
      ctx.fillStyle = accentColor;
      ctx.fillRect(cx2 - 5, groundY - 14, 10, 14);
      // 入口雨棚
      ctx.fillStyle = roofColor;
      ctx.fillRect(cx2 - 8, groundY - 16, 16, 2);
    }

    // ─── 小型教学楼（右侧空位） ───
    {
      const tw2 = 30, th2 = 24;
      const tx2 = cx + w * 0.08;
      const ty2 = groundY - th2;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = buildingColor;
      ctx.fillRect(tx2 - tw2/2, ty2, tw2, th2);
      // 屋顶
      ctx.fillStyle = roofColor;
      ctx.fillRect(tx2 - tw2/2 - 2, ty2 - 2, tw2 + 4, 4);
      // 窗户（2扇）
      ctx.fillStyle = winWarmth;
      for (let i = 0; i < 2; i++) {
        const wx = tx2 - 8 + i * 14;
        const wy = ty2 + 5;
        ctx.globalAlpha = alpha * (0.3 + this._srnd(i * 15 + 90) * 0.5);
        ctx.fillRect(wx, wy, 8, 10);
        ctx.globalAlpha = alpha;
      }
      // 入口
      ctx.fillStyle = accentColor;
      ctx.fillRect(tx2 - 4, groundY - 10, 8, 10);
    }

    // ─── 体育馆（右侧，教学楼与食堂之间） ───
    {
      const gymW = 42, gymH = 32;
      const gymX = cx + w * 0.14;
      const gymY = groundY - gymH;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = buildingColor;
      ctx.fillRect(gymX - gymW/2, gymY, gymW, gymH);
      // 锯齿形屋顶（体育馆标志）
      ctx.fillStyle = roofColor;
      for (let i = 0; i < 5; i++) {
        const rx = gymX - gymW/2 - 2 + i * 10;
        ctx.beginPath();
        ctx.moveTo(rx, gymY);
        ctx.lineTo(rx + 5, gymY - 6);
        ctx.lineTo(rx + 10, gymY);
        ctx.closePath();
        ctx.fill();
      }
      // 大窗（2扇）
      ctx.fillStyle = winWarmth;
      for (let i = 0; i < 2; i++) {
        const wx = gymX - 10 + i * 18;
        const wy = gymY + 8;
        ctx.globalAlpha = alpha * (0.3 + this._srnd(i * 17 + 100) * 0.5);
        ctx.fillRect(wx, wy, 12, 14);
        ctx.globalAlpha = alpha;
      }
      // 入口
      ctx.fillStyle = accentColor;
      ctx.fillRect(gymX - 4, groundY - 12, 8, 12);
    }

    // ─── 校门（右侧拱门） ───
    {
      const gx = cx + w * 0.35;
      const gw = 36, gh = 48;
      const pw = 4; // pillar width
      ctx.globalAlpha = alpha;
      // 门柱
      ctx.fillStyle = buildingColor;
      ctx.fillRect(gx - gw / 2, groundY - gh, pw, gh);
      ctx.fillRect(gx + gw / 2 - pw, groundY - gh, pw, gh);
      // 柱顶装饰球
      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.arc(gx - gw / 2 + 2, groundY - gh - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gx + gw / 2 - 2, groundY - gh - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      // 拱顶
      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.arc(gx, groundY - gh, gw / 2, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      // 拱顶装饰
      ctx.fillStyle = roofColor;
      ctx.fillRect(gx - 2, groundY - gh - 3, 4, 4);
      // 门内暗影
      ctx.fillStyle = accentColor;
      ctx.fillRect(gx - 10, groundY - 18, 20, 18);
    }

    // ─── 灌木丛（沿地面散布） ───
    ctx.fillStyle = treeColor;
    for (let i = 0; i < 8; i++) {
      const bx = cx + (i - 3.5) * w * 0.065;
      const br = 3 + this._srnd(i * 17) * 5;
      ctx.globalAlpha = alpha * (0.2 + this._srnd(i * 31) * 0.2);
      ctx.beginPath();
      ctx.arc(bx, groundY - 1, br, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = alpha;

    // ─── 主楼 ───
    const mw = Math.min(w * 0.32, 260);
    const mh = h * 0.55;
    const mx = cx - mw / 2;
    const my = groundY - mh;

    ctx.fillStyle = buildingColor;
    ctx.fillRect(mx, my, mw, mh);

    // 屋顶
    ctx.fillStyle = roofColor;
    ctx.fillRect(mx - 6, my - 4, mw + 12, 6);
    ctx.beginPath();
    ctx.arc(cx, my - 2, 8, Math.PI, 0);
    ctx.fillStyle = roofColor;
    ctx.fill();
    // 屋顶尖顶装饰
    ctx.fillStyle = roofColor;
    ctx.fillRect(cx - 1.5, my - 14, 3, 6);
    ctx.beginPath();
    ctx.arc(cx, my - 14, 4, Math.PI, 0);
    ctx.fill();
    // 建筑腰线
    ctx.fillStyle = accentColor;
    ctx.fillRect(mx + 10, my + mh * 0.4, mw - 20, 1.5);

    // ─── 钟楼 ───
    const tw = 18, th = 30;
    const tx = cx - tw / 2;
    const ty = my - th - 2;
    ctx.fillStyle = roofColor;
    ctx.fillRect(tx, ty, tw, th);
    // 钟楼尖顶
    ctx.beginPath();
    ctx.moveTo(cx - tw / 2 - 2, ty);
    ctx.lineTo(cx, ty - 10);
    ctx.lineTo(cx + tw / 2 + 2, ty);
    ctx.closePath();
    ctx.fill();
    // 钟面
    ctx.fillStyle = 'rgba(255,250,235,0.25)';
    ctx.beginPath();
    ctx.arc(cx, ty + th * 0.45, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // ─── 旗杆 ───
    ctx.strokeStyle = isNight ? 'rgba(180,180,200,0.15)' : 'rgba(200,200,210,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, ty - 10);
    ctx.lineTo(cx, ty - 22);
    ctx.stroke();
    // 旗帜
    ctx.fillStyle = isNight ? 'rgba(255,180,180,0.12)' : 'rgba(255,200,200,0.18)';
    ctx.fillRect(cx + 1, ty - 20, 10, 6);

    // 主楼入口（拱门）
    const doorW = 24, doorH = 30;
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(cx, groundY - doorH + doorW / 2, doorW / 2, Math.PI, 0);
    ctx.fillRect(cx - doorW / 2, groundY - doorH + doorW / 2, doorW, doorH - doorW / 2);

    // 柱子（四根）
    ctx.fillStyle = roofColor;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(mx + mw * (0.15 + i * 0.23), my + 10, 4, mh - 10);
    }

    // ─── 侧楼（左右对称） ───
    const sw = Math.min(w * 0.18, 140);
    const sh = h * 0.40;
    for (const dir of [-1, 1]) {
      const sx = cx + dir * (mw / 2 + 8);
      const sy = groundY - sh;
      ctx.fillStyle = buildingColor;
      ctx.fillRect(sx, sy, sw, sh);
      // 侧楼屋顶
      ctx.fillStyle = roofColor;
      ctx.fillRect(sx - 3, sy - 3, sw + 6, 5);
      ctx.fillStyle = roofColor;
      ctx.fillRect(sx + 2, sy + 2, sw - 4, 1.5);
      // 腰线
      ctx.fillStyle = accentColor;
      ctx.fillRect(sx + 5, sy + sh * 0.5, sw - 10, 1.5);
    }

    // ─── 窗户（暖光，稳定亮灯模式） ───
    // 主楼窗户（3 列 × 4 行）
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        const wx = mx + mw * (0.22 + col * 0.28);
        const wy = my + 20 + row * (mh - 40) / 4;
        if (this._srnd(row * 100 + col * 10) > 0.35) {
          ctx.fillStyle = winWarmth;
          ctx.globalAlpha = alpha * (0.4 + this._srnd(row * 10 + col) * 0.6);
          ctx.fillRect(wx, wy, 10, 8);
          ctx.globalAlpha = alpha;
        }
      }
    }

    // 侧楼窗户
    for (const dir of [-1, 1]) {
      const sx = cx + dir * (mw / 2 + 8);
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
          const wx = sx + 15 + col * 40;
          const wy = groundY - sh + 15 + row * (sh - 30) / 3;
          if (this._srnd(dir * 200 + row * 10 + col) > 0.35) {
            ctx.fillStyle = winWarmth;
            ctx.globalAlpha = alpha * (0.3 + this._srnd(dir * 50 + row + col) * 0.7);
            ctx.fillRect(wx, wy, 10, 8);
            ctx.globalAlpha = alpha;
          }
        }
      }
    }

    // ─── 路灯（左右共四盏，避开建筑和树木） ───
    const lampPositions = [
      cx - w * 0.42,   // 左侧远距，空旷天空
      cx - w * 0.065,  // 枫树与主楼之间
      cx + w * 0.18,   // 教学楼与食堂之间
      cx + w * 0.42,   // 右侧远距，空旷天空
    ];
    for (const lx of lampPositions) {
      const baseY = groundY;
      const poleH = 38;
      const topY = baseY - poleH;
      // 圆柱灯柱
      ctx.fillStyle = isNight ? '#3a4055' : '#5a6075';
      ctx.fillRect(lx - 1.2, topY + 6, 2.5, poleH - 6);
      // 圆形灯头
      ctx.fillStyle = isNight ? '#c8c8d8' : '#e0e0f0';
      ctx.beginPath();
      ctx.arc(lx, topY + 3, 4, 0, Math.PI * 2);
      ctx.fill();
      // 夜晚灯光
      if (isNight) {
        ctx.globalAlpha = 0.10;
        ctx.fillStyle = '#FFE8B0';
        ctx.beginPath();
        ctx.arc(lx, topY + 3, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.04;
        ctx.beginPath();
        ctx.arc(lx, topY + 3, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha;
      }
    }

    // ─── 风筝剪影（天空） ───
    {
      ctx.globalAlpha = alpha * 0.6;
      const kiteColor = isNight ? '#6a7888' : (isRainy ? '#7a7a88' : '#8a8a98');
      for (let i = 0; i < 3; i++) {
        const kx = cx + (i - 1) * w * 0.12;
        const ky = 30 + this._srnd(i * 37) * 60;
        const ks = 0.7 + this._srnd(i * 53) * 0.3;
        // 菱形风筝
        ctx.fillStyle = kiteColor;
        ctx.beginPath();
        ctx.moveTo(kx, ky - 8 * ks);
        ctx.lineTo(kx + 7 * ks, ky);
        ctx.lineTo(kx, ky + 8 * ks);
        ctx.lineTo(kx - 7 * ks, ky);
        ctx.closePath();
        ctx.fill();
        // 飘带尾巴（两条）
        ctx.strokeStyle = kiteColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(kx - 1, ky + 8 * ks);
        ctx.quadraticCurveTo(kx + 4 * ks, ky + 18 * ks, kx - 3 * ks, ky + 28 * ks);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(kx + 1, ky + 8 * ks);
        ctx.quadraticCurveTo(kx + 7 * ks, ky + 20 * ks, kx + 2 * ks, ky + 32 * ks);
        ctx.stroke();
        // 风筝线
        ctx.strokeStyle = isNight ? 'rgba(200,200,220,0.06)' : 'rgba(200,200,210,0.08)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(kx, ky + 8 * ks);
        ctx.lineTo(kx + (this._srnd(i * 71) * 10 - 5), groundY);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
  }

  /** 绘制松树 */
  _drawTree(ctx, x, groundY, scale, treeColor, trunkColor) {
    ctx.fillStyle = treeColor;
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x - 8 * scale, groundY - 35 * scale);
    ctx.lineTo(x - 2 * scale, groundY - 30 * scale);
    ctx.lineTo(x - 6 * scale, groundY - 55 * scale);
    ctx.lineTo(x, groundY - 50 * scale);
    ctx.lineTo(x + 6 * scale, groundY - 55 * scale);
    ctx.lineTo(x + 2 * scale, groundY - 30 * scale);
    ctx.lineTo(x + 8 * scale, groundY - 35 * scale);
    ctx.closePath();
    ctx.fill();

    // 树干
    ctx.fillStyle = trunkColor;
    ctx.fillRect(x - 1.5 * scale, groundY - 5 * scale, 3 * scale, 5 * scale);
  }

  /** 绘制枫树（三角形层叠树冠） */
  _drawMaple(ctx, x, groundY, scale, color, trunkColor) {
    ctx.fillStyle = color;
    const s = scale;
    // 底层（大三角形，底边在下、尖顶在上）
    ctx.beginPath();
    ctx.moveTo(x - 14 * s, groundY - 6 * s);
    ctx.lineTo(x + 14 * s, groundY - 6 * s);
    ctx.lineTo(x, groundY - 26 * s);
    ctx.closePath();
    ctx.fill();
    // 中层
    ctx.beginPath();
    ctx.moveTo(x - 10 * s, groundY - 20 * s);
    ctx.lineTo(x + 10 * s, groundY - 20 * s);
    ctx.lineTo(x, groundY - 36 * s);
    ctx.closePath();
    ctx.fill();
    // 顶层（小三角形）
    ctx.beginPath();
    ctx.moveTo(x - 5 * s, groundY - 30 * s);
    ctx.lineTo(x + 5 * s, groundY - 30 * s);
    ctx.lineTo(x, groundY - 46 * s);
    ctx.closePath();
    ctx.fill();
    // 树干
    ctx.fillStyle = trunkColor;
    ctx.fillRect(x - 1.5 * s, groundY - 8 * s, 3 * s, 8 * s);
  }

}
