import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Building2, LayoutDashboard, ListTodo, LogOut } from 'lucide-react';

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
      isActive
        ? 'bg-primary text-white'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-slate-200 flex items-center space-x-3">
        <div className="flex items-center justify-center h-16 border-b border-slate-200 gap-3 px-4 py-6">
          <div className="bg-primary text-white p-2 rounded-lg">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">MonPetitPro</h1>
            <p className="text-xs text-slate-500">Suivi d'Action Immo</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 flex flex-col space-y-2">
        <NavLink to="/" className={navItemClass}>
          <LayoutDashboard size={20} />
          <span className="font-medium">Opérations</span>
        </NavLink>
        <NavLink to="/observations" className={navItemClass}>
          <ListTodo size={20} />
          <span className="font-medium">Toutes les observations</span>
        </NavLink>
      </nav>

      <div className="p-4 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-slate-600 hover:bg-slate-100 hover:text-danger transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
