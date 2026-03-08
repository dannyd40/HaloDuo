import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Navbar, BottomNav } from '../components/Nav.jsx';

export default function PDFViewer() {
  const { pdfId } = useParams();
  const navigate = useNavigate();
  const [pdf, setPdf] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api(`/pdf/${pdfId}/contenu`),
      api(`/pdf/${pdfId}/highlights`),
    ]).then(([content, hl]) => {
      setPdf(content.pdf);
      setChunks(content.chunks);
      setHighlights(hl.highlights.map(h => h.id));
    }).catch(console.error).finally(() => setLoading(false));
  }, [pdfId]);

  // Grouper chunks par section
  const sections = chunks.reduce((acc, chunk) => {
    const section = chunk.section_titre || 'Contenu';
    if (!acc[section]) acc[section] = [];
    acc[section].push(chunk);
    return acc;
  }, {});

  const sectionKeys = Object.keys(sections);

  if (loading) return <><Navbar /><div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Chargement du guide…</div><BottomNav /></>;

  return (
    <>
      <Navbar />
      <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
        {/* Sidebar sections */}
        <div style={{
          width: 220, flexShrink: 0,
          borderRight: '1px solid var(--cream-dark)',
          overflowY: 'auto',
          padding: '16px 0',
          background: 'white',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '0 16px 12px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Sections
          </div>
          {sectionKeys.map(section => (
            <button key={section} onClick={() => {
              setActiveSection(section);
              document.getElementById(`section-${section}`)?.scrollIntoView({ behavior: 'smooth' });
            }} style={{
              textAlign: 'left', padding: '8px 16px',
              background: activeSection === section ? 'var(--accent-soft)' : 'transparent',
              border: 'none', cursor: 'pointer',
              fontSize: 13, color: activeSection === section ? 'var(--accent)' : 'var(--text-soft)',
              borderLeft: `2px solid ${activeSection === section ? 'var(--accent)' : 'transparent'}`,
            }}>
              {section}
            </button>
          ))}
        </div>

        {/* Contenu principal */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          <button onClick={() => navigate('/bibliotheque')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Bibliothèque
          </button>

          <h1 className="serif" style={{ fontSize: 28, fontWeight: 300, marginBottom: 8 }}>{pdf?.nom}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 32 }}>
            {highlights.length > 0 && <span style={{ color: 'var(--accent)' }}>✦ {highlights.length} passage{highlights.length > 1 ? 's' : ''} utilisé{highlights.length > 1 ? 's' : ''} par l'IA — </span>}
            {pdf?.nb_chunks} passages · {pdf?.cadre}
          </p>

          {sectionKeys.map(section => (
            <div key={section} id={`section-${section}`} style={{ marginBottom: 40 }}>
              <h2 className="serif" style={{ fontSize: 20, marginBottom: 16, color: 'var(--text)', borderBottom: '1px solid var(--cream-dark)', paddingBottom: 8 }}>
                {section}
              </h2>
              {sections[section].map(chunk => (
                <p key={chunk.id} style={{
                  fontSize: 14,
                  lineHeight: 1.8,
                  marginBottom: 16,
                  padding: highlights.includes(chunk.id) ? '12px 16px' : '0',
                  background: highlights.includes(chunk.id) ? 'rgba(201,168,76,0.12)' : 'transparent',
                  borderLeft: highlights.includes(chunk.id) ? '3px solid var(--gold)' : 'none',
                  borderRadius: highlights.includes(chunk.id) ? 4 : 0,
                  color: 'var(--text)',
                  position: 'relative',
                }}>
                  {highlights.includes(chunk.id) && (
                    <span style={{ position: 'absolute', top: 8, right: 12, fontSize: 10, color: 'var(--gold)', fontWeight: 600 }}>
                      ✦ IA
                    </span>
                  )}
                  {chunk.contenu}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
