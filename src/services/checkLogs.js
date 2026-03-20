
import { db } from './firebaseConfig.js';
import { collection, getDocs } from 'firebase/firestore';

async function checkLogs() {
  try {
    const snap = await getDocs(collection(db, "outreachLogs"));
    console.log(`Found ${snap.size} logs.`);
    snap.forEach(doc => {
      console.log(doc.id, doc.data());
    });
  } catch (e) {
    console.error(e);
  }
}

checkLogs();
