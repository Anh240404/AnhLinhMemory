import './08-finale.css';
import { h, shine, dpr, isSmall, loop, reducedMotion } from '../lib/utils.js';

const COLORS = ['#f472b6', '#fb7185', '#c084fc', '#fde2ea', '#e9c98b', '#ff4d8d'];

function heartSprite(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.translate(32, 33);
  g.scale(19, 19);
  g.beginPath();
  g.moveTo(0, 0.9);
  g.bezierCurveTo(-1.15, 0.1, -1.0, -0.95, 0, -0.42);
  g.bezierCurveTo(1.0, -0.95, 1.15, 0.1, 0, 0.9);
  g.shadowColor = color;
  g.shadowBlur = 12;
  g.fillStyle = color;
  g.fill();
  return c;
}

function fireworks(stage) {
  const cv = h('canvas', { class: 's8-canvas', 'aria-hidden': 'true' });
  stage.prepend(cv);
  const g = cv.getContext('2d');
  let W = 0, H = 0, D = 1;
  const size = () => {
    D = dpr();
    W = stage.clientWidth;
    H = stage.clientHeight;
    cv.width = Math.round(W * D);
    cv.height = Math.round(H * D);
  };
  size();
  new ResizeObserver(size).observe(stage);

  const sprites = COLORS.map(heartSprite);
  const small = isSmall();
  const MAX = small ? 600 : 1200;
  const parts = [];
  const pick = () => sprites[(Math.random() * sprites.length) | 0];

  function burst() {
    const cx = W * (0.15 + Math.random() * 0.7);
    const cy = H * (0.14 + Math.random() * 0.42);
    const n = small ? 40 : 70;
    const shaped = Math.random() < 0.55;
    const spr = pick();
    const k = (0.8 + Math.random() * 0.5) * Math.min(W, 700) / 34;
    parts.push({ x: cx, y: cy, vx: 0, vy: 0, age: 0, life: 0.35, size: 90, spr, g: 0 });
    for (let i = 0; i < n && parts.length < MAX; i++) {
      let vx, vy;
      if (shaped) {
        const a = (i / n) * Math.PI * 2;
        vx = 16 * Math.sin(a) ** 3 * k * 0.9;
        vy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * k * 0.9;
      } else {
        const a = Math.random() * Math.PI * 2, v = (0.4 + Math.random()) * k * 14;
        vx = Math.cos(a) * v;
        vy = Math.sin(a) * v;
      }
      parts.push({
        x: cx, y: cy, vx, vy, age: 0,
        life: 1.3 + Math.random() * 0.8,
        size: (small ? 9 : 12) + Math.random() * 8,
        spr: shaped ? spr : pick(),
        g: shaped ? 25 : 70,
      });
    }
  }

  function fall() {
    if (parts.length >= MAX) return;
    parts.push({
      x: Math.random() * W, y: -24, vy: 30 + Math.random() * 45, age: 0, fall: true,
      size: 10 + Math.random() * 16, spr: pick(), ph: Math.random() * 6,
      sway: 18 + Math.random() * 28, a: 0.45 + Math.random() * 0.45,
    });
  }

  let nextBurst = 0, acc = 0;
  loop((dt, t) => {
    if (t < 3.2 && t >= nextBurst) {
      burst();
      nextBurst = t + 0.26 + Math.random() * 0.22;
    }
    if (t > 2.2) {
      acc += dt * (small ? 2.5 : 4);
      for (; acc >= 1; acc--) fall();
    }

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = 'lighter';
    const drag = Math.exp(-dt * 1.7);

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      let alpha, rot = 0;
      if (p.fall) {
        p.y += p.vy * dt;
        p.x += Math.cos(t * 1.3 + p.ph) * p.sway * dt;
        rot = Math.sin(t * 1.5 + p.ph) * 0.4;
        alpha = p.a * Math.min(1, p.age * 2);
        if (p.y > H + 30) alpha = -1;
      } else {
        p.vx *= drag;
        p.vy = p.vy * drag + p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const q = p.age / p.life;
        alpha = q >= 1 ? -1 : 1 - q * q;
      }
      if (alpha < 0) {
        parts[i] = parts[parts.length - 1];
        parts.pop();
        continue;
      }
      g.globalAlpha = alpha;
      const c = Math.cos(rot) * D, s = Math.sin(rot) * D;
      g.setTransform(c, s, -s, c, p.x * D, p.y * D);
      g.drawImage(p.spr, -p.size / 2, -p.size / 2, p.size, p.size);
    }
  });
}

