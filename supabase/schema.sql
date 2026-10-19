-- Chạy 1 lần trong Supabase Dashboard → SQL Editor → New query → Run.
-- Khách (anon) chỉ được ĐỌC. Chỉ user nằm trong bảng admins mới được GHI.

-- ===== Bảng =====
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  path text,
  caption text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
-- Bản có video (an toàn khi chạy lại; giống supabase/002-video.sql).
-- kind = 'video' thì url là file video, poster là ảnh bìa cắt từ video.
alter table public.photos add column if not exists kind text not null default 'image' check (kind in ('image', 'video'));
alter table public.photos add column if not exists poster text;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.stats (
  id uuid primary key default gen_random_uuid(),
  icon text not null default '💗',
  value text not null,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ===== RLS =====
alter table public.settings enable row level security;
alter table public.photos   enable row level security;
alter table public.messages enable row level security;
alter table public.stats    enable row level security;
alter table public.admins   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['settings','photos','messages','stats'] loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "self read" on public.admins;
create policy "self read" on public.admins for select to authenticated using (user_id = auth.uid());

-- ===== Storage: bucket "media" (ảnh + nhạc), public đọc, admin ghi =====
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "media public read" on storage.objects;
drop policy if exists "media admin insert" on storage.objects;
drop policy if exists "media admin update" on storage.objects;
drop policy if exists "media admin delete" on storage.objects;

create policy "media public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'media');
create policy "media admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy "media admin update" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy "media admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_admin());

-- ===== Sau khi tạo tài khoản admin (Authentication → Users → Add user), chạy: =====
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'email-cua-ban@gmail.com';
