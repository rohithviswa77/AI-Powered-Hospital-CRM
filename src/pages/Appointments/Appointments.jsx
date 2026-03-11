import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, doc, deleteDoc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import AddAppointment from './AddAppointment';

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [activeTab, setActiveTab] = useState('Upcoming'); // 'Upcoming' or 'History'

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

  // Filter appointments based on the branch location of the assigned doctor
  const filteredAppointments = appointments.filter(app => {
    if (selectedLocation === 'All location') return true;
    return app.doctorName?.includes(selectedLocation);
  });

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this appointment?")) {
      try {
        await deleteDoc(doc(db, "appointments", id));
      } catch (error) {
        console.error("Error deleting appointment:", error);
      }
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "appointments", id), { status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // Derive Upcoming vs History
  const todayStr = new Date().toISOString().split('T')[0];

  const upcomingAppointments = filteredAppointments.filter(app => {
    const isPast = app.appointmentDate < todayStr;
    const isCompleted = ['attended', 'missed', 'completed'].includes(app.status?.toLowerCase());
    return !isPast && !isCompleted;
  });

  const historyAppointments = filteredAppointments.filter(app => {
    const isPast = app.appointmentDate < todayStr;
    const isCompleted = ['attended', 'missed', 'completed'].includes(app.status?.toLowerCase());
    return isPast || isCompleted;
  });

  const displayedAppointments = activeTab === 'Upcoming' ? upcomingAppointments : historyAppointments;

  return (
    <div className="animate-fade-in w-full max-w-full overflow-hidden">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="page-title mb-1">Clinic Schedule</h1>
          <p className="text-sm font-medium text-neutral-500">Manage upcoming patient visits and doctor availability.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full sm:min-w-[200px]"
          >
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <button onClick={() => setShowAddForm(true)} className="btn-primary whitespace-nowrap">
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        {/* Tabs */}
        <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200">
          <button
            onClick={() => setActiveTab('Upcoming')}
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'Upcoming' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab('History')}
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'History' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            History
          </button>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-neutral-200 border-l-4 border-l-primary-500 flex flex-col min-w-[160px] shadow-soft">
          <span className="text-xs text-neutral-500 uppercase font-semibold mb-1">{activeTab} Total</span>
          <strong className="text-2xl text-neutral-900 leading-none">{displayedAppointments.length}</strong>
        </div>
      </div>

      <div className="card border-neutral-200">
        {loading ? (
          <p className="p-8 text-center text-neutral-500 font-medium animate-pulse">Loading schedule...</p>
        ) : (
          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-left whitespace-nowrap lg:whitespace-normal min-w-max">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="w-24 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Time</th>
                  <th className="w-32 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Date</th>
                  <th className="w-48 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Patient Name</th>
                  <th className="w-48 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Assigned Doctor</th>
                  <th className="w-48 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Treatment</th>
                  <th className="w-32 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="w-20 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {displayedAppointments.map((app) => (
                  <tr key={app.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-primary-600 text-base">{app.appointmentTime}</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">{app.appointmentDate}</td>
                    <td className="px-4 py-3 font-semibold text-neutral-900 break-words">{app.patientName}</td>
                    <td className="px-4 py-3 text-sm font-medium text-neutral-500 break-words">Dr. {app.doctorName}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600 break-words">{app.treatmentType}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider
                        ${app.status?.toLowerCase() === 'scheduled' ? 'bg-blue-50 text-blue-700 border border-blue-200' : ''}
                        ${['completed', 'attended'].includes(app.status?.toLowerCase()) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : ''}
                        ${app.status?.toLowerCase() === 'missed' ? 'bg-red-50 text-red-700 border border-red-200' : ''}
                        ${!['scheduled', 'completed', 'attended', 'missed'].includes(app.status?.toLowerCase()) ? 'bg-neutral-100 text-neutral-700 border border-neutral-200' : ''}
                      `}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {activeTab === 'Upcoming' && (
                          <>
                            <button
                              className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(app.id, 'Attended'); }}
                              title="Mark Attended"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button
                              className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(app.id, 'Missed'); }}
                              title="Mark Missed"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </>
                        )}
                        <button
                          className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          onClick={(e) => { e.stopPropagation(); setEditingAppointment(app); }}
                          title="Edit Appointment"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleDelete(app.id); }}
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {displayedAppointments.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-neutral-500 font-medium italic">
                      No {activeTab.toLowerCase()} appointments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div >
  );
};

export default Appointments;