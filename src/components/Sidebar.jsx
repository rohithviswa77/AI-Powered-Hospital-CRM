import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, logout } = useAuth();
  
  const allowedItems = userProfile?.allowedNav || [];
  const staffRole = userProfile?.role || 'Staff';

  const handleLogout = async () => {
    try {
      await logout();
      toast.info("Logged out successfully.");
      navigate('/login');
    } catch (error) {
      toast.error("Logout failed: " + error.message);
    }
  };

  const allMenuItems = [
    { name: "Dashboard", path: "/" },
    { name: "Leads", path: "/leads" },
    { name: "Follow ups", path: "/follow-ups" },
    { name: "Patients", path: "/patients" },
    { name: "Outreach Log", path: "/outreach-log" },
    { name: "Appointments", path: "/appointments" },
    { name: "CRM Settings", path: "/crm-settings" },
    { name: "My Profile", path: "/profile" }
  ];

  const filteredMenu = allMenuItems.filter(item => 
    item.name === "My Profile" || allowedItems.includes(item.name)
  );

  return (
    <div className="w-64 h-screen bg-primary-950/95 backdrop-blur-xl border-r border-white/10 text-white flex flex-col sticky top-0 shrink-0 shadow-2xl relative overflow-hidden z-20">
      {/* Glow Effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 blur-3xl rounded-full"></div>

      <div className="p-6 border-b border-primary-800/50 relative z-10">
        <h2 className="text-2xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 uppercase flex flex-col gap-1">
          Herbally
          <span className="text-xs font-semibold text-primary-200 tracking-normal opacity-80 normal-case">CRM System</span>
        </h2>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="text-xs font-medium text-emerald-100/80">
              {staffRole}
            </div>
          </div>
          <Link to="/profile" className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-300 transition-colors border border-white/5" title="View Profile">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 relative z-10 custom-scrollbar">
        <ul className="space-y-1.5">
          {filteredMenu.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative group overflow-hidden
                    ${isActive
                      ? 'bg-gradient-to-r from-primary-500/20 to-secondary-500/10 text-emerald-300 shadow-inner border border-primary-500/30'
                      : 'text-neutral-300 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/5'
                    }`}
                >
                  {/* Active Indicator Bar */}
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-r-md"></div>}

                  {/* Hover Highlight */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

                  <span className="relative z-10">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-primary-800/50 relative z-10">
        <button
          onClick={handleLogout}
          className="w-full py-3 px-4 bg-white/5 hover:bg-red-500/20 text-neutral-300 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 group"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;