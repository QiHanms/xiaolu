/**
 * 毕业祝福 · 入口文件
 *
 * 流程：
 *   1. 显示验证遮罩（输入姓名通过哈希校验）
 *   2. 验证通过 → 遮罩淡出
 *   3. 初始化 Canvas / 天气 / 花瓣 / 音频
 *   4. GSAP 主时间线启动
 *   5. 心跳持续
 */

import './css/style.css';

import gsap                from 'gsap';
import CanvasController    from './js/canvas.js';
import { initWeather, onWeatherUpdate, fetchUserWeather, getUserCondition } from './js/weather.js';
import { animateDistanceNumber }        from './js/distance.js';
import { startHeartbeat }               from './js/heartbeat.js';
import { initAudio }                    from './js/audio.js';
import { createTimeline }               from './js/main.js';
import { initPanel, setCanvasRef, applyCurrentSettings } from './js/panel.js';
import { FireworkSystem }               from './js/fireworks.js';
import { initAlbum }                     from './js/album.js';
import { startPetals }                   from './js/petals.js';
import { CampusScene }                   from './js/campus.js';
import { TITLE_TEXT }                     from './config/names.js';

/* ---- 验证口令（哈希校验，源码不暴露真实姓名） ---- */
const SECRET_HASH = 'f6f17801fef69a47872132b4094cb2ba0ee2905dba1b8d6df8c564487b4859aa';

async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ================================================================
   验证逻辑
   ================================================================ */

function setupVerification(onPass) {
  const overlay = document.getElementById('loadingOverlay');
  const input   = document.getElementById('nameInput');
  const btn     = document.getElementById('verifyBtn');
  const err     = document.getElementById('loadingError');
  const box     = document.querySelector('.loading-box');

  const shake = () => {
    box.classList.remove('shake');
    void box.offsetWidth;
    box.classList.add('shake');
    setTimeout(() => box.classList.remove('shake'), 500);
  };

  const verify = async () => {
    const val = input.value.trim();
    if (!val) { err.textContent = '请输入名字～'; shake(); return; }
    if (await sha256(val) === SECRET_HASH) {
      err.textContent = '';
      // 验证通过后立即播放音乐（在用户点击手势内）
      const { playBgm } = initAudio();
      playBgm();
      // 验证通过，显示名字在标题
      document.title = TITLE_TEXT;

      // 输入框元素逐个缓缓渐隐
      gsap.to('#nameInput, #verifyBtn', {
        opacity: 0, duration: 1.5, ease: 'power2.inOut'
      });
      gsap.to('.loading-hint', {
        opacity: 0, duration: 1.0, ease: 'power2.inOut'
      });
      gsap.to('.loading-error', {
        opacity: 0, duration: 1.0, ease: 'power2.inOut'
      });
      gsap.to('.loading-foot', {
        opacity: 0, duration: 1.5, ease: 'power2.inOut'
      });

      // 暮色叠层渐显（背景持续，便签显示时叠在其后）
      const skyEl = document.getElementById('skyOverlay');
      if (skyEl) {
        gsap.to(skyEl, {
          opacity: 1,
          duration: 2.8,
          ease: 'power2.inOut'
        });
      }

      // 等待 1s 后便签缓缓浮现
      gsap.delayedCall(1.0, () => {
        const noteCard = document.getElementById('noteCard');
        noteCard.style.display = 'block';
        gsap.set(noteCard, { xPercent: -50, yPercent: -50 });
        gsap.fromTo(noteCard,
          { opacity: 0, scale: 0.88 },
          { opacity: 1, scale: 1, duration: 3.2, ease: 'power2.out',
            onComplete: () => { noteCard.classList.add('show'); }
          }
        );
      });

      // 点击「确定」→ 便签缓缓淡出（1.0s）→ 遮罩淡出 → 主页面
      document.getElementById('noteConfirm').addEventListener('click', () => {
        const noteCard = document.getElementById('noteCard');
        noteCard.classList.remove('show');
        gsap.to(noteCard, {
          opacity: 0, scale: 0.88, duration: 2.0, ease: 'power2.inOut',
          onComplete: () => {
            noteCard.style.display = 'none';
            // 遮罩缓缓消失：内容缩小模糊 + 背景淡出
            gsap.to('.loading-box', {
              scale: 0.92, opacity: 0, filter: 'blur(6px)',
              duration: 1.4, ease: 'power2.inOut',
              delay: 0.4
            });
            gsap.to(overlay, {
              opacity: 0,
              duration: 2.2,
              ease: 'power2.inOut',
              delay: 0.1,
              onComplete: () => {
                overlay.style.display = 'none';
                overlay.style.opacity = ''; // reset
                // 花瓣容器降回内容层
                const pc = document.getElementById('petalsContainer');
                if (pc) pc.classList.add('behind');
                onPass();
              }
            });
          }
        });
      }, { once: true });
    } else {
      err.textContent = '不对哦，再想想～';
      shake();
      input.value = '';
      input.focus();
    }
  };

  btn.addEventListener('click', verify);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') verify(); });
  input.focus();
}

/* ================================================================
   主启动
   ================================================================ */

