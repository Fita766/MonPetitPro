import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { triggerSuccessToast } from '../lib/toastUtils';
import { Filter, Trash2, Edit, X, Save } from 'lucide-react';

export default function Observations() {
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterOp, setFilterOp] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterResponsable, setFilterResponsable] = useState('');

  // Edit Modal
  const [editingObs, setEditingObs] = useState<any | null>(null);

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

  const deleteObservation = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette observation ?')) return;
    try {
      const { error } = await supabase.from('observations').delete().eq('id', id);
      if (error) throw error;
      triggerSuccessToast(useStore.getState().user?.email, 'Observation supprimée avec succès.');
      fetchObservations();
    } catch (err) {
      console.error('Error deleting observation:', err);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingObs) return;
    try {
      const payload = {
        info_date: editingObs.info_date,
        description: editingObs.description,
        responsible_person: editingObs.responsible_person,
        deadline_date: editingObs.deadline_date,
        completion_date: editingObs.completion_date || null
      };
      const { error } = await supabase.from('observations').update(payload).eq('id', editingObs.id);
      if (error) throw error;
      triggerSuccessToast(useStore.getState().user?.email, 'Observation modifiée avec succès.');
      setEditingObs(null);
      fetchObservations();
    } catch (err) {
      console.error('Error updating observation:', err);
    }
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
                      <th className="p-4 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">Actions</th>
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
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingObs(obs)} className="text-slate-400 hover:text-primary transition" title="Modifier">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => deleteObservation(obs.id)} className="text-slate-400 hover:text-danger transition" title="Supprimer">
                                <Trash2 size={16} />
                              </button>
                            </div>
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

      {/* Edit Modal */}
      {editingObs && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Modifier l'observation</h2>
              <button onClick={() => setEditingObs(null)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date de l'info *</label>
                  <input required type="date" value={editingObs.info_date} onChange={(e) => setEditingObs({...editingObs, info_date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Responsable *</label>
                  <input required type="text" value={editingObs.responsible_person} onChange={(e) => setEditingObs({...editingObs, responsible_person: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                  <textarea required value={editingObs.description} onChange={(e) => setEditingObs({...editingObs, description: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none min-h-[80px]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date butoir *</label>
                  <input required type="date" value={editingObs.deadline_date} onChange={(e) => setEditingObs({...editingObs, deadline_date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date de réalisation</label>
                  <input type="date" value={editingObs.completion_date || ''} onChange={(e) => setEditingObs({...editingObs, completion_date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditingObs(null)} className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition">
                  Annuler
                </button>
                <button type="submit" className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition">
                  <Save size={18} /> Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
