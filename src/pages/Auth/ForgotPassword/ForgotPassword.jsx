import React, { useState } from 'react';
import { auth } from '../../../services/firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await sendPasswordResetEmail(auth, email);

      setMessage("Password reset email sent! Check your inbox.");
      toast.success("Password reset email sent! Check your inbox.");
      setEmail('');
    } catch (err) {
      toast.error("Error: " + err.message);
      setError("Failed to send reset email. Verify your email address.");
      toast.error("Failed to send reset email. Verify your email address.");
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-100 tracking-tight mb-2">
            Password Recovery
          </h2>
          <p className="text-sm font-medium text-emerald-100/70 uppercase tracking-widest">Restoring Access</p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-6">
          {message && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm font-medium flex items-center backdrop-blur-sm">
              <svg className="w-5 h-5 mr-3 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              {message}
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm font-medium flex items-center backdrop-blur-sm">
              <svg className="w-5 h-5 mr-3 shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2" htmlFor="email">Staff Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="name@herballytouch.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {loading ? "Sending Link..." : "Send Secure Reset Link"}
          </button>
        </form>

        <div className="mt-8 text-center bg-black/20 -mx-8 sm:-mx-10 -mb-8 sm:-mb-10 p-6 rounded-b-3xl border-t border-white/10">
          <Link to="/login" className="text-sm font-semibold text-neutral-300 hover:text-white transition-colors flex justify-center items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back to Sign In
          </Link>
        </div>
      </div>

      <div className="mt-12 text-sm text-neutral-500 font-medium relative z-10">
        &copy; {new Date().getFullYear()} Herballytouch CRM. All rights reserved.
      </div>
    </div>
  );
};

export default ForgotPassword;