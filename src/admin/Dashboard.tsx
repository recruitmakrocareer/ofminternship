import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminListCandidates, type Candidate } from '../lib/api';
import { LOOKER_STUDIO_URL } from '../config';
import { statusLabel } from '../components/StatusStepper';

const TOKEN_KEY = 'mkr_admin_token';

// Dashboard แอดมิน — embed Looker Studio + ตารางสรุปผู้สมัคร (token-protected)
export default function Dashboard() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [input, setInput] = useState(token);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function load(tk: string) {
    if (!tk) return;
    setLoading(true);
    setError('');
    adminListCandidates(tk)
      .then((r) => {
        if (r.ok && r.candidates) setCandidates(r.candidates);
        else setError(r.error === 'unauthorized' ? 'Admin token ไม่ถูกต้อง' : r.error || 'error');
      })
      .catch(() => setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (token) load(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveToken(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem(TOKEN_KEY, input);
    setToken(input);
    load(input);
  }

  // สรุปภาพรวมแบบเบา ๆ ฝั่ง client (Looker Studio ทำ metric หลัก)
  const summary = useMemo(() => {
    const byStatus: Record<string, number> = {};
    let prescreened = 0;
    candidates.forEach((c) => {
      const st = c.application?.status || 'submitted';
      byStatus[st] = (byStatus[st] || 0) + 1;
      if (c.aiStatus === 'done') prescreened++;
    });
    return { total: candidates.length, byStatus, prescreened };
  }, [candidates]);

  return (
    <div className="page">
      <section className="hero hero-sm">
        <h1>Ops Recruitment Dashboard</h1>
        <p className="lead">ภาพรวมผู้สมัครฝึกงาน (เฉพาะทีม Recruitment)</p>
      </section>

      <form className="form form-narrow" onSubmit={saveToken}>
        <div className="field">
          <label className="field-label">Admin Token</label>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="วาง ADMIN_TOKEN"
          />
          <p className="hint">เก็บไว้ใน browser นี้เท่านั้น (localStorage) ไม่ถูกส่งขึ้น repo</p>
        </div>
        <button type="submit" className="btn btn-primary">
          เข้าสู่ระบบ
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}

      {token && !error && (
        <>
          <section className="section">
            <div className="stat-row">
              <div className="stat">
                <span className="stat-num">{summary.total}</span>
                <span className="stat-label">ผู้สมัครทั้งหมด</span>
              </div>
              <div className="stat">
                <span className="stat-num">{summary.prescreened}</span>
                <span className="stat-label">ผ่าน AI pre-screen</span>
              </div>
              {Object.entries(summary.byStatus).map(([st, n]) => (
                <div key={st} className="stat">
                  <span className="stat-num">{n}</span>
                  <span className="stat-label">{statusLabel(st)}</span>
                </div>
              ))}
            </div>
          </section>

          {LOOKER_STUDIO_URL && (
            <section className="section">
              <h2>Looker Studio</h2>
              <div className="looker-wrap">
                <iframe title="Looker Studio" src={LOOKER_STUDIO_URL} allowFullScreen />
              </div>
            </section>
          )}

          <section className="section">
            <h2>รายชื่อผู้สมัคร</h2>
            {loading && <p className="muted">กำลังโหลด…</p>}
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>รหัส</th>
                    <th>ชื่อ-สกุล</th>
                    <th>มหาวิทยาลัย / คณะ</th>
                    <th>AI Score</th>
                    <th>สถานะ</th>
                    <th>Tracking</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.candidateId}>
                      <td>{c.candidateId}</td>
                      <td>
                        {c.firstName} {c.lastName}
                      </td>
                      <td>
                        {c.university}
                        <br />
                        <span className="muted">{c.faculty}</span>
                      </td>
                      <td>{c.aiStatus === 'done' ? c.aiMatchScore : c.aiStatus}</td>
                      <td>{statusLabel(c.application?.status || 'submitted')}</td>
                      <td>{c.application?.trackingCode || '-'}</td>
                      <td>
                        <Link to={`/admin/candidate/${c.candidateId}`} className="btn btn-sm btn-ghost">
                          เปิด
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!loading && candidates.length === 0 && (
                    <tr>
                      <td colSpan={7} className="muted">
                        ยังไม่มีผู้สมัคร
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
