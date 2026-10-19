import { supabase, MEDIA_BUCKET } from '../lib/supabase.js';
import { h, toast, failed, uuid, moveRow, nextOrder, pathFromPublicUrl } from './ui.js';

const MAX_SIDE = 1280;
const QUALITY = 0.82;

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

export async function renderPhotos(panel) {
  let rows = [];
  const storage = supabase.storage.from(MEDIA_BUCKET);

  const fileInput = h('input.qt-visually-hidden', { type: 'file', accept: 'image/*', multiple: true, id: 'qt-photo-file' });
  const pickBtn = h('label.qt-btn.qt-btn--primary.qt-btn--block', { for: 'qt-photo-file' }, '＋ Chọn ảnh để tải lên');
  const bar = h('div.qt-progress-bar');
  const progressText = h('span.qt-progress-text');
  const progress = h('div.qt-progress', { hidden: true }, h('div.qt-progress-track', {}, bar), progressText);
  const count = h('p.qt-muted');
  const grid = h('div.qt-photo-grid');

  panel.replaceChildren(
    h('div.qt-card', {}, fileInput, pickBtn, h('small.qt-hint', {}, 'Chọn được nhiều ảnh cùng lúc. Ảnh sẽ được nén tự động.'), progress),
    count,
    grid,
  );

  const setProgress = (done, total, failedN) => {
    bar.style.transform = `scaleX(${total ? done / total : 0})`;
    progressText.textContent = `Đã tải ${done}/${total}${failedN ? ` · lỗi ${failedN}` : ''}`;
  };

  async function uploadOne(file, order) {
    const blob = await compress(file);
    const path = `photos/${uuid()}.jpg`;
    const up = await storage.upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
    if (up.error) throw up.error;
    const { data: pub } = storage.getPublicUrl(path);
    const ins = await supabase
      .from('photos')
      .insert({ url: pub.publicUrl, path, caption: '', sort_order: order })
      .select('id,url,path,caption,sort_order')
      .single();
    if (ins.error) {
      await storage.remove([path]);
      throw ins.error;
    }
    return ins.data;
  }

  fileInput.addEventListener('change', async () => {
    const files = [...fileInput.files].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    fileInput.value = '';
    if (!files.length) return;
    pickBtn.classList.add('qt-btn--disabled');
    fileInput.disabled = true;
    progress.hidden = false;
    let done = 0;
    let bad = 0;
    let order = nextOrder(rows);
    setProgress(0, files.length, 0);
    for (const file of files) {
      try {
        rows.push(await uploadOne(file, order++));
        render();
      } catch (e) {
        bad++;
        failed(e, `Lỗi ảnh "${file.name}"`);
      }
      done++;
      setProgress(done, files.length, bad);
    }
    pickBtn.classList.remove('qt-btn--disabled');
    fileInput.disabled = false;
    if (done - bad) toast(`Đã tải lên ${done - bad} ảnh 📸`);
    setTimeout(() => (progress.hidden = true), 1500);
  });

  function card(row, i) {
    const caption = h('input.qt-input.qt-input--sm', { type: 'text', placeholder: 'Chú thích…', 'aria-label': 'Chú thích ảnh' });
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
      if (!confirm('Xoá ảnh này?')) return;
      btn.disabled = true;
      const { error } = await supabase.from('photos').delete().eq('id', row.id);
      if (failed(error, 'Không xoá được ảnh')) return (btn.disabled = false);
      const path = row.path || pathFromPublicUrl(row.url, MEDIA_BUCKET);
      if (path) {
        const rm = await storage.remove([path]);
        if (rm.error) console.warn(rm.error);
      }
      rows = rows.filter((r) => r !== row);
      render();
      toast('Đã xoá ảnh');
    };

    const img = h('img.qt-photo-img', { src: row.url, alt: row.caption || `Ảnh ${i + 1}`, loading: 'lazy', decoding: 'async' });
    img.addEventListener('error', () => img.classList.add('qt-photo-img--broken'), { once: true });

    return h(
      'div.qt-photo',
      {},
      h('div.qt-photo-thumb', {}, img, h('span.qt-photo-no', {}, i + 1)),
      caption,
      h(
        'div.qt-row-actions',
        {},
        h('button.qt-icon-btn', { type: 'button', title: 'Lên', 'aria-label': 'Đưa lên', disabled: i === 0, onclick: move(-1) }, '↑'),
        h('button.qt-icon-btn', { type: 'button', title: 'Xuống', 'aria-label': 'Đưa xuống', disabled: i === rows.length - 1, onclick: move(1) }, '↓'),
        h('button.qt-icon-btn.qt-icon-btn--danger', { type: 'button', title: 'Xoá', 'aria-label': 'Xoá ảnh', onclick: del }, '✕'),
      ),
    );
  }

  function render() {
    count.textContent = rows.length ? `${rows.length} ảnh` : 'Chưa có ảnh nào — trang khách đang dùng ảnh mẫu.';
    grid.replaceChildren(...rows.map(card));
  }

  count.textContent = 'Đang tải…';
  const { data, error } = await supabase
    .from('photos')
    .select('id,url,path,caption,sort_order')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (failed(error, 'Không tải được ảnh')) return (count.textContent = 'Không tải được ảnh.');
  rows = data ?? [];
  render();
}
