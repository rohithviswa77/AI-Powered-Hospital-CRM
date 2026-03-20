import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, doc, deleteDoc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import AddAppointment from './AddAppointment';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { toast } from 'react-toastify';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [activeTab, setActiveTab] = useState('Upcoming'); 
  const [viewMode, setViewMode] = useState('Calendar'); 
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month');

  // Day Detail Drawer State
  const [selectedDayInfo, setSelectedDayInfo] = useState(null); // { date, appointments: [] }

  const [selectedLocation, setSelectedLocation] = useState('All location');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingAppointmentId, setDeletingAppointmentId] = useState(null);
  const locations = ["All location", "Koyilandy", "Payyannur", "Chengannur"];

  useEffect(() => {
    const q = query(collection(db, "appointments"), orderBy("appointmentTime", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const processedAndFiltered = useMemo(() => {
    const now = new Date();
    const todayStr = moment().format('YYYY-MM-DD');
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

    return appointments
      .filter(app => {
        if (selectedLocation === 'All location') return true;
        return app.doctorName?.includes(selectedLocation);
      })
      .map(app => {
        const isPastDate = app.appointmentDate < todayStr;
        const isToday = app.appointmentDate === todayStr;
        const isPastTime = isToday && app.appointmentTime < currentTime;
        const isPast = isPastDate || isPastTime;

        if (app.status === 'Scheduled' && isPast) {
          return { ...app, autoMissed: true, displayStatus: 'MISSED' };
        }
        return { ...app, displayStatus: app.status };
      })
      .filter(app => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
          app.patientName?.toLowerCase().includes(search) ||
          app.doctorName?.toLowerCase().includes(search) ||
          app.treatmentType?.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        const dateCompare = a.appointmentDate.localeCompare(b.appointmentDate);
        if (dateCompare !== 0) return dateCompare;
        return a.appointmentTime.localeCompare(b.appointmentTime);
      });
  }, [appointments, selectedLocation, searchTerm]);

  const upcomingAppointments = processedAndFiltered.filter(app => {
    const isCompleted = ['attended', 'missed', 'completed'].includes(app.status?.toLowerCase());
    return !app.autoMissed && !isCompleted;
  });

  const historyAppointments = processedAndFiltered.filter(app => {
    const isCompleted = ['attended', 'missed', 'completed'].includes(app.status?.toLowerCase());
    return app.autoMissed || isCompleted;
  });

  const displayedListAppointments = activeTab === 'Upcoming' ? upcomingAppointments : historyAppointments;

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = moment().format('YYYY-MM-DD');
    const todayAppts = appointments.filter(a => a.appointmentDate === todayStr);
    const missedAppts = processedAndFiltered.filter(a => a.status?.toLowerCase() === 'missed' || a.autoMissed);
    
    return {
      total: appointments.length,
      today: todayAppts.length,
      missed: missedAppts.length,
      missedPercent: appointments.length > 0 ? Math.round((missedAppts.length / appointments.length) * 100) : 0
    };
  }, [appointments, processedAndFiltered]);

  const calendarEvents = processedAndFiltered.map(app => ({
    id: app.id,
    title: app.patientName,
    start: new Date(`${app.appointmentDate}T${app.appointmentTime}`),
    end: new Date(new Date(`${app.appointmentDate}T${app.appointmentTime}`).getTime() + 30 * 60000), 
    resource: app
  }));

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "appointments", id), { status: newStatus });
      toast.info(`Marked as ${newStatus}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "appointments", id));
      toast.success("Deleted");
      setDeletingAppointmentId(null);
      if (selectedDayInfo) {
        setSelectedDayInfo({ ...selectedDayInfo, appointments: selectedDayInfo.appointments.filter(a => a.id !== id) });
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const onSelectSlot = (slotInfo) => {
    const dateStr = moment(slotInfo.start).format('YYYY-MM-DD');
    const dayAppts = processedAndFiltered
      .filter(a => a.appointmentDate === dateStr)
      .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));
    setSelectedDayInfo({ date: dateStr, appointments: dayAppts });
  };

  const CustomEvent = ({ event }) => {
    const status = event.resource.status?.toLowerCase();
    const isMissed = status === 'missed' || event.resource.autoMissed;
    const isAttended = status === 'attended' || status === 'completed';
    
    let colorClass = 'bg-primary-500';
    if (isMissed) colorClass = 'bg-rose-500';
    if (isAttended) colorClass = 'bg-neutral-300';

    return (
      <div className="flex items-center gap-1 group/ev px-1">
        <div className={`w-2 h-2 rounded-full ${colorClass} shadow-sm group-hover/ev:scale-125 transition-transform`}></div>
        <span className="text-[9px] font-black text-neutral-800 tracking-tighter truncate uppercase hidden md:block opacity-60 group-hover/ev:opacity-100 italic">
          {event.title}
        </span>
      </div>
    );
  };

  return (
    <div className="animate-fade-in w-full max-w-full overflow-hidden">
      <style>{`
        .rbc-calendar { font-family: inherit; }
        .rbc-month-view { border: none !important; background: transparent !important; }
        .rbc-day-bg { border-left: 1px solid #f5f5f5 !important; transition: all 0.2s !important; cursor: pointer; }
        .rbc-day-bg:hover { background: rgba(59, 130, 246, 0.03) !important; }
        .rbc-header { padding: 15px !important; border-bottom: 2px solid #f0f0f0 !important; font-size: 10px !important; font-weight: 900 !important; text-transform: uppercase !important; color: #a3a3a3 !important; }
        .rbc-event { background: transparent !important; padding: 1px 0 !important; }
        .rbc-month-row { border-top: 1px solid #f5f5f5 !important; }
        .rbc-date-cell { padding: 10px !important; font-weight: 900 !important; color: #262626 !important; font-size: 14px !important; }
        .rbc-off-range-bg { background: transparent !important; opacity: 0.3 !important; }
        .rbc-today { background: #fafafa !important; border-top: 2px solid #3b82f6 !important; }
        .rbc-toolbar button { font-size: 10px !important; font-weight: 900 !important; text-transform: uppercase !important; border-radius: 12px !important; border: 1px solid #e5e5e5 !important; padding: 8px 16px !important; transition: all 0.2s !important; }
        .rbc-toolbar button:hover { background: #f5f5f5 !important; }
        .rbc-toolbar button.rbc-active { background: #171717 !important; border-color: #171717 !important; color: white !important; }
        .rbc-show-more { font-size: 9px !important; font-weight: 900 !important; color: #3b82f6 !important; background: #eff6ff !important; padding: 2px 6px !important; border-radius: 4px !important; margin-top: 2px !important; }
      `}</style>

      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-neutral-900 rounded-[22px] text-white shadow-2xl">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <h1 className="text-3xl font-black text-neutral-900 tracking-tighter uppercase leading-none">Intelligence</h1>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
               <span className="w-1 h-1 rounded-full bg-primary-500"></span> Clinical Flow Monitoring
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200 shadow-inner">
            {['Calendar', 'List'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-white text-neutral-900 shadow-md border border-neutral-100' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="relative">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="pl-4 pr-10 h-12 min-w-[180px] bg-white border-neutral-200 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-sm appearance-none"
            >
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc === 'All location' ? 'Global' : `Dr. ${loc}`}</option>
              ))}
            </select>
            <svg className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>
          <div className="relative group">
            <input
              type="text"
              placeholder="Search Schedule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 h-12 min-w-[200px] bg-white border-neutral-200 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-sm focus:ring-2 focus:ring-primary-500/10 transition-all"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>

          <button className="btn-primary h-12 px-8 rounded-2xl shadow-xl shadow-primary-500/10 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest" onClick={() => setShowAddForm(true)}>
            + Book Slot
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Clinical Volume" value={stats.total} type="total" icon="chart" />
        <StatsCard title="Today's Load" value={stats.today} type="success" icon="clock" />
        <StatsCard title="Schedule Health" value={`${100 - stats.missedPercent}%`} type="info" icon="trend" />
        <div className="bg-white/60 backdrop-blur-md p-6 rounded-[32px] border border-neutral-100 flex items-center justify-between shadow-sm">
           <div className="flex bg-neutral-100/80 p-1 rounded-xl">
             <button onClick={() => setActiveTab('Upcoming')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${activeTab === 'Upcoming' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-400'}`}>Upcoming</button>
             <button onClick={() => setActiveTab('History')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${activeTab === 'History' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-400'}`}>History</button>
           </div>
           <div className="text-right">
             <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">{activeTab}</p>
             <p className="text-xl font-black text-neutral-900 tabular-nums">{displayedListAppointments.length}</p>
           </div>
        </div>
      </section>

      {(showAddForm || editingAppointment) && (
        <AddAppointment
          appointmentData={editingAppointment}
          onClose={() => { setShowAddForm(false); setEditingAppointment(null); }}
        />
      )}

      <div className="relative">
        <div className={`card-no-padding bg-white/40 backdrop-blur-xl min-h-[700px] overflow-hidden rounded-[40px] border border-neutral-100 transition-all ${selectedDayInfo ? 'pr-[350px] md:pr-[400px]' : ''}`}>
            {loading ? (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-500 rounded-full animate-spin"></div>
                <p className="text-[12px] font-black text-neutral-400 uppercase tracking-[0.2em]">Synchronizing Intelligence...</p>
            </div>
            ) : viewMode === 'Calendar' ? (
            <div className="h-[750px] p-8">
                <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                date={calendarDate}
                view={calendarView}
                onNavigate={(date) => setCalendarDate(date)}
                onView={(view) => setCalendarView(view)}
                selectable
                onSelectSlot={onSelectSlot}
                onSelectEvent={(event) => onSelectSlot({ start: event.start })}
                views={['month', 'week', 'day']}
                components={{ event: CustomEvent }}
                />
            </div>
            ) : (
            <div className="overflow-x-auto w-full p-6">
                <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                    <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none">Actions</th>
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none">Schedule</th>
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none">Patient</th>
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none">Doctor</th>
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none text-right">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {displayedListAppointments.map((app) => (
                    <tr key={app.id} className="bg-white/80 hover:bg-white shadow-sm rounded-2xl transition-all group border border-neutral-100">
                        <td className="px-6 py-4 rounded-l-2xl">
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleUpdateStatus(app.id, 'Attended')} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-500 hover:text-white rounded-xl transition-all" title="Mark Attended"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                            <button onClick={() => handleUpdateStatus(app.id, 'Missed')} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-xl transition-all" title="Mark Missed"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                            <button onClick={() => setEditingAppointment(app)} className="p-2 text-primary-600 bg-primary-50 hover:bg-primary-500 hover:text-white rounded-xl transition-all" title="Edit"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                            <button onClick={() => setDeletingAppointmentId(app.id)} className="p-2 text-neutral-400 hover:text-rose-600 rounded-xl transition-all opacity-0 group-hover:opacity-100" title="Cancel/Delete"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                        </div>
                        </td>
                        <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-neutral-900 leading-none mb-1">{app.appointmentTime}</span>
                            <span className="text-[10px] text-neutral-400 font-bold uppercase">{moment(app.appointmentDate).format('MMM DD')}</span>
                        </div>
                        </td>
                        <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-primary-500 text-white flex items-center justify-center font-black text-[9px] uppercase shadow-lg shadow-primary-500/20">{app.patientName?.split(' ').map(n => n[0]).join('')}</div>
                            <span className="text-sm font-black text-neutral-800 uppercase tracking-tighter">{app.patientName}</span>
                        </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-neutral-600 text-[13px]">Dr. {app.doctorName}</td>
                        <td className="px-6 py-4 rounded-r-2xl text-right">
                        <span className={`inline-flex px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all
                            ${app.status?.toLowerCase() === 'scheduled' ? 'bg-primary-50 text-primary-700 border-primary-200' : ''}
                            ${['completed', 'attended'].includes(app.status?.toLowerCase()) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                            ${(app.status?.toLowerCase() === 'missed' || app.autoMissed) ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                        `}>{app.displayStatus}</span>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            )}
        </div>

        {/* Day Intelligence Drawer */}
        {selectedDayInfo && (
          <div className="absolute top-0 right-0 h-full w-[350px] md:w-[400px] bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.05)] border-l border-neutral-100 p-8 flex flex-col animate-slide-left z-20">
             <div className="flex justify-between items-start mb-8 flex-shrink-0">
                <div>
                   <h2 className="text-2xl font-black text-neutral-900 tracking-tighter uppercase leading-none">Day Detail</h2>
                   <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mt-2">{moment(selectedDayInfo.date).format('MMMM DD, YYYY')}</p>
                </div>
                <button onClick={() => setSelectedDayInfo(null)} className="p-2 text-neutral-400 hover:text-red-500 transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>

             <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{selectedDayInfo.appointments.length} Records</span>
                    <button onClick={() => { setEditingAppointment({ appointmentDate: selectedDayInfo.date }); }} className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline">+ Quick Book</button>
                </div>
                
                {selectedDayInfo.appointments.length > 0 ? (
                  selectedDayInfo.appointments.map(app => (
                    <div key={app.id} className="p-5 rounded-2xl bg-neutral-50/50 border border-neutral-100 hover:bg-white hover:shadow-xl transition-all duration-300 group">
                       <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                             <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-neutral-100 flex items-center justify-center font-black text-xs text-neutral-800 uppercase">{app.patientName?.split(' ').map(n => n[0]).join('')}</div>
                             <div>
                                <h4 className="text-[13px] font-black text-neutral-800 uppercase tracking-tighter leading-none mb-1">{app.patientName}</h4>
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Dr. {app.doctorName}</p>
                             </div>
                          </div>
                          <span className="text-sm font-black text-neutral-900 tabular-nums">{app.appointmentTime}</span>
                       </div>
                       
                       <div className="flex items-center justify-between mt-6">
                           <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all
                                ${app.status?.toLowerCase() === 'scheduled' ? 'bg-primary-50 text-primary-700 border-primary-200' : ''}
                                ${['completed', 'attended'].includes(app.status?.toLowerCase()) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                                ${(app.status?.toLowerCase() === 'missed' || app.autoMissed) ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                            `}>{app.displayStatus}</span>
                           
                           <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => handleUpdateStatus(app.id, 'Attended')} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-500 hover:text-white rounded-xl transition-all" title="Mark Attended"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                               <button onClick={() => handleUpdateStatus(app.id, 'Missed')} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-xl transition-all" title="Mark Missed"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                               <button onClick={() => setEditingAppointment(app)} className="p-2 text-primary-600 bg-primary-50 hover:bg-primary-500 hover:text-white rounded-xl transition-all" title="Edit"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                               <button onClick={() => handleDelete(app.id)} className="p-2 text-neutral-400 hover:text-rose-600" title="Cancel/Delete"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                           </div>
                       </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center opacity-30">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">No activity for this day</p>
                  </div>
                )}
             </div>

             <div className="pt-6 border-t border-neutral-100 shrink-0">
                <button onClick={() => setEditingAppointment({ appointmentDate: selectedDayInfo.date })} className="btn-primary w-full py-4 rounded-2xl shadow-xl shadow-primary-500/10 text-[10px] font-black uppercase tracking-widest">Confirm New Slot</button>
             </div>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={!!deletingAppointmentId}
        title="Cancel Clinical Slot"
        message="Are you sure you want to permanently cancel this appointment?"
        onConfirm={() => handleDelete(deletingAppointmentId)}
        onCancel={() => setDeletingAppointmentId(null)}
      />
    </div>
  );
};

function StatsCard({ title, value, type, icon }) {
  const getColors = () => {
    switch(type) {
      case 'success': return 'border-l-emerald-500 text-emerald-600';
      case 'info': return 'border-l-blue-500 text-blue-600';
      default: return 'border-l-primary-500 text-primary-600';
    }
  };

  const getIcon = () => {
    switch(icon) {
      case 'chart': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
      case 'clock': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'trend': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
      default: return null;
    }
  };

  return (
    <div className={`p-6 rounded-[32px] bg-white/60 backdrop-blur-md border border-neutral-100/50 hover:shadow-xl hover:bg-white transition-all duration-500 group border-l-4 ${getColors()} flex flex-col justify-between shadow-sm`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-[9px] font-black text-neutral-400 uppercase tracking-widest group-hover:text-neutral-500 transition-colors">{title}</h3>
        <div className="text-neutral-300">{getIcon()}</div>
      </div>
      <p className="text-2xl font-black text-neutral-900 tracking-tighter">{value}</p>
    </div>
  );
}

export default Appointments;
