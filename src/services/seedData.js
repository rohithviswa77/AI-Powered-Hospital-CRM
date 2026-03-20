import { db } from './firebaseConfig';
import { 
  collection, getDocs, deleteDoc, doc, setDoc, 
  serverTimestamp, query, where 
} from 'firebase/firestore';

const PATIENT_NAMES = [
  { f: 'Jayaram', l: 'Subramaniam', g: 'Male', a: 58 },
  { f: 'Suresh', l: 'Gopi', g: 'Male', a: 62 },
  { f: 'Dileep', l: 'Gopalakrishnan', g: 'Male', a: 55 },
  { f: 'Manju', l: 'Warrier', g: 'Female', a: 45 },
  { f: 'Shobana', l: 'Chandrakumar', g: 'Female', a: 53 },
  { f: 'Urvashi', l: 'Poduval', g: 'Female', a: 54 },
  { f: 'Jayasurya', l: 'Marudu', g: 'Male', a: 45 },
  { f: 'Kunchacko', l: 'Boban', g: 'Male', a: 47 },
  { f: 'Biju', l: 'Menon', g: 'Male', a: 53 },
  { f: 'Indrajith', l: 'Sukumaran', g: 'Male', a: 43 },
  { f: 'Murali', l: 'Gopy', g: 'Male', a: 51 },
  { f: 'Siddique', l: 'Ismail', g: 'Male', a: 61 },
  { f: 'Mukesh', l: 'Madhavan', g: 'Male', a: 66 },
  { f: 'Sreenivasan', l: 'Nair', g: 'Male', a: 67 },
  { f: 'Salim', l: 'Kumar', g: 'Male', a: 53 },
  { f: 'Hareesh', l: 'Kanaran', g: 'Male', a: 41 },
  { f: 'Sobhita', l: 'Dhulipala', g: 'Female', a: 31 },
  { f: 'Nazriya', l: 'Nazim', g: 'Female', a: 29 },
  { f: 'Asif', l: 'Ali', g: 'Male', a: 37 },
  { f: 'Nithya', l: 'Menen', g: 'Female', a: 35 }
];

const DEPARTMENTS = ["Koyilandy", "Payyannur", "Chengannur"];
const COMPLAINTS = [
  "Chronic back pain", "Post-viral fatigue", "Digestive issues", 
  "Joint stiffness", "Sleep apnea", "Migraine", "Stress management"
];
const STAGES = ["Consultation", "In-Treatment", "Recovery", "Discharged"];

const STAGE_PROFILES = {
  "Consultation": {
    complaints: ["Initial headache check", "Seeking wellness plan", "Skin rash evaluation", "General fatigue review"],
    histories: ["No prior herbal treatments", "Family history of BP", "Recent onset of symptoms", "Dietary changes suggested"]
  },
  "In-Treatment": {
    complaints: ["Chronic back pain therapy", "Migraine management", "Diabetes regulation", "Digestive detox protocol"],
    histories: ["Started regimen 2 weeks ago", "Previous history of acidity", "Showing early progress", "Strict diet enforced"]
  },
  "Recovery": {
    complaints: ["Post-therapy rehab", "Energy levels improving", "Joint mobility follow-up", "Wound healing review"],
    histories: ["Completed 4-week detox", "Responded well to herbal oils", "Pain reduced by 60%", "Post-surgery recovery"]
  },
  "Discharged": {
    complaints: ["Final health clearance", "Maintenance plan review", "Routine follow-up", "Annual wellness check"],
    histories: ["Full recovery from sciatica", "Managed allergies successfully", "Weight loss goals achieved", "IBS symptoms resolved"]
  }
};

const ALLERGIES_LIST = ["None", "Penicillin", "Dust mites", "Peanuts", "Sulfa drugs"];

// --- Helper to seed doctors if empty ---
const ensureDoctorsExist = async () => {
  const docSnap = await getDocs(collection(db, "doctors"));
  if (!docSnap.empty) return docSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const defaultDoctors = [
    { name: "Dr. Ramesh Nair", description: "Senior Consultant", location: "Koyilandy" },
    { name: "Dr. Lakshmi Menon", description: "Ayurvedic Specialist", location: "Payyannur" },
    { name: "Dr. Siddharth Varma", description: "General Physician", location: "Chengannur" }
  ];

  const createdDoctors = [];
  for (const docData of defaultDoctors) {
    const docRef = doc(collection(db, "doctors"));
    await setDoc(docRef, { ...docData, createdAt: serverTimestamp() });
    createdDoctors.push({ id: docRef.id, ...docData });
  }
  return createdDoctors;
};

export const runPatientSeed = async () => {
  try {
    // 0. Ensure we have doctors to assign
    const availableDoctors = await ensureDoctorsExist();

    // 1. Clear existing patients
    const patientsSnap = await getDocs(collection(db, "patients"));
    const deletePromises = patientsSnap.docs.map(d => deleteDoc(doc(db, "patients", d.id)));
    await Promise.all(deletePromises);

    // 2. Generate new unique patients with coordinated clinical data
    const patientPromises = PATIENT_NAMES.map((name, i) => {
      const id = doc(collection(db, "patients")).id;
      const dept = DEPARTMENTS[i % DEPARTMENTS.length];
      const stage = STAGES[i % STAGES.length];
      
      // Select coordinated clinical data based on stage
      const profile = STAGE_PROFILES[stage];
      const complaint = profile.complaints[Math.floor(Math.random() * profile.complaints.length)];
      const history = profile.histories[Math.floor(Math.random() * profile.histories.length)];
      
      // Select a random real doctor
      const assignedDoc = availableDoctors[Math.floor(Math.random() * availableDoctors.length)];
      
      return setDoc(doc(db, "patients", id), {
        patientID: `PAT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        firstName: name.f,
        lastName: name.l,
        gender: name.g,
        age: name.a,
        mobile: `9847${Math.floor(100000 + Math.random() * 900000)}`,
        assignedDoctor: assignedDoc.name,
        department: dept,
        treatmentStage: stage,
        patientStatus: "Active",
        
        // Coordinated Clinical Details
        chiefComplaint: complaint,
        medicalHistory: history,
        height: Math.floor(155 + Math.random() * 30),
        weight: Math.floor(55 + Math.random() * 40),
        bloodPressure: i % 2 === 0 ? "120/80" : "130/90",
        bloodGroup: ["A+", "B+", "O+", "AB+"][i % 4],
        allergies: i % 5 === 0 ? ALLERGIES_LIST[Math.floor(Math.random() * ALLERGIES_LIST.length)] : "None",
        
        createdAt: serverTimestamp()
      });
    });
    await Promise.all(patientPromises);

    // 3. Sync Converted Leads
    const convertedLeadsSnap = await getDocs(query(collection(db, "leads"), where("lifeStage", "==", "Converted")));
    const syncPromises = convertedLeadsSnap.docs.map(lDoc => {
      const lead = lDoc.data();
      const assignedDoc = availableDoctors[Math.floor(Math.random() * availableDoctors.length)];

      return setDoc(doc(db, "patients", lDoc.id), {
        ...lead,
        patientID: lead.patientID || `PAT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        treatmentStage: "Consultation", // Default to consultation for new converts
        chiefComplaint: lead.treatmentSought || "Lead Conversion Review",
        assignedDoctor: lead.assignedDoctor || assignedDoc.name,
        patientStatus: "Active",
        createdAt: lead.createdAt || serverTimestamp(),
        convertedAt: serverTimestamp()
      }, { merge: true });
    });
    await Promise.all(syncPromises);

    return true;
  } catch (error) {
    console.error("Seeding failed:", error);
    throw error;
  }
};
