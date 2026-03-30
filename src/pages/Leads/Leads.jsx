import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebaseConfig';
import {
  collection, onSnapshot, query, orderBy,
  doc, deleteDoc, updateDoc, setDoc, serverTimestamp,
  where, getDocs, deleteField
} from 'firebase/firestore';
import AddLead from './AddLead';
import LeadsKanban from './LeadsKanban';
import LeadProfileDrawer from './LeadProfileDrawer';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';

const TAMIL_MALAYALAM_NAMES = [
  { f: 'Murugan', l: 'Pillai' }, { f: 'Karthik', l: 'Raj' }, { f: 'Anand', l: 'Nair' },
  { f: 'Saravanan', l: 'Iyer' }, { f: 'Senthil', l: 'Kumar' }, { f: 'Ramesh', l: 'Menon' },
  { f: 'Sivakumar', l: 'Panicker' }, { f: 'Prakash', l: 'Varghese' }, { f: 'Balaji', l: 'Thomas' },
  { f: 'Aravind', l: 'Swamy' }, { f: 'Ashok', l: 'Reddy' }, { f: 'Vignesh', l: 'Rao' },
  { f: 'Dhanush', l: 'Gounder' }, { f: 'Surya', l: 'Thevar' }, { f: 'Madhavan', l: 'Nambiar' },
  { f: 'Prithviraj', l: 'Sukumaran' }, { f: 'Dulquer', l: 'Salmaan' }, { f: 'Fahadh', l: 'Faasil' },
  { f: 'Nivin', l: 'Pauly' }, { f: 'Tovino', l: 'Thomas' }, { f: 'Vijay', l: 'Sethupathi' },
  { f: 'Kamal', l: 'Haasan' }, { f: 'Rajini', l: 'Kanth' }, { f: 'Ajith', l: 'Kumar' }
];


