import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const GOOGLE_URL = `${import.meta.env.VITE_API_URL}/auth/google`;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(email, password);
      navigate('/tableau');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <Link to="/" className="logo" style={{ display: 'block', textAlign: 'center', marginBottom: 40 }}>
          Halo <span>Duo</span>
        </Link>
        <div className="card fade-up">
          <h2 className="serif" style={{ fontSize: 28, marginBottom: 24 }}>Connexion</h2>

          {error && <div className="error-msg">{error}</div>}

          <a href={GOOGLE_URL} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2a10.34 10.34 0 00-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" fill="#4285F4"/><path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.02-3.71H.96v2.33A8.99 8.99 0 009 18z" fill="#34A853"/><path d="M3.98 10.71A5.41 5.41 0 013.7 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 000 9c0 1.45.35 2.82.96 4.04l3.02-2.33z" fill="#FBBC05"/><path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A8.99 8.99 0 00.96 4.96L3.98 7.3C4.66 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/></svg>
            Continuer avec Google
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 20px', color: 'var(--text-muted)', fontSize: 12 }}>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--cream-dark)' }} />
            ou
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--cream-dark)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-soft)' }}>
            Pas encore de compte ? <Link to="/register" style={{ color: 'var(--accent)' }}>Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
