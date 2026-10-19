import './01-intro.css';
import { h, wait, reducedMotion } from '../lib/utils.js';

const NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...kids);
  return el;
}

function flower() {
  const petals = Array.from({ length: 5 }, (_, i) =>
    svg('ellipse', { cx: 100, cy: 58, rx: 25, ry: 44, transform: `rotate(${i * 72} 100 100)` }));
  const inner = Array.from({ length: 5 }, (_, i) =>
    svg('ellipse', { cx: 100, cy: 74, rx: 12, ry: 24, transform: `rotate(${i * 72 + 36} 100 100)` }));
  return svg('svg', { class: 's1-flower', viewBox: '0 0 200 200', 'aria-hidden': 'true' },
    svg('defs', {},
      svg('radialGradient', { id: 's1-grad', cx: 100, cy: 100, r: 100, gradientUnits: 'userSpaceOnUse' },
        svg('stop', { offset: '0', 'stop-color': '#ffffff' }),
        svg('stop', { offset: '0.35', 'stop-color': '#fbe7ff' }),
        svg('stop', { offset: '0.75', 'stop-color': '#d8b4fe' }),
        svg('stop', { offset: '1', 'stop-color': '#a78bfa' })),
      svg('radialGradient', { id: 's1-core', cx: 100, cy: 100, r: 30, gradientUnits: 'userSpaceOnUse' },
        svg('stop', { offset: '0', 'stop-color': '#fff' }),
        svg('stop', { offset: '1', 'stop-color': '#fbcfe8' }))),
    svg('g', { fill: 'url(#s1-grad)' }, ...petals),
    svg('g', { fill: '#ffffff', opacity: '0.55' }, ...inner),
    svg('circle', { cx: 100, cy: 100, r: 14, fill: 'url(#s1-core)' }));
}

export default async function play(stage, ctx) {
  const s = ctx.content.settings;
  stage.classList.add('s1');

  const sparkles = Array.from({ length: 10 }, (_, i) =>
    h('span', {
      class: 's1-spark',
      style: `--a:${i * 36}deg;--d:${(i % 3) * 0.7}s;--r:${0.42 + (i % 4) * 0.06}`,
    }));

  const star = h('div', { class: 's1-star' },
    h('div', { class: 's1-halo' }),
    h('div', { class: 's1-orbit' }, sparkles),
    flower());

  const btn = h('button', { class: 's1-btn', type: 'button' }, s.introButton);
  const flash = h('div', { class: 's1-flash' });

  stage.append(
    h('div', { class: 's1-wrap' },
      star,
      h('div', { class: 's1-text' },
        h('h1', { class: 's1-title' }, s.introTitle),
        h('p', { class: 's1-sub' }, s.introSubtitle),
        btn)),
    flash);

  await new Promise((resolve) => {
    btn.addEventListener('click', () => {
      ctx.music.play();
      btn.disabled = true;
      resolve();
    }, { once: true });
  });

  stage.classList.add('s1--open');
  await wait(reducedMotion() ? 200 : 1100);
}
