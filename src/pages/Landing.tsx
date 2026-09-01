import { useNavigate } from 'react-router-dom';
import { useIsDesktop, useSlideshow } from '../lib/slides';

const BRANCHES = [
  {
    name: 'Supply Chain & Logistics',
    sub: 'ซัพพลายเชนและโลจิสติกส์',
    bg: 'rgba(226,35,26,.15)',
    stroke: '#FF5A50',
    icon: <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />,
  },
  {
    name: 'Finance & Accounting',
    sub: 'การเงินและการบัญชี',
    bg: 'rgba(255,196,46,.15)',
    stroke: '#FFC42E',
    icon: (
      <>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M8 6h8M8 10h8M8 14h5" />
      </>
    ),
  },
  {
    name: 'Digital / Business Computer',
    sub: 'ดิจิทัลและคอมพิวเตอร์ธุรกิจ',
    bg: 'rgba(63,197,240,.15)',
    stroke: '#3FC5F0',
    icon: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    ),
  },
  {
    name: 'สาขาอื่น ๆ ที่เกี่ยวข้อง',
    sub: '',
    bg: 'rgba(255,196,46,.15)',
    stroke: '#FFC42E',
    icon: (
      <>
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
      </>
    ),
  },
];

const ROUNDS = [
  { n: 1, title: 'ต.ค. 69 – มี.ค. 70', sub: 'ระยะฝึก 16+ สัปดาห์' },
  { n: 2, title: 'มิ.ย. 70 – ต.ค. 70', sub: 'ระยะฝึก 16+ สัปดาห์' },
];

const PERIOD = [
  { title: 'ปิดรับสมัคร', date: '20 สิงหาคม 2569', bg: 'rgba(226,35,26,.15)', stroke: '#FF5A50', gold: false, icon: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></> },
  { title: 'สัมภาษณ์', date: '21 สิงหาคม 2569', bg: 'rgba(63,197,240,.15)', stroke: '#3FC5F0', gold: false, icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></> },
  { title: 'เริ่มฝึกงาน', date: 'ตุลาคม 2569 เป็นต้นไป', bg: 'rgba(255,196,46,.15)', stroke: '#FFC42E', gold: true, icon: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></> },
];

const BENEFITS = ['ประสบการณ์ทำงานจริง', 'พัฒนาทักษะในสายอาชีพ', 'เรียนรู้จากผู้เชี่ยวชาญ', 'โอกาสร่วมงานกับแม็คโคร'];

