import { dpr, isSmall, reducedMotion } from './utils.js';

const COLORS = ['#ff8fc7', '#ffd1e8', '#f9a8d4', '#c4b5fd', '#fde68a', '#ffffff'];
const TAU = Math.PI * 2;

/**
 * Lớp canvas phủ trên cùng (không chặn bấm): chạm/vuốt bung tim + hạt lấp lánh,
 * sweep() rắc một vệt bụi sao chéo màn hình khi chuyển cảnh. rAF chỉ chạy khi còn hạt.
 */
export function startSparkles() {
  const canvas = document.createElement('canvas');
  canvas.className = 'sparkle-layer';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const g = canvas.getContext('2d');
  const still = reducedMotion();
  const MAX = isSmall() ? 180 : 320;

  let W = 0, H = 0;
  const resize = () => {
    const r = dpr();
    W = innerWidth;
    H = innerHeight;
    canvas.width = W * r;
    canvas.height = H * r;
    g.setTransform(r, 0, 0, r, 0, 0);
  };
  resize();
  addEventListener('resize', resize);

  const parts = [];
  let sweepT = -1; // tiến độ vệt sáng chuyển cảnh (0→1), -1 = không chạy
  let raf = 0, last = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[(Math.random() * a.length) | 0];

  function add(p) {
    if (parts.length >= MAX) parts.shift();
    parts.push(p);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }

  function heart(x, y, speed = 1) {
    const a = rand(-Math.PI * 0.85, -Math.PI * 0.15);
    const v = rand(60, 170) * speed;
    add({ kind: 0, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: -30, size: rand(7, 14), rot: rand(-0.5, 0.5),
      vr: rand(-2, 2), life: 0, max: rand(0.9, 1.5), color: pick(COLORS.slice(0, 4)) });
  }

  function star(x, y, speed = 1, max = rand(0.5, 1)) {
    const a = rand(0, TAU);
    const v = rand(20, 140) * speed;
    add({ kind: 1, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 60, size: rand(2.5, 6), rot: rand(0, TAU),
      vr: rand(-3, 3), life: 0, max, color: pick(COLORS) });
  }

  function burst(x, y) {
    for (let i = 0; i < 6; i++) heart(x, y);
    for (let i = 0; i < 10; i++) star(x, y, 1.3);
  }

  function drawHeart(s) {
    g.beginPath();
    g.moveTo(0, s * 0.35);
    g.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.45, -s * 1.05, 0, -s * 0.45);
    g.bezierCurveTo(s * 0.45, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35);
    g.fill();
  }

  function drawStar(s) {
    g.beginPath();
    g.moveTo(0, -s * 2);
    g.quadraticCurveTo(0, 0, s * 2, 0);
    g.quadraticCurveTo(0, 0, 0, s * 2);
    g.quadraticCurveTo(0, 0, -s * 2, 0);
    g.quadraticCurveTo(0, 0, 0, -s * 2);
    g.fill();
    g.beginPath();
    g.arc(0, 0, s * 0.5, 0, TAU);
    g.fill();
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    g.clearRect(0, 0, W, H);

    if (sweepT >= 0) {
      sweepT += dt / 0.75;
      // Vệt sáng chéo đi từ trái-trên sang phải-dưới, rắc bụi sao dọc theo vệt.
      const span = W + H;
      const c = -H * 0.6 + sweepT * (span + H * 0.6);
      const grad = g.createLinearGradient(c - 140, 0, c + 140, H * 0.5);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,214,236,0.16)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 5; i++) {
        const y = rand(0, H);
        star(c - y * 0.5 + rand(-40, 40), y, 0.5, rand(0.6, 1.2));
      }
      if (sweepT >= 1) sweepT = -1;
    }

    g.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.vx *= 0.97;
      p.vy = p.vy * 0.97 + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const k = p.life / p.max;
      g.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      g.fillStyle = p.color;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      if (p.kind === 0) drawHeart(p.size * (1 - k * 0.3));
      else drawStar(p.size * (0.6 + 0.4 * Math.sin(k * Math.PI)));
      g.restore();
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    raf = parts.length || sweepT >= 0 ? requestAnimationFrame(tick) : 0;
    if (!raf) g.clearRect(0, 0, W, H);
  }

  let lastTrail = 0;
  addEventListener('pointerdown', (e) => burst(e.clientX, e.clientY), { passive: true });
  if (!still) {
    addEventListener('pointermove', (e) => {
      // Vuốt (đang chạm) hoặc rê chuột: để lại vệt lấp lánh, giới hạn ~30 lần/giây.
      if (e.pointerType !== 'mouse' && !e.buttons && e.pressure === 0) return;
      const t = performance.now();
      if (t - lastTrail < 33) return;
      lastTrail = t;
      star(e.clientX, e.clientY, 0.35, rand(0.4, 0.8));
      if (Math.random() < 0.15) heart(e.clientX, e.clientY, 0.4);
    }, { passive: true });
  }

  return {
    sweep() {
      if (still) return;
      sweepT = 0;
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    },
  };
}
