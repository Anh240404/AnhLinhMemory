import { supabase } from '../lib/supabase.js';
import { DEFAULT_SETTINGS } from '../lib/content.js';
import { h, toast, failed, busy } from './ui.js';

export const LABELS = {
  herName: ['Tên người ấy', 'Tên gọi cô ấy'],
  hisName: ['Tên của anh', 'Tên gọi của bạn'],
  startDate: ['Ngày bắt đầu yêu', 'Dùng để đếm số ngày bên nhau'],
  introTitle: ['Tiêu đề màn mở quà'],
  introSubtitle: ['Dòng chữ nhỏ màn mở quà'],
  introButton: ['Chữ trên nút mở quà'],
  cardTitleLeft: ['Thiệp – tên bên trái'],
  cardTitleRight: ['Thiệp – tên bên phải'],
  cardSubtitle: ['Thiệp – dòng chúc trên lịch'],
  counterLabel: ['Chữ trước đồng hồ đếm ngày'],
  galaxyCaption: ['Câu dưới màn thiên hà'],
  sphereCaption: ['Câu dưới quả cầu ảnh'],
  statsTitle: ['Tiêu đề màn chỉ số'],
  letterTitle: ['Lời mở đầu lá thư'],
  letterBody: ['Nội dung lá thư'],
  signature: ['Chữ ký cuối thư'],
  finalQuestion: ['Câu hỏi cuối'],
  finalYes: ['Nút đồng ý'],
  finalNo: ['Nút từ chối (sẽ chạy trốn)'],
  finalThanks: ['Lời cảm ơn khi bấm đồng ý'],
};

const GROUPS = [
  ['Hai bạn', ['herName', 'hisName', 'startDate']],
  ['Màn mở quà', ['introTitle', 'introSubtitle', 'introButton']],
  ['Thiệp & đồng hồ', ['cardTitleLeft', 'cardTitleRight', 'cardSubtitle', 'counterLabel']],
  ['Thiên hà · Quả cầu · Chỉ số', ['galaxyCaption', 'sphereCaption', 'statsTitle']],
  ['Lá thư', ['letterTitle', 'letterBody', 'signature']],
  ['Câu hỏi cuối', ['finalQuestion', 'finalYes', 'finalNo', 'finalThanks']],
];

/** Đọc settings.data hiện có trên server. */
export async function loadSettingsData() {
  const { data, error } = await supabase.from('settings').select('data').eq('id', 1).maybeSingle();
  if (failed(error, 'Không tải được thông tin')) return null;
  return data?.data ?? {};
}

/** Gộp patch vào data mới nhất rồi upsert (giữ các key khác). */
export async function saveSettings(patch) {
  const current = await loadSettingsData();
  if (current === null) return null;
  const data = { ...current, ...patch };
  const { error } = await supabase
    .from('settings')
    .upsert({ id: 1, data, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (failed(error, 'Không lưu được')) return null;
  return data;
}

export async function renderInfo(panel) {
  panel.replaceChildren(h('p.qt-muted', {}, 'Đang tải…'));
  const data = await loadSettingsData();
  if (data === null) return panel.replaceChildren(h('p.qt-muted', {}, 'Không tải được dữ liệu.'));
  const values = { ...DEFAULT_SETTINGS, ...data };

  const keys = Object.keys(DEFAULT_SETTINGS).filter((k) => k !== 'musicUrl');
  const grouped = new Set(GROUPS.flatMap((g) => g[1]));
  const extra = keys.filter((k) => !grouped.has(k));
  const groups = extra.length ? [...GROUPS, ['Khác', extra]] : GROUPS;

  const inputs = {};
  const field = (key) => {
    const [label, hint] = LABELS[key] || [key];
    const id = `qt-f-${key}`;
    let input;
    if (key === 'letterBody') input = h('textarea.qt-input', { id, rows: 8 });
    else if (key === 'startDate') input = h('input.qt-input', { id, type: 'date' });
    else input = h('input.qt-input', { id, type: 'text' });
    input.value = values[key] ?? '';
    inputs[key] = input;
    return h(
      'div.qt-field',
      {},
      h('label.qt-label', { for: id }, label),
      input,
      hint && h('small.qt-hint', {}, hint),
    );
  };

  const saveBtn = h('button.qt-btn.qt-btn--primary.qt-btn--block', { type: 'submit' }, 'Lưu thông tin');
  const form = h(
    'form.qt-form',
    {
      onsubmit: (e) => {
        e.preventDefault();
        busy(saveBtn, async () => {
          const patch = {};
          for (const k of keys) patch[k] = inputs[k].value.trim();
          if (await saveSettings(patch)) toast('Đã lưu thông tin 💗');
        });
      },
    },
    groups.map(([title, ks]) => h('fieldset.qt-card', {}, h('legend.qt-card-title', {}, title), ks.map(field))),
    h('div.qt-sticky', {}, saveBtn),
  );
  panel.replaceChildren(form);
}
