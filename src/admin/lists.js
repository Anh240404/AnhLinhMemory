import { supabase } from '../lib/supabase.js';
import { h, toast, failed, busy, moveRow, nextOrder } from './ui.js';

const CONFIGS = {
  messages: {
    noun: 'lời nhắn',
    empty: 'Chưa có lời nhắn nào — trang khách đang dùng câu mẫu.',
    hint: 'Các câu này trôi quanh màn thiên hà.',
    fields: [{ key: 'text', label: 'Lời nhắn', placeholder: 'Anh thương em nhiều lắm', required: true, multiline: true }],
  },
  stats: {
    noun: 'chỉ số',
    empty: 'Chưa có chỉ số nào — trang khách đang dùng chỉ số mẫu.',
    hint: 'Giá trị là số (vd 128, 1.024) sẽ được đếm lên; chữ (vd ∞) hiện nguyên.',
    fields: [
      { key: 'icon', label: 'Biểu tượng', placeholder: '💗', size: 'icon', def: '💗' },
      { key: 'value', label: 'Giá trị', placeholder: '128', required: true, size: 'value' },
      { key: 'label', label: 'Mô tả', placeholder: 'ly trà sữa đã uống cùng nhau', required: true },
    ],
  },
};

export async function renderList(panel, table) {
  const cfg = CONFIGS[table];
  const cols = ['id', 'sort_order', ...cfg.fields.map((f) => f.key)].join(',');
  let rows = [];

  const makeInput = (f, value = '') => {
    const props = { placeholder: f.placeholder, 'aria-label': f.label };
    const el = f.multiline
      ? h('textarea.qt-input', { ...props, rows: 2 })
      : h(`input.qt-input${f.size ? `.qt-input--${f.size}` : ''}`, { ...props, type: 'text' });
    el.value = value;
    return el;
  };

  const readValues = (inputs) => {
    const v = {};
    for (const f of cfg.fields) v[f.key] = inputs[f.key].value.trim() || f.def || '';
    const missing = cfg.fields.find((f) => f.required && !v[f.key]);
    if (missing) {
      toast(`Vui lòng nhập ${missing.label.toLowerCase()}`, 'err');
      inputs[missing.key].focus();
      return null;
    }
    return v;
  };

  // Form thêm mới
  const addInputs = Object.fromEntries(cfg.fields.map((f) => [f.key, makeInput(f)]));
  const addBtn = h('button.qt-btn.qt-btn--primary', { type: 'submit' }, `＋ Thêm ${cfg.noun}`);
  const addForm = h(
    'form.qt-card.qt-add',
    {
      onsubmit: (e) => {
        e.preventDefault();
        const v = readValues(addInputs);
        if (!v) return;
        busy(addBtn, async () => {
          const { data, error } = await supabase
            .from(table)
            .insert({ ...v, sort_order: nextOrder(rows) })
            .select(cols)
            .single();
          if (failed(error, 'Không thêm được')) return;
          rows.push(data);
          for (const f of cfg.fields) addInputs[f.key].value = '';
          render();
          toast(`Đã thêm ${cfg.noun}`);
        });
      },
    },
    h('div.qt-inline', {}, cfg.fields.map((f) => addInputs[f.key])),
    addBtn,
    h('small.qt-hint', {}, cfg.hint),
  );

  const count = h('p.qt-muted', {}, 'Đang tải…');
  const list = h('ol.qt-list');
  panel.replaceChildren(addForm, count, list);

  function item(row, i) {
    const inputs = Object.fromEntries(cfg.fields.map((f) => [f.key, makeInput(f, row[f.key] ?? '')]));
    const saveBtn = h('button.qt-btn.qt-btn--sm', { type: 'button', hidden: true }, 'Lưu');
    const dirty = () => cfg.fields.some((f) => inputs[f.key].value.trim() !== (row[f.key] ?? ''));
    for (const f of cfg.fields) inputs[f.key].addEventListener('input', () => (saveBtn.hidden = !dirty()));

    saveBtn.addEventListener('click', () => {
      const v = readValues(inputs);
      if (!v) return;
      busy(saveBtn, async () => {
        const { error } = await supabase.from(table).update(v).eq('id', row.id);
        if (failed(error, 'Không lưu được')) return;
        Object.assign(row, v);
        saveBtn.hidden = true;
        toast('Đã lưu');
      });
    });

    const move = (dir) => async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      if (await moveRow(supabase, table, rows, i, dir)) render();
      else btn.disabled = false;
    };
    const del = async (e) => {
      const btn = e.currentTarget;
      if (!confirm(`Xoá ${cfg.noun} này?`)) return;
      btn.disabled = true;
      const { error } = await supabase.from(table).delete().eq('id', row.id);
      if (failed(error, 'Không xoá được')) return (btn.disabled = false);
      rows = rows.filter((r) => r !== row);
      render();
      toast(`Đã xoá ${cfg.noun}`);
    };

    return h(
      'li.qt-card.qt-item',
      {},
      h('div.qt-inline', {}, cfg.fields.map((f) => inputs[f.key])),
      h(
        'div.qt-row-actions',
        {},
        saveBtn,
        h('button.qt-icon-btn', { type: 'button', 'aria-label': 'Đưa lên', disabled: i === 0, onclick: move(-1) }, '↑'),
        h('button.qt-icon-btn', { type: 'button', 'aria-label': 'Đưa xuống', disabled: i === rows.length - 1, onclick: move(1) }, '↓'),
        h('button.qt-icon-btn.qt-icon-btn--danger', { type: 'button', 'aria-label': 'Xoá', onclick: del }, '✕'),
      ),
    );
  }

  function render() {
    count.textContent = rows.length ? `${rows.length} ${cfg.noun}` : cfg.empty;
    list.replaceChildren(...rows.map(item));
  }

  const { data, error } = await supabase
    .from(table)
    .select(cols)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (failed(error, 'Không tải được dữ liệu')) return (count.textContent = 'Không tải được dữ liệu.');
  rows = data ?? [];
  render();
}
