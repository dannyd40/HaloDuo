import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Pricing from './pages/Pricing.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Journal from './pages/Journal.jsx';
import Conseil from './pages/Conseil.jsx';
import Tableau from './pages/Tableau.jsx';
import Recommandation from './pages/Recommandation.jsx';
import Bibliotheque from './pages/Bibliotheque.jsx';
import PDFViewer from './pages/PDFViewer.jsx';
import Compte from './pages/Compte.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#A89880' }}>Halo Duo…</div>;
  if (!user) return <Navigate to="/login" />;
  if (!user.partenaire) return <Navigate to="/onboarding" />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <div data-cadre={user?.partenaire?.cadre_ethique || 'laique'}>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/tableau" /> : <Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/auth/callback" element={<Navigate to="/tableau" />} />
        <Route path="/onboarding" element={user ? <Onboarding /> : <Navigate to="/login" />} />

        <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
        <Route path="/conseil" element={<ProtectedRoute><Conseil /></ProtectedRoute>} />
        <Route path="/tableau" element={<ProtectedRoute><Tableau /></ProtectedRoute>} />
        <Route path="/recommandation" element={<ProtectedRoute><Recommandation /></ProtectedRoute>} />
        <Route path="/bibliotheque" element={<ProtectedRoute><Bibliotheque /></ProtectedRoute>} />
        <Route path="/bibliotheque/:pdfId" element={<ProtectedRoute><PDFViewer /></ProtectedRoute>} />
        <Route path="/compte" element={<ProtectedRoute><Compte /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
