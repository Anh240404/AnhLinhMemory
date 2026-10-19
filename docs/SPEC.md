# SPEC — Quà 20-10

Tham khảo: video TikTok mẫu (nền thiên hà tím đen, hoa hồng, thiệp lịch, quả cầu ảnh 3D, phong bì thư).
Tông màu: nền đen tím (`--bg-0`, `--bg-1`), điểm nhấn tím phát sáng `--violet-glow`, hồng `--pink`, vàng `--gold`.
Font: `--font-script` (Dancing Script) cho tiêu đề lãng mạn, `--font-serif` cho câu trích, `--font-sans` cho chữ thường.
Token màu/font ở `src/styles/base.css`. Nền sao đã có sẵn (canvas `#sky` phía sau mọi scene) — scene nền trong suốt.

Hai vai trò:
- **Khách** `/` — không đăng nhập, chỉ xem 8 cảnh dưới đây theo thứ tự.
- **Admin** `/admin` — đăng nhập Supabase Auth (email + mật khẩu), sửa mọi nội dung.

## Dữ liệu (`ctx.content`, xem `src/lib/content.js`)
- `settings` — object, key ở `DEFAULT_SETTINGS`.
- `photos[]` `{id,url,caption,sort_order}` · `messages[]` `{id,text}` · `stats[]` `{id,icon,value,label}`.
- `photos`, `messages` không bao giờ rỗng (có dữ liệu demo dự phòng). `stats` có thể rỗng (không dùng mẫu).

## Các cảnh (khách)

### 01-intro — Mở quà
Ngôi sao/bông hoa 5 cánh phát sáng nhịp thở giữa màn hình (SVG + glow). Dưới: `introTitle` (script, lớn),
`introSubtitle` (nhỏ, mờ), nút viên thuốc hồng `introButton`. Bấm nút → `ctx.music.play()` (bắt buộc gọi trong
handler click), ngôi sao loé sáng phóng to rồi resolve. Không dùng `nextButton` ở cảnh này.

### 02-bloom — Hoa nở
Hoa hồng (vẽ bằng SVG/CSS, không dùng ảnh ngoài; tông hồng phấn, trắng kem, đỏ) nở từ tâm, lan dần phủ kín màn hình
trong ~3s (mỗi bông scale 0→1 + xoay nhẹ, trễ theo khoảng cách tới tâm). Giữ 1s, sau đó cánh hoa tan/rơi xuống
để lộ nền sao. Tự resolve sau khi tan (không cần nút). Dòng chữ serif nghiêng giữa màn: "Chúc mừng ngày 20 tháng 10".

### 03-calendar — Thiệp "Anh ❤ Em" + đồng hồ yêu
Thiệp nằm ngang trên desktop, dọc trên mobile; viền vàng mảnh phát sáng, nền nâu tím mờ.
- Tiêu đề script: `cardTitleLeft` ❤ `cardTitleRight`.
- Trái tim ghép từ mảnh puzzle: lấy tối đa 12 ảnh làm ảnh ghép; trái tim chia lưới mảnh (clip-path/mask hình trái tim),
  các mảnh bay từ ngẫu nhiên vào đúng vị trí trong ~2.5s.
- Lịch tháng 10 của năm hiện tại (CN→T7), ngày 20 khoanh tim hồng nhấp nháy. Trên lịch: `cardSubtitle` script + "Tháng 10, YYYY".
- Hàng hoa nhỏ (SVG) mọc dưới đáy thiệp.
- Đồng hồ dưới thiệp: `counterLabel` + "X ngày · HH giờ · MM phút · SS giây" tính từ `startDate`, cập nhật mỗi giây.
- `nextButton` sau khi trái tim ghép xong.

### 04-galaxy — Thiên hà
Canvas: bông hoa 5 cánh bằng hạt sáng tím-hồng (≤1200 hạt mobile) xoay chậm, bên dưới là "hố đen" (đĩa elip sáng hồng
quanh chấm đen). Lớp DOM: ảnh nhỏ (khung trắng, ~56–80px mobile) và câu `messages` trôi chậm theo quỹ đạo 3D giả
(scale/opacity theo chiều sâu) quanh bông hoa. Tối đa 16 ảnh + 12 câu cùng lúc. Chạm vào ảnh → phóng to xem kèm caption,
chạm lần nữa đóng. `galaxyCaption` serif nghiêng phía dưới. `nextButton` sau ~4s.

