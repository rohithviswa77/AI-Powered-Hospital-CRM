import React from 'react';
import moment from 'moment';

const UrgentTasksFeed = ({ tasks, onComplete, onCall }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'Normal': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Low': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-neutral-50 text-neutral-600 border-neutral-100';
    }
  };

  const isOverdue = (date) => {
    return moment(date).isBefore(moment(), 'day');
  };

  const isToday = (date) => {
    return moment(date).isSame(moment(), 'day');
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-white/40 border border-dashed border-neutral-200 rounded-[32px] h-full">
        <div className="w-16 h-16 bg-neutral-100/50 rounded-full flex items-center justify-center text-neutral-300 mb-4 border border-neutral-200/50">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-black text-neutral-400 uppercase tracking-widest">System Clear</p>
        <p className="text-[11px] font-bold text-neutral-400 mt-2 max-w-[180px]">No critical follow-ups pending in the current vector.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[580px] overflow-y-auto custom-scrollbar pr-2 pb-6">
      {tasks.map((task, idx) => (
        <div 
          key={task.id} 
          className={`relative group transition-all duration-500 bg-white border border-neutral-100 rounded-[24px] p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 animate-entrance`}
          style={{ animationDelay: `${idx * 0.1}s` }}
        >
          {/* Clinical Urgency Accent */}
          <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full transition-all duration-500 ${task.priority === 'High' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'bg-primary-300'}`}></div>

          <div className="flex justify-between items-start mb-3 ml-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${getPriorityColor(task.priority)} shadow-sm`}>
                  {task.priority || 'Normal'}
                </span>
                {task.priority === 'High' && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </div>
              <h4 className="text-[13px] font-black text-neutral-900 leading-tight tracking-tight">
                {task.title}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2.5 mb-4 ml-2">
             <div className="w-7 h-7 rounded-[10px] bg-neutral-50 border border-neutral-100 text-neutral-800 flex items-center justify-center font-black text-[10px] shadow-inner">
               {task.leadName ? task.leadName[0].toUpperCase() : '?'}
             </div>
             <div className="flex flex-col min-w-0">
                <p className="text-[10px] font-black text-neutral-900 uppercase truncate pr-2">{task.leadName || 'ID NULL'}</p>
                <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest leading-none">IDENTIFIER</p>
             </div>
          </div>

          <div className="flex gap-2 border-t border-neutral-50 pt-3 ml-2">
            <button 
              onClick={() => onCall(task)}
              className="flex-1 bg-white border border-neutral-200 hover:border-emerald-500 hover:text-emerald-700 text-neutral-600 py-1.5 px-2 rounded-[14px] text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              Call
            </button>
            <button 
              onClick={() => onComplete(task.id)}
              className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 py-1.5 px-2 rounded-[14px] text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Resolve
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UrgentTasksFeed;
