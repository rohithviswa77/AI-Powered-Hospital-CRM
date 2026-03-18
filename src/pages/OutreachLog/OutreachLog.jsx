import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import AddOutreachLog from './AddOutreachLog';
import { toast } from 'react-toastify';

export default function OutreachLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Location filter state
  const [selectedLocation, setSelectedLocation] = useState('All location');
  const locations = ["All location", "Koyilandy", "Payyannur", "Chengannur"];

  useEffect(() => {
    // Fetches interactions ordered by the most recent entry
    const q = query(collection(db, "outreachLogs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      toast.error("Error fetching outreach logs: " + error.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Optimized Filtering Logic ---
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (selectedLocation === 'All location') return true;
      // Filters based on the department field inherited from the patient/lead
      return log.department === selectedLocation;
    });
  }, [logs, selectedLocation]);

  return (
    <div className="animate-fade-in w-full max-w-full overflow-hidden">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="page-title mb-1">Patient Outreach Logs</h1>
          <p className="text-sm font-medium text-neutral-500">AI-summarized patient interactions and enquiries.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full sm:max-w-[180px]"
          >
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <button className="btn-primary whitespace-nowrap" onClick={() => setShowAddForm(true)}>
            + Log New Interaction
          </button>
        </div>
      </header>

      {showAddForm && <AddOutreachLog onClose={() => setShowAddForm(false)} />}

      <div className="card border-neutral-200">
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full text-left whitespace-nowrap lg:whitespace-normal min-w-max">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="w-32 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Date</th>
                <th className="w-48 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Patient/Lead</th>
                <th className="w-40 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Outcome</th>
                <th className="min-w-64 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">AI Smart Summary</th>
                <th className="w-40 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Staff Member</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-neutral-500 font-medium">Loading logs...</td></tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-neutral-600">{log.createdAt?.toDate().toLocaleDateString() || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-neutral-900 break-words">{log.personName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider
                        ${log.outcome?.toLowerCase().includes('interested') && !log.outcome?.toLowerCase().includes('not') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : ''}
                        ${log.outcome?.toLowerCase().includes('pending') ? 'bg-amber-50 text-amber-700 border border-amber-200' : ''}
                        ${log.outcome?.toLowerCase().includes('not') ? 'bg-red-50 text-red-700 border border-red-200' : ''}
                      `}>
                        {log.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-700 italic leading-relaxed max-w-md break-words">
                      <span className="text-purple-500 mr-1 inline-block -translate-y-px"></span> {log.aiSummary || "No summary generated"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-neutral-500 break-words">{log.staffName}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-neutral-500 font-medium italic">
                    No outreach interactions found for {selectedLocation}.
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