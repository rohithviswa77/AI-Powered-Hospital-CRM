import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../../../services/firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (userData.status === 'Inactive') {
          toast.error("Your account has been deactivated. Please contact an administrator.");
          await auth.signOut();
          setLoading(false);
          return;
        }

        localStorage.setItem('staffUID', userData.uid);
        localStorage.setItem('staffRole', userData.role);
        localStorage.setItem('staffEmail', userData.email);
        toast.success("Login Successful!");
        window.dispatchEvent(new Event('authChange'));
        navigate('/');
        
      } else {
        toast.error("Login Failed: Staff profile not found in database.");
        await auth.signOut();
      }
    } catch (err) {
      toast.error("Login Error: " + err.message);
      setError("Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Premium Animated Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary-500/20 blur-[120px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary-500/20 blur-[120px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10 relative z-10 animate-slide-up">

        <div className="text-center mb-10 relative">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-2xl flex items-center justify-center mb-6 shadow-glow-primary transform rotate-12">
            <svg className="w-8 h-8 text-white -rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-100 tracking-tight mb-2">
            Herbally<span className="text-white">touch</span>
          </h2>
          <p className="text-sm font-medium text-emerald-100/70 uppercase tracking-widest">Secure Staff Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm font-medium flex items-center backdrop-blur-sm">
              <svg className="w-5 h-5 mr-3 shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="staff@herbally.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full px-5 py-3.5 rounded-xl border border-white/10 focus:border-primary-400 focus:ring-4 focus:ring-primary-400/20 transition-all outline-none bg-black/20 focus:bg-black/40 text-white placeholder-white/30"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider" htmlFor="password">Password</label>
              <Link to="/forgot-password" className="text-xs font-bold text-primary-400 hover:text-primary-300 transition-colors">
                Forgot Password?
              </Link>
            </div>

            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-5 py-3.5 rounded-xl border border-white/10 focus:border-primary-400 focus:ring-4 focus:ring-primary-400/20 transition-all outline-none bg-black/20 focus:bg-black/40 text-white placeholder-white/30"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 mt-2 rounded-xl text-white font-bold text-lg bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-400 hover:to-secondary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-glow-primary hover:-translate-y-1"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>

      <div className="mt-8 text-sm text-neutral-500 font-medium relative z-10">
        &copy; {new Date().getFullYear()} Herballytouch CRM. All rights reserved.
      </div>
    </div>
  );
};

export default SignIn;