### 05-sphere — Quả cầu ảnh
Quả cầu 3D bằng CSS 3D (`preserve-3d`), ~32 ô ảnh (lặp ảnh nếu thiếu, `fill()`), phân bố theo vĩ độ/kinh độ, tự xoay.
Kéo (pointer) để xoay có quán tính. Mở màn: ảnh bay từ ngoài vào ghép thành cầu (~1.5s). `sphereCaption` serif phía dưới.
`nextButton` → trước khi resolve, các ô ảnh văng ra ngoài màn hình (~0.8s).
Đường kính: `min(78vw, 60dvh, 520px)`.

### 06-stats — Chỉ số tình yêu
Tiêu đề script `statsTitle`. Lưới thẻ kính mờ (1 cột ≤380px, 2 cột mobile, 4 cột desktop): icon lớn, `value` đếm lên
từ 0 nếu là số (giữ nguyên định dạng chuỗi gốc khi xong, ví dụ "1.024"; giá trị không phải số như "∞" thì hiện thẳng),
`label` nhỏ. Thẻ xuất hiện lần lượt. Thêm 1 thẻ đầu tiên đặc biệt: số ngày bên nhau tính từ `startDate`. `nextButton`.

### 07-letter — Phong bì thư
Phong bì hồng phấn (CSS) giữa màn, vài ảnh nhỏ nghiêng lơ lửng quanh. Chạm phong bì → nắp mở (rotateX), lá thư trượt lên
và phóng to thành thẻ giấy kem có viền chấm hồng, 2 góc có tim. Trong thư: `letterTitle` (script, đỏ hồng),
`letterBody` gõ từng chữ (có con trỏ nhấp nháy, chạm để hiện hết ngay), chữ ký `signature` script góc phải dưới.
Thư cuộn được bên trong nếu dài. `nextButton` sau khi gõ xong.

### 08-finale — Câu hỏi cuối
`finalQuestion` lớn giữa màn. Hai nút: `finalYes` (hồng, to dần mỗi lần né) và `finalNo` — khi pointer lại gần
(desktop) hoặc khi chạm (mobile) thì nút "Không" nhảy tới vị trí ngẫu nhiên trong màn hình (không ra ngoài, không đè
nút Có). Bấm Có → pháo hoa tim (canvas, ~3s, rồi tiếp tục rơi nhẹ) + `finalThanks` script cực lớn. Cảnh cuối không resolve.

## Admin (`/admin`)
File: `src/admin/admin.js`, `src/admin/admin.css` (+ module phụ trong `src/admin/` nếu cần).
- Nếu `supabase === null`: hiện hướng dẫn cấu hình `.env` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY), dừng.
- Đăng nhập email + mật khẩu (`signInWithPassword`). Không có đăng ký. Sau đăng nhập, kiểm tra
  `from('admins').select('user_id').eq('user_id', uid)`; không có → báo "Tài khoản không có quyền admin" + đăng xuất.
- Giao diện mobile-first, sáng sủa, tab: **Thông tin** · **Ảnh** · **Lời nhắn** · **Chỉ số** · **Nhạc**. Nút "Xem trang" mở `/` tab mới, nút Đăng xuất.
- **Thông tin**: form cho mọi key trong `DEFAULT_SETTINGS` trừ `musicUrl` (nhãn tiếng Việt, textarea cho `letterBody`,
  input date cho `startDate`), Lưu → upsert `settings` `{id:1, data, updated_at}` (giữ các key khác trong data).
- **Ảnh**: chọn nhiều ảnh cùng lúc; nén phía client trước khi upload (canvas, cạnh dài tối đa 1280px, JPEG 0.82, xử lý
  EXIF xoay qua `createImageBitmap(file, {imageOrientation:'from-image'})`); upload `media/photos/<uuid>.jpg`,
  lấy publicUrl, insert `photos`. Thanh tiến trình. Lưới ảnh: sửa caption (lưu khi blur), nút ↑ ↓ đổi thứ tự
  (`sort_order`), nút xoá (xoá cả file storage theo `path`, có confirm).
- **Lời nhắn** và **Chỉ số**: danh sách thêm/sửa/xoá/đổi thứ tự (stats có icon, value, label).
- **Nhạc**: upload mp3/m4a (≤ 15MB) → `media/music/<uuid>.<ext>`, lưu publicUrl vào `settings.data.musicUrl`; trình phát
  nghe thử; nút xoá nhạc.
- Mọi thao tác báo toast thành công/lỗi (hiện `error.message`). Chế độ demo (`content.demo`) không áp dụng cho admin.
