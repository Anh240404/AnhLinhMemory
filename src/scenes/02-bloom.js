import './02-bloom.css';
import { h, wait, isSmall, reducedMotion } from '../lib/utils.js';

const NS = 'http://www.w3.org/2000/svg';
const PETAL = 'M0,2 C-19,-4 -28,-33 -13,-44 C-7,-49 -3,-44 0,-46 C3,-44 7,-49 13,-44 C28,-33 19,-4 0,2Z';

// [mép cánh, giữa, lõi tối, viền]
const PALETTES = [
  ['#ffe4ec', '#f9a8c4', '#d9467a', '#c2386b'], // hồng phấn
  ['#fffaf2', '#f6e3d3', '#d9a98f', '#c99a83'], // trắng kem
  ['#ffd0d6', '#f0566e', '#9f1239', '#881337'], // đỏ
  ['#fff0f5', '#fbc4d6', '#e77fa3', '#d26690'], // hồng nhạt
];

function svg(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...kids);
  return el;
}

function ring(n, scale, offset, fill, stroke) {
  return svg('g', { fill, stroke, 'stroke-width': 0.7, 'stroke-opacity': 0.45 },
    ...Array.from({ length: n }, (_, i) =>
      svg('path', { d: PETAL, transform: `rotate(${offset + (i * 360) / n}) scale(${scale})` })));
}

function roseDefs() {
  const defs = svg('defs');
  PALETTES.forEach(([edge, mid, core, line], k) => {
    defs.append(
      svg('linearGradient', { id: `s2-g${k}`, x1: 0, y1: 0, x2: 0, y2: 1 },
        svg('stop', { offset: '0', 'stop-color': edge }),
        svg('stop', { offset: '0.5', 'stop-color': mid }),
        svg('stop', { offset: '1', 'stop-color': core })),
      svg('linearGradient', { id: `s2-h${k}`, x1: 0, y1: 0, x2: 0, y2: 1 },
        svg('stop', { offset: '0', 'stop-color': mid }),
        svg('stop', { offset: '1', 'stop-color': core })),
      svg('g', { id: `s2-rose${k}` },
        ring(6, 1.05, 0, `url(#s2-g${k})`, line),
        ring(5, 0.78, 30, `url(#s2-g${k})`, line),
        ring(5, 0.55, 8, `url(#s2-h${k})`, line),
        ring(4, 0.34, 50, `url(#s2-h${k})`, line),
        svg('circle', { r: 6.5, fill: core }),
        svg('path', {
          d: 'M-4,1 C-4,-5 5,-5 5,0 C5,5 -2,6 -3,2 C-3,-1 2,-2 2,1',
          fill: 'none', stroke: edge, 'stroke-width': 1.2, 'stroke-opacity': 0.7, 'stroke-linecap': 'round',
        })));
  });
  return svg('svg', { class: 's2-defs', width: 0, height: 0, 'aria-hidden': 'true' }, defs);
}

const rand = (a, b) => a + Math.random() * (b - a);

export default async function play(stage) {
  const reduce = reducedMotion();
  const field = h('div', { class: 's2-field' });
  const text = h('p', { class: 's2-text' }, 'Chúc mừng ngày 20 tháng 10');
  stage.append(roseDefs(), field, text);

  const w = stage.clientWidth || innerWidth;
  const ht = stage.clientHeight || innerHeight;
  const cx = w / 2, cy = ht / 2;
  const s = Math.max(w, ht) / (isSmall() ? 5.6 : 7);
  const rowH = s * 0.86;
  const cells = [];
  for (let r = -1; r * rowH < ht + s; r++) {
    for (let c = -1; c * s < w + s; c++) {
      const x = c * s + (r % 2 ? s / 2 : 0) + rand(-0.18, 0.18) * s;
      const y = r * rowH + rand(-0.18, 0.18) * s;
      cells.push({ x, y, d: Math.hypot(x - cx, y - cy) });
    }
  }
  cells.push({ x: cx, y: cy, d: 0, hero: true });
  const maxD = Math.max(...cells.map((c) => c.d)) || 1;
  cells.sort((a, b) => b.d - a.d);

  const roses = cells.map((c) => {
    const size = c.hero ? s * 2 : s * rand(1.25, 1.65);
    const pal = c.hero ? 0 : Math.random() < 0.42 ? 0 : Math.random() < 0.55 ? 1 : Math.random() < 0.6 ? 3 : 2;
    const el = svg('svg', {
      class: 's2-rose',
      viewBox: '-50 -50 100 100',
      style: [
        `left:${c.x - size / 2}px`, `top:${c.y - size / 2}px`, `width:${size}px`, `height:${size}px`,
        `--rot:${rand(-30, 30).toFixed(1)}deg`,
        `--dl:${((c.d / maxD) * 2.3).toFixed(2)}s`,
        `--fx:${rand(-60, 60).toFixed(0)}px`,
        `--fr:${rand(-160, 160).toFixed(0)}deg`,
        `--fd:${rand(0, 0.9).toFixed(2)}s`,
        `--ft:${rand(1.5, 2.1).toFixed(2)}s`,
      ].join(';'),
    }, svg('use', { href: `#s2-rose${pal}` }));
    return el;
  });
  field.append(...roses);

  void field.offsetWidth;
  stage.classList.add('s2--bloom');

  await wait(reduce ? 1800 : 3300 + 1000);

  if (!reduce) {
    const petals = Array.from({ length: isSmall() ? 22 : 36 }, () =>
      h('i', {
        class: 's2-petal',
        style: [
          `left:${rand(0, 100).toFixed(1)}%`,
          `--pd:${rand(0, 1.2).toFixed(2)}s`,
          `--pt:${rand(1.8, 2.8).toFixed(2)}s`,
          `--px:${rand(-80, 80).toFixed(0)}px`,
          `--pr:${rand(180, 720).toFixed(0)}deg`,
          `--ps:${rand(0.6, 1.3).toFixed(2)}`,
          `--pc:${['#f9a8c4', '#fff1f2', '#fb7185', '#fbcfe8'][Math.floor(Math.random() * 4)]}`,
        ].join(';'),
      }));
    stage.append(...petals);
  }
  stage.classList.add('s2--fall');
  await wait(reduce ? 700 : 3000);
}
