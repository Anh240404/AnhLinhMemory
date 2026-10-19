export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isSmall = () => innerWidth < 640;

/** devicePixelRatio, giới hạn 2 để canvas không nặng trên điện thoại. */
export const dpr = () => Math.min(devicePixelRatio || 1, 2);

/** h('div', { class: 'x', onclick: fn }, child1, 'text') */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

/** Chữ ánh kim: bọc text trong span có vệt sáng quét qua (CSS .shine trong base.css). */
export const shine = (text) => h('span', { class: 'shine', 'data-text': text }, text);

/**
 * Hiện nút "Tiếp ›" (kèm "‹ Quay lại" nếu main.js cho phép qua stage.dataset.canBack) ở đáy màn hình.
 * Resolve khi bấm nút nào cũng được; hướng đi ghi vào stage.dataset.nav ('next' | 'back') để main.js đọc.
 */
export function nextButton(stage, label = 'Tiếp ›') {
  return new Promise((resolve) => {
    const go = (dir) => () => {
      stage.dataset.nav = dir;
      bar.remove();
      resolve();
    };
    const bar = h('div', { class: 'nav-bar' },
      stage.dataset.canBack ? h('button', { class: 'next-btn next-btn--back', type: 'button', onclick: go('back') }, '‹ Quay lại') : null,
      h('button', { class: 'next-btn', type: 'button', onclick: go('next') }, label));
    stage.append(bar);
  });
}

/** Tải trước ảnh; không bao giờ reject (ảnh lỗi vẫn resolve). */
export function preload(urls) {
  return Promise.all(urls.map((src) => new Promise((r) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = img.onerror = () => r(img);
    img.src = src;
  })));
}

/** Lặp mảng cho đủ n phần tử. */
export function fill(arr, n) {
  if (!arr.length) return [];
  return Array.from({ length: n }, (_, i) => arr[i % arr.length]);
}

/** Vòng requestAnimationFrame có hàm dừng. cb(dtSeconds, tSeconds). */
export function loop(cb) {
  let id = 0, last = performance.now(), start = last;
  const tick = (now) => {
    cb(Math.min((now - last) / 1000, 0.05), (now - start) / 1000);
    last = now;
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}
