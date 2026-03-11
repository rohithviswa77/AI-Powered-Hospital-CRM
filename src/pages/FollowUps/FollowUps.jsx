import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import AddFollowUp from './AddFollowUp';

const LOCATIONS = ["All location", "Koyilandy", "Payyannur", "Chengannur"];

export default function FollowUps() {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('All location');
  const [searchTerm, setSearchTerm] = useState('');

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
      console.error("Error fetching follow-ups:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this follow-up?")) {
      try {
        await deleteDoc(doc(db, "followups", id));
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Failed to delete follow-up.");
      }
    }
  };

  const filteredFollowUps = useMemo(() => {
    return followUps.filter(f => {
      const matchesLocation = selectedLocation === 'All location' ||
        f.department === selectedLocation;

      const matchesSearch =
        f.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.leadName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.customerLead?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesLocation && matchesSearch;
    });
  }, [followUps, selectedLocation, searchTerm]);

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
            className="w-full sm:max-w-[180px]"
          >
            {LOCATIONS.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          <button className="btn-primary whitespace-nowrap" onClick={() => setShowAddForm(true)}>
            + Add Follow Up
          </button>
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
                  <tr key={f.id} className="hover:bg-neutral-50 transition-colors">
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
                          onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }}
                          title="Delete Task"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-neutral-900 break-words">{f.title}</td>
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