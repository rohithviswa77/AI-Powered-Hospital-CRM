import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, addDoc, updateDoc, doc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-toastify';

const AddAppointment = ({ onClose, appointmentData }) => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState(appointmentData || {
    patientId: '',
    patientName: '',
    doctorName: '',
    appointmentDate: '',
    appointmentTime: '',
    treatmentType: '',
    notes: '',
    status: 'Scheduled'
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (appointmentData?.id) {
        const docRef = doc(db, "appointments", appointmentData.id);
        const updateData = { ...formData };
        delete updateData.id;
        await updateDoc(docRef, updateData);
        toast.success("Appointment Updated Successfully!");
      } else {
        await addDoc(collection(db, "appointments"), {
          ...formData,
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl my-8 mx-auto animate-slide-up overflow-hidden border border-neutral-100 flex flex-col max-h-[90vh]">

        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-neutral-800">{appointmentData ? 'Edit Appointment' : 'Book New Appointment'}</h2>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 rounded-full transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          <form id="add-appointment-form" onSubmit={handleSubmit} className="space-y-6">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Select Patient*</label>
                <select
                  className="w-full"
                  onChange={(e) => {
                    const p = patients.find(pat => pat.id === e.target.value);
                    setFormData({ ...formData, patientId: p.id, patientName: `${p.firstName} ${p.lastName}` });
                  }}
                  required
                >
                  <option value="">Select Patient</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientID})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Select Doctor*</label>
                <select
                  className="w-full"
                  value={formData.doctorName}
                  onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                  required
                >
                  <option value="">Select Doctor</option>
                  {doctors.map(d => <option key={d.id} value={d.name}>Dr. {d.name} ({d.description})</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Date*</label>
                <input
                  type="date"
                  className="w-full"
                  value={formData.appointmentDate}
                  onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Time*</label>
                <input
                  type="time"
                  className="w-full"
                  value={formData.appointmentTime}
                  onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Treatment Type</label>
              <input
                type="text"
                className="w-full"
                placeholder="e.g. Consultation, Therapy"
                value={formData.treatmentType}
                onChange={(e) => setFormData({ ...formData, treatmentType: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Special Instructions/Notes</label>
              <textarea
                className="w-full min-h-[100px]"
                placeholder="Enter any special instructions or notes here..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-3 sticky bottom-0 z-10">
          <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="add-appointment-form" className="btn-primary" disabled={loading}>
            {loading ? "Processing..." : appointmentData ? "Update Appointment" : "Confirm Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddAppointment;