/**
 * 背景音乐控制
 * 自动加载 /public/bgm.mp3，不自动播放
 * 暴露 playBgm / stopBgm 至全局
 */

let audio = null;

/**
 * 初始化音频，预加载 bgm.mp3
 * @returns {{ playBgm: () => Promise<void>, stopBgm: () => void }}
 */
export function initAudio() {
  // 单例
  if (audio) return { playBgm, stopBgm };

  audio = new Audio('/bgm.mp3');
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0.6;

  // 静默加载（用户未放 bgm.mp3 则不报错）
  audio.load();

  // 监听加载失败（无 bgm.mp3 时静默）
  audio.addEventListener('error', () => {
    console.warn('[Audio] bgm.mp3 not found — music skipped');
    audio = null;
  });

  return { playBgm, stopBgm };
}

/**
 * 开始播放 BGM（需用户手势触发）
 * 暴露为 window.playBgm 方便控制台调用
 */
export async function playBgm() {
  if (!audio) return;
  try {
    await audio.play();
  } catch (e) {
    console.warn('[Audio] autoplay blocked —', e.message);
  }
}

/**
 * 停止 BGM
 */
export function stopBgm() {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

// 暴露到全局，可在控制台调用 playBgm()
window.playBgm = playBgm;
window.stopBgm = stopBgm;
