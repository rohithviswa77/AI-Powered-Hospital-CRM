import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalPatients: 0,
    appointmentsToday: 0 // Placeholder until Appointments module is built
  });
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Real-time listener for Leads (Count & Recent 5)
    const leadsQuery = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalLeads: snapshot.size }));

      const fetchedLeads = snapshot.docs.slice(0, 5).map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentLeads(fetchedLeads);
    });

    // 2. Real-time listener for Patients (Count)
    const unsubscribePatients = onSnapshot(collection(db, "patients"), (snapshot) => {
      setStats(prev => ({ ...prev, totalPatients: snapshot.size }));
      setLoading(false);
    });

    // 3. Real-time listener for Appointments Today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const appointmentsQuery = query(collection(db, "appointments"), where("appointmentDate", "==", todayStr));
    const unsubscribeAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, appointmentsToday: snapshot.size }));
    });

    return () => {
      unsubscribeLeads();
      unsubscribePatients();
      unsubscribeAppointments();
    };
  }, []);

  return (
    <div className="animate-fade-in pb-10">
      <header className="mb-10 pb-6 border-b border-neutral-200/60 relative">
        <h1 className="page-title">Hospital Overview</h1>
        <p className="text-sm font-medium text-neutral-500">Welcome back to Herballytouch CRM Dashboard</p>
      </header>

      {/* Premium Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {/* Leads Card */}
        <div className="feature-card group flex flex-col justify-between min-h-[160px]">
          {/* Animated Background Blob */}
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-primary-400/20 rounded-full blur-2xl group-hover:bg-primary-500/30 transition-colors duration-500"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Total Leads</h3>
              <p className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-neutral-900 to-neutral-600 tracking-tight drop-shadow-sm">
                {stats.totalLeads}
              </p>
            </div>
            {/* Elegant Icon Placeholder */}
            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-500 shadow-inner rotate-3 group-hover:-rotate-3 transition-transform duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="relative z-10 mt-6">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-primary-50 text-primary-700 border border-primary-100/50 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mr-1.5 animate-pulse"></span>
              Active inquiries
            </span>
          </div>
        </div>

        {/* Patients Card */}
        <div className="feature-card group flex flex-col justify-between min-h-[160px]">
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-secondary-400/20 rounded-full blur-2xl group-hover:bg-secondary-500/30 transition-colors duration-500"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Registered Patients</h3>
              <p className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-neutral-900 to-neutral-600 tracking-tight drop-shadow-sm">
                {stats.totalPatients}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-secondary-50 flex items-center justify-center text-secondary-500 shadow-inner -rotate-3 group-hover:rotate-3 transition-transform duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="relative z-10 mt-6">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-secondary-50 text-secondary-700 border border-secondary-100/50 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-500 mr-1.5"></span>
              Converted leads
            </span>
          </div>
        </div>

        {/* Appointments Card */}
        <div className="feature-card group flex flex-col justify-between min-h-[160px]">
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-red-400/20 rounded-full blur-2xl group-hover:bg-red-500/30 transition-colors duration-500"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Appointments</h3>
              <p className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-neutral-900 to-neutral-600 tracking-tight drop-shadow-sm">
                {stats.appointmentsToday}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shadow-inner rotate-3 group-hover:-rotate-3 transition-transform duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="relative z-10 mt-6">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-100/50 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
              Scheduled today
            </span>
          </div>
        </div>
      </div>

      {/* Recent Leads Table */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="section-title !mb-0">
            <svg className="w-5 h-5 text-primary-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Activity
          </h2>
          <button className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors">
            View All Leads &rarr;
          </button>
        </div>

        <div className="card border-white/60">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-neutral-500">Loading recent activity...</p>
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-300 mb-2">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-neutral-700">No leads found</h3>
              <p className="text-sm text-neutral-500 text-center max-w-sm">There is no recent activity to display. New leads will appear here automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full max-w-full">
              <table className="w-full text-left whitespace-nowrap min-w-max">
                <thead>
                  <tr className="bg-neutral-50/80 border-b border-neutral-200/80">
                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Branch</th>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100/80 bg-white/40">
                  {recentLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/80 transition-colors duration-200">
                      <td className="px-6 py-4 text-sm font-medium text-neutral-500">
                        {lead.createdAt?.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-secondary-100 text-primary-700 flex items-center justify-center font-bold text-xs shadow-sm border border-primary-200/50">
                            {lead.firstName ? lead.firstName[0].toUpperCase() : '?'}
                          </div>
                          <span className="font-bold text-neutral-900">{lead.firstName} {lead.lastName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-neutral-600">{lead.serviceOfInterest || 'General'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-neutral-600">{lead.department || 'Unassigned'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border
                          ${(lead.status === 'New' || !lead.status) ? 'bg-primary-50 text-primary-700 border-primary-200/60' : ''}
                          ${lead.status === 'Contacted' ? 'bg-secondary-50 text-secondary-700 border-secondary-200/60' : ''}
                          ${lead.status === 'Converted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : ''}
                          ${lead.status === 'Lost' ? 'bg-red-50 text-red-700 border-red-200/60' : ''}
                          ${!['New', 'Contacted', 'Converted', 'Lost'].includes(lead.status) && lead.status ? 'bg-neutral-100 text-neutral-700 border-neutral-200/60' : ''}
                        `}>
                          {lead.status || 'New'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;