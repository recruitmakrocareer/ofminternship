import { useEffect, useRef } from 'react';
import { TURNSTILE_SITE_KEY } from '../config';

declare global {
  interface Window {
    turnstile?: any;
  }
}

// วิดเจ็ต Cloudflare Turnstile (โหลดสคริปต์เมื่อจำเป็น) — ไม่เรนเดอร์ถ้าไม่ได้ตั้ง site key
export default function Turnstile({ onToken }: { onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | null>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let done = false;
    const render = () => {
      if (done || !window.turnstile || !ref.current || idRef.current !== null) return;
      idRef.current = window.turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        callback: (t: string) => onToken(t),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      });
    };
    if (window.turnstile) {
      render();
    } else {
      let s = document.getElementById('cf-turnstile-api') as HTMLScriptElement | null;
      if (!s) {
        s = document.createElement('script');
        s.id = 'cf-turnstile-api';
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        s.async = true;
        document.head.appendChild(s);
      }
      s.addEventListener('load', render);
    }
    return () => {
      done = true;
      try {
        if (idRef.current && window.turnstile) window.turnstile.remove(idRef.current);
      } catch {
        /* ignore */
      }
      idRef.current = null;
    };
  }, [onToken]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} style={{ marginTop: 16 }} />;
}
