import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base = ชื่อ repo สำหรับ GitHub Pages (project page)
// ถ้าใช้ custom domain ให้ตั้ง VITE_BASE_PATH=/ ตอน build
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/ofminternship/',
});
