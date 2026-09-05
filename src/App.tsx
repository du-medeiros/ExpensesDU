import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './features/auth/Login';
import { Register } from './features/auth/Register';
import { Chat } from './features/chat/Chat';
import { Perfil } from './features/perfil/Perfil';
import { Resumo } from './features/resumo/Resumo';
import { Metas } from './features/metas/Metas';
import { Landing } from './features/landing/Landing';
import { Layout } from './components/Layout';
import { Toaster } from 'sonner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Chat />} />
            <Route path="resumo" element={<Resumo />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="metas" element={<Metas />} />
          </Route>
        </Routes>
      </Router>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}

export default App;
