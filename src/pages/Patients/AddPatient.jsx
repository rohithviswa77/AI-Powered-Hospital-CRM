import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, addDoc, updateDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";

const AddPatient = ({ onClose, patientData }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [doctors, setDoctors] = useState([]); // State for dynamic doctor dropdown

  const [formData, setFormData] = useState(patientData || {
    firstName: '', lastName: '', age: '', gender: 'Male',
    bloodGroup: '', mobile: '', emergencyContact: '',
    height: '', weight: '', bloodPressure: '',
    assignedDoctor: '', chiefComplaint: '', medicalHistory: '', allergies: ''
  });

  // --- Fetch Doctors from Category Management ---
  useEffect(() => {
    // Now pulling from the "doctors" collection you manage in CRM Admin
    const unsubscribe = onSnapshot(collection(db, "doctors"), (snapshot) => {
      setDoctors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- GEMINI AI EXTRACTION LOGIC ---
  const handleSmartScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    try {
      // 1. Convert image to Base64
      const base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });

      // 2. Initialize Gemini 2.5 Flash
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // 3. Updated Prompt to include all new clinical fields
      const prompt = `Extract patient details from this medical document. Return ONLY a valid JSON object with exact keys: firstName, lastName, age, gender, bloodGroup, mobile, emergencyContact, height, weight, bloodPressure, assignedDoctor, chiefComplaint, medicalHistory, allergies. If not found, use an empty string "". Do not include markdown formatting.`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType: file.type } }
      ]);

      // 4. Parse and Auto-fill
      const textResponse = result.response.text();
      const cleanedJson = JSON.parse(textResponse.replace(/```json|```/g, "").trim());

      setFormData(prev => ({ ...prev, ...cleanedJson }));
      alert("AI Scan Complete! Please review the auto-filled fields.");
    } catch (error) {
      console.error("AI Error:", error);
      alert("Failed to scan document. You can still enter details manually.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (patientData?.id) {
        const patientRef = doc(db, "patients", patientData.id);
        const updateData = { ...formData };
        delete updateData.id;
        await updateDoc(patientRef, updateData);
        alert("Patient Updated Successfully!");
      } else {
        await addDoc(collection(db, "patients"), {
          ...formData,
          patientID: `PAT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          createdAt: serverTimestamp()
        });
        alert("Patient Registered Successfully!");
      }
      onClose();
    } catch (error) {
      console.error("Error saving patient:", error);
      alert("Error saving patient details.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-4xl my-8 mx-auto animate-slide-up overflow-hidden border border-neutral-100 flex flex-col max-h-[90vh]">

        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-10">
          <h2 className="text-xl font-bold text-neutral-800">{patientData ? 'Edit Patient' : 'Register Patient'}</h2>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap flex-1 text-center">
              {isScanning ? "Scanning..." : "✨ Smart Scan Document"}
              <input type="file" accept="image/*,application/pdf" onChange={handleSmartScan} hidden disabled={isScanning} />
            </label>
            <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 rounded-full transition-colors shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          <form id="add-patient-form" onSubmit={handleSubmit} className="space-y-6">

            <div>
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4 pb-2 border-b border-dashed border-neutral-200">Demographics</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">First Name*</label>
                  <input name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Last Name</label>
                  <input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Age</label>
                  <input name="age" type="number" placeholder="Age" value={formData.age} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Mobile*</label>
                  <input name="mobile" placeholder="Mobile" value={formData.mobile} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Emergency Contact</label>
                  <input name="emergencyContact" placeholder="Emergency Contact" value={formData.emergencyContact} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4 pb-2 border-b border-dashed border-neutral-200">Vitals & Measurements</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Height (cm)</label>
                  <input name="height" placeholder="Height" value={formData.height} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Weight (kg)</label>
                  <input name="weight" placeholder="Weight" value={formData.weight} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Blood Pressure</label>
                  <input name="bloodPressure" placeholder="e.g. 120/80" value={formData.bloodPressure} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Blood Group</label>
                  <input name="bloodGroup" placeholder="Blood Group" value={formData.bloodGroup} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4 pb-2 border-b border-dashed border-neutral-200">Clinical Details</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Assigned Doctor*</label>
                  <select name="assignedDoctor" value={formData.assignedDoctor} onChange={handleChange} required>
                    <option value="" disabled>Assign Doctor</option>
                    {doctors.map(doc => (
                      <option key={doc.id} value={doc.name}>
                        Dr. {doc.name} {doc.description ? `(${doc.description})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Chief Complaint*</label>
                  <input name="chiefComplaint" placeholder="Chief Complaint" value={formData.chiefComplaint} onChange={handleChange} required />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Medical History</label>
                  <textarea name="medicalHistory" placeholder="Medical History" value={formData.medicalHistory} onChange={handleChange} rows="3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Allergies</label>
                  <textarea name="allergies" placeholder="Allergies" value={formData.allergies} onChange={handleChange} rows="2" />
                </div>
              </div>
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-3 sticky bottom-0 z-10">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" form="add-patient-form" className="btn-success">{patientData ? 'Update Patient' : 'Register Patient'}</button>
        </div>
      </div>
    </div>
  );
};

export default AddPatient;