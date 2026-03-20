import React from 'react';
import Sidebar from './Sidebar';
import { useInactivityTimeout } from '../hooks/useInactivityTimeout';
import { useAuth } from '../context/AuthContext';
import SessionTimeoutWarning from './SessionTimeoutWarning';

const Layout = ({ children }) => {
  const { logout, isAuthenticated } = useAuth();

  // Session timeout: 30 minutes total, warning at 1 minute left
  const { isWarningActive, remainingTime, handleStayLoggedIn } = useInactivityTimeout(
    30 * 60 * 1000, 
    60 * 1000, 
    logout
  );

  return (
    <div className="flex h-screen bg-neutral-50 text-neutral-800 relative overflow-hidden">
      {/* Background decorations for depth */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-300/20 blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary-300/20 blur-3xl pointer-events-none"></div>

      <Sidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto relative z-10 w-full max-w-full">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Conditionally render the warning modal when authenticated and warning is active */}
      {isAuthenticated && isWarningActive && (
        <SessionTimeoutWarning 
          remainingTime={remainingTime}
          onStayLoggedIn={handleStayLoggedIn}
          onLogout={logout}
        />
      )}
    </div>
  );
};

export default Layout;