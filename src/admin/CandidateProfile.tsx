import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  adminGetCandidate,
  adminRetryScreen,
  adminUpdateStatus,
  ALL_STATUSES,
  type Application,
  type Candidate,
} from '../lib/api';
import { statusLabel } from '../components/StatusStepper';
import { FIELD_LABELS } from '../lib/formSchema';

const TOKEN_KEY = 'mkr_admin_token';

function renderFormValue(v: unknown): string {
  if (v == null || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'boolean') return v ? 'ใช่' : 'ไม่';
  return String(v);
}

// หน้าโปรไฟล์ผู้สมัคร (แอดมิน) — ข้อมูลครบ + ผล AI + ไฟล์ Drive + เปลี่ยนสถานะ
export default function CandidateProfile() {
  const { id = '' } = useParams();
  const token = localStorage.getItem(TOKEN_KEY) || '';

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [branch, setBranch] = useState('');

  function reload() {
    setLoading(true);
    adminGetCandidate(token, id)
      .then((r) => {
        if (r.ok && r.candidate) {
          setCandidate(r.candidate);
          setApplications(r.applications || []);
          const app = (r.applications || [])[0];
          if (app) {
            setNewStatus(app.status);
            setBranch(app.assignedBranch || '');
          }
        } else {
          setError(r.error === 'unauthorized' ? 'Admin token ไม่ถูกต้อง' : r.error || 'error');
        }
      })
      .catch(() => setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!token) {
      setError('ยังไม่ได้ใส่ Admin token — กลับไปหน้า Dashboard ก่อน');
      setLoading(false);
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const app = applications[0];

  async function saveStatus() {
    if (!app) return;
    setBusy(true);
    try {
      const res = await adminUpdateStatus(token, {
        trackingCode: app.trackingCode,
        status: newStatus,
        note,
        assignedBranch: branch,
      });
      if (res.ok) {
        setNote('');
        reload();
      } else {
        alert('บันทึกไม่สำเร็จ: ' + (res.error || 'unknown'));
      }
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    setBusy(true);
    try {
      const res = await adminRetryScreen(token, id);
      if (!res.ok) alert('AI retry ไม่สำเร็จ: ' + (res.error || 'unknown'));
      reload();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="page"><p className="muted">กำลังโหลด…</p></div>;
  if (error)
    return (
      <div className="page">
        <p className="error-text">{error}</p>
        <Link to="/admin" className="btn btn-ghost">
          ← กลับ Dashboard
        </Link>
      </div>
    );
  if (!candidate) return null;

  const c = candidate;

  return (
    <div className="page">
      <Link to="/admin" className="btn btn-ghost btn-sm">
        ← กลับ Dashboard
      </Link>

      <section className="section">
        <h1>
          {c.firstName} {c.lastName}
        </h1>
        <p className="muted">
          {c.candidateId} · {c.email} · {c.phone}
        </p>

        <div className="profile-grid">
          <div className="profile-block">
            <h3>การศึกษา</h3>
            <dl className="kv">
              <dt>มหาวิทยาลัย</dt>
              <dd>{c.university}</dd>
              <dt>คณะ / สาขา</dt>
              <dd>
                {c.faculty} / {c.major}
              </dd>
              <dt>GPA</dt>
              <dd>{c.gpa}</dd>
              <dt>ชั้นปี / ปีจบ</dt>
              <dd>
                {c.yearLevel} / {c.expectedGradYear}
              </dd>
            </dl>
          </div>

          <div className="profile-block">
            <h3>เอกสาร</h3>
            <ul className="file-links">
              {c.resumeUrl && (
                <li>
                  <a href={c.resumeUrl} target="_blank" rel="noreferrer">
                    📄 Resume
                  </a>
                </li>
              )}
              {c.transcriptUrl && (
                <li>
                  <a href={c.transcriptUrl} target="_blank" rel="noreferrer">
                    📄 Transcript
                  </a>
                </li>
              )}
              {(c.portfolio || []).map((p, i) => (
                <li key={i}>
                  <a href={p.url} target="_blank" rel="noreferrer">
                    📎 {p.name || `Portfolio ${i + 1}`}
                  </a>
                </li>
              ))}
              {!c.resumeUrl && !c.transcriptUrl && (c.portfolio || []).length === 0 && (
                <li className="muted">ไม่มีไฟล์แนบ</li>
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>ผลการคัดกรอง AI</h2>
        <div className="ai-card">
          <div className="ai-head">
            <span className={`badge badge-${c.aiStatus}`}>{c.aiStatus}</span>
            {c.aiStatus === 'done' && (
              <span className="ai-score">
                Match Score: <strong>{c.aiMatchScore}</strong> / 100
              </span>
            )}
            <button className="btn btn-sm btn-ghost" onClick={retry} disabled={busy}>
              🔄 รัน AI ใหม่
            </button>
          </div>

          {c.aiSummary && <p className="ai-summary">{c.aiSummary}</p>}

          {c.aiRecommendedBranch && (
            <p>
              <strong>สาขาที่แนะนำ:</strong> {c.aiRecommendedBranch}
            </p>
          )}

          {(c.aiMatchedRoles || []).length > 0 && (
            <div>
              <strong>ตำแหน่งที่จับคู่:</strong>
              <ul className="roles">
                {c.aiMatchedRoles.map((r, i) => (
                  <li key={i}>
                    {r.role} <span className="muted">({r.score})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(c.aiFlags || []).length > 0 && (
            <p className="chips">
              {c.aiFlags.map((f, i) => (
                <span key={i} className="chip chip-warn">
                  ⚑ {f}
                </span>
              ))}
            </p>
          )}
        </div>
      </section>

      {c.applicationForm && Object.keys(c.applicationForm).length > 0 && (
        <section className="section">
          <h2>รายละเอียดใบสมัคร (แบบฟอร์มเต็ม)</h2>
          <div className="profile-block">
            <dl className="kv">
              {FIELD_LABELS.map(({ key, label }) => {
                const v = c.applicationForm![key as string];
                if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) return null;
                return (
                  <div key={key as string} style={{ display: 'contents' }}>
                    <dt>{label}</dt>
                    <dd>{renderFormValue(v)}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </section>
      )}

      {app && (
        <section className="section">
          <h2>ใบสมัคร · {app.trackingCode}</h2>
          <p className="muted">
            สถานะปัจจุบัน: <strong>{statusLabel(app.status)}</strong>
          </p>

          <div className="grid-2">
            <div className="field">
              <label className="field-label">เปลี่ยนสถานะ</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">สาขาที่กำหนด</label>
              <input value={branch} onChange={(e) => setBranch(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="field-label">หมายเหตุ</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เหตุผล / บันทึกภายใน" />
          </div>
          <button className="btn btn-primary" onClick={saveStatus} disabled={busy}>
            {busy ? 'กำลังบันทึก…' : 'บันทึกสถานะ'}
          </button>

          <h3 style={{ marginTop: 24 }}>ประวัติสถานะ</h3>
          <ul className="history">
            {app.statusHistory
              .slice()
              .reverse()
              .map((h, i) => (
                <li key={i}>
                  <strong>{statusLabel(h.status)}</strong>
                  <span className="muted">
                    {' '}
                    · {h.at ? new Date(h.at).toLocaleString('th-TH') : ''} · {h.by}
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
