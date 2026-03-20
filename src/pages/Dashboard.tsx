import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PlusCircle, Building, Calendar } from 'lucide-react';

interface Operation {
  id: string;
  name: string;
  project_manager: string;
  operation_type: string;
  expected_delivery_date: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOperations();
  }, []);

  const fetchOperations = async () => {
    try {
      const { data, error } = await supabase
        .from('operations')
        .select('*')
        .order('created_at', { ascending: false });

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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mes Opérations</h1>
          <p className="text-slate-500 mt-1">Gérez vos programmes immobiliers et suivez leur avancement.</p>
        </div>
        <button 
          onClick={() => navigate('/operations/new')}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <PlusCircle size={20} />
          <span>Nouvelle Opération</span>
        </button>
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
          {operations.map((op) => (
            <div 
              key={op.id} 
              onClick={() => navigate(`/operations/${op.id}`)}
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group"
            >
              <div className="absolute top-4 right-4 bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-medium">
                {op.operation_type}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2 pr-12 line-clamp-1">{op.name}</h3>
              <p className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                  {op.project_manager.charAt(0).toUpperCase()}
                </span>
                {op.project_manager}
              </p>
              
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center text-sm text-slate-600 gap-1.5">
                  <Calendar size={16} className="text-slate-400" />
                  <span>Livraison : {op.expected_delivery_date ? new Date(op.expected_delivery_date).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
