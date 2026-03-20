import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-toastify';

const CategoryManagement = () => {
  const [categoryTab, setCategoryTab] = useState('sources');
  const [items, setItems] = useState([]);

  // States for adding
  const [newItem, setNewItem] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLocation, setNewLocation] = useState('');

  // States for editing
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // Pre-defined locations matching your app
  const locations = ["All location", "Koyilandy", "Payyannur", "Chengannur"];

  // Configuration for all tabs
  const catConfig = {
    sources: { collection: 'sources', label: 'Lead Sources', placeholder: 'e.g. Facebook', hasDesc: false, hasLocation: false },
    leadCategories: { collection: 'leadCategories', label: 'Lead Categories', placeholder: 'e.g. DIABETES', hasDesc: false, hasLocation: false },
    followUpCategories: { collection: 'followUpCategories', label: 'Follow-up Types', placeholder: 'e.g. Call', hasDesc: false, hasLocation: false },
    staffMembers: { collection: 'staffMembers', label: 'Staff / Assignees', placeholder: 'e.g. John Doe', hasDesc: true, descPlaceholder: 'Role (e.g. Receptionist)', hasLocation: true },
    // UPDATED: Now Doctors will show the Location selection dropdown
    doctors: { collection: 'doctors', label: 'Doctors', placeholder: 'e.g. Dr. Ramesh', hasDesc: true, descPlaceholder: 'Specialty (e.g. Neurologist)', hasLocation: true }
  };

  const currentConfig = catConfig[categoryTab];

  useEffect(() => {
    const q = query(collection(db, currentConfig.collection), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [categoryTab, currentConfig.collection]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    // Require location selection if tab configuration requires it
    if (currentConfig.hasLocation && !newLocation) {
      toast.warning(`Please select a location for this ${currentConfig.label.slice(0, -1)}.`);
      return;
    }

    try {
      const dataToSave = {
        name: categoryTab === 'leadCategories' ? newItem.toUpperCase() : newItem,
        createdAt: serverTimestamp()
      };

      if (currentConfig.hasDesc) dataToSave.description = newDescription;
      if (currentConfig.hasLocation) dataToSave.location = newLocation;

      await addDoc(collection(db, currentConfig.collection), dataToSave);

      // Reset fields
      setNewItem('');
      setNewDescription('');
      setNewLocation('');
      toast.success(`${currentConfig.label.slice(0, -1)} added successfully!`);
    } catch (error) {
      toast.error("Error adding category: " + error.message);
    }
  };

  const handleUpdate = async (id) => {
    try {
      const dataToUpdate = {
        name: categoryTab === 'leadCategories' ? editValue.toUpperCase() : editValue
      };

      if (currentConfig.hasDesc) dataToUpdate.description = editDescription;
      if (currentConfig.hasLocation) dataToUpdate.location = editLocation;

      await updateDoc(doc(db, currentConfig.collection, id), dataToUpdate);
      setEditingId(null);
      toast.success(`${currentConfig.label.slice(0, -1)} updated successfully!`);
    } catch (error) {
      toast.error("Error updating category: " + error.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteDoc(doc(db, currentConfig.collection, id));
        toast.success(`${currentConfig.label.slice(0, -1)} deleted successfully!`);
      } catch (error) {
        toast.error("Error deleting category: " + error.message);
      }
    }
  };

  return (
    <div className="w-full">

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 bg-neutral-50/50 p-2 rounded-xl border border-neutral-200/60 inline-flex">
        {Object.keys(catConfig).map((key) => (
          <button
            key={key}
            onClick={() => {
              setCategoryTab(key);
              setEditingId(null);
              setNewItem('');
              setNewDescription('');
              setNewLocation('');
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm outline-none
              ${categoryTab === key
                ? 'bg-white text-primary-700 border border-neutral-200'
                : 'bg-transparent text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 border border-transparent'
              }`}
          >
            {catConfig[key].label}
          </button>
        ))}
      </div>

      {/* Add New Item Form */}
      <div className="card mb-8">
        <h3 className="text-lg font-bold text-neutral-800 mb-4 border-b border-neutral-100 pb-3">Add {currentConfig.label}</h3>
        <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={currentConfig.placeholder}
            className="flex-1 min-w-[200px]"
            required
          />

          {/* Dynamic Description Input */}
          {currentConfig.hasDesc && (
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder={currentConfig.descPlaceholder}
              className="flex-1 min-w-[200px]"
            />
          )}

          {/* Dynamic Location Dropdown */}
          {currentConfig.hasLocation && (
            <select
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="flex-1 min-w-[200px]"
              required
            >
              <option value="" disabled>Select Location</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          )}

          <button type="submit" className="btn-primary whitespace-nowrap w-full sm:w-auto mt-2 sm:mt-0">
            Add Entry
          </button>
        </form>
      </div>

      {/* Data Table */}
      <div className="card border-neutral-200">
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full text-left whitespace-nowrap lg:whitespace-normal min-w-max">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="w-1/3 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Name</th>
                {currentConfig.hasDesc && <th className="w-1/3 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Details</th>}
                {currentConfig.hasLocation && <th className="w-1/6 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Location</th>}
                <th className="w-1/6 px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-neutral-50 transition-colors">

                  {/* Name Column */}
                  <td className="px-4 py-3">
                    {editingId === item.id ? (
                      <input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full p-2 border rounded" autoFocus />
                    ) : (
                      <span className="font-semibold text-neutral-900 break-words">{item.name}</span>
                    )}
                  </td>

                  {/* Dynamic Description Column */}
                  {currentConfig.hasDesc && (
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Update details" className="w-full p-2 border rounded" />
                      ) : (
                        <span className="text-neutral-600 break-words">{item.description || '-'}</span>
                      )}
                    </td>
                  )}

                  {/* Dynamic Location Column */}
                  {currentConfig.hasLocation && (
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <select value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="w-full p-2 border rounded">
                          {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        </select>
                      ) : (
                        <span className="text-neutral-600 break-words">{item.location || '-'}</span>
                      )}
                    </td>
                  )}

                  {/* Actions Column */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === item.id ? (
                        <button onClick={() => handleUpdate(item.id)} className="px-3 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded text-sm font-medium transition-colors">Save</button>
                      ) : (
                        <button onClick={() => {
                          setEditingId(item.id);
                          setEditValue(item.name);
                          setEditDescription(item.description || '');
                          setEditLocation(item.location || locations[0]);
                        }} className="px-3 py-1 bg-emerald-50 text-indigo-600 hover:bg-emerald-100 rounded text-sm font-medium transition-colors">Edit</button>
                      )}
                      <button onClick={() => handleDelete(item.id, item.name)} className="px-3 py-1 bg-emerald-50 text-red-600 hover:bg-emerald-100 rounded text-sm font-medium transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-neutral-500 font-medium italic">No entries found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagement;