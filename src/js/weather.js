/**
 * 天气模块 — Open-Meteo API（免费开源，无需 Key）
 *
 * 按经纬度查询实时气温 & WMO 天气码
 * 图标使用内联 SVG，风格与面板按钮统一（白色线描）
 *
 *   sunny  → 太阳
 *   cloudy → 双层云
 *   rainy  → 云 + 雨滴
 *
 * API: https://open-meteo.com/
 */

const CITIES = [
  { id: 'guangzhou', label: '广州', lat: 23.45, lon: 113.46, panelId: 'L' },
  { id: 'kunming',   label: '昆明', lat: 24.85, lon: 102.85, panelId: 'R' }
];

let weatherCache = null;
const subscribers = [];

/** 天气影响界面色调开关（默认开启）
 *  已移除：阴天/雨天统一为 rainy 色调，不再可关闭 */


/* ---------- WMO → condition（两种色调：sunny / rainy） ---------- */
function wmoToCondition(code) {
  if (code === 0) return 'sunny';
  return 'rainy';
}

/** WMO 天气码 → 画布雨量强度（0=无, 1=轻, 2=中, 3=大） */
export function getRainIntensity(weathercode) {
  if (weathercode === undefined || weathercode === null || weathercode <= 3) return 0;
  if (weathercode <= 48) return 0;  // 雾
  if (weathercode <= 57) return 1;  // 毛毛雨
  if (weathercode <= 67) return 2;  // 雨
  if (weathercode <= 77) return 2;  // 雪
  if (weathercode <= 82) return 3;  // 阵雨
  return 3;                         // 雨雪 / 大
}

/** WMO 天气码 → 中文描述 */
function wmoToDescription(code) {
  if (code === 0) return '晴朗';
  if (code === 1) return '少云';
  if (code <= 3)  return '多云';
  if (code <= 48) return '雾';
  if (code <= 57) return '毛毛雨';
  if (code <= 67) return '雨';
  if (code <= 77) return '雪';
  if (code <= 82) return '阵雨';
  if (code >= 85) return '雨雪';
  return '--';
}

/* ---------- 风格统一 SVG 天气图标（线描白风格） ---------- */

const WEATHER_SVG = {
  sunny: `<svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="24" cy="24" r="5.5"/>
    <path d="M24 4v3M24 41v3M4 24h3M41 24h3M9.5 9.5l2.5 2.5M36 36l2.5 2.5M9.5 38.5l2.5-2.5M36 12l2.5-2.5"/>
  </svg>`,
  cloudy: `<svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M36 22h7a4 4 0 0 0 0-8h-1.2A6.8 6.8 0 0 0 29 10"/>
    <path d="M18 26h-6a4 4 0 0 1 0-8h1a6.5 6.5 0 0 1 12-3"/>
  </svg>`,
  rainy: `<svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M34 20h8a3.5 3.5 0 1 0 0-7h-1.2A7.2 7.2 0 0 0 27 8.5"/>
    <path d="M16 22h-5a3.5 3.5 0 1 1 0-7h1A6.5 6.5 0 0 1 18 10"/>
    <line x1="20" y1="34" x2="18" y2="40"/>
    <line x1="30" y1="34" x2="28" y2="40"/>
    <line x1="40" y1="34" x2="38" y2="40"/>
  </svg>`
};

function iconHTML(condition) {
  return WEATHER_SVG[condition] || WEATHER_SVG.cloudy;
}

/* ---------- API ---------- */

async function fetchCityWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Asia/Shanghai`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const cw = json.current_weather;
    return {
      temp: Math.round(cw.temperature).toString(),
      text: wmoToDescription(cw.weathercode),
      condition: wmoToCondition(cw.weathercode),
      weathercode: cw.weathercode
    };
  } catch (err) {
    console.warn(`[Weather] fetch (${lat},${lon}) failed:`, err.message);
    return { temp: '--', text: '未知', condition: 'sunny', weathercode: 0 };
  }
}

export async function fetchAllWeather() {
  const results = await Promise.all(CITIES.map(c => fetchCityWeather(c.lat, c.lon)));
  weatherCache = {};
  CITIES.forEach((c, i) => { weatherCache[c.id] = results[i]; });
  subscribers.forEach(fn => fn(weatherCache));
  return weatherCache;
}

export function getWeatherCache() { return weatherCache; }

export function getWeatherCondition(city) {
  return weatherCache?.[city]?.condition || 'sunny';
}

export function onWeatherUpdate(fn) { subscribers.push(fn); }

/* ---------- 渲染 ---------- */

export function renderWeather(data) {
  CITIES.forEach(c => {
    const w = data[c.id];
    const iconEl = document.getElementById(`weatherIcon${c.panelId}`);
    const tempEl = document.getElementById(`temp${c.panelId}`);
    if (iconEl) iconEl.innerHTML = iconHTML(w.condition);
    if (tempEl) tempEl.textContent = `${w.temp}°C`;
  });
}

/** 渲染天气详情弹窗内容 */
export function renderWeatherDetail(data) {
  CITIES.forEach(c => {
    const w = data[c.id];
    const iconEl = document.getElementById(`weatherDetailIcon${c.panelId}`);
    const tempEl = document.getElementById(`weatherDetailTemp${c.panelId}`);
    const descEl = document.getElementById(`weatherDetailDesc${c.panelId}`);
    if (iconEl) iconEl.innerHTML = iconHTML(w.condition);
    if (tempEl) tempEl.textContent = `${w.temp}°C`;
    if (descEl) descEl.textContent = w.text || '--';
  });
}

export async function initWeather() {
  const data = await fetchAllWeather();
  renderWeather(data);
  setInterval(async () => { renderWeather(await fetchAllWeather()); }, 600_000);
  return data;
}

/* ================================================================
   天气联动：背景主题 + 夜晚模式
   ================================================================ */

/** 判断是否为夜晚（18:00–05:59） */
export function isNightTime() {
  const h = new Date().getHours();
  return h < 6 || h >= 18;
}

/**
 * 根据天气 + 时间设置 body class
 * 两种色调：sunny（晴）/ rainy（阴雨共用）
 */
export function applyWeatherTheme(condition) {
  const body = document.body;
  if (!body) return;

  body.classList.remove('weather-sunny', 'weather-rainy');
  body.classList.add(`weather-${condition}`);

  if (isNightTime()) {
    body.classList.add('night-mode');
  } else {
    body.classList.remove('night-mode');
  }
}
