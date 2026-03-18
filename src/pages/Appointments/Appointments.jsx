import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, doc, deleteDoc, updateDoc, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import AddAppointment from './AddAppointment';
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
  const [activeTab, setActiveTab] = useState('Upcoming'); // 'Upcoming' or 'History'
  const [viewMode, setViewMode] = useState('Calendar'); // 'List' or 'Calendar'
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month');

  // Filter States
  const [selectedLocation, setSelectedLocation] = useState('All location');
  const locations = ["All location", "Koyilandy", "Payyannur", "Chengannur"];

  useEffect(() => {
    const q = query(collection(db, "appointments"), orderBy("appointmentDate", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Consolidated Data Processing ---
  const processedAndFiltered = React.useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"

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
          return { ...app, autoMissed: true, displayStatus: 'MISSED (Auto)' };
        }
        return { ...app, displayStatus: app.status };
      });
  }, [appointments, selectedLocation]);

  const upcomingAppointments = processedAndFiltered.filter(app => {
    const isCompleted = ['attended', 'missed', 'completed'].includes(app.status?.toLowerCase());
    return !app.autoMissed && !isCompleted;
  });

  const historyAppointments = processedAndFiltered.filter(app => {
    const isCompleted = ['attended', 'missed', 'completed'].includes(app.status?.toLowerCase());
    return app.autoMissed || isCompleted;
  });

  const displayedListAppointments = activeTab === 'Upcoming' ? upcomingAppointments : historyAppointments;

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this appointment?")) {
      try {
        await deleteDoc(doc(db, "appointments", id));
        toast.success("Appointment deleted successfully.");
      } catch (error) {
        toast.error("Error deleting appointment: " + error.message);
      }
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "appointments", id), { status: newStatus });
      toast.info(`Appointment marked as ${newStatus}.`);
    } catch (error) {
      toast.error("Error updating status: " + error.message);
    }
  };

  // Calendar events now use the processed list so autoMissed works for color coding
  const calendarEvents = processedAndFiltered.map(app => ({
    id: app.id,
    title: `${app.patientName} - Dr. ${app.doctorName}`,
    start: new Date(`${app.appointmentDate}T${app.appointmentTime}`),
    end: new Date(new Date(`${app.appointmentDate}T${app.appointmentTime}`).getTime() + 30 * 60000), // 30 min duration
    resource: app
  }));

  const handleEventDrop = async ({ event, start, end }) => {
    const now = new Date();
    if (start < now) {
      toast.error("You cannot reschedule an appointment to a past date or time.");
      return;
    }

    const newDate = start.toISOString().split('T')[0];
    const newTime = start.toTimeString().split(' ')[0].substring(0, 5);

    try {
      await updateDoc(doc(db, "appointments", event.id), {
        appointmentDate: newDate,
        appointmentTime: newTime
      });
      toast.success("Appointment rescheduled successfully!");
    } catch (error) {
      toast.error("Reschedule failed: " + error.message);
    }
  };

  return (
    <div className="animate-fade-in w-full max-w-full overflow-hidden">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="page-title mb-1">Clinical Scheduling</h1>
          <p className="text-sm font-medium text-neutral-500">Manage and monitor patient appointments</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full sm:max-w-[180px]"
          >
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc === 'All location' ? 'Global Schedule' : `Dr. ${loc} Schedule`}</option>
            ))}
          </select>
          <button className="btn-primary whitespace-nowrap" onClick={() => setShowAddForm(true)}>
            + Book Appointment
          </button>
        </div>
      </header>

      {(showAddForm || editingAppointment) && (
        <AddAppointment
          appointmentData={editingAppointment}
          onClose={() => { setShowAddForm(false); setEditingAppointment(null); }}
        />
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200/60 shadow-inner">
            <button
              onClick={() => setActiveTab('Upcoming')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'Upcoming' ? 'bg-white text-primary-700 shadow-sm border border-neutral-200/50' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActiveTab('History')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'History' ? 'bg-white text-primary-700 shadow-sm border border-neutral-200/50' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              History
            </button>
          </div>

          <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200/60 shadow-inner">
            <button
              onClick={() => setViewMode('Calendar')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'Calendar' ? 'bg-neutral-800 text-white shadow-md' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('List')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'List' ? 'bg-neutral-800 text-white shadow-md' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              List View
            </button>
          </div>
        </div>

        <div className="card px-4 py-2 bg-white/50 flex items-center gap-3 border-neutral-200">
          <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-500 flex items-center justify-center shrink-0 border border-primary-100">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{activeTab} Slots</span>
            <span className="text-lg font-black text-neutral-800 tracking-tight leading-none">{displayedListAppointments.length} Total</span>
          </div>
        </div>
      </div>

      <div className="card border-neutral-200 min-h-[600px]">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-6 h-6 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-neutral-500">Synchronizing Schedules...</p>
          </div>
        ) : viewMode === 'Calendar' ? (
          <div className="h-[700px] p-4 bg-white/40 calendar-custom-container">
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
              onSelectEvent={(event) => {
                const isCompleted = ['attended', 'missed', 'completed'].includes(event.resource.status?.toLowerCase());
                if (event.resource.autoMissed || isCompleted) return;
                setActiveTab('Upcoming');
                setEditingAppointment(event.resource);
              }}
              onSelectSlot={(slotInfo) => {
                const now = new Date();
                if (slotInfo.start < now) {
                  toast.warning("Cannot book appointments in the past.");
                  return;
                }
                const dateStr = slotInfo.start.toISOString().split('T')[0];
                const timeStr = slotInfo.start.toTimeString().split(' ')[0].substring(0, 5);
                setEditingAppointment({ appointmentDate: dateStr, appointmentTime: timeStr });
              }}
              onEventDrop={handleEventDrop}
              draggableAccessor={() => true}
              selectable
              views={['month', 'week', 'day']}
              eventPropGetter={(event) => {
                const status = event.resource.status?.toLowerCase();
                let className = '!bg-primary-500 !border-primary-600 !rounded-lg !text-[10px] !font-bold !text-white !p-1.5 !shadow-sm';
                if (status === 'missed' || event.resource.autoMissed) className = '!bg-red-500 !border-red-600 !rounded-lg !text-[10px] !font-bold !text-white !p-1.5 !shadow-sm';
                if (status === 'attended' || status === 'completed') className = '!bg-neutral-800 !border-neutral-900 !rounded-lg !text-[10px] !font-bold !text-white !p-1.5 !shadow-sm opacity-60';
                return { className };
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-left whitespace-nowrap lg:whitespace-normal min-w-max">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Schedule</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Patient</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Practitioner</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Service</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white/40">
                {displayedListAppointments.map((app) => (
                  <tr key={app.id} className="hover:bg-neutral-50 transition-colors duration-200">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {activeTab === 'Upcoming' && (
                          <>
                            <button
                              className="p-1 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(app.id, 'Attended'); }}
                              title="Check-in"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button
                              className="p-1 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded transition-colors"
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(app.id, 'Missed'); }}
                              title="No Show"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </>
                        )}
                        <button
                          className="p-1 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded transition-colors"
                          onClick={(e) => { e.stopPropagation(); setEditingAppointment(app); }}
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button
                          className="p-1 text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleDelete(app.id); }}
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-neutral-800 tabular-nums">{app.appointmentTime}</span>
                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                          {moment(app.appointmentDate).format('MMM DD')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-100 to-secondary-100 text-primary-700 flex items-center justify-center font-bold text-[10px] shadow-sm border border-primary-200/50">
                          {app.patientName?.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-sm font-bold text-neutral-900">{app.patientName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-neutral-600 truncate max-w-[120px]">Dr. {app.doctorName}</td>
                    <td className="px-4 py-3 text-[13px] font-medium text-neutral-500 italic truncate max-w-[150px]">{app.treatmentType || 'General'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors
                        ${app.status?.toLowerCase() === 'scheduled' ? 'bg-primary-50 text-primary-700 border-primary-200/60' : ''}
                        ${['completed', 'attended'].includes(app.status?.toLowerCase()) ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 opacity-60' : ''}
                        ${(app.status?.toLowerCase() === 'missed' || app.autoMissed) ? 'bg-red-50 text-red-700 border-red-200/60' : ''}
                        ${!['scheduled', 'completed', 'attended', 'missed'].includes(app.status?.toLowerCase()) ? 'bg-neutral-100 text-neutral-700 border-neutral-200/60' : ''}
                      `}>
                        {app.displayStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {displayedListAppointments.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-20 text-center text-sm text-neutral-400 italic font-medium">
                      No matching appointments.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Appointments;
