import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminListCandidates, type Candidate } from '../lib/api';
import { badgeStyle, statusLabel } from '../lib/status';
import AdminSidebar from './AdminSidebar';

const TOKEN_KEY = 'mkr_admin_token';
const QUOTA = 30;
const stOf = (c: Candidate) => c.application?.status || 'submitted';
const AFTER_PRESCREEN = ['prescreened', 'shortlisted', 'interview', 'offer', 'accepted'];
const AFTER_SHORTLIST = ['shortlisted', 'interview', 'offer', 'accepted'];
const AFTER_INTERVIEW = ['interview', 'offer', 'accepted'];

const FIELD_COLORS = ['#E2231A', '#FFC42E', '#3FC5F0', '#4FD08A', '#FF7A70', '#8A97B8', '#E0A312', '#2A9BC7'];

// มิติที่หมุนดูได้ในแผง breakdown
const DIMENSIONS: { key: string; label: string; get: (c: Candidate) => string }[] = [
  { key: 'major', label: 'สาขาวิชา', get: (c) => String(c.major || '') },
  { key: 'university', label: 'มหาวิทยาลัย', get: (c) => String(c.university || '') },
  { key: 'region', label: 'ภูมิภาค', get: (c) => String(c.applicationForm?.region || '') },
  { key: 'store', label: 'สาขาที่สะดวก', get: (c) => String(c.applicationForm?.preferBranch || '') },
];

function initial(name: string) {
  return (name || '?').trim().charAt(0) || '?';
}

