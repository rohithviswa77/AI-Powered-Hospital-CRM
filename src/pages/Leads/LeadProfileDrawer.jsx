import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import AddFollowUp from '../FollowUps/AddFollowUp';
import { toast } from 'react-toastify';

export default function LeadProfileDrawer({ lead, onClose, onEditLead, onDeleteLead }) {
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);

  useEffect(() => {
    if (!lead?.id) return;

    // Fetch Follow-Ups
    const qFollowUps = query(
      collection(db, "followups"),
      where("customerLead", "==", lead.id)
    );

    // Fetch Outreach Logs
    const qOutreach = query(
      collection(db, "outreachLogs"),
      where("customerLead", "==", lead.id)
    );

    let followUpsData = [];
    let outreachData = [];

    const processTimeline = () => {
      const combined = [
        ...followUpsData.map(f => ({ ...f, type: 'followup', dateValue: f.nextFollowUpDate ? new Date(f.nextFollowUpDate).getTime() : 0 })),
        ...outreachData.map(o => ({ ...o, type: 'outreach', dateValue: o.createdAt?.toMillis?.() || Date.now() }))
      ];
      // Sort chronologically (newest at top)
      combined.sort((a, b) => b.dateValue - a.dateValue);
      setTimelineEvents(combined);
      setLoading(false);
    };

    const unsubFollowUps = onSnapshot(qFollowUps, (snap) => {
      followUpsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      processTimeline();
    });

    const unsubOutreach = onSnapshot(qOutreach, (snap) => {
      outreachData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      processTimeline();
    });

    return () => {
      unsubFollowUps();
      unsubOutreach();
    };
  }, [lead?.id]);

  if (!lead) return null;

  return (
    <>
      {/* Background Overlay */}
      <div 
        className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col border-l border-neutral-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-100 bg-neutral-50 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-white border border-neutral-200 text-neutral-600 text-xs font-bold px-2 py-0.5 rounded shadow-sm">
                {lead.contactID}
              </span>
              {lead.lifeStage !== 'Lost' && (
                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                  ${lead.priority === 'High' ? 'bg-red-100 text-red-700' : ''}
                  ${lead.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : ''}
                  ${lead.priority === 'Low' ? 'bg-green-100 text-green-700' : ''}
                  ${!['High', 'Medium', 'Low'].includes(lead.priority) ? 'bg-blue-50 text-blue-700' : ''}
                `}>
                  {lead.priority || 'Low'} priority
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 leading-tight mb-1">
              {lead.firstName} {lead.lastName}
            </h2>
            <p className="text-sm font-semibold text-primary-600">
              {lead.lifeStage} {lead.department !== 'All location' && `• ${lead.department}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-neutral-100 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          
          {/* Vitals Summary */}
          <div className="p-6 border-b border-neutral-100 grid grid-cols-2 gap-y-4 gap-x-6">
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Mobile</p>
              <p className="font-semibold text-neutral-800">{lead.mobile || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Assigned To</p>
              <p className="font-semibold text-neutral-800">{lead.assignedTo || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Source</p>
              <p className="font-semibold text-neutral-800">{lead.source || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Interest</p>
              <p className="font-semibold text-neutral-800">{lead.treatmentSought || lead.leadCategory || '—'}</p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex gap-2 px-6">
            {onEditLead && (
              <button 
                onClick={() => {
                  onClose();
                  onEditLead(lead);
                }}
                className="flex-1 bg-white border border-neutral-200 hover:border-primary-400 hover:text-primary-700 text-neutral-700 font-semibold py-2 px-3 rounded-lg shadow-sm transition-all text-[13px] flex justify-center items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Edit
              </button>
            )}
            
            <button  
              onClick={() => setShowAddFollowUp(true)}
              className="flex-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 font-semibold py-2 px-3 rounded-lg shadow-sm transition-all text-[13px] flex justify-center items-center gap-1.5"
            >
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Follow-Up
            </button>

            <button
               onClick={() => onDeleteLead(lead)}
               className="p-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg shadow-sm transition-all flex items-center justify-center group"
               title="Delete Lead"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>

          {/* Timeline */}
          <div className="p-6">
            <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider mb-6 flex items-center gap-2">
              <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Activity Timeline
            </h3>

            {loading ? (
              <p className="text-sm text-neutral-500 italic">Formatting timeline...</p>
            ) : timelineEvents.length === 0 ? (
              <div className="text-center py-8 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                <p className="text-sm text-neutral-500 font-medium">No activity recorded yet.</p>
                <p className="text-xs text-neutral-400 mt-1">Log a follow-up to start the timeline!</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-neutral-200 ml-3 space-y-8">
                {timelineEvents.map((event, idx) => {
                  const isFollowUp = event.type === 'followup';
                  const dateStr = isFollowUp 
                    ? (event.nextFollowUpDate ? new Date(event.nextFollowUpDate).toLocaleDateString() : 'No date')
                    : (event.createdAt?.toDate ? event.createdAt.toDate().toLocaleDateString() : 'Just now');
                  const isFuture = isFollowUp && event.nextFollowUpDate && (new Date(event.nextFollowUpDate).getTime() > Date.now());

                  return (
                    <div key={`${event.type}-${event.id}`} className="relative pl-6">
                      {/* Timeline Dot */}
                      <span className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white 
                        ${isFuture ? 'bg-blue-500 animate-pulse' : (isFollowUp ? 'bg-indigo-400' : 'bg-emerald-400')}
                      `} />
                      
                      <div className="bg-white border text-left border-neutral-100 shadow-sm rounded-xl p-4 hover:border-neutral-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded
                            ${isFuture ? 'bg-blue-50 text-blue-700' : (isFollowUp ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700')}
                          `}>
                            {isFuture ? 'Upcoming Follow-up' : (isFollowUp ? 'Follow-up' : 'Outreach Call')}
                          </span>
                          <span className="text-xs font-semibold text-neutral-400">{dateStr}</span>
                        </div>
                        
                        {isFollowUp ? (
                          <>
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-semibold text-neutral-800">{event.followupCategory || 'General Check-in'}</p>
                              <button 
                                onClick={() => setEditingFollowUp(event)}
                                className="p-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                                title="Edit Follow-up"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                              </button>
                            </div>
                            {event.notes && <p className="text-sm text-neutral-600 mt-2 bg-neutral-50 p-2 rounded">{event.notes}</p>}
                            <div className="flex items-center gap-2 mt-3 text-xs text-neutral-500 font-medium">
                              <span className="bg-neutral-100 px-2 py-1 rounded">{event.status || 'Open'}</span>
                              {event.assignedTo && <span>• Assigned to {event.assignedTo}</span>}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-neutral-800">{event.callStatus || 'Call Logged'}</p>
                            {event.aiSummary && <p className="text-sm text-neutral-600 mt-2 bg-emerald-50/50 p-2 rounded italic border-l-2 border-emerald-300">" {event.aiSummary} "</p>}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {(showAddFollowUp || editingFollowUp) && (
        <AddFollowUp 
          editData={editingFollowUp}
          onClose={() => { setShowAddFollowUp(false); setEditingFollowUp(null); }}
          prefilledLeadId={lead.id}
          prefilledLeadName={`${lead.firstName} ${lead.lastName}`}
          prefilledDepartment={lead.department}
        />
      )}
    </>
  );
}
