import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';

// Auth Pages
import SignIn from '../pages/Auth/SignIn/SignIn';
import ForgotPassword from '../pages/Auth/ForgotPassword/ForgotPassword';

// CRM Pages
import Dashboard from '../pages/Dashboard/Dashboard';
import Leads from '../pages/Leads/Leads';
import FollowUps from '../pages/FollowUps/FollowUps';
import Patients from '../pages/Patients/Patients';
// UPDATED: Import name matches the renamed module
import OutreachLog from '../pages/OutreachLog/OutreachLog';
import Appointments from '../pages/Appointments/Appointments';
// Consolidated Admin Module
import CrmSettings from '../pages/CrmSettings/CrmSettings';

const AppRoutes = () => {
  // Authentication check using staff unique ID
  const isAuthenticated = !!localStorage.getItem('staffUID');

  return (
    <Routes>
      {/* --- Public Routes --- */}
      <Route path="/login" element={<SignIn />} />
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

      {/* UPDATED: Lowercase path for cleaner URL navigation */}
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

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
    </Routes>
  );
};

export default AppRoutes;