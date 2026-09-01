import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { adminGetCandidate, adminGetPhoto, adminListCandidates, adminUpdateStatus, type Application, type Candidate } from '../lib/api';
import { badgeStyle, statusLabel, STATUS_ACTIONS } from '../lib/status';
import AdminSidebar from './AdminSidebar';

const TOKEN_KEY = 'mkr_admin_token';
const initial = (n: string) => (n || '?').trim().charAt(0) || '?';

export default function CandidateProfile() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const statusFilter = sp.get('status') || '';
  const token = localStorage.getItem(TOKEN_KEY) || '';

  const [c, setC] = useState<Candidate | null>(null);
  const [app, setApp] = useState<Application | null>(null);
  const [photoUri, setPhotoUri] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [siblingIds, setSiblingIds] = useState<string[]>([]);

  // โหลดลำดับผู้สมัคร (ตามตัวกรองสถานะที่ส่งมาทาง ?status=) เพื่อทำปุ่มก่อนหน้า/ถัดไป
  useEffect(() => {
    if (!token) return;
    adminListCandidates(token).then((r) => {
      let list = r.ok && r.candidates ? r.candidates : [];
      if (statusFilter) list = list.filter((x) => (x.application?.status || 'submitted') === statusFilter);
      setSiblingIds(list.map((x) => x.candidateId));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const idx = siblingIds.indexOf(id);
  const prevId = idx > 0 ? siblingIds[idx - 1] : '';
  const nextId = idx >= 0 && idx < siblingIds.length - 1 ? siblingIds[idx + 1] : '';
  const goSibling = (sid: string) => nav(`/admin/candidate/${sid}${statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''}`);

  function reload() {
    setLoading(true);
    adminGetCandidate(token, id)
      .then((r) => {
        if (r.ok && r.candidate) {
          setC(r.candidate);
          setApp((r.applications || [])[0] || null);
        } else setError(r.error === 'unauthorized' ? 'Admin token ไม่ถูกต้อง' : r.error || 'error');
      })
      .catch(() => setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!token) {
      setError('ยังไม่ได้เข้าสู่ระบบ Admin');
      setLoading(false);
      return;
    }
    reload();
    setPhotoUri('');
    adminGetPhoto(token, id).then((r) => {
      if (r.ok && r.dataBase64) setPhotoUri(`data:${r.mimeType || 'image/jpeg'};base64,${r.dataBase64}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setStatus(status: string) {
    if (!app) return;
    setBusy(true);
    try {
      const res = await adminUpdateStatus(token, { trackingCode: app.trackingCode, status });
      if (res.ok) reload();
      else alert('บันทึกไม่สำเร็จ: ' + (res.error || 'unknown'));
    } finally {
      setBusy(false);
    }
  }

  const shell = (body: React.ReactNode) => (
    <div className="admin-shell">
      <AdminSidebar active="list" onDash={() => nav('/admin')} onList={() => nav('/admin')} />
      <main className="admin-main scroll">{body}</main>
    </div>
  );

  if (loading) return shell(<p className="muted">กำลังโหลด…</p>);
  if (error || !c)
    return shell(
      <div>
        <p className="error-text">{error || 'ไม่พบข้อมูล'}</p>
        <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => nav('/admin')}>
          ← กลับ Dashboard
        </button>
      </div>,
    );

  const form = c.applicationForm || {};
  const skills: string[] = Array.isArray(form.skills) ? form.skills : [];
  const st = app?.status || 'submitted';
  const bs = badgeStyle(st);
  const docs = [
    { url: c.resumeUrl, name: 'Resume', stroke: '#FF5A50' },
    { url: c.transcriptUrl, name: 'Transcript', stroke: '#FFC42E' },
    { url: (form._files && form._files.photo && form._files.photo.url) || '', name: 'รูปถ่าย', stroke: '#3FC5F0' },
  ].filter((d) => d.url);

  return shell(
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <button className="admin-nav" style={{ width: 'auto', padding: 0, color: '#3FC5F0' }} onClick={() => nav('/admin')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          กลับไปรายชื่อ
        </button>
        <span style={{ flex: 1 }} />
        {idx >= 0 && siblingIds.length > 1 && (
          <span style={{ fontSize: 13, color: '#7E8DB0' }}>
            {idx + 1} / {siblingIds.length}
            {statusFilter ? ` · ${statusLabel(statusFilter)}` : ''}
          </span>
        )}
        <button className="status-btn" disabled={!prevId} style={{ opacity: prevId ? 1 : 0.4, cursor: prevId ? 'pointer' : 'default' }} onClick={() => prevId && goSibling(prevId)}>
          ← ก่อนหน้า
        </button>
        <button className="status-btn" disabled={!nextId} style={{ opacity: nextId ? 1 : 0.4, cursor: nextId ? 'pointer' : 'default' }} onClick={() => nextId && goSibling(nextId)}>
          ถัดไป →
        </button>
      </div>

      <div className="profile-2col">
        {/* left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="pcard" style={{ textAlign: 'center' }}>
            <div className="pphoto">{photoUri ? <img src={photoUri} alt="รูปผู้สมัคร" /> : 'ไม่มีรูป'}</div>
            <h2 style={{ font: "800 22px 'Anuphan'", margin: '0 0 4px', color: '#fff' }}>
              {c.firstName} {c.lastName}
            </h2>
            <p style={{ fontSize: 13, color: '#A9B6D4', margin: '0 0 14px' }}>{c.faculty || '—'}</p>
            <span className="badge" style={bs}>
              {statusLabel(st)}
            </span>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn btn-red" style={{ flex: 1, fontSize: 13, padding: 12 }} disabled={busy} onClick={() => setStatus('interview')}>
                นัดสัมภาษณ์
              </button>
              <button className="status-btn red" style={{ padding: '12px 14px' }} disabled={busy} onClick={() => setStatus('rejected')}>
                ✕
              </button>
            </div>
          </div>

          <div className="pcard">
            <div style={{ font: "700 13px 'Anuphan'", color: '#fff', marginBottom: 14 }}>ข้อมูลติดต่อ</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 10, color: '#C4CEE6', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3FC5F0" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 6l-10 7L2 6" />
                </svg>
                {c.email}
              </div>
              <div style={{ display: 'flex', gap: 10, color: '#C4CEE6', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3FC5F0" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
                </svg>
                {c.phone}
              </div>
              <div style={{ display: 'flex', gap: 10, color: '#C4CEE6', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3FC5F0" strokeWidth="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
                {c.university}
              </div>
            </div>
          </div>
        </div>

        {/* right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="stat3">
            <div className="box">
              <div className="lb">GPAX</div>
              <div className="v">{c.gpa || '—'}</div>
            </div>
            <div className="box">
              <div className="lb">ชั้นปี</div>
              <div className="v">{c.yearLevel || form.year || '—'}</div>
            </div>
            <div className="box">
              <div className="lb">พร้อมเริ่ม</div>
              <div className="v sm">{form.availableFrom || '—'}</div>
            </div>
          </div>

          {/* สาขาที่ผู้สมัครเลือก — ใช้ตอนจัดสรรที่ฝึกงาน */}
          <div className="pcard">
            <div style={{ font: "700 15px 'Anuphan'", color: '#fff', marginBottom: 12 }}>สาขาที่สะดวกปฏิบัติงาน</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="rank-badge">1</span>
                <span style={{ fontSize: 13.5, color: '#EAF0FF' }}>{form.preferBranch || '—'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="rank-badge alt">2</span>
                <span style={{ fontSize: 13.5, color: form.preferBranch2 ? '#EAF0FF' : '#5A6890' }}>
                  {form.preferBranch2 || 'ไม่ระบุ'}
                </span>
              </div>
            </div>
            {form.region && <p style={{ fontSize: 12, color: '#7E8DB0', margin: '12px 0 0' }}>ภูมิภาค: {form.region}</p>}
          </div>

          <div className="pcard">
            <div style={{ font: "700 15px 'Anuphan'", color: '#fff', marginBottom: 14 }}>ทักษะเด่น</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: skills.length ? 20 : 0 }}>
              {skills.length ? skills.map((s) => <span key={s} className="skill-chip">{s}</span>) : <span className="muted">—</span>}
            </div>
            <div style={{ font: "700 15px 'Anuphan'", color: '#fff', margin: '4px 0 8px' }}>ประสบการณ์ / กิจกรรม</div>
            <p style={{ fontSize: 13.5, color: '#C4CEE6', lineHeight: 1.7, margin: 0 }}>{form.activities || '—'}</p>
          </div>

          <div className="pcard">
            <div style={{ font: "700 15px 'Anuphan'", color: '#fff', marginBottom: 16 }}>เอกสารแนบ</div>
            {docs.length === 0 ? (
              <p className="muted">ไม่มีเอกสารแนบ</p>
            ) : (
              <div className="doc-grid">
                {docs.map((d) => (
                  <a key={d.name} className="doc-card" href={d.url} target="_blank" rel="noreferrer">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={d.stroke} strokeWidth="1.8">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    <div>
                      <div className="n">{d.name}</div>
                      <div className="s">เปิดใน Drive</div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="status-control">
            <div style={{ font: "700 15px 'Anuphan'", color: '#fff', marginBottom: 14 }}>เปลี่ยนสถานะใบสมัคร</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STATUS_ACTIONS.map((a) => (
                <button
                  key={a.status}
                  className={`status-btn ${st === a.status ? 'on' : ''} ${a.variant || ''}`}
                  disabled={busy}
                  onClick={() => setStatus(a.status)}
                >
                  {a.label}
                </button>
              ))}
            </div>
            {app && (
              <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
                รหัสติดตาม: {app.trackingCode} · สถานะปัจจุบัน: {statusLabel(st)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>,
  );
}
