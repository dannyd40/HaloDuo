import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';

const TABS = [
  { path: '/admin', label: 'Dashboard' },
  { path: '/admin/utilisateurs', label: 'Utilisateurs' },
  { path: '/admin/couples', label: 'Couples' },
];

export function AdminTabs({ current }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 32, background: 'var(--cream-dark)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
      {TABS.map(tab => (
        <Link key={tab.path} to={tab.path}
          style={{
            flex: 1, textAlign: 'center', padding: '10px 16px', borderRadius: 6,
            background: current === tab.path ? 'white' : 'transparent',
            color: current === tab.path ? 'var(--text)' : 'var(--text-muted)',
            textDecoration: 'none', fontSize: 14, fontWeight: 500,
            boxShadow: current === tab.path ? 'var(--shadow)' : 'none',
            transition: 'all 0.2s',
          }}>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [indexing, setIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState(null);

  useEffect(() => {
    api('/admin/stats').then(setStats).catch(err => setError(err.message));
  }, []);

  const indexerTout = async () => {
    setIndexing(true); setIndexResult(null);
    try {
      const result = await api('/admin/indexer', { method: 'POST' });
      setIndexResult(`${result.total_chunks} chunks indexés pour ${result.couples.length} couple(s)`);
    } catch (err) {
      setIndexResult(`Erreur : ${err.message}`);
    }
    setIndexing(false);
  };

  const cards = stats ? [
    { label: 'Utilisateurs', value: stats.utilisateurs },
    { label: 'Couples', value: stats.couples },
    { label: 'Journaux aujourd\'hui', value: stats.journaux_aujourd_hui },
    { label: 'Abonnés Premium', value: stats.abonnes_premium },
  ] : [];

  return (
    <div className="page-container" style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 100px' }}>
      <h1 className="serif" style={{ fontSize: 28, marginBottom: 8 }}>Administration</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>Gestion de Halo Duo</p>

      <AdminTabs current="/admin" />

      {error && <p style={{ color: '#c44' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        {cards.map(card => (
          <div key={card.label} style={{
            background: 'white', borderRadius: 'var(--radius)', padding: 24,
            boxShadow: 'var(--shadow)', textAlign: 'center',
          }}>
            <div className="serif" style={{ fontSize: 36, color: 'var(--gold)', fontWeight: 600 }}>{card.value}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* RAG Indexation */}
      <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)' }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Indexation RAG</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Indexe les guides éthiques pour tous les couples via Ollama.
        </p>
        <button onClick={indexerTout} disabled={indexing}
          className="btn btn-primary" style={{ fontSize: 14 }}>
          {indexing ? 'Indexation en cours...' : 'Indexer tous les couples'}
        </button>
        {indexResult && (
          <p style={{ marginTop: 12, fontSize: 13, color: indexResult.startsWith('Erreur') ? '#c44' : 'var(--accent)' }}>
            {indexResult}
          </p>
        )}
      </div>
    </div>
  );
}
