import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Filter } from 'lucide-react';

export default function Observations() {
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterOp, setFilterOp] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterResponsable, setFilterResponsable] = useState('');

  useEffect(() => {
    fetchObservations();
  }, []);

  const fetchObservations = async () => {
    try {
      // Query observations joined with operations
      const { data, error } = await supabase
        .from('observations')
        .select(`
          *,
          operations (
            name,
            operation_type,
            project_manager,
            promoter_name
          )
        `)
        .order('deadline_date', { ascending: true });

      if (error) throw error;
      setObservations(data || []);
    } catch (error) {
      console.error('Error fetching observations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (obs: any) => {
    if (obs.completion_date) return { label: 'Terminé', color: 'bg-emerald-100 text-emerald-800' };
    const deadline = new Date(obs.deadline_date);
    const today = new Date();
    today.setHours(0,0,0,0);
    if (deadline < today) return { label: 'En retard', color: 'bg-red-100 text-red-800' };
    return { label: 'En cours', color: 'bg-amber-100 text-amber-800' };
  };

  // Extract unique values for filters
  const uniqueOps = Array.from(new Set(observations.map(o => o.operations.name))).sort();
  const uniqueTypes = Array.from(new Set(observations.map(o => o.operations.operation_type))).sort();
  const uniqueResponsables = Array.from(new Set(observations.map(o => o.responsible_person))).sort();

  // Apply filters
  const filteredObservations = observations.filter(obs => {
    if (filterOp && obs.operations.name !== filterOp) return false;
    if (filterType && obs.operations.operation_type !== filterType) return false;
    if (filterResponsable && obs.responsible_person !== filterResponsable) return false;
    return true;
  });

  // Group by operation
  const groupedObservations = filteredObservations.reduce((acc, obs) => {
    const opName = obs.operations.name;
    if (!acc[opName]) acc[opName] = [];
    acc[opName].push(obs);
    return acc;
  }, {} as Record<string, any[]>);

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement...</div>;

  return (
    <div className="pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Toutes les Observations</h1>
        <p className="text-slate-500">Vue globale et filtrage des observations sur toutes vos opérations.</p>
      </div>

      {/* Filtres */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-8 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><Filter size={12}/> Opération</label>
          <select value={filterOp} onChange={(e) => setFilterOp(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none">
            <option value="">Toutes les opérations</option>
            {uniqueOps.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Type (VEFA...)</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none">
            <option value="">Tous les types</option>
            {uniqueTypes.map(t => <option key={t as string} value={t as string}>{t}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Responsable</label>
          <select value={filterResponsable} onChange={(e) => setFilterResponsable(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none">
            <option value="">Tous les responsables</option>
            {uniqueResponsables.map(r => <option key={r as string} value={r as string}>{r}</option>)}
          </select>
        </div>
        <button 
          onClick={() => {setFilterOp(''); setFilterType(''); setFilterResponsable('');}}
          className="px-4 py-2 border border-slate-300 rounded text-slate-600 hover:bg-slate-50"
        >
          Réinitialiser
        </button>
      </div>

      {/* Affichage Groupé */}
      {Object.keys(groupedObservations).length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-500">Aucune observation trouvée pour les filtres actuels.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedObservations).map(([opName, obsList]) => (
            <div key={opName} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">{opName}</h3>
                <div className="flex gap-2">
                  <span className="text-xs bg-white border border-slate-200 px-2 py-1 flex items-center gap-1 rounded text-slate-600">
                    <span className="font-medium">{(obsList as any[]).filter((o: any) => getStatus(o).label === 'En retard').length}</span>
                    <span className="w-2 h-2 rounded-full bg-red-400"></span> retards
                  </span>
                  <span className="text-xs bg-white border border-slate-200 px-2 py-1 flex items-center gap-1 rounded text-slate-600">
                    <span className="font-medium">{(obsList as any[]).filter((o: any) => !o.completion_date).length}</span> 
                    actives
                  </span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="p-4 font-medium text-slate-500 text-xs uppercase tracking-wider">Date d'info</th>
                      <th className="p-4 font-medium text-slate-500 text-xs uppercase tracking-wider w-1/3">Description</th>
                      <th className="p-4 font-medium text-slate-500 text-xs uppercase tracking-wider">Responsable</th>
                      <th className="p-4 font-medium text-slate-500 text-xs uppercase tracking-wider">Date butoir</th>
                      <th className="p-4 font-medium text-slate-500 text-xs uppercase tracking-wider">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(obsList as any[]).map((obs: any) => {
                      const status = getStatus(obs);
                      return (
                        <tr key={obs.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-sm text-slate-600">{new Date(obs.info_date).toLocaleDateString()}</td>
                          <td className="p-4 text-sm text-slate-800">{obs.description}</td>
                          <td className="p-4 text-sm text-slate-700 font-medium">{obs.responsible_person}</td>
                          <td className="p-4 text-sm text-slate-600">
                            {new Date(obs.deadline_date).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
