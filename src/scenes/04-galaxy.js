import './04-galaxy.css';
import { h, wait, nextButton, loop, dpr, isSmall, reducedMotion, fill } from '../lib/utils.js';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

function sprite(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.18, inner);
  gr.addColorStop(0.5, outer);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  return c;
}

function flowerParticles(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const petal = i % 5;
    const u = rand(-0.5, 0.5) * (TAU / 5);
    const env = Math.pow(Math.cos(u * 2.5), 0.55);
    // dồn nhiều hạt về mép cánh cho viền sáng
    const k = Math.random() < 0.32 ? rand(0.84, 1) : Math.sqrt(Math.random());
    const rad = env * k * 1.0 + (Math.random() < 0.08 ? rand(0, 0.12) : 0);
    out.push({
      ang: petal * (TAU / 5) - Math.PI / 2 + u,
      rad,
      size: Math.random() < 0.08 ? rand(5, 9) : rand(1.6, 4.2),
      tw: rand(0, TAU),
      tws: rand(1.2, 3.5),
      spr: rad < 0.35 ? 0 : Math.random() < 0.55 ? 1 : 2,
    });
  }
  return out;
}

function diskParticles(n) {
  return Array.from({ length: n }, () => ({
    a: rand(0, TAU),
    r: Math.random() < 0.6 ? rand(0.55, 0.95) : rand(0.4, 1.35),
    w: rand(0.35, 0.9),
    size: rand(1.4, 3.6),
    spr: Math.random() < 0.6 ? 1 : 0,
  }));
}

