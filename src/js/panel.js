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

import { getWeatherCache, applyWeatherTheme, getRainIntensity, getUserCondition, getUserWeathercode } from './weather.js';
import { startPetals, stopPetals, arePetalsActive } from './petals.js';
import { ENGLISH_NAME, FULL_NAME } from '../config/names.js';
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

  const isCustom    = settings.enabled;
  // 访客本地天气（决定主题）
  const realCond    = getUserCondition();
  const realCode    = getUserWeathercode();

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

  /* ---- 各类天气标志 ---- */
  const isSunnyLike = effectiveTheme === 'sunny' || effectiveTheme === 'cloudy';
  const isOvercast  = effectiveTheme === 'overcast';
  const isRainy     = effectiveTheme === 'rainy';

  /* ---- 星星（夜间 + 晴/多云） ---- */
  canvasCtrl.starsEnabled = isNight && isSunnyLike;

  /* ---- 太阳（白天 + 晴/多云） ---- */
  canvasCtrl.sunEnabled = !isNight && isSunnyLike;

  /* ---- 雨滴 ---- */
  const shouldRain = isRainy;
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

  /* ---- 光斑（仅白天晴天） ---- */
  canvasCtrl.spotsEnabled = effectiveTheme === 'sunny' && !isNight && (!isCustom || settings.spots);

  /* ---- 花瓣（仅白天晴/多云） ---- */
  const shouldPetal = isSunnyLike && !isNight;
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
  const fullscreenBtn = document.getElementById('fullscreenBtn');
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
    letterBtn.addEventListener('click', () => {
      // 填入姓名占位（仅首次）
      if (!letterModal.dataset.namesSet) {
        const el = letterModal.querySelector('._ne');
        if (el) el.textContent = ENGLISH_NAME;
        const ef = letterModal.querySelectorAll('._nf');
        ef.forEach(e => e.textContent = FULL_NAME);
        letterModal.dataset.namesSet = '1';
      }
      letterModal.classList.add('open');
    });
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

  /* ---- 全屏切换 ---- */
  if (fullscreenBtn) {
    const fsIcon = () => {
      const isFull = !!document.fullscreenElement;
      fullscreenBtn.innerHTML = isFull
        ? `<svg viewBox="0 0 48 48" width="28" height="28" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 16h-6v-6M32 16h6v-6M16 32h-6v6M32 32h6v6"/>
            <line x1="10" y1="10" x2="22" y2="22"/>
            <line x1="38" y1="10" x2="26" y2="22"/>
            <line x1="10" y1="38" x2="22" y2="26"/>
            <line x1="38" y1="38" x2="26" y2="26"/>
          </svg>
          <span class="panel-btn-label">还原</span>`
        : `<svg viewBox="0 0 48 48" width="28" height="28" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 8H8v8M32 8h8v8M8 32v8h8M40 32v8h-8"/>
            <line x1="8" y1="8" x2="20" y2="20"/>
            <line x1="40" y1="8" x2="28" y2="20"/>
            <line x1="8" y1="40" x2="20" y2="28"/>
            <line x1="40" y1="40" x2="28" y2="28"/>
          </svg>
          <span class="panel-btn-label">全屏</span>`;
    };
    fullscreenBtn.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    });
    document.addEventListener('fullscreenchange', fsIcon);
    fsIcon();
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
