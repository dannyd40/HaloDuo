import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const NAV_ITEMS = [
  { path: '/journal', label: 'Journal', icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>) },
  { path: '/tableau', label: 'Nous', icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>) },
  { path: '/recommandation', label: 'Conseil', icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>) },
  { path: '/bibliotheque', label: 'Biblio', icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>) },
  { path: '/compte', label: 'Moi', icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>) },
];

export function Navbar() {
  const { user } = useAuth();
  return (
    <nav className="navbar">
      <Link to="/tableau" className="logo">Halo <span>Duo</span></Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user?.is_admin && (
          <Link to="/admin" style={{ fontSize: 11, color: 'var(--gold)', background: 'rgba(201,168,76,0.1)', padding: '3px 10px', borderRadius: 100, textDecoration: 'none' }}>
            Admin
          </Link>
        )}
        {user && <BadgePlan plan={user.plan} />}
      </div>
    </nav>
  );
}

export function BottomNav() {
  const location = useLocation();
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => (
        <Link key={item.path} to={item.path} className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}>
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function BadgePlan({ plan }) {
  if (!plan || plan === 'gratuit') return (
    <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--cream-dark)', padding: '3px 10px', borderRadius: 100 }}>
      Gratuit
    </span>
  );
  return (
    <span style={{ fontSize: 11, color: 'var(--gold)', background: 'rgba(201,168,76,0.1)', padding: '3px 10px', borderRadius: 100 }}>
      ✦ Premium
    </span>
  );
}
