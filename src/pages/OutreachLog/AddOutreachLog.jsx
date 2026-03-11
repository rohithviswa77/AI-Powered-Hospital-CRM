import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from "react-toastify";

const AddOutreachLog = ({ onClose }) => {
  const [people, setPeople] = useState([]); // Combined Leads and Patients
  const [staff, setStaff] = useState([]);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const [formData, setFormData] = useState({
    personId: '',
    personName: '',
    outcome: 'Interested',
    rawNotes: '',
    aiSummary: '',
    staffName: '',
    department: '' // Critical for branch filtering
  });

  useEffect(() => {
    // 1. Fetch Leads and Patients simultaneously
    const unsubLeads = onSnapshot(collection(db, "leads"), (snap) => {
      const leads = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'Lead' }));
      const unsubPatients = onSnapshot(collection(db, "patients"), (pSnap) => {
        const patients = pSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'Patient' }));
        setPeople([...leads, ...patients]);
      });
    });

    // 2. Fetch Staff
    const unsubStaff = onSnapshot(collection(db, "staffMembers"), (snap) => {
      setStaff(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubLeads(); unsubStaff(); };
  }, []);

  const handleSummarize = async () => {
    if (!formData.rawNotes) {
      toast.warning("Please enter conversation notes first.");
      return;
    }

    setIsSummarizing(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

      // Updated directly to gemini-2.5-flash as requested
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `Summarize this clinical outreach call notes into one short, professional clinical sentence: ${formData.rawNotes}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setFormData({ ...formData, aiSummary: text.trim() });
      toast.success("AI Summarization Complete!");
    } catch (error) {
      toast.error("AI Summarization failed: " + error.message);
      toast.error(`AI Error: ${error.message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "outreachLogs"), {
        ...formData,
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
      console.error("Error saving log:", error);
      alert("Failed to save the outreach log.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl my-8 mx-auto animate-slide-up overflow-hidden border border-neutral-100 flex flex-col max-h-[90vh]">

        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-neutral-800">Log Outreach Interaction</h2>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 rounded-full transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          <form id="add-outreach-form" onSubmit={handleSubmit} className="space-y-6">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Combined Leads/Patients Dropdown */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Select Patient/Lead*</label>
                <select
                  className="w-full"
                  onChange={(e) => {
                    const p = people.find(item => item.id === e.target.value);
                    if (p) setFormData({ ...formData, personId: p.id, personName: `${p.firstName} ${p.lastName}`, department: p.department || 'Unassigned' });
                  }}
                  required
                >
                  <option value="">Select Patient/Lead</option>
                  {people.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.type})</option>
                  ))}
                </select>
              </div>

              {/* Staff Dropdown */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Conducted By (Staff)*</label>
                <select
                  className="w-full"
                  value={formData.staffName}
                  onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                  required
                >
                  <option value="">Select Staff</option>
                  {staff.map(s => <option key={s.id} value={s.name}>{s.name} ({s.location})</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Interaction Outcome</label>
              <select
                className="w-full"
                value={formData.outcome}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
              >
                <option value="Interested">Interested / Consultation Booked</option>
                <option value="Pending">Pending / Callback Requested</option>
                <option value="Not Interested">Not Interested</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Conversation Notes</label>
              <textarea
                className="w-full min-h-[100px]"
                placeholder="Type raw notes from the conversation here..."
                value={formData.rawNotes}
                onChange={(e) => setFormData({ ...formData, rawNotes: e.target.value })}
                rows="4"
              />
            </div>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all border border-dashed text-primary-600 bg-primary-50 border-primary-200 hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSummarize}
              disabled={isSummarizing || !formData.rawNotes}
            >
              <span className="text-lg leading-none -mt-1"></span>
              {isSummarizing ? "AI Summarizing..." : "Generate Smart Summary"}
            </button>

            {formData.aiSummary && (
              <div className="bg-primary-50/50 border-l-4 border-primary-500 rounded-r-xl p-4 animate-fade-in shadow-sm">
                <p className="text-xs font-bold text-primary-900 uppercase tracking-wider mb-2">AI Smart Summary</p>
                <p className="text-sm font-medium text-primary-950 leading-relaxed">{formData.aiSummary}</p>
              </div>
            )}

          </form>
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-3 sticky bottom-0 z-10">
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" form="add-outreach-form" className="btn-primary">Save Interaction</button>
        </div>
      </div>
    </div>
  );
};

export default AddOutreachLog;