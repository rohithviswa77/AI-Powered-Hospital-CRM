import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import AddPatient from './AddPatient';
import PatientHistory from './PatientHistory';

const LOCATIONS = ["All location", "Koyilandy", "Payyannur", "Chengannur"];

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('All location');
  const [searchTerm, setSearchTerm] = useState('');
  const [showHistoryFor, setShowHistoryFor] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "patients"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching patients:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Replaced click outside effect directly into the new fixed-position effect above.

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this patient record?")) {
      try {
        await deleteDoc(doc(db, "patients", id));
      } catch (error) {
        console.error("Error deleting patient:", error);
        alert("Failed to delete record.");
      }
    }
  };

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchesLocation = selectedLocation === 'All location' || p.department === selectedLocation;
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
        p.patientID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.mobile?.includes(searchTerm);
      return matchesLocation && matchesSearch;
    });
  }, [patients, selectedLocation, searchTerm]);

  return (
    <div className="animate-fade-in w-full max-w-full overflow-hidden">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="page-title mb-1">Patient Records</h1>
          <p className="text-sm font-medium text-neutral-500">Clinical database and medical history</p>
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

          <button onClick={() => setShowAddForm(true)} className="btn-primary whitespace-nowrap">
            + Register Patient
          </button>
        </div>
      </header>

      {(showAddForm || editingPatient) && (
        <AddPatient
          patientData={editingPatient}
          onClose={() => {
            setShowAddForm(false);
            setEditingPatient(null);
          }}
        />
      )}

      {showHistoryFor && (
        <PatientHistory
          patientId={showHistoryFor.id}
          patientName={`${showHistoryFor.firstName} ${showHistoryFor.lastName}`}
          onClose={() => setShowHistoryFor(null)}
        />
      )}

      <div className="card border-neutral-200">
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full text-left whitespace-nowrap lg:whitespace-normal min-w-max">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="w-16 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Action</th>
                <th className="w-24 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Patient ID</th>
                <th className="w-40 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Name</th>
                <th className="w-32 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Gender/Age</th>
                <th className="w-32 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Mobile</th>
                <th className="w-40 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Assigned Doctor</th>
                <th className="min-w-64 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Chief Complaint</th>
                <th className="w-32 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Branch</th>
                <th className="w-24 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr><td colSpan="9" className="p-8 text-center text-neutral-500 font-medium">Loading patient database...</td></tr>
              ) : filteredPatients.length > 0 ? (
                filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          onClick={(e) => { e.stopPropagation(); setEditingPatient(p); }}
                          title="Edit Patient"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button
                          className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                          onClick={(e) => { e.stopPropagation(); setShowHistoryFor(p); }}
                          title="View History"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </button>
                        <button
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded font-mono text-xs border border-neutral-200">
                        {p.patientID}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-neutral-900 break-words">{`${p.firstName} ${p.lastName}`}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{p.gender} / {p.age}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{p.mobile}</td>
                    <td className="px-4 py-3 text-sm font-medium text-primary-600 break-words">{p.assignedDoctor || 'Unassigned'}</td>
                    <td className="px-4 py-3 text-sm text-neutral-500 truncate max-w-xs">{p.chiefComplaint || '-'}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600 break-words">{p.department}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-neutral-500 font-medium italic">No records found for {selectedLocation}.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Patients;