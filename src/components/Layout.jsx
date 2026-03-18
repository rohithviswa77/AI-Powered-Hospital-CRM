import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
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
    </div>
  );
};

export default Layout;