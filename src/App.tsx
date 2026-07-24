import { HashRouter, Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Landing from './pages/Landing';
import ProgramJourney from './pages/ProgramJourney';
import Apply from './pages/Apply';
import TrackStatus from './pages/TrackStatus';
import Dashboard from './admin/Dashboard';
import CandidateProfile from './admin/CandidateProfile';

function TabBar() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const is = (p: string) => (pathname === p ? 'tab active' : 'tab');
  return (
    <nav className="tabbar">
      <button className={is('/')} onClick={() => nav('/')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <path d="M9 22V12h6v10" />
        </svg>
        <span>หน้าแรก</span>
      </button>
      <button className={is('/journey')} onClick={() => nav('/journey')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h4l3 8 4-16 3 8h4" />
        </svg>
        <span>เส้นทาง</span>
      </button>
      <button className="tab" onClick={() => nav('/apply')}>
        <span className="tab-fab">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <span className="tab-fab-label">สมัคร</span>
      </button>
      <button className={is('/track')} onClick={() => nav('/track')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <span>ติดตาม</span>
      </button>
    </nav>
  );
}

// Layout ฝั่งผู้สมัคร — mobile frame + bottom tab bar (ซ่อนแท็บบนหน้า Apply)
function AppLayout() {
  const { pathname } = useLocation();
  const isApply = pathname === '/apply';
  return (
    <div className="app-shell">
      <div className={`app-body ${isApply ? 'no-tabs' : ''}`}>
        <Outlet />
      </div>
      {!isApply && <TabBar />}
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/journey" element={<ProgramJourney />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/track" element={<TrackStatus />} />
        </Route>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/candidate/:id" element={<CandidateProfile />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </HashRouter>
  );
}
