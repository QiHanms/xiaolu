/**
 * 天气模块 — Open-Meteo API（免费开源，无需 Key）
 *
 * 按经纬度查询实时气温 & WMO 天气码
 * 图标使用内联 SVG，风格与面板按钮统一（白色线描）
 *
 *   sunny   → 太阳（WMO 0）
 *   cloudy  → 透光云（WMO 1-2）
 *   overcast→ 阴天密云（WMO 3）
 *   rainy   → 云 + 雨滴（WMO ≥ 45）
 *
 * API: https://open-meteo.com/
 */

const CITIES = [
  { id: 'guangzhou', label: '广州', lat: 23.45, lon: 113.46, panelId: 'L' },
  { id: 'kunming',   label: '昆明', lat: 24.85, lon: 102.85, panelId: 'R' }
];

let weatherCache = null;
let userCondition = 'sunny';          // 访客本地天气（决定主题）
let userWeathercode = 0;
const subscribers = [];


/* ---------- WMO → condition（4 种） ---------- */

function wmoToCondition(code) {
  if (code === 0)            return 'sunny';
  if (code <= 2)             return 'cloudy';     // 少云 / 多云间晴
  if (code <= 3)             return 'overcast';   // 阴天
  if (code <= 48)            return 'rainy';      // 雾
  return 'rainy';                                 // 雨雪等
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


/* ---------- SVG 天气图标（线描白风格） ---------- */

const WEATHER_SVG = {
  sunny: `<svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="24" cy="24" r="5.5"/>
    <path d="M24 4v3M24 41v3M4 24h3M41 24h3M9.5 9.5l2.5 2.5M36 36l2.5 2.5M9.5 38.5l2.5-2.5M36 12l2.5-2.5"/>
  </svg>`,
  cloudy: `<svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M36 22h7a4 4 0 0 0 0-8h-1.2A6.8 6.8 0 0 0 29 10"/>
    <path d="M18 26h-6a4 4 0 0 1 0-8h1a6.5 6.5 0 0 1 12-3"/>
  </svg>`,
  overcast: `<svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M34 24h6a3.5 3.5 0 1 0 0-7h-1.2A7.2 7.2 0 0 0 27 12.5" opacity="0.5"/>
    <path d="M16 26h-5a3.5 3.5 0 1 1 0-7h1A6.5 6.5 0 0 1 18 14" opacity="0.5"/>
    <path d="M9 28h30a4 4 0 0 0 0-8h-1.5A8 8 0 0 0 22 16a8 8 0 0 0-12 6H12a4.5 4.5 0 0 0 0 9h-3z" opacity="0.7"/>
    <line x1="12" y1="36" x2="14" y2="32" opacity="0.4"/>
    <line x1="24" y1="36" x2="26" y2="32" opacity="0.4"/>
    <line x1="36" y1="36" x2="38" y2="32" opacity="0.4"/>
  </svg>`,
  rainy: `<svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M34 20h8a3.5 3.5 0 1 0 0-7h-1.2A7.2 7.2 0 0 0 27 8.5"/>
    <path d="M16 22h-5a3.5 3.5 0 1 1 0-7h1A6.5 6.5 0 0 1 18 10"/>
    <line x1="20" y1="34" x2="18" y2="40"/>
    <line x1="30" y1="34" x2="28" y2="40"/>
    <line x1="40" y1="34" x2="38" y2="40"/>
  </svg>`
};

export function iconHTML(condition) {
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


/* ---------- 访客本地定位天气（决定主题） ---------- */

let userWeatherData = { temp: '--', text: '未知', condition: 'sunny', weathercode: 0 };

/**
 * 获取访客地理位置 → 查询 Open-Meteo → 更新 userWeatherData
 * 定位失败或拒绝时回退 sunny
 */
export async function fetchUserWeather() {
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 5000, maximumAge: 600_000
      });
    });
    const { latitude, longitude } = pos.coords;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const cw = json.current_weather;
    userWeatherData = {
      temp: Math.round(cw.temperature).toString(),
      text: wmoToDescription(cw.weathercode),
      condition: wmoToCondition(cw.weathercode),
      weathercode: cw.weathercode
    };
    userCondition = userWeatherData.condition;
    userWeathercode = userWeatherData.weathercode;
  } catch (_) {
    userWeatherData = { temp: '--', text: '未知', condition: 'sunny', weathercode: 0 };
    userCondition = 'sunny';
    userWeathercode = 0;
  }
  return userWeatherData;
}

/** 获取访客当前的天气条件 */
export function getUserCondition() {
  return userCondition;
}

export function getUserWeathercode() {
  return userWeathercode;
}

/** 获取完整访客天气数据 */
export function getUserWeather() {
  return userWeatherData;
}


/* ---------- 导出 ---------- */

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
 * sunny / cloudy / overcast 均使用暖色（weather-sunny），
 * rainy 使用冷色（weather-rainy）
 */
export function applyWeatherTheme(condition) {
  const body = document.body;
  if (!body) return;

  const isSunnyLike = condition === 'sunny' || condition === 'cloudy' || condition === 'overcast';
  body.classList.remove('weather-sunny', 'weather-rainy');
  body.classList.add(isSunnyLike ? 'weather-sunny' : 'weather-rainy');

  if (isNightTime()) {
    body.classList.add('night-mode');
  } else {
    body.classList.remove('night-mode');
  }
}
