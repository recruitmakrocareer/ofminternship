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

const DIMENSIONS: { key: string; label: string; get: (c: Candidate) => string }[] = [
  { key: 'major', label: 'สาขาวิชา', get: (c) => String(c.major || '') },
  { key: 'university', label: 'มหาวิทยาลัย', get: (c) => String(c.university || '') },
  { key: 'region', label: 'ภูมิภาค', get: (c) => String(c.applicationForm?.region || '') },
  { key: 'store', label: 'สาขาที่สะดวก', get: (c) => String(c.applicationForm?.preferBranch || '') },
];

// ปรับแต่งมุมมอง — เก็บใน localStorage
const PREFS_KEY = 'ofm_admin_view_prefs';
interface Prefs {
  widgets: { kpi: boolean; pipeline: boolean; field: boolean; uni: boolean; recent: boolean };
  density: 'comfortable' | 'compact';
  uniSort: 'count' | 'acc' | 'name';
  uniAll: boolean;
}
const DEFAULT_PREFS: Prefs = {
  widgets: { kpi: true, pipeline: true, field: true, uni: true, recent: true },
  density: 'comfortable',
  uniSort: 'count',
  uniAll: false,
};
const WIDGET_LABELS: Record<keyof Prefs['widgets'], string> = {
  kpi: 'KPI สรุป', pipeline: 'Pipeline การคัดเลือก', field: 'แยกตามสาย', uni: 'สรุปมหาวิทยาลัย', recent: 'ผู้สมัครล่าสุด',
};
const SORT_OPTS: [Prefs['uniSort'], string][] = [['count', 'ใบสมัครมากสุด'], ['acc', 'รับเข้ามากสุด'], ['name', 'ชื่อ ก–ฮ']];

