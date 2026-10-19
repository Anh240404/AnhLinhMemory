import './03-calendar.css';
import { h, wait, nextButton, preload, reducedMotion, isSmall } from '../lib/utils.js';

const N = 10; // lưới trái tim N×N
const M = 0.25; // phần thừa cho tai puzzle (theo đơn vị ô)
const rand = (a, b) => a + Math.random() * (b - a);

function inHeart(col, row) {
  const x = ((col + 0.5) / N - 0.5) * 2.5;
  const y = 1.32 - ((row + 0.5) / N) * 2.5;
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
}

// Cạnh có tai: s=+1 lồi ra ngoài, -1 lõm vào, 0 phẳng. Toạ độ ô 0..100.
function edge(x0, y0, x1, y1, s) {
  if (!s) return `L${x1},${y1}`;
  const dx = x1 - x0, dy = y1 - y0;
  const nx = dy, ny = -dx; // pháp tuyến hướng ra ngoài (đi theo chiều kim đồng hồ)
  const p = (t, n) => `${(x0 + dx * t + nx * n * s).toFixed(1)},${(y0 + dy * t + ny * n * s).toFixed(1)}`;
  return `L${p(0.38, 0)}C${p(0.4, 0.1)} ${p(0.3, 0.22)} ${p(0.5, 0.22)}C${p(0.7, 0.22)} ${p(0.6, 0.1)} ${p(0.62, 0)}L${x1},${y1}`;
}

const maskCache = new Map();
function pieceMask(t, r, b, l) {
  const key = `${t}${r}${b}${l}`;
  if (!maskCache.has(key)) {
    const d = `M0,0${edge(0, 0, 100, 0, t)}${edge(100, 0, 100, 100, r)}${edge(100, 100, 0, 100, b)}${edge(0, 100, 0, 0, l)}Z`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-25 -25 150 150"><path d="${d}" fill="#000"/></svg>`;
    maskCache.set(key, `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
  }
  return maskCache.get(key);
}

function buildHeart(photos, sizes) {
  const cells = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (inHeart(c, r)) cells.push({ r, c });
  const has = new Set(cells.map(({ r, c }) => `${r},${c}`));
  const H = {}, V = {};
  const sign = () => (Math.random() < 0.5 ? 1 : -1);
  for (const { r, c } of cells) {
    if (has.has(`${r - 1},${c}`)) H[`${r},${c}`] = sign();
    if (has.has(`${r},${c - 1}`)) V[`${r},${c}`] = sign();
  }

  const B = photos.length <= 1 ? N : photos.length <= 4 ? 5 : 3;
  const blocks = new Map();
  const vw = innerWidth, vh = innerHeight;

  const wrap = h('div', { class: 's3-heart' });
  cells.forEach(({ r, c }) => {
    const top = H[`${r},${c}`] || 0;
    const bottom = -(H[`${r + 1},${c}`] || 0);
    const left = V[`${r},${c}`] || 0;
    const right = -(V[`${r},${c + 1}`] || 0);

    const bk = `${Math.floor(r / B)},${Math.floor(c / B)}`;
    if (!blocks.has(bk)) blocks.set(bk, blocks.size % photos.length);
    const pi = blocks.get(bk);
    const { w, h: ph } = sizes[pi];
    const aspect = w && ph ? w / ph : 1;
    // ảnh phủ kín khối B×B (giống background-size: cover)
    const bw = aspect >= 1 ? B * aspect : B;
    const bh = aspect >= 1 ? B : B / aspect;
    const bx = Math.floor(c / B) * B - (bw - B) / 2;
    const by = Math.floor(r / B) * B - (bh - B) / 2;

    const mask = pieceMask(top, right, bottom, left);
    const el = h('div', { class: 's3-piece' });
    el.style.cssText = [
      `--col:${c}`, `--row:${r}`,
      `--bw:${bw.toFixed(3)}`, `--bh:${bh.toFixed(3)}`,
      `--bx:${(bx - c + M).toFixed(3)}`, `--by:${(by - r + M).toFixed(3)}`,
      `--fx:${rand(-0.7, 0.7) * vw}px`, `--fy:${rand(-0.7, 0.7) * vh}px`,
      `--fr:${rand(-240, 240).toFixed(0)}deg`,
      `--dl:${rand(0, 1.35).toFixed(2)}s`,
      `background-image:url("${photos[pi].url.replace(/"/g, '%22')}")`,
      `-webkit-mask-image:${mask}`, `mask-image:${mask}`,
    ].join(';');
    wrap.append(el);
  });
  return wrap;
}

function calendar(year) {
  const first = new Date(year, 9, 1).getDay();
  const cells = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d) => h('span', { class: 's3-dow' }, d));
  for (let i = 0; i < first; i++) cells.push(h('span', { class: 's3-day s3-day--empty' }));
  for (let d = 1; d <= 31; d++) {
    cells.push(h('span', { class: d === 20 ? 's3-day s3-day--love' : 's3-day' }, String(d)));
  }
  return h('div', { class: 's3-cal' }, cells);
}

