/**
 * 距离模块 — Haversine 公式
 *
 * 广州软件学院 (从化)  →  23.45°N, 113.46°E
 * 云南师大呈贡校区    →  24.85°N, 102.85°E
 *
 * 使用 GSAP 数字滚动动画 (0 → 约 1070km)
 */

import gsap from 'gsap';

// 坐标
const GZ = { lat: 23.45, lon: 113.46 };
const KM = { lat: 24.85, lon: 102.85 };

/**
 * Haversine 球面距离计算
 * @param {number} lat1  纬度1 (度)
 * @param {number} lon1  经度1 (度)
 * @param {number} lat2  纬度2 (度)
 * @param {number} lon2  经度2 (度)
 * @returns {number} 距离 (km)
 */
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // 地球平均半径 (km)
  const toRad = d => d * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
          * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 获取广软 → 云师距离
 * @returns {number} 距离 (km, 取整)
 */
export function getDistance() {
  return Math.round(haversine(GZ.lat, GZ.lon, KM.lat, KM.lon));
}

/**
 * GSAP 数字滚动动画
 * @param {HTMLElement} element  显示数字的元素
 * @param {number}      duration 动画时长 (秒)
 * @param {number}      [delay]  延迟
 * @returns {gsap.core.Tween}
 */
export function animateDistanceNumber(element, duration = 2, delay = 0) {
  const target = getDistance();
  const obj = { value: 0 };

  return gsap.to(obj, {
    value: target,
    duration,
    delay,
    ease: 'power3.out',
    onUpdate() {
      element.textContent = Math.round(obj.value);
    },
    onComplete() {
      element.textContent = target; // 精确值
    }
  });
}
