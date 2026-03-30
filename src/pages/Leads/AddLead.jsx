import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, addDoc, updateDoc, doc, serverTimestamp, onSnapshot, query, orderBy, getDocs, where, writeBatch, deleteDoc, setDoc, deleteField } from 'firebase/firestore';
import { toast } from 'react-toastify';

const AddLead = ({ onClose, leadData }) => {
  const [sources, setSources] = useState([]);
  const [leadCategories, setLeadCategories] = useState([]);
  const [staff, setStaff] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState(leadData || {
    treatmentSought: '',
    contactType: 'Lead',
    prefix: '',
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    leadCategory: '',
    priority: 'Normal',
    source: '',
    lifeStage: '',
    department: '',
    assignedTo: ''
  });

  useEffect(() => {
    const unsubSources = onSnapshot(collection(db, "sources"), (snap) => {
      setSources(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubCategories = onSnapshot(query(collection(db, "leadCategories"), orderBy("name", "asc")), (snap) => {
      setLeadCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubStaff = onSnapshot(collection(db, "staffMembers"), (snap) => {
      setStaff(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubSources(); unsubCategories(); unsubStaff();
    };
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (leadData?.id) {
        const leadRef = doc(db, "leads", leadData.id);
        const updateData = { ...formData };
        delete updateData.id;
        await updateDoc(leadRef, updateData);

        // SYNC FOLLOW-UPS: Propagate name and department changes
        const newLeadName = `${formData.firstName} ${formData.lastName}`;
        const oldLeadName = `${leadData.firstName} ${leadData.lastName}`;
        if (newLeadName !== oldLeadName || formData.department !== leadData.department) {
          const followUpQuery = query(collection(db, "followups"), where("customerLead", "==", leadData.id));
          const followUpSnap = await getDocs(followUpQuery);
          if (!followUpSnap.empty) {
            const batch = writeBatch(db);
            followUpSnap.forEach((fDoc) => {
              batch.update(fDoc.ref, { 
                leadName: newLeadName, 
                department: formData.department 
              });
            });
            await batch.commit();
          }
        }

        // STAGE CHANGE AUTOMATION (Syncs with Drag-and-Drop hooks)
        const oldStage = leadData.lifeStage;
        const newStage = formData.lifeStage;
        
        if (oldStage !== newStage) {
          if (newStage === 'Converted') {
            const patientRef = doc(db, "patients", leadData.id);
            const newPatientID = leadData.patientID || `PAT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            await setDoc(patientRef, {
              ...formData,
              patientID: newPatientID,
              patientStatus: "Active",
              convertedAt: serverTimestamp()
            });
            if (!leadData.patientID) {
              await updateDoc(leadRef, { patientID: newPatientID });
            }
          } else if (newStage === 'Lost') {
            const followUpQuery = query(collection(db, "followups"), where("customerLead", "==", leadData.id));
            const followUpSnap = await getDocs(followUpQuery);
            const batch = writeBatch(db);
            followUpSnap.forEach((fDoc) => {
              if (fDoc.data().status !== 'Completed') {
                batch.update(fDoc.ref, { 
                  status: 'Completed',
                  autoCompletedOnLost: true,
                  previousStatus: fDoc.data().status
                });
              }
            });
            await batch.commit();
            
            if (oldStage === 'Converted') {
              await deleteDoc(doc(db, "patients", leadData.id));
            }
          } else {
            if (oldStage === 'Converted') {
              await deleteDoc(doc(db, "patients", leadData.id));
            }
            if (oldStage === 'Lost') {
              const followUpQuery = query(collection(db, "followups"), where("customerLead", "==", leadData.id));
              const followUpSnap = await getDocs(followUpQuery);
              const batch = writeBatch(db);
              followUpSnap.forEach((fDoc) => {
                if (fDoc.data().autoCompletedOnLost === true) {
                  batch.update(fDoc.ref, { 
                    status: fDoc.data().previousStatus || 'Open',
                    autoCompletedOnLost: deleteField(),
                    previousStatus: deleteField()
                  });
                }
              });
              await batch.commit();
            }
          }
        }

        toast.success("Lead Updated Successfully!");
      } else {
        const newLeadData = {
          ...formData,
          createdAt: serverTimestamp(),
          contactID: `L-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
        };
        await addDoc(collection(db, "leads"), newLeadData);
        toast.success("Lead Added Successfully!");
      }
      onClose();
    } catch (error) {
      toast.error("Error saving lead: " + error.message);
      toast.error("Error saving lead. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-3xl my-8 mx-auto animate-slide-up overflow-hidden border border-white flex flex-col max-h-[90vh]">
        <div className="px-8 py-6 border-b border-neutral-100 bg-white/50 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-neutral-900 to-neutral-600">{leadData ? 'Edit Lead' : 'Register New Lead'}</h2>
            <p className="text-sm font-medium text-neutral-500 mt-1">{leadData ? 'Update lead details.' : 'Capture patient enquiry details.'}</p>
          </div>
          <button onClick={onClose} className="p-2.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors bg-white shadow-sm border border-neutral-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="overflow-y-auto p-8 flex-1 custom-scrollbar">
          <form id="add-lead-form" onSubmit={handleSubmit} className="space-y-7 relative">

            <div className="bg-neutral-50/80 p-6 rounded-2xl border border-neutral-100 shadow-sm">
              <div className="mb-6">
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Treatment/Service Sought *</label>
                <input
                  type="text"
                  name="treatmentSought"
                  placeholder="e.g. Migraine management"
                  value={formData.treatmentSought}
                  onChange={handleChange}
                  required
                  className="text-lg py-3 w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Prefix</label>
                  <select name="prefix" value={formData.prefix} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                    <option value="Dr">Dr</option>
                  </select>
                </div>
                <div className="sm:col-span-5">
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">First Name *</label>
                  <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} required onChange={handleChange} />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Last Name</label>
                  <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-neutral-50/80 p-5 rounded-2xl border border-neutral-100 shadow-sm space-y-5">
                <h4 className="text-sm font-bold text-neutral-800 border-b border-neutral-200 pb-2">Contact Details</h4>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Mobile Number *</label>
                  <input type="tel" name="mobile" placeholder="98765 43210" value={formData.mobile} required onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Email Address</label>
                  <input type="email" name="email" placeholder="email@example.com" value={formData.email} onChange={handleChange} />
                </div>
              </div>

              <div className="bg-neutral-50/80 p-5 rounded-2xl border border-neutral-100 shadow-sm space-y-5">
                <h4 className="text-sm font-bold text-neutral-800 border-b border-neutral-200 pb-2">Tracking Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Category</label>
                    <select name="leadCategory" onChange={handleChange} value={formData.leadCategory}>
                      <option value="">Select</option>
                      {leadCategories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Priority</label>
                    <select name="priority" onChange={handleChange} value={formData.priority}>
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Source *</label>
                    <select name="source" required onChange={handleChange} value={formData.source}>
                      <option value="">Select</option>
                      {sources.map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Life Stage *</label>
                    <select name="lifeStage" required onChange={handleChange} value={formData.lifeStage}>
                      <option value="">Select</option>
                      <option value="New Enquiry">New Enquiry</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Converted">Converted</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-neutral-50/80 p-5 rounded-2xl border border-neutral-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Department/Branch *</label>
                <select name="department" required onChange={handleChange} value={formData.department}>
                  <option value="">Select Location</option>
                  <option value="All location">All location</option>
                  <option value="Koyilandy">Koyilandy</option>
                  <option value="Payyannur">Payyannur</option>
                  <option value="Chengannur">Chengannur</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Assign to Staff</label>
                <select name="assignedTo" onChange={handleChange} value={formData.assignedTo}>
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.name}>{s.name} ({s.location})</option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </div>

        <div className="px-8 py-5 border-t border-neutral-100 bg-white/80 flex justify-end gap-3 sticky bottom-0 z-10 backdrop-blur-md">
          <button type="button" onClick={onClose} className="btn-secondary !px-8" disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" form="add-lead-form" className="btn-primary !px-10" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : leadData ? 'Update Lead' : 'Save Lead'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddLead;