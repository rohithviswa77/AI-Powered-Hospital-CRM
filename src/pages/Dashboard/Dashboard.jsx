import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, onSnapshot, query, orderBy, where, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import moment from 'moment';
import { TrendChart, DistributionPie, ServiceBarChart } from './AnalyticsCharts';
import UrgentTasksFeed from './UrgentTasksFeed';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalPatients: 0,
    appointmentsToday: 0
  });
  const [recentLeads, setRecentLeads] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [priorityData, setPriorityData] = useState([]);
  const [serviceData, setServiceData] = useState([]);
  const [urgentTasks, setUrgentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Greeting based on time
  const greeting = useMemo(() => {
    const hour = moment().hour();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  useEffect(() => {
    if (!userProfile) return;

    const isLeadStaff = userProfile.role === 'Lead-staff';
    const isDoctor = userProfile.role === 'Doctor';

    // 1. Leads Listeners & Trends
    const leadsQuery = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
      const allLeads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let filteredLeads = allLeads;
      if (isLeadStaff || isDoctor) {
        filteredLeads = allLeads.filter(l => l.assignedTo === userProfile.name);
      }

      setStats(prev => ({ ...prev, totalLeads: filteredLeads.length }));
      setRecentLeads(filteredLeads.slice(0, 5));

      // Trend: Last 7 Days
      const last7Days = [...Array(7)].map((_, i) => {
        const d = moment().subtract(6 - i, 'days');
        return { 
          date: d.format('MMM DD'), 
          sortDate: d.format('YYYY-MM-DD'),
          count: 0 
        };
      });

      const priorityMap = { High: 0, Normal: 0, Low: 0 };
      const serviceMap = {};

      filteredLeads.forEach(lead => {
        const priority = lead.priority === 'Medium' ? 'Normal' : (lead.priority || 'Normal');
        if (priorityMap.hasOwnProperty(priority)) priorityMap[priority]++;

        const service = lead.serviceOfInterest || lead.treatmentSought || 'General';
        serviceMap[service] = (serviceMap[service] || 0) + 1;

        if (lead.createdAt?.toDate) {
          const leadDate = moment(lead.createdAt.toDate()).format('YYYY-MM-DD');
          const dayMatch = last7Days.find(d => d.sortDate === leadDate);
          if (dayMatch) dayMatch.count++;
        }
      });

      setTrendData(last7Days);
      setPriorityData(Object.keys(priorityMap).map(name => ({ name, value: priorityMap[name] })));
      setServiceData(Object.keys(serviceMap)
        .map(name => ({ name, value: serviceMap[name] }))
        .sort((a,b) => b.value - a.value)
        .slice(0, 5)
      );
    });

    // 2. Patient Count
    const unsubscribePatients = onSnapshot(collection(db, "patients"), (snapshot) => {
      let filteredPatients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (userProfile.role === 'Lead-staff' || userProfile.role === 'Staff') {
        filteredPatients = filteredPatients.filter(p => p.assignedTo === userProfile.name);
      } else if (userProfile.role === 'Doctor') {
        filteredPatients = filteredPatients.filter(p => p.assignedDoctor === userProfile.name);
      }
      setStats(prev => ({ ...prev, totalPatients: filteredPatients.length }));
    });

    // 3. Appointments Today
    const todayStr = moment().format('YYYY-MM-DD');
    const appointmentsQuery = query(collection(db, "appointments"), where("appointmentDate", "==", todayStr));
    const unsubscribeAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
      let apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (isDoctor) apps = apps.filter(a => a.doctorName === userProfile.name);
      setStats(prev => ({ ...prev, appointmentsToday: apps.length }));
    });

    // 4. Urgent Follow-Ups
    const fUpQuery = query(collection(db, "followups"), where("status", "==", "Open"));
    const unsubscribeFollowUps = onSnapshot(fUpQuery, (snapshot) => {
      let tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (isLeadStaff) tasks = tasks.filter(t => t.assignedTo === userProfile.name);

      const today = moment().startOf('day');
      const urgent = tasks.filter(t => {
        const tDate = moment(t.nextFollowUpDate);
        return t.priority === 'High' || tDate.isSameOrBefore(today, 'day');
      }).sort((a, b) => {
        if (a.priority === 'High' && b.priority !== 'High') return -1;
        if (a.priority !== 'High' && b.priority === 'High') return 1;
        return moment(a.nextFollowUpDate).diff(moment(b.nextFollowUpDate));
      });

      setUrgentTasks(urgent.slice(0, 6));
      setLoading(false);
    });

    return () => {
      unsubscribeLeads();
      unsubscribePatients();
      unsubscribeAppointments();
      unsubscribeFollowUps();
    };
  }, [userProfile]);

  const handleCompleteTask = async (taskId) => {
    try {
      await updateDoc(doc(db, "followups", taskId), { status: 'Completed' });
      toast.success("Task marked as completed");
    } catch (err) {
      toast.error("Error updating task");
    }
  };

  const handleCallTask = (task) => {
    toast.info(`Initiating call to ${task.leadName || 'Customer'}...`);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="premium-dashboard animate-fade-in pb-12 space-y-8 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
      {/* Refined Dashboard Header */}
      <header className="flex flex-col md:flex-row justify-between items-end pb-6 border-b border-neutral-200/60 transition-all duration-500 animate-entrance">
        <div>
           <div className="flex items-center gap-2 mb-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
             <span className="label-caps !text-emerald-600">Clinical Dashboard Active</span>
           </div>
           <h1 className="page-title !mb-0 tracking-tighter !text-3xl">Hospital Overview</h1>
           <p className="text-xs font-bold text-neutral-400 tracking-tight mt-0.5 uppercase tracking-widest opacity-80">Real-time operational and clinical analytics stream</p>
        </div>
        
        <div className="hidden md:flex items-center gap-4">
           {/* All time/date elements removed as requested */}
        </div>
      </header>

      {/* Top Stat Bar - Triple Threat Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2">
        {[
          { label: 'Active Pipeline', val: stats.totalLeads, color: 'emerald', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857m5-11.143V3m0 2h.01M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
          { label: 'Patient Database', val: stats.totalPatients, color: 'indigo', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          { label: "Daily Schedule", val: stats.appointmentsToday, color: 'rose', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' }
        ].map((s, idx) => (
          <div 
            key={idx} 
            className="group relative bg-white border border-neutral-200 rounded-[32px] p-7 flex items-center justify-between shadow-sm transition-all duration-500 hover:shadow-md hover:border-neutral-300 animate-entrance"
            style={{ animationDelay: `${idx * 0.15}s` }}
          >
             <div className="relative z-10">
                <h3 className="label-caps mb-3">{s.label}</h3>
                <p className="text-5xl font-black text-neutral-900 tabular-nums tracking-tighter leading-none mb-2">{s.val}</p>
                <div className="flex items-center gap-2">
                   <div className={`w-1.5 h-1.5 rounded-full bg-${s.color}-500`}></div>
                   <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Real-time Data</span>
                </div>
             </div>
             <div className={`w-16 h-16 rounded-[22px] bg-neutral-50 text-neutral-600 flex items-center justify-center font-bold shadow-inner group-hover:bg-neutral-100 transition-colors duration-300`}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d={s.icon} /></svg>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-9 space-y-8">
          {/* Trend Chart - Holographic Area */}
          <div className="card shadow-md p-6 animate-entrance" style={{ animationDelay: '0.2s' }}>
             <div className="flex justify-between items-center mb-8">
                <div>
                   <h2 className="section-title !mb-0.5 text-xl tracking-tighter">Acquisition Velocity</h2>
                   <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Patient flow trends (Last 7 Days)</p>
                </div>
                <div className="px-3 py-1 bg-neutral-100 rounded-lg text-[9px] font-black text-neutral-600 uppercase tracking-widest border border-neutral-200 cursor-default">Historical View</div>
             </div>
             <TrendChart data={trendData} />
          </div>

          {/* Peer Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="card shadow-md p-6 animate-entrance" style={{ animationDelay: '0.3s' }}>
               <h2 className="section-title !mb-6 text-base font-black uppercase tracking-tight">Priority Spectrum</h2>
               <DistributionPie data={priorityData} />
            </div>
            <div className="card shadow-md p-6 animate-entrance" style={{ animationDelay: '0.35s' }}>
               <h2 className="section-title !mb-6 text-base font-black uppercase tracking-tight">Focus Clusters</h2>
               <ServiceBarChart data={serviceData} />
            </div>
          </div>
        </div>

        {/* Right Action Rail - Matches charts height */}
        <div className="lg:col-span-3">
          <div className="card shadow-md border-neutral-200 h-full flex flex-col animate-entrance" style={{ animationDelay: '0.25s' }}>
             <div className="p-6 border-b border-neutral-50 bg-white">
                <div className="flex justify-between items-center mb-4">
                   <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-rose-50 text-rose-600 rounded-[14px] border border-rose-100">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                      <div>
                        <h2 className="text-base font-black text-neutral-900 uppercase tracking-tighter leading-none mb-1">Urgency</h2>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Follow-ups</p>
                      </div>
                   </div>
                   <span className="bg-rose-50 text-rose-700 tabular-nums text-[10px] font-black px-2.5 py-1 rounded-full border border-rose-100">{urgentTasks.length}</span>
                </div>
             </div>
             
             <div className="flex-1 overflow-hidden p-4">
                <UrgentTasksFeed 
                  tasks={urgentTasks} 
                  onComplete={handleCompleteTask}
                  onCall={handleCallTask}
                />
             </div>
          </div>
        </div>
      </div>

      {/* Operational Ledger - Full Width Row */}
      <div className="card shadow-2xl border-white/80 animate-entrance" style={{ animationDelay: '0.4s' }}>
          <div className="p-8 pb-4 flex justify-between items-center bg-gradient-to-b from-neutral-50/50 to-transparent">
            <div>
              <h2 className="text-xl font-black text-neutral-950 tracking-tighter flex items-center gap-2">
                <span className="w-1 h-6 bg-primary-600 rounded-full"></span>
                Operational Ledger
              </h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Live entry stream from clinicial endpoints</p>
            </div>
          </div>
          
          <div className="overflow-x-auto w-full px-8 pb-8">
            <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-neutral-400">
                      {['Provider Profile', 'Service Vector', 'Fulfillment'].map(h => (
                        <th key={h} className="px-4 py-3 label-caps">{h}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map(lead => (
                      <tr key={lead.id} className="group hover:bg-neutral-50/80 transition-all duration-300">
                        <td className="px-4 py-5 bg-white border-y border-l border-neutral-100/50 rounded-l-[24px] transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-11 h-11 rounded-[14px] bg-gradient-to-tr from-neutral-100 to-white border border-neutral-200 flex items-center justify-center font-black text-xs text-neutral-700 shadow-sm group-hover:border-primary-300 transition-all">
                                  {lead.firstName?.[0]}
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-sm font-black text-neutral-950 tracking-tight group-hover:text-primary-700 transition-colors uppercase leading-none mb-1">{lead.firstName} {lead.lastName}</span>
                                  <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">{lead.contactID}</span>
                              </div>
                            </div>
                        </td>
                        <td className="px-4 py-5 bg-white border-y border-neutral-100/50 transition-all font-bold text-[11px] text-neutral-600 uppercase tracking-tighter">
                            {lead.serviceOfInterest || 'Medical Consultation'}
                        </td>
                        <td className="px-4 py-5 bg-white border-y border-r border-neutral-100/50 rounded-r-[24px] transition-all">
                            <span className={`inline-flex px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm
                              ${lead.lifeStage === 'New' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 
                                lead.lifeStage === 'Converted' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                lead.lifeStage === 'Lost' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-neutral-50 text-neutral-700 border-neutral-100'}
                            `}>
                              {lead.lifeStage || 'In-Progress'}
                            </span>
                        </td>
                      </tr>
                  ))}
                </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;