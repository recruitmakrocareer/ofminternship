interface Props {
  active: 'dash' | 'list';
  count?: number;
  onDash: () => void;
  onList: () => void;
}

// Sidebar ของ Admin console — ใช้ร่วมกันระหว่างหน้า Dashboard และ Candidate Profile
export default function AdminSidebar({ active, count, onDash, onList }: Props) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <div className="brand" style={{ fontSize: 22 }}>
          makro
        </div>
        <span className="admin-badge">ADMIN</span>
      </div>

      <button className={`admin-nav ${active === 'dash' ? 'active' : ''}`} onClick={onDash}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
        ภาพรวม
      </button>

      <button className={`admin-nav ${active === 'list' ? 'active' : ''}`} onClick={onList}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
        ผู้สมัคร
        {count != null && <span className="count">{count}</span>}
      </button>

      <button className="admin-nav" style={{ cursor: 'default' }} disabled>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        ตารางสัมภาษณ์
      </button>
      <button className="admin-nav" style={{ cursor: 'default' }} disabled>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
        รายงาน
      </button>

      <div className="admin-user">
        <div className="av">TA</div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ font: "600 13px 'Anuphan'", color: '#fff' }}>ทีม Recruitment</div>
          <div style={{ fontSize: 11, color: '#7E8DB0' }}>CP AXTRA</div>
        </div>
      </div>
    </aside>
  );
}
