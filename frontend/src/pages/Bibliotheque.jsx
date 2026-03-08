import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Navbar, BottomNav } from '../components/Nav.jsx';

export default function Bibliotheque() {
  const navigate = useNavigate();
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/pdf').then(r => setPdfs(r.pdfs)).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <div className="page">
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <h1 className="serif" style={{ fontSize: 36, fontWeight: 300 }}>Bibliothèque <em>éthique</em></h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 13 }}>Guides de bien-être adaptés à votre cadre éthique</p>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Chargement…</div>
        ) : pdfs.length === 0 ? (
          <div className="card fade-up" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
            <p style={{ color: 'var(--text-soft)', fontSize: 15 }}>
              Aucun guide disponible pour le moment.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pdfs.map(pdf => (
              <div key={pdf.id} className="card fade-up" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: pdf.statut === 'pret' ? 'pointer' : 'default',
                opacity: pdf.statut === 'erreur' ? 0.5 : 1,
              }} onClick={() => pdf.statut === 'pret' && navigate(`/bibliotheque/${pdf.id}`)}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>📄 {pdf.nom}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {pdf.cadre} · {pdf.nb_chunks} passages indexés
                  </div>
                </div>
                <div style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 100,
                  background: pdf.statut === 'pret' ? 'rgba(39,174,96,0.1)' : pdf.statut === 'indexation' ? 'rgba(230,126,34,0.1)' : 'rgba(192,57,43,0.1)',
                  color: pdf.statut === 'pret' ? '#27AE60' : pdf.statut === 'indexation' ? '#E67E22' : '#C0392B',
                }}>
                  {pdf.statut === 'pret' ? '✓ Prêt' : pdf.statut === 'indexation' ? '⏳ En cours' : '✗ Erreur'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </>
  );
}
