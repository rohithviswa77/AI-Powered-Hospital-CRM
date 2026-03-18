import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, addDoc, updateDoc, doc, serverTimestamp, onSnapshot, query, orderBy, where, limit } from 'firebase/firestore';
import { toast } from 'react-toastify';

const AddAppointment = ({ onClose, appointmentData }) => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState(appointmentData || {
    patientId: '',
    patientName: '',
    phone: '', // Added for new patient creation
    doctorName: '',
    appointmentDate: '',
    appointmentTime: '',
    treatmentType: '',
    notes: '',
    status: 'Scheduled'
  });

  const [isNewPatient, setIsNewPatient] = useState(false);
  const [noShowRisk, setNoShowRisk] = useState({ risk: 'Low', missedCount: 0, recentStatuses: [] });

  useEffect(() => {
    // Fetch Patients for selection
    const unsubPatients = onSnapshot(query(collection(db, "patients"), orderBy("createdAt", "desc")), (snap) => {
      setPatients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    // Fetch Doctors from your Category Management collection
    const unsubDoctors = onSnapshot(collection(db, "doctors"), (snap) => {
      setDoctors(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubPatients(); unsubDoctors(); };
  }, []);

  // Predictive Analytics Logic
  useEffect(() => {
    // Clear existing risk immediately when patient changes
    setNoShowRisk({ risk: 'Low', missedCount: 0, recentStatuses: [] });

    if (!formData.patientId || isNewPatient) return;

    // Fetch patient's history to calculate risk
    const historyQuery = query(
      collection(db, "appointments"),
      where("patientId", "==", formData.patientId),
      orderBy("appointmentDate", "desc"),
      limit(10)
    );

    const unsubHistory = onSnapshot(historyQuery, (snap) => {
      const history = snap.docs.map(doc => doc.data());

      // Use the same logic as Appointments.jsx for missed (status or past scheduled)
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

      const analyzedHistory = history.map(app => {
        const isPastDate = app.appointmentDate < todayStr;
        const isToday = app.appointmentDate === todayStr;
        const isPastTime = isToday && app.appointmentTime < currentTime;
        const isMissed = app.status?.toLowerCase() === 'missed' || (app.status === 'Scheduled' && (isPastDate || isPastTime));
        return { ...app, isMissed };
      });

      const missedCount = analyzedHistory.filter(app => app.isMissed).length;
      const recentStatuses = analyzedHistory.map(app => {
        if (app.isMissed) return 'missed';
        return app.status?.toLowerCase();
      }).reverse();

      let risk = 'Low';
      if (missedCount >= 3) risk = 'High';
      else if (missedCount >= 1) risk = 'Medium';

      setNoShowRisk({ risk, missedCount, recentStatuses });
    }, (error) => {
      console.error("No-Show History Query Error:", error);
      // If index is missing, we might still want to notify or fallback
    });

    return () => unsubHistory();
  }, [formData.patientId, isNewPatient]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // --- Date & Time Validation (Main Logic) ---
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"

      const isPastDate = formData.appointmentDate < todayStr;
      const isToday = formData.appointmentDate === todayStr;
      const isPastTime = isToday && formData.appointmentTime < currentTime;

      if ((isPastDate || isPastTime) && !appointmentData) {
        toast.error(`You cannot book appointments in the past (${isPastDate ? 'Past Date' : 'Past Time'}).`);
        setLoading(false);
        return;
      }
      if (appointmentData?.id) {
        const docRef = doc(db, "appointments", appointmentData.id);
        const updateData = { ...formData };
        delete updateData.id;
        await updateDoc(docRef, updateData);
        toast.success("Appointment Updated Successfully!");
      } else {
        let finalPatientId = formData.patientId;
        let finalPatientName = formData.patientName;

        // --- New Patient Creation Logic ---
        if (isNewPatient) {
          const patientRef = await addDoc(collection(db, "patients"), {
            firstName: formData.patientName.split(' ')[0],
            lastName: formData.patientName.split(' ').slice(1).join(' ') || '',
            phone: formData.phone,
            status: 'Active',
            createdAt: serverTimestamp(),
            // Generate a temporary clinical ID
            patientID: `TEMP-${Date.now().toString().slice(-4)}`
          });
          finalPatientId = patientRef.id;
          toast.info("New patient profile created automatically.");
        }

        await addDoc(collection(db, "appointments"), {
          ...formData,
          patientId: finalPatientId,
          patientName: finalPatientName,
          createdAt: serverTimestamp()
        });
        toast.success("Appointment Booked Successfully!");
      }
      onClose();
    } catch (error) {
      toast.error("Error saving appointment: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-xl my-4 mx-auto animate-slide-up overflow-hidden border border-white flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-100 bg-white/50 flex justify-between items-center sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-neutral-900 to-neutral-600 tracking-tight">
              {appointmentData?.id ? 'Adjust Schedule' : 'Book Clinical Slot'}
            </h2>
            <p className="text-[11px] font-medium text-neutral-500 mt-0.5">
              Schedule patient consultations
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors bg-white shadow-sm border border-neutral-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
          <form id="add-appointment-form" onSubmit={handleSubmit} className="space-y-6">

            {/* Section: Patient Registry */}
            <div className="bg-neutral-50/80 p-5 rounded-xl border border-neutral-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Patient Registry</h3>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isNewPatient}
                    onChange={(e) => setIsNewPatient(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500/20 transition-all"
                  />
                  <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest group-hover:text-primary-600 transition-colors">New Patient</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isNewPatient ? (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={formData.patientName}
                        onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                        required
                        className="py-2 text-sm font-bold text-neutral-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Phone *</label>
                      <input
                        type="tel"
                        placeholder="e.g. 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        className="py-2 text-sm font-bold text-neutral-800"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Registered Patient *</label>
                    <select
                      value={formData.patientId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        if (!selectedId) {
                          setFormData({ ...formData, patientId: '', patientName: '' });
                          return;
                        }
                        const p = patients.find(pat => pat.id === selectedId);
                        if (p) {
                          setFormData({ ...formData, patientId: p.id, patientName: `${p.firstName} ${p.lastName}` });
                        }
                      }}
                      required
                      className="py-2 text-sm font-bold text-neutral-800"
                    >
                      <option value="">Search records...</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.patientID}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-primary-600 uppercase tracking-wider mb-1.5">Practitioner *</label>
                  <select
                    value={formData.doctorName}
                    onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                    required
                    className="py-2 text-sm border-primary-100 font-bold text-neutral-800"
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map(d => <option key={d.id} value={d.name}>Dr. {d.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Clinical Attendance Record - Shown for all patients */}
              {!isNewPatient && formData.patientId && (
                <div className={`p-3 rounded-lg border flex gap-3 transition-all duration-500 ${
                  noShowRisk.missedCount >= 3 ? 'bg-red-50 border-red-100 text-red-800 animate-pulse' : 
                  noShowRisk.missedCount >= 1 ? 'bg-orange-50 border-orange-100 text-orange-800' : 
                  'bg-emerald-50 border-emerald-100 text-emerald-800'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                    noShowRisk.missedCount >= 3 ? 'bg-red-500 text-white' : 
                    noShowRisk.missedCount >= 1 ? 'bg-orange-500 text-white' : 
                    'bg-emerald-500 text-white'
                  }`}>
                    {noShowRisk.missedCount > 0 ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                    )}
                  </div>
                  <div>
                    <h4 className="text-[9px] font-black uppercase tracking-widest mb-0.5">
                      {noShowRisk.missedCount >= 3 ? 'Critical Reliability Risk' : 
                       noShowRisk.missedCount >= 1 ? 'Attendance Warning' : 
                       noShowRisk.recentStatuses.length === 0 ? 'New Clinical Record' : 'Verified Reliability'}
                    </h4>
                    <p className="text-[11px] font-semibold leading-tight">
                      {noShowRisk.recentStatuses.length === 0 
                        ? 'No previous appointments recorded.' 
                        : `Patient missed ${noShowRisk.missedCount} of last ${noShowRisk.recentStatuses.length} appointments.`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Section: Schedule Details */}
            <div className="bg-neutral-50/80 p-5 rounded-xl border border-neutral-100 shadow-sm space-y-4">
              <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-200 pb-2">Schedule Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Date *</label>
                  <input
                    type="date"
                    value={formData.appointmentDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                    required
                    className="py-2 text-sm font-bold text-neutral-800 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Time *</label>
                  <input
                    type="time"
                    value={formData.appointmentTime}
                    onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                    required
                    className="py-2 text-sm font-bold text-neutral-800 tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Section: Appointment Metadata */}
            <div className="bg-neutral-50/80 p-5 rounded-xl border border-neutral-100 shadow-sm space-y-4">
              <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-200 pb-2">Metadata</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Service Category</label>
                  <input
                    type="text"
                    placeholder="e.g. General Clinical Checkup"
                    value={formData.treatmentType}
                    onChange={(e) => setFormData({ ...formData, treatmentType: e.target.value })}
                    className="py-2 text-sm font-bold text-neutral-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Notes</label>
                  <textarea
                    placeholder="Capture requirements..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="min-h-[80px] text-[13px] py-2"
                  />
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-white/80 flex justify-end gap-3 sticky bottom-0 z-10 backdrop-blur-md shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary !px-6 !py-2 !text-xs"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-appointment-form"
            className="btn-primary !px-8 !py-2 !text-xs"
            disabled={loading}
          >
            {loading ? "Syncing..." : appointmentData?.id ? "Update Booking" : "Confirm Booking"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddAppointment;
