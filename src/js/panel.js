/**
 * 右侧面板交互
 *
 *   sideTab       — 右边缘透明按钮（悬停减少透明度）
 *   sidePanel     — 侧滑面板
 *   letterBtn     — 书信图标，点击打开居中弹窗
 *   (孔明灯功能已移除)
 *   musicBtn      — 音乐图标（暂时无功能）
 *   settingsBtn   — 自定义（展开设置区）
 *   weatherBtn    — 天气详情弹窗
 *
 * 设置区：
 *   主开关     — 是否启用自定义
 *   天气色调   — 自动 / 晴天 / 雨天
 *   天气效果   — 雨滴 / 光斑 / 花瓣
 *   界面模式   — 自动 / 日间 / 夜间
 */

import { getWeatherCache, applyWeatherTheme, getRainIntensity } from './weather.js';
import { startPetals, stopPetals, arePetalsActive } from './petals.js';
/* ---- 设置状态 ---- */
let canvasCtrl = null;

const settings = {
  enabled: false,    // 主开关
  theme: 'auto',     // auto | sunny | rainy
  rain: true,        // 雨滴
  spots: true,       // 光斑
  petals: true,      // 花瓣
  daynight: 'auto'   // auto | day | night
};

/* ---- 外部注入画布引用 ---- */
export function setCanvasRef(ref) {
  canvasCtrl = ref;
}

/* ================================================================
   核心：应用当前设置 + 天气数据到画布 & 背景
   ================================================================ */

export function applyCurrentSettings(weatherData) {
  if (!canvasCtrl) return;
  if (!weatherData) weatherData = getWeatherCache();
  if (!weatherData) {
    weatherData = {
      guangzhou: { condition: 'sunny', weathercode: 0 },
      kunming:   { condition: 'sunny', weathercode: 0 }
    };
  }

  const isCustom    = settings.enabled;
  const realCond    = weatherData.kunming?.condition || 'sunny';
  const realCode    = weatherData.kunming?.weathercode;

  /* ---- 天气色调 ---- */
  const effectiveTheme = (isCustom && settings.theme !== 'auto') ? settings.theme : realCond;

  /* ---- 界面模式（日夜） ---- */
  const isNight = (() => {
    if (isCustom && settings.daynight !== 'auto') return settings.daynight === 'night';
    const h = new Date().getHours();
    return h < 6 || h >= 18;
  })();

  // 先设天气色调
  applyWeatherTheme(effectiveTheme);
  // 再覆盖日夜
  document.body.classList.toggle('night-mode', isNight);

  /* ---- 星星（夜间 + 非雨天） ---- */
  if (canvasCtrl) {
    canvasCtrl.starsEnabled = isNight && effectiveTheme === 'sunny';
  }

  /* ---- 太阳（白天 + 晴天） ---- */
  if (canvasCtrl) {
    canvasCtrl.sunEnabled = !isNight && effectiveTheme === 'sunny';
  }

  /* ---- 雨滴 ---- */
  const shouldRain = effectiveTheme !== 'sunny';
  const rainOK = isCustom ? settings.rain : true;
  canvasCtrl.rainEnabled = shouldRain && rainOK;
  if (shouldRain && rainOK) {
    const intensity = (isCustom && settings.theme === 'auto')
      ? getRainIntensity(realCode)
      : 2;
    canvasCtrl.setRainIntensity(intensity);
  } else {
    canvasCtrl.rainDrops = [];
  }

  /* ---- 光斑 ---- */
  const shouldSpot = effectiveTheme === 'sunny';
  canvasCtrl.spotsEnabled = shouldSpot && (!isCustom || settings.spots);

  /* ---- 花瓣（仅白天晴天） ---- */
  const shouldPetal = effectiveTheme === 'sunny' && !isNight;
  const petalOK = isCustom ? settings.petals : true;
  if (shouldPetal && petalOK) {
    if (!arePetalsActive()) startPetals(25);
  } else {
    stopPetals();
  }
}

