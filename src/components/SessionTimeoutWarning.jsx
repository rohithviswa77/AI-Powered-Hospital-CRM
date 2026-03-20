import React from 'react';

const SessionTimeoutWarning = ({ remainingTime, onStayLoggedIn, onLogout }) => {
  return (
    <div className="fixed top-20 right-8 z-[9999] p-4 animate-slide-left pointer-events-none">
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-80 overflow-hidden border border-orange-100 relative pointer-events-auto flex flex-col">
        
        {/* Decorative Top Banner */}
        <div className="h-1 w-full bg-gradient-to-r from-orange-400 to-red-500"></div>

        <div className="p-4 flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
            <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-neutral-900 mb-1">Session Expiring</h3>
            <p className="text-xs text-neutral-500 leading-tight">
              Logging out in <strong className="text-orange-400 tabular-nums">{remainingTime}s</strong>. Move your mouse to stay logged in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutWarning;
