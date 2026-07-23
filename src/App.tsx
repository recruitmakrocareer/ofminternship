import { HashRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
import Landing from './pages/Landing';
import ProgramJourney from './pages/ProgramJourney';
import Apply from './pages/Apply';
import TrackStatus from './pages/TrackStatus';
import Dashboard from './admin/Dashboard';
import CandidateProfile from './admin/CandidateProfile';

// ใช้ HashRouter เพื่อให้ deep link ทำงานบน GitHub Pages โดยไม่ต้องตั้ง 404 fallback
export default function App() {
  return (
    <HashRouter>
      <header className="topbar">
        <Link to="/" className="brand">
          CP AXTRA <span>Internship</span>
        </Link>
        <nav className="nav">
          <NavLink to="/journey">เส้นทางโครงการ</NavLink>
          <NavLink to="/apply">สมัคร</NavLink>
          <NavLink to="/track">ติดตามใบสมัคร</NavLink>
          <NavLink to="/admin">Admin</NavLink>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/journey" element={<ProgramJourney />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/track" element={<TrackStatus />} />
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/candidate/:id" element={<CandidateProfile />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </main>

      <footer className="footer">
        <p>© 2026 CP AXTRA (Makro) · Talent Acquisition · Internship Pilot</p>
      </footer>
    </HashRouter>
  );
}
