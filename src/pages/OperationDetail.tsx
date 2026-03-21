import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { triggerSuccessToast } from '../lib/toastUtils';
import { ArrowLeft, Calendar, FileText, CheckCircle2, AlertCircle, Clock, Trash2, Edit } from 'lucide-react';

interface Operation {
  id: string;
  name: string;
  project_manager: string;
  manager_name: string;
  operation_type: string;
  promoter_name?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  total_housing_units: number;
  lli_units: number;
  lls_units: number;
  plai_units: number;
  pls_units: number;
  brs_units: number;
  psla_units: number;
  student_units: number;
  specific_units: number;
  initial_budget: number;
}

interface Observation {
  id: string;
  info_date: string;
  description: string;
  responsible_person: string;
  deadline_date: string;
  completion_date: string | null;
}

export default function OperationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [operation, setOperation] = useState<Operation | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [responsibles, setResponsibles] = useState<string[]>([]);
  const [editingObsId, setEditingObsId] = useState<string | null>(null);

  // Observation form
  const [showObsForm, setShowObsForm] = useState(false);
  const [showCustomResponsible, setShowCustomResponsible] = useState(false);
  const [obsForm, setObsForm] = useState({
    info_date: new Date().toISOString().split('T')[0],
    description: '',
    responsible_person: '',
    deadline_date: '',
    completion_date: ''
  });

  const resetObsForm = () => {
    setEditingObsId(null);
    setObsForm({
      info_date: new Date().toISOString().split('T')[0],
      description: '',
      responsible_person: '',
      deadline_date: '',
      completion_date: ''
    });
    setShowCustomResponsible(false);
    setShowObsForm(false);
  };

  useEffect(() => {
    if (id) {
      fetchOperationData();
    }
  }, [id]);

  const fetchOperationData = async () => {
    try {
      // Fetch operation
      const { data: opData, error: opError } = await supabase
        .from('operations')
        .select('*')
        .eq('id', id)
        .single();
        
      if (opError) throw opError;
      setOperation(opData);

      // Fetch observations
      const { data: obsData, error: obsError } = await supabase
        .from('observations')
        .select('*')
        .eq('operation_id', id)
        .order('deadline_date', { ascending: true });

      if (obsError) throw obsError;
      const obsList = obsData || [];
      setObservations(obsList);
      
      // Extraire les responsables uniques pour l'autocomplétion
      const uniqueResp = Array.from(new Set(obsList.map(o => o.responsible_person).filter(Boolean)));
      setResponsibles(uniqueResp as string[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleObsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const payload = {
        operation_id: id,
        user_id: userData.user?.id,
        info_date: obsForm.info_date,
        description: obsForm.description,
        responsible_person: obsForm.responsible_person,
        deadline_date: obsForm.deadline_date,
        completion_date: obsForm.completion_date || null
      };

      if (editingObsId) {
        const { error } = await supabase.from('observations').update(payload).eq('id', editingObsId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('observations').insert([payload]);
        if (error) throw error;
      }
      
      resetObsForm();
      triggerSuccessToast(useStore.getState().user?.email, editingObsId ? 'Observation modifiée avec succès.' : 'Observation ajoutée avec succès.');
      fetchOperationData();
    } catch (error) {
      console.error('Error adding/updating observation:', error);
    }
  };

  const deleteObservation = async (obsId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette observation ?')) return;
    try {
      const { error } = await supabase.from('observations').delete().eq('id', obsId);
      if (error) throw error;
      triggerSuccessToast(useStore.getState().user?.email, 'Observation supprimée avec succès.');
      fetchOperationData();
    } catch (e) {
      console.error('Error deleting observation:', e);
    }
  };

  const editObservation = (obs: Observation) => {
    setEditingObsId(obs.id);
    setObsForm({
      info_date: obs.info_date,
      description: obs.description,
      responsible_person: obs.responsible_person,
      deadline_date: obs.deadline_date,
      completion_date: obs.completion_date || ''
    });
    setShowObsForm(true);
  };

  const deleteOperation = async () => {
    if (!operation) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette opération ET toutes ses observations ? Cette action est irréversible.')) return;
    try {
      const { error } = await supabase.from('operations').delete().eq('id', operation.id);
      if (error) throw error;
      triggerSuccessToast(useStore.getState().user?.email, 'Opération supprimée avec succès.');
      navigate('/');
    } catch (e) {
      console.error('Error deleting operation:', e);
    }
  };

  const markAsCompleted = async (obsId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('observations')
        .update({ completion_date: today })
        .eq('id', obsId);
        
      if (error) throw error;
      fetchOperationData();
    } catch (error) {
      console.error('Error marking as completed:', error);
    }
  };

  const getStatus = (obs: Observation) => {
    if (obs.completion_date) return { label: 'Terminé', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 };
    
    // Check if overdue
    const deadline = new Date(obs.deadline_date);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (deadline < today) {
      return { label: 'En retard', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    }
    
    return { label: 'En cours', color: 'bg-amber-100 text-amber-800', icon: Clock };
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement...</div>;
  if (!operation) return <div className="p-8 text-center text-slate-500">Opération introuvable.</div>;

  return (
    <div className="pb-12">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition"
      >
        <ArrowLeft size={20} className="mr-2" /> Retour
      </button>

      <div className="bg-white p-6 rounded-xl border border-slate-200 mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{operation.name}</h1>
              <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-md font-medium border border-slate-200">
                {operation.operation_type}
              </span>
            </div>
            <p className="text-slate-600 flex flex-col gap-1">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                  {operation.manager_name?.charAt(0).toUpperCase() || 'G'}
                </span>
                Gestionnaire : <span className="font-medium text-slate-800">{operation.manager_name || '-'}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                  {operation.project_manager.charAt(0).toUpperCase()}
                </span>
                Conducteur (CTX) : <span className="font-medium text-slate-800">{operation.project_manager}</span>
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => navigate(`/operations/${operation.id}/edit`)}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-50 flex items-center gap-2 text-sm font-medium transition"
            >
              <Edit size={16} /> Modifier
            </button>
            <button 
              onClick={deleteOperation}
              className="px-3 py-1.5 bg-white border border-danger/20 text-danger rounded hover:bg-danger/5 flex items-center gap-2 text-sm font-medium transition"
            >
              <Trash2 size={16} /> Supprimer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-sm text-slate-500 mb-1">Livraison Prévue</p>
            <p className="font-medium text-slate-800 flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              {operation.expected_delivery_date ? new Date(operation.expected_delivery_date).toLocaleDateString() : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Type Logements</p>
            <div className="flex flex-wrap gap-1 mt-1">
              <span className="bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-bold">TOTAL: {operation.total_housing_units}</span>
              {operation.student_units > 0 && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 text-[10px] font-bold">ETUDIANT: {operation.student_units}</span>}
              {operation.specific_units > 0 && <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100 text-[10px] font-bold">SPECIFIQUE: {operation.specific_units}</span>}
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Budget Initial</p>
            <p className="font-medium text-slate-800">{operation.initial_budget ? `${operation.initial_budget.toLocaleString()} €` : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Promoteur</p>
            <p className="font-medium text-slate-800">{operation.promoter_name || '-'}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <FileText size={24} className="text-primary" />
          Observations ({observations.length})
        </h2>
        <button 
          onClick={() => showObsForm ? resetObsForm() : setShowObsForm(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          {showObsForm ? 'Annuler' : 'Ajouter une observation'}
        </button>
      </div>

      <datalist id="responsibles-list">
        {responsibles.map(r => <option key={r} value={r} />)}
      </datalist>

      {showObsForm && (
        <form onSubmit={handleObsSubmit} className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
          <h3 className="font-medium text-slate-800 mb-4">{editingObsId ? 'Modifier l\'observation' : 'Nouvelle observation'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date de l'info *</label>
              <input required type="date" value={obsForm.info_date} onChange={(e) => setObsForm({...obsForm, info_date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Réalisateur *</label>
                  {responsibles.length > 0 && !showCustomResponsible && (!obsForm.responsible_person || responsibles.includes(obsForm.responsible_person)) ? (
                    <select
                      required
                      value={obsForm.responsible_person}
                      onChange={(e) => {
                        if (e.target.value === 'NEW') {
                          setShowCustomResponsible(true);
                          setObsForm({...obsForm, responsible_person: ''});
                        } else setObsForm({...obsForm, responsible_person: e.target.value});
                      }}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                    >
                      <option value="" disabled>Sélectionner...</option>
                      {responsibles.map((r, i) => <option key={i} value={r}>{r}</option>)}
                      <option value="NEW" className="font-bold text-primary">+ Nouveau réalisateur...</option>
                    </select>
                  ) : (
                    <div className="relative">
                      <input
                        required
                        type="text"
                        placeholder="Saisissez un nom"
                        value={obsForm.responsible_person}
                        onChange={(e) => setObsForm({...obsForm, responsible_person: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none pr-16"
                      />
                      {responsibles.length > 0 && (
                        <button type="button" onClick={() => { setShowCustomResponsible(false); setObsForm({...obsForm, responsible_person: ''}); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:underline">
                          Retour liste
                        </button>
                      )}
                    </div>
                  )}
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
              <textarea required value={obsForm.description} onChange={(e) => setObsForm({...obsForm, description: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none min-h-[80px]" placeholder="Détail du problème ou de la remarque..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date butoir *</label>
              <input required type="date" value={obsForm.deadline_date} onChange={(e) => setObsForm({...obsForm, deadline_date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date de réalisation</label>
              <input type="date" value={obsForm.completion_date} onChange={(e) => setObsForm({...obsForm, completion_date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium transition">
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {observations.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-sm">
          <p className="text-slate-500">Aucune observation pour cette opération.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-medium text-slate-600 text-sm">Date d'info</th>
                  <th className="p-4 font-medium text-slate-600 text-sm w-1/3">Description</th>
                  <th className="p-4 font-medium text-slate-600 text-sm">Réalisateur</th>
                  <th className="p-4 font-medium text-slate-600 text-sm">Date butoir</th>
                  <th className="p-4 font-medium text-slate-600 text-sm">Statut</th>
                  <th className="p-4 font-medium text-slate-600 text-sm text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {observations.map((obs) => {
                  const status = getStatus(obs);
                  const StatusIcon = status.icon;
                  return (
                    <tr key={obs.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-sm text-slate-600">
                        {new Date(obs.info_date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm text-slate-800">
                        {obs.description}
                      </td>
                      <td className="p-4 text-sm text-slate-700 font-medium">
                        {obs.responsible_person}
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {new Date(obs.deadline_date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                          <StatusIcon size={14} />
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-right">
                        {!obs.completion_date && (
                          <button 
                            onClick={() => markAsCompleted(obs.id)}
                            className="text-primary hover:text-primary/80 font-medium text-xs border border-primary/20 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded transition inline-block mb-1"
                          >
                            Marquer terminé
                          </button>
                        )}
                        {obs.completion_date && (
                          <span className="text-xs text-slate-500 block text-right mt-1 mb-2">
                            le {new Date(obs.completion_date).toLocaleDateString()}
                          </span>
                        )}
                        <div className="flex justify-end gap-2 mt-2">
                          <button onClick={() => editObservation(obs)} className="text-slate-400 hover:text-slate-600 transition" title="Modifier">
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
      )}
    </div>
  );
}
