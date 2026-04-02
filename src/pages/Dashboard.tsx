import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { triggerSuccessToast } from '../lib/toastUtils';
import { PlusCircle, Building, Calendar, Edit, Trash2 } from 'lucide-react';

interface Operation {
  id: string;
  name: string;
  project_manager: string;
  operation_type: string;
  expected_delivery_date: string;
  actual_delivery_date: string;
  promoter_name: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterManager, setFilterManager] = useState('');
  const [filterPromoter, setFilterPromoter] = useState('');

  useEffect(() => {
    fetchOperations();
  }, []);

  const fetchOperations = async () => {
    try {
      const { data, error } = await supabase
        .from('operations')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setOperations(data || []);
    } catch (error) {
      console.error('Error fetching operations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Chargement des opérations...</div>;
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette opération ET toutes ses observations ? Cette action est irréversible.')) return;
    try {
      const { error } = await supabase.from('operations').delete().eq('id', id);
      if (error) throw error;
      triggerSuccessToast(useStore.getState().user?.email, 'Opération supprimée avec succès.');
      fetchOperations();
    } catch (err) {
      console.error('Error deleting operation:', err);
    }
  };

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/operations/${id}/edit`);
  };

  const filteredOperations = operations.filter(op => {
    if (filterManager && op.project_manager !== filterManager) return false;
    if (filterPromoter && op.promoter_name !== filterPromoter) return false;
    return true;
  });

  const uniqueManagers = Array.from(new Set(operations.map(o => o.project_manager))).sort();
  const uniquePromoters = Array.from(new Set(operations.map(o => o.promoter_name).filter(Boolean))).sort();

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mes Opérations</h1>
          <p className="text-slate-500 mt-1">Gérez vos programmes immobiliers et suivez leur avancement.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <select 
              value={filterManager} 
              onChange={(e) => setFilterManager(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none min-w-[150px]"
            >
              <option value="">Tous les conducteurs</option>
              {uniqueManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select 
              value={filterPromoter} 
              onChange={(e) => setFilterPromoter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none min-w-[150px]"
            >
              <option value="">Tous les promoteurs</option>
              {uniquePromoters.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button 
            onClick={() => navigate('/operations/new')}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <PlusCircle size={20} />
            <span>Nouvelle Opération</span>
          </button>
        </div>
      </div>

      {operations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <Building className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Aucune opération trouvée</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">Commencez par créer votre première opération immobilière pour y lier des observations et suivre leur avancement.</p>
          <button 
            onClick={() => navigate('/operations/new')}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center gap-2 transition-colors"
          >
            <PlusCircle size={20} />
            <span>Créer une opération</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOperations.map((op) => (
            <div 
              key={op.id} 
              onClick={() => navigate(`/operations/${op.id}`)}
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group"
            >
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-medium">
                  {op.operation_type}
                </span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex bg-white/90 backdrop-blur rounded shadow-sm border border-slate-200">
                  <button onClick={(e) => handleEdit(e, op.id)} className="p-1.5 text-slate-500 hover:text-primary transition" title="Modifier">
                    <Edit size={14} />
                  </button>
                  <button onClick={(e) => handleDelete(e, op.id)} className="p-1.5 text-slate-500 hover:text-danger transition" title="Supprimer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2 pr-24 line-clamp-1">{op.name}</h3>
              <p className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                  {op.project_manager.charAt(0).toUpperCase()}
                </span>
                {op.project_manager}
              </p>
              
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex items-center text-xs text-slate-600 gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="font-medium">Livraison Prev :</span>
                  <span>{op.expected_delivery_date ? new Date(op.expected_delivery_date).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center text-xs text-slate-600 gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="font-medium">Livraison réelle :</span>
                  <span className={op.actual_delivery_date ? 'text-emerald-600 font-bold' : 'text-slate-400 italic'}>
                    {op.actual_delivery_date ? new Date(op.actual_delivery_date).toLocaleDateString() : 'Non livré/Saisi'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
