import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPrograms } from '../lib/api';

function toYouTubeEmbed(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed${u.pathname}`;
    const v = u.searchParams.get('v');
    if (v) return `https://www.youtube.com/embed/${v}`;
    return url;
  } catch {
    return url;
  }
}

const STEPS = [
  { title: 'สมัครออนไลน์', desc: 'กรอกใบสมัครและแนบเอกสารให้ครบถ้วน', dur: '1 สัปดาห์' },
  { title: 'สัมภาษณ์', desc: 'พูดคุยกับทีมและหัวหน้าสาขา', dur: '1–2 สัปดาห์' },
  { title: 'ฝึกงานจริง', desc: 'ลงสาขา มีพี่เลี้ยง ทำโปรเจกต์จริง', dur: '16+ สัปดาห์' },
];

export default function ProgramJourney() {
  const nav = useNavigate();
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    fetchPrograms().then((r) => {
      const p = r.ok && r.programs ? r.programs.find((x) => x.journeyVideoUrl) : null;
      if (p?.journeyVideoUrl) setVideoUrl(toYouTubeEmbed(p.journeyVideoUrl));
    });
  }, []);

  return (
    <div>
      <div className="section-head" style={{ paddingTop: 24 }}>
        <p className="eyebrow">เส้นทางโครงการ</p>
        <h2 className="section-title" style={{ fontSize: 23, lineHeight: 1.25 }}>
          ตั้งแต่สมัคร จนจบโครงการ
        </h2>
      </div>

      <div className="video-slot">
        {videoUrl ? (
          <iframe title="วิดีโอแนะนำโครงการ" src={videoUrl} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        ) : (
          <div className="video-ph">วิดีโอแนะนำโครงการ (YouTube)</div>
        )}
      </div>

      <div className="journey">
        <div className="journey-line" />
        {STEPS.map((s, i) => (
          <div key={i} className="jt-row">
            <div className="jt-num">{i + 1}</div>
            <div className="jt-card">
              <div className="t">{s.title}</div>
              <p>{s.desc}</p>
              <span className="jt-dur">{s.dur}</span>
            </div>
          </div>
        ))}
        <div className="jt-row">
          <div className="jt-num gold">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A1A3F" strokeWidth="2.5">
              <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z M17 4h2a2 2 0 010 4h-2M7 4H5a2 2 0 000 4h2" />
            </svg>
          </div>
          <div className="jt-card gold">
            <div className="t">จบโครงการ + โอกาสได้งาน</div>
            <p style={{ color: '#C4CEE6' }}>มีสิทธิ์รับเข้าเป็นพนักงานจริงกับแม็คโคร</p>
          </div>
        </div>
      </div>

      <div className="cta-stack">
        <button className="btn btn-red" onClick={() => nav('/apply')}>
          พร้อมสมัครแล้ว →
        </button>
      </div>
    </div>
  );
}
