import './09-reel.css';
import { h, shine, wait, nextButton } from '../lib/utils.js';

const COVER_MS = 3000;

export default async function play(stage, ctx) {
  const { settings: s, videos } = ctx.content;
  const n = videos.length;
  if (!n) return;

  let idx = 0;
  let soundOn = false;
  let coverTimer = 0;
  let capTimer = 0;
  const failed = new Set();

  const video = h('video', { class: 's9-video', playsinline: true, muted: true, autoplay: true, preload: 'auto' });
  video.muted = true;
  const cover = h('img', { class: 's9-cover', alt: '', draggable: 'false' });
  cover.addEventListener('error', () => cover.classList.add('s9-cover--err'));
  const muteBtn = h('button', { class: 's9-mute', type: 'button' });
  const screen = h('div', { class: 's9-screen' }, video, cover, muteBtn);
  const prevBtn = h('button', { class: 's9-nav s9-nav--prev', type: 'button', 'aria-label': 'Video trước' }, '‹');
  const nextBtn = h('button', { class: 's9-nav s9-nav--next', type: 'button', 'aria-label': 'Video sau' }, '›');
  const film = h('div', { class: 's9-film' }, screen);
  const frame = h('div', { class: 's9-frame' }, film, n > 1 ? [prevBtn, nextBtn] : null);
  const dots = videos.map(() => h('span', { class: 's9-dot' }));
  const caption = h('p', { class: 's9-caption' });

  stage.append(
    h('div', { class: 's9-wrap' },
      h('h2', { class: 's9-title' }, shine(s.reelTitle)),
      frame,
      h('div', { class: 's9-dots', 'aria-hidden': 'true' }, dots),
      caption,
    ),
  );

  const setMuteUi = () => {
    muteBtn.textContent = soundOn ? '🔊' : '🔇';
    muteBtn.setAttribute('aria-label', soundOn ? 'Tắt tiếng video' : 'Bật tiếng video');
  };
  setMuteUi();

  const tryPlay = () => {
    video.play().catch((err) => {
      // Trình duyệt chặn phát có tiếng → quay về tắt tiếng để video vẫn chạy.
      if (err?.name === 'NotAllowedError' && !video.muted) {
        soundOn = false;
        video.muted = true;
        setMuteUi();
        ctx.music.resume();
        video.play().catch(() => {});
      }
    });
  };

  const setCaption = (text) => {
    clearTimeout(capTimer);
    caption.classList.add('s9-caption--out');
    capTimer = setTimeout(() => {
      caption.textContent = text || '';
      caption.classList.remove('s9-caption--out');
    }, 250);
  };

  const showCover = () => {
    cover.classList.add('s9-cover--on');
    clearTimeout(coverTimer);
    if (n > 1) coverTimer = setTimeout(() => show(idx + 1), COVER_MS);
  };

  function show(i) {
    idx = (i + n) % n;
    const v = videos[idx];
    clearTimeout(coverTimer);
    dots.forEach((d, k) => d.classList.toggle('s9-dot--on', k === idx));
    setCaption(v.caption);
    cover.classList.remove('s9-cover--on', 's9-cover--err');
    cover.src = v.url;
    video.poster = v.url;
    if (failed.has(idx)) {
      video.pause();
      showCover();
      return;
    }
    video.src = v.video;
    tryPlay();
  }

  const onEnded = () => show(idx + 1);
  const onError = () => {
    if (!video.getAttribute('src')) return;
    failed.add(idx);
    video.pause();
    showCover();
  };
  video.addEventListener('ended', onEnded);
  video.addEventListener('error', onError);

  muteBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    video.muted = !soundOn;
    if (soundOn) {
      ctx.music.suspend();
      if (!failed.has(idx)) tryPlay();
    } else {
      ctx.music.resume();
    }
    setMuteUi();
  });
  prevBtn.addEventListener('click', () => show(idx - 1));
  nextBtn.addEventListener('click', () => show(idx + 1));

  // Vuốt ngang trên khung để chuyển video.
  let sx = 0, sy = 0, down = false;
  const onDown = (e) => {
    if (e.target.closest('button')) return;
    down = true;
    sx = e.clientX;
    sy = e.clientY;
  };
  const onUp = (e) => {
    if (!down) return;
    down = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (n > 1 && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) show(idx + (dx < 0 ? 1 : -1));
  };
  const onCancel = () => { down = false; };
  film.addEventListener('pointerdown', onDown);
  film.addEventListener('pointerup', onUp);
  film.addEventListener('pointercancel', onCancel);

  // Bật lại nhạc ngay trong cú chạm nút "Tiếp" (iPhone chỉ cho phát trong sự kiện chạm).
  const onNextTap = (e) => {
    if (!e.target.closest('.next-btn')) return;
    video.pause();
    ctx.music.resume();
  };
  stage.addEventListener('click', onNextTap, true);

  show(0);

  await wait(2000);
  await nextButton(stage);

  clearTimeout(coverTimer);
  clearTimeout(capTimer);
  video.removeEventListener('ended', onEnded);
  video.removeEventListener('error', onError);
  film.removeEventListener('pointerdown', onDown);
  film.removeEventListener('pointerup', onUp);
  film.removeEventListener('pointercancel', onCancel);
  stage.removeEventListener('click', onNextTap, true);
  video.pause();
  video.removeAttribute('src');
  video.load();
  ctx.music.resume();
}
