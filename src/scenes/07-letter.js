import './07-letter.css';
import { h, nextButton, fill, reducedMotion, wait } from '../lib/utils.js';

const HEART =
  '<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';

// [left %, top %, góc nghiêng]
const SPOTS = [[5, 7, -12], [38, 3, -4], [70, 8, 10], [3, 72, 8], [40, 80, 5], [73, 70, -9]];

const heart = (cls) => {
  const el = h('span', { class: cls, 'aria-hidden': 'true' });
  el.innerHTML = HEART;
  return el;
};

export default async function play(stage, ctx) {
  const { settings, photos } = ctx.content;
  const rm = reducedMotion();

  const floating = fill(photos, SPOTS.length).map((p, i) => {
    const [l, t, r] = SPOTS[i];
    const img = h('img', { class: 's7-pimg', src: p.url, alt: '', decoding: 'async', draggable: 'false' });
    img.addEventListener('error', () => img.classList.add('is-broken'), { once: true });
    const el = h('div', { class: 's7-photo' }, h('div', { class: 's7-pframe' }, img));
    el.style.left = `${l}%`;
    el.style.top = `${t}%`;
    el.style.setProperty('--r', `${r}deg`);
    el.style.setProperty('--d', `${i * 0.12}s`);
    el.style.setProperty('--f', `${3 + (i % 3) * 0.7}s`);
    return el;
  });

  const env = h('button', { class: 's7-env', type: 'button', 'aria-label': settings.letterTitle },
    h('span', { class: 's7-env-back' }),
    h('span', { class: 's7-env-paper' },
      h('span', { class: 's7-env-ptitle' }, settings.letterTitle),
      h('span', { class: 's7-env-lines' })),
    h('span', { class: 's7-env-front' }),
    h('span', { class: 's7-env-flap' }),
    heart('s7-seal'));
  const envWrap = h('div', { class: 's7-envwrap' }, h('span', { class: 's7-halo' }), env);

  const typed = document.createTextNode('');
  const body = h('div', { class: 's7-body' },
    h('p', { class: 's7-text' }, typed, h('span', { class: 's7-caret' })));
  const card = h('div', { class: 's7-card' },
    h('div', { class: 's7-sheet' },
      heart('s7-heart s7-heart--tr'),
      heart('s7-heart s7-heart--bl'),
      h('h2', { class: 's7-title' }, settings.letterTitle),
      body,
      h('p', { class: 's7-sign' }, settings.signature)));

  const wrap = h('div', { class: 's7-wrap' }, ...floating, envWrap, card);
  stage.append(wrap);

  // Chạm phong bì → nắp mở, thư trượt lên, phóng to.
  await new Promise((r) => env.addEventListener('click', r, { once: true }));
  env.disabled = true;
  wrap.classList.add('is-opened');
  env.classList.add('is-open');
  await wait(rm ? 0 : 420);
  env.classList.add('is-flapback');
  await wait(rm ? 0 : 900);
  envWrap.classList.add('is-gone');
  card.classList.add('is-shown');
  await wait(rm ? 0 : 750);

  // Gõ từng chữ; chạm thư để hiện hết.
  const chars = Array.from(settings.letterBody || '');
  let i = 0, timer = 0, done = false;
  await new Promise((resolve) => {
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      typed.data = chars.join('');
      card.classList.add('is-done');
      card.removeEventListener('click', finish);
      resolve();
    };
    const step = () => {
      if (i >= chars.length) return finish();
      const c = chars[i++];
      typed.appendData(c);
      if (body.scrollHeight > body.clientHeight) body.scrollTop = body.scrollHeight;
      timer = setTimeout(step, /[.,!?…\n]/.test(c) ? 240 : 38);
    };
    card.addEventListener('click', finish);
    if (rm) finish();
    else step();
  });

  await nextButton(stage);
}