const LOCATIONS = ["All location", "Koyilandy", "Payyannur", "Chengannur"];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All location');
  const [selectedLifeStage, setSelectedLifeStage] = useState('All stages');
  const [viewMode, setViewMode] = useState('kanban'); // 'table' | 'kanban'
  const [deletingLeadId, setDeletingLeadId] = useState(null);
  const { userProfile } = useAuth();

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
    if (lead.lifeStage === "Converted") {
      toast.info("Lead is already converted!");
      return;
    }
    
    // Optimistic UI update
    setLeads(prevLeads => prevLeads.map(l => 
      l.id === lead.id ? { ...l, lifeStage: 'Converted' } : l
    ));

    try {
      await updateDoc(doc(db, "leads", lead.id), { lifeStage: 'Converted' });
      
      const patientRef = doc(db, "patients", lead.id);
      const newPatientID = lead.patientID || `PAT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      await setDoc(patientRef, {
        ...lead,
        patientID: newPatientID,
        lifeStage: "Converted",
        patientStatus: "Active",
        convertedAt: serverTimestamp()
      });

      if (!lead.patientID) {
        await updateDoc(doc(db, "leads", lead.id), { patientID: newPatientID });
      }

      // SYNC: Update all outreach logs to reflecting 'Patient' status
      const outreachQuery = query(collection(db, "outreachLogs"), where("personId", "==", lead.id));
      const outreachSnap = await getDocs(outreachQuery);
      const outreachPromises = outreachSnap.docs.map(logDoc => 
        updateDoc(logDoc.ref, { personType: 'Patient' })
      );
      await Promise.all(outreachPromises);
      
      toast.success(`Successfully converted!`);
    } catch (error) {
      toast.error("Error converting lead: " + error.message);
    }
  };

  const handleDelete = async (leadId) => {
    try {
      await deleteDoc(doc(db, "leads", leadId));
      toast.success("Lead record deleted successfully.");
      setDeletingLeadId(null);
      if (viewingProfile?.id === leadId) setViewingProfile(null);
    } catch (error) {
      toast.error("Error deleting lead: " + error.message);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    if (userProfile?.role === 'Manager') return; // Strict View-Only for Manager
    const { source, destination, draggableId } = result;

    if (source.droppableId !== destination.droppableId) {
      const newStage = destination.droppableId;
      const lead = leads.find(l => l.id === draggableId);
      
      // Optimistic UI update
      setLeads(prevLeads => prevLeads.map(l => 
        l.id === draggableId ? { ...l, lifeStage: newStage } : l
      ));

      try {
        await updateDoc(doc(db, "leads", draggableId), { lifeStage: newStage });
        
        if (newStage === 'Converted') {
          // Add or update to Patients collection (no confirm needed)
          const patientRef = doc(db, "patients", lead.id);
          const newPatientID = lead.patientID || `PAT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
          
          await setDoc(patientRef, {
            ...lead,
            patientID: newPatientID,
            lifeStage: "Converted",
            patientStatus: "Active",
            convertedAt: serverTimestamp()
          });

          // Also save the patientID back to the lead so it's consistent if they drag it out and back in
          if (!lead.patientID) {
            await updateDoc(doc(db, "leads", lead.id), { patientID: newPatientID });
          }

          // SYNC: Update all outreach logs to reflect 'Patient' status
          const outreachQuery = query(collection(db, "outreachLogs"), where("personId", "==", lead.id));
          const outreachSnap = await getDocs(outreachQuery);
          const outreachPromises = outreachSnap.docs.map(logDoc => 
            updateDoc(logDoc.ref, { personType: 'Patient' })
          );
          await Promise.all(outreachPromises);
          
          toast.success(`Synced to Patients list!`);
        } else if (newStage === 'Lost') {
          // Auto-complete all open follow-ups
          const followUpQuery = query(collection(db, "followups"), where("customerLead", "==", lead.id));
          const followUpSnap = await getDocs(followUpQuery);
          
          const completionPromises = followUpSnap.docs
            .filter(doc => doc.data().status !== 'Completed')
            .map(docRef => updateDoc(docRef.ref, { 
              status: 'Completed',
              autoCompletedOnLost: true,
              previousStatus: docRef.data().status
            }));
            
          await Promise.all(completionPromises);
          
          if (source.droppableId === 'Converted') {
            await deleteDoc(doc(db, "patients", lead.id));
          }
          
          toast.success(`Moved to Lost. Auto-completed active tasks.`);
        } else {
          // If moved OUT of Converted, remove from Patients collection
          if (source.droppableId === 'Converted') {
            await deleteDoc(doc(db, "patients", lead.id));
            toast.info(`Removed from Patients list.`);
          } 
          
          // If moved OUT of Lost, Re-open auto-completed tasks
          if (source.droppableId === 'Lost') {
            const followUpQuery = query(collection(db, "followups"), where("customerLead", "==", lead.id));
            const followUpSnap = await getDocs(followUpQuery);
            
            const reopenPromises = followUpSnap.docs
              .filter(doc => doc.data().autoCompletedOnLost === true)
              .map(docRef => updateDoc(docRef.ref, { 
                status: docRef.data().previousStatus || 'Open',
                autoCompletedOnLost: deleteField(),
                previousStatus: deleteField()
              }));
              
            await Promise.all(reopenPromises);
            toast.success(`Restored active tasks.`);
          } else {
            toast.success(`Moved to ${newStage}`);
          }
        }
      } catch (err) {
        toast.error("Failed to move lead. " + err.message);
      }
    }
  };

  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      toast.warning("No leads available to export.");
      return;
    }
    const exportData = filteredLeads.map(lead => ({
      ID: lead.contactID,
      Date: lead.createdAt?.toDate().toLocaleDateString() || 'N/A',
      FirstName: lead.firstName,
      LastName: lead.lastName,
      Category: lead.leadCategory,
      Priority: lead.priority || 'Normal',
      Mobile: lead.mobile,
      AssignedTo: lead.assignedTo || 'Unassigned',
      LifeStage: lead.lifeStage,
      Location: lead.department
    }));
    
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads_export_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    if (filteredLeads.length === 0) {
      toast.warning("No leads available to export.");
      return;
    }
    const doc = new jsPDF();
    doc.text("Leads Report", 14, 15);
    
    const tableColumn = ["ID", "Date", "Name", "Category", "Priority", "Mobile", "Stage"];
    const tableRows = [];

    filteredLeads.forEach(lead => {
      const leadData = [
        lead.contactID,
        lead.createdAt?.toDate().toLocaleDateString() || 'N/A',
        `${lead.firstName} ${lead.lastName}`,
        lead.leadCategory,
        lead.priority || 'Normal',
        lead.mobile,
        lead.lifeStage
      ];
      tableRows.push(leadData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 }
    });
    
    doc.save(`leads_report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Role-Based Access Control
      if (userProfile && ['Lead-staff', 'Staff', 'Doctor'].includes(userProfile.role)) {
        if (lead.assignedTo !== userProfile.name) return false;
      }

      const matchesLocation = selectedLocation === 'All location' || lead.department === selectedLocation;
      const matchesStage = selectedLifeStage === 'All stages' || lead.lifeStage === selectedLifeStage;
      const fullName = `${lead.firstName} ${lead.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
        lead.contactID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.mobile?.includes(searchTerm);
      return matchesLocation && matchesStage && matchesSearch;
    });
  }, [leads, selectedLocation, selectedLifeStage, searchTerm, userProfile]);

  const stats = useMemo(() => {
    return {
      total: filteredLeads.length,
      highPriority: filteredLeads.filter(l => l.priority === 'High' && l.lifeStage !== 'Lost').length,
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

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
          
          {/* Hide Global Filters when in Kanban mode */}
          {viewMode === 'table' && (
            <>
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
                className="w-full sm:max-w-[130px]"
              >
                {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>

              <select
                value={selectedLifeStage}
                onChange={(e) => setSelectedLifeStage(e.target.value)}
                className="w-full sm:max-w-[130px]"
              >
                <option value="All stages">All Stages</option>
                <option value="New Enquiry">New Enquiry</option>
                <option value="Contacted">Contacted</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </select>
            </>
          )}

          {/* View Toggle */}
          <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 ml-2">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                viewMode === 'kanban' ? 'bg-white shadow-sm text-primary-700' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-white shadow-sm text-primary-700' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Table
            </button>
          </div>

          <div className="flex gap-2 ml-auto md:ml-2">
            <button 
              onClick={handleExportCSV}
              className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1 border border-neutral-200"
              title="Export to CSV"
            >
              CSV
            </button>
            <button 
              onClick={handleExportPDF}
              className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1 border border-neutral-200"
              title="Export to PDF"
            >
              PDF
            </button>
            {userProfile?.role !== 'Lead-staff' && userProfile?.role !== 'Manager' && (
              <button className="btn-primary whitespace-nowrap ml-1" onClick={() => setShowAddForm(true)}>+ Add Lead</button>
            )}
          </div>
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

      {viewingProfile && (
        <LeadProfileDrawer 
          lead={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onEditLead={(lead) => setEditingLead(lead)}
          onDeleteLead={(lead) => setDeletingLeadId(lead.id)}
        />
      )}

      {viewMode === 'kanban' ? (
        <LeadsKanban 
          leads={filteredLeads} 
          onDragEnd={handleDragEnd} 
          onLeadClick={(lead) => setViewingProfile(lead)} 
          isDragDisabled={userProfile?.role === 'Manager'}
        />
      ) : (
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
                  <tr key={lead.id} className="hover:bg-neutral-50 transition-colors cursor-pointer" onClick={() => setViewingProfile(lead)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {userProfile?.role !== 'Manager' && (
                          <button
                            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                            onClick={(e) => { e.stopPropagation(); setEditingLead(lead); }}
                            title="Edit Lead"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </button>
                        )}
                        {userProfile?.role !== 'Manager' && (
                          <button
                            className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                            onClick={(e) => { e.stopPropagation(); handleConvertToPatient(lead); }}
                            title="Move to Patients"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                          </button>
                        )}
                        {!['Lead-staff', 'Doctor', 'Receptionist', 'Manager'].includes(userProfile?.role) && (
                          <button
                            className="p-1.5 text-red-600 bg-red-50 hover:bg-neutral-100 rounded-md transition-colors"
                            onClick={(e) => { e.stopPropagation(); setDeletingLeadId(lead.id); }}
                            title="Delete Lead"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        )}
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
                      {lead.lifeStage !== 'Lost' ? (
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold
                          ${lead.priority === 'High' ? 'bg-red-100 text-red-700' : ''}
                          ${lead.priority === 'Normal' ? 'bg-yellow-100 text-yellow-700' : ''}
                          ${lead.priority === 'Low' ? 'bg-green-100 text-green-700' : ''}
                          ${!['High', 'Normal', 'Low'].includes(lead.priority) ? 'bg-blue-50 text-blue-700' : ''}
                        `}>
                          {lead.priority || 'Low'}
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-xs">—</span>
                      )}
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
      )}
      <DeleteConfirmationModal 
        isOpen={!!deletingLeadId}
        title="Delete Lead Record"
        message="Are you sure you want to delete this lead? This will remove all their contact history and active enquiries permanently."
        onConfirm={() => handleDelete(deletingLeadId)}
        onCancel={() => setDeletingLeadId(null)}
      />
    </div>
  );
}