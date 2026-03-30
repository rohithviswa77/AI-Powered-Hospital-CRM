import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

export default function PatientProfileDrawer({ patient, onClose, onEditPatient, onDeletePatient }) {
  const { userProfile } = useAuth();
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patient?.id) return;

    // 1. Fetch Appointments
    const qAppointments = query(
      collection(db, "appointments"),
      where("patientId", "==", patient.id)
    );

    // 2. Fetch Outreach Logs (using personId as the link)
    const qOutreach = query(
      collection(db, "outreachLogs"),
      where("personId", "==", patient.id)
    );

    let appointmentsData = [];
    let outreachData = [];

    const processTimeline = () => {
      const combined = [
        ...appointmentsData.map(a => ({ 
          ...a, 
          type: 'appointment', 
          dateValue: a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0 
        })),
        ...outreachData.map(o => ({ 
          ...o, 
          type: 'outreach', 
          dateValue: o.createdAt?.toMillis?.() || Date.now() 
        }))
      ];
      // Sort newest at top
      combined.sort((a, b) => b.dateValue - a.dateValue);
      setTimelineEvents(combined);
      setLoading(false);
    };

    const unsubApps = onSnapshot(qAppointments, (snap) => {
      appointmentsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      processTimeline();
    });

    const unsubOutreach = onSnapshot(qOutreach, (snap) => {
      outreachData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      processTimeline();
    });

    return () => {
      unsubApps();
      unsubOutreach();
    };
  }, [patient?.id]);

  if (!patient) return null;

  return (
    <>
      {/* Background Overlay */}
      <div 
        className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-[110] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-[120] transform transition-transform duration-300 ease-in-out flex flex-col border-l border-neutral-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-100 bg-neutral-50 flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-white border border-neutral-200 text-neutral-600 text-xs font-bold px-2 py-0.5 rounded shadow-sm">
                {patient.patientID}
              </span>
              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary-50 text-primary-700 border border-primary-100`}>
                {patient.treatmentStage || 'Consultation'} Stage
              </span>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 leading-tight mb-1">
              {patient.firstName} {patient.lastName}
            </h2>
            <p className="text-sm font-semibold text-neutral-500">
              {patient.gender} • {patient.age} Years Old • {patient.department}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-neutral-100 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          
          {/* Clinical Vitals Section */}
          <div className="p-6 border-b border-neutral-100">
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.15em] mb-4">Patient Vitals & Measures</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                <p className="text-[10px] font-bold text-neutral-400 uppercase mb-1">Height</p>
                <p className="font-bold text-neutral-800">{patient.height ? `${patient.height} cm` : '—'}</p>
              </div>
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                <p className="text-[10px] font-bold text-neutral-400 uppercase mb-1">Weight</p>
                <p className="font-bold text-neutral-800">{patient.weight ? `${patient.weight} kg` : '—'}</p>
              </div>
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                <p className="text-[10px] font-bold text-neutral-400 uppercase mb-1">BP</p>
                <p className="font-bold text-neutral-800">{patient.bloodPressure || '—'}</p>
              </div>
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                <p className="text-[10px] font-bold text-neutral-400 uppercase mb-1">Blood</p>
                <p className="font-bold text-neutral-800">{patient.bloodGroup || '—'}</p>
              </div>
            </div>
          </div>

          {/* Contact & Doctor Summary */}
          <div className="p-6 border-b border-neutral-100 grid grid-cols-2 gap-y-4 gap-x-6">
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Mobile</p>
              <p className="font-semibold text-neutral-800">{patient.mobile || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Assigned Doctor</p>
              <p className="font-semibold text-primary-600 font-bold">Dr. {patient.assignedDoctor || 'Unassigned'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Chief Complaint</p>
              <p className="text-sm font-medium text-neutral-700 bg-amber-50 p-3 rounded-lg border border-amber-100 italic mb-4">
                "{patient.chiefComplaint || 'No clinical notes provided.'}"
              </p>
              
              <div className="space-y-4">
                {patient.medicalHistory && (
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Medical History</p>
                    <p className="text-sm text-neutral-600 font-medium">{patient.medicalHistory}</p>
                  </div>
                )}
                {patient.allergies && (
                  <div>
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Allergies & Contraindications</p>
                    <p className="text-sm text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100">{patient.allergies}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {userProfile?.role !== 'Manager' && (
            <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex gap-3 px-6">
              <button 
                onClick={() => onEditPatient(patient)}
                className="flex-1 bg-white border border-neutral-200 hover:border-primary-400 hover:text-primary-700 text-neutral-700 font-semibold py-2 px-4 rounded-lg shadow-sm transition-all text-sm flex justify-center items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Edit Clinical Details
              </button>
              <button 
                onClick={() => onDeletePatient(patient)}
                className="bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 text-red-600 font-semibold py-2 px-4 rounded-lg shadow-sm transition-all text-sm flex justify-center items-center gap-2"
                title="Delete Patient Record"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete File
              </button>
            </div>
          )}

          {/* Unified Timeline */}
          <div className="p-6">
            <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider mb-6 flex items-center gap-2">
              <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Patient Journey Timeline
            </h3>

            {loading ? (
              <p className="text-sm text-neutral-500 italic">Syncing medical history...</p>
            ) : timelineEvents.length === 0 ? (
              <div className="text-center py-8 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                <p className="text-sm text-neutral-500 font-medium">No activity recorded yet.</p>
                <p className="text-xs text-neutral-400 mt-1">Appointments and outreach logs will appear here.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-neutral-200 ml-3 space-y-8">
                {timelineEvents.map((event, idx) => {
                  const isApp = event.type === 'appointment';
                  const dateStr = isApp 
                    ? new Date(event.appointmentDate).toLocaleDateString()
                    : (event.createdAt?.toDate ? event.createdAt.toDate().toLocaleDateString() : 'Just now');
                  
                  return (
                    <div key={`${event.type}-${event.id}`} className="relative pl-6">
                      {/* Timeline Dot */}
                      <span className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white 
                        ${isApp ? 'bg-primary-500' : 'bg-emerald-400'}
                      `} />
                      
                      <div className="bg-white border text-left border-neutral-100 shadow-sm rounded-xl p-4 hover:border-neutral-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded
                            ${isApp ? 'bg-primary-50 text-primary-700' : 'bg-emerald-50 text-emerald-700'}
                          `}>
                            {isApp ? 'Appointment' : 'Outreach Log'}
                          </span>
                          <span className="text-[10px] font-bold text-neutral-400">{dateStr}</span>
                        </div>
                        
                        {isApp ? (
                          <>
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-bold text-neutral-800">{event.treatmentType || 'General Consultation'}</p>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                event.status?.toLowerCase() === 'scheduled' ? 'bg-blue-50 text-blue-600' : 'bg-neutral-100 text-neutral-600'
                              }`}>
                                {event.status}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">Doctor: {event.doctorName} • Time: {event.appointmentTime}</p>
                            {event.notes && <p className="text-xs text-neutral-600 mt-2 bg-neutral-50 p-2 rounded border-l-2 border-neutral-200">"{event.notes}"</p>}
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-bold text-neutral-800">{event.callStatus || 'Call Interaction'}</p>
                            <p className="text-xs text-neutral-500 mt-1">Staff: {event.staffName}</p>
                            {event.aiSummary && (
                              <div className="mt-2 text-[11px] text-emerald-800 bg-emerald-50/50 p-2 rounded leading-relaxed italic">
                                "{event.aiSummary}"
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
