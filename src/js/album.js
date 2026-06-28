/**
 * 相册模块 — 全屏页面
 *
 * 功能：
 *   - 点击相册按钮 → 全屏页面（主背景色调）
 *   - 上传最多 5 张照片，压缩后 localStorage 持久化
 *   - 5 个槽位各具独特布局
 *   - 双击移除照片
 */

const STORAGE_KEY = 'album_photos_v2';
const MAX_PHOTOS = 5;
const MAX_WIDTH = 800;
const JPEG_QUALITY = 0.72;

/** 图片压缩 */
function compress(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(MAX_WIDTH / img.width, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export function initAlbum() {
  const page = document.getElementById('albumPage');
  const albumBtn = document.getElementById('albumBtn');
  const backBtn = document.getElementById('albumPageBack');
  const uploadLabel = document.getElementById('albumUploadLabel');
  const fileInput = document.getElementById('albumFileInput');
  const countEl = document.getElementById('albumCount');
  const items = document.querySelectorAll('.album-item');

  if (!page) return;

  let photos = loadPhotos();

  /* ---- 渲染 ---- */
  function render() {
    items.forEach((item, i) => {
      const img = item.querySelector('.frame-img');
      const data = photos[i];
      if (data) {
        img.src = data;
        item.classList.add('has-image');
      } else {
        img.removeAttribute('src');
        item.classList.remove('has-image');
      }
    });
    const count = photos.length;
    if (countEl) countEl.textContent = `${count} / ${MAX_PHOTOS}`;
  }

  /* ---- 存储 ---- */
  function savePhotos() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(photos)); } catch (_) {}
  }
  function loadPhotos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }

  /* ---- 添加 ---- */
  async function addPhoto(file) {
    if (photos.length >= MAX_PHOTOS) return;
    try {
      photos.push(await compress(file));
      savePhotos();
      render();
    } catch (_) {}
  }

  /* ---- 删除（双击） ---- */
  items.forEach((item) => {
    item.addEventListener('dblclick', () => {
      const idx = parseInt(item.dataset.index);
      if (photos[idx]) {
        photos.splice(idx, 1);
        while (photos.length > 0 && !photos[photos.length - 1]) photos.pop();
        savePhotos();
        render();
      }
    });
  });

  /* ---- 上传 ---- */
  if (uploadLabel && fileInput) {
    // label 原生行为已触发 fileInput，无需额外 click
    fileInput.addEventListener('change', async () => {
      const files = Array.from(fileInput.files);
      fileInput.value = '';
      for (const f of files) {
        if (photos.length >= MAX_PHOTOS) break;
        await addPhoto(f);
      }
    });
  }

  /* ---- 打开 / 关闭 ---- */
  if (albumBtn) {
    albumBtn.addEventListener('click', () => {
      render();
      page.classList.add('open');
    });
  }
  if (backBtn) {
    backBtn.addEventListener('click', () => page.classList.remove('open'));
  }

  render();
}