export default function Dashboard() {
  const nav = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [input, setInput] = useState(token);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'dash' | 'list'>('dash');
  const [q, setQ] = useState('');
  const [dim, setDim] = useState('major');

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

  const m = useMemo(() => {
    const total = candidates.length;
    const count = (arr: string[]) => candidates.filter((c) => arr.includes(stOf(c))).length;
    const prescreened = count(AFTER_PRESCREEN);
    const shortlist = count(AFTER_SHORTLIST);
    const interview = count(AFTER_INTERVIEW);
    const accepted = candidates.filter((c) => stOf(c) === 'accepted').length;
    // by faculty
    const byField: Record<string, number> = {};
    candidates.forEach((c) => {
      const k = (c.faculty || 'อื่น ๆ').trim() || 'อื่น ๆ';
      byField[k] = (byField[k] || 0) + 1;
    });
    const fields = Object.entries(byField)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return { total, prescreened, shortlist, interview, accepted, fields };
  }, [candidates]);

  // breakdown ที่หมุนดูได้ตามมิติที่เลือก
  const breakdown = useMemo(() => {
    const getter = (DIMENSIONS.find((d) => d.key === dim) || DIMENSIONS[0]).get;
    const map: Record<string, number> = {};
    candidates.forEach((c) => {
      const k = (getter(c) || '').trim() || 'ไม่ระบุ';
      map[k] = (map[k] || 0) + 1;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const TOP = 8;
    const rows = sorted.slice(0, TOP);
    const rest = sorted.slice(TOP);
    if (rest.length) rows.push(['อื่น ๆ', rest.reduce((s, [, n]) => s + n, 0)]);
    const total = sorted.reduce((s, [, n]) => s + n, 0);
    return { rows, max: rows.length ? Math.max(...rows.map((r) => r[1])) : 1, total, groups: sorted.length };
  }, [candidates, dim]);

  const recent = useMemo(() => [...candidates].reverse().slice(0, 5), [candidates]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return candidates;
    return candidates.filter((c) =>
      `${c.firstName} ${c.lastName} ${c.university} ${c.faculty}`.toLowerCase().includes(s),
    );
  }, [candidates, q]);

  const pct = (n: number) => (m.total ? Math.round((n / m.total) * 100) : 0);
  const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '—');

  function Row({ c }: { c: Candidate }) {
    const st = stOf(c);
    const bs = badgeStyle(st);
    return (
      <div className="dt-row" onClick={() => nav(`/admin/candidate/${c.candidateId}`)}>
        <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="avatar-ini" style={{ flexBasis: 36, height: 36 }}>
            {initial(c.firstName)}
          </span>
          <span>
            <span style={{ font: "600 14px 'Anuphan'", color: '#fff', display: 'block' }}>
              {c.firstName} {c.lastName}
            </span>
            <span style={{ fontSize: 12, color: '#7E8DB0' }}>{c.university}</span>
          </span>
        </span>
        <span style={{ flex: '0 0 150px', fontSize: 13, color: '#C4CEE6' }}>{c.faculty || '—'}</span>
        <span style={{ flex: '0 0 80px', fontSize: 13, color: '#C4CEE6' }}>{c.gpa || '—'}</span>
        <span style={{ flex: '0 0 130px', fontSize: 13, color: '#A9B6D4' }}>{fmtDate(String(c.createdAt))}</span>
        <span style={{ flex: '0 0 130px' }}>
          <span className="badge" style={bs}>
            {statusLabel(st)}
          </span>
        </span>
      </div>
    );
  }

  // login gate
  if (!token || error === 'Admin token ไม่ถูกต้อง') {
    return (
      <div className="admin-shell">
        <div className="admin-main" style={{ margin: '0 auto' }}>
          <div className="token-gate">
            <h1 className="admin-h1" style={{ fontSize: 24 }}>
              เข้าสู่ระบบ Admin
            </h1>
            <p className="admin-sub" style={{ marginBottom: 20 }}>
              สำหรับทีม Recruitment เท่านั้น
            </p>
            <form onSubmit={saveToken} className="panel">
              <label className="lbl">Admin Token</label>
              <input className="fld" type="password" value={input} onChange={(e) => setInput(e.target.value)} placeholder="วาง ADMIN_TOKEN" />
              {error && <p className="error-text" style={{ marginTop: 12 }}>{error}</p>}
              <button className="btn btn-red btn-block" style={{ marginTop: 16 }}>
                เข้าสู่ระบบ
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <AdminSidebar active={view} count={m.total} onDash={() => setView('dash')} onList={() => setView('list')} />
      <main className="admin-main scroll">
        {view === 'dash' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 26 }}>
              <div>
                <h1 className="admin-h1">ภาพรวมการรับสมัคร</h1>
                <p className="admin-sub">Order Fulfillment Internship 2026</p>
              </div>
            </div>

            <div className="kpi-grid">
              <div className="kpi">
                <div className="lb">ใบสมัครทั้งหมด</div>
                <div className="n">{m.total}</div>
                <div className="sub">รวมทุกสถานะ</div>
              </div>
              <div className="kpi">
                <div className="lb">ผ่านคัดเลือก</div>
                <div className="n gold">{m.prescreened}</div>
                <div className="sub">{pct(m.prescreened)}% ของใบสมัคร</div>
              </div>
              <div className="kpi">
                <div className="lb">นัดสัมภาษณ์</div>
                <div className="n cyan">{m.interview}</div>
                <div className="sub">อยู่ระหว่างสัมภาษณ์</div>
              </div>
              <div className="kpi gold">
                <div className="lb">รับเข้าแล้ว</div>
                <div className="n">
                  {m.accepted} <span style={{ fontSize: 18, color: '#7E8DB0' }}>/ {QUOTA}</span>
                </div>
                <div className="sub">เหลือโควตา {Math.max(0, QUOTA - m.accepted)} อัตรา</div>
              </div>
            </div>

            <div className="two-col">
              <div className="panel">
                <h3>Pipeline การคัดเลือก</h3>
                {[
                  { lb: 'ส่งใบสมัคร', n: m.total, grad: 'linear-gradient(90deg,#3FC5F0,#2A9BC7)', color: '#05122B' },
                  { lb: 'คัดเลือกใบสมัคร', n: m.prescreened, grad: 'linear-gradient(90deg,#FFC42E,#E0A312)', color: '#05122B' },
                  { lb: 'Shortlist', n: m.shortlist, grad: 'linear-gradient(90deg,#FFC42E,#E0A312)', color: '#05122B' },
                  { lb: 'สัมภาษณ์', n: m.interview, grad: 'linear-gradient(90deg,#E2231A,#B4160F)', color: '#fff' },
                  { lb: 'รับเข้า', n: m.accepted, grad: '#4FD08A', color: '#05122B' },
                ].map((r) => (
                  <div key={r.lb} className="funnel-row">
                    <span className="lb">{r.lb}</span>
                    <div className="funnel-track">
                      <div className="funnel-fill" style={{ width: `${Math.max(pct(r.n), r.n ? 8 : 0)}%`, background: r.grad, color: r.color }}>
                        {r.n}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>
                    แยกตาม <span style={{ fontSize: 13, color: '#7E8DB0', fontWeight: 400 }}>· รวม {breakdown.total} · {breakdown.groups} กลุ่ม</span>
                  </h3>
                  <div className="dim-tabs">
                    {DIMENSIONS.map((d) => (
                      <button key={d.key} className={`dim-tab ${dim === d.key ? 'on' : ''}`} onClick={() => setDim(d.key)}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                {breakdown.rows.length === 0 && <p className="muted">ยังไม่มีข้อมูล</p>}
                {breakdown.rows.map(([name, n], i) => (
                  <div key={name} className="byfield-row">
                    <div className="byfield-top">
                      <span style={{ color: '#C4CEE6' }}>{name}</span>
                      <span style={{ color: '#fff', fontWeight: 700 }}>{n}</span>
                    </div>
                    <div className="byfield-track">
                      <div style={{ width: `${Math.round((n / breakdown.max) * 100)}%`, height: '100%', background: name === 'อื่น ๆ' ? '#5A6890' : FIELD_COLORS[i % FIELD_COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>ผู้สมัครล่าสุด</h3>
                <button className="admin-nav" style={{ width: 'auto', padding: 0, color: '#3FC5F0' }} onClick={() => setView('list')}>
                  ดูทั้งหมด →
                </button>
              </div>
              {loading && <p className="muted">กำลังโหลด…</p>}
              {!loading && recent.length === 0 && <p className="muted">ยังไม่มีผู้สมัคร</p>}
              {recent.map((c) => {
                const st = stOf(c);
                const bs = badgeStyle(st);
                return (
                  <div key={c.candidateId} className="recent-row" onClick={() => nav(`/admin/candidate/${c.candidateId}`)}>
                    <div className="avatar-ini">{initial(c.firstName)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ font: "600 14px 'Anuphan'", color: '#fff' }}>
                        {c.firstName} {c.lastName}
                      </div>
                      <div style={{ fontSize: 12, color: '#7E8DB0' }}>
                        {c.university} · {c.faculty}
                      </div>
                    </div>
                    <div style={{ flex: '0 0 90px', fontSize: 13, color: '#A9B6D4' }}>GPAX {c.gpa || '—'}</div>
                    <span className="badge" style={bs}>
                      {statusLabel(st)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <h1 className="admin-h1">ผู้สมัครทั้งหมด</h1>
            <p className="admin-sub" style={{ marginBottom: 22 }}>
              {m.total} ใบสมัคร · Order Fulfillment Internship 2026
            </p>
            <div className="admin-toolbar">
              <div className="admin-search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7E8DB0" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ / มหาวิทยาลัย..." />
              </div>
            </div>
            <div className="dt">
              <div className="dt-head">
                <span style={{ flex: 1 }}>ผู้สมัคร</span>
                <span style={{ flex: '0 0 150px' }}>สาย</span>
                <span style={{ flex: '0 0 80px' }}>GPAX</span>
                <span style={{ flex: '0 0 130px' }}>ยื่นเมื่อ</span>
                <span style={{ flex: '0 0 130px' }}>สถานะ</span>
              </div>
              {loading && <div className="dt-row"><span className="muted">กำลังโหลด…</span></div>}
              {!loading && filtered.length === 0 && <div className="dt-row"><span className="muted">ไม่พบผู้สมัคร</span></div>}
              {filtered.map((c) => (
                <Row key={c.candidateId} c={c} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
