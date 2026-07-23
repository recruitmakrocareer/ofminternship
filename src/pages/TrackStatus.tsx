import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackStatus } from '../lib/api';
import { TRACK_STEPS, trackStepIndex, statusLabel, isNegative } from '../lib/status';

interface TrackResult {
  trackingCode: string;
  status: string;
  positionApplied?: string;
  statusHistory: { status: string; at: string; note?: string }[];
  applicant?: { firstName: string; lastName: string };
}

export default function TrackStatus() {
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<TrackResult | null>(null);

  async function doLookup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setData(null);
    setLoading(true);
    try {
      const res = await trackStatus(code.trim(), email.trim());
      if (res.ok) setData(res as TrackResult);
      else if (res.error === 'email_mismatch') setError('อีเมลไม่ตรงกับรหัสติดตามนี้');
      else if (res.error === 'not_found') setError('ไม่พบใบสมัครตามรหัสที่กรอก');
      else setError('ไม่สามารถค้นหาได้: ' + (res.error || 'unknown'));
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  if (data) {
    const cur = trackStepIndex(data.status);
    const neg = isNegative(data.status);
    const accepted = data.status === 'accepted';
    // หา timestamp ล่าสุดของแต่ละ label จากประวัติ (ถ้ามี)
    const dateFor = (i: number) => {
      const h = data.statusHistory?.[i];
      return h?.at ? new Date(h.at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '';
    };
    return (
      <div className="pad" style={{ paddingTop: 20 }}>
        <div className="track-code-card">
          <svg style={{ position: 'absolute', top: -14, right: -6, opacity: 0.3 }} width="80" height="80" viewBox="0 0 100 100" fill="none" stroke="#fff" strokeWidth="3">
            <path d="M50 4l40 23v46L50 96 10 73V27z" />
          </svg>
          <div className="lb">รหัสติดตามใบสมัคร</div>
          <div className="code">{data.trackingCode}</div>
          <div className="who">
            {data.applicant ? `${data.applicant.firstName} ${data.applicant.lastName}` : ''}
            {data.positionApplied ? ` · ${data.positionApplied}` : ''}
          </div>
        </div>

        <div className="track-banner" style={neg ? { background: 'rgba(120,141,176,.12)', borderColor: 'rgba(120,141,176,.3)' } : {}}>
          <div className="ic" style={neg ? { background: '#8A97B8' } : {}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A1A3F" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div>
            <div style={{ font: "700 15px 'Anuphan'", color: neg ? '#C4CEE6' : '#FFD873' }}>{statusLabel(data.status)}</div>
            <div style={{ fontSize: 12, color: '#C4CEE6' }}>ทีม TA จะติดต่อกลับเมื่อมีความคืบหน้า</div>
          </div>
        </div>

        <div className="tstep">
          <div className="tstep-line" />
          {TRACK_STEPS.map((label, i) => {
            let state: 'done' | 'current' | 'future';
            if (accepted) state = 'done';
            else if (i < cur) state = 'done';
            else if (i === cur) state = 'current';
            else state = 'future';
            return (
              <div key={i} className={`tstep-row ${state}`}>
                <div className={`tstep-dot ${state}`}>
                  {state === 'done' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A1A3F" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                  {state === 'current' && <span style={{ width: 9, height: 9, background: '#fff', borderRadius: '50%' }} />}
                </div>
                <div>
                  <div className="t">{i === 3 && neg ? statusLabel(data.status) : label}</div>
                  {dateFor(i) && <div className="d">{dateFor(i)}</div>}
                  {state === 'current' && <div className="d">กำลังดำเนินการ</div>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: '24px 0' }}>
          <button className="btn btn-ghost btn-block" onClick={() => setData(null)}>
            ค้นหาใบสมัครอื่น
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pad" style={{ paddingTop: 20 }}>
      <p className="eyebrow" style={{ marginTop: 8 }}>
        ติดตามสถานะ
      </p>
      <h2 className="section-title">เช็คใบสมัครของคุณ</h2>
      <p className="step-sub">กรอกรหัสติดตามและอีเมลที่ใช้สมัคร</p>
      <form onSubmit={doLookup}>
        <label className="lbl">รหัสติดตาม</label>
        <input className="fld" style={{ marginBottom: 16 }} value={code} onChange={(e) => setCode(e.target.value)} placeholder="เช่น MKR-INT-2026-0042" required />
        <label className="lbl">อีเมล</label>
        <input className="fld" style={{ marginBottom: 22 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
        {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}
        <button className="btn btn-red btn-block" disabled={loading}>
          {loading ? 'กำลังค้นหา…' : 'ค้นหา'}
        </button>
      </form>
      <p style={{ textAlign: 'center', fontSize: 12, color: '#5A6890', marginTop: 16 }}>
        ยังไม่ได้สมัคร?{' '}
        <span style={{ color: '#3FC5F0', cursor: 'pointer' }} onClick={() => nav('/apply')}>
          สมัครฝึกงาน
        </span>
      </p>
    </div>
  );
}
