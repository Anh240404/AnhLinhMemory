# Hướng dẫn đưa web lên mạng (khoảng 15 phút)

## 1. Tạo database Supabase (miễn phí)
1. Vào https://supabase.com, đăng nhập bằng GitHub, bấm **New project** (region: Singapore). Lưu lại mật khẩu DB.
2. Vào **SQL Editor → New query**, dán toàn bộ nội dung `supabase/schema.sql`, bấm **Run**.
3. Vào **Authentication → Sign In / Providers**, tắt **Allow new users to sign up** (để không ai tự đăng ký được).
4. Vào **Authentication → Users → Add user → Create new user**: nhập email + mật khẩu của bạn, tick **Auto Confirm User**.
5. Quay lại **SQL Editor**, chạy câu sau (đổi email):
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'email-cua-ban@gmail.com';
   ```
6. Vào **Project Settings → API**, copy **Project URL** và **anon public key**.

## 2. Chạy thử trên máy
```bash
cp .env.example .env        # rồi dán URL + anon key vào .env
npm install
npm run dev                 # mở http://localhost:5173  và  http://localhost:5173/admin.html
```
Mẹo: thêm `?scene=5` vào URL để nhảy thẳng tới cảnh 5.

## 3. Đẩy lên Vercel
1. Đẩy thư mục này lên một repo GitHub (để **private**).
2. Vào https://vercel.com → **Add New → Project** → chọn repo. Framework tự nhận **Vite**.
3. Mục **Environment Variables** thêm 2 biến: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Bấm **Deploy**.
4. Xong: trang khách là `https://ten-du-an.vercel.app`, trang admin là `https://ten-du-an.vercel.app/admin`.

## 4. Nhập nội dung
Đăng nhập `/admin` → điền tên, ngày yêu, lá thư → tải ảnh (chọn nhiều ảnh một lúc, web tự nén) → lời nhắn, chỉ số → tải bài nhạc.
Sửa xong chỉ cần tải lại trang khách, không phải deploy lại.

Anon key được phép công khai: database đã khoá bằng RLS, người ngoài chỉ đọc được, chỉ tài khoản trong bảng `admins` mới sửa được.
