import { useEffect, useState } from 'react';
import { fetchPrograms } from './api';

// ---------------------------------------------------------------------------
// รูป Slideshow — อ่านจาก Google Sheet (Programs คอลัมน์ L = slideImagesJson)
// เพื่อให้ทีม TA เปลี่ยนรูปได้เองโดยไม่ต้อง deploy ใหม่
//
// ค่าในชีตเป็น JSON array ของ string ได้ 2 แบบ
//   - URL เต็ม        : "https://.../hero.jpg"
//   - ชื่อไฟล์ใน public: "poster.png"  → ต่อ BASE_URL ให้อัตโนมัติ
// ถ้าชีตยังไม่มีคอลัมน์นี้ (หรือดึงไม่สำเร็จ) จะ fallback เป็นค่า default
// ---------------------------------------------------------------------------

export interface Slide {
  src: string;
  label: string;
}

// ข้อความ placeholder ของช่องที่ยังไม่มีรูป (เรียงตามลำดับสไลด์)
const PLACEHOLDERS = [
  'โปสเตอร์โครงการ',
  'บรรยากาศการทำงานจริง',
  'ทีม / สาขา Makro',
  'กิจกรรมในโครงการ',
];

const DEFAULT_SLIDES: Slide[] = PLACEHOLDERS.map((label, i) => ({
  src: i === 0 ? `${import.meta.env.BASE_URL}poster.png` : '',
  label,
}));

/** ต่อ path ให้ถูกต้อง — URL เต็มใช้ตามนั้น, ชื่อไฟล์เฉย ๆ ถือว่าอยู่ใน public/ */
function resolve(v: string): string {
  const s = String(v || '').trim();
  if (!s) return '';
  if (/^(https?:)?\/\//i.test(s) || s.startsWith('data:')) return s;
  return import.meta.env.BASE_URL + s.replace(/^\/+/, '');
}

let cache: Promise<Slide[]> | null = null;

/** โหลดรายการรูปจาก backend ครั้งเดียวต่อการเปิดหน้า (cache ที่ระดับ module) */
export function loadSlides(): Promise<Slide[]> {
  if (!cache) {
    cache = fetchPrograms()
      .then((res) => {
        const p = (res.programs || []).find((x) => (x.slideImages || []).length > 0);
        const list = (p?.slideImages || []).map(resolve).filter(Boolean);
        return list.length
          ? list.map((src, i) => ({ src, label: PLACEHOLDERS[i] || '' }))
          : DEFAULT_SLIDES;
      })
      .catch(() => DEFAULT_SLIDES);
  }
  return cache;
}

/**
 * useSlideshow — สไลด์ + index ที่หมุนเอง
 * ใช้ slide array ชุดเดียวกันทั้ง desktop (PromoPane) และมือถือ (Landing)
 * โดยต้องเรนเดอร์ทีละตัวเท่านั้น (gate ด้วย useIsDesktop) เพื่อไม่ให้มี timer ซ้อน
 */
export function useSlideshow(intervalMs = 2800) {
  const [slides, setSlides] = useState<Slide[]>(DEFAULT_SLIDES);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    loadSlides().then((s) => {
      if (alive && s.length) {
        setSlides(s);
        setIndex(0);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), intervalMs);
    return () => clearInterval(t);
  }, [slides.length, intervalMs]);

  return { slides, index, setIndex };
}

/** useIsDesktop — ตรงกับ breakpoint ใน styles.css (.promo แสดงที่ ≥1040px) */
export function useIsDesktop(minWidth = 1040) {
  const [is, setIs] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(min-width:${minWidth}px)`).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width:${minWidth}px)`);
    const on = () => setIs(mq.matches);
    mq.addEventListener('change', on);
    on();
    return () => mq.removeEventListener('change', on);
  }, [minWidth]);
  return is;
}
