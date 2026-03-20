import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import AddOutreachLog from './AddOutreachLog';
import AddFollowUp from '../FollowUps/AddFollowUp';
import AddAppointment from '../Appointments/AddAppointment';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { toast } from 'react-toastify';

export default function OutreachLog() {
  const [logs, setLogs] = useState([]);
  const [patientIds, setPatientIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState(null);
  const [editingLog, setEditingLog] = useState(null);
  const [schedulingFollowUp, setSchedulingFollowUp] = useState(null); // { personId, name, location }
  const [bookingAppointment, setBookingAppointment] = useState(null); // { personId, name, location, notes }
  
  const [activeTab, setActiveTab] = useState('Leads'); // 'Leads' | 'Patients'
  const [viewingPersonLogs, setViewingPersonLogs] = useState(null); // { personId, name, logs: [] }

  const [selectedLocation, setSelectedLocation] = useState('All location');
  const [searchTerm, setSearchTerm] = useState('');
  const locations = ["All location", "Koyilandy", "Payyannur", "Chengannur"];

  useEffect(() => {
    const unsubPatients = onSnapshot(collection(db, "patients"), (snapshot) => {
      setPatientIds(new Set(snapshot.docs.map(doc => doc.id)));
    });

    const q = query(collection(db, "outreachLogs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      toast.error("Error fetching outreach logs: " + error.message);
      setLoading(false);
    });
    return () => {
      unsubscribe();
      unsubPatients();
    };
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "outreachLogs", id));
      toast.success("Log deleted successfully.");
      setDeletingLogId(null);
      if (viewingPersonLogs) {
        const updatedLogs = viewingPersonLogs.logs.filter(l => l.id !== id);
        if (updatedLogs.length === 0) setViewingPersonLogs(null);
        else setViewingPersonLogs({ ...viewingPersonLogs, logs: updatedLogs });
      }
    } catch (error) {
      toast.error("Delete failed: " + error.message);
    }
  };

  const groupedData = useMemo(() => {
    const filtered = logs.filter(log => {
      const type = patientIds.has(log.personId) ? 'Patient' : (log.personType || 'Lead');
      const matchesTab = type === (activeTab === 'Leads' ? 'Lead' : 'Patient');
      const matchesLocation = selectedLocation === 'All location' || log.department === selectedLocation;
      const matchesSearch = (log.personName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.staffName || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesLocation && matchesSearch;
    });

    const groups = {};
    filtered.forEach(log => {
      if (!groups[log.personId]) {
        groups[log.personId] = {
          personId: log.personId,
          name: log.personName,
          logs: [],
          lastInteraction: log.createdAt,
          location: log.department
        };
      }
      groups[log.personId].logs.push(log);
    });

    return Object.values(groups).sort((a, b) => {
      const dateA = a.lastInteraction?.toDate ? a.lastInteraction.toDate() : new Date(0);
      const dateB = b.lastInteraction?.toDate ? b.lastInteraction.toDate() : new Date(0);
      return dateB - dateA;
    });
  }, [logs, activeTab, selectedLocation, searchTerm, patientIds]);

  const stats = useMemo(() => {
    const tabLogs = logs.filter(l => (l.personType || 'Lead') === (activeTab === 'Leads' ? 'Lead' : 'Patient'));
    return {
      total: tabLogs.length,
      interested: tabLogs.filter(l => l.outcome?.toLowerCase().includes('interested')).length,
      pending: tabLogs.filter(l => l.outcome?.toLowerCase().includes('pending')).length
    };
  }, [logs, activeTab]);

  return (
    <div className="animate-fade-in w-full max-w-full overflow-hidden">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="page-title mb-1">Outreach Intelligence</h1>
          <p className="text-sm font-medium text-neutral-500">Separated and grouped interaction history.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
          <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 shadow-inner">
            <button
              onClick={() => setActiveTab('Leads')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'Leads' ? 'bg-white text-primary-700 shadow-sm border border-neutral-200' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Leads
            </button>
            <button
              onClick={() => setActiveTab('Patients')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'Patients' ? 'bg-white text-primary-700 shadow-sm border border-neutral-200' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Patients
            </button>
          </div>

          <div className="relative group">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder="Search people or staff..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>

          <button className="btn-primary whitespace-nowrap shadow-md" onClick={() => setShowAddForm(true)}>
            + Log Outreach
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <StatsCard title={`Total ${activeTab} Logs`} value={stats.total} type="total" />
        <StatsCard title="Positive Interest" value={stats.interested} type="success" />
        <StatsCard title="Pending Review" value={stats.pending} type="pending" />
      </section>

      {(showAddForm || editingLog) && (
        <AddOutreachLog 
          editData={editingLog}
          onClose={() => {
            setShowAddForm(false);
            setEditingLog(null);
          }} 
        />
      )}

      {schedulingFollowUp && (
        <AddFollowUp
          onClose={() => setSchedulingFollowUp(null)}
          prefilledLeadId={schedulingFollowUp.personId}
          prefilledLeadName={schedulingFollowUp.name}
          prefilledDepartment={schedulingFollowUp.location}
        />
      )}

      {bookingAppointment && (
        <AddAppointment
          onClose={() => setBookingAppointment(null)}
          appointmentData={{
            patientId: bookingAppointment.personId,
            patientName: bookingAppointment.name,
            doctorName: bookingAppointment.location,
            notes: `Auto-generated from Outreach: ${bookingAppointment.notes}`
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-20 text-center text-neutral-500 font-medium">Crunching data...</div>
        ) : groupedData.length > 0 ? (
          groupedData.map((group) => (
            <div 
              key={group.personId} 
              onClick={() => setViewingPersonLogs(group)}
              className="group bg-white/60 backdrop-blur-md rounded-2xl border border-white hover:border-primary-200 p-5 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center font-bold text-neutral-600 border border-white shadow-sm">
                  {group.name?.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="px-2 py-1 bg-primary-50 text-table-primary text-[10px] font-black uppercase tracking-widest rounded-lg border border-primary-100">
                  {group.logs.length} Log{group.logs.length > 1 ? 's' : ''}
                </span>
              </div>

              <h3 className="text-lg font-black text-neutral-800 tracking-tight mb-1 group-hover:text-primary-700 transition-colors uppercase">{group.name}</h3>
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {group.location || 'Unknown Location'}
              </p>

              <div className="p-3 bg-neutral-50/50 rounded-xl border border-neutral-100/50">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Latest Outcome</p>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm transition-all
                  ${group.logs[0].outcome?.toLowerCase().includes('callback') ? 'bg-red-500 text-white border-red-600 animate-pulse shadow-red-500/20' : 
                    group.logs[0].outcome?.toLowerCase().includes('interested') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                    'bg-neutral-100 text-neutral-600 border-neutral-200'}
                `}>
                  {group.logs[0].outcome}
                </span>
                <p className="text-[11px] text-neutral-500 mt-2 line-clamp-2 italic leading-relaxed">
                  "{group.logs[0].aiSummary || 'No summary available'}"
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-neutral-100/50 flex justify-between items-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                <span>Last Active</span>
                <span className="text-neutral-600">{group.lastInteraction?.toDate ? group.lastInteraction.toDate().toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-20 text-center text-neutral-500 font-medium italic">
            No outreach logs found for this criteria.
          </div>
        )}
      </div>

      {/* History Viewer Modal */}
      {viewingPersonLogs && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-slide-up border border-white">
            <div className="px-8 py-6 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black text-neutral-900 tracking-tighter uppercase">{viewingPersonLogs.name}</h2>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">Full Interaction History — {activeTab}</p>
              </div>
              <button 
                onClick={() => setViewingPersonLogs(null)}
                className="p-2.5 bg-white text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl border border-neutral-100 shadow-sm transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-neutral-50/20">
              {viewingPersonLogs.logs.map((log, idx) => (
                <div key={log.id} className="relative pl-8 border-l-2 border-neutral-200 pb-2 last:pb-0">
                  <div className="absolute top-0 -left-[9px] w-4 h-4 rounded-full bg-white border-2 border-primary-500"></div>
                  
                  <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                      <div>
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-1">
                          {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                        </span>
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all
                          ${log.outcome?.toLowerCase().includes('callback') ? 'bg-red-500 text-white border-red-600 shadow-sm shadow-red-500/20' : 
                            log.outcome?.toLowerCase().includes('interested') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                            log.outcome?.toLowerCase().includes('pending') ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                            log.outcome?.toLowerCase().includes('not') ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                            'bg-neutral-100 text-neutral-600 border-neutral-200'}
                        `}>
                          {log.outcome}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setBookingAppointment({ 
                            personId: viewingPersonLogs.personId, 
                            name: viewingPersonLogs.name,
                            location: log.department,
                            notes: log.aiSummary
                          })}
                          className="p-2 text-neutral-300 hover:text-secondary-600 hover:bg-secondary-50 rounded-lg transition-all border border-transparent hover:border-secondary-100"
                          title="Book Clinical Appointment"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </button>
                        <button 
                          onClick={() => setSchedulingFollowUp({ 
                            personId: viewingPersonLogs.personId, 
                            name: viewingPersonLogs.name,
                            location: log.department 
                          })}
                          className="p-2 text-neutral-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all border border-transparent hover:border-emerald-100"
                          title="Schedule Follow-up"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                        </button>
                        <button 
                          onClick={() => setEditingLog(log)}
                          className="p-2 text-neutral-300 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all border border-transparent hover:border-primary-100"
                          title="Edit log"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button 
                          onClick={() => setDeletingLogId(log.id)}
                          className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                          title="Delete specific log"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">AI Insight</p>
                      <div className="p-4 bg-primary-50/30 rounded-xl border border-primary-100/50 border-l-4 border-l-primary-400 italic text-[13px] text-neutral-700 leading-relaxed font-semibold">
                        "{log.aiSummary || 'Summary not available for this interaction.'}"
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-50 text-[10px] font-bold uppercase tracking-widest">
                      <div>
                        <p className="text-neutral-400 mb-1">Recording Staff</p>
                        <p className="text-neutral-700">{log.staffName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-neutral-400 mb-1">Branch</p>
                        <p className="text-neutral-700">{log.department}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex justify-center shrink-0">
               <button 
                onClick={() => setViewingPersonLogs(null)}
                className="px-10 py-2.5 bg-neutral-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-neutral-900 shadow-lg transition-all"
               >
                 Close History
               </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal 
        isOpen={!!deletingLogId}
        title="Delete Interaction Record"
        message="Are you sure you want to delete this specific outreach entry? This will permanently erase the logs and AI insights for this record."
        onConfirm={() => handleDelete(deletingLogId)}
        onCancel={() => setDeletingLogId(null)}
      />
    </div>
  );
}

function StatsCard({ title, value, type }) {
  const getColors = () => {
    switch(type) {
      case 'success': return 'border-l-emerald-500 from-emerald-50 to-white';
      case 'pending': return 'border-l-amber-500 from-amber-50 to-white';
      default: return 'border-l-primary-500 from-primary-50 to-white';
    }
  };

  return (
    <div className={`card p-5 border-l-4 bg-gradient-to-r ${getColors()} hover:shadow-md transition-shadow`}>
      <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 uppercase">{title}</h3>
      <p className="text-3xl font-black text-neutral-900 tracking-tighter">{value}</p>
    </div>
  );
}