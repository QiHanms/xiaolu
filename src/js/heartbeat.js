/**
 * 无声心跳律动
 * 使用 Math.sin 产生微弱的呼吸式缩放 (±0.5%)
 * 让文字和数字呈现生命感
 *
 * 多个元素分不同相位避免同步僵硬
 */

let running = false;
let rafId = null;

/**
 * 开始心跳
 * @param  {...(HTMLElement|null)} elements  需要脉动的元素
 * @returns {() => void}  stop 函数
 */
export function startHeartbeat(...elements) {
  // 过滤掉 null
  const els = elements.filter(Boolean);
  if (!els.length) return () => {};

  running = true;

  function tick(time) {
    if (!running) return;

    // 主心跳 ≈ 1.8 秒周期 (接近静息心率)
    const t = time * 0.0033;
    // 核心缩放量：±0.004 (0.4%)
    const baseScale = 0.004;
    // 使用 sin 制造平滑呼吸
    const breath = Math.sin(t);

    // 每个元素略微分相
    els.forEach((el, i) => {
      const phase = i * 0.8;          // 错开相位
      const amp = i === 0 ? 1 : 0.7;  // 第一个 (主标题) 幅度最大
      const s = 1 + baseScale * amp * Math.sin(t + phase);
      el.style.transform = `scale(${s})`;
    });

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  // 返回 stop 函数
  return () => {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    // 复位
    els.forEach(el => { el.style.transform = ''; });
  };
}
