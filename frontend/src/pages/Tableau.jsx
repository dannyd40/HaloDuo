import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth.jsx';
import { Navbar, BottomNav } from '../components/Nav.jsx';
import { BannerFreemium } from '../components/Freemium.jsx';

const MODE_LABELS = {
  celebration: { icon: '✨', label: 'Célébration', color: '#27AE60' },
  conseil_doux: { icon: '💡', label: 'Conseil doux', color: '#7C6B9E' },
  conseil_asymetrique: { icon: '🔄', label: 'Reconnexion', color: '#E67E22' },
  desamorcage: { icon: '🌊', label: 'Désamorçage', color: '#2980B9' },
  soutien: { icon: '🫂', label: 'Soutien', color: '#C0392B' },
};

const TendanceArrow = ({ direction, delta }) => {
  const arrows = { up: '↑', down: '↓', stable: '→' };
  const colors = { up: '#27AE60', down: '#E74C3C', stable: 'var(--text-muted)' };
  return (
    <span style={{ color: colors[direction], fontSize: 18, fontWeight: 600 }}>
      {arrows[direction]} {direction !== 'stable' && <span style={{ fontSize: 13 }}>+{delta}</span>}
    </span>
  );
};

export default function Tableau() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api('/recommandation/tableau'),
      api('/recommandation/historique'),
    ]).then(([tab, hist]) => {
      setData(tab);
      setHistorique((hist.historique || []).reverse()); // chronologique
    }).catch(err => {
      console.error(err);
      setError(err.message || 'Erreur de chargement');
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <><Navbar /><div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Chargement…</div><BottomNav /></>
  );

  if (error || !data) return (
    <><Navbar />
      <div className="page">
        <div className="card fade-up" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 className="serif" style={{ fontSize: 24, marginBottom: 8 }}>{error || 'Impossible de charger le tableau'}</h2>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>Réessayer</button>
        </div>
      </div>
    <BottomNav /></>
  );

  return (
    <>
      <Navbar />
      <div className="page">
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <h1 className="serif" style={{ fontSize: 36, fontWeight: 300 }}>Nous <em>aujourd'hui</em></h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 13 }}>{user?.partenaire?.prenom} & {user?.partenaire?.partenaire_prenom || '…'}</p>
        </div>

        {user?.plan === 'gratuit' && <BannerFreemium restants={null} type="historique" />}

        {data?.attente ? (
          <div className="card fade-up" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              {data.mon_journal_soumis ? '⏳' : '📝'}
            </div>
            <h2 className="serif" style={{ fontSize: 24, marginBottom: 8 }}>{data.message}</h2>
            {!data.mon_journal_soumis && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/journal')}>
                Remplir mon journal →
              </button>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 16 }}>
              Le score du jour apparaît seulement quand les deux partenaires ont soumis leur journal
            </p>
          </div>
        ) : (
          <>
            {/* Score principal */}
            <div className="card fade-up" style={{ textAlign: 'center', padding: 40, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                Score du couple aujourd'hui
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
                <span style={{
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: 72,
                  fontWeight: 300,
                  color: 'var(--accent)',
                  lineHeight: 1,
                }}>
                  {data?.score_commun}
                </span>
                <div>
                  <div style={{ fontSize: 18, color: 'var(--text-muted)', marginBottom: 4 }}>/10</div>
                  {data?.tendance && <TendanceArrow {...data.tendance} />}
                </div>
              </div>

              {data?.mode && MODE_LABELS[data.mode] && (
                <div className="mode-badge" style={{ display: 'inline-flex', margin: '0 auto' }}>
                  {MODE_LABELS[data.mode].icon} {MODE_LABELS[data.mode].label}
                </div>
              )}

              <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 16, fontStyle: 'italic' }}>
                Score combiné — les notes individuelles restent privées
              </p>
            </div>

            {/* Action vers recommandation */}
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 24, padding: 14 }}
              onClick={() => navigate('/recommandation')}
            >
              Voir la recommandation commune →
            </button>
          </>
        )}

        {/* Graphique tendance */}
        {historique.length > 1 && (
          <div className="card fade-up-2">
            <h3 className="serif" style={{ fontSize: 18, marginBottom: 16 }}>
              Tendance {user?.plan === 'gratuit' ? '7 jours' : '90 jours'}
            </h3>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={historique}>
                <XAxis
                  dataKey="date"
                  tickFormatter={d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [`${v}/10`, 'Score']}
                  labelFormatter={d => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  contentStyle={{ border: '1px solid var(--cream-dark)', borderRadius: 8, fontSize: 13 }}
                />
                <Line
                  type="monotone" dataKey="score"
                  stroke="var(--accent)" strokeWidth={2}
                  dot={{ r: 4, fill: 'var(--accent)' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <BottomNav />
    </>
  );
}
