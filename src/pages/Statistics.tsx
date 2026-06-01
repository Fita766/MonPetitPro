import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { LayoutDashboard, CheckCircle2, AlertTriangle, Clock, BarChart3 } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
const STATUS_COLORS: Record<string, string> = {
  'Réussi': '#10b981',
  'En cours': '#3b82f6',
  'En retard': '#f59e0b',
  'Échec': '#ef4444',
  'Bloqué': '#8b5cf6',
  'Terminé': '#10b981'
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
        // Process custom status from description
        const processedObs = obs.map(o => {
          let status = 'En cours';
          const match = o.description?.match(/\n\n\[STATUT: (.*?)\]/);
          if (match) {
            status = match[1];
          } else if (o.completion_date) {
            status = 'Réussi'; // Default completed status
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

  // --- Status Data for Pie Chart ---
  const statusCounts = observations.reduce((acc, obs) => {
    acc[obs.calculated_status] = (acc[obs.calculated_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // --- Operations Type Data ---
  const typeCounts = operations.reduce((acc, op) => {
    const type = op.operation_type || 'Non défini';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // --- Realisateur Data for Bar Chart ---
  const realisateursCounts = observations.reduce((acc, obs) => {
    const r = obs.responsible_person || 'Non assigné';
    if (!acc[r]) acc[r] = { name: r, assignees: 0, reussies: 0 };
    acc[r].assignees += 1;
    if (obs.completion_date || obs.calculated_status === 'Réussi') {
      acc[r].reussies += 1;
    }
    return acc;
  }, {} as Record<string, any>);
  const realisateurData = Object.values(realisateursCounts).sort((a, b) => b.assignees - a.assignees).slice(0, 10); // Top 10

  const KpiCard = ({ title, value, subtext, icon: Icon, color }: any) => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-start gap-4">
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
    <div className="pb-12 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tableau de Bord & Statistiques</h1>
        <p className="text-slate-500 mt-1">Vue globale de l'activité et des performances.</p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-1">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
            <BarChart3 size={18} className="text-primary"/> Répartition des Statuts
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
            <LayoutDashboard size={18} className="text-primary"/> Performance par Réalisateur (Top 10)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={realisateurData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 10, fontWeight: 'bold'}} tickLine={false} axisLine={false} />
                <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold' }} />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Bar dataKey="assignees" name="Total Assigné" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reussies" name="Réussies" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
          <LayoutDashboard size={18} className="text-primary"/> Types d'Opérations
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" tick={{fontSize: 10, fontWeight: 'bold'}} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" tick={{fontSize: 10, fontWeight: 'bold'}} tickLine={false} axisLine={false} />
              <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold' }} />
              <Bar dataKey="value" name="Nombre d'opérations" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
