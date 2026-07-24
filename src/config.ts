// config กลาง — อ่านจาก Vite env (import.meta.env) เพื่อไม่ต้อง hardcode ใน source
// ดู .env.example

// URL /exec ของ Apps Script Web App — ไม่ใช่ความลับ (SPA สาธารณะเรียกอยู่แล้ว)
// ตั้ง VITE_APPS_SCRIPT_URL ทับได้ทั้ง dev และตอน build
export const APPS_SCRIPT_URL =
  import.meta.env.VITE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzApWdLf8l5wCKnKKN4GiVijWw0ZwkC9WYjDwEcDRSxvUb0r5Du2SdhFWEut0ZvdXMt/exec';

// ⚠️ ถูก build เข้า bundle — เป็นแค่ตัวกัน spam พื้นฐาน ไม่ใช่ความลับจริง
export const SUBMIT_TOKEN =
  import.meta.env.VITE_SUBMIT_TOKEN || 'REPLACE_WITH_SUBMIT_TOKEN';

export const LOOKER_STUDIO_URL = import.meta.env.VITE_LOOKER_STUDIO_URL || '';

// Cloudflare Turnstile site key (spam protection) — ว่าง = ปิดวิดเจ็ต (backend ก็จะข้ามการตรวจ)
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

// ขนาดไฟล์สูงสุด (byte) — จำกัดที่ frontend เพราะ base64 ทำให้ payload โต ~33% (gotcha ข้อ 2)
export const MAX_DOC_BYTES = 5 * 1024 * 1024; // Resume / Transcript ≤ 5MB
export const MAX_PORTFOLIO_BYTES = 10 * 1024 * 1024; // portfolio ≤ 10MB

export const CONSENT_VERSION = '2026-v1';
