import React from 'react';

const DeleteConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-neutral-100 animate-slide-up">
        
        {/* Header with Icon */}
        <div className="px-6 pt-8 pb-4 text-center">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">{title || 'Confirm Delete'}</h2>
          <p className="text-sm text-neutral-500 font-medium px-4">
            {message || 'Are you sure you want to delete this record? This action cannot be undone.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-8 pt-4 flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-500/20 transition-all transform active:scale-95"
          >
            Delete Permanently
          </button>
          <button 
            onClick={onCancel}
            className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-3 rounded-xl transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
