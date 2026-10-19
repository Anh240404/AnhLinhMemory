import './06-stats.css';
import { h, shine, nextButton, loop, reducedMotion, wait } from '../lib/utils.js';

const NUM = /^(\D*?)(\d{1,3}(?:([.,\s])\d{3})+|\d+)(\D*)$/;

function parse(v) {
  const raw = String(v ?? '').trim();
  const m = raw.match(NUM);
  return m ? { raw, pre: m[1], n: Number(m[2].replace(/\D/g, '')), sep: m[3] || '', post: m[4] } : { raw };
}

const fmt = (info, n) =>
  info.pre + (info.sep ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, info.sep) : String(n)) + info.post;

function daysSince(s) {
  let d = new Date(`${s}T00:00:00`);
  if (!Number.isFinite(d.getTime())) d = new Date(s);
  return Number.isFinite(d.getTime()) ? Math.max(0, Math.floor((Date.now() - d.getTime()) / 864e5)) : 0;
}

export default async function play(stage, ctx) {
  const { settings, stats } = ctx.content;
  const rm = reducedMotion();
  const counters = [];

  const card = (i, extraClass, icon, info, label, unit) => {
    const valueEl = h('span', { class: 's6-num' }, info.n != null && !rm ? fmt(info, 0) : info.raw);
    const delay = 0.35 + Math.min(i, 12) * 0.16;
    if (info.n != null && !rm) counters.push({ el: valueEl, info, start: delay + 0.25, dur: i === 0 ? 2.2 : 1.8 });
    const el = h('article', { class: `s6-card ${extraClass}` },
      h('div', { class: 's6-icon', 'aria-hidden': 'true' }, icon),
      h('div', { class: 's6-text' },
        i === 0 ? h('p', { class: 's6-label' }, label) : null,
        h('p', { class: 's6-value' }, valueEl, unit ? h('span', { class: 's6-unit' }, unit) : null),
        i === 0 ? null : h('p', { class: 's6-label' }, label)));
    el.style.setProperty('--d', `${delay}s`);
    return el;
  };

  const days = daysSince(settings.startDate);
  const grid = h('div', { class: 's6-grid' },
    card(0, 's6-card--hero', '💞', parse(String(days)), settings.counterLabel, ' ngày'),
    stats.map((s, i) => card(i + 1, '', s.icon, parse(s.value), s.label)));

  stage.append(h('div', { class: 's6-wrap' },
    h('div', { class: 's6-inner' }, h('h2', { class: 's6-title' }, shine(settings.statsTitle)), grid)));

  let stop = () => {};
  if (counters.length) {
    stop = loop((dt, t) => {
      let pending = 0;
      for (const c of counters) {
        if (c.done) continue;
        const p = Math.min(1, Math.max(0, (t - c.start) / c.dur));
        if (p >= 1) {
          c.el.textContent = c.info.raw;
          c.done = true;
          continue;
        }
        pending++;
        const n = Math.round(c.info.n * (1 - Math.pow(1 - p, 3)));
        if (n !== c.last) {
          c.last = n;
          c.el.textContent = fmt(c.info, n);
        }
      }
      if (!pending) stop();
    });
  }

  await wait(rm ? 200 : 1200);
  await nextButton(stage);
  stop();
}
