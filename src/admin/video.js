export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const NEED_SQL_MSG = 'Cần chạy supabase/002-video.sql trong SQL Editor trước khi thêm video';

const EXT_BY_TYPE = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/x-m4v': 'm4v' };
const TYPE_BY_EXT = { mp4: 'video/mp4', mov: 'video/mp4', webm: 'video/webm', m4v: 'video/x-m4v' };

const POSTER_SIDE = 720;
const POSTER_QUALITY = 0.8;
const POSTER_TIMEOUT = 15000;

export function isVideoFile(file) {
  return file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
}

/** Đuôi file video được nhận (mp4, mov, webm, m4v) hoặc null. */
export function videoExt(file) {
  const m = /\.([a-z0-9]+)$/i.exec(file.name);
  const ext = m ? m[1].toLowerCase() : EXT_BY_TYPE[file.type];
  return ext && TYPE_BY_EXT[ext] ? ext : null;
}

/** contentType khi upload: theo file; riêng .mov dùng video/mp4 để Chrome/Android phát được. */
export function videoContentType(file, ext) {
  if (ext === 'mov') return 'video/mp4';
  return file.type && file.type.startsWith('video/') && file.type !== 'video/quicktime' ? file.type : TYPE_BY_EXT[ext];
}

/** Lỗi do bảng photos chưa có cột kind/poster (chưa chạy 002-video.sql). */
export function isMissingColumn(error) {
  if (!error) return false;
  return error.code === 'PGRST204' || error.code === '42703' || /\b(kind|poster)\b/i.test(error.message || '');
}

/**
 * Cắt ảnh bìa ở giây min(1, 25% độ dài): cạnh dài ≤ 720px, JPEG 0.8.
 * Trả về Blob, hoặc null khi lỗi / quá 15s (máy không giải mã được định dạng…).
 */
export function videoPoster(file) {
  return new Promise((resolve) => {
    const src = URL.createObjectURL(file);
    const video = document.createElement('video');
    let finished = false;

    const finish = (blob) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(src);
      resolve(blob || null);
    };
    const timer = setTimeout(() => finish(null), POSTER_TIMEOUT);

    video.addEventListener('error', () => finish(null));
    video.addEventListener(
      'loadedmetadata',
      () => {
        const d = video.duration;
        video.currentTime = Number.isFinite(d) && d > 0 ? Math.max(0.01, Math.min(1, d * 0.25)) : 0.1;
      },
      { once: true },
    );
    video.addEventListener(
      'seeked',
      () => {
        try {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (!vw || !vh) return finish(null);
          const scale = Math.min(1, POSTER_SIDE / Math.max(vw, vh));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(vw * scale));
          canvas.height = Math.max(1, Math.round(vh * scale));
          canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((b) => finish(b), 'image/jpeg', POSTER_QUALITY);
        } catch {
          finish(null);
        }
      },
      { once: true },
    );

    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.preload = 'auto';
    video.src = src;
    video.load();
  });
}
