import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, CheckCircle2, AlertTriangle, Clock, BarChart3, Users } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  'Réussi': 'bg-emerald-500',
  'En cours': 'bg-blue-500',
  'En retard': 'bg-amber-500',
  'Échec': 'bg-red-500',
  'Bloqué': 'bg-purple-500',
  'Terminé': 'bg-emerald-500'
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  'Réussi': 'text-emerald-700',
  'En cours': 'text-blue-700',
  'En retard': 'text-amber-700',
  'Échec': 'text-red-700',
  'Bloqué': 'text-purple-700',
  'Terminé': 'text-emerald-700'
};

const STATUS_BG_COLORS: Record<string, string> = {
  'Réussi': 'bg-emerald-50',
  'En cours': 'bg-blue-50',
  'En retard': 'bg-amber-50',
  'Échec': 'bg-red-50',
  'Bloqué': 'bg-purple-50',
  'Terminé': 'bg-emerald-50'
};

export default function Statistics() {
  const [operations, setOperations] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ops } = await supabase.from('operations').select('*');
      if (ops) setOperations(ops);

      const { data: obs } = await supabase.from('observations').select('*, operations(name)');
      if (obs) {
        const processedObs = obs.map(o => {
          let status = 'En cours';
          const match = o.description?.match(/\n\n\[STATUT: (.*?)\]/);
          if (match) {
            status = match[1];
          } else if (o.completion_date) {
            status = 'Réussi';
          } else if (new Date(o.deadline_date) < new Date()) {
            status = 'En retard';
          }
          return { ...o, calculated_status: status };
        });
        setObservations(processedObs);
      }
    } catch (error) {
      console.error('Error fetching data for stats', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  // --- KPIs ---
  const totalOps = operations.length;
  const totalObs = observations.length;
  const completedObs = observations.filter(o => o.completion_date || o.calculated_status === 'Réussi').length;
  const successRate = totalObs > 0 ? Math.round((completedObs / totalObs) * 100) : 0;
  const delayedObs = observations.filter(o => o.calculated_status === 'En retard').length;

  // --- Status Data for Progress Bars ---
  const statusCounts = observations.reduce((acc, obs) => {
    acc[obs.calculated_status] = (acc[obs.calculated_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusCounts)
    .map(([name, value]) => ({ name, value, percentage: Math.round((value / totalObs) * 100) || 0 }))
    .sort((a, b) => b.value - a.value);

  // --- Operations Type Data ---
  const typeCounts = operations.reduce((acc, op) => {
    const type = op.operation_type || 'Non défini';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const typeData = Object.entries(typeCounts)
    .map(([name, value]) => ({ name, value, percentage: Math.round((value / totalOps) * 100) || 0 }))
    .sort((a, b) => b.value - a.value);

  // --- Realisateur Data ---
  const realisateursCounts = observations.reduce((acc, obs) => {
    const r = obs.responsible_person || 'Non assigné';
    if (!acc[r]) acc[r] = { name: r, assignees: 0, reussies: 0 };
    acc[r].assignees += 1;
    if (obs.completion_date || obs.calculated_status === 'Réussi') {
      acc[r].reussies += 1;
    }
    return acc;
  }, {} as Record<string, any>);
  const realisateurData = Object.values(realisateursCounts)
    .sort((a, b) => b.assignees - a.assignees)
    .slice(0, 10);

  const KpiCard = ({ title, value, subtext, icon: Icon, color }: any) => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-black text-slate-800 mt-1">{value}</h3>
        {subtext && <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase">{subtext}</p>}
      </div>
    </div>
  );

  return (
    <div className="pb-12 max-w-[1600px] mx-auto animate-fade-in">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tableau de Bord & Statistiques</h1>
          <p className="text-slate-500 mt-1">Vue globale de l'activité et des performances.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
          <BarChart3 size={20} />
          <span>Mise à jour en direct</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard 
          title="Opérations Actives" 
          value={totalOps} 
          icon={LayoutDashboard} 
          color="bg-indigo-50 text-indigo-600" 
        />
        <KpiCard 
          title="Total Observations" 
          value={totalObs} 
          subtext="Total des points relevés"
          icon={AlertTriangle} 
          color="bg-amber-50 text-amber-600" 
        />
        <KpiCard 
          title="Taux de Réussite" 
          value={`${successRate}%`} 
          subtext={`${completedObs} clôturées`}
          icon={CheckCircle2} 
          color="bg-emerald-50 text-emerald-600" 
        />
        <KpiCard 
          title="Points en Retard" 
          value={delayedObs} 
          subtext="Dates butoires dépassées"
          icon={Clock} 
          color="bg-red-50 text-red-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
            <BarChart3 size={18} className="text-primary"/> Répartition des Statuts
          </h2>
          <div className="space-y-5">
            {statusData.map((status, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${STATUS_COLORS[status.name] || 'bg-slate-400'}`}></span>
                    {status.name}
                  </span>
                  <span className="font-bold text-slate-500">{status.value} ({status.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full ${STATUS_COLORS[status.name] || 'bg-slate-400'}`} 
                    style={{ width: `${status.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Types d'Operations */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Building2 size={18} className="text-primary"/> Types d'Opérations
          </h2>
          <div className="space-y-5">
            {typeData.map((type, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold text-slate-700">{type.name}</span>
                  <span className="font-bold text-slate-500">{type.value} ({type.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="h-2.5 rounded-full bg-indigo-500" 
                    style={{ width: `${type.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Classement Réalisateurs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Users size={18} className="text-primary"/> Classement par Réalisateur (Top 10)
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                <th className="pb-3 font-bold">Réalisateur</th>
                <th className="pb-3 font-bold text-center">Total Assigné</th>
                <th className="pb-3 font-bold text-center">Total Réussi</th>
                <th className="pb-3 font-bold">Taux de succès</th>
              </tr>
            </thead>
            <tbody>
              {realisateurData.map((user, i) => {
                const percentage = user.assignees > 0 ? Math.round((user.reussies / user.assignees) * 100) : 0;
                return (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-4 font-bold text-slate-700">{user.name}</td>
                    <td className="py-4 text-center font-bold text-slate-600">
                      <span className="bg-slate-100 px-3 py-1 rounded-full">{user.assignees}</span>
                    </td>
                    <td className="py-4 text-center font-bold text-emerald-600">
                      <span className="bg-emerald-50 px-3 py-1 rounded-full">{user.reussies}</span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full ${percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-slate-500">{percentage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Icon for Type
function Building2({ size, className }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
      <path d="M9 22v-4h6v4"></path>
      <path d="M8 6h.01"></path>
      <path d="M16 6h.01"></path>
      <path d="M12 6h.01"></path>
      <path d="M12 10h.01"></path>
      <path d="M12 14h.01"></path>
      <path d="M16 10h.01"></path>
      <path d="M16 14h.01"></path>
      <path d="M8 10h.01"></path>
      <path d="M8 14h.01"></path>
    </svg>
  )
}
