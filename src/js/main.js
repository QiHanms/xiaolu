/**
 * GSAP 主时间线
 *
 *   0s    天空亮起
 *   2s    主标题弹性淡入
 *   4s    副标题逐字出现
 *   6s    天气距离滑入，数字滚动
 *   8s+   无限待机，花瓣持续
 */

import gsap from 'gsap';

/**
 * @param {import('./canvas.js').default}         canvasCtrl
 * @param {{ animateDistanceNumber: (el:HTMLElement) => gsap.core.Tween }} distanceUtils
 */
export function createTimeline(canvasCtrl, { animateDistanceNumber }) {
  const tl = gsap.timeline({ paused: true });

  /* ----- 0.0s — 天空从暮色→朝阳（skyOverlay 已渐显，开始柔和提亮）----- */

  /* ----- 2.0s — 主标题 ----- */
  tl.fromTo('#mainTitle', {
    opacity: 0, scale: 0.35, y: 50, filter: 'blur(12px)'
  }, {
    opacity: 1, scale: 1, y: 0, filter: 'blur(0px)',
    duration: 1.8, ease: 'elastic.out(1, 0.45)'
  }, 2);

  /* ----- 3.5s — 学士帽 + 校园建筑淡入（主标题之后）----- */
  tl.fromTo('#capContainer', { opacity: 0 }, {
    opacity: 1, duration: 1.5, ease: 'power2.out'
  }, 3.5);
  tl.fromTo('#campusCanvas', { opacity: 0 }, {
    opacity: 0.7, duration: 1.5, ease: 'power2.out'
  }, 3.5);

  /* ----- 4.0s — 副标题逐字 ----- */
  tl.fromTo('#subTitle span', {
    opacity: 0, y: 30, rotation: -12, scale: 0.7
  }, {
    opacity: 1, y: 0, rotation: 0, scale: 1,
    duration: 0.55, stagger: 0.1, ease: 'back.out(2)'
  }, 4);

  /* ----- 5.5s — 天气面板 ----- */
  tl.to('.weather-panel', {
    opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power2.out'
  }, 5.5);

  /* ----- 6.0s — 距离滑入 ----- */
  tl.to('#distanceSection', {
    opacity: 1, y: 0, duration: 0.7, ease: 'power2.out'
  }, 6);

  /* ----- 6.5s — 数字滚动 ----- */
  tl.call(() => {
    const el = document.getElementById('distanceNumber');
    if (el) animateDistanceNumber(el, 2.5);
  }, [], 6.5);

  /* ----- 7.5s — 底部文字 + 时钟 + 相识天数 ----- */
  tl.to('.footer-text', {
    opacity: 1, duration: 0.8, ease: 'power1.out'
  }, 7.5);
  tl.to('.clock-display', {
    opacity: 1, duration: 0.8, ease: 'power1.out'
  }, 7.5);
  tl.to('.meet-count', {
    opacity: 1, duration: 0.8, ease: 'power1.out'
  }, 7.5);

  /* ----- 8.5s — 励志语录在全部内容后缓缓出现 ----- */
  tl.to('.quotes-cycler', {
    opacity: 1, duration: 1.5, ease: 'power2.out'
  }, 8.5);

  tl.play();
  return tl;
}
