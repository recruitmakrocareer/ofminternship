import { useState } from 'react';
import { trackStatus } from '../lib/api';
import StatusStepper, { statusLabel } from '../components/StatusStepper';

interface TrackResult {
  trackingCode: string;
  status: string;
  positionApplied?: string;
  assignedBranch?: string;
  statusHistory: { status: string; at: string; by: string; note?: string }[];
  applicant?: { firstName: string; lastName: string };
}

// หน้าติดตามใบสมัคร — ต้องใส่ trackingCode + email ให้ตรง
export default function TrackStatus() {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<TrackResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setData(null);
    setLoading(true);
    try {
      const res = await trackStatus(code.trim(), email.trim());
      if (res.ok) {
        setData(res as TrackResult);
      } else if (res.error === 'email_mismatch') {
        setError('อีเมลไม่ตรงกับรหัสติดตามนี้');
      } else if (res.error === 'not_found') {
        setError('ไม่พบใบสมัครตามรหัสที่กรอก');
      } else {
        setError('ไม่สามารถค้นหาได้: ' + (res.error || 'unknown'));
      }
    } catch (err) {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <section className="hero hero-sm">
        <h1>ติดตามใบสมัคร</h1>
        <p className="lead">กรอกรหัสติดตามและอีเมลที่ใช้สมัคร</p>
      </section>

      <form className="form form-narrow" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label">รหัสติดตาม (Tracking Code)</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="MKR-INT-2026-0001"
            required
          />
        </div>
        <div className="field">
          <label className="field-label">อีเมล</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'กำลังค้นหา…' : 'ค้นหาสถานะ'}
        </button>
      </form>

      {data && (
        <section className="section">
          <div className="track-head">
            <h2>{data.trackingCode}</h2>
            {data.applicant && (
              <p className="muted">
                {data.applicant.firstName} {data.applicant.lastName}
                {data.positionApplied ? ` · ${data.positionApplied}` : ''}
              </p>
            )}
          </div>

          <StatusStepper status={data.status} />

          {data.assignedBranch && (
            <p className="muted">สาขาที่กำหนด: {data.assignedBranch}</p>
          )}

          <h3 style={{ marginTop: 24 }}>ประวัติสถานะ</h3>
          <ul className="history">
            {data.statusHistory
              .slice()
              .reverse()
              .map((h, i) => (
                <li key={i}>
                  <strong>{statusLabel(h.status)}</strong>
                  <span className="muted">
                    {' '}
                    · {h.at ? new Date(h.at).toLocaleString('th-TH') : ''}
                    {h.note ? ` · ${h.note}` : ''}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