function initial(name: string) {
  return (name || '?').trim().charAt(0) || '?';
}
function chipStyle(on: boolean) {
  return on
    ? { background: 'rgba(255,196,46,.14)', color: '#FFC42E', borderColor: 'rgba(255,196,46,.45)' }
    : { background: '#12244F', color: '#7E8DB0', borderColor: 'rgba(63,197,240,.22)' };
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
  const [customOpen, setCustomOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      return { ...DEFAULT_PREFS, ...p, widgets: { ...DEFAULT_PREFS.widgets, ...(p.widgets || {}) } };
    } catch {
      return DEFAULT_PREFS;
    }
  });

  function savePrefs(p: Prefs) {
    setPrefs(p);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }
  const toggleWidget = (k: keyof Prefs['widgets']) => savePrefs({ ...prefs, widgets: { ...prefs.widgets, [k]: !prefs.widgets[k] } });

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
    return {
      total,
      prescreened: count(AFTER_PRESCREEN),
      shortlist: count(AFTER_SHORTLIST),
      interview: count(AFTER_INTERVIEW),
      accepted: candidates.filter((c) => stOf(c) === 'accepted').length,
    };
  }, [candidates]);

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
    return { rows, max: rows.length ? Math.max(...rows.map((r) => r[1])) : 1, total: candidates.length, groups: sorted.length };
  }, [candidates, dim]);

  // สรุปมหาวิทยาลัย — GROUP BY ชื่อสถาบัน (total / shortlist / accepted)
  const uniView = useMemo(() => {
    const map: Record<string, { name: string; count: number; short: number; acc: number }> = {};
    candidates.forEach((c) => {
      const name = String(c.university || '').trim() || 'ไม่ระบุ';
      const st = stOf(c);
      if (!map[name]) map[name] = { name, count: 0, short: 0, acc: 0 };
      map[name].count++;
      if (AFTER_SHORTLIST.includes(st)) map[name].short++;
      if (st === 'accepted') map[name].acc++;
    });
    const unis = Object.values(map);
    if (prefs.uniSort === 'name') unis.sort((a, b) => a.name.localeCompare(b.name, 'th'));
    else if (prefs.uniSort === 'acc') unis.sort((a, b) => b.acc - a.acc || b.count - a.count);
    else unis.sort((a, b) => b.count - a.count);
    const totalApps = unis.reduce((s, u) => s + u.count, 0);
    const max = unis.length ? Math.max(...unis.map((u) => u.count)) : 1;
    const shown = prefs.uniAll ? unis : unis.slice(0, 6);
    return { unis, shown, totalApps, max };
  }, [candidates, prefs.uniSort, prefs.uniAll]);

  const recent = useMemo(() => [...candidates].reverse().slice(0, 5), [candidates]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return candidates;
    return candidates.filter((c) => `${c.firstName} ${c.lastName} ${c.university} ${c.faculty}`.toLowerCase().includes(s));
  }, [candidates, q]);

  const pct = (n: number) => (m.total ? Math.round((n / m.total) * 100) : 0);
  const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '—');
  const rowPad = prefs.density === 'compact' ? '8px' : '13px';

  function Row({ c }: { c: Candidate }) {
    const st = stOf(c);
    const bs = badgeStyle(st);
    return (
      <div className="dt-row" onClick={() => nav(`/admin/candidate/${c.candidateId}`)}>
        <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="avatar-ini" style={{ flexBasis: 36, height: 36 }}>{initial(c.firstName)}</span>
          <span>
            <span style={{ font: "600 14px 'Anuphan'", color: '#fff', display: 'block' }}>{c.firstName} {c.lastName}</span>
            <span style={{ fontSize: 12, color: '#7E8DB0' }}>{c.university}</span>
          </span>
        </span>
        <span style={{ flex: '0 0 150px', fontSize: 13, color: '#C4CEE6' }}>{c.faculty || '—'}</span>
        <span style={{ flex: '0 0 80px', fontSize: 13, color: '#C4CEE6' }}>{c.gpa || '—'}</span>
        <span style={{ flex: '0 0 130px', fontSize: 13, color: '#A9B6D4' }}>{fmtDate(String(c.createdAt))}</span>
        <span style={{ flex: '0 0 130px' }}>
          <span className="badge" style={bs}>{statusLabel(st)}</span>
        </span>
      </div>
    );
  }

  if (!token || error === 'Admin token ไม่ถูกต้อง') {
    return (
      <div className="admin-shell">
        <div className="admin-main" style={{ margin: '0 auto' }}>
          <div className="token-gate">
            <h1 className="admin-h1" style={{ fontSize: 24 }}>เข้าสู่ระบบ Admin</h1>
            <p className="admin-sub" style={{ marginBottom: 20 }}>สำหรับทีม Recruitment เท่านั้น</p>
            <form onSubmit={saveToken} className="panel">
              <label className="lbl">Admin Token</label>
              <input className="fld" type="password" value={input} onChange={(e) => setInput(e.target.value)} placeholder="วาง ADMIN_TOKEN" />
              {error && <p className="error-text" style={{ marginTop: 12 }}>{error}</p>}
              <button className="btn btn-red btn-block" style={{ marginTop: 16 }}>เข้าสู่ระบบ</button>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h1 className="admin-h1">ภาพรวมการรับสมัคร</h1>
                <p className="admin-sub">Order Fulfillment Internship 2026</p>
              </div>
              <button
                className="dim-tab"
                style={{ padding: '10px 16px', fontSize: 13, ...(customOpen ? { background: 'rgba(255,196,46,.15)', color: '#FFC42E', borderColor: 'rgba(255,196,46,.45)' } : {}) }}
                onClick={() => setCustomOpen((o) => !o)}
              >
                ⚙︎ ปรับแต่งมุมมอง
              </button>
            </div>

            {/* customize view panel */}
            {customOpen && (
              <div style={{ background: '#0E2148', border: '1px solid rgba(255,196,46,.3)', borderRadius: 18, padding: '20px 22px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ font: "700 15px 'Anuphan'", color: '#fff' }}>ปรับแต่งมุมมอง</div>
                  <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', font: "600 12px 'Anuphan'", color: '#7E8DB0' }} onClick={() => savePrefs(DEFAULT_PREFS)}>
                    รีเซ็ตค่าเริ่มต้น
                  </button>
                </div>
                <div style={{ fontSize: 12, color: '#7E8DB0', marginBottom: 10 }}>การ์ดที่แสดงบนหน้าภาพรวม</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                  {(Object.keys(WIDGET_LABELS) as (keyof Prefs['widgets'])[]).map((k) => {
                    const on = prefs.widgets[k];
                    const cs = chipStyle(on);
                    return (
                      <button key={k} onClick={() => toggleWidget(k)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${cs.borderColor}`, background: cs.background, color: cs.color, font: "600 13px 'Anuphan'", padding: '9px 15px', borderRadius: 10 }}>
                        <span style={{ fontSize: 12 }}>{on ? '✓' : '○'}</span> {WIDGET_LABELS[k]}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#7E8DB0', marginBottom: 8 }}>ความหนาแน่นของข้อมูล</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {([['comfortable', 'สบายตา'], ['compact', 'กระชับ']] as [Prefs['density'], string][]).map(([k, label]) => {
                        const cs = chipStyle(prefs.density === k);
                        return (
                          <button key={k} onClick={() => savePrefs({ ...prefs, density: k })} style={{ cursor: 'pointer', border: `1px solid ${cs.borderColor}`, background: cs.background, color: cs.color, font: "600 13px 'Anuphan'", padding: '9px 15px', borderRadius: 10 }}>{label}</button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#7E8DB0', marginBottom: 8 }}>เรียงลำดับมหาวิทยาลัย</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {SORT_OPTS.map(([k, label]) => {
                        const cs = chipStyle(prefs.uniSort === k);
                        return (
                          <button key={k} onClick={() => savePrefs({ ...prefs, uniSort: k })} style={{ cursor: 'pointer', border: `1px solid ${cs.borderColor}`, background: cs.background, color: cs.color, font: "600 13px 'Anuphan'", padding: '9px 15px', borderRadius: 10 }}>{label}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* KPI */}
            {prefs.widgets.kpi && (
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
                  <div className="n">{m.accepted} <span style={{ fontSize: 18, color: '#7E8DB0' }}>/ {QUOTA}</span></div>
                  <div className="sub">เหลือโควตา {Math.max(0, QUOTA - m.accepted)} อัตรา</div>
                </div>
              </div>
            )}

            {/* pipeline + breakdown row (flex-wrap so remaining card fills) */}
            {(prefs.widgets.pipeline || prefs.widgets.field) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 22 }}>
                {prefs.widgets.pipeline && (
                  <div className="panel" style={{ flex: '1.4 1 380px' }}>
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
                          <div className="funnel-fill" style={{ width: `${Math.max(pct(r.n), r.n ? 8 : 0)}%`, background: r.grad, color: r.color }}>{r.n}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {prefs.widgets.field && (
                  <div className="panel" style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0 }}>
                        แยกตาม <span style={{ fontSize: 13, color: '#7E8DB0', fontWeight: 400 }}>· รวม {breakdown.total} · {breakdown.groups} กลุ่ม</span>
                      </h3>
                      <div className="dim-tabs">
                        {DIMENSIONS.map((d) => (
                          <button key={d.key} className={`dim-tab ${dim === d.key ? 'on' : ''}`} onClick={() => setDim(d.key)}>{d.label}</button>
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
                )}
              </div>
            )}

            {/* university summary */}
            {prefs.widgets.uni && (
              <div className="panel" style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px' }}>สรุปมหาวิทยาลัยที่สมัครเข้ามา</h3>
                    <p style={{ fontSize: 13, color: '#7E8DB0', margin: 0 }}>{uniView.unis.length} สถาบัน · {uniView.totalApps} ใบสมัคร</p>
                  </div>
                  <div className="dim-tabs">
                    {SORT_OPTS.map(([k, label]) => (
                      <button key={k} className={`dim-tab ${prefs.uniSort === k ? 'on' : ''}`} onClick={() => savePrefs({ ...prefs, uniSort: k })}>{label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', padding: '14px 12px 10px', font: "700 11px 'Anuphan'", color: '#7E8DB0', letterSpacing: 0.5, borderBottom: '1px solid rgba(63,197,240,.15)', textTransform: 'uppercase' }}>
                  <span style={{ flex: '1 1 200px', minWidth: 140 }}>มหาวิทยาลัย</span>
                  <span style={{ flex: '0 1 200px', minWidth: 84 }}>สัดส่วน</span>
                  <span style={{ flex: '0 0 64px', textAlign: 'right' }}>ใบสมัคร</span>
                  <span style={{ flex: '0 0 64px', textAlign: 'right' }}>Short</span>
                  <span style={{ flex: '0 0 64px', textAlign: 'right' }}>รับเข้า</span>
                </div>
                {uniView.shown.map((u, i) => {
                  const barColor = u.acc > 0 ? '#4FD08A' : u.short > 0 ? '#FFC42E' : '#3FC5F0';
                  return (
                    <div key={u.name} style={{ display: 'flex', alignItems: 'center', padding: `${rowPad} 12px`, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                      <span style={{ flex: '1 1 200px', minWidth: 140, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ flex: '0 0 24px', height: 24, borderRadius: 7, background: '#12244F', border: '1px solid rgba(63,197,240,.22)', display: 'grid', placeItems: 'center', font: "700 11px 'Anuphan'", color: '#7E8DB0' }}>{i + 1}</span>
                        <span style={{ flex: 1, minWidth: 0, font: "600 13.5px 'Anuphan'", color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</span>
                      </span>
                      <span style={{ flex: '0 1 200px', minWidth: 84, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ flex: 1, minWidth: 30, height: 7, background: '#0A1730', borderRadius: 999, overflow: 'hidden', display: 'block' }}>
                          <span style={{ display: 'block', height: '100%', width: `${Math.round((u.count / uniView.max) * 100)}%`, background: barColor }} />
                        </span>
                        <span style={{ flex: '0 0 34px', fontSize: 12, color: '#A9B6D4', textAlign: 'right' }}>{uniView.totalApps ? Math.round((u.count / uniView.totalApps) * 100) : 0}%</span>
                      </span>
                      <span style={{ flex: '0 0 64px', textAlign: 'right', font: "700 14px 'Anuphan'", color: '#fff' }}>{u.count}</span>
                      <span style={{ flex: '0 0 64px', textAlign: 'right', font: "600 13px 'Anuphan'", color: '#FFC42E' }}>{u.short}</span>
                      <span style={{ flex: '0 0 64px', textAlign: 'right', font: "600 13px 'Anuphan'", color: u.acc > 0 ? '#4FD08A' : '#5A6890' }}>{u.acc}</span>
                    </div>
                  );
                })}
                {uniView.unis.length === 0 && <p className="muted" style={{ paddingTop: 12 }}>ยังไม่มีข้อมูล</p>}
                {uniView.unis.length > 6 && (
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14 }}>
                    <button style={{ border: '1px solid rgba(63,197,240,.28)', background: '#12244F', cursor: 'pointer', font: "600 13px 'Anuphan'", color: '#3FC5F0', padding: '9px 20px', borderRadius: 10 }} onClick={() => savePrefs({ ...prefs, uniAll: !prefs.uniAll })}>
                      {prefs.uniAll ? 'แสดงเฉพาะ 6 อันดับแรก' : `ดูทั้งหมด ${uniView.unis.length} สถาบัน`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* recent */}
            {prefs.widgets.recent && (
              <div className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>ผู้สมัครล่าสุด</h3>
                  <button className="dim-tab" style={{ border: 'none', background: 'transparent', color: '#3FC5F0', padding: 0 }} onClick={() => setView('list')}>ดูทั้งหมด →</button>
                </div>
                {loading && <p className="muted">กำลังโหลด…</p>}
                {!loading && recent.length === 0 && <p className="muted">ยังไม่มีผู้สมัคร</p>}
                {recent.map((c) => {
                  const st = stOf(c);
                  const bs = badgeStyle(st);
                  return (
                    <div key={c.candidateId} className="recent-row" style={{ padding: `${rowPad} 12px` }} onClick={() => nav(`/admin/candidate/${c.candidateId}`)}>
                      <div className="avatar-ini">{initial(c.firstName)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ font: "600 14px 'Anuphan'", color: '#fff' }}>{c.firstName} {c.lastName}</div>
                        <div style={{ fontSize: 12, color: '#7E8DB0' }}>{c.university} · {c.faculty}</div>
                      </div>
                      <div style={{ flex: '0 0 90px', fontSize: 13, color: '#A9B6D4' }}>GPAX {c.gpa || '—'}</div>
                      <span className="badge" style={bs}>{statusLabel(st)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="admin-h1">ผู้สมัครทั้งหมด</h1>
            <p className="admin-sub" style={{ marginBottom: 22 }}>{m.total} ใบสมัคร · Order Fulfillment Internship 2026</p>
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
