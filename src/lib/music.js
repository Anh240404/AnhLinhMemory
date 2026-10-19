import { h } from './utils.js';

/** Nhạc nền + nút bật/tắt nổi góc phải. play() phải gọi trong sự kiện bấm của người dùng. */
export function createMusic(url) {
  const audio = new Audio();
  audio.loop = true;
  audio.preload = 'auto';
  if (url) audio.src = url;

  const btn = h('button', { class: 'music-btn', type: 'button', 'aria-label': 'Bật/tắt nhạc', hidden: true }, '♪');
  btn.addEventListener('click', () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()));
  audio.addEventListener('play', () => btn.classList.add('is-on'));
  audio.addEventListener('pause', () => btn.classList.remove('is-on'));
  document.body.append(btn);

  return {
    play() {
      if (!url) return;
      btn.hidden = false;
      audio.play().catch(() => {});
    },
    pause: () => audio.pause(),
  };
}