// Carousel สื่อบนมือถือ (<1040px) — ใช้ slide array ชุดเดียวกับ PromoPane บน desktop
// mount สลับกันกับ PromoPane ไม่ให้ซ้อนกัน (ดู AppLayout ใน src/App.tsx)
function MobileCarousel() {
  const { slides, index, setIndex } = useSlideshow();
  return (
    <div className="m-car">
      <div className="m-car-media">
        {slides.map((src, i) => (
          <div key={src} className={`car-slide ${i === index ? 'on' : ''}`}>
            <img src={src} alt="" />
          </div>
        ))}
        {slides.length > 1 && (
          <div className="car-dots">
            {slides.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={`สไลด์ ${i + 1}`}
                className={`dot ${i === index ? 'on' : ''}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Landing() {
  const nav = useNavigate();
  const logo = `${import.meta.env.BASE_URL}cpx-logo.jpg`;
  const isDesktop = useIsDesktop();

  return (
    <div>
      <div className="app-topbar">
        <div className="brand">
          makro <span>Internship</span>
        </div>
      </div>

      {/* red hero */}
      <div style={{ margin: '0 16px', background: 'linear-gradient(155deg,#E2231A,#B4160F)', borderRadius: 24, padding: '24px 22px', position: 'relative', overflow: 'hidden', boxShadow: '0 0 34px -10px rgba(226,35,26,.6)' }}>
        <svg style={{ position: 'absolute', top: -18, right: -10, opacity: 0.28 }} width="110" height="110" viewBox="0 0 100 100" fill="none" stroke="#fff" strokeWidth="2.5">
          <path d="M50 4l40 23v46L50 96 10 73V27z" />
        </svg>
        <span style={{ display: 'inline-block', background: 'rgba(255,255,255,.18)', color: '#fff', font: "700 11px 'Anuphan'", letterSpacing: '0.6px', padding: '5px 12px', borderRadius: 999, marginBottom: 14, position: 'relative' }}>
          รับสมัคร 2026 · เปิดแล้ว
        </span>
        <h1 style={{ font: "800 34px 'Anuphan'", lineHeight: 0.98, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.5px', position: 'relative' }}>
          ORDER
          <br />
          FULFILLMENT
        </h1>
        <div style={{ display: 'inline-block', background: '#05122B', border: '1px solid rgba(63,197,240,.4)', color: '#fff', font: "700 14px 'Anuphan'", letterSpacing: '0.5px', padding: '6px 14px', borderRadius: 10, position: 'relative' }}>
          INTERNSHIP PROGRAM
        </div>
      </div>

      {!isDesktop && <MobileCarousel />}

      {/* program info */}
      <div style={{ padding: '24px 20px 4px' }}>
        <p className="eyebrow">เกี่ยวกับโครงการ</p>
        <h2 className="section-title" style={{ marginBottom: 10 }}>ร่วมงานและเรียนรู้กับแม็คโคร</h2>
        <p style={{ fontSize: 14, color: '#C4CEE6', lineHeight: 1.7, margin: 0 }}>
          ฝึกงานจริงกับทีม Operations ของแม็คโคร ปฏิบัติงานที่สาขา เรียนรู้งาน Retail Operations ครบวงจร มีพี่เลี้ยงดูแล พร้อมเบี้ยเลี้ยงรายเดือนและโอกาสได้งานต่อหลังจบโครงการ
        </p>
      </div>

      {/* rounds */}
      <div style={{ padding: '22px 20px 4px' }}>
        <h2 style={{ font: "800 19px 'Anuphan'", margin: '0 0 12px', color: '#fff' }}>รอบการฝึกงาน</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ROUNDS.map((r) => (
            <div key={r.n} style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#12244F', border: '1px solid rgba(63,197,240,.22)', borderRadius: 16, padding: '15px 16px' }}>
              <span style={{ flex: '0 0 44px', height: 44, background: 'linear-gradient(150deg,#E2231A,#B4160F)', color: '#fff', borderRadius: 12, display: 'grid', placeItems: 'center', font: "800 20px 'Anuphan'" }}>{r.n}</span>
              <div>
                <div style={{ font: "700 16px 'Anuphan'", color: '#fff' }}>{r.title}</div>
                <div style={{ fontSize: 12.5, color: '#A9B6D4' }}>{r.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* recruitment period */}
      <div style={{ padding: '22px 20px 4px' }}>
        <h2 style={{ font: "800 19px 'Anuphan'", margin: '0 0 12px', color: '#fff' }}>ระยะเวลารับสมัคร</h2>
        <div style={{ background: 'linear-gradient(150deg,#12306A,#0B1E47)', border: '1px solid rgba(63,197,240,.3)', borderRadius: 18, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PERIOD.map((p) => (
            <div key={p.title} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ flex: '0 0 40px', height: 40, background: p.bg, borderRadius: 11, display: 'grid', placeItems: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={p.stroke} strokeWidth="2">
                  {p.icon}
                </svg>
              </span>
              <div>
                <div style={{ font: "700 15px 'Anuphan'", color: p.gold ? '#FFD873' : '#fff' }}>{p.title}</div>
                <div style={{ fontSize: 13, color: '#A9B6D4' }}>{p.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* stat strip */}
      <div className="stat-strip">
        <div className="stat-box">
          <div className="n">16+</div>
          <div className="t">สัปดาห์ฝึก</div>
        </div>
        <div className="stat-box">
          <div className="n sm">
            ปฏิบัติงาน
            <br />
            ที่สาขา
          </div>
          <div className="t">แม็คโคร</div>
        </div>
        <div className="stat-box">
          <div className="n cy">30</div>
          <div className="t">รับสมัคร (อัตรา)</div>
        </div>
      </div>

      {/* branches */}
      <div className="section-head">
        <p className="eyebrow">สาขาที่เปิดรับ</p>
        <h2 className="section-title">เลือกสายที่ใช่สำหรับคุณ</h2>
      </div>
      <div className="branch-list">
        {BRANCHES.map((b) => (
          <div key={b.name} className="branch-card">
            <div className="branch-ico" style={{ background: b.bg }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={b.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {b.icon}
              </svg>
            </div>
            <div>
              <div className="n">{b.name}</div>
              {b.sub && <div className="s">{b.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* benefits */}
      <div className="benefits">
        <p className="eyebrow" style={{ marginBottom: 14 }}>
          สิ่งที่คุณจะได้รับ
        </p>
        {BENEFITS.map((b) => (
          <div key={b} className="benefit-row">
            <span className="check-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A1A3F" strokeWidth="3.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            {b}
          </div>
        ))}
      </div>

      <div className="cta-stack">
        <button className="btn btn-red" onClick={() => nav('/apply')}>
          สมัครฝึกงาน →
        </button>
        <button className="btn btn-ghost" onClick={() => nav('/journey')}>
          ดูเส้นทางโครงการ
        </button>
      </div>

      {/* logo (mobile in-flow) */}
      <div style={{ padding: '8px 20px 4px' }}>
        <div className="logo-card">
          <img src={logo} alt="CP AXTRA · makro · Lotus's" />
        </div>
      </div>
    </div>
  );
}
