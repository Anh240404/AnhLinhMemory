import { supabase, MEDIA_BUCKET } from '../lib/supabase.js';
import { VIDEO_POSTER } from '../lib/content.js';
import { h, toast, failed, uuid, moveRow, nextOrder, pathFromPublicUrl } from './ui.js';
import { VIDEO_MAX_BYTES, NEED_SQL_MSG, isVideoFile, videoExt, videoContentType, isMissingColumn, videoPoster } from './video.js';

const MAX_SIDE = 1280;
const QUALITY = 0.82;
const CACHE = '31536000';

async function decode(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return await createImageBitmap(file);
  }
}

/** Nén ảnh: cạnh dài ≤ 1280px, JPEG 0.82, xoay theo EXIF. */
async function compress(file) {
  const bmp = await decode(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const hgt = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = hgt;
  const g = canvas.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, w, hgt);
  g.drawImage(bmp, 0, 0, w, hgt);
  bmp.close?.();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', QUALITY));
  if (!blob) throw new Error('Không nén được ảnh');
  return blob;
}

const isImageFile = (f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name);
const isVideoRow = (r) => r.kind === 'video';

export async function renderPhotos(panel) {
  let rows = [];
  const storage = supabase.storage.from(MEDIA_BUCKET);

  const fileInput = h('input.qt-visually-hidden', {
    type: 'file',
    accept: 'image/*,video/*,.heic,.heif,.mov,.m4v',
    multiple: true,
    id: 'qt-photo-file',
  });
  const pickBtn = h('label.qt-btn.qt-btn--primary.qt-btn--block', { for: 'qt-photo-file' }, '＋ Chọn ảnh / video để tải lên');
  const bar = h('div.qt-progress-bar');
  const progressText = h('span.qt-progress-text');
  const progress = h('div.qt-progress', { hidden: true }, h('div.qt-progress-track', {}, bar), progressText);
  const count = h('p.qt-muted');
  const grid = h('div.qt-photo-grid');

  panel.replaceChildren(
    h(
      'div.qt-card',
      {},
      fileInput,
      pickBtn,
      h('small.qt-hint', {}, 'Chọn được nhiều file cùng lúc. Ảnh được nén tự động. Video: mp4, mov, webm, m4v — tối đa 50MB mỗi video.'),
      progress,
    ),
    count,
    grid,
  );

  const removeFiles = async (paths) => {
    const list = paths.filter(Boolean);
    if (!list.length) return;
    const rm = await storage.remove(list);
    if (rm.error) console.warn(rm.error);
  };

  async function uploadImage(file, order) {
    const blob = await compress(file);
    const path = `photos/${uuid()}.jpg`;
    const up = await storage.upload(path, blob, { contentType: 'image/jpeg', cacheControl: CACHE, upsert: false });
    if (up.error) throw up.error;
    const { data: pub } = storage.getPublicUrl(path);
    // Không kèm kind/poster → vẫn chạy khi database chưa chạy 002-video.sql.
    const ins = await supabase.from('photos').insert({ url: pub.publicUrl, path, caption: '', sort_order: order }).select('*').single();
    if (ins.error) {
      await removeFiles([path]);
      throw ins.error;
    }
    return ins.data;
  }

  async function uploadVideo(file, ext, order) {
    const id = uuid();
    const posterBlob = await videoPoster(file);
    const path = `videos/${id}.${ext}`;
    const up = await storage.upload(path, file, { contentType: videoContentType(file, ext), cacheControl: CACHE, upsert: false });
    if (up.error) throw up.error;
    const url = storage.getPublicUrl(path).data.publicUrl;

    let poster = null;
    let posterPath = null;
    if (posterBlob) {
      posterPath = `posters/${id}.jpg`;
      const pu = await storage.upload(posterPath, posterBlob, { contentType: 'image/jpeg', cacheControl: CACHE, upsert: false });
      if (pu.error) {
        console.warn(pu.error);
        posterPath = null;
      } else poster = storage.getPublicUrl(posterPath).data.publicUrl;
    }

    const ins = await supabase
      .from('photos')
      .insert({ url, path, poster, kind: 'video', caption: '', sort_order: order })
      .select('*')
      .single();
    if (ins.error) {
      await removeFiles([path, posterPath]);
      throw isMissingColumn(ins.error) ? Object.assign(new Error(NEED_SQL_MSG), { needSql: true }) : ins.error;
    }
    return ins.data;
  }

  // Kiểm tra trước để khỏi tải cả chục MB video rồi mới biết database thiếu cột.
  async function videoColumnsReady() {
    const { error } = await supabase.from('photos').select('kind,poster').limit(1);
    if (!error) return true;
    if (isMissingColumn(error)) return false;
    console.warn(error);
    return true;
  }

  fileInput.addEventListener('change', async () => {
    const picked = [...fileInput.files];
    fileInput.value = '';
    const files = picked.filter((f) => isImageFile(f) || isVideoFile(f));
    if (picked.length > files.length) toast(`Bỏ qua ${picked.length - files.length} file không phải ảnh/video`, 'err');
    if (!files.length) return;

    pickBtn.classList.add('qt-btn--disabled');
    fileInput.disabled = true;
    progress.hidden = false;
    let done = 0;
    let ok = 0;
    let order = nextOrder(rows);
    let videoReady = null;
    const setProgress = (label) => {
      bar.style.transform = `scaleX(${done / files.length})`;
      progressText.textContent = label;
    };

    for (const [i, file] of files.entries()) {
      setProgress(`Đang tải ${i + 1}/${files.length}: ${file.name}`);
      try {
        if (isImageFile(file) && !isVideoFile(file)) {
          rows.push(await uploadImage(file, order++));
        } else {
          const ext = videoExt(file);
          if (!ext) throw new Error('Chỉ nhận video mp4, mov, webm, m4v');
          if (file.size > VIDEO_MAX_BYTES) {
            throw new Error(
              `Video nặng ${(file.size / 1048576).toFixed(0)}MB, tối đa 50MB. Hãy cắt ngắn video (hoặc quay/xuất ở 720p) rồi thử lại`,
            );
          }
          if (videoReady === null) videoReady = await videoColumnsReady();
          if (!videoReady) throw Object.assign(new Error(NEED_SQL_MSG), { needSql: true });
          rows.push(await uploadVideo(file, ext, order++));
        }
        ok++;
        render();
      } catch (e) {
        if (e?.needSql) {
          videoReady = false;
          console.error(e);
          toast(`${NEED_SQL_MSG} (bỏ qua "${file.name}")`, 'err');
        } else failed(e, `Lỗi "${file.name}"`);
      }
      done++;
    }
    const bad = files.length - ok;
    setProgress(`Xong ${ok}/${files.length}${bad ? ` · lỗi ${bad}` : ''}`);
    pickBtn.classList.remove('qt-btn--disabled');
    fileInput.disabled = false;
    if (ok) toast(`Đã tải lên ${ok} file 📸`);
    setTimeout(() => (progress.hidden = true), 2500);
  });

  // Chỉ 1 video phát trong lưới cùng lúc.
  let stopActive = null;

  function videoThumb(row, i) {
    const img = h('img.qt-photo-img', { src: row.poster || VIDEO_POSTER, alt: row.caption || `Video ${i + 1}`, loading: 'lazy', decoding: 'async' });
    img.addEventListener('error', () => (img.src = VIDEO_POSTER), { once: true });
    const badge = h('span.qt-play-badge', { 'aria-hidden': 'true' }, '▶');
    const btn = h('button.qt-photo-thumb.qt-photo-thumb--video', { type: 'button', 'aria-label': `Phát video ${i + 1}` }, img, badge, h('span.qt-photo-no', {}, i + 1));
    let video = null;

    const stop = () => {
      if (!video) return;
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
      video = null;
      btn.classList.remove('qt-photo-thumb--playing');
      btn.setAttribute('aria-label', `Phát video ${i + 1}`);
      if (stopActive === stop) stopActive = null;
    };

    btn.addEventListener('click', () => {
      if (video && !video.paused) {
        video.pause();
        btn.classList.remove('qt-photo-thumb--playing');
        btn.setAttribute('aria-label', `Phát video ${i + 1}`);
        return;
      }
      if (!video) {
        if (stopActive) stopActive();
        video = h('video.qt-photo-video', { muted: true, playsInline: true, loop: true, preload: 'auto' });
        video.setAttribute('playsinline', '');
        if (row.poster) video.poster = row.poster;
        video.addEventListener('error', () => {
          toast('Máy này không phát được video này', 'err');
          stop();
        });
        video.src = row.url;
        btn.insertBefore(video, badge);
        stopActive = stop;
      }
      btn.classList.add('qt-photo-thumb--playing');
      btn.setAttribute('aria-label', `Dừng video ${i + 1}`);
      video.play().catch((e) => {
        if (e?.name !== 'AbortError') console.warn(e);
      });
    });
    return btn;
  }

  function card(row, i) {
    const video = isVideoRow(row);
    const noun = video ? 'video' : 'ảnh';
    const caption = h('input.qt-input.qt-input--sm', { type: 'text', placeholder: 'Chú thích…', 'aria-label': `Chú thích ${noun}` });
    caption.value = row.caption ?? '';
    caption.addEventListener('blur', async () => {
      const v = caption.value.trim();
      if (v === (row.caption ?? '')) return;
      const { error } = await supabase.from('photos').update({ caption: v }).eq('id', row.id);
      if (failed(error, 'Không lưu được chú thích')) return;
      row.caption = v;
      toast('Đã lưu chú thích');
    });
    caption.addEventListener('keydown', (e) => e.key === 'Enter' && caption.blur());

    const move = (dir) => async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      if (await moveRow(supabase, 'photos', rows, i, dir)) render();
      else btn.disabled = false;
    };
    const del = async (e) => {
      const btn = e.currentTarget;
      if (!confirm(`Xoá ${noun} này?`)) return;
      btn.disabled = true;
      const { error } = await supabase.from('photos').delete().eq('id', row.id);
      if (failed(error, `Không xoá được ${noun}`)) return (btn.disabled = false);
      await removeFiles([
        row.path || pathFromPublicUrl(row.url, MEDIA_BUCKET),
        video && pathFromPublicUrl(row.poster, MEDIA_BUCKET),
      ]);
      rows = rows.filter((r) => r !== row);
      render();
      toast(`Đã xoá ${noun}`);
    };

    let thumb;
    if (video) thumb = videoThumb(row, i);
    else {
      const img = h('img.qt-photo-img', { src: row.url, alt: row.caption || `Ảnh ${i + 1}`, loading: 'lazy', decoding: 'async' });
      img.addEventListener('error', () => img.classList.add('qt-photo-img--broken'), { once: true });
      thumb = h('div.qt-photo-thumb', {}, img, h('span.qt-photo-no', {}, i + 1));
    }

    return h(
      'div.qt-photo',
      {},
      thumb,
      caption,
      h(
        'div.qt-row-actions',
        {},
        h('button.qt-icon-btn', { type: 'button', title: 'Lên', 'aria-label': 'Đưa lên', disabled: i === 0, onclick: move(-1) }, '↑'),
        h('button.qt-icon-btn', { type: 'button', title: 'Xuống', 'aria-label': 'Đưa xuống', disabled: i === rows.length - 1, onclick: move(1) }, '↓'),
        h('button.qt-icon-btn.qt-icon-btn--danger', { type: 'button', title: 'Xoá', 'aria-label': `Xoá ${noun}`, onclick: del }, '✕'),
      ),
    );
  }

  function render() {
    if (stopActive) stopActive();
    const nVideo = rows.filter(isVideoRow).length;
    const nPhoto = rows.length - nVideo;
    count.textContent = rows.length
      ? `${nPhoto} ảnh${nVideo ? ` · ${nVideo} video` : ''}`
      : 'Chưa có ảnh nào — trang khách đang dùng ảnh mẫu.';
    grid.replaceChildren(...rows.map(card));
  }

  count.textContent = 'Đang tải…';
  // select('*') để chạy được cả khi database chưa có cột kind/poster.
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (failed(error, 'Không tải được ảnh')) return (count.textContent = 'Không tải được ảnh.');
  rows = data ?? [];
  render();
}
