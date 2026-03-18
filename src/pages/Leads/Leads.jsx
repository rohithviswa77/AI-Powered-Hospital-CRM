import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebaseConfig';
import {
  collection, onSnapshot, query, orderBy,
  doc, deleteDoc, setDoc, serverTimestamp,
  where, getDocs
} from 'firebase/firestore';
import AddLead from './AddLead';
import { toast } from 'react-toastify';


const LOCATIONS = ["All location", "Koyilandy", "Payyannur", "Chengannur"];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All location');

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      toast.error("Error fetching leads: " + error.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleConvertToPatient = async (lead) => {
    const confirmMsg = `Convert ${lead.firstName} to a Patient? \n\nThis will: \n1. Generate a new Patient ID \n2. Remove associated follow-ups \n3. Remove from leads list.`;

    if (window.confirm(confirmMsg)) {
      try {
        const newPatientID = `PAT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const patientRef = doc(db, "patients", lead.id);

        await setDoc(patientRef, {
          ...lead,
          patientID: newPatientID,
          lifeStage: "Converted",
          patientStatus: "Active",
          convertedAt: serverTimestamp()
        });

        const followUpQuery = query(
          collection(db, "followups"),
          where("customerLead", "==", lead.id)
        );
        const followUpSnap = await getDocs(followUpQuery);
        const deleteFollowUps = followUpSnap.docs.map(fDoc => deleteDoc(fDoc.ref));
        await Promise.all(deleteFollowUps);

        await deleteDoc(doc(db, "leads", lead.id));
        toast.success(`Successfully converted! New Patient ID: ${newPatientID}`);
      } catch (error) {
        toast.error("Error converting lead: " + error.message);
        toast.error("Failed to complete conversion.");
      }
    }
  };

  const handleDelete = async (leadId) => {
    if (window.confirm("Are you sure you want to delete this lead?")) {
      try {
        await deleteDoc(doc(db, "leads", leadId));
        toast.success("Lead record deleted successfully.");
      } catch (error) {
        toast.error("Error deleting lead: " + error.message);
      }
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesLocation = selectedLocation === 'All location' || lead.department === selectedLocation;
      const fullName = `${lead.firstName} ${lead.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
        lead.contactID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.mobile?.includes(searchTerm);
      return matchesLocation && matchesSearch;
    });
  }, [leads, selectedLocation, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: filteredLeads.length,
      highPriority: filteredLeads.filter(l => l.priority === 'High').length,
      newEnquiry: filteredLeads.filter(l => l.lifeStage === 'New Enquiry').length
    };
  }, [filteredLeads]);

  return (
    <div className="animate-fade-in w-full max-w-full overflow-hidden">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="page-title mb-1">Patient Leads</h1>
          <p className="text-sm font-medium text-neutral-500">Manage and track potential patient enquiries</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search name, ID or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-xs"
          />

          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full sm:max-w-[180px]"
          >
            {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>

          <button className="btn-primary whitespace-nowrap" onClick={() => setShowAddForm(true)}>+ Add Lead</button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-5 border-l-4 border-l-primary-500">
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">Total Leads</h3>
          <p className="text-3xl font-bold text-neutral-900">{stats.total}</p>
        </div>
        <div className="card p-5 border-l-4 border-l-red-500">
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">High Priority</h3>
          <p className="text-3xl font-bold text-neutral-900">{stats.highPriority}</p>
        </div>
        <div className="card p-5 border-l-4 border-l-blue-500">
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">New Enquiries</h3>
          <p className="text-3xl font-bold text-neutral-900">{stats.newEnquiry}</p>
        </div>
      </section>

      {(showAddForm || editingLead) && (
        <AddLead
          leadData={editingLead}
          onClose={() => { setShowAddForm(false); setEditingLead(null); }}
        />
      )}

      <div className="card border-neutral-200">
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full text-left whitespace-nowrap lg:whitespace-normal min-w-max">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="w-16 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Action</th>
                <th className="w-24 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Date</th>
                <th className="w-24 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">ID</th>
                <th className="w-40 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Name</th>
                <th className="w-36 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Category</th>
                <th className="w-28 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Priority</th>
                <th className="w-32 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Mobile</th>
                <th className="w-36 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Assigned To</th>
                <th className="w-32 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Life Stage</th>
                <th className="w-32 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Branch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr><td colSpan="10" className="p-8 text-center text-neutral-500 font-medium">Loading leads...</td></tr>
              ) : filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          onClick={(e) => { e.stopPropagation(); setEditingLead(lead); }}
                          title="Edit Lead"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button
                          className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleConvertToPatient(lead); }}
                          title="Move to Patients"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                        </button>
                        <button
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }}
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{lead.createdAt?.toDate().toLocaleDateString() || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded font-mono text-xs border border-neutral-200">
                        {lead.contactID}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-neutral-900 break-words">{`${lead.firstName} ${lead.lastName}`}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600 break-words">{lead.leadCategory}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold
                        ${lead.priority === 'High' ? 'bg-red-100 text-red-700' : ''}
                        ${lead.priority === 'Urgent' ? 'bg-rose-500 text-white' : ''}
                        ${lead.priority === 'Low' ? 'bg-green-100 text-neutral-700' : ''}
                        ${lead.priority === 'Normal' || !['High', 'Urgent', 'Low'].includes(lead.priority) ? 'bg-blue-50 text-blue-700' : ''}
                      `}>
                        {lead.priority || 'Normal'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{lead.mobile}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600 break-words">{lead.assignedTo || 'Unassigned'}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600 break-words">{lead.lifeStage}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600 break-words">{lead.department}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="10" className="p-8 text-center text-neutral-500 font-medium">No leads found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}