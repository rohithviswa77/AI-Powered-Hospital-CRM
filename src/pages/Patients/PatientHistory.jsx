import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

const PatientHistory = ({ patientId, patientName, onClose }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // We query the appointments collection to find all appointments for this patient
        const q = query(
            collection(db, "appointments"),
            where("patientId", "==", patientId),
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Sort in memory because Firestore limits sorting on a different field than a where filter unless indexed
            const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            apps.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));

            setHistory(apps);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [patientId]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-md overflow-y-auto">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-3xl my-8 mx-auto animate-slide-up overflow-hidden border border-white flex flex-col max-h-[90vh]">
                <div className="px-8 py-6 border-b border-neutral-100 bg-white/50 flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-neutral-900 to-neutral-600">Patient History</h2>
                        <p className="text-sm font-medium text-neutral-500 mt-1">Appointment track record for {patientName}</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors bg-white shadow-sm border border-neutral-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="overflow-y-auto p-8 flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
                            <p className="mt-4 text-sm text-neutral-500 font-medium">Loading history...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-300 mb-4">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-neutral-700">No History Found</h3>
                            <p className="text-sm text-neutral-500 mt-1">This patient has no recorded appointments.</p>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-neutral-200 ml-4 pl-8 py-2 space-y-8">
                            {history.map((app, index) => (
                                <div key={app.id} className="relative group">
                                    {/* Timeline Dot */}
                                    <div className={`absolute -left-[41px] top-2 w-5 h-5 rounded-full border-4 border-white shadow-sm transition-colors
                                        ${app.status?.toLowerCase() === 'completed' || app.status?.toLowerCase() === 'attended' ? 'bg-emerald-500' : 'bg-neutral-300'}
                                        ${app.status?.toLowerCase() === 'scheduled' ? 'bg-primary-500 ring-4 ring-primary-50' : ''}
                                        ${app.status?.toLowerCase() === 'missed' ? 'bg-red-500' : ''}
                                    `}></div>

                                    <div className="bg-white hover:bg-neutral-50 p-6 rounded-2xl border border-neutral-100 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="text-lg font-black text-neutral-800 tracking-tight">
                                                        {new Date(app.appointmentDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                    </span>
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest
                                                        ${app.status?.toLowerCase() === 'scheduled' ? 'bg-blue-50 text-blue-700 border border-blue-200' : ''}
                                                        ${['completed', 'attended'].includes(app.status?.toLowerCase()) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : ''}
                                                        ${app.status?.toLowerCase() === 'missed' ? 'bg-red-50 text-red-700 border border-red-200' : ''}
                                                        ${!['scheduled', 'completed', 'attended', 'missed'].includes(app.status?.toLowerCase()) ? 'bg-neutral-100 text-neutral-700 border border-neutral-200' : ''}
                                                    `}>
                                                        {app.status}
                                                    </span>
                                                </div>
                                                <div className="text-sm font-semibold text-primary-600 flex items-center gap-1.5">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {app.appointmentTime}
                                                </div>
                                            </div>
                                            <div className="text-left sm:text-right bg-neutral-50 px-4 py-2 rounded-xl border border-neutral-100 flex-shrink-0">
                                                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Assigned Doctor</p>
                                                <p className="text-sm font-bold text-neutral-900">Dr. {app.doctorName}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 pt-4 border-t border-neutral-100/60">
                                            <div>
                                                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Treatment / Procedure</p>
                                                <p className="text-sm font-medium text-neutral-800">{app.treatmentType || 'General Medical Consultation'}</p>
                                            </div>

                                            {app.notes && (
                                                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                                                    <p className="text-xs font-bold text-amber-900/40 uppercase tracking-wider mb-1">Clinical Notes</p>
                                                    <p className="text-sm text-amber-900 font-medium italic leading-relaxed">"{app.notes}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-8 py-5 border-t border-neutral-100 bg-white/80 flex justify-end sticky bottom-0 z-10 backdrop-blur-md">
                    <button onClick={onClose} className="btn-secondary !px-8">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PatientHistory;
