import { dpr, isSmall, loop, reducedMotion } from './utils.js';

/** Nền sao lấp lánh cố định phía sau mọi scene: sao nhấp nháy, sao băng thỉnh thoảng bay qua, tim mờ bay lên. */
export function startStarfield(canvas) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, stars = [], hearts = [];
  const rand = (a, b) => a + Math.random() * (b - a);

  const newHeart = (y) => ({
    x: Math.random() * w,
    y: y ?? h + 20,
    s: rand(5, 11),
    v: rand(8, 20),
    p: Math.random() * Math.PI * 2,
    a: rand(0.08, 0.2),
  });

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
    hearts = Array.from({ length: isSmall() ? 7 : 12 }, () => newHeart(Math.random() * h));
  }
  resize();
  addEventListener('resize', resize);

  function heartPath(x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45);
    ctx.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35);
    ctx.fill();
  }

  // Sao băng: tối đa 1 cái cùng lúc, 3–8 giây một lần.
  let meteor = null, nextMeteor = rand(1.5, 4);
  function spawnMeteor() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const ang = rand(0.35, 0.6);
    meteor = {
      x: dir > 0 ? rand(-0.1, 0.5) * w : rand(0.5, 1.1) * w,
      y: rand(-0.05, 0.35) * h,
      vx: Math.cos(ang) * dir * rand(650, 900),
      vy: Math.sin(ang) * rand(650, 900),
      life: 0,
      max: rand(0.7, 1.1),
    };
  }

  const still = reducedMotion();
  const draw = (dt, t) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    for (const s of stars) {
      ctx.globalAlpha = still ? 0.7 : 0.35 + 0.65 * Math.abs(Math.sin(s.p + t * s.s));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#f9a8d4';
    for (const ht of hearts) {
      ht.y -= ht.v * dt;
      if (ht.y < -20) Object.assign(ht, newHeart());
      ctx.globalAlpha = ht.a;
      heartPath(ht.x + Math.sin(t * 0.8 + ht.p) * 12, ht.y, ht.s);
    }

    if (!still) {
      nextMeteor -= dt;
      if (!meteor && nextMeteor <= 0) spawnMeteor();
      if (meteor) {
        const m = meteor;
        m.life += dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const k = m.life / m.max;
        const tail = 0.16;
        const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail, m.y - m.vy * tail);
        grad.addColorStop(0, 'rgba(255,255,255,0.95)');
        grad.addColorStop(0.3, 'rgba(249,168,212,0.5)');
        grad.addColorStop(1, 'rgba(192,132,252,0)');
        ctx.globalAlpha = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * tail, m.y - m.vy * tail);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        if (m.life >= m.max) { meteor = null; nextMeteor = rand(3, 8); }
      }
    }
    ctx.globalAlpha = 1;
  };

  if (still) { draw(0, 0); return () => removeEventListener('resize', resize); }
  const stop = loop(draw);
  return () => { stop(); removeEventListener('resize', resize); };
}
