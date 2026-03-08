import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth.jsx';
import { Navbar, BottomNav } from '../components/Nav.jsx';
import { BannerFreemium, ModalUpgrade } from '../components/Freemium.jsx';

export default function Journal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [axes, setAxes] = useState([]);
  const [scores, setScores] = useState({});
  const [commentaire, setCommentaire] = useState('');
  const [dejaFait, setDejaFait] = useState(false);
  const [conseilPrive, setConseilPrive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [limite, setLimite] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    Promise.all([
      api('/couple/info'),
      api('/journal/aujourd-hui'),
    ]).then(([coupleInfo, journalInfo]) => {
      setAxes(coupleInfo.axes);
      const initScores = {};
      coupleInfo.axes.forEach(a => { initScores[a.slug] = 5; });
      setScores(initScores);

      if (journalInfo.journal) {
        setDejaFait(true);
        setScores(journalInfo.journal.scores);
        setCommentaire(journalInfo.journal.commentaire || '');
        setConseilPrive(journalInfo.journal.conseil_prive);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true); setError('');
    try {
      const res = await api('/journal', {
        method: 'POST',
        body: { scores, commentaire },
      });
      setConseilPrive(res.conseil_prive);
      setLimite(res.limite);
      setDejaFait(true);
      if (res.limite?.restants === 0) setShowUpgrade(true);
    } catch (err) {
      setError(err.message);
    } finally { setSubmitting(false); }
  };

  const getLabelScore = (v) => {
    if (v <= 2) return { label: 'Très difficile', color: '#C0392B' };
    if (v <= 4) return { label: 'Difficile', color: '#E67E22' };
    if (v <= 6) return { label: 'Neutre', color: 'var(--text-muted)' };
    if (v <= 8) return { label: 'Bien', color: '#27AE60' };
    return { label: 'Excellent', color: '#1A8F4C' };
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      Chargement…
    </div>
  );

  return (
    <>
      <Navbar />
      <div className="page">
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <h1 className="serif" style={{ fontSize: 36, fontWeight: 300 }}>
            Votre journal <em>privé</em>
          </h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 14, marginTop: 6 }}>
            🔒 Seul(e) vous voyez ces réponses — jamais votre partenaire
          </p>
        </div>

        {limite && <BannerFreemium restants={limite.restants} />}

        {dejaFait ? (
          <div className="fade-up">
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 className="serif" style={{ fontSize: 22, marginBottom: 16 }}>Votre ressenti aujourd'hui</h3>
              {axes.map(axe => (
                <div key={axe.slug} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--cream-dark)' }}>
                  <span style={{ fontSize: 14 }}>{axe.emoji} {axe.label}</span>
                  <span style={{ fontSize: 14, color: getLabelScore(scores[axe.slug] || 5).color, fontWeight: 500 }}>
                    {scores[axe.slug] || 5}/10
                  </span>
                </div>
              ))}
            </div>

            {conseilPrive ? (
              <div className="card fade-up-2" style={{ borderLeft: '3px solid var(--accent)', background: 'var(--accent-soft)' }}>
                <div style={{ fontSize: 12, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                  ✦ Votre conseil privé
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                  {conseilPrive}
                </p>
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: 14 }}>Limite de conseils IA atteinte — <button onClick={() => setShowUpgrade(true)} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>passer Premium</button></p>
              </div>
            )}
          </div>
        ) : (
          <div className="fade-up">
            {error && <div className="error-msg">{error}</div>}

            {axes.map((axe, i) => {
              const val = scores[axe.slug] || 5;
              const { label, color } = getLabelScore(val);
              return (
                <div key={axe.slug} className="card" style={{ marginBottom: 16, animationDelay: `${i * 0.05}s` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 500 }}>{axe.emoji} {axe.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color }}>{label}</span>
                      <span style={{
                        fontFamily: 'Cormorant Garamond, serif',
                        fontSize: 24,
                        fontWeight: 600,
                        color: 'var(--accent)',
                        minWidth: 32,
                        textAlign: 'right',
                      }}>{val}</span>
                    </div>
                  </div>
                  <input
                    type="range" min={1} max={10} step={1}
                    value={val}
                    onChange={e => setScores(s => ({ ...s, [axe.slug]: parseInt(e.target.value) }))}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>Très difficile</span><span>Excellent</span>
                  </div>
                </div>
              );
            })}

            <div className="card fade-up-3">
              <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>
                Un mot sur votre journée ? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optionnel, privé)</span>
              </label>
              <textarea
                className="form-input"
                rows={3}
                value={commentaire}
                onChange={e => setCommentaire(e.target.value)}
                placeholder="Ce que je ressens aujourd'hui…"
                style={{ resize: 'vertical' }}
              />
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 20, padding: '16px', fontSize: 16 }}
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Génération de votre conseil…' : 'Valider mon journal ✦'}
            </button>
          </div>
        )}
      </div>
      <BottomNav />
      <ModalUpgrade open={showUpgrade} onClose={() => setShowUpgrade(false)} reason="Limite de 3 conseils IA/semaine atteinte." />
    </>
  );
}
