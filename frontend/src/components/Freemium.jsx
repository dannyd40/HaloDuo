import { useState } from 'react';
import { api } from '../utils/api';

export function BannerFreemium({ restants, type = 'ia' }) {
  if (restants === null || restants === undefined || restants > 2) return null;

  const messages = {
    ia: restants === 0
      ? 'Limite de conseils IA atteinte cette semaine'
      : `Plus que ${restants} conseil${restants > 1 ? 's' : ''} IA cette semaine`,
    historique: 'Historique limité à 7 jours en gratuit',
  };

  return (
    <div className="banner-freemium" style={{ marginBottom: 16 }}>
      <span>✦ {messages[type]}</span>
      <a href="/pricing" className="btn btn-gold" style={{ padding: '6px 14px', fontSize: 12 }}>
        Passer Premium
      </a>
    </div>
  );
}

export function ModalUpgrade({ open, onClose, reason }) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (priceId) => {
    setLoading(true);
    try {
      const { url } = await api('/stripe/checkout', { method: 'POST', body: { priceId } });
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(44,36,22,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 16,
    }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 400, width: '100%' }} onClick={e => e.stopPropagation()}>
        <h2 className="serif" style={{ fontSize: 26, marginBottom: 8 }}>Halo Duo Premium</h2>
        <p style={{ color: 'var(--text-soft)', fontSize: 14, marginBottom: 20 }}>
          {reason || 'Débloquez l\'expérience complète pour votre couple.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {['IA illimitée', 'Historique 90 jours', "Upload PDFs éthiques", 'Viewer PDF + surlignage IA', 'Export données'].map(f => (
            <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <span style={{ color: 'var(--accent)' }}>✓</span> {f}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={loading} onClick={() => handleUpgrade('monthly')}>
            9,99€/mois
          </button>
          <button className="btn btn-gold" style={{ flex: 1 }} disabled={loading} onClick={() => handleUpgrade('yearly')}>
            79€/an ✦
          </button>
        </div>
        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={onClose}>
          Continuer en gratuit
        </button>
      </div>
    </div>
  );
}
