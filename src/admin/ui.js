/** Tạo phần tử: h('button.ad-btn', { onclick }, 'Lưu') */
export function h(tag, props = {}, ...children) {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k in el && k !== 'list' && k !== 'type') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

let toastBox;
export function toast(msg, type = 'ok') {
  if (!toastBox) {
    toastBox = h('div.ad-toasts', { role: 'status', 'aria-live': 'polite' });
    document.body.append(toastBox);
  }
  const t = h(`div.ad-toast.ad-toast--${type}`, {}, msg);
  toastBox.append(t);
  setTimeout(() => t.classList.add('ad-toast--out'), type === 'err' ? 5000 : 2600);
  setTimeout(() => t.remove(), type === 'err' ? 5400 : 3000);
}

/** Báo lỗi Supabase (nếu có). Trả về true khi có lỗi. */
export function failed(error, prefix = 'Lỗi') {
  if (!error) return false;
  console.error(error);
  toast(`${prefix}: ${error.message || error}`, 'err');
  return true;
}

/** Khoá nút trong lúc chạy tác vụ async. */
export async function busy(btn, fn) {
  if (btn.disabled) return;
  btn.disabled = true;
  btn.classList.add('ad-btn--busy');
  try {
    return await fn();
  } catch (e) {
    failed(e);
  } finally {
    btn.disabled = false;
    btn.classList.remove('ad-btn--busy');
  }
}

export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
  );
}

/** Đổi thứ tự: hoán đổi phần tử i với i+dir, gán lại sort_order 0..n-1, chỉ update hàng thay đổi. */
export async function moveRow(supabase, table, rows, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= rows.length) return false;
  const next = rows.slice();
  [next[i], next[j]] = [next[j], next[i]];
  const changed = [];
  next.forEach((r, idx) => {
    if (r.sort_order !== idx) changed.push({ r, idx });
  });
  const results = await Promise.all(
    changed.map(({ r, idx }) => supabase.from(table).update({ sort_order: idx }).eq('id', r.id)),
  );
  const err = results.find((x) => x.error)?.error;
  if (failed(err, 'Không đổi được thứ tự')) return false;
  changed.forEach(({ r, idx }) => (r.sort_order = idx));
  rows.splice(0, rows.length, ...next);
  return true;
}

export function nextOrder(rows) {
  return rows.reduce((m, r) => Math.max(m, r.sort_order ?? 0), -1) + 1;
}

/** Lấy path trong bucket từ public URL (…/object/public/<bucket>/<path>). */
export function pathFromPublicUrl(url, bucket) {
  const marker = `/object/public/${bucket}/`;
  const i = url ? url.indexOf(marker) : -1;
  return i < 0 ? null : decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
}
