import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, addDoc, updateDoc, doc, serverTimestamp, onSnapshot, query, orderBy, where, limit, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import moment from 'moment';

const AddAppointment = ({ onClose, appointmentData }) => {
  const [patients, setPatients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState(appointmentData || {
    patientId: '',
    patientName: '',
    phone: '', 
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
    const unsubPatients = onSnapshot(query(collection(db, "patients"), orderBy("firstName", "asc")), (snap) => {
      setPatients(snap.docs.map(doc => ({ id: doc.id, type: 'Patient', ...doc.data() })));
    });
    const unsubLeads = onSnapshot(query(collection(db, "leads"), orderBy("firstName", "asc")), (snap) => {
      setLeads(snap.docs.map(doc => ({ id: doc.id, type: 'Lead', ...doc.data() })));
    });
    const unsubDoctors = onSnapshot(collection(db, "doctors"), (snap) => {
      setDoctors(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubPatients(); unsubLeads(); unsubDoctors(); };
  }, []);

  useEffect(() => {
    setNoShowRisk({ risk: 'Low', missedCount: 0, recentStatuses: [] });
    if (!formData.patientId || isNewPatient) return;

    const historyQuery = query(
      collection(db, "appointments"),
      where("patientId", "==", formData.patientId),
      orderBy("appointmentDate", "desc"),
      limit(5)
    );

    const unsubHistory = onSnapshot(historyQuery, (snap) => {
      const history = snap.docs.map(doc => doc.data());
      const todayStr = moment().format('YYYY-MM-DD');
      const currentTime = moment().format('HH:mm');

      const analyzedHistory = history.map(app => {
        const isPastDate = app.appointmentDate < todayStr;
        const isToday = app.appointmentDate === todayStr;
        const isPastTime = isToday && app.appointmentTime < currentTime;
        const isMissed = app.status?.toLowerCase() === 'missed' || (app.status === 'Scheduled' && (isPastDate || isPastTime));
        return { ...app, isMissed };
      });

      const missedCount = analyzedHistory.filter(app => app.isMissed).length;
      const recentStatuses = analyzedHistory.map(app => app.isMissed ? 'missed' : app.status?.toLowerCase()).reverse();

      let risk = 'Low';
      if (missedCount >= 3) risk = 'High';
      else if (missedCount >= 1) risk = 'Medium';

      setNoShowRisk({ risk, missedCount, recentStatuses });
    }, (error) => {
      console.error("No-Show History Query Error:", error);
    });

    return () => unsubHistory();
  }, [formData.patientId, isNewPatient]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const todayStr = moment().format('YYYY-MM-DD');
      const now = moment();
      const requestedDateTime = moment(`${formData.appointmentDate} ${formData.appointmentTime}`);

      // 1. Minimum Future Buffer (30 mins)
      if (requestedDateTime.isBefore(now.add(30, 'minutes')) && !appointmentData) {
        toast.error("Appointments must be booked at least 30 minutes in the future.");
        setLoading(false);
        return;
      }

      // 2. Conflict Check (15 min buffer for the same person)
      if (!appointmentData) {
        const conflictQuery = query(
          collection(db, "appointments"),
          where("patientId", "==", formData.patientId),
          where("appointmentDate", "==", formData.appointmentDate)
        );
        const conflictSnap = await getDocs(conflictQuery); // Need to import getDocs
        const hasConflict = conflictSnap.docs.some(d => {
           const existingTime = moment(`${d.data().appointmentDate} ${d.data().appointmentTime}`);
           const diff = Math.abs(requestedDateTime.diff(existingTime, 'minutes'));
           return diff < 15;
        });

        if (hasConflict) {
          toast.error("Conflict Detected: This person already has an appointment within 15 minutes of this slot.");
          setLoading(false);
          return;
        }
      }

      if (appointmentData?.id) {
        const docRef = doc(db, "appointments", appointmentData.id);
        const updateData = { ...formData };
        delete updateData.id;
        await updateDoc(docRef, updateData);
        toast.success("Schedule Updated Successfully!");
      } else {
        let finalPatientId = formData.patientId;
        let finalPatientName = formData.patientName;

        if (isNewPatient) {
          const patientRef = await addDoc(collection(db, "patients"), {
            firstName: formData.patientName.split(' ')[0],
            lastName: formData.patientName.split(' ').slice(1).join(' ') || '',
            phone: formData.phone,
            status: 'Active',
            createdAt: serverTimestamp(),
            patientID: `TEMP-${Date.now().toString().slice(-4)}`
          });
          finalPatientId = patientRef.id;
        }

        await addDoc(collection(db, "appointments"), {
          ...formData,
          patientId: finalPatientId,
          patientName: finalPatientName,
          createdAt: serverTimestamp()
        });
        toast.success("Clinical Slot Confirmed!");
      }
      onClose();
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-xl my-4 mx-auto animate-slide-up overflow-hidden border border-white flex flex-col max-h-[90vh]">

        <div className="px-8 py-6 border-b border-neutral-100 bg-white/50 flex justify-between items-center sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-neutral-900 tracking-tighter uppercase">
              {appointmentData?.id ? 'Adjust Schedule' : 'Book Clinical Slot'}
            </h2>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-1">
              {isNewPatient ? 'New Patient Onboarding' : 'Standard Patient Consultation'}
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all bg-white shadow-sm border border-neutral-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="overflow-y-auto p-8 flex-1 custom-scrollbar space-y-8">
          <form id="add-appointment-form" onSubmit={handleSubmit} className="space-y-8">

            <div className="p-6 bg-neutral-50/50 rounded-2xl border border-neutral-100/50 space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Patient Registry</h3>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-8 h-4 rounded-full transition-colors relative ${isNewPatient ? 'bg-primary-500' : 'bg-neutral-200'}`}>
                    <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${isNewPatient ? 'right-1' : 'left-1'}`}></div>
                  </div>
                  <input type="checkbox" className="hidden" checked={isNewPatient} onChange={(e) => setIsNewPatient(e.target.checked)} />
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest group-hover:text-primary-600 transition-colors">Register New</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isNewPatient ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Full Name</label>
                      <input type="text" placeholder="First & Last Name" value={formData.patientName} onChange={(e) => setFormData({ ...formData, patientName: e.target.value })} required className="bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Phone Number</label>
                      <input type="tel" placeholder="+91 00000 00000" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required className="bg-white" />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Select Contact (Patient/Lead)</label>
                    <select value={formData.patientId} onChange={(e) => {
                        const selectedId = e.target.value;
                        const allPeople = [...patients, ...leads];
                        const p = allPeople.find(pat => pat.id === selectedId);
                        if (p) {
                          setFormData({ 
                            ...formData, 
                            patientId: p.id, 
                            patientName: `${p.firstName} ${p.lastName}`,
                            phone: p.phone || ''
                          });
                        } else {
                          setFormData({ ...formData, patientId: '', patientName: '', phone: '' });
                        }
                      }} required className="bg-white">
                      <option value="">Choose Contact...</option>
                      <optgroup label="Patients">
                        {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.patientID}</option>)}
                      </optgroup>
                      <optgroup label="Leads">
                        {leads.map(l => <option key={l.id} value={l.id}>{l.firstName} {l.lastName} (Lead)</option>)}
                      </optgroup>
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-primary-600 uppercase tracking-widest ml-1">Treating Practitioner</label>
                  <select value={formData.doctorName} onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })} required className="bg-white border-primary-100 text-primary-900">
                    <option value="">Select Doctor</option>
                    {doctors.map(d => <option key={d.id} value={d.name}>Dr. {d.name}</option>)}
                  </select>
                </div>
              </div>

              {!isNewPatient && formData.patientId && (
                <div className={`p-5 rounded-2xl border flex gap-4 transition-all duration-500 shadow-sm ${
                  noShowRisk.missedCount >= 3 ? 'bg-rose-50 border-rose-100 animate-pulse' : 
                  noShowRisk.missedCount >= 1 ? 'bg-amber-50 border-amber-100' : 
                  'bg-emerald-50 border-emerald-100'
                }`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                    noShowRisk.missedCount >= 3 ? 'bg-rose-500 text-white shadow-rose-500/20' : 
                    noShowRisk.missedCount >= 1 ? 'bg-amber-500 text-white shadow-amber-500/20' : 
                    'bg-emerald-500 text-white shadow-emerald-500/20'
                  }`}>
                    {noShowRisk.missedCount > 0 ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-[11px] font-black uppercase tracking-widest mb-1 ${
                      noShowRisk.missedCount >= 3 ? 'text-rose-700' : 
                      noShowRisk.missedCount >= 1 ? 'text-amber-700' : 
                      'text-emerald-700'
                    }`}>
                      {noShowRisk.missedCount >= 3 ? 'Critical Reliability Alert' : 
                       noShowRisk.missedCount >= 1 ? 'Attendance Warning' : 
                       noShowRisk.recentStatuses.length === 0 ? 'New Registry Segment' : 'Verified Reliability'}
                    </h4>
                    <p className="text-[13px] font-bold text-neutral-800 leading-tight">
                      {noShowRisk.recentStatuses.length === 0 
                        ? 'No previous scheduling history available.' 
                        : `Patient missed ${noShowRisk.missedCount} out of last 5 slots. High predictive risk detected.`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-neutral-50/50 rounded-2xl border border-neutral-100/50 space-y-6">
              <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-3">Booking Intelligence</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Preferred Date</label>
                  <input type="date" value={formData.appointmentDate} min={moment().format('YYYY-MM-DD')} onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })} required className="bg-white tabular-nums" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Slot Time</label>
                  <input type="time" value={formData.appointmentTime} onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })} required className="bg-white tabular-nums" />
                </div>
              </div>

              <div className="space-y-6 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Medical Service Category</label>
                  <input type="text" placeholder="e.g. Chronic Pain Review" value={formData.treatmentType} onChange={(e) => setFormData({ ...formData, treatmentType: e.target.value })} className="bg-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Clinical Notes</label>
                  <textarea placeholder="Capture patient's specific requirements or symptoms..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-white min-h-[100px] text-sm font-medium" />
                </div>
              </div>
            </div>

          </form>
        </div>

        <div className="px-8 py-6 border-t border-neutral-100 bg-white/80 flex justify-end gap-4 sticky bottom-0 z-10 backdrop-blur-md shrink-0">
          <button type="button" onClick={onClose} className="px-8 py-3 bg-neutral-100 text-neutral-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-all" disabled={loading}>
            Dismiss
          </button>
          <button type="submit" form="add-appointment-form" className="px-10 py-3 bg-neutral-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-xl shadow-neutral-900/10 transition-all flex items-center gap-2" disabled={loading}>
            {loading ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : null}
            {loading ? "Processing..." : appointmentData?.id ? "Update Schedule" : "Confirm Booking"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddAppointment;
