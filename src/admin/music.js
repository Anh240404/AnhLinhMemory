import { supabase, MEDIA_BUCKET } from '../lib/supabase.js';
import { h, toast, failed, busy, uuid, pathFromPublicUrl } from './ui.js';
import { loadSettingsData, saveSettings } from './settings.js';
import { parseYouTube } from '../lib/youtube.js';

const MAX_BYTES = 15 * 1024 * 1024;
const TYPES = { mp3: 'audio/mpeg', m4a: 'audio/mp4' };

export async function renderMusic(panel) {
  const storage = supabase.storage.from(MEDIA_BUCKET);
  panel.replaceChildren(h('p.ad-muted', {}, 'Đang tải…'));
  const data = await loadSettingsData();
  if (data === null) return panel.replaceChildren(h('p.ad-muted', {}, 'Không tải được dữ liệu.'));
  let musicUrl = data.musicUrl || '';

  const fileInput = h('input.ad-visually-hidden', { type: 'file', accept: '.mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a', id: 'ad-music-file' });
  const pickBtn = h('label.ad-btn.ad-btn--primary.ad-btn--block', { for: 'ad-music-file' });
  const status = h('p.ad-muted');
  const player = h('audio.ad-audio', { controls: true, preload: 'none' });
  const delBtn = h('button.ad-btn.ad-btn--danger.ad-btn--block', { type: 'button' }, 'Xoá nhạc');
  const ytFrame = h('iframe.ad-yt', { title: 'Nghe thử YouTube', allow: 'autoplay; encrypted-media', allowFullscreen: true });
  const nowBox = h('div.ad-card', {}, h('h3.ad-card-title', {}, 'Nhạc hiện tại'), player, ytFrame, delBtn);

  const ytInput = h('input.ad-input', { type: 'url', inputMode: 'url', placeholder: 'https://www.youtube.com/watch?v=…', autocomplete: 'off' });
  const ytBtn = h('button.ad-btn.ad-btn--primary.ad-btn--block', { type: 'button' }, 'Lưu link YouTube');
  ytBtn.addEventListener('click', () => {
    const yt = parseYouTube(ytInput.value);
    if (!yt) return toast('Link YouTube không hợp lệ', 'err');
    busy(ytBtn, async () => {
      const link = ytInput.value.trim();
      if (!(await saveSettings({ musicUrl: link }))) return;
      const old = musicUrl;
      musicUrl = link;
      await removeFile(old);
      ytInput.value = '';
      render();
      toast('Đã lưu nhạc YouTube 🎵');
    });
  });

  function render() {
    const yt = parseYouTube(musicUrl);
    pickBtn.textContent = musicUrl && !yt ? '♫ Thay bằng file khác' : '♫ Chọn file nhạc (mp3/m4a)';
    nowBox.hidden = !musicUrl;
    player.hidden = !!yt || !musicUrl;
    ytFrame.hidden = !yt;
    const ytSrc = yt ? `https://www.youtube.com/embed/${yt.id}?start=${yt.start}&playsinline=1` : '';
    if (ytFrame.getAttribute('src') !== ytSrc) ytSrc ? (ytFrame.src = ytSrc) : ytFrame.removeAttribute('src');
    if (musicUrl && !yt && player.getAttribute('src') !== musicUrl) player.src = musicUrl;
    if (!musicUrl || yt) {
      player.pause();
      player.removeAttribute('src');
    }
    status.textContent = musicUrl ? '' : 'Chưa có nhạc — trang khách sẽ không phát nhạc.';
  }

  async function removeFile(url) {
    const path = pathFromPublicUrl(url, MEDIA_BUCKET);
    if (!path) return;
    const rm = await storage.remove([path]);
    if (rm.error) console.warn(rm.error);
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!TYPES[ext]) return toast('Chỉ nhận file .mp3 hoặc .m4a', 'err');
    if (file.size > MAX_BYTES) return toast('File quá lớn (tối đa 15MB)', 'err');

    fileInput.disabled = true;
    pickBtn.classList.add('ad-btn--disabled');
    status.textContent = `Đang tải lên "${file.name}"…`;
    try {
      const path = `music/${uuid()}.${ext}`;
      const up = await storage.upload(path, file, { contentType: TYPES[ext], cacheControl: '31536000', upsert: false });
      if (failed(up.error, 'Không tải nhạc lên được')) return;
      const { data: pub } = storage.getPublicUrl(path);
      const old = musicUrl;
      if (!(await saveSettings({ musicUrl: pub.publicUrl }))) {
        await storage.remove([path]);
        return;
      }
      musicUrl = pub.publicUrl;
      if (old) await removeFile(old);
      toast('Đã cập nhật nhạc 🎵');
    } catch (e) {
      failed(e, 'Không tải nhạc lên được');
    } finally {
      fileInput.disabled = false;
      pickBtn.classList.remove('ad-btn--disabled');
      render();
    }
  });

  delBtn.addEventListener('click', () => {
    if (!confirm('Xoá bài nhạc hiện tại?')) return;
    busy(delBtn, async () => {
      if (!(await saveSettings({ musicUrl: '' }))) return;
      await removeFile(musicUrl);
      musicUrl = '';
      render();
      toast('Đã xoá nhạc');
    });
  });

  panel.replaceChildren(
    h(
      'div.ad-card',
      {},
      h('h3.ad-card-title', {}, 'Cách 1: Link YouTube'),
      ytInput,
      ytBtn,
      h('small.ad-hint', {}, 'Muốn bắt đầu từ giây nào thì thêm &t=45 vào cuối link. Nếu khung nghe thử bên dưới báo "không phát được", video đó chặn nhúng — chọn video khác (bản lyric/audio thường được).'),
    ),
    h('div.ad-card', {}, h('h3.ad-card-title', {}, 'Cách 2: Tải file nhạc'), fileInput, pickBtn, h('small.ad-hint', {}, 'Nhạc nền phát khi người ấy bấm mở quà. Tối đa 15MB.'), status),
    nowBox,
  );
  render();
}
