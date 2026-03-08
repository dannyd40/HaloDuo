import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { AdminTabs } from './Dashboard';

export default function Couples() {
  const [couples, setCouples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(null);

  useEffect(() => {
    api('/admin/couples').then(d => setCouples(d.couples)).finally(() => setLoading(false));
  }, []);

  const reindexer = async (coupleId) => {
    setIndexing(coupleId);
    try {
      const result = await api(`/admin/couples/${coupleId}/indexer`, { method: 'POST' });
      alert(`Indexation terminée : ${result.chunks} chunks (${result.cadre})`);
    } catch (err) {
      alert(`Erreur : ${err.message}`);
    }
    setIndexing(null);
  };

  return (
    <div className="page-container" style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 100px' }}>
      <h1 className="serif" style={{ fontSize: 28, marginBottom: 8 }}>Administration</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>{couples.length} couples</p>

      <AdminTabs current="/admin/couples" />

      <div style={{ background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--cream-dark)', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Membres</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Cadre</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Créé le</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Journaux</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {couples.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                <td style={{ padding: '12px 16px' }}>
                  {c.membres.map(m => m.prenom || m.email).join(' & ')}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 12, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    {c.cadre_ethique}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
                  {new Date(c.date_creation).toLocaleDateString('fr-FR')}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{c.nb_journaux}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => reindexer(c.id)} disabled={indexing === c.id}
                    style={{
                      padding: '4px 12px', borderRadius: 6, border: '1px solid var(--gold-light)',
                      background: indexing === c.id ? 'var(--cream-dark)' : 'rgba(201,168,76,0.08)',
                      color: 'var(--gold)', fontSize: 12, cursor: indexing === c.id ? 'wait' : 'pointer',
                    }}>
                    {indexing === c.id ? 'Indexation...' : 'Re-indexer RAG'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