/* ================================================================
   侧面板按钮初始化
   ================================================================ */

export function initPanel() {
  const tab    = document.getElementById('sideTab');
  const panel  = document.getElementById('sidePanel');
  const close  = document.getElementById('panelClose');
  const letterBtn  = document.getElementById('letterBtn');
  const musicBtn   = document.getElementById('musicBtn');
  const settingsBtn = document.getElementById('settingsBtn');

  if (!tab || !panel) return;

  /* ---- 打开/关闭面板 ---- */
  tab.addEventListener('click', () => { panel.classList.toggle('open'); });
  if (close) close.addEventListener('click', () => { panel.classList.remove('open'); });

  /* ---- 书信弹窗 ---- */
  const letterModal = document.getElementById('letterModal');
  const backdrop    = document.getElementById('letterBackdrop');
  const modalClose  = document.getElementById('letterModalClose');

  if (letterBtn && letterModal) {
    letterBtn.addEventListener('click', () => { letterModal.classList.add('open'); });
    const closeLetter = () => letterModal.classList.remove('open');
    if (modalClose) modalClose.addEventListener('click', closeLetter);
    if (backdrop)   backdrop.addEventListener('click', closeLetter);
  }

  /* ---- 音乐播放/停止 ---- */
  if (musicBtn) {
    musicBtn.dataset.playing = 'false';
    musicBtn.addEventListener('click', () => {
      const isPlaying = musicBtn.dataset.playing === 'true';
      if (isPlaying) {
        if (window.stopBgm) window.stopBgm();
        musicBtn.dataset.playing = 'false';
        musicBtn.style.borderColor = 'rgba(255,255,255,0.18)';
      } else {
        if (window.playBgm) window.playBgm();
        musicBtn.dataset.playing = 'true';
        musicBtn.style.borderColor = '#FFD700';
      }
    });
  }

  /* ================================================================
     自定义设置弹窗
     ================================================================ */

  const settingsModal = document.getElementById('settingsModal');
  const settingsBackdrop = document.getElementById('settingsBackdrop');
  const settingsModalClose = document.getElementById('settingsModalClose');

  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', () => {
      settingsModal.classList.add('open');
      panel.classList.remove('open');
    });
    const closeSettings = () => settingsModal.classList.remove('open');
    if (settingsModalClose) settingsModalClose.addEventListener('click', closeSettings);
    if (settingsBackdrop)   settingsBackdrop.addEventListener('click', closeSettings);
  }

  /* ---- 主开关 ---- */
  const masterChk = document.getElementById('stMaster');
  const settingsOptions = document.getElementById('settingsOptions');
  if (masterChk && settingsOptions) {
    masterChk.addEventListener('change', () => {
      settings.enabled = masterChk.checked;
      settingsOptions.classList.toggle('open', masterChk.checked);
      applyCurrentSettings();
    });
  }

  /* ---- 天气色调 ---- */
  document.querySelectorAll('input[name="stTheme"]').forEach(r => {
    r.addEventListener('change', () => {
      settings.theme = r.value;
      applyCurrentSettings();
    });
  });

  /* ---- 天气效果 ---- */
  const effRain   = document.getElementById('stEffectRain');
  const effSpots  = document.getElementById('stEffectSpots');
  const effPetals = document.getElementById('stEffectPetals');

  if (effRain) effRain.addEventListener('change', () => {
    settings.rain = effRain.checked;
    applyCurrentSettings();
  });
  if (effSpots) effSpots.addEventListener('change', () => {
    settings.spots = effSpots.checked;
    applyCurrentSettings();
  });
  if (effPetals) effPetals.addEventListener('change', () => {
    settings.petals = effPetals.checked;
    applyCurrentSettings();
  });

  /* ---- 日间/夜间 ---- */
  document.querySelectorAll('input[name="stDaynight"]').forEach(r => {
    r.addEventListener('change', () => {
      settings.daynight = r.value;
      applyCurrentSettings();
    });
  });
}
