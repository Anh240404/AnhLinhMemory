import { supabase } from './supabase.js';

// Mọi key trong settings.data (jsonb). Admin sửa được tất cả; scene luôn đọc qua đây để có giá trị mặc định.
export const DEFAULT_SETTINGS = {
  herName: 'Em',
  hisName: 'Anh',
  startDate: '2024-02-14',

  introTitle: 'Gửi em yêu',
  introSubtitle: 'Anh có một món quà nhỏ dành cho em…',
  introButton: 'Mở quà',

  cardTitleLeft: 'Anh',
  cardTitleRight: 'Em',
  cardSubtitle: "Happy Women's Day",
  counterLabel: 'Mình đã bên nhau',

  galaxyCaption: 'Bông hoa này nhỏ thôi, nhưng không đẹp bằng em',
  sphereCaption: 'Kế bên anh, nơi này có em',
  reelTitle: 'Những thước phim của mình',
  statsTitle: 'Chuyện của hai đứa mình',

  letterTitle: 'Gửi em!',
  letterBody:
    'Hôm nay là ngày 20/10, ngày dành riêng cho những người con gái tuyệt vời nhất. Anh chúc em luôn xinh đẹp, luôn vui vẻ và luôn được yêu thương. Cảm ơn em vì đã ở bên anh.',
  signature: 'Anh',

  finalQuestion: 'Tối nay em đi chơi với anh nhé?',
  finalYes: 'Đồng ý',
  finalNo: 'Không',
  // Mỗi lần bấm "Không" nút đổi sang câu kế tiếp (mỗi dòng 1 câu); hết câu thì nút đầu hàng.
  finalNoLines: [
    'Chắc chưa? 🥺',
    'Nghĩ lại đi mà',
    'Bấm nhầm rồi đúng không?',
    'Anh buồn đó 😢',
    'Không được đâu nha 😤',
    'Nút này hỏng rồi 🙈',
    'Em nỡ lòng nào…',
    'Thôi mà, đồng ý đi 💕',
    'Lần cuối đó nha!',
  ].join('\n'),
  finalNoSurrender: 'Thôi được, đồng ý 💖',
  finalThanks: 'Yêu em nhiều lắm! 💖',

  musicUrl: '',
};

