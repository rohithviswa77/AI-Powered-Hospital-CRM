import React, { useState } from 'react';
import { auth } from '../../../services/firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Link } from 'react-router-dom';

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

      setMessage("Secure password reset link sent! Please check your email inbox.");
      setEmail('');
    } catch (err) {
      console.error(err);
      setError("Failed to send reset email. Please ensure the email is correct.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-neutral-100 p-8 sm:p-10 transform transition-all">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Password Assistance</h2>
          <p className="text-sm text-neutral-500">Enter your hospital email to reset your password</p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="email">Staff Email</label>
            <input
              id="email"
              type="email"
              placeholder="name@herballytouch.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-colors outline-none bg-neutral-50 focus:bg-white text-neutral-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg text-white font-semibold bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg mt-2"
          >
            {loading ? "Sending Link..." : "Send Secure Reset Link"}
          </button>
        </form>

        <div className="mt-8 text-center bg-neutral-50 -mx-8 -mb-8 p-4 rounded-b-2xl border-t border-neutral-100">
          <Link to="/login" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors flex justify-center items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back to Sign In
          </Link>
        </div>

        {message && (
          <div className="mt-6 p-4 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium text-center">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-6 p-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium text-center flex justify-center items-center">
            <svg className="w-5 h-5 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;