const FLOWER_SVGS = [
  // cúc trắng
  `<svg viewBox="0 0 30 44"><path d="M15 44 V20" stroke="#7fae6a" stroke-width="1.6"/><path d="M15 34 q-7 -2 -9 -8 q7 1 9 8z" fill="#8cc07a"/><g fill="#fff">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<ellipse cx="15" cy="9" rx="2.6" ry="5.2" transform="rotate(${a} 15 14)"/>`).join('')}</g><circle cx="15" cy="14" r="3.2" fill="#f7c948"/></svg>`,
  // chuông xanh
  `<svg viewBox="0 0 30 44"><path d="M15 44 V14 q0 -6 6 -8" stroke="#7fae6a" stroke-width="1.6" fill="none"/><path d="M15 36 q7 -3 8 -9 q-7 2 -8 9z" fill="#8cc07a"/><path d="M17 8 q4 -6 9 -2 q1 6 -3 9 q-1 -4 -6 -7z" fill="#7aa7f7"/><path d="M11 17 q-2 -6 3 -8 q4 3 3 9 q-3 -3 -6 -1z" fill="#93b8ff"/></svg>`,
  // hoa vàng nhỏ
  `<svg viewBox="0 0 30 44"><path d="M15 44 V22" stroke="#7fae6a" stroke-width="1.6"/><path d="M15 38 q-6 -4 -7 -10 q6 3 7 10z" fill="#8cc07a"/><g fill="#ffd56b">${[0, 72, 144, 216, 288].map((a) => `<circle cx="15" cy="12" r="4" transform="rotate(${a} 15 17)"/>`).join('')}</g><circle cx="15" cy="17" r="2.6" fill="#f59e0b"/></svg>`,
  // nơ xanh
  `<svg viewBox="0 0 30 44"><path d="M15 44 V26" stroke="#7fae6a" stroke-width="1.6"/><path d="M15 22 l-9 -7 q-2 7 3 9z M15 22 l9 -7 q2 7 -3 9z" fill="#6f9cf2"/><path d="M15 22 l-5 9 M15 22 l5 9" stroke="#6f9cf2" stroke-width="2" stroke-linecap="round"/><circle cx="15" cy="22" r="2" fill="#4f7fdb"/></svg>`,
];

function flowerRow() {
  const n = isSmall() ? 11 : 17;
  return h('div', { class: 's3-flowers', 'aria-hidden': 'true' },
    Array.from({ length: n }, (_, i) => {
      const el = h('span', { class: 's3-flower' });
      el.innerHTML = FLOWER_SVGS[i % 2 ? (i % 4 === 1 ? 1 : 3) : (i % 4 === 0 ? 0 : 2)];
      el.style.cssText = `--d:${(1.3 + i * 0.09 + Math.random() * 0.2).toFixed(2)}s;--s:${rand(0.75, 1.1).toFixed(2)};--sw:${rand(2.6, 4).toFixed(2)}s`;
      return el;
    }));
}

function parseDate(str) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(str || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date();
}

const heartIcon = () => {
  const s = h('span', { class: 's3-title-heart', 'aria-label': '❤' });
  s.innerHTML = '<svg viewBox="0 0 32 29"><path d="M16 28 C6 20 0 14 0 8 A8 8 0 0 1 16 4 A8 8 0 0 1 32 8 C32 14 26 20 16 28Z" fill="#e11d48"/></svg>';
  return s;
};

export default async function play(stage, ctx) {
  const { settings: s, photos } = ctx.content;
  const reduce = reducedMotion();
  const year = new Date().getFullYear();

  const list = photos.slice(0, 12);
  const imgs = await Promise.race([preload(list.map((p) => p.url)), wait(2500).then(() => [])]);
  const sizes = list.map((_, i) => ({ w: imgs[i]?.naturalWidth || 0, h: imgs[i]?.naturalHeight || 0 }));

  const heart = buildHeart(list, sizes);
  const num = (cls) => h('b', { class: cls }, '0');
  const nD = num('s3-n'), nH = num('s3-n'), nM = num('s3-n'), nS = num('s3-n');

  stage.append(h('div', { class: 's3-wrap' },
    h('div', { class: 's3-card' },
      h('h2', { class: 's3-title' }, h('span', {}, s.cardTitleLeft), heartIcon(), h('span', {}, s.cardTitleRight)),
      h('div', { class: 's3-body' },
        h('div', { class: 's3-heart-box' }, heart),
        h('div', { class: 's3-right' },
          h('p', { class: 's3-sub' }, s.cardSubtitle),
          h('p', { class: 's3-month' }, `Tháng 10, ${year}`),
          calendar(year))),
      flowerRow()),
    h('p', { class: 's3-counter' },
      h('span', { class: 's3-counter-label' }, s.counterLabel),
      h('span', { class: 's3-counter-val' },
        nD, ' ngày · ', nH, ' giờ · ', nM, ' phút · ', nS, ' giây'))));

  const start = parseDate(s.startDate).getTime();
  const pad = (v) => String(v).padStart(2, '0');
  const tick = () => {
    let t = Math.max(0, Math.floor((Date.now() - start) / 1000));
    const d = Math.floor(t / 86400); t -= d * 86400;
    const hh = Math.floor(t / 3600); t -= hh * 3600;
    const mm = Math.floor(t / 60);
    nD.textContent = d.toLocaleString('vi-VN');
    nH.textContent = pad(hh);
    nM.textContent = pad(mm);
    nS.textContent = pad(t - mm * 60);
  };
  tick();
  const timer = setInterval(tick, 1000);

  void stage.offsetWidth;
  requestAnimationFrame(() => stage.classList.add('s3--go'));
  await wait(reduce ? 300 : 2700);
  stage.classList.add('s3--done');

  await nextButton(stage);
  clearInterval(timer);
}