function placeholder(i) {
  const hues = [340, 320, 290, 10, 350, 270, 300, 330];
  const h = hues[i % hues.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${h},70%,78%)"/><stop offset="1" stop-color="hsl(${(h + 40) % 360},60%,45%)"/>
</linearGradient></defs>
<rect width="600" height="800" fill="url(#g)"/>
<text x="300" y="430" font-size="160" text-anchor="middle">💗</text>
<text x="300" y="560" font-size="44" text-anchor="middle" fill="#fff" font-family="sans-serif">Ảnh ${i + 1}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const DEMO_PHOTOS = Array.from({ length: 16 }, (_, i) => ({
  id: `demo-${i}`,
  url: placeholder(i),
  caption: `Kỷ niệm ${i + 1}`,
  sort_order: i,
}));

export const DEMO_MESSAGES = [
  'Cảm ơn em vì đã luôn ở bên anh',
  'Hôm nay em đã cười chưa?',
  '20 tháng 10, luôn bên em',
  'Em là điều tuyệt vời nhất',
  'Bông hoa này nhỏ thôi, nhưng không đẹp bằng em',
  'Anh thương em nhiều lắm',
  'Mỗi ngày bên em đều là một ngày đẹp',
  'Chúc em luôn rạng rỡ',
].map((text, i) => ({ id: `demo-m${i}`, text, sort_order: i }));

export const DEMO_STATS = [
  { icon: '🧋', value: '128', label: 'ly trà sữa đã uống cùng nhau' },
  { icon: '📸', value: '1.024', label: 'tấm ảnh chụp chung' },
  { icon: '🛵', value: '57', label: 'lần đi chơi' },
  { icon: '💬', value: '∞', label: 'lần anh nhớ em' },
].map((s, i) => ({ id: `demo-s${i}`, sort_order: i, ...s }));

// Ảnh bìa dự phòng cho video không cắt được ảnh bìa lúc tải lên.
export const VIDEO_POSTER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b1d5e"/><stop offset="1" stop-color="#7a2d5c"/></linearGradient></defs>
<rect width="600" height="800" fill="url(#g)"/>
<circle cx="300" cy="400" r="92" fill="rgba(255,255,255,0.18)" stroke="#fff" stroke-width="6"/>
<path d="M272 350 L352 400 L272 450 Z" fill="#fff"/>
</svg>`)}`;

// Video thử, chỉ có khi chạy dev (file trong thư mục dev/, không lên bản build).
const DEV_VIDEOS = import.meta.env.DEV
  ? [
      { id: 'demo-v0', kind: 'video', url: '/dev/test-portrait.mp4', poster: '/dev/test-portrait.jpg', caption: 'Video dọc (thử)' },
      { id: 'demo-v1', kind: 'video', url: '/dev/test-landscape.mp4', poster: null, caption: 'Video ngang, không có ảnh bìa (thử)' },
    ]
  : [];

/**
 * Hàng trong bảng photos → phần tử dùng cho scene. `url` LUÔN là ảnh (với video là ảnh bìa),
 * nên mọi cảnh dùng ảnh chạy được ngay; video có thêm `video` = link file video.
 */
function toMedia(r) {
  const base = { ...r, caption: r.caption ?? '' };
  return r.kind === 'video' ? { ...base, url: r.poster || VIDEO_POSTER, video: r.url } : base;
}

/**
 * @typedef {{ id:string, url:string, caption:string, sort_order:number, video?:string }} Photo
 * @typedef {{ id:string, text:string, sort_order:number }} Message
 * @typedef {{ id:string, icon:string, value:string, label:string, sort_order:number }} Stat
 * @typedef {{ settings: typeof DEFAULT_SETTINGS, photos: Photo[], videos: Photo[], messages: Message[], stats: Stat[], demo: boolean }} Content
 */

function withVideos(c) {
  return { ...c, videos: c.photos.filter((p) => p.video) };
}

/**
 * @returns {Promise<Content>} photos/messages luôn có ít nhất 1 phần tử; stats, videos có thể rỗng.
 * Khi chạy dev, thêm ?mock vào URL để dùng dữ liệu mẫu (kèm 2 video thử) thay cho Supabase.
 */
export async function fetchContent() {
  const mock = import.meta.env.DEV && new URLSearchParams(location.search).has('mock');
  if (!supabase || mock) {
    const photos = [...DEMO_PHOTOS];
    photos.splice(2, 0, DEV_VIDEOS[0]);
    photos.splice(5, 0, DEV_VIDEOS[1]);
    return withVideos({
      settings: { ...DEFAULT_SETTINGS },
      photos: photos.filter(Boolean).map(toMedia),
      messages: DEMO_MESSAGES,
      stats: DEMO_STATS,
      demo: true,
    });
  }
  const order = { ascending: true };
  const [s, p, m, st] = await Promise.all([
    supabase.from('settings').select('data').eq('id', 1).maybeSingle(),
    // select('*') để vẫn chạy được cả khi database chưa chạy 002-video.sql (chưa có cột kind/poster).
    supabase.from('photos').select('*').order('sort_order', order).order('created_at', order),
    supabase.from('messages').select('id,text,sort_order').order('sort_order', order).order('created_at', order),
    supabase.from('stats').select('id,icon,value,label,sort_order').order('sort_order', order).order('created_at', order),
  ]);
  for (const r of [s, p, m, st]) if (r.error) console.error(r.error);

  return withVideos({
    // Ô admin để trống → dùng giá trị mặc định (riêng musicUrl rỗng nghĩa là không có nhạc).
    settings: {
      ...DEFAULT_SETTINGS,
      ...Object.fromEntries(Object.entries(s.data?.data ?? {}).filter(([k, v]) => k === 'musicUrl' || String(v ?? '').trim() !== '')),
    },
    photos: (p.data?.length ? p.data : DEMO_PHOTOS).map(toMedia),
    messages: m.data?.length ? m.data : DEMO_MESSAGES,
    // Chỉ số không dùng mẫu: chưa nhập trong admin thì cảnh chỉ số chỉ hiện thẻ số ngày bên nhau.
    stats: st.data ?? [],
    demo: false,
  });
}
