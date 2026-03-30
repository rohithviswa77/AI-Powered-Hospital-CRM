import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, addDoc, updateDoc, doc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

const AddFollowUp = ({ onClose, editData, prefilledLeadId, prefilledLeadName, prefilledDepartment }) => {
  const { userProfile } = useAuth();
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
    priority: 'Normal',
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

    const isLeadStaff = userProfile?.role === 'Lead-staff';
    const isManager = userProfile?.role === 'Manager';
    const isRestrictedEdit = !!editData && isLeadStaff;
    const isViewOnly = isManager; // Manager is strictly view-only everywhere 

    return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm overflow-y-auto">
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
                disabled={isRestrictedEdit || isViewOnly}
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
                  disabled={!!prefilledLeadId || isRestrictedEdit || isViewOnly} // Lock dropdown if opened from a specific lead drawer OR restricted
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
                <select name="assignedTo" value={formData.assignedTo} onChange={handleChange} required disabled={isRestrictedEdit || isViewOnly}>
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
                <select name="followupCategory" value={formData.followupCategory} onChange={handleChange} required disabled={isRestrictedEdit || isViewOnly}>
                  <option value="" disabled>Select Method</option>
                  {followUpCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} disabled={isViewOnly}>
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
                  disabled={isRestrictedEdit || isViewOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Priority*</label>
                <select name="priority" value={formData.priority} onChange={handleChange} required disabled={isRestrictedEdit || isViewOnly}>
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                </select>
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
                  disabled={isRestrictedEdit || isViewOnly}
                ></textarea>
              </div>
            </form>
          </div>

          {!isViewOnly && (
            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex justify-end sticky bottom-0 z-10">
              <button
                type="submit"
                form="add-followup-form"
                disabled={loading}
                className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Saving...' : editData ? 'Update Task' : 'Add Task'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
};

export default AddFollowUp;