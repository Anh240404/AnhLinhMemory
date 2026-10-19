# Quà 20-10 — luật dự án (BẮT BUỘC)

Web tặng người yêu dịp 20-10, deploy Vercel, dữ liệu Supabase. Đọc `docs/SPEC.md` trước khi code.

## Stack (không được đổi)
- Vite + JavaScript thuần (ES modules). KHÔNG React/Vue/Tailwind/TypeScript/jQuery.
- Thư viện duy nhất: `@supabase/supabase-js`. KHÔNG `npm install` thêm gói nào. Không CDN script
  (ngoại lệ duy nhất: YouTube IFrame API trong `src/lib/youtube.js` để phát nhạc từ link YouTube).
- Hiệu ứng: CSS, Canvas 2D, CSS 3D transform, SVG. Không WebGL/Three.js.

## Ranh giới file
- File dùng chung, CHỈ manager được sửa: `index.html`, `admin.html`, `package.json`, `vite.config.js`, `vercel.json`,
  `src/main.js`, `src/lib/*`, `src/styles/base.css`, `supabase/schema.sql`, `docs/SPEC.md`, `CLAUDE.md`, `.claude/**`.
- Subagent chỉ được tạo/sửa đúng các file được giao. Cần đổi file dùng chung → ghi đề xuất vào báo cáo, KHÔNG tự sửa.

## Hợp đồng scene
- Mỗi scene là `src/scenes/NN-ten.js` + `src/scenes/NN-ten.css` (import css trong file js).
- `export default async function play(stage, ctx)`; `stage` là `<section class="stage">` phủ kín màn hình,
  `ctx = { content, music }` (xem `src/lib/content.js`, `src/lib/music.js`).
- Promise resolve khi người xem bấm sang cảnh tiếp (dùng `nextButton(stage)` từ `src/lib/utils.js`).
- TRƯỚC khi resolve: dừng mọi requestAnimationFrame, setInterval/setTimeout, listener gắn lên `window`/`document`.
- Mọi class CSS phải có tiền tố riêng của scene (ví dụ `.s3-…`). Không style thẻ trần (`div`, `img`, …) ngoài tiền tố.
- Mọi chữ hiển thị lấy từ `ctx.content.settings.*` hoặc dữ liệu; không hard-code tên người.
- Phải chạy được với 1 ảnh và với 60 ảnh; ảnh lỗi không được làm vỡ bố cục.
- Video: mỗi cảnh tối đa 1 thẻ `<video>` đang phát; luôn `playsinline`; rời cảnh phải pause + gỡ src.
- Tên class tuyệt đối KHÔNG bắt đầu bằng `ad-`/`ads-`/`banner`/`sponsor` (bộ chặn quảng cáo sẽ ẩn phần tử).

## Mobile-first (người xem dùng điện thoại)
- Thiết kế cho 360×640 → 430×932 trước, rồi mới desktop. Dùng `dvh`, `min()`, `clamp()`, `env(safe-area-inset-*)`.
- Không cuộn ngang. Vùng bấm ≥ 44px. Dùng Pointer Events (chạm + chuột).
- Hiệu năng: canvas dùng `dpr()` (tối đa 2); ≤ 1 vòng rAF mỗi scene; hạt ≤ 1200 trên mobile (`isSmall()`);
  ảnh trong DOM ≤ 40 cùng lúc; chỉ animate `transform`/`opacity`.
- Tôn trọng `prefers-reduced-motion` (dùng `reducedMotion()`): bỏ hiệu ứng nặng, vẫn hiển thị nội dung.

## Kỷ luật làm việc (chống lan man)
- Chỉ làm đúng spec. Không thêm tính năng, không thêm thư viện, không viết README/tài liệu mới, không refactor file người khác.
- Không comment thừa; chỉ comment chỗ khó hiểu. Tiếng Việt cho chữ hiển thị.
- Xong việc phải chạy `npm run build` thành công.
- Báo cáo cuối ≤ 12 dòng: file đã tạo/sửa, cách kiểm tra (`?scene=N`), đề xuất cho file dùng chung (nếu có), việc chưa làm.
