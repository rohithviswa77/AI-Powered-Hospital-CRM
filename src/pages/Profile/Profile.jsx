import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, auth } from '../../services/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'react-toastify';

const Profile = () => {
  const { userProfile, currentUser } = useAuth();
  const [name, setName] = useState('');
  const [updating, setUpdating] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (userProfile?.name) {
      setName(userProfile.name);
    }
  }, [userProfile]);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning("Name cannot be empty.");
      return;
    }

    setUpdating(true);
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { name: name.trim() });
      toast.success("Display name updated successfully!");
    } catch (error) {
      toast.error("Failed to update name: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!currentUser?.email) return;
    
    const confirmReset = window.confirm("Are you sure you want to send a password reset email to " + currentUser.email + "?");
    if (!confirmReset) return;

    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      toast.success("Password reset email sent! Please check your inbox.");
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="animate-fade-in pb-10">
      <header className="mb-10 pb-6 border-b border-neutral-200/60 relative">
        <h1 className="page-title">My Profile</h1>
        <p className="text-sm font-medium text-neutral-500">Manage your account information and security.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Brief Summary Card */}
        <div className="lg:col-span-1">
          <div className="feature-card group flex flex-col items-center text-center p-8 bg-gradient-to-b from-white to-neutral-50/50">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-500 to-secondary-500"></div>
            
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-secondary-100 text-primary-700 flex items-center justify-center font-black text-3xl shadow-float border-4 border-white mb-6 group-hover:scale-105 transition-transform duration-500">
              {userProfile?.name?.[0]?.toUpperCase() || '?'}
            </div>
            
            <h2 className="text-xl font-extrabold text-neutral-900 mb-1">{userProfile?.name}</h2>
            <p className="text-sm font-bold text-primary-600 uppercase tracking-widest mb-4">{userProfile?.role || 'Staff'}</p>
            
            <div className="w-full pt-6 border-t border-neutral-100 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-semibold py-1">
                <span className="text-neutral-400">Account Status</span>
                <span className="text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold py-1">
                <span className="text-neutral-400">Member Since</span>
                <span className="text-neutral-700">{userProfile?.createdAt?.toDate().toLocaleDateString() || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Update Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Information */}
          <div className="card border-neutral-200/60 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-500 flex items-center justify-center shadow-inner">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-neutral-800">Account Information</h3>
            </div>

            <form onSubmit={handleUpdateName} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="font-semibold text-neutral-800"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Registered Email</label>
                  <input
                    type="email"
                    value={currentUser?.email || ''}
                    disabled
                    className="font-semibold text-neutral-500 bg-neutral-50/50 cursor-not-allowed border-dashed"
                  />
                  <p className="text-[10px] text-neutral-400 italic">Email cannot be changed by staff. Contact admin for assistance.</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updating}
                  className="btn-primary !px-10"
                >
                  {updating ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Security & Password */}
          <div className="card border-neutral-200/60 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-secondary-50 text-secondary-500 flex items-center justify-center shadow-inner">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-neutral-800">Security & Privacy</h3>
            </div>

            <div className="bg-neutral-50/80 rounded-2xl p-6 border border-neutral-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1">
                <h4 className="font-bold text-neutral-800">Password Management</h4>
                <p className="text-xs text-neutral-500 max-w-sm">We'll send a secure link to your email to help you set a new password for your clinical account.</p>
              </div>
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={resetting}
                className="btn-secondary !text-xs !py-3 whitespace-nowrap bg-white shadow-soft"
              >
                {resetting ? 'Sending...' : 'Request Password Reset Email'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
