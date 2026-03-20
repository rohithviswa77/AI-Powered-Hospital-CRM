import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, addDoc, updateDoc, doc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-toastify';

const AddFollowUp = ({ onClose, editData, prefilledLeadId, prefilledLeadName, prefilledDepartment }) => {
  const [staffMembers, setStaffMembers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [followUpCategories, setFollowUpCategories] = useState([]);

  const [formData, setFormData] = useState(editData || {
    title: '',
    status: 'Open',
    customerLead: prefilledLeadId || '', // This will store the Lead ID
    leadName: prefilledLeadName || '',   // NEW: Added to store the name for the table view
    department: prefilledDepartment || '', // Auto-capture the branch
    assignedTo: '',
    followupCategory: '',
    nextFollowUpDate: '',
    description: '',
    additionalInfo: ''
  });

  const [loading, setLoading] = useState(false);

  // CRITICAL: Force form to update if editData changes while modal is already mounted
  useEffect(() => {
    if (editData) {
      setFormData(editData);
    }
  }, [editData]);

  useEffect(() => {
    const unsubStaff = onSnapshot(collection(db, "staffMembers"), (snapshot) => {
      setStaffMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubLeads = onSnapshot(query(collection(db, "leads"), orderBy("createdAt", "desc")), (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCategories = onSnapshot(collection(db, "followUpCategories"), (snapshot) => {
      setFollowUpCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubStaff(); unsubLeads(); unsubCategories();
    };
  }, []);

  // Helper to find lead details when one is selected
  const handleLeadChange = (e) => {
    const leadId = e.target.value;
    const selectedLead = leads.find(l => l.id === leadId);

    setFormData({
      ...formData,
      customerLead: leadId,
      leadName: selectedLead ? `${selectedLead.firstName} ${selectedLead.lastName}` : '',
      department: selectedLead ? selectedLead.department : '' // Auto-capture the branch
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editData?.id) {
        const docRef = doc(db, "followups", editData.id);
        const updateData = { ...formData };
        delete updateData.id;
        await updateDoc(docRef, updateData);
        toast.success("Follow up updated successfully!");
      } else {
        await addDoc(collection(db, "followups"), {
          ...formData,
          addedOn: new Date().toLocaleDateString(),
          createdAt: serverTimestamp()
        });
        toast.success("Follow up added successfully!");
      }
      onClose();
    } catch (error) {
      toast.error("Error saving follow-up: " + error.message);
      toast.error("Failed to save follow-up.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-3xl my-8 mx-auto animate-slide-up overflow-hidden border border-neutral-100 flex flex-col max-h-[90vh]">

        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-neutral-800">{editData ? 'Edit Follow Up Task' : 'Add Follow Up Task'}</h2>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          <form id="add-followup-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Follow-up Title*</label>
              <input
                type="text"
                name="title"
                placeholder="e.g., Call regarding MRI"
                value={formData.title}
                required
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Customer/Lead*</label>
                <select
                  name="customerLead"
                  value={formData.customerLead}
                  onChange={handleLeadChange}
                  required
                  disabled={!!prefilledLeadId} // Lock dropdown if opened from a specific lead drawer
                >
                  <option value="" disabled>Select Customer/Lead</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.firstName} {lead.lastName} ({lead.mobile}) - {lead.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Assign Task To*</label>
                <select name="assignedTo" value={formData.assignedTo} onChange={handleChange} required>
                  <option value="" disabled>Assign Task To</option>
                  {staffMembers.map(staff => (
                    <option key={staff.id} value={staff.name}>
                      {staff.name} ({staff.location || 'All branches'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Method*</label>
                <select name="followupCategory" value={formData.followupCategory} onChange={handleChange} required>
                  <option value="" disabled>Select Method</option>
                  {followUpCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="Open">Pending</option>
                  <option value="In-Progress">In-Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Next Follow-up Date*</label>
                <input
                  type="date"
                  name="nextFollowUpDate"
                  value={formData.nextFollowUpDate}
                  required
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
              <textarea
                name="description"
                placeholder="Enter conversation notes here..."
                value={formData.description}
                onChange={handleChange}
                rows="3"
              ></textarea>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-3 sticky bottom-0 z-10">
          <button type="button" onClick={onClose} disabled={loading} className="btn-outline">
            Cancel
          </button>
          <button type="submit" form="add-followup-form" disabled={loading} className="btn-success">
            {loading ? 'Processing...' : editData ? 'Update Task' : 'Schedule Follow Up'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddFollowUp;