import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth.jsx';
import { Navbar, BottomNav } from '../components/Nav.jsx';
import { ModalUpgrade } from '../components/Freemium.jsx';

const CADRES = ['laique', 'islam', 'christianisme', 'judaisme', 'bouddhisme'];

export default function Bibliotheque() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [cadreUpload, setCadreUpload] = useState('laique');
  const fileRef = useRef();

  useEffect(() => {
    if (user?.plan !== 'gratuit') {
      api('/pdf').then(r => setPdfs(r.pdfs)).catch(console.error).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('cadre', cadreUpload);

    try {
      const token = (await import('../utils/api')).getAccessToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/pdf/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      api('/pdf').then(r => setPdfs(r.pdfs));
    } catch (err) {
      alert(err.message);
    } finally { setUploading(false); }
  };

  if (user?.plan === 'gratuit') return (
    <>
      <Navbar />
      <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>📚</div>
        <h2 className="serif" style={{ fontSize: 28, marginBottom: 12 }}>Bibliothèque éthique</h2>
        <p style={{ color: 'var(--text-soft)', fontSize: 15, marginBottom: 32, maxWidth: 380, margin: '0 auto 32px' }}>
          Importez vos livres religieux ou de psychologie. L'IA s'en inspire pour personnaliser vos conseils.
        </p>
        <button className="btn btn-gold" onClick={() => setShowUpgrade(true)} style={{ fontSize: 16, padding: '14px 32px' }}>
          ✦ Débloquer avec Premium
        </button>
      </div>
      <BottomNav />
      <ModalUpgrade open={showUpgrade} onClose={() => setShowUpgrade(false)} reason="La bibliothèque éthique est disponible en Premium." />
    </>
  );

  return (
    <>
      <Navbar />
      <div className="page">
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <h1 className="serif" style={{ fontSize: 36, fontWeight: 300 }}>Bibliothèque <em>éthique</em></h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 13 }}>PDFs indexés pour enrichir vos conseils IA ({pdfs.length}/5)</p>
        </div>

        {/* Upload */}
        {pdfs.length < 5 && (
          <div className="card fade-up" style={{ marginBottom: 20, borderStyle: 'dashed', borderColor: 'var(--cream-dark)', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{uploading ? '⏳' : '+'}</div>
              <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>
                {uploading ? 'Indexation en cours…' : 'Cliquer pour ajouter un PDF'}
              </p>
              <select
                className="form-input"
                style={{ marginTop: 12, maxWidth: 200 }}
                value={cadreUpload}
                onChange={e => { e.stopPropagation(); setCadreUpload(e.target.value); }}
                onClick={e => e.stopPropagation()}
              >
                {CADRES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleUpload} />
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Chargement…</div>
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
                    {pdf.cadre} · {pdf.nb_chunks} passages indexés · {Math.round(pdf.taille_bytes / 1024)} Ko
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
