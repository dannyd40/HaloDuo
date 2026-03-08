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
  const [rag, setRag] = useState(null);
  const [error, setError] = useState(null);
  const [indexing, setIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState(null);

  const loadRag = () => api('/admin/rag').then(setRag).catch(() => {});

  useEffect(() => {
    api('/admin/stats').then(setStats).catch(err => setError(err.message));
    loadRag();
  }, []);

  const indexerTout = async () => {
    setIndexing(true); setIndexResult(null);
    try {
      const result = await api('/admin/indexer', { method: 'POST' });
      setIndexResult(`${result.total_chunks} chunks indexés pour ${result.couples.length} couple(s)`);
      loadRag();
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
      <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)', marginBottom: 16 }}>
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

      {/* RAG Status */}
      {rag && (
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Statut RAG</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div style={{ textAlign: 'center', padding: 12, background: 'var(--cream)', borderRadius: 8 }}>
              <div className="serif" style={{ fontSize: 28, color: 'var(--gold)', fontWeight: 600 }}>{rag.total_chunks}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chunks</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: 'var(--cream)', borderRadius: 8 }}>
              <div className="serif" style={{ fontSize: 28, color: 'var(--gold)', fontWeight: 600 }}>{rag.total_documents}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Documents</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: 'var(--cream)', borderRadius: 8 }}>
              <div className="serif" style={{ fontSize: 28, color: 'var(--gold)', fontWeight: 600 }}>{rag.couples_indexes}/{rag.couples_total}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Couples indexés</div>
            </div>
          </div>

          {rag.documents.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cream-dark)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Document</th>
                  <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Cadre</th>
                  <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Chunks</th>
                  <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {rag.documents.map(doc => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                    <td style={{ padding: '8px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.nom}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 11, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        {doc.cadre}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{doc.nb_chunks || 0}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 100, fontSize: 11,
                        background: doc.statut === 'pret' ? 'rgba(39,174,96,0.1)' : doc.statut === 'erreur' ? 'rgba(231,76,60,0.1)' : 'rgba(241,196,15,0.1)',
                        color: doc.statut === 'pret' ? '#27AE60' : doc.statut === 'erreur' ? '#E74C3C' : '#F1C40F',
                      }}>
                        {doc.statut === 'pret' ? 'Indexé' : doc.statut === 'erreur' ? 'Erreur' : 'En cours'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {rag.documents.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Aucun document indexé. Cliquez sur "Indexer tous les couples" pour commencer.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
