import React, { useState } from 'react';
import CategoryManagement from './CategoryManagement';
import UserManagement from './UserManagement';

const CrmSettings = () => {
  const [activeTab, setActiveTab] = useState('categories');

  return (
    <div className="animate-fade-in w-full max-w-full overflow-hidden pb-10">
      <header className="mb-8 pb-4 border-b border-neutral-200">
        <h1 className="page-title mb-1">CRM Administration</h1>
        <p className="text-sm font-medium text-neutral-500">Manage categories, staff access, and system configurations.</p>
      </header>

      {/* Navigation Buttons for the two main pages */}
      <div className="flex gap-2 sm:gap-6 border-b border-neutral-200 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 sm:px-6 py-3 text-sm font-semibold transition-colors duration-200 whitespace-nowrap border-b-2 outline-none
            ${activeTab === 'categories'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
            }`}
        >
          Categories Management
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 sm:px-6 py-3 text-sm font-semibold transition-colors duration-200 whitespace-nowrap border-b-2 outline-none
            ${activeTab === 'users'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
            }`}
        >
          User Management
        </button>
      </div>

      <div className="w-full">
        {activeTab === 'categories' ? <CategoryManagement /> : <UserManagement />}
      </div>
    </div>
  );
};

export default CrmSettings;