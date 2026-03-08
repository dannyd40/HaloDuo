import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth.jsx';
import { Navbar, BottomNav } from '../components/Nav.jsx';

export default function Compte() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [upgradeSuccess] = useState(new URLSearchParams(window.location.search).get('upgrade') === 'success');

  const handlePortal = async () => {
    setLoading(true);
    try {
      const { url } = await api('/stripe/portal', { method: 'POST' });
      window.location.href = url;
    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <>
      <Navbar />
      <div className="page">
        {upgradeSuccess && (
          <div className="fade-up" style={{ background: 'rgba(39,174,96,0.1)', border: '1px solid #27AE60', borderRadius: 12, padding: '14px 18px', marginBottom: 20, color: '#27AE60', fontSize: 14 }}>
            ✓ Bienvenue en Premium ! Toutes les fonctionnalités sont maintenant débloquées.
          </div>
        )}

        <div className="fade-up" style={{ marginBottom: 24 }}>
          <h1 className="serif" style={{ fontSize: 36, fontWeight: 300 }}>Mon <em>compte</em></h1>
        </div>

        {/* Profil */}
        <div className="card fade-up" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: 'var(--accent)',
            }}>
              {user?.partenaire?.prenom?.[0] || user?.nom?.[0] || '?'}
            </div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 16 }}>{user?.partenaire?.prenom || user?.nom}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Plan */}
        <div className="card fade-up-2" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 className="serif" style={{ fontSize: 20 }}>Mon abonnement</h3>
            <span style={{
              fontSize: 12, padding: '4px 12px', borderRadius: 100,
              background: user?.plan === 'gratuit' ? 'var(--cream-dark)' : 'rgba(201,168,76,0.12)',
              color: user?.plan === 'gratuit' ? 'var(--text-soft)' : 'var(--gold)',
              fontWeight: 500,
            }}>
              {user?.plan === 'gratuit' ? 'Gratuit' : '✦ Premium'}
            </span>
          </div>

          {user?.plan === 'gratuit' ? (
            <div>
              <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 16 }}>
                Passez Premium pour l'IA illimitée, l'historique complet et les PDFs éthiques.
              </p>
              <a href="/pricing" className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
                ✦ Passer Premium
              </a>
            </div>
          ) : (
            <button className="btn btn-ghost" onClick={handlePortal} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? '…' : 'Gérer mon abonnement →'}
            </button>
          )}
        </div>

        {/* Couple info */}
        {user?.partenaire && (
          <div className="card fade-up-3" style={{ marginBottom: 16 }}>
            <h3 className="serif" style={{ fontSize: 20, marginBottom: 12 }}>Mon couple</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--cream-dark)', fontSize: 14 }}>
              <span style={{ color: 'var(--text-muted)' }}>Cadre éthique</span>
              <span style={{ fontWeight: 500 }}>{user.partenaire.cadre_ethique}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--cream-dark)', fontSize: 14 }}>
              <span style={{ color: 'var(--text-muted)' }}>Partenaire</span>
              <span style={{ fontWeight: 500 }}>{user.partenaire.partenaire_prenom || 'En attente…'}</span>
            </div>
            {user.partenaire.code_invitation && (
              <div style={{ padding: '12px 0', fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Code d'invitation</span>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, color: 'var(--accent)', letterSpacing: '0.1em', fontWeight: 600 }}>
                    {user.partenaire.code_invitation}
                  </span>
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}
                  onClick={() => {
                    const link = `${window.location.origin}/register?code=${user.partenaire.code_invitation}`;
                    navigator.clipboard.writeText(link);
                    alert('Lien copié !');
                  }}
                >
                  Copier le lien d'invitation
                </button>
              </div>
            )}
          </div>
        )}

        <button className="btn btn-ghost" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center', color: '#C0392B', borderColor: '#C0392B', marginTop: 8 }}>
          Se déconnecter
        </button>
      </div>
      <BottomNav />
    </>
  );
}
