import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth.jsx';

const CADRES = [
  { value: 'laique', label: '🧠 Laïque / Psychologie', desc: 'Gottman, CNV, attachement' },
  { value: 'islam', label: '☪️ Islam', desc: 'Mawadda, Rahma, Shura' },
  { value: 'christianisme', label: '✝️ Christianisme', desc: 'Agapè, alliance, pardon' },
  { value: 'judaisme', label: '✡️ Judaïsme', desc: 'Shalom Bayit, Onah' },
  { value: 'bouddhisme', label: '☸️ Bouddhisme', desc: 'Pleine conscience, Karuna' },
];

export default function Onboarding() {
  const [mode, setMode] = useState('creer'); // 'creer' | 'rejoindre'
  const [prenom, setPrenom] = useState('');
  const [cadre, setCadre] = useState('laique');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1); // 1: mode, 2: details, 3: done
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      if (mode === 'creer') {
        const res = await api('/couple/creer', { method: 'POST', body: { prenom, cadre_ethique: cadre } });
        setInviteCode(res.code);
        setStep(3);
      } else {
        await api('/couple/rejoindre', { method: 'POST', body: { code, prenom } });
        await refreshUser();
        navigate('/journal');
      }
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  if (step === 3) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card fade-up" style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <h2 className="serif" style={{ fontSize: 28, marginBottom: 8 }}>Votre espace est prêt</h2>
        <p style={{ color: 'var(--text-soft)', fontSize: 14, marginBottom: 24 }}>
          Partagez ce code à votre partenaire pour qu'il rejoigne votre espace :
        </p>
        <div style={{
          background: 'var(--cream-dark)',
          borderRadius: 12,
          padding: '20px 32px',
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 36,
          letterSpacing: '0.15em',
          fontWeight: 600,
          marginBottom: 24,
          color: 'var(--accent)',
        }}>
          {inviteCode}
        </div>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { refreshUser().then(() => navigate('/journal')); }}>
          Commencer mon journal →
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 500 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <span className="logo">Halo <span style={{ color: 'var(--accent)' }}>Duo</span></span>
          <p style={{ color: 'var(--text-soft)', fontSize: 14, marginTop: 8 }}>Bienvenue — configurez votre espace</p>
        </div>

        {step === 1 && (
          <div className="card fade-up">
            <h2 className="serif" style={{ fontSize: 24, marginBottom: 20 }}>Vous êtes…</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className={`btn ${mode === 'creer' ? 'btn-primary' : 'btn-ghost'}`} style={{ justifyContent: 'flex-start' }} onClick={() => setMode('creer')}>
                ✨ Je crée un nouvel espace couple
              </button>
              <button className={`btn ${mode === 'rejoindre' ? 'btn-primary' : 'btn-ghost'}`} style={{ justifyContent: 'flex-start' }} onClick={() => setMode('rejoindre')}>
                🔗 J'ai un code d'invitation
              </button>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 24 }} onClick={() => setStep(2)}>
              Continuer →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="card fade-up">
            <h2 className="serif" style={{ fontSize: 24, marginBottom: 20 }}>
              {mode === 'creer' ? 'Créer votre espace' : 'Rejoindre l\'espace'}
            </h2>
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label className="form-label">Votre prénom (visible par votre partenaire)</label>
              <input className="form-input" type="text" value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Sophie" />
            </div>

            {mode === 'rejoindre' && (
              <div className="form-group">
                <label className="form-label">Code d'invitation</label>
                <input className="form-input" type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="XXXXXXXX" maxLength={8} style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }} />
              </div>
            )}

            {mode === 'creer' && (
              <div className="form-group">
                <label className="form-label">Cadre éthique des conseils</label>
                {CADRES.map(c => (
                  <div key={c.value} onClick={() => setCadre(c.value)} style={{
                    padding: '12px 16px', border: `1.5px solid ${cadre === c.value ? 'var(--accent)' : 'var(--cream-dark)'}`,
                    borderRadius: 8, cursor: 'pointer', marginBottom: 8,
                    background: cadre === c.value ? 'var(--accent-soft)' : 'white',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontWeight: 500 }}>{c.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.desc}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Retour</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading || !prenom} onClick={handleSubmit}>
                {loading ? '…' : mode === 'creer' ? 'Créer l\'espace' : 'Rejoindre'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
