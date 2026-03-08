import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth.jsx';

const FEATURES = [
  { label: 'Journal quotidien', gratuit: '✓ Illimité', premium: '✓ Illimité' },
  { label: 'Conseil IA individuel', gratuit: '3/semaine', premium: '✓ Illimité' },
  { label: 'Recommandation commune', gratuit: '1/semaine', premium: '✓ Illimitée' },
  { label: 'Historique', gratuit: '7 jours', premium: '✓ 90 jours' },
  { label: 'Upload PDFs éthiques', gratuit: '✗', premium: "✓ Jusqu'à 5 PDFs" },
  { label: 'Viewer PDF + surlignage IA', gratuit: '✗', premium: '✓ Complet' },
  { label: 'Graphique tendances', gratuit: '7 jours', premium: '✓ 90 jours' },
  { label: 'Export données', gratuit: '✗', premium: '✓' },
];

export default function Pricing() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(null);

  const handleCheckout = async (priceId) => {
    if (!user) return window.location.href = '/register';
    setLoading(priceId);
    try {
      const { url } = await api('/stripe/checkout', { method: 'POST', body: { priceId } });
      window.location.href = url;
    } catch { setLoading(null); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: '60px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link to="/" className="logo" style={{ display: 'block', textAlign: 'center', marginBottom: 48 }}>
          Halo <span>Duo</span>
        </Link>

        <h1 className="serif" style={{ fontSize: 48, textAlign: 'center', fontWeight: 300, marginBottom: 12 }}>
          Choisissez votre <em>espace</em>
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--text-soft)', marginBottom: 48 }}>
          Commencez gratuitement. Passez Premium quand vous êtes prêts.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 48 }}>
          {/* Gratuit */}
          <div className="card">
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>GRATUIT</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 48, marginBottom: 4 }}>0€</div>
            <p style={{ color: 'var(--text-soft)', fontSize: 14, marginBottom: 20 }}>Pour commencer ensemble</p>
            <Link to="/register" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
              Commencer
            </Link>
          </div>

          {/* Premium mensuel */}
          <div className="card" style={{ border: '2px solid var(--accent)', position: 'relative' }}>
            <div style={{
              position: 'absolute', top: -12, right: 20,
              background: 'var(--accent)', color: 'white',
              fontSize: 11, padding: '3px 12px', borderRadius: 100, fontWeight: 600,
            }}>
              POPULAIRE
            </div>
            <div style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 8 }}>PREMIUM MENSUEL</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 48, marginBottom: 4 }}>9,99€<span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/mois</span></div>
            <p style={{ color: 'var(--text-soft)', fontSize: 14, marginBottom: 20 }}>L'expérience complète</p>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading === 'monthly'} onClick={() => handleCheckout('monthly')}>
              {loading === 'monthly' ? '…' : 'Choisir mensuel'}
            </button>
          </div>

          {/* Premium annuel */}
          <div className="card" style={{ border: '2px solid var(--gold)' }}>
            <div style={{ fontSize: 13, color: 'var(--gold)', marginBottom: 8 }}>PREMIUM ANNUEL</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 48, marginBottom: 4 }}>79€<span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/an</span></div>
            <p style={{ color: 'var(--text-soft)', fontSize: 14, marginBottom: 20 }}>2 mois offerts vs mensuel</p>
            <button className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }} disabled={loading === 'yearly'} onClick={() => handleCheckout('yearly')}>
              {loading === 'yearly' ? '…' : '✦ Choisir annuel'}
            </button>
          </div>
        </div>

        {/* Feature table */}
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                <th style={{ textAlign: 'left', padding: '10px 0', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Fonctionnalité</th>
                <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Gratuit</th>
                <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>Premium</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map(f => (
                <tr key={f.label} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                  <td style={{ padding: '10px 0', fontSize: 14 }}>{f.label}</td>
                  <td style={{ textAlign: 'center', fontSize: 13, color: f.gratuit === '✗' ? 'var(--text-muted)' : 'var(--text)' }}>{f.gratuit}</td>
                  <td style={{ textAlign: 'center', fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>{f.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
