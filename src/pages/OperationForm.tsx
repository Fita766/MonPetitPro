import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Save, X, Building2 } from 'lucide-react';

export default function OperationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [managers, setManagers] = useState<string[]>([]);
  const [promoters, setPromoters] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    project_manager: '',
    operation_type: 'V1',
    promoter_name: '',
    contractual_delivery_date: '',
    expected_delivery_date: '',
    actual_delivery_date: '',
    daact_date: '',
    initial_budget: '',
    final_budget: '',
    total_housing_units: '0',
    lli_units: '0',
    lls_units: '0',
    plai_units: '0',
    pls_units: '0',
    brs_units: '0',
    psla_units: '0',
    individual_housing_units: '0',
    collective_housing_units: '0',
  });

  useEffect(() => {
    fetchSuggestions();
    if (id) {
      fetchOperation();
    }
  }, [id]);

  const fetchSuggestions = async () => {
    try {
      const { data } = await supabase.from('operations').select('project_manager, promoter_name');
      if (data) {
        setManagers(Array.from(new Set(data.map(d => d.project_manager).filter(Boolean))));
        setPromoters(Array.from(new Set(data.map(d => d.promoter_name).filter(Boolean))));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOperation = async () => {
    try {
      const { data, error } = await supabase.from('operations').select('*').eq('id', id).single();
      if (error) throw error;
      if (data) {
        // Convert nulls to empty strings for form inputs
        const safeData = Object.keys(data).reduce((acc: any, key) => {
          acc[key] = data[key] === null ? '' : String(data[key]);
          return acc;
        }, {});
        // Fix operation_type to default to V1 if not standard
        if (!['V1', 'VEFA', 'Réhabilitation', 'Autre'].includes(safeData.operation_type)) {
           safeData.operation_type = 'Autre';
        }
        setFormData(prev => ({ ...prev, ...safeData }));
      }
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement de l\'opération.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const payload = {
        ...formData,
        initial_budget: formData.initial_budget ? parseFloat(formData.initial_budget) : null,
        final_budget: formData.final_budget ? parseFloat(formData.final_budget) : null,
        total_housing_units: parseInt(formData.total_housing_units) || 0,
        lli_units: parseInt(formData.lli_units) || 0,
        lls_units: parseInt(formData.lls_units) || 0,
        plai_units: parseInt(formData.plai_units) || 0,
        pls_units: parseInt(formData.pls_units) || 0,
        brs_units: parseInt(formData.brs_units) || 0,
        psla_units: parseInt(formData.psla_units) || 0,
        individual_housing_units: parseInt(formData.individual_housing_units) || 0,
        collective_housing_units: parseInt(formData.collective_housing_units) || 0,
        user_id: userData.user?.id,
        // Convert empty strings to null for dates
        contractual_delivery_date: formData.contractual_delivery_date || null,
        expected_delivery_date: formData.expected_delivery_date || null,
        actual_delivery_date: formData.actual_delivery_date || null,
        daact_date: formData.daact_date || null,
      };

      let insertError;
      
      if (id) {
        const { error } = await supabase.from('operations').update(payload).eq('id', id);
        insertError = error;
      } else {
        const { error } = await supabase.from('operations').insert([payload]);
        insertError = error;
      }

      if (insertError) throw insertError;
      
      navigate(id ? `/operations/${id}` : '/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Une erreur est survenue lors de la création.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <datalist id="managers-list">
        {managers.map(m => <option key={m} value={m} />)}
      </datalist>
      <datalist id="promoters-list">
        {promoters.map(m => <option key={m} value={m} />)}
      </datalist>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Building2 size={24} className="text-primary" />
          {id ? 'Modifier l\'Opération' : 'Nouvelle Opération'}
        </h1>
        <button 
          onClick={() => navigate(id ? `/operations/${id}` : '/')}
          className="text-slate-500 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition"
        >
          <X size={24} />
        </button>
      </div>

      {error && (
        <div className="bg-danger/10 text-danger p-4 rounded-lg mb-6 border border-danger/20">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        
        {/* Informations Générales */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Informations Générales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'opération *</label>
              <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Conducteur de travaux *</label>
              <input required list="managers-list" type="text" name="project_manager" value={formData.project_manager} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type d'opération *</label>
              <select name="operation_type" value={formData.operation_type} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none">
                <option value="V1">V1</option>
                <option value="VEFA">VEFA</option>
                <option value="Réhabilitation">Réhabilitation</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            {formData.operation_type === 'VEFA' && (
              <div className="col-span-1 md:col-span-2 border-l-4 border-warning pl-4 py-2 bg-warning/5 rounded-r">
                <label className="block text-sm font-medium text-slate-800 mb-1">Nom du promoteur (Obligatoire pour VEFA) *</label>
                <input required list="promoters-list" type="text" name="promoter_name" value={formData.promoter_name} onChange={handleChange} className="w-full px-4 py-2 border border-warning/30 rounded-lg focus:ring-2 focus:ring-warning focus:border-warning outline-none bg-white" />
              </div>
            )}
            
            {formData.operation_type !== 'VEFA' && (
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom du promoteur</label>
                <input list="promoters-list" type="text" name="promoter_name" value={formData.promoter_name} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
              </div>
            )}
          </div>
        </section>

        {/* Planning */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Planning & Dates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date contractuelle de livraison</label>
              <input type="date" name="contractual_delivery_date" value={formData.contractual_delivery_date} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date prévisionnelle de livraison</label>
              <input type="date" name="expected_delivery_date" value={formData.expected_delivery_date} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date réelle de livraison</label>
              <input type="date" name="actual_delivery_date" value={formData.actual_delivery_date} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date DAACT</label>
              <input type="date" name="daact_date" value={formData.daact_date} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
            </div>
          </div>
        </section>

        {/* Logements */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Détails des logements</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="col-span-2 md:col-span-4 bg-slate-50 p-4 rounded-lg border border-slate-200 mb-2">
              <label className="block text-sm font-medium text-slate-800 mb-1">Nombre total de logements</label>
              <input type="number" min="0" name="total_housing_units" value={formData.total_housing_units} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none max-w-xs" />
            </div>
            
            {/* Répartition */}
            <div><label className="block text-xs text-slate-500 mb-1">LLI</label><input type="number" min="0" name="lli_units" value={formData.lli_units} onChange={handleChange} className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none" /></div>
            <div><label className="block text-xs text-slate-500 mb-1">LLS</label><input type="number" min="0" name="lls_units" value={formData.lls_units} onChange={handleChange} className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none" /></div>
            <div><label className="block text-xs text-slate-500 mb-1">PLAI</label><input type="number" min="0" name="plai_units" value={formData.plai_units} onChange={handleChange} className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none" /></div>
            <div><label className="block text-xs text-slate-500 mb-1">PLS</label><input type="number" min="0" name="pls_units" value={formData.pls_units} onChange={handleChange} className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none" /></div>
            <div><label className="block text-xs text-slate-500 mb-1">BRS</label><input type="number" min="0" name="brs_units" value={formData.brs_units} onChange={handleChange} className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none" /></div>
            <div><label className="block text-xs text-slate-500 mb-1">PSLA</label><input type="number" min="0" name="psla_units" value={formData.psla_units} onChange={handleChange} className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Logements Individuels</label>
              <input type="number" min="0" name="individual_housing_units" value={formData.individual_housing_units} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Logements Collectifs</label>
              <input type="number" min="0" name="collective_housing_units" value={formData.collective_housing_units} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
            </div>
          </div>
        </section>

        {/* Budget */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Budget (€)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Budget Initial</label>
              <input type="number" step="0.01" name="initial_budget" value={formData.initial_budget} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Budget Final</label>
              <input type="number" step="0.01" name="final_budget" value={formData.final_budget} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
            </div>
          </div>
        </section>

        <div className="pt-6 border-t border-slate-200 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2 transition disabled:opacity-50"
          >
            <Save size={20} />
            {loading ? 'Enregistrement...' : 'Enregistrer l\'opération'}
          </button>
        </div>
      </form>
    </div>
  );
}