function startMainApp() {
  // --- Canvas(噪点 / 雨 / 光斑 / 拖尾) ---
  const mainCanvas  = document.getElementById('mainCanvas');
  const noiseCanvas = document.getElementById('noiseCanvas');
  const canvasCtrl = new CanvasController(mainCanvas, noiseCanvas);
  canvasCtrl.start();
  setCanvasRef(canvasCtrl);

  // --- 烟花 ---
  const fwCanvas = document.getElementById('fireworksCanvas');
  const fireworkSys = new FireworkSystem(fwCanvas);
  const fwBtn = document.getElementById('fireworkBtn');
  let fwActive = false;
  if (fwBtn) {
    fwBtn.addEventListener('click', () => {
      if (fwActive) {
        fireworkSys.stop();
        fwActive = false;
        fwBtn.style.borderColor = 'rgba(255,255,255,0.18)';
      } else {
        fireworkSys.startLoop();
        fwActive = true;
        fwBtn.style.borderColor = '#FFD700';
      }
    });
  }

  // --- 相册 ---
  initAlbum();

  // --- 校园建筑 + 第7棵枫树彩蛋 ---
  const campusCanvas = document.getElementById('campusCanvas');
  let campusScene = null;

  function showEasterEgg(treeCanvasX, treeCanvasY) {
    // 浮动提示 "呀，被你发现了呢！" 从枫树位置向上飘
    const rect = campusCanvas.getBoundingClientRect();
    const screenX = rect.left + treeCanvasX;
    const screenY = rect.top + treeCanvasY;
    const tip = document.createElement('div');
    tip.className = 'easter-tip';
    tip.textContent = '呀，被你发现了呢！';
    tip.style.left = screenX + 'px';
    tip.style.top = screenY + 'px';
    tip.style.transform = 'translateX(-50%)';
    document.body.appendChild(tip);
    setTimeout(() => tip.remove(), 3000);

    // 替换当前励志名言为粉色彩蛋，显示 5.20s
    const active = document.querySelector('.quote-item.active');
    if (active) {
      const origText = active.textContent;
      const origColor = active.style.color;
      stopQuoteCycle();
      active.textContent = '我啊，最喜欢你啦！';
      active.style.color = 'rgba(255, 160, 200, 0.95)';
      active.style.textShadow = '0 0 40px rgba(255, 120, 170, 0.5), 0 2px 12px rgba(0,0,0,0.10)';
      setTimeout(() => {
        active.textContent = origText;
        active.style.color = origColor;
        active.style.textShadow = '';
        startQuoteCycle();
      }, 5200);
    }
  }

  if (campusCanvas) campusScene = new CampusScene(campusCanvas, showEasterEgg);

  // --- 天气 + 背景主题 ---
  // 访客本地天气决定主题，双城天气仅作显示
  (async () => {
    // 先获取访客定位天气
    try { await fetchUserWeather(); } catch (_) { /* fallback sunny */ }

    // 再拉双城天气（面板显示）
    let weatherData = { guangzhou: { condition: 'sunny' }, kunming: { condition: 'sunny' } };
    try { weatherData = await initWeather(); } catch (_) { /* fallback sunny */ }
    applyCurrentSettings(weatherData);

    onWeatherUpdate((d) => {
      applyCurrentSettings(d);
      // 校园建筑跟随访客本地天气重绘
      if (campusScene) campusScene.draw(getUserCondition());
    });
  })();

  // --- GSAP ---
  const distanceUtils = { animateDistanceNumber };
  const timeline = createTimeline(canvasCtrl, distanceUtils);

  // --- 励志语录轮播（可暂停，供彩蛋使用） ---
  const quotes = document.querySelectorAll('.quote-item');
  let qIdx = 0;
  let quoteTimer = null;
  const QUOTE_INTERVAL = 15000;

  function startQuoteCycle() {
    if (quoteTimer) clearInterval(quoteTimer);
    quoteTimer = setInterval(() => {
      quotes[qIdx].classList.remove('active');
      qIdx = (qIdx + 1) % quotes.length;
      quotes[qIdx].classList.add('active');
    }, QUOTE_INTERVAL);
  }
  function stopQuoteCycle() {
    if (quoteTimer) { clearInterval(quoteTimer); quoteTimer = null; }
  }

  if (quotes.length > 1) startQuoteCycle();

  // --- 心跳 ---
  startHeartbeat(
    document.getElementById('mainTitle'),
    document.getElementById('subTitle'),
    document.getElementById('distanceNumber')
  );

  // --- 音频(不自动播放) ---
  const { playBgm } = initAudio();
  window.playBgm = playBgm;

  // --- 实时时钟 ---
  const clockEl = document.getElementById('clockDisplay');
  function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    if (clockEl) clockEl.textContent = `${hh}:${mm}:${ss}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // --- 相识天数实时更新（2024-09-29 起） ---
  const meetEl = document.getElementById('meetCountNumber');
  function updateMeetCount() {
    const start = new Date(2024, 8, 29); // Sep 29 local
    const now = new Date();
    const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    if (meetEl) meetEl.textContent = days;
  }
  updateMeetCount();
  setInterval(updateMeetCount, 60000); // 每分钟更新一次即可

  console.log('[Boot] 毕业祝福已启动 — 控制台 playBgm() 播放音乐');
}

/* ---- 启动：先验证，再加载 ---- */
initPanel();

// 花瓣从加载界面即开始飘落（后续由天气控制启停）
startPetals(20);

setupVerification(startMainApp);

/* ---- 自定义鼠标光点 ---- */
(function initCursor() {
  const dot = document.getElementById('cursorFollower');
  if (!dot) return;
  let raf = null;

  document.addEventListener('mousemove', (e) => {
    dot.style.left = e.clientX + 'px';
    dot.style.top  = e.clientY + 'px';
  });
})();
