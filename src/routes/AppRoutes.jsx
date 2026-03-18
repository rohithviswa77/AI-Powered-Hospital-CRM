import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

// Auth Pages
import SignIn from '../pages/Auth/SignIn/SignIn';
import ForgotPassword from '../pages/Auth/ForgotPassword/ForgotPassword';

// CRM Pages
import Dashboard from '../pages/Dashboard/Dashboard';
import Leads from '../pages/Leads/Leads';
import FollowUps from '../pages/FollowUps/FollowUps';
import Patients from '../pages/Patients/Patients';
import OutreachLog from '../pages/OutreachLog/OutreachLog';
import Appointments from '../pages/Appointments/Appointments';
import CrmSettings from '../pages/CrmSettings/CrmSettings';
import Profile from '../pages/Profile/Profile';

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* --- Public Routes --- */}
      <Route path="/login" element={!isAuthenticated ? <SignIn /> : <Navigate to="/" />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* --- Protected Routes (Wrapped in Layout) --- */}
      
      <Route
        path="/"
        element={isAuthenticated ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />}
      />

      <Route
        path="/leads"
        element={isAuthenticated ? <Layout><Leads /></Layout> : <Navigate to="/login" />}
      />

      <Route
        path="/follow-ups"
        element={isAuthenticated ? <Layout><FollowUps /></Layout> : <Navigate to="/login" />}
      />

      <Route
        path="/patients"
        element={isAuthenticated ? <Layout><Patients /></Layout> : <Navigate to="/login" />}
      />

      <Route
        path="/outreach-log"
        element={isAuthenticated ? <Layout><OutreachLog /></Layout> : <Navigate to="/login" />}
      />
      
      <Route
      path="/appointments"
      element={isAuthenticated ? <Layout><Appointments /></Layout> : <Navigate to="/login" />}
      />

      <Route
        path="/crm-settings"
        element={isAuthenticated ? <Layout><CrmSettings /></Layout> : <Navigate to="/login" />}
      />

      <Route
        path="/profile"
        element={isAuthenticated ? <Layout><Profile /></Layout> : <Navigate to="/login" />}
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
    </Routes>
  );
};

export default AppRoutes;