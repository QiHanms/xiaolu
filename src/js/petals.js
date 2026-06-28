/**
 * 花瓣管理模块（JS 驱动版）
 *
 * 使用 requestAnimationFrame 精确控制花瓣运动，
 * 解决 CSS 动画卡住不动的问题。
 * 运动完毕后自动移除 DOM 元素，防止堆积。
 */

const rand = (min, max) => Math.random() * (max - min) + min;

let active = false;
let petals = [];
let animId = null;
let container = null;

function createPetal(startInView = false) {
  if (!container || !document.body.contains(container)) return null;

  const el = document.createElement('div');
  el.className = 'petal';
  const size = rand(10, 20);
  const isPink = Math.random() > 0.5;

  const startY = startInView ? rand(0, 85) : rand(-15, -2);

  Object.assign(el.style, {
    left: `${rand(-5, 105)}vw`,
    top: `${startY}vh`,
    width: `${size}px`,
    height: `${size * 1.4}px`,
    background: isPink
      ? 'linear-gradient(135deg,#ff9a9e,#fad0c4)'
      : 'linear-gradient(135deg,#ffecd2,#fcb69f)',
    opacity: rand(0.35, 0.65),
    transform: `rotate(${rand(0, 360)}deg)`,
    willChange: 'transform',
  });

  container.appendChild(el);

  return {
    el,
    startY,
    dy: 0,                         // 累计垂直偏移（vh）
    speed: rand(0.035, 0.080),     // vh / 帧
    swayAmp: rand(15, 40),         // 水平摆动幅度（px）
    swaySpeed: rand(0.012, 0.028), // rad / 帧
    phase: rand(0, Math.PI * 2),
    rotation: rand(0, 360),
    rotSpeed: rand(0.8, 2.5),      // deg / 帧
    baseOpacity: parseFloat(el.style.opacity),
  };
}

function updatePetals() {
  if (!active) return;

  for (let i = petals.length - 1; i >= 0; i--) {
    const p = petals[i];

    // 垂直下落
    p.dy += p.speed;
    // 水平摆动
    p.phase += p.swaySpeed;
    const swayX = Math.sin(p.phase) * p.swayAmp;
    // 旋转
    p.rotation += p.rotSpeed;

    const totalY = p.startY + p.dy;

    // 接近底部时渐隐
    let opacity = p.baseOpacity;
    if (totalY > 80) {
      opacity *= Math.max(0, 1 - (totalY - 80) / 25);
    }

    p.el.style.transform = `translate(${swayX}px, ${p.dy}vh) rotate(${p.rotation}deg)`;
    p.el.style.opacity = opacity;

    // 完全离开视口后移除
    if (totalY > 110) {
      if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
      petals.splice(i, 1);
    }
  }

  // 保持花瓣数量（首屏多一些，之后维持 18-25）
  const target = petals.length < 5 ? 25 : 20;
  while (petals.length < target) {
    const p = createPetal(false);
    if (p) petals.push(p);
  }

  animId = requestAnimationFrame(updatePetals);
}

/** 启动花瓣飘落 */
export function startPetals(count = 20) {
  container = document.getElementById('petalsContainer');
  if (!container) return;

  // 先清除再启动
  stopPetals();
  active = true;

  // 首波：一半从空中各位置开始
  for (let i = 0; i < count / 2; i++) {
    const p = createPetal(true);
    if (p) petals.push(p);
  }
  // 另一半从顶部陆续出现
  for (let i = 0; i < count / 2; i++) {
    const p = createPetal(false);
    if (p) petals.push(p);
  }

  animId = requestAnimationFrame(updatePetals);
}

/** 停止并清除所有花瓣 */
export function stopPetals() {
  active = false;
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }
  container = document.getElementById('petalsContainer');
  if (container) container.innerHTML = '';
  petals = [];
}

/** 花瓣是否正在飘落 */
export function arePetalsActive() {
  return active;
}
