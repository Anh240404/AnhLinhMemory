import './admin.css';
import { supabase } from '../lib/supabase.js';
import { h, toast, failed } from './ui.js';
import { renderInfo } from './settings.js';
import { renderPhotos } from './photos.js';
import { renderList } from './lists.js';
import { renderMusic } from './music.js';

const root = document.getElementById('admin');
root.classList.add('ad-root');

const TABS = [
  { id: 'info', label: 'Thông tin', icon: '✎', render: renderInfo },
  { id: 'photos', label: 'Ảnh', icon: '▣', render: renderPhotos },
  { id: 'messages', label: 'Lời nhắn', icon: '✉', render: (p) => renderList(p, 'messages') },
  { id: 'stats', label: 'Chỉ số', icon: '♥', render: (p) => renderList(p, 'stats') },
  { id: 'music', label: 'Nhạc', icon: '♫', render: renderMusic },
];

let currentUserId = null;

function brand() {
  return h('div.ad-brand', {}, h('span.ad-brand-heart', { 'aria-hidden': 'true' }, '💗'), 'Quản trị quà 20-10');
}

function renderSetup() {
  root.replaceChildren(
    h(
      'main.ad-center',
      {},
      h(
        'div.ad-card.ad-auth',
        {},
        brand(),
        h('h1.ad-title', {}, 'Chưa kết nối Supabase'),
        h('p', {}, 'Tạo file ', h('code', {}, '.env'), ' ở thư mục gốc dự án với nội dung:'),
        h('pre.ad-pre', {}, 'VITE_SUPABASE_URL=https://xxxx.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOi...'),
        h(
          'p.ad-muted',
          {},
          'Lấy 2 giá trị ở Supabase Dashboard → Project Settings → API. Trên Vercel, thêm chúng vào Environment Variables rồi deploy lại. Sau đó chạy lại ',
          h('code', {}, 'npm run dev'),
          '.',
        ),
      ),
    ),
  );
}

function renderLogin(message) {
  currentUserId = null;
  const email = h('input.ad-input', { type: 'email', id: 'ad-email', autocomplete: 'username', required: true, inputMode: 'email' });
  const password = h('input.ad-input', { type: 'password', id: 'ad-pass', autocomplete: 'current-password', required: true });
  const err = h('p.ad-error', { role: 'alert', hidden: !message }, message || '');
  const btn = h('button.ad-btn.ad-btn--primary.ad-btn--block', { type: 'submit' }, 'Đăng nhập');

  const form = h(
    'form.ad-card.ad-auth',
    {
      onsubmit: async (e) => {
        e.preventDefault();
        btn.disabled = true;
        btn.textContent = 'Đang đăng nhập…';
        err.hidden = true;
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.value.trim(),
          password: password.value,
        }).catch((e) => ({ data: null, error: e }));
        if (error) {
          err.textContent = error.message === 'Invalid login credentials' ? 'Sai email hoặc mật khẩu.' : error.message;
          err.hidden = false;
          btn.disabled = false;
          btn.textContent = 'Đăng nhập';
          return;
        }
        await enter(data.user);
      },
    },
    brand(),
    h('h1.ad-title', {}, 'Đăng nhập'),
    h('div.ad-field', {}, h('label.ad-label', { for: 'ad-email' }, 'Email'), email),
    h('div.ad-field', {}, h('label.ad-label', { for: 'ad-pass' }, 'Mật khẩu'), password),
    err,
    btn,
  );
  root.replaceChildren(h('main.ad-center', {}, form));
  email.focus();
}

async function isAdmin(uid) {
  const { data, error } = await supabase.from('admins').select('user_id').eq('user_id', uid);
  if (error) {
    failed(error, 'Không kiểm tra được quyền');
    return false;
  }
  return (data?.length ?? 0) > 0;
}

async function enter(user) {
  root.replaceChildren(h('main.ad-center', {}, h('p.ad-muted', {}, 'Đang kiểm tra quyền…')));
  if (!(await isAdmin(user.id))) {
    await supabase.auth.signOut();
    renderLogin('Tài khoản không có quyền admin');
    return;
  }
  currentUserId = user.id;
  renderApp(user);
}

function renderApp(user) {
  const main = h('main.ad-main');
  const tabButtons = TABS.map((t) =>
    h(
      'button.ad-tab',
      { type: 'button', role: 'tab', 'aria-controls': 'ad-panel', onclick: () => select(t.id) },
      h('span.ad-tab-icon', { 'aria-hidden': 'true' }, t.icon),
      h('span.ad-tab-label', {}, t.label),
    ),
  );

  // Mỗi lần đổi tab tạo panel mới → listener/trạng thái của tab cũ bị bỏ theo.
  function select(id) {
    const tab = TABS.find((t) => t.id === id) || TABS[0];
    TABS.forEach((t, i) => tabButtons[i].setAttribute('aria-selected', String(t === tab)));
    history.replaceState(null, '', `#${tab.id}`);
    const panel = h('section.ad-panel', { role: 'tabpanel', id: 'ad-panel', 'aria-label': tab.label });
    main.replaceChildren(panel);
    Promise.resolve(tab.render(panel)).catch((e) => failed(e));
    window.scrollTo({ top: 0 });
  }

  const logout = h(
    'button.ad-btn.ad-btn--ghost.ad-btn--sm',
    {
      type: 'button',
      onclick: async () => {
        currentUserId = null;
        const { error } = await supabase.auth.signOut();
        failed(error, 'Đăng xuất chưa trọn vẹn');
        renderLogin();
      },
    },
    'Đăng xuất',
  );

  root.replaceChildren(
    h(
      'header.ad-header',
      {},
      h(
        'div.ad-header-top',
        {},
        brand(),
        h(
          'div.ad-header-actions',
          {},
          h('a.ad-btn.ad-btn--ghost.ad-btn--sm', { href: '/', target: '_blank', rel: 'noopener' }, 'Xem trang ↗'),
          logout,
        ),
      ),
      h('p.ad-user', {}, user.email || ''),
    ),
    main,
    h('nav.ad-tabs', { role: 'tablist', 'aria-label': 'Mục quản trị' }, tabButtons),
  );
  select(location.hash.slice(1));
}

async function init() {
  if (!supabase) return renderSetup();

  supabase.auth.onAuthStateChange((event) => {
    // Không await gọi supabase trong callback này (khuyến cáo của supabase-js) → đẩy ra setTimeout.
    if (event === 'SIGNED_OUT' && currentUserId) setTimeout(() => renderLogin('Phiên đăng nhập đã kết thúc.'), 0);
  });

  root.replaceChildren(h('main.ad-center', {}, h('p.ad-muted', {}, 'Đang tải…')));
  const { data, error } = await supabase.auth.getSession();
  if (error) toast(error.message, 'err');
  if (data?.session?.user) await enter(data.session.user);
  else renderLogin();
}

init();
