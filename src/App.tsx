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
import CalendarView from './pages/CalendarView';
import Statistics from './pages/Statistics';
import AdminUsers from './pages/AdminUsers';
import { useProfile } from './hooks/useProfile';
import { accountAccessState, permissionGranted } from './lib/accessControl';
import Objectives from './pages/Objectives';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoadingAuth, isLoadingProfile } = useStore();
  
  if (isLoadingAuth || (user && isLoadingProfile)) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const accessState = accountAccessState(profile);
  if (accessState !== 'active') {
    const suspended = accessState === 'suspended';
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">
            {suspended ? 'Compte suspendu' : 'Compte en attente de validation'}
          </h1>
          <p className="mt-3 text-slate-600">
            {suspended
              ? 'Votre accès a été suspendu par un administrateur.'
              : 'Un administrateur doit encore activer votre compte et lui attribuer un rôle.'}
          </p>
          <button type="button" onClick={() => void supabase.auth.signOut()}
            className="mt-6 rounded-xl bg-teal-700 px-5 py-3 font-bold text-white hover:bg-teal-800">
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }
  
  return <AppLayout>{children}</AppLayout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { permissions, isLoadingProfile } = useStore();
  return (
    <ProtectedRoute>
      {isLoadingProfile
        ? <div className="p-8 text-center text-slate-500">Chargement du profil…</div>
        : permissionGranted(permissions, 'admin.users.view') || permissionGranted(permissions, 'admin.roles.view')
          ? children : <Navigate to="/" replace />}
    </ProtectedRoute>
  );
}

function App() {
  const { setUser, setIsLoadingAuth } = useStore();
  useProfile();

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
          path="/admin/users"
          element={<AdminRoute><AdminUsers /></AdminRoute>}
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
        <Route 
          path="/calendar" 
          element={
            <ProtectedRoute>
              <CalendarView />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/statistics" 
          element={
            <ProtectedRoute>
              <Statistics />
            </ProtectedRoute>
          } 
        />
        <Route path="/objectives" element={<ProtectedRoute><Objectives /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
