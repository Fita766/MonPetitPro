import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { triggerSuccessToast, triggerErrorToast } from '../lib/toastUtils';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval,
  parseISO
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, PlusCircle, X, MapPin, Video, 
  AlignLeft, Building, AlertTriangle, Calendar as CalendarIcon, Link as LinkIcon
} from 'lucide-react';

interface EventItem {
  id: string;
  title: string;
  event_date: string;
  event_time?: string | null;
  address?: string | null;
  description?: string | null;
  visio_link?: string | null;
  operation_id?: string | null;
  observation_id?: string | null;
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventItem[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [operations, setOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  const [form, setForm] = useState<Partial<EventItem>>({
    title: '',
    event_time: '',
    address: '',
    description: '',
    visio_link: '',
    operation_id: ''
  });

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Operations
      const { data: ops } = await supabase.from('operations').select('id, name');
      if (ops) setOperations(ops);

      // 2. Fetch Observations
      const { data: obsData } = await supabase
        .from('observations')
        .select(`*, operations (name)`);
      
      if (obsData) {
        const processedObs = obsData.map(obs => {
          const match = obs.description?.match(/\n\n\[STATUT: (.*?)\]/);
          if (match) {
              obs._custom_status = match[1];
              obs.description = obs.description.replace(/\n\n\[STATUT: .*?\]/, '');
          }
          return obs;
        });
        setObservations(processedObs);
      }

      // 3. Fetch Events (Handle potential missing table error gracefully)
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*');
      
      if (eventsError) {
        if (eventsError.code === '42P01') {
           console.warn("Table 'events' does not exist yet. Please run the SQL migration.");
           setEvents([]);
        } else {
           throw eventsError;
        }
      } else {
        setEvents(eventsData || []);
      }

    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setEditingEvent(null);
    setForm({
      title: '',
      event_time: '',
      address: '',
      description: '',
      visio_link: '',
      operation_id: ''
    });
    setIsModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, evt: EventItem) => {
    e.stopPropagation();
    setEditingEvent(evt);
    setForm(evt);
    setSelectedDate(parseISO(evt.event_date));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const payload = {
        title: form.title,
        event_date: format(selectedDate, 'yyyy-MM-dd'),
        event_time: form.event_time || null,
        address: form.address || null,
        description: form.description || null,
        visio_link: form.visio_link || null,
        operation_id: form.operation_id || null,
        user_id: userData.user?.id
      };

      if (editingEvent) {
        const { error } = await supabase.from('events').update(payload).eq('id', editingEvent.id);
        if (error) throw error;
        triggerSuccessToast(useStore.getState().user?.email, 'Évènement modifié avec succès.');
      } else {
        const { error } = await supabase.from('events').insert([payload]);
        if (error) throw error;
        triggerSuccessToast(useStore.getState().user?.email, 'Évènement ajouté avec succès.');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Submit event error:', error);
      if (error.code === '42P01') {
        triggerErrorToast('La table "events" n\'existe pas. Veuillez exécuter le script SQL fourni.');
      } else {
        triggerErrorToast('Erreur lors de la sauvegarde.');
      }
    }
  };

  const handleDelete = async () => {
    if (!editingEvent || !window.confirm('Supprimer cet évènement ?')) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', editingEvent.id);
      if (error) throw error;
      triggerSuccessToast(useStore.getState().user?.email, 'Évènement supprimé.');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Delete event error:', err);
    }
  };