export default async function play(stage, ctx) {
  const { settings: s, photos, messages } = ctx.content;
  const reduce = reducedMotion();
  const small = isSmall();

  const canvas = h('canvas', { class: 's4-canvas' });
  const layer = h('div', { class: 's4-layer' });
  const lbImg = h('img', { class: 's4-lb-img', alt: '' });
  const lbCap = h('p', { class: 's4-lb-cap' });
  const lightbox = h('div', { class: 's4-lb' }, h('figure', { class: 's4-lb-fig' }, lbImg, lbCap));
  const caption = h('p', { class: 's4-caption' }, s.galaxyCaption);
  stage.append(canvas, layer, caption, lightbox);

  const g = canvas.getContext('2d');
  const sprites = [sprite('#fff1fb', 'rgba(251,182,230,0.35)'), sprite('#ffb3e6', 'rgba(236,72,153,0.32)'), sprite('#e2b8ff', 'rgba(147,51,234,0.32)')];
  const flower = flowerParticles(small ? 880 : 1700);
  const disk = diskParticles(small ? 300 : 520);

  let W = 0, H = 0, cx = 0, cy = 0, R = 0, bx = 0, by = 0;
  const resize = () => {
    const d = dpr();
    W = stage.clientWidth || innerWidth;
    H = stage.clientHeight || innerHeight;
    canvas.width = Math.round(W * d);
    canvas.height = Math.round(H * d);
    g.setTransform(d, 0, 0, d, 0, 0);
    cx = W / 2;
    cy = H * 0.36;
    R = Math.min(W * 0.3, H * 0.19, 260);
    bx = cx;
    by = cy + R * 1.6;
  };
  resize();

  // --- Ảnh + lời nhắn bay theo quỹ đạo ---
  const photoList = fill(photos, Math.min(16, Math.max(photos.length, 10)));
  const msgList = fill(messages, Math.min(12, Math.max(messages.length, 8)));

  const openPhoto = (p) => {
    lbImg.src = p.url;
    lbCap.textContent = p.caption || '';
    lbCap.hidden = !p.caption;
    lightbox.classList.add('s4-lb--on');
  };
  const closePhoto = () => lightbox.classList.remove('s4-lb--on');
  lightbox.addEventListener('click', closePhoto);

  const items = [];
  const addItem = (el) => {
    layer.append(el);
    items.push({
      el,
      a: rand(0, TAU),
      w: rand(0.05, 0.11) * (Math.random() < 0.5 ? -1 : 1),
      rx: rand(0.35, 0.82),
      ry: rand(0.15, 0.7),
      phi: rand(-0.3, 0.3),
      yo: rand(-0.08, 0.06),
      hw: 0, hh: 0, z: 0,
    });
  };
  photoList.forEach((p) => {
    const img = h('img', { class: 's4-photo-img', src: p.url, alt: '', loading: 'eager', decoding: 'async', draggable: 'false' });
    img.addEventListener('error', () => img.classList.add('s4-photo-img--err'), { once: true });
    addItem(h('button', { class: 's4-photo', type: 'button', 'aria-label': p.caption || 'Ảnh', onclick: () => openPhoto(p) }, img));
  });
  msgList.forEach((m) => addItem(h('span', { class: 's4-msg' }, m.text)));

  const measure = () => {
    for (const it of items) {
      it.hw = it.el.offsetWidth / 2;
      it.hh = it.el.offsetHeight / 2;
    }
  };
  measure();
  const onResize = () => { resize(); measure(); if (reduce) frame(0, 0); };
  window.addEventListener('resize', onResize);

  let rot = 0;
  const speed = reduce ? 0 : 1;

  function placeItems(dt) {
    // Giữ quỹ đạo trong phần trên màn hình, chừa chỗ cho caption + nút Tiếp.
    const ax = W * 0.5, ay = H * 0.34;
    for (const it of items) {
      it.a += it.w * dt * speed;
      const lx = Math.cos(it.a) * it.rx * ax;
      const ly = Math.sin(it.a) * it.ry * ay;
      const c = Math.cos(it.phi), sn = Math.sin(it.phi);
      const x = cx + lx * c - ly * sn;
      const y = cy + R * 0.7 + it.yo * H + lx * sn + ly * c;
      const z = Math.sin(it.a);
      const f = (z + 1) / 2;
      const sc = 0.5 + 0.5 * f;
      const px = Math.min(Math.max(x - it.hw, 6), W - it.hw * 2 - 6);
      it.el.style.transform = `translate3d(${px.toFixed(1)}px,${(y - it.hh).toFixed(1)}px,0) scale(${sc.toFixed(3)})`;
      it.el.style.opacity = (0.25 + 0.75 * f).toFixed(3);
      const front = z > 0;
      if (front !== it.front) {
        it.front = front;
        it.el.style.zIndex = front ? 3 : 1;
      }
    }
  }

  function drawFlower(t) {
    const breathe = 1 + 0.035 * Math.sin(t * 1.4);
    const glow = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5);
    glow.addColorStop(0, 'rgba(236,72,153,0.22)');
    glow.addColorStop(0.45, 'rgba(147,51,234,0.12)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow;
    g.fillRect(cx - R * 1.5, cy - R * 1.5, R * 3, R * 3);

    const k = R * breathe;
    for (const p of flower) {
      const a = p.ang + rot;
      const x = cx + Math.cos(a) * p.rad * k;
      const y = cy + Math.sin(a) * p.rad * k;
      g.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(p.tw + t * p.tws));
      const sz = p.size * (small ? 1 : 1.2);
      g.drawImage(sprites[p.spr], x - sz, y - sz, sz * 2, sz * 2);
    }
    g.globalAlpha = 1;
  }

  function drawDisk(dt, front) {
    const rx = R * 0.8, ry = R * 0.17;
    for (const p of disk) {
      if (front) p.a += p.w * dt * speed;
      const sn = Math.sin(p.a);
      if (sn > 0 !== front) continue;
      const x = bx + Math.cos(p.a) * p.r * rx;
      const y = by + sn * p.r * ry;
      g.globalAlpha = 0.5 + 0.5 * (1 - Math.abs(p.r - 0.75));
      g.drawImage(sprites[p.spr], x - p.size, y - p.size, p.size * 2, p.size * 2);
    }
    g.globalAlpha = 1;
  }

  function drawHole(t) {
    const rx = R * 0.8;
    // quầng elip hồng
    g.save();
    g.translate(bx, by);
    g.scale(1, 0.22);
    const halo = g.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx * 1.5);
    halo.addColorStop(0, 'rgba(255,190,235,0.9)');
    halo.addColorStop(0.35, 'rgba(244,114,182,0.55)');
    halo.addColorStop(0.7, 'rgba(168,85,247,0.18)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = halo;
    g.beginPath();
    g.arc(0, 0, rx * 1.5, 0, TAU);
    g.fill();
    g.restore();
  }

  function drawCore(t) {
    const rx = R * 0.8, ry = R * 0.17, cr = R * 0.2;
    g.globalCompositeOperation = 'source-over';
    const core = g.createRadialGradient(bx, by - cr * 0.1, cr * 0.5, bx, by, cr * 1.15);
    core.addColorStop(0, '#000');
    core.addColorStop(0.8, '#05010a');
    core.addColorStop(0.92, 'rgba(236,120,200,0.85)');
    core.addColorStop(1, 'rgba(236,120,200,0)');
    g.fillStyle = core;
    g.beginPath();
    g.arc(bx, by, cr * 1.15, 0, TAU);
    g.fill();
    g.globalCompositeOperation = 'lighter';
    // vòng sáng phía trước
    g.lineWidth = Math.max(1.5, R * 0.02);
    g.strokeStyle = `rgba(255,170,225,${0.65 + 0.2 * Math.sin(t * 2)})`;
    g.shadowColor = 'rgba(244,114,182,0.9)';
    g.shadowBlur = 12;
    g.beginPath();
    g.ellipse(bx, by, rx * 0.68, ry * 0.68, 0, 0, Math.PI);
    g.stroke();
    g.shadowBlur = 0;
  }

  function frame(dt, t) {
    rot += dt * 0.14 * speed;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    drawFlower(t);
    drawHole(t);
    drawDisk(dt, false);
    drawCore(t);
    drawDisk(dt, true);
    g.globalCompositeOperation = 'source-over';
    placeItems(dt);
  }

  let stop = () => {};
  if (reduce) frame(0, 0);
  else stop = loop(frame);

  await wait(4000);
  await nextButton(stage);

  stop();
  window.removeEventListener('resize', onResize);
  lightbox.removeEventListener('click', closePhoto);
}
