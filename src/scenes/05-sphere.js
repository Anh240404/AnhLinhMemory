import './05-sphere.css';
import { h, nextButton, fill, loop, reducedMotion, wait } from '../lib/utils.js';

// [vĩ độ, số ô] — tổng 32 ô.
const BANDS = [[-60, 4], [-30, 7], [0, 10], [30, 7], [60, 4]];
const RAD = Math.PI / 180;
const TILT = -12;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

export default async function play(stage, ctx) {
  const { settings, photos } = ctx.content;
  const rm = reducedMotion();
  const urls = fill(photos.map((p) => p.url), 32);

  const ball = h('div', { class: 's5-ball' });
  const view = h('div', { class: 's5-view' }, h('div', { class: 's5-glow' }), ball);
  const wrap = h('div', { class: 's5-wrap' }, view,
    h('p', { class: 's5-caption' }, `“ ${settings.sphereCaption} ”`));
  stage.append(wrap);

  const tiles = [];
  BANDS.forEach(([lat, count], b) => {
    for (let i = 0; i < count; i++) {
      const img = h('img', { class: 's5-img', src: urls[tiles.length], alt: '', decoding: 'async', draggable: 'false' });
      img.addEventListener('error', () => img.classList.add('is-broken'), { once: true });
      const shade = h('div', { class: 's5-shade' });
      const el = h('div', { class: 's5-tile' }, img, shade);
      ball.append(el);
      tiles.push({
        el, shade, lat, count,
        lon: ((i + (b % 2) * 0.5) * 360) / count,
        a: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 320,
        op: -1,
      });
    }
  });

  let R = 0;
  let phase = rm ? 'home' : 'out';
  const home = (t) => `rotateY(${t.lon}deg) rotateX(${-t.lat}deg) translateZ(${R}px)`;
  const away = (t, z) => {
    const d = Math.max(innerWidth, innerHeight) * 1.15;
    return `translate3d(${Math.cos(t.a) * d}px, ${Math.sin(t.a) * d}px, ${R * z}px) ${home(t)} rotateZ(${t.spin}deg)`;
  };
  const place = (t) => (phase === 'out' ? away(t, 0.6) : phase === 'exit' ? away(t, 2.2) : home(t));

  function layout() {
    R = view.clientWidth / 2;
    if (!R) return;
    view.style.perspective = `${R * 4.5}px`;
    const th = ((R * Math.PI) / 6) * 0.94;
    for (const t of tiles) {
      const w = ((2 * Math.PI * R * Math.cos((Math.abs(t.lat) - 8) * RAD)) / t.count) * 0.94;
      const s = t.el.style;
      s.width = `${w}px`;
      s.height = `${th}px`;
      s.marginLeft = `${-w / 2}px`;
      s.marginTop = `${-th / 2}px`;
      s.transform = place(t);
    }
  }
  layout();
  const ro = new ResizeObserver(layout);
  ro.observe(view);

  // Xoay + quán tính (độ/giây).
  let rx = TILT, ry = 0, vRx = 0, vRy = 0, dragging = false, pid = null, lx = 0, ly = 0, lt = 0;
  const AUTO = rm ? 6 : 16;

  const stop = loop((dt) => {
    if (!dragging) {
      ry += (AUTO + vRy) * dt;
      rx += vRx * dt;
      const f = Math.exp(-dt * 2.2);
      vRx *= f;
      vRy *= f;
      if (Math.abs(vRx) < 2) rx += (TILT - rx) * Math.min(1, dt * 0.7);
    }
    rx = clamp(rx, -60, 60);
    ball.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;

    const sx = Math.sin(rx * RAD), cx = Math.cos(rx * RAD);
    for (const t of tiles) {
      const nz = Math.sin(t.lat * RAD) * sx + Math.cos(t.lat * RAD) * Math.cos((t.lon + ry) * RAD) * cx;
      const op = Math.round(((1 - nz) / 2) * 0.72 * 100) / 100;
      if (op !== t.op) {
        t.op = op;
        t.shade.style.opacity = op;
      }
    }
  });

  const endDrag = (e) => {
    if (e.pointerId !== pid) return;
    pid = null;
    dragging = false;
    if (e.timeStamp - lt > 90) vRx = vRy = 0;
    view.classList.remove('is-drag');
  };
  view.addEventListener('pointerdown', (e) => {
    if (pid !== null) return;
    pid = e.pointerId;
    view.setPointerCapture(pid);
    dragging = true;
    lx = e.clientX;
    ly = e.clientY;
    lt = e.timeStamp;
    vRx = vRy = 0;
    view.classList.add('is-drag');
  });
  view.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pid) return;
    const k = 180 / (Math.PI * (R || 150));
    const dx = (e.clientX - lx) * k, dy = (e.clientY - ly) * k;
    const s = Math.max(8, e.timeStamp - lt) / 1000;
    ry += dx;
    rx -= dy;
    vRy = clamp(vRy * 0.5 + (dx / s - AUTO) * 0.5, -720, 720);
    vRx = clamp(vRx * 0.5 + (-dy / s) * 0.5, -480, 480);
    lx = e.clientX;
    ly = e.clientY;
    lt = e.timeStamp;
  });
  view.addEventListener('pointerup', endDrag);
  view.addEventListener('pointercancel', endDrag);
  view.addEventListener('lostpointercapture', endDrag);

  // Mở màn: ảnh bay vào ghép thành cầu.
  if (rm) {
    tiles.forEach((t) => t.el.classList.add('is-home'));
  } else {
    await frame();
    phase = 'home';
    for (const t of tiles) {
      const d = (Math.random() * 0.4).toFixed(2);
      t.el.style.transition = `transform 1.1s var(--ease-out) ${d}s, opacity 0.5s ease ${d}s`;
      t.el.style.transform = home(t);
      t.el.classList.add('is-home');
    }
    await wait(1500);
  }

  await nextButton(stage);

  // Văng ảnh ra ngoài.
  phase = rm ? 'home' : 'exit';
  wrap.classList.add('is-out');
  for (const t of tiles) {
    const d = (Math.random() * 0.1).toFixed(2);
    t.el.style.transition = `transform 0.7s cubic-bezier(0.55, 0, 0.75, 0.3) ${d}s, opacity 0.6s ease ${d}s`;
    t.el.style.transform = place(t);
    t.el.classList.remove('is-home');
  }
  await wait(rm ? 300 : 820);
  stop();
  ro.disconnect();
}