export default async function play(stage, ctx) {
  const { settings } = ctx.content;
  const rm = reducedMotion();

  const yes = h('button', { class: 's8-yes', type: 'button' }, settings.finalYes);
  const no = h('button', { class: 's8-no', type: 'button' }, settings.finalNo);
  const ask = h('div', { class: 's8-ask' },
    h('h1', { class: 's8-q' }, shine(settings.finalQuestion)),
    h('div', { class: 's8-btns' }, yes, no));
  const thanks = h('p', { class: 's8-thanks', 'aria-live': 'polite' }, shine(settings.finalThanks));
  stage.append(ask, thanks);

  let scale = 1, freed = false, lock = 0, done = false;

  function dodge(px, py) {
    const now = performance.now();
    if (done || now < lock) return;
    lock = now + 220;

    const sr = stage.getBoundingClientRect();
    if (!freed) {
      freed = true;
      const r = no.getBoundingClientRect();
      no.classList.add('is-free');
      no.style.transition = 'none';
      no.style.transform = `translate(${r.left - sr.left}px, ${r.top - sr.top}px)`;
      stage.append(no);
      void no.offsetWidth;
      no.style.transition = '';
    }

    scale = Math.min(scale + 0.13, 1.9);
    yes.style.transform = `scale(${scale})`;

    const W = sr.width, H = sr.height, nw = no.offsetWidth, nh = no.offsetHeight;
    const yr = yes.getBoundingClientRect();
    const ycx = (yr.left + yr.right) / 2 - sr.left, ycy = (yr.top + yr.bottom) / 2 - sr.top;
    const yhw = (yes.offsetWidth * scale) / 2 + 18, yhh = (yes.offsetHeight * scale) / 2 + 18;
    const pX = px - sr.left, pY = py - sr.top;
    const top = 64, bottom = 24, m = 14;

    let best = null, bestD = -1;
    for (let i = 0; i < 40; i++) {
      const x = m + Math.random() * Math.max(0, W - nw - 2 * m);
      const y = top + Math.random() * Math.max(0, H - nh - top - bottom);
      const hitYes = x < ycx + yhw && x + nw > ycx - yhw && y < ycy + yhh && y + nh > ycy - yhh;
      if (hitYes) continue;
      const d = Math.hypot(x + nw / 2 - pX, y + nh / 2 - pY);
      if (d > bestD) { best = [x, y]; bestD = d; }
      if (d > 140) break;
    }
    if (best) no.style.transform = `translate(${best[0]}px, ${best[1]}px)`;
  }

  no.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    e.preventDefault();
    dodge(e.clientX, e.clientY);
  });
  no.addEventListener('click', (e) => {
    e.preventDefault();
    const r = no.getBoundingClientRect();
    dodge((r.left + r.right) / 2, (r.top + r.bottom) / 2);
  });
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || done) return;
    const r = no.getBoundingClientRect();
    const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
    const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
    if (Math.hypot(dx, dy) < 40) dodge(e.clientX, e.clientY);
  });

  yes.addEventListener('click', () => {
    done = true;
    ask.classList.add('is-gone');
    no.classList.add('is-gone');
    thanks.classList.add('is-shown');
    if (!rm) fireworks(stage);
  }, { once: true });

  // Cảnh cuối: không bao giờ resolve.
  return new Promise(() => {});
}
