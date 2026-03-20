import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useStore } from './store/useStore';
import Login from './pages/Login';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import OperationForm from './pages/OperationForm';
import OperationDetail from './pages/OperationDetail';
import Observations from './pages/Observations';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoadingAuth } = useStore();
  
  if (isLoadingAuth) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <AppLayout>{children}</AppLayout>;
}

function App() {
  const { setUser, setIsLoadingAuth } = useStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setIsLoadingAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/operations/new" 
          element={
            <ProtectedRoute>
              <OperationForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/operations/:id/edit" 
          element={
            <ProtectedRoute>
              <OperationForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/operations/:id" 
          element={
            <ProtectedRoute>
              <OperationDetail />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/observations" 
          element={
            <ProtectedRoute>
              <Observations />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
