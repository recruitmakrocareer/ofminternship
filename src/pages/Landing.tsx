import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPrograms, type Program } from '../lib/api';

// หน้าแรก — ข้อมูลโครงการ + ปุ่มสมัคร/ติดตาม
export default function Landing() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPrograms()
      .then((r) => {
        if (r.ok && r.programs) setPrograms(r.programs);
        else setError(r.error || 'โหลดโครงการไม่สำเร็จ');
      })
      .catch(() => setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <section className="hero">
        <p className="eyebrow">CP AXTRA · Makro · Talent Acquisition</p>
        <h1>โครงการฝึกงาน Operations 2026</h1>
        <p className="lead">
          เรียนรู้งานจริงในธุรกิจค้าส่งค้าปลีกชั้นนำ พร้อมระบบคัดกรองอัจฉริยะ
          ที่จับคู่ความสามารถของคุณกับตำแหน่งที่เหมาะสม
        </p>
        <div className="cta-row">
          <Link to="/apply" className="btn btn-primary">
            สมัครฝึกงาน
          </Link>
          <Link to="/journey" className="btn btn-ghost">
            ดูเส้นทางโครงการ
          </Link>
          <Link to="/track" className="btn btn-ghost">
            ติดตามใบสมัคร
          </Link>
        </div>
      </section>

      <section className="section">
        <h2>โครงการที่เปิดรับ</h2>
        {loading && <p className="muted">กำลังโหลด…</p>}
        {error && <p className="error-text">{error}</p>}
        {!loading && !error && programs.length === 0 && (
          <p className="muted">ยังไม่มีโครงการที่เปิดรับในขณะนี้</p>
        )}
        <div className="card-grid">
          {programs.map((p) => (
            <article key={p.programId} className="card">
              <h3>{p.name}</h3>
              <p className="muted">{p.description}</p>
              <dl className="meta">
                <div>
                  <dt>โควตา</dt>
                  <dd>{p.quota}</dd>
                </div>
                <div>
                  <dt>ปิดรับ</dt>
                  <dd>{String(p.closeDate || '-')}</dd>
                </div>
              </dl>
              {p.eligibleFaculties?.length > 0 && (
                <p className="chips">
                  {p.eligibleFaculties.map((f) => (
                    <span key={f} className="chip">
                      {f}
                    </span>
                  ))}
                </p>
              )}
              <Link to="/apply" className="btn btn-primary btn-sm">
                สมัครโครงการนี้
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
