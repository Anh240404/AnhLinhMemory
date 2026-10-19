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
  statsTitle: 'Chuyện của hai đứa mình',

  letterTitle: 'Gửi em!',
  letterBody:
    'Hôm nay là ngày 20/10, ngày dành riêng cho những người con gái tuyệt vời nhất. Anh chúc em luôn xinh đẹp, luôn vui vẻ và luôn được yêu thương. Cảm ơn em vì đã ở bên anh.',
  signature: 'Anh',

  finalQuestion: 'Tối nay em đi chơi với anh nhé?',
  finalYes: 'Đồng ý',
  finalNo: 'Không',
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

/**
 * @typedef {{ id:string, url:string, caption:string, sort_order:number }} Photo
 * @typedef {{ id:string, text:string, sort_order:number }} Message
 * @typedef {{ id:string, icon:string, value:string, label:string, sort_order:number }} Stat
 * @typedef {{ settings: typeof DEFAULT_SETTINGS, photos: Photo[], messages: Message[], stats: Stat[], demo: boolean }} Content
 */

/** @returns {Promise<Content>} photos/messages luôn có ít nhất 1 phần tử; stats có thể rỗng. */
export async function fetchContent() {
  if (!supabase) {
    return { settings: { ...DEFAULT_SETTINGS }, photos: DEMO_PHOTOS, messages: DEMO_MESSAGES, stats: DEMO_STATS, demo: true };
  }
  const order = { ascending: true };
  const [s, p, m, st] = await Promise.all([
    supabase.from('settings').select('data').eq('id', 1).maybeSingle(),
    supabase.from('photos').select('id,url,caption,sort_order').order('sort_order', order).order('created_at', order),
    supabase.from('messages').select('id,text,sort_order').order('sort_order', order).order('created_at', order),
    supabase.from('stats').select('id,icon,value,label,sort_order').order('sort_order', order).order('created_at', order),
  ]);
  for (const r of [s, p, m, st]) if (r.error) console.error(r.error);

  return {
    // Ô admin để trống → dùng giá trị mặc định (riêng musicUrl rỗng nghĩa là không có nhạc).
    settings: {
      ...DEFAULT_SETTINGS,
      ...Object.fromEntries(Object.entries(s.data?.data ?? {}).filter(([k, v]) => k === 'musicUrl' || String(v ?? '').trim() !== '')),
    },
    photos: p.data?.length ? p.data : DEMO_PHOTOS,
    messages: m.data?.length ? m.data : DEMO_MESSAGES,
    // Chỉ số không dùng mẫu: chưa nhập trong admin thì cảnh 6 chỉ hiện thẻ số ngày bên nhau.
    stats: st.data ?? [],
    demo: false,
  };
}
