import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  Building2,
  LayoutDashboard,
  ListTodo,
  LogOut,
  CalendarDays,
  BarChart3,
  UserCog,
  Target,
  BookOpenCheck,
  History,
  FileUp,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { permissionGranted } from "../../lib/accessControl";

export default function Sidebar() {
  const navigate = useNavigate();
  const permissions = useStore((state) => state.permissions);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-w-12 items-center justify-center gap-3 rounded-lg px-3 py-3 transition-colors lg:justify-start lg:px-4 ${
      isActive
        ? "bg-teal-50 text-teal-900 ring-1 ring-inset ring-teal-200"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <aside className="fixed inset-x-0 bottom-0 z-50 flex border-t border-slate-200 bg-[#fffefb] shadow-lg lg:inset-y-0 lg:left-0 lg:right-auto lg:h-screen lg:w-64 lg:flex-col lg:border-r lg:border-t-0 lg:shadow-none">
      <div className="hidden items-center space-x-3 border-b border-slate-200 p-6 lg:flex">
        <div className="flex items-center justify-center h-16 border-b border-slate-200 gap-3 px-4 py-6">
          <div className="bg-primary text-white p-2 rounded-lg">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="font-semibold text-slate-800 text-lg leading-tight">
              MonPetitPro
            </h1>
            <p className="text-xs text-slate-500">Suivi d'Action Immo</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 items-center gap-1 overflow-x-auto p-2 [&_span]:hidden lg:flex-col lg:items-stretch lg:space-y-2 lg:overflow-visible lg:p-4 lg:[&_span]:inline">
        {permissionGranted(permissions, 'operations.view') && <NavLink to="/" className={navItemClass}>
          <LayoutDashboard size={20} />
          <span className="font-medium">Opérations</span>
        </NavLink>}
        {(permissionGranted(permissions, 'observations.view') || permissionGranted(permissions, 'observations.view_assigned') || permissionGranted(permissions, 'observations.view_all')) && <NavLink to="/observations" className={navItemClass}>
          <ListTodo size={20} />
          <span className="font-medium">Toutes les observations</span>
        </NavLink>}
        {permissionGranted(permissions, 'calendar.view') && <NavLink to="/calendar" className={navItemClass}>
          <CalendarDays size={20} />
          <span className="font-medium">Calendrier</span>
        </NavLink>}
        {permissionGranted(permissions, 'statistics.view') && <NavLink to="/statistics" className={navItemClass}>
          <BarChart3 size={20} />
          <span className="font-medium">Statistiques</span>
        </NavLink>}
        {permissionGranted(permissions, 'objectives.view') && <NavLink to="/objectives" className={navItemClass}>
          <Target size={20} />
          <span className="font-medium">Objectifs DMO</span>
        </NavLink>}
        {(permissionGranted(permissions, 'admin.users.view') || permissionGranted(permissions, 'admin.roles.view')) && (
          <NavLink to="/admin/users" className={navItemClass}>
            <UserCog size={20} />
            <span className="font-medium">Utilisateurs</span>
          </NavLink>
        )}
        {permissionGranted(permissions, 'references.view') && (
          <NavLink to="/admin/references" className={navItemClass}>
            <BookOpenCheck size={20} />
            <span className="font-medium">Référentiels</span>
          </NavLink>
        )}
        {permissionGranted(permissions, 'operations.import') && (
          <NavLink to="/admin/import" className={navItemClass}>
            <FileUp size={20} />
            <span className="font-medium">Import Excel</span>
          </NavLink>
        )}
        {permissionGranted(permissions, 'admin.audit.view') && (
          <NavLink to="/admin/history" className={navItemClass}>
            <History size={20} />
            <span className="font-medium">Historique</span>
          </NavLink>
        )}
      </nav>

      <div className="border-l border-slate-200 p-2 [&_span]:hidden lg:border-l-0 lg:border-t lg:p-4 lg:[&_span]:inline">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-3 rounded-lg px-3 py-3 text-slate-600 transition-colors hover:bg-slate-100 hover:text-danger lg:justify-start lg:px-4"
        >
          <LogOut size={20} />
          <span className="font-medium">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
