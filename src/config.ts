// config กลาง — อ่านจาก Vite env (import.meta.env) เพื่อไม่ต้อง hardcode ใน source
// ดู .env.example

export const APPS_SCRIPT_URL =
  import.meta.env.VITE_APPS_SCRIPT_URL || 'REPLACE_WITH_APPS_SCRIPT_EXEC_URL';

// ⚠️ ถูก build เข้า bundle — เป็นแค่ตัวกัน spam พื้นฐาน ไม่ใช่ความลับจริง
export const SUBMIT_TOKEN =
  import.meta.env.VITE_SUBMIT_TOKEN || 'REPLACE_WITH_SUBMIT_TOKEN';

export const LOOKER_STUDIO_URL = import.meta.env.VITE_LOOKER_STUDIO_URL || '';

// ขนาดไฟล์สูงสุด (byte) — จำกัดที่ frontend เพราะ base64 ทำให้ payload โต ~33% (gotcha ข้อ 2)
export const MAX_DOC_BYTES = 5 * 1024 * 1024; // Resume / Transcript ≤ 5MB
export const MAX_PORTFOLIO_BYTES = 10 * 1024 * 1024; // portfolio ≤ 10MB

export const CONSENT_VERSION = '2026-v1';
