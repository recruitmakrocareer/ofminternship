import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const POSTER = `${import.meta.env.BASE_URL}poster.png`;

const SLIDES = [
  { img: POSTER, ph: 'โปสเตอร์โครงการ' },
  { img: '', ph: 'บรรยากาศการทำงานจริง' },
  { img: '', ph: 'ทีม / สาขา Makro' },
  { img: '', ph: 'กิจกรรมในโครงการ' },
];

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

const BENEFITS = ['ประสบการณ์ทำงานจริง', 'พัฒนาทักษะในสายอาชีพ', 'เรียนรู้จากผู้เชี่ยวชาญ', 'โอกาสร่วมงานกับแม็คโคร'];

export default function Landing() {
  const nav = useNavigate();
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((i) => (i + 1) % SLIDES.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <div className="app-topbar">
        <div className="brand">
          makro <span>Internship</span>
        </div>
      </div>

      {/* hero carousel */}
      <div className="carousel">
        <div className="car-frame">
          {SLIDES.map((s, i) => (
            <div key={i} className={`car-slide ${i === slide ? 'on' : ''}`}>
              {s.img ? <img src={s.img} alt="" /> : <div className="car-ph">{s.ph}</div>}
            </div>
          ))}
        </div>
        <div className="car-dots">
          {SLIDES.map((_, i) => (
            <span key={i} className={`dot ${i === slide ? 'on' : ''}`} />
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
    </div>
  );
}
