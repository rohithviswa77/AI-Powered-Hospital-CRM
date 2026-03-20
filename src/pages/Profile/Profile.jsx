import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, auth } from '../../services/firebaseConfig';
import { doc, updateDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'react-toastify';
import moment from 'moment';

const Profile = () => {
  const { userProfile, currentUser } = useAuth();
  const [name, setName] = useState('');
  const [updating, setUpdating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
    
    setShowConfirm(false);
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
    <div className="animate-fade-in pb-10 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-neutral-900 rounded-[28px] text-white shadow-2xl rotate-3">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <div>
            <h1 className="text-3xl font-black text-neutral-900 tracking-tighter uppercase leading-none">Clinical Identity</h1>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></span> Profile & Performance Monitoring
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Profile Identity Card */}
        <div className="xl:col-span-1 space-y-8">
          <div className="bg-white/40 backdrop-blur-xl p-10 rounded-[48px] border border-white/60 shadow-xl flex flex-col items-center text-center relative overflow-hidden group h-full">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl group-hover:bg-primary-500/20 transition-all duration-1000"></div>
            
            <div className="relative mb-8 mt-10">
              <div className="w-40 h-40 rounded-[48px] bg-gradient-to-br from-primary-500 to-primary-700 p-1 shadow-2xl shadow-primary-500/30">
                <div className="w-full h-full rounded-[46px] bg-white flex items-center justify-center font-black text-6xl text-neutral-900">
                   {userProfile?.name?.[0]?.toUpperCase() || '?'}
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 p-3 bg-emerald-500 text-white rounded-2xl border-4 border-white shadow-lg">
                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" /></svg>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-black text-neutral-900 tracking-tight uppercase leading-none">{userProfile?.name}</h2>
              <div className="inline-flex px-6 py-2 bg-neutral-900 rounded-full text-[10px] font-black text-white uppercase tracking-widest shadow-lg">
                 {userProfile?.role || 'Clinical Staff'}
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-4 mt-auto mb-10 bg-white/50 p-6 rounded-[32px] border border-neutral-100">
               <div className="text-left">
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Clinic Status</p>
                  <p className="text-sm font-black text-emerald-600 uppercase tracking-tighter">Verified Active</p>
               </div>
               <div className="text-right border-l border-neutral-100 pl-4">
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Service ID</p>
                  <p className="text-sm font-black text-neutral-900 tabular-nums">#{currentUser?.uid?.slice(-6).toUpperCase()}</p>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Settings Stack */}
        <div className="xl:col-span-2 space-y-8">
          <div className="bg-white/60 backdrop-blur-xl p-10 rounded-[48px] border border-neutral-100 shadow-xl space-y-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[20px] bg-neutral-900 text-white flex items-center justify-center font-black">
                 01
              </div>
              <div>
                 <h3 className="text-xl font-black text-neutral-900 tracking-tighter uppercase leading-none">Identity Control</h3>
                 <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-2">Manage clinical registry name & system email</p>
              </div>
            </div>

            <form onSubmit={handleUpdateName} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Full Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="p-4 bg-white/80 rounded-2xl border-neutral-100 font-bold text-neutral-900 focus:ring-2 focus:ring-primary-500/10"
                    required
                  />
                </div>
                <div className="space-y-3 opacity-50">
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Secure System Email</label>
                  <input
                    type="email"
                    value={currentUser?.email || ''}
                    disabled
                    className="p-4 bg-neutral-100 rounded-2xl border-dashed border-neutral-200 font-bold text-neutral-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={updating}
                  className="btn-primary !px-12 !py-4 rounded-2xl shadow-2xl shadow-primary-500/20 active:scale-95 transition-all text-[11px] font-black uppercase tracking-widest"
                >
                  {updating ? 'Updating Cloud...' : 'Revise Identity'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-rose-50/30 backdrop-blur-xl p-10 rounded-[48px] border border-rose-100/50 shadow-xl space-y-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[20px] bg-rose-500 text-white flex items-center justify-center font-black">
                 02
              </div>
              <div>
                 <h3 className="text-xl font-black text-neutral-900 tracking-tighter uppercase leading-none">Security Protocol</h3>
                 <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mt-2">Credential Reset & Account protection</p>
              </div>
            </div>

            <div className="bg-white/80 p-8 rounded-[32px] border border-rose-100 flex flex-col md:flex-row items-center justify-between gap-8 transition-all hover:shadow-lg">
               <div className="space-y-2 text-center md:text-left">
                  <h4 className="font-black text-neutral-900 uppercase tracking-tight italic">Request Authentication Reset</h4>
                  <p className="text-xs text-neutral-500 font-medium max-w-sm leading-relaxed">
                     A secure, unique link will be dispatched to your registered email to facilitate a mandatory password rotation.
                  </p>
               </div>
               <button
                 type="button"
                 onClick={() => setShowConfirm(true)}
                 disabled={resetting}
                 className="px-10 py-4 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 shadow-xl shadow-rose-500/20 active:scale-95 transition-all whitespace-nowrap"
               >
                 {resetting ? 'Executing...' : 'Trigger Password Reset'}
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-md" onClick={() => setShowConfirm(false)}></div>
          <div className="relative bg-white rounded-[40px] p-10 shadow-3xl max-w-md w-full animate-in zoom-in-95 duration-200 border border-neutral-100">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6">
               <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-2xl font-black text-neutral-900 uppercase tracking-tighter mb-2 italic">Confirm Reset?</h3>
            <p className="text-sm font-medium text-neutral-500 leading-relaxed mb-8">
              Are you sure you want to send a password reset link to <span className="font-black text-neutral-900">{currentUser?.email}</span>? This will allow you to change your clinical access credentials.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-4 bg-neutral-100 text-neutral-500 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-neutral-200 transition-all"
              >
                No, Cancel
              </button>
              <button 
                onClick={handlePasswordReset}
                className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-rose-600 shadow-xl shadow-rose-500/20 active:scale-95 transition-all"
              >
                Yes, Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
