import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Register() {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('code') || '';
  const [form, setForm] = useState({ nom: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await register(form.email, form.password, form.nom);
      navigate(inviteCode ? `/onboarding?code=${inviteCode}` : '/onboarding');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <Link to="/" className="logo" style={{ display: 'block', textAlign: 'center', marginBottom: 40 }}>
          Halo <span>Duo</span>
        </Link>
        <div className="card fade-up">
          <h2 className="serif" style={{ fontSize: 28, marginBottom: 24 }}>Créer votre compte</h2>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Votre prénom</label>
              <input className="form-input" type="text" value={form.nom} onChange={set('nom')} placeholder="Sophie" required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <input className="form-input" type="password" value={form.password} onChange={set('password')} minLength={8} required />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>8 caractères minimum</span>
            </div>
            <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }} disabled={loading}>
              {loading ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-soft)' }}>
            Déjà un compte ? <Link to={inviteCode ? `/login?code=${inviteCode}` : '/login'} style={{ color: 'var(--accent)' }}>Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
