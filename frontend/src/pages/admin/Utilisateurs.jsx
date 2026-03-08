import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { AdminTabs } from './Dashboard';

export default function Utilisateurs() {
  const [data, setData] = useState({ users: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchUsers = (p = 1) => {
    setLoading(true);
    api(`/admin/users?page=${p}&limit=20`)
      .then(d => { setData(d); setPage(p); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const changePlan = async (userId, plan) => {
    if (!confirm(`Changer le plan en "${plan}" ?`)) return;
    await api(`/admin/users/${userId}`, { method: 'PATCH', body: { plan } });
    fetchUsers(page);
  };

  const deleteUser = async (userId, email) => {
    if (!confirm(`Supprimer ${email} ? Cette action est irréversible.`)) return;
    await api(`/admin/users/${userId}`, { method: 'DELETE' });
    fetchUsers(page);
  };

  const totalPages = Math.ceil(data.total / 20);

  return (
    <div className="page-container" style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 100px' }}>
      <h1 className="serif" style={{ fontSize: 28, marginBottom: 8 }}>Administration</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>{data.total} utilisateurs</p>

      <AdminTabs current="/admin/utilisateurs" />

      <div style={{ background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--cream-dark)', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Nom</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Email</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Plan</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Inscrit le</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                <td style={{ padding: '12px 16px' }}>{u.nom || '—'}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-soft)' }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <select value={u.plan || 'gratuit'} onChange={e => changePlan(u.id, e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--cream-dark)', fontSize: 13, background: 'white' }}>
                    <option value="gratuit">Gratuit</option>
                    <option value="mensuel">Mensuel</option>
                    <option value="annuel">Annuel</option>
                  </select>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
                  {new Date(u.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => deleteUser(u.id, u.email)}
                    style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e8c0c0', background: '#fdf4f4', color: '#c44', fontSize: 12, cursor: 'pointer' }}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i + 1} onClick={() => fetchUsers(i + 1)}
              style={{
                padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 13, cursor: 'pointer',
                background: page === i + 1 ? 'var(--gold)' : 'var(--cream-dark)',
                color: page === i + 1 ? 'white' : 'var(--text-soft)',
              }}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
