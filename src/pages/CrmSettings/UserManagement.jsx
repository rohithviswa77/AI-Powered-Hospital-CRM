import React, { useState, useEffect } from 'react';
import { db, secondaryAuth } from '../../services/firebaseConfig';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword, setPersistence, inMemoryPersistence } from 'firebase/auth';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { toast } from 'react-toastify';

// UPDATED: Added Appointments to the master navigation list
const allNavItems = ["Dashboard", "Leads", "Follow ups", "Patients", "Outreach Log", "Appointments", "CRM Settings"];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUid, setCurrentUid] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null); // { id, name }

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Staff', // Changed default to Staff, but can be anything
    location: '',
    // UPDATED: Default access now includes Outreach Log and Appointments
    allowedNav: ["Dashboard", "Leads", "Follow ups", "Outreach Log", "Appointments"]
  });

  useEffect(() => {
    const unsubUsers = onSnapshot(query(collection(db, "users"), orderBy("createdAt", "desc")), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubUsers();
  }, []);

  const handleNavToggle = (item) => {
    setFormData(prev => {
      const newNav = prev.allowedNav.includes(item)
        ? prev.allowedNav.filter(i => i !== item)
        : [...prev.allowedNav, item];
      return { ...prev, allowedNav: newNav };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.location || formData.location === 'Select Location') {
      toast.warning("Please select a valid location.");
      return;
    }

    try {
      if (isEditing) {
        await updateDoc(doc(db, "users", currentUid), {
          name: formData.name,
          role: formData.role,
          location: formData.location,
          allowedNav: formData.allowedNav
        });
        toast.success("User profile updated successfully!");
      } else {
        // Fix: Prevent secondaryAuth from logging out the primary Auth via persistence overwrite
        await setPersistence(secondaryAuth, inMemoryPersistence);
        
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
        const uid = userCredential.user.uid;

        await setDoc(doc(db, "users", uid), {
          uid: uid,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          location: formData.location,
          allowedNav: formData.allowedNav,
          status: 'Active',
          createdAt: serverTimestamp()
        });

        await secondaryAuth.signOut();
        toast.success(`User created successfully!\nPlease share the temporary password: ${formData.password}`);
      }
      resetForm();
    } catch (error) {
      toast.error("Error: " + error.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await deleteDoc(doc(db, "users", userId));
      toast.success("User profile deleted successfully.");
      setDeletingUser(null);
    } catch (error) {
      toast.error("Error deleting user profile: " + error.message);
    }
  };

  const handleEditClick = (user) => {
    setIsEditing(true);
    setCurrentUid(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      location: user.location || '',
      allowedNav: user.allowedNav || []
    });
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentUid(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'Staff',
      location: '',
      allowedNav: ["Dashboard", "Leads", "Follow ups", "Outreach Log", "Appointments"]
    });
  };

  return (
    <div className="w-full">
      <h3 className="text-xl font-bold text-neutral-800 mb-6">{isEditing ? 'Edit Staff Profile & Access' : 'Create New Staff'}</h3>

      <div className="card mb-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input type="text" placeholder="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full" />
            <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={isEditing} required className="w-full disabled:opacity-50 disabled:bg-neutral-100" />

            {!isEditing && (
              <input type="text" placeholder="Initial Password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required className="w-full" />
            )}

            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full">
              <option value="Staff">Staff</option>
              <option value="Doctor">Doctor</option>
              <option value="Receptionist">Receptionist</option>
              <option value="Admin">Admin</option>
              <option value="Superadmin">Superadmin</option>
            </select>

            <select value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} required className="w-full">
              <option value="" disabled>Select Location</option>
              <option value="All location">All location</option>
              <option value="Koyilandy">Koyilandy</option>
              <option value="Payyannur">Payyannur</option>
              <option value="Chengannur">Chengannur</option>
            </select>
          </div>

          <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-200">
            <strong className="block text-sm font-semibold text-neutral-700 mb-4">Allowed Navigation Pages:</strong>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {allNavItems.map(item => {
                // Hide CRM Settings checkbox if role is not Admin or Superadmin
                const isAdvancedRole = formData.role === 'Admin' || formData.role === 'Superadmin';
                if (item === 'CRM Settings' && !isAdvancedRole) return null;

                return (
                  <label key={item} className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 cursor-pointer transition-colors"
                        checked={formData.allowedNav.includes(item)}
                        onChange={() => handleNavToggle(item)}
                      />
                    </div>
                    <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900 transition-colors">{item}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary">
              {isEditing ? 'Update User Access' : 'Create Account'}
            </button>
            {isEditing && <button type="button" className="btn-outline" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>

      <h3 className="text-xl font-bold text-neutral-800 mb-6">Staff Directory</h3>
      <div className="card border-neutral-200">
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full text-left whitespace-nowrap lg:whitespace-normal min-w-max">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Allowed Menus</th>
                <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-neutral-900">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{user.location}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500 max-w-[200px] truncate" title={user.allowedNav?.join(", ")}>
                    {user.allowedNav?.join(", ")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="px-3 py-1 bg-primary-50 text-indigo-600 hover:bg-primary-100 rounded text-sm font-medium transition-colors" onClick={() => handleEditClick(user)}>Edit</button>
                      <button type="button" className="px-3 py-1 bg-primary-50 text-red-600 hover:bg-primary-100 rounded text-sm font-medium transition-colors" onClick={() => setDeletingUser({ id: user.id, name: user.name })}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-neutral-500 font-medium italic">No staff members found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={!!deletingUser}
        title="Revoke CRM Access"
        message={`Are you sure you want to permanently revoke CRM access for ${deletingUser?.name}? They will no longer be able to log in.`}
        onConfirm={() => handleDeleteUser(deletingUser.id)}
        onCancel={() => setDeletingUser(null)}
      />
    </div>
  );
};

export default UserManagement;