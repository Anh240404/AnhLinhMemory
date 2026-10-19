import './styles/base.css';
import { fetchContent } from './lib/content.js';
import { startStarfield } from './lib/starfield.js';
import { createMusic } from './lib/music.js';
import { wait } from './lib/utils.js';

import intro from './scenes/01-intro.js';
import bloom from './scenes/02-bloom.js';
import calendar from './scenes/03-calendar.js';
import galaxy from './scenes/04-galaxy.js';
import sphere from './scenes/05-sphere.js';
import stats from './scenes/06-stats.js';
import letter from './scenes/07-letter.js';
import finale from './scenes/08-finale.js';
import reel from './scenes/09-reel.js';

// Thứ tự cảnh do mảng này quyết định (số trong tên file chỉ là mã cảnh).
const SCENES = [intro, bloom, calendar, galaxy, sphere, reel, stats, letter, finale];

async function run() {
  startStarfield(document.getElementById('sky'));
  const root = document.getElementById('app');

  const content = await fetchContent();
  document.title = `Gửi ${content.settings.herName} 💖`;
  const ctx = { content, music: createMusic(content.settings.musicUrl) };

  root.querySelector('.loading')?.remove();

  // Chưa có video thì bỏ cảnh thước phim.
  const scenes = SCENES.filter((s) => s !== reel || content.videos.length);

  // ?scene=4 để nhảy thẳng tới cảnh thứ 4 khi phát triển.
  const startAt = Math.max(0, (Number(new URLSearchParams(location.search).get('scene')) || 1) - 1);

  // Cảnh tự chạy (mở quà, hoa nở) bị bỏ qua khi bấm "Quay lại".
  const prevOf = (i) => {
    let p = i - 1;
    while (p >= 0 && (scenes[p] === intro || scenes[p] === bloom)) p--;
    return p;
  };

  let i = Math.min(startAt, scenes.length - 1);
  while (i < scenes.length) {
    const play = scenes[i];
    const prev = prevOf(i);
    const stage = document.createElement('section');
    stage.className = 'stage';
    if (prev >= 0) stage.dataset.canBack = '1';
    root.append(stage);
    try {
      await play(stage, ctx);
    } catch (err) {
      console.error(err);
    }
    if (play === finale) break;
    stage.classList.add('stage--out');
    await wait(700);
    stage.remove();
    i = stage.dataset.nav === 'back' && prev >= 0 ? prev : i + 1;
  }
}

run();
