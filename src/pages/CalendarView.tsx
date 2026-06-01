import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { triggerSuccessToast, triggerErrorToast } from '../lib/toastUtils';
import { 
  format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, addYears, subYears,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear,
  isSameMonth, isSameDay, eachDayOfInterval, eachMonthOfInterval,
  parseISO
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, PlusCircle, X, MapPin, Video, 
  AlignLeft, AlertTriangle, Calendar as CalendarIcon, Clock
} from 'lucide-react';

type ViewMode = 'day' | 'week' | 'month' | 'year';

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
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  
  const [events, setEvents] = useState<EventItem[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [operations, setOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
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

  // Observation Edit Modal
  const [editingObs, setEditingObs] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ops } = await supabase.from('operations').select('id, name');
      if (ops) setOperations(ops);

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

      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*');
      
      if (eventsError) {
        if (eventsError.code === '42P01') {
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

  const handlePrevious = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else if (viewMode === 'day') setCurrentDate(subDays(currentDate, 1));
    else if (viewMode === 'year') setCurrentDate(subYears(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (viewMode === 'year') setCurrentDate(addYears(currentDate, 1));
  };

  const handleToday = () => setCurrentDate(new Date());

  const getHeaderLabel = () => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy', { locale: fr });
    if (viewMode === 'year') return format(currentDate, 'yyyy', { locale: fr });
    if (viewMode === 'day') return format(currentDate, 'EEEE d MMMM yyyy', { locale: fr });
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      if (isSameMonth(start, end)) return `${format(start, 'd')} - ${format(end, 'd MMMM yyyy', { locale: fr })}`;
      return `${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy', { locale: fr })}`;
    }
  };

  // Clicks
  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setEditingEvent(null);
    setForm({
      title: '', event_time: '', address: '', description: '', visio_link: '', operation_id: ''
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

  const handleObservationClick = (e: React.MouseEvent, obs: any) => {
    e.stopPropagation();
    setEditingObs(obs);
  };

  // Submits
  const handleEventSubmit = async (e: React.FormEvent) => {
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
      if (error.code === '42P01') {
        triggerErrorToast('La table "events" n\'existe pas. Veuillez exécuter le script SQL.');
      } else {
        triggerErrorToast('Erreur lors de la sauvegarde.');
      }
    }
  };

  const handleDeleteEvent = async () => {
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

  const handleEditObsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingObs) return;
    try {
      let finalDescription = editingObs.description;
      if (editingObs._custom_status && editingObs._custom_status !== 'En cours') {
          finalDescription = `${editingObs.description}\n\n[STATUT: ${editingObs._custom_status}]`;
      }
      const isCompletedStatus = editingObs._custom_status === 'Réussi' || editingObs._custom_status === 'Échec';
      const payload = {
        description: finalDescription,
        responsible_person: editingObs.responsible_person,
        deadline_date: editingObs.deadline_date,
        completion_date: isCompletedStatus 
            ? (editingObs.completion_date || new Date().toISOString().split('T')[0])
            : (editingObs.completion_date || null)
      };
      const { error } = await supabase.from('observations').update(payload).eq('id', editingObs.id);
      if (error) throw error;
      triggerSuccessToast(useStore.getState().user?.email, 'Observation modifiée avec succès.');
      setEditingObs(null);
      fetchData();
    } catch (err) {
      console.error('Error updating observation:', err);
      triggerErrorToast('Erreur lors de la modification.');
    }
  };

  // Rendering Helpers
  const renderEventsList = (dayStr: string, isSmall: boolean = false) => {
    const dayEvents = events.filter(e => e.event_date === dayStr);
    const obsDeadlines = observations.filter(o => !o.completion_date && o.deadline_date === dayStr);
    const obsCompletions = observations.filter(o => o.completion_date === dayStr);

    if (dayEvents.length === 0 && obsDeadlines.length === 0 && obsCompletions.length === 0) return null;

    return (
      <div className={`space-y-1.5 flex-1 overflow-y-auto scrollbar-thin ${isSmall ? 'mt-1' : 'mt-2'}`}>
        {dayEvents.map(evt => (
          <div 
            key={evt.id} 
            onClick={(e) => handleEventClick(e, evt)}
            className={`px-2 py-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium truncate hover:bg-indigo-100 transition cursor-pointer ${isSmall ? 'text-[9px]' : 'text-xs'}`}
          >
            {!isSmall && evt.event_time && <span className="mr-1 opacity-70">{evt.event_time.substring(0,5)}</span>}
            {evt.title}
          </div>
        ))}
        {obsDeadlines.map(obs => (
          <div 
            key={`dl-${obs.id}`} 
            onClick={(e) => handleObservationClick(e, obs)}
            className={`px-2 py-1 rounded bg-amber-50 border border-amber-100 text-amber-700 font-medium truncate flex items-center gap-1 hover:bg-amber-100 transition cursor-pointer ${isSmall ? 'text-[9px]' : 'text-xs'}`}
            title={obs.description}
          >
            <AlertTriangle size={isSmall ? 8 : 10} className="shrink-0" />
            <span className="truncate">{obs.operations?.name}</span>
          </div>
        ))}
        {obsCompletions.map(obs => (
          <div 
            key={`cp-${obs.id}`} 
            onClick={(e) => handleObservationClick(e, obs)}
            className={`px-2 py-1 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 font-medium truncate flex items-center gap-1 hover:bg-emerald-100 transition cursor-pointer ${isSmall ? 'text-[9px]' : 'text-xs'}`}
            title={obs.description}
          >
            <span className={`rounded-full bg-emerald-500 shrink-0 ${isSmall ? 'w-1 h-1' : 'w-1.5 h-1.5'}`}></span>
            <span className="truncate">Réalisé</span>
          </div>
        ))}
      </div>
    );
  };

  const renderMonthGrid = (startDate: Date, endDate: Date, monthStart: Date, small: boolean = false) => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return (
      <div className={`grid grid-cols-7 ${small ? '' : 'border-l border-slate-200 flex-1'}`}>
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());
          const dayStr = format(day, 'yyyy-MM-dd');

          return (
            <div 
              key={i}
              onClick={() => handleDayClick(day)}
              className={`p-2 border-r border-b border-slate-200 transition-colors cursor-pointer flex flex-col group
                ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : 'bg-white text-slate-700'}
                ${isToday ? 'bg-primary/5' : 'hover:bg-slate-50'}
                ${small ? 'min-h-[60px]' : 'min-h-[120px]'}
              `}
            >
              <div className="flex justify-between items-start">
                <span className={`font-semibold flex items-center justify-center rounded-full
                  ${isToday ? 'bg-primary text-white' : ''}
                  ${small ? 'text-xs w-5 h-5' : 'text-sm w-7 h-7'}
                `}>
                  {format(day, "d")}
                </span>
                {!small && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlusCircle size={14} className="text-slate-400 hover:text-primary" />
                  </div>
                )}
              </div>
              {renderEventsList(dayStr, small)}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 rounded-t-xl overflow-hidden">
          {daysOfWeek.map((d, i) => (
            <div key={i} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 last:border-r-0">
              {d}
            </div>
          ))}
        </div>
        {renderMonthGrid(startDate, endDate, monthStart)}
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-[600px]">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 rounded-t-xl overflow-hidden">
          {days.map((day, i) => (
            <div key={i} className="py-3 text-center border-r border-slate-200 last:border-r-0">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{format(day, 'EEE', { locale: fr })}</div>
              <div className={`text-lg font-black mt-1 ${isSameDay(day, new Date()) ? 'text-primary' : 'text-slate-800'}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-slate-200 flex-1">
          {days.map((day, i) => (
            <div 
              key={i}
              onClick={() => handleDayClick(day)}
              className="p-2 border-r border-slate-200 cursor-pointer hover:bg-slate-50 transition flex flex-col"
            >
              {renderEventsList(format(day, 'yyyy-MM-dd'))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayStr = format(currentDate, 'yyyy-MM-dd');
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm min-h-[600px] p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6">{format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })}</h2>
        <div 
          onClick={() => handleDayClick(currentDate)}
          className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex-1 min-h-[400px] cursor-pointer hover:bg-slate-50 transition"
        >
          {renderEventsList(dayStr)}
          <div className="text-center mt-12 text-slate-400 font-medium">
            <PlusCircle size={24} className="mx-auto mb-2 opacity-50" />
            Cliquez pour ajouter un évènement à cette journée
          </div>
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
    const daysOfWeek = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {months.map((month, idx) => {
          const mStart = startOfMonth(month);
          const mEnd = endOfMonth(mStart);
          const sDate = startOfWeek(mStart, { weekStartsOn: 1 });
          const eDate = endOfWeek(mEnd, { weekStartsOn: 1 });

          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-slate-50 p-3 text-center border-b border-slate-200">
                <h3 className="font-bold text-slate-800 capitalize cursor-pointer hover:text-primary transition" onClick={() => { setCurrentDate(mStart); setViewMode('month'); }}>
                  {format(month, 'MMMM', { locale: fr })}
                </h3>
              </div>
              <div className="grid grid-cols-7 border-b border-slate-100 bg-white">
                {daysOfWeek.map((d, i) => (
                  <div key={i} className="py-1 text-center text-[9px] font-bold text-slate-400 uppercase">{d}</div>
                ))}
              </div>
              {renderMonthGrid(sDate, eDate, mStart, true)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="pb-12 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Calendrier</h1>
          <p className="text-slate-500 mt-1">Planifiez vos évènements et suivez vos échéances.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-1 flex">
            {['day', 'week', 'month', 'year'].map((mode) => (
              <button 
                key={mode}
                onClick={() => setViewMode(mode as ViewMode)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition capitalize ${viewMode === mode ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {mode === 'day' ? 'Jour' : mode === 'week' ? 'Semaine' : mode === 'month' ? 'Mois' : 'Année'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-200">
            <button onClick={handlePrevious} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition">
              <ChevronLeft size={20} />
            </button>
            <button onClick={handleToday} className="px-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition">
              Aujourd'hui
            </button>
            <button onClick={handleNext} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition">
              <ChevronRight size={20} />
            </button>
          </div>
          
          <div className="w-48 text-right text-lg font-bold text-slate-800 capitalize bg-white px-4 py-1.5 rounded-xl border border-slate-200 shadow-sm whitespace-nowrap overflow-hidden text-ellipsis">
            {getHeaderLabel()}
          </div>
        </div>
      </div>

      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'year' && renderYearView()}

      {/* Modal - New/Edit Event */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {editingEvent ? 'Modifier l\'évènement' : 'Nouvel Évènement'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleEventSubmit} className="p-5 overflow-y-auto space-y-4 scrollbar-thin">
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
                  <button type="button" onClick={handleDeleteEvent} className="px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition">Supprimer</button>
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

      {/* Modal - Edit Observation */}
      {editingObs && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Modifier l'observation</h2>
                <span className="text-xs text-slate-500">{editingObs.operations?.name}</span>
              </div>
              <button onClick={() => setEditingObs(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleEditObsSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description *</label>
                <textarea 
                  required 
                  value={editingObs.description} 
                  onChange={(e) => setEditingObs({...editingObs, description: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary h-24"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Réalisateur *</label>
                  <input required value={editingObs.responsible_person} onChange={(e) => setEditingObs({...editingObs, responsible_person: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Date Butoire *</label>
                  <input type="date" required value={editingObs.deadline_date} onChange={(e) => setEditingObs({...editingObs, deadline_date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Statut</label>
                  <select 
                    value={editingObs._custom_status || 'En cours'} 
                    onChange={(e) => setEditingObs({...editingObs, _custom_status: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="En cours">En cours</option>
                    <option value="Réussi">Réussi</option>
                    <option value="Échec">Échec</option>
                    <option value="Bloqué">Bloqué</option>
                  </select>
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