  // Calendar Grid generation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const renderCells = () => {
    return days.map((day, i) => {
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isToday = isSameDay(day, new Date());
      const dayStr = format(day, 'yyyy-MM-dd');

      // Get events for this day
      const dayEvents = events.filter(e => e.event_date === dayStr);

      // Get observation deadlines
      const obsDeadlines = observations.filter(o => 
        !o.completion_date && 
        o.deadline_date === dayStr
      );

      // Get observation completions
      const obsCompletions = observations.filter(o => 
        o.completion_date === dayStr
      );

      return (
        <div 
          key={i}
          onClick={() => handleDayClick(day)}
          className={`min-h-[120px] p-2 border-r border-b border-slate-200 transition-colors cursor-pointer flex flex-col group
            ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : 'bg-white text-slate-700'}
            ${isToday ? 'bg-primary/5' : 'hover:bg-slate-50'}
          `}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
              ${isToday ? 'bg-primary text-white' : ''}
            `}>
              {format(day, dateFormat)}
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <PlusCircle size={14} className="text-slate-400 hover:text-primary" />
            </div>
          </div>

          <div className="mt-2 space-y-1.5 flex-1 overflow-y-auto max-h-[100px] scrollbar-thin">
            {/* Render custom events */}
            {dayEvents.map(evt => (
              <div 
                key={evt.id} 
                onClick={(e) => handleEventClick(e, evt)}
                className="text-xs px-2 py-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium truncate hover:bg-indigo-100 transition"
              >
                {evt.event_time && <span className="mr-1 opacity-70">{evt.event_time.substring(0,5)}</span>}
                {evt.title}
              </div>
            ))}

            {/* Render Observation Deadlines */}
            {obsDeadlines.map(obs => (
              <div 
                key={`dl-${obs.id}`} 
                className="text-xs px-2 py-1 rounded bg-amber-50 border border-amber-100 text-amber-700 font-medium truncate flex items-center gap-1"
                title={obs.description}
              >
                <AlertTriangle size={10} className="shrink-0" />
                <span className="truncate">{obs.operations?.name}: {obs.description}</span>
              </div>
            ))}

            {/* Render Observation Completions */}
            {obsCompletions.map(obs => (
              <div 
                key={`cp-${obs.id}`} 
                className="text-xs px-2 py-1 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 font-medium truncate flex items-center gap-1"
                title={obs.description}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="truncate">Réalisé: {obs.operations?.name}</span>
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  const renderDaysOfWeek = () => {
    const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    return (
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 rounded-t-xl overflow-hidden">
        {daysOfWeek.map((d, i) => (
          <div key={i} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 last:border-r-0">
            {d}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="pb-12 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Calendrier</h1>
          <p className="text-slate-500 mt-1">Planifiez vos évènements et suivez vos échéances.</p>
        </div>
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition">
            <ChevronLeft size={20} />
          </button>
          <span className="w-32 text-center text-lg font-bold text-slate-800 capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: fr })}
          </span>
          <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        {renderDaysOfWeek()}
        <div className="grid grid-cols-7 border-l border-slate-200">
          {renderCells()}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {editingEvent ? 'Modifier l\'évènement' : 'Nouvel Évènement'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 scrollbar-thin">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-500 bg-slate-50 p-3 rounded-lg">
                <CalendarIcon size={16} />
                {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Titre *</label>
                <input 
                  required 
                  value={form.title} 
                  onChange={(e) => setForm({...form, title: e.target.value})} 
                  placeholder="Réunion de chantier, Visite..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Heure</label>
                  <input 
                    type="time"
                    value={form.event_time || ''} 
                    onChange={(e) => setForm({...form, event_time: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Opération liée</label>
                  <select 
                    value={form.operation_id || ''} 
                    onChange={(e) => setForm({...form, operation_id: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Aucune</option>
                    {operations.map(op => (
                      <option key={op.id} value={op.id}>{op.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase mb-1">
                  <MapPin size={12}/> Adresse
                </label>
                <input 
                  value={form.address || ''} 
                  onChange={(e) => setForm({...form, address: e.target.value})} 
                  placeholder="Ex: 12 rue de la Paix..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase mb-1">
                  <Video size={12}/> Lien Visio (Teams, Meet, Zoom...)
                </label>
                <input 
                  type="url"
                  value={form.visio_link || ''} 
                  onChange={(e) => setForm({...form, visio_link: e.target.value})} 
                  placeholder="https://..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase mb-1">
                  <AlignLeft size={12}/> Description
                </label>
                <textarea 
                  value={form.description || ''} 
                  onChange={(e) => setForm({...form, description: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary h-20"
                />
              </div>

              <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
                {editingEvent ? (
                  <button type="button" onClick={handleDelete} className="px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition">Supprimer</button>
                ) : <div></div>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition">Annuler</button>
                  <button type="submit" className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-primary/90 transition">
                    {editingEvent ? 'Enregistrer' : 'Créer'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
