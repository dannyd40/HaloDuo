import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Navbar, BottomNav } from '../components/Nav.jsx';

const MODE_INFO = {
  celebration: { icon: '✨', label: 'Célébration', bg: 'rgba(39,174,96,0.08)', border: '#27AE60' },
  conseil_doux: { icon: '💡', label: 'Conseil doux', bg: 'rgba(124,107,158,0.08)', border: '#7C6B9E' },
  conseil_asymetrique: { icon: '🔄', label: 'Reconnexion', bg: 'rgba(230,126,34,0.08)', border: '#E67E22' },
  desamorcage: { icon: '🌊', label: 'Désamorçage', bg: 'rgba(41,128,185,0.08)', border: '#2980B9' },
  soutien: { icon: '🫂', label: 'Soutien', bg: 'rgba(192,57,43,0.08)', border: '#C0392B' },
};

export default function Recommandation() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/recommandation/tableau').then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <><Navbar /><div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Chargement…</div><BottomNav /></>;

  if (data?.attente) return (
    <>
      <Navbar />
      <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h2 className="serif" style={{ fontSize: 24 }}>En attente des deux journaux</h2>
        <p style={{ color: 'var(--text-soft)', marginTop: 8 }}>La recommandation commune se génère quand les deux partenaires ont soumis leur journal.</p>
      </div>
      <BottomNav />
    </>
  );

  const modeInfo = data?.mode ? (MODE_INFO[data.mode] || MODE_INFO.conseil_doux) : null;

  return (
    <>
      <Navbar />
      <div className="page">
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <h1 className="serif" style={{ fontSize: 36, fontWeight: 300 }}>Pour <em>vous deux</em></h1>
          <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>Recommandation commune — partagez-la ensemble</p>
        </div>

        {modeInfo && (
          <div className="fade-up" style={{
            background: modeInfo.bg,
            border: `1.5px solid ${modeInfo.border}`,
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            color: modeInfo.border,
            fontWeight: 500,
          }}>
            {modeInfo.icon} Mode : {modeInfo.label}
          </div>
        )}

        {data?.recommandation && (
          <div className="card fade-up-2" style={{ padding: 28, marginBottom: 16 }}>
            <p style={{ fontSize: 16, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
              {data.recommandation}
            </p>
          </div>
        )}

        <div className="card fade-up-3" style={{ background: 'var(--cream-dark)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Score du jour</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, color: 'var(--accent)' }}>
              {data?.score_commun}/10
            </div>
          </div>
          {data?.tendance && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Tendance</div>
              <div style={{ fontSize: 24, color: data.tendance.direction === 'up' ? '#27AE60' : data.tendance.direction === 'down' ? '#E74C3C' : 'var(--text-muted)' }}>
                {data.tendance.direction === 'up' ? '↑' : data.tendance.direction === 'down' ? '↓' : '→'}
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </>
  );
}
