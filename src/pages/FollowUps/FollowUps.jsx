import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, getDoc } from 'firebase/firestore';
import AddFollowUp from './AddFollowUp';
import LeadProfileDrawer from '../Leads/LeadProfileDrawer';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const LOCATIONS = ["All location", "Koyilandy", "Payyannur", "Chengannur"];

export default function FollowUps() {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('All location');
  const [viewTab, setViewTab] = useState('active'); // 'active' | 'completed'
  const [searchTerm, setSearchTerm] = useState('');
  
  const [viewingProfile, setViewingProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [deletingFollowUpId, setDeletingFollowUpId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "followups"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFollowUps(data);
      setLoading(false);
    }, (error) => {
      toast.error("Error fetching follow-ups: " + error.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "followups", id));
      toast.success("Follow-up deleted successfully.");
      setDeletingFollowUpId(null);
    } catch (error) {
      toast.error("Error deleting follow-up: " + error.message);
    }
  };

  const handleExportCSV = () => {
    if (filteredFollowUps.length === 0) {
      toast.warning("No follow-ups available to export.");
      return;
    }
    const exportData = filteredFollowUps.map(f => ({
      Title: f.title,
      LeadName: f.leadName,
      AssignedTo: f.assignedTo,
      Category: f.followupCategory,
      Status: f.status,
      NextFollowUp: f.nextFollowUpDate,
      Description: f.description,
      Location: f.department
    }));
    
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `followups_export_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    if (filteredFollowUps.length === 0) {
      toast.warning("No follow-ups available to export.");
      return;
    }
    const doc = new jsPDF('landscape');
    doc.text("Follow-Ups Report", 14, 15);
    
    const tableColumn = ["Title", "Lead Name", "Assigned To", "Category", "Status", "Next Date", "Location"];
    const tableRows = [];

    filteredFollowUps.forEach(f => {
      const row = [
        f.title,
        f.leadName,
        f.assignedTo || 'Unassigned',
        f.followupCategory,
        f.status,
        f.nextFollowUpDate,
        f.department
      ];
      tableRows.push(row);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 }
    });
    
    doc.save(`followups_report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const filteredFollowUps = useMemo(() => {
    const filtered = followUps.filter(f => {
      const matchesLocation = selectedLocation === 'All location' || f.department === selectedLocation;
        
      const matchesTab = viewTab === 'active' 
        ? f.status !== 'Completed' 
        : f.status === 'Completed';

      const matchesSearch =
        f.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.leadName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.customerLead?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesLocation && matchesTab && matchesSearch;
    });

    // Calculate active balance per lead
    const activeCounts = new Map();
    followUps.forEach(f => {
      if (f.status !== 'Completed') {
        activeCounts.set(f.customerLead, (activeCounts.get(f.customerLead) || 0) + 1);
      }
    });

    // Group by lead so only one row appears per lead
    const map = new Map();
    filtered.forEach(f => {
      if (!map.has(f.customerLead)) {
        map.set(f.customerLead, { ...f, taskBalance: activeCounts.get(f.customerLead) || 0 });
      }
    });

    return Array.from(map.values());
  }, [followUps, selectedLocation, viewTab, searchTerm]);

  const handleRowClick = async (leadId) => {
    if (!leadId) return;
    setLoadingProfile(true);
    try {
      let snap = await getDoc(doc(db, "leads", leadId));
      if (!snap.exists()) {
        snap = await getDoc(doc(db, "patients", leadId)); // Check if transitioned
      }
      
      if (snap.exists()) {
        setViewingProfile({ id: snap.id, ...snap.data() });
      } else {
        toast.warning("Lead record no longer exists or was deleted.");
      }
    } catch (e) {
      toast.error("Failed to load profile details.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const stats = useMemo(() => {
    return {
      total: filteredFollowUps.length,
      active: filteredFollowUps.filter(f => f.status !== 'Completed').length,
      completed: filteredFollowUps.filter(f => f.status === 'Completed').length,
      outreach: filteredFollowUps.filter(f =>
        f.followupCategory?.toLowerCase().includes('call') ||
        f.followupCategory?.toLowerCase().includes('outreach')
      ).length
    };
  }, [filteredFollowUps]);

  return (
    <div className="animate-fade-in w-full max-w-full overflow-hidden">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="page-title mb-1">Follow Ups Management</h1>
          <p className="text-sm font-medium text-neutral-500">Manage and track customer interactions</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search title, name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-xs"
          />

          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full sm:max-w-[130px]"
          >
            {LOCATIONS.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200">
            <button
              onClick={() => setViewTab('active')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                viewTab === 'active' ? 'bg-white shadow-sm text-primary-700' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setViewTab('completed')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                viewTab === 'completed' ? 'bg-white shadow-sm text-primary-700' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Completed History
            </button>
          </div>

          <div className="flex gap-2">
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
            <button className="btn-primary whitespace-nowrap ml-1" onClick={() => setShowAddForm(true)}>
              + Add Follow Up
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Tasks" value={stats.total} />
        <StatCard title="Active" value={stats.active} type="open" />
        <StatCard title="Outreach/Calls" value={stats.outreach} type="call" />
        <StatCard title="Completed" value={stats.completed} type="done" />
      </section>

      {(showAddForm || editingFollowUp) && (
        <AddFollowUp
          editData={editingFollowUp}
          onClose={() => {
            setShowAddForm(false);
            setEditingFollowUp(null);
          }}
        />
      )}

      {viewingProfile && (
        <LeadProfileDrawer 
          lead={viewingProfile}
          onClose={() => setViewingProfile(null)}
          // Not passing onEditLead here since we are in FollowUps and not Leads page
        />
      )}

      {loadingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      <div className="card border-neutral-200">
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full text-left whitespace-nowrap lg:whitespace-normal min-w-max">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="w-16 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Action</th>
                <th className="w-48 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Title</th>
                <th className="w-40 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Lead Name</th>
                <th className="w-36 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Assigned To</th>
                <th className="w-32 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Category</th>
                <th className="w-32 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="w-32 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Next Follow Up</th>
                <th className="min-w-64 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr><td colSpan="8" className="p-8 text-center text-neutral-500 font-medium">Loading data...</td></tr>
              ) : filteredFollowUps.length > 0 ? (
                filteredFollowUps.map((f) => (
                  <tr 
                    key={f.id} 
                    className="hover:bg-neutral-50 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(f.customerLead)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          onClick={(e) => { e.stopPropagation(); setEditingFollowUp(f); }}
                          title="Edit Task"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                          onClick={(e) => { e.stopPropagation(); setDeletingFollowUpId(f.id); }}
                          title="Delete Task"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-neutral-900 break-words">
                      {f.title}
                      {f.taskBalance > 1 && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary-50 text-primary-700 border border-primary-200 uppercase tracking-widest whitespace-nowrap">
                          {f.taskBalance - 1} More Task{f.taskBalance > 2 ? 's' : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-700 break-words">{f.leadName}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{f.assignedTo}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-neutral-100 text-neutral-700 px-2 py-1 rounded text-xs font-medium border border-neutral-200">
                        {f.followupCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                        ${f.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                        ${f.status === 'In-Progress' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                        ${f.status === 'Open' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                        ${!['Completed', 'In-Progress', 'Open'].includes(f.status) ? 'bg-neutral-100 border-neutral-200 text-neutral-800' : ''}
                      `}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{f.nextFollowUpDate}</td>
                    <td className="px-4 py-3 text-sm text-neutral-500 truncate max-w-xs">{f.description}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-neutral-500 font-medium italic">
                    No records found for {selectedLocation}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={!!deletingFollowUpId}
        title="Delete Follow-up Task"
        message="Are you sure you want to permanently delete this task? This will remove all associated logs and history for this lead interaction."
        onConfirm={() => handleDelete(deletingFollowUpId)}
        onCancel={() => setDeletingFollowUpId(null)}
      />
    </div>
  );
}

function StatCard({ title, value, type }) {
  const getBorderColor = () => {
    switch (type) {
      case 'open': return 'border-l-amber-500';
      case 'call': return 'border-l-blue-500';
      case 'done': return 'border-l-emerald-500';
      default: return 'border-l-primary-500';
    }
  };

  return (
    <div className={`card p-5 border-l-4 ${getBorderColor()}`}>
      <div>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">{title}</h3>
        <p className="text-3xl font-bold text-neutral-900">{value}</p>
      </div>
    </div>
  );
}