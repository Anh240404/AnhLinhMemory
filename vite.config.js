import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        // Tên "admin" trong file JS/CSS hay bị trình chặn quảng cáo (Cốc Cốc) chặn → đặt tên trung tính.
        panel: resolve(import.meta.dirname, 'admin.html'),
      },
    },
  },
});
