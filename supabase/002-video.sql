-- Nâng cấp để tải VIDEO trong tab Ảnh. Chạy 1 lần trong Supabase → SQL Editor → New query → Run.
-- Chạy lại nhiều lần cũng không sao.

alter table public.photos add column if not exists kind text not null default 'image' check (kind in ('image', 'video'));
alter table public.photos add column if not exists poster text;

-- Báo API nạp lại cấu trúc bảng ngay (không phải chờ).
notify pgrst, 'reload schema';
