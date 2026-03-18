import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { toast } from "react-toastify";

// ✅ Backend API functions
import { transcribeAudio, startRecording } from './outreach_model/voiceToText';
import { summarizeText } from './outreach_model/summarization';

const AddOutreachLog = ({ onClose }) => {
  const [people, setPeople] = useState([]);
  const [staff, setStaff] = useState([]);

  // --- AI Processing States ---
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const recorderRef = useRef(null);

  const [formData, setFormData] = useState({
    personId: '',
    personName: '',
    outcome: 'Interested',
    rawNotes: '',
    aiSummary: '',
    staffName: '',
    department: ''
  });

  useEffect(() => {
    const unsubLeads = onSnapshot(collection(db, "leads"), (snap) => {
      const leads = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'Lead' }));
      const unsubPatients = onSnapshot(collection(db, "patients"), (pSnap) => {
        const patients = pSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'Patient' }));
        setPeople([...leads, ...patients]);
      });
    });

    const unsubStaff = onSnapshot(collection(db, "staffMembers"), (snap) => {
      setStaff(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubLeads(); unsubStaff(); };
  }, []);

  // ==========================================
  // 🎙️ VOICE RECORDING
  // ==========================================
  const handleStartRecording = async () => {
    try {
      const recorder = await startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
      toast.info("Recording started...");
    } catch (error) {
      toast.error("Microphone permission denied.");
    }
  };

  const handleStopRecording = async () => {
    if (!recorderRef.current) return;

    setIsRecording(false);
    setIsTranscribing(true);

    try {
      const audioBlob = await recorderRef.current.stop();
      recorderRef.current = null;

      toast.info(" Transcribing...");

      const text = await transcribeAudio(audioBlob);

      if (text) {
        setFormData(prev => ({
          ...prev,
          rawNotes: prev.rawNotes ? `${prev.rawNotes}\n${text}` : text
        }));
        toast.success("Transcription complete!");
      } else {
        toast.warning("No speech detected.");
      }
    } catch (error) {
      toast.error("Transcription failed: " + error.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  // ==========================================
  // 📁 AUDIO FILE UPLOAD
  // ==========================================
  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsTranscribing(true);

    try {
      toast.info(`Transcribing "${file.name}"...`);

      const text = await transcribeAudio(file);

      if (text) {
        setFormData(prev => ({
          ...prev,
          rawNotes: prev.rawNotes ? `${prev.rawNotes}\n${text}` : text
        }));
        toast.success("File transcribed!");
      } else {
        toast.warning("No speech detected.");
      }
    } catch (error) {
      toast.error("Transcription failed: " + error.message);
    } finally {
      setIsTranscribing(false);
      e.target.value = '';
    }
  };

  // ==========================================
  // ✨ SUMMARIZATION
  // ==========================================
  const handleSummarize = async () => {
    if (!formData.rawNotes) {
      toast.warning("Enter notes first.");
      return;
    }

    setIsSummarizing(true);

    try {
      const { summary } = await summarizeText(formData.rawNotes);
      setFormData({ ...formData, aiSummary: summary });
      toast.success("Summary generated!");
    } catch (error) {
      toast.error("Summarization failed: " + error.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  // ==========================================
  // 💾 SAVE
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "outreachLogs"), {
        ...formData,
        createdAt: serverTimestamp()
      });
      toast.success("Saved successfully!");
      onClose();
    } catch (error) {
      toast.error("Save failed: " + error.message);
    }
  };

  const isProcessing = isTranscribing || isSummarizing;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-xl my-4 mx-auto animate-slide-up overflow-hidden border border-white flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-100 bg-white/50 flex justify-between items-center sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-neutral-900 to-neutral-600 tracking-tight">Log Interaction</h2>
            <p className="text-[11px] font-medium text-neutral-500 mt-0.5">Capture patient enquiries and interactions</p>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors bg-white shadow-sm border border-neutral-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
          <form id="add-outreach-form" onSubmit={handleSubmit} className="space-y-6">

            {/* Section: Clinical Identity */}
            <div className="bg-neutral-50/80 p-5 rounded-xl border border-neutral-100 shadow-sm space-y-4">
              <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-200 pb-2">Clinical Identity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Target Patient/Enquiry *</label>
                  <select
                    className="py-2 text-sm"
                    onChange={(e) => {
                      const p = people.find(item => item.id === e.target.value);
                      if (p) {
                        setFormData({
                          ...formData,
                          personId: p.id,
                          personName: `${p.firstName} ${p.lastName}`,
                          department: p.department || '',
                          personType: p.type
                        });
                      } else {
                        setFormData({ ...formData, personId: '', personName: '' });
                      }
                    }}
                    required
                  >
                    <option value="">Search records...</option>
                    {people.map(p => (
                      <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-primary-600 uppercase tracking-wider mb-1.5">Recording Staff *</label>
                  <select
                    className="py-2 text-sm border-primary-100"
                    onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                    required
                  >
                    <option value="">Select Staff</option>
                    {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Section: Interaction Input */}
            <div className="bg-neutral-50/80 p-5 rounded-xl border border-neutral-100 shadow-sm space-y-4">
              <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-200 pb-2">Interaction Capture</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="flex items-center justify-center gap-2.5 p-3 bg-white border border-neutral-200 text-neutral-600 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm group"
                  >
                    <svg className="w-4 h-4 text-primary-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 00-3 3v8a3 3 0 003 3s3-1.343 3-3V5a3 3 0 00-3-3z"></path></svg>
                    Voice capture
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="flex items-center justify-center gap-2.5 p-3 bg-red-50 text-red-600 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest animate-pulse border border-red-100"
                  >
                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                    Synching audio
                  </button>
                )}

                <div className="relative">
                  <input
                    type="file"
                    id="audio-upload"
                    className="hidden"
                    onChange={handleAudioUpload}
                    accept="audio/*"
                    disabled={isTranscribing}
                  />
                  <label
                    htmlFor="audio-upload"
                    className={`flex items-center justify-center gap-2.5 p-3 bg-white border border-neutral-200 text-neutral-600 hover:bg-secondary-50 hover:text-secondary-700 hover:border-secondary-200 rounded-xl cursor-pointer transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm group ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <svg className="w-4 h-4 text-secondary-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                    {isTranscribing ? 'Syncing...' : 'Upload Record'}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Findings</label>
                <textarea
                  className="min-h-[100px] text-[13px] py-2"
                  placeholder="Capture clinical findings..."
                  value={formData.rawNotes}
                  onChange={(e) => setFormData({ ...formData, rawNotes: e.target.value })}
                />
              </div>
            </div>

            {/* Section: AI Synthesis */}
            <div className="bg-neutral-50/80 p-5 rounded-xl border border-neutral-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">AI Synthesis</h3>
                <button
                  type="button"
                  onClick={handleSummarize}
                  disabled={isSummarizing || !formData.rawNotes}
                  className="text-[9px] font-black text-primary-600 hover:text-primary-700 disabled:opacity-50 uppercase tracking-widest transition-colors"
                >
                  {isSummarizing ? 'Synthesizing...' : '✨ Execute Summary'}
                </button>
              </div>

              {formData.aiSummary && (
                <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100/50 mb-2 animate-slide-up">
                  <p className="text-[12px] font-semibold text-neutral-700 leading-relaxed italic">
                    {formData.aiSummary}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Outcome</label>
                <select
                  className="py-2 text-sm font-bold text-neutral-800"
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                >
                  <option value="Interested">Interested / Positive Slot</option>
                  <option value="Pending">Medical Consultation Needed</option>
                  <option value="Not Interested">Archive / Not Interested</option>
                  <option value="Callback Requested">Schedule Urgent Callback</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-white/80 flex justify-end gap-3 sticky bottom-0 z-10 backdrop-blur-md shrink-0">
          <button
            type="button"
            className="btn-secondary !px-6 !py-2 !text-xs"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-outreach-form"
            className="btn-primary !px-8 !py-2 !text-xs"
            disabled={isProcessing || !formData.personId}
          >
            {isProcessing ? "Processing..." : "Finalize Interaction"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddOutreachLog;