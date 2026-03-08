import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Navbar, BottomNav } from '../components/Nav.jsx';

export default function Conseil() {
  const navigate = useNavigate();
  const [journal, setJournal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/journal/aujourd-hui').then(r => setJournal(r.journal)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <><Navbar /><div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Chargement…</div><BottomNav /></>;

  if (!journal) return (
    <>
      <Navbar />
      <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
        <h2 className="serif" style={{ fontSize: 26, marginBottom: 8 }}>Pas encore de journal aujourd'hui</h2>
        <p style={{ color: 'var(--text-soft)', marginBottom: 24 }}>Remplissez votre journal pour recevoir votre conseil privé</p>
        <button className="btn btn-primary" onClick={() => navigate('/journal')}>Remplir mon journal →</button>
      </div>
      <BottomNav />
    </>
  );

  return (
    <>
      <Navbar />
      <div className="page">
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <h1 className="serif" style={{ fontSize: 36, fontWeight: 300 }}>Votre conseil <em>privé</em></h1>
          <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>🔒 Visible uniquement par vous</p>
        </div>

        {journal.conseil_prive ? (
          <div className="card fade-up" style={{ borderLeft: '3px solid var(--accent)', padding: 28, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
              ✦ Conseil personnalisé
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
              {journal.conseil_prive}
            </p>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
            <p>Limite de conseils IA atteinte cette semaine.</p>
            <a href="/pricing" className="btn btn-gold" style={{ marginTop: 12, display: 'inline-flex' }}>Passer Premium</a>
          </div>
        )}

        <div className="card fade-up-2" style={{ background: 'var(--cream-dark)' }}>
          <h3 className="serif" style={{ fontSize: 18, marginBottom: 12 }}>Vos scores du jour</h3>
          {Object.entries(journal.scores).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: 14 }}>
              <span style={{ color: 'var(--text-soft)' }}>{k}</span>
              <span style={{ fontWeight: 500, color: 'var(--accent)' }}>{v}/10</span>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </>
  );
}
