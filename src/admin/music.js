import { supabase, MEDIA_BUCKET } from '../lib/supabase.js';
import { h, toast, failed, busy, uuid, pathFromPublicUrl } from './ui.js';
import { loadSettingsData, saveSettings } from './settings.js';

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
  const nowBox = h('div.ad-card', {}, h('h3.ad-card-title', {}, 'Nhạc hiện tại'), player, delBtn);

  function render() {
    pickBtn.textContent = musicUrl ? '♫ Thay bài nhạc khác' : '♫ Chọn file nhạc (mp3/m4a)';
    nowBox.hidden = !musicUrl;
    if (musicUrl && player.getAttribute('src') !== musicUrl) player.src = musicUrl;
    if (!musicUrl) {
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
    h('div.ad-card', {}, fileInput, pickBtn, h('small.ad-hint', {}, 'Nhạc nền phát khi người ấy bấm mở quà. Tối đa 15MB.'), status),
    nowBox,
  );
  render();
}
