import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <span className="logo" style={{ fontSize: 20 }}>Halo <span>Duo</span></span>
        <Link to="/login" className="btn btn-ghost" style={{ fontSize: 14 }}>Se connecter</Link>
      </div>
      {/* Hero */}
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background orbs */}
        <div style={{
          position: 'absolute', top: '15%', left: '10%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,107,158,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '5%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="fade-up">
          <div style={{ fontSize: 13, letterSpacing: '0.15em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 24, fontWeight: 500 }}>
            Bien-être à deux
          </div>
          <h1 style={{ fontSize: 'clamp(52px, 8vw, 96px)', fontWeight: 300, lineHeight: 1.05, marginBottom: 24, letterSpacing: '-0.01em' }}>
            Halo <em>Duo</em>
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2.5vw, 20px)', color: 'var(--text-soft)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.7, fontWeight: 300 }}>
            Un espace privé où chacun note son ressenti. L'app analyse l'harmonie du couple
            et génère des conseils bienveillants — sans jamais révéler vos scores individuels.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary" style={{ fontSize: 16, padding: '14px 32px' }}>
              Commencer gratuitement
            </Link>
            <Link to="/pricing" className="btn btn-ghost" style={{ fontSize: 16, padding: '14px 32px' }}>
              Voir les plans
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: '80px 24px', maxWidth: 900, margin: '0 auto' }}>
        <h2 className="fade-up-2 serif" style={{ fontSize: 40, textAlign: 'center', marginBottom: 60, fontWeight: 300 }}>
          Conçu pour la confiance
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
          {[
            { icon: '🔒', title: 'Confidentialité absolue', desc: 'Vos scores individuels ne sont jamais visibles par votre partenaire. Chaque journal est strictement privé.' },
            { icon: '🎯', title: 'Analyse de l\'asymétrie', desc: 'L\'IA détecte quand l\'un souffre davantage et adapte ses conseils avec précision et douceur.' },
            { icon: '🌿', title: 'Ancrage éthique', desc: 'Choisissez votre cadre : laïque, islamique, chrétien, juif ou bouddhiste. Les conseils s\'y adaptent.' },
            { icon: '✦', title: 'IA bienveillante', desc: 'Powered by Llama 4 via Groq. Des conseils humains, chaleureux, sans jugement.' },
          ].map(f => (
            <div key={f.title} className="card fade-up">
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <h3 className="serif" style={{ fontSize: 20, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: 'var(--text-soft)', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>Gratuit pour commencer. Premium pour tout débloquer.</p>
        <Link to="/register" className="btn btn-primary" style={{ fontSize: 16, padding: '14px 32px' }}>
          Créer votre espace couple →
        </Link>
      </div>
    </div>
  );
}
