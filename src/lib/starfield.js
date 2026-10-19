import { dpr, isSmall, loop, reducedMotion } from './utils.js';

/** Nền sao lấp lánh cố định phía sau mọi scene. */
export function startStarfield(canvas) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, stars = [];

  function resize() {
    const r = dpr();
    w = innerWidth; h = innerHeight;
    canvas.width = w * r; canvas.height = h * r;
    ctx.setTransform(r, 0, 0, r, 0, 0);
    const n = isSmall() ? 140 : 260;
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.3 + 0.2,
      p: Math.random() * Math.PI * 2,
      s: Math.random() * 1.5 + 0.5,
    }));
  }
  resize();
  addEventListener('resize', resize);

  const still = reducedMotion();
  const draw = (_, t) => {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const a = still ? 0.7 : 0.35 + 0.65 * Math.abs(Math.sin(s.p + t * s.s));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  if (still) { draw(0, 0); return () => removeEventListener('resize', resize); }
  const stop = loop(draw);
  return () => { stop(); removeEventListener('resize', resize); };
}
