import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { triggerSuccessToast } from '../lib/toastUtils';
import { Trash2, Edit, X, Printer, LayoutGrid, List, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

type ViewMode = 'structuree' | 'tabulaire';
type TabularFilter = 'statut' | 'vefa' | 'mod' | 'all';

export default function Observations() {
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('structuree');
  const [tabularFilter, setTabularFilter] = useState<TabularFilter>('all');
  
  // Basic Filters
  const [filterOp, setFilterOp] = useState('');
  const [filterCtx, setFilterCtx] = useState('');
  const [filterRealisateur, setFilterRealisateur] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [editingObs, setEditingObs] = useState<any | null>(null);

  useEffect(() => {
    fetchObservations();
  }, []);

  const fetchObservations = async () => {
    try {
      const { data, error } = await supabase
        .from('observations')
        .select(`
          *,
          operations (*)
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
    if (obs.completion_date) return { label: 'Terminé', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', dot: 'bg-emerald-500' };
    const deadline = new Date(obs.deadline_date);
    const today = new Date();
    today.setHours(0,0,0,0);
    if (deadline < today) return { label: 'En retard', color: 'text-red-600 bg-red-50 border-red-100', dot: 'bg-red-500' };
    return { label: 'En cours', color: 'text-amber-600 bg-amber-50 border-amber-100', dot: 'bg-amber-500' };
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

  const handlePrint = () => {
    window.print();
  };

  const exportToExcel = () => {
    const dataToExport = filteredData.map((obs: any) => ({
      'Opération': obs.operation?.name || 'N/A',
      'Conducteur (CTX)': obs.operation?.project_manager || 'N/A',
      'Description': obs.description,
      'Statut': obs.status === 'done' ? 'Terminé' : (obs.status === 'blocked' ? 'Bloqué' : 'En cours'),
      'Réalisateur': obs.responsible_person || 'N/A',
      'Date Info': obs.info_date ? new Date(obs.info_date).toLocaleDateString() : 'N/A',
      'Butoire': obs.deadline_date ? new Date(obs.deadline_date).toLocaleDateString() : 'N/A',
      'Réalisation': obs.completion_date ? new Date(obs.completion_date).toLocaleDateString() : 'N/A',
      'Type': obs.operation?.operation_type || 'N/A',
      'Promoteur': obs.operation?.promoter_name || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Observations");
    
    // Auto-size columns
    const max_width = dataToExport.reduce((w: number, r: any) => Math.max(w, ...Object.values(r).map((v: any) => v ? v.toString().length : 0)), 10);
    worksheet['!cols'] = Object.keys(dataToExport[0]).map(() => ({ wch: max_width + 2 }));

    XLSX.writeFile(workbook, `MonPetitPro_Observations_${new Date().toISOString().split('T')[0]}.xlsx`);
    triggerSuccessToast("Fichier Excel généré avec succès !");
  };

  // Dynamic filter lists
  const uniqueOps = Array.from(new Set(observations.map(o => o.operations.name))).sort();
  const uniqueCtx = Array.from(new Set(observations.map(o => o.operations.project_manager))).sort();
  const uniqueResponsables = Array.from(new Set(observations.map(o => o.responsible_person))).sort();

  // Unified filtering
  const filteredData = observations.filter(obs => {
    if (filterOp && obs.operations.name !== filterOp) return false;
    if (filterCtx && obs.operations.project_manager !== filterCtx) return false;
    if (filterRealisateur && obs.responsible_person !== filterRealisateur) return false;
    if (filterStatus && getStatus(obs).label !== filterStatus) return false;
    
    // Tabular-specific sub-filters
    if (viewMode === 'tabulaire') {
      if (tabularFilter === 'vefa' && obs.operations.operation_type !== 'VEFA') return false;
      if (tabularFilter === 'mod' && obs.operations.operation_type === 'VEFA') return false;
    }
    
    return true;
  });

  // Grouping for Structured View
  const groupedData = filteredData.reduce((acc, obs) => {
    const opId = obs.operations.id;
    if (!acc[opId]) {
      acc[opId] = {
        op: obs.operations,
        items: []
      };
    }
    acc[opId].items.push(obs);
    return acc;
  }, {} as Record<string, { op: any, items: any[] }>);

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement...</div>;

  return (
    <div className="pb-12 max-w-[1600px] mx-auto">
      {/* HEADER SECTION - Hidden on Print */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Suivi des Observations</h1>
          <p className="text-slate-500 mt-1">Gérez et exportez vos points de vigilance par opération ou par statut.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-1 flex">
            <button 
              onClick={() => setViewMode('structuree')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === 'structuree' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <LayoutGrid size={16} /> Structurée
            </button>
            <button 
              onClick={() => setViewMode('tabulaire')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === 'tabulaire' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <List size={16} /> Tabulaire
            </button>
          </div>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition shadow-sm"
          >
            <FileSpreadsheet size={18} /> Exporter Excel
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition shadow-sm"
          >
            <Printer size={18} /> Exporter PDF
          </button>
        </div>
      </div>

      {/* FILTERS SECTION - Hidden on Print */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-8 print:hidden">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5 ml-1">Opération</label>
            <select value={filterOp} onChange={(e) => setFilterOp(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
              <option value="">Toutes</option>
              {uniqueOps.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5 ml-1">Conducteur (CTX)</label>
            <select value={filterCtx} onChange={(e) => setFilterCtx(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
              <option value="">Tous</option>
              {uniqueCtx.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5 ml-1">Réalisateur</label>
            <select value={filterRealisateur} onChange={(e) => setFilterRealisateur(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
              <option value="">Tous</option>
              {uniqueResponsables.map(r => <option key={r as string} value={r as string}>{r}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5 ml-1">Statut</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
              <option value="">Tous</option>
              <option value="En retard">En retard</option>
              <option value="En cours">En cours</option>
              <option value="Terminé">Terminé</option>
            </select>
          </div>
          <button 
            onClick={() => {setFilterOp(''); setFilterCtx(''); setFilterRealisateur(''); setFilterStatus('');}}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 text-sm font-semibold transition bg-white shadow-sm"
          >
            Effacer
          </button>
        </div>

        {/* Tabular Sub-Filters */}
        {viewMode === 'tabulaire' && (
          <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
            <button onClick={() => setTabularFilter('all')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${tabularFilter === 'all' ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>GLOBALISÉ</button>
            <button onClick={() => setTabularFilter('vefa')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${tabularFilter === 'vefa' ? 'bg-warning border-warning text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>FILTRE PAR VEFA</button>
            <button onClick={() => setTabularFilter('mod')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${tabularFilter === 'mod' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>FILTRE PAR MOD</button>
            <button onClick={() => setTabularFilter('statut')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${tabularFilter === 'statut' ? 'bg-danger border-danger text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>FILTRE PAR STATUT</button>
          </div>
        )}
      </div>

      {/* CONTENT SECTION */}
      <div id="print-area">
        {viewMode === 'structuree' ? (
          /* VUE STRUCTURÉE (Groupée par Opération) */
          <div className="space-y-12">
            {(Object.entries(groupedData) as [string, {op: any, items: any[]}][]).map(([opId, { op, items }]) => (
              <div key={opId} className="print:break-inside-avoid">
                {/* Op Header as requested in mockups - Optimized for long text and responsive */}
                <div className="bg-slate-900 text-white rounded-t-xl overflow-hidden print:bg-slate-900 print:text-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 p-4 gap-y-6 gap-x-4 text-[10px] uppercase font-bold tracking-wider">
                    <div className="lg:border-r lg:border-slate-700 pr-2 min-w-0">
                      <span className="text-slate-500 block mb-1">Nom de l'OP</span>
                      <span className="text-sm md:text-base text-white block truncate" title={op.name}>{op.name}</span>
                    </div>
                    <div className="lg:border-r lg:border-slate-700 pr-2 min-w-0">
                      <span className="text-slate-500 block mb-1">Nbre logt</span>
                      <span className="text-sm md:text-base text-white block">{op.total_housing_units}</span>
                    </div>
                    <div className="lg:border-r lg:border-slate-700 pr-2 min-w-0">
                      <span className="text-slate-500 block mb-1">CTX</span>
                      <span className="text-sm md:text-base text-white block truncate" title={op.project_manager}>{op.project_manager}</span>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-2 lg:border-r lg:border-slate-700 pr-2 min-w-0">
                      <span className="text-slate-500 block mb-1">Dates livraison (Cont / Previ / Réelle)</span>
                      <div className="text-xs flex flex-wrap gap-x-2 gap-y-1 items-center">
                        <span className="text-white">{op.contractual_delivery_date ? new Date(op.contractual_delivery_date).toLocaleDateString() : '-'}</span>
                        <span className="text-slate-700 hidden sm:inline">|</span>
                        <span className="text-white">{op.expected_delivery_date ? new Date(op.expected_delivery_date).toLocaleDateString() : '-'}</span>
                        <span className="text-slate-700 hidden sm:inline">|</span>
                        <span className={op.actual_delivery_date ? 'text-emerald-400 font-bold' : 'text-slate-400 italic'}>
                          {op.actual_delivery_date ? new Date(op.actual_delivery_date).toLocaleDateString() : 'Non livré'}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 block mb-1">Type / PROMOTEUR</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-slate-800 text-[9px] px-1.5 py-0.5 rounded text-slate-300 border border-slate-700 shrink-0">{op.operation_type}</span>
                        <span className="text-white text-[10px] truncate" title={op.promoter_name || 'N/A'}>{op.promoter_name || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Observation Table for this op */}
                <div className="bg-white border-x border-b border-slate-200 rounded-b-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-6">Date Info</th>
                        <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/2">Description des observations</th>
                        <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Réalisateur</th>
                        <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Butoire</th>
                        <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Réalisation</th>
                        <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-6 print:hidden">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((obs) => (
                        <tr key={obs.id} className="group hover:bg-slate-50 transition-colors">
                          <td className="p-3 pl-6 text-xs text-slate-600 font-medium">{new Date(obs.info_date).toLocaleDateString()}</td>
                          <td className="p-3 text-sm text-slate-900 font-semibold">{obs.description}</td>
                          <td className="p-3 text-xs text-slate-700 uppercase font-bold">{obs.responsible_person}</td>
                          <td className="p-3 text-xs text-slate-600">{new Date(obs.deadline_date).toLocaleDateString()}</td>
                          <td className="p-3 text-xs font-bold">
                            {obs.completion_date ? (
                              <span className="text-emerald-600">{new Date(obs.completion_date).toLocaleDateString()}</span>
                            ) : (
                              <span className={new Date(obs.deadline_date) < new Date() ? 'text-red-500' : 'text-slate-300 italic'}>En cours</span>
                            )}
                          </td>
                          <td className="p-3 pr-6 text-right print:hidden">
                            <div className="flex justify-end gap-1 opacity-20 group-hover:opacity-100 transition">
                              <button onClick={() => setEditingObs(obs)} className="p-1 text-slate-400 hover:text-primary"><Edit size={14}/></button>
                              <button onClick={() => deleteObservation(obs.id)} className="p-1 text-slate-400 hover:text-danger"><Trash2 size={14}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* VUE TABULAIRE GLOBALE */
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest">Vue Tabulaire : {tabularFilter.toUpperCase()}</span>
              <span className="text-[10px] text-slate-400">{filteredData.length} observations trouvées</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-6">Nom OP</th>
                    {tabularFilter === 'vefa' && <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Promoteur</th>}
                    {(tabularFilter === 'vefa' || tabularFilter === 'mod') && <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nbre lot</th>}
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">CTx</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4">Description</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Réalisateur</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Info</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Butoire</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Réalisation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((obs) => {
                    const status = getStatus(obs);
                    return (
                      <tr key={obs.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 pl-6 text-sm font-bold text-slate-900">{obs.operations.name}</td>
                        {tabularFilter === 'vefa' && <td className="p-4 text-xs text-slate-600 font-medium uppercase">{obs.operations.promoter_name || '-'}</td>}
                        {(tabularFilter === 'vefa' || tabularFilter === 'mod') && <td className="p-4 text-xs text-slate-700">{obs.operations.total_housing_units}</td>}
                        <td className="p-4 text-xs text-slate-700 font-semibold">{obs.operations.project_manager}</td>
                        <td className="p-4 text-sm font-medium text-slate-800">{obs.description}</td>
                        <td className="p-4">
                          <div className={`px-2 py-1 rounded inline-flex items-center gap-2 border ${status.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                            <span className="text-[10px] font-black uppercase tracking-tighter">{status.label}</span>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-black text-slate-900 uppercase tracking-tighter">{obs.responsible_person}</td>
                        <td className="p-4 text-[11px] text-slate-500 font-bold">{new Date(obs.info_date).toLocaleDateString()}</td>
                        <td className="p-4 text-[11px] text-slate-500 font-bold">{new Date(obs.deadline_date).toLocaleDateString()}</td>
                        <td className="p-4 text-[11px] text-emerald-600 font-black">{obs.completion_date ? new Date(obs.completion_date).toLocaleDateString() : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL EDIT - Simple version updated with 'Réalisateur' labeling */}
      {editingObs && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Modifier l'observation</h2>
              <button onClick={() => setEditingObs(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description *</label>
                <textarea 
                  required 
                  value={editingObs.description} 
                  onChange={(e) => setEditingObs({...editingObs, description: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary h-24"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Réalisateur *</label>
                  <input required value={editingObs.responsible_person} onChange={(e) => setEditingObs({...editingObs, responsible_person: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Date Butoire *</label>
                  <input type="date" value={editingObs.deadline_date} onChange={(e) => setEditingObs({...editingObs, deadline_date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-50">
                <button type="button" onClick={() => setEditingObs(null)} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition">Annuler</button>
                <button type="submit" className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-primary/90 transition">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
