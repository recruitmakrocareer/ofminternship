import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPrograms, type Program } from '../lib/api';
import JourneyTimeline from '../components/JourneyTimeline';

// แปลง YouTube URL ให้เป็น embed URL (รองรับ watch?v= / youtu.be / unlisted)
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

// หน้าเส้นทางโครงการ — Journey visualization (Framer Motion) + slot วิดีโอ/Lottie
export default function ProgramJourney() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrograms()
      .then((r) => setPrograms(r.ok && r.programs ? r.programs : []))
      .finally(() => setLoading(false));
  }, []);

  // ใช้โครงการแรกที่มี journeySteps เป็นตัวแสดงหลัก
  const program = useMemo(
    () => programs.find((p) => p.journeySteps?.length) || programs[0],
    [programs],
  );

  return (
    <div className="page">
      <section className="hero hero-sm">
        <h1>เส้นทางโครงการฝึกงาน</h1>
        <p className="lead">ตั้งแต่วันสมัครจนจบโครงการ คุณจะได้เจออะไรบ้าง</p>
      </section>

      {loading && <p className="muted">กำลังโหลด…</p>}

      {program && (
        <section className="section">
          <h2>{program.name}</h2>

          {program.journeyVideoUrl && (
            <div className="video-wrap">
              <iframe
                title="Journey video"
                src={toYouTubeEmbed(program.journeyVideoUrl)}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {program.journeySteps?.length > 0 ? (
            <JourneyTimeline steps={program.journeySteps} />
          ) : (
            <p className="muted">ยังไม่มีข้อมูลเส้นทางโครงการ</p>
          )}

          {/* Slot สำหรับ Lottie (export จาก Canva) — โหลดแบบ optional */}
          {program.lottieJsonUrl && (
            <p className="muted" style={{ marginTop: 24 }}>
              🎬 Lottie animation: <code>{program.lottieJsonUrl}</code>
            </p>
          )}

          <div className="cta-row" style={{ marginTop: 32 }}>
            <Link to="/apply" className="btn btn-primary">
              พร้อมสมัครแล้ว
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
