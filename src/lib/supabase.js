import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// null khi chưa cấu hình .env → trang chạy ở chế độ demo.
export const supabase = url && key ? createClient(url, key) : null;

export const MEDIA_BUCKET = 'media';
