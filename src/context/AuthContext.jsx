import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Initial fetch and then real-time listener for profile changes (status, roles, etc.)
        const userDocRef = doc(db, "users", user.uid);
        
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            
            // Critical Check: If user is deactivated, sign them out immediately
            if (profileData.status === 'Inactive') {
              toast.error("Your account has been deactivated. Logging out...");
              handleLogout();
              return;
            }
            
            setUserProfile(profileData);
            
            // Sync with localStorage for legacy components if needed (will phase out)
            localStorage.setItem('staffUID', profileData.uid);
            localStorage.setItem('staffRole', profileData.role || 'Staff');
            localStorage.setItem('staffEmail', profileData.email);
          } else {
            console.error("User profile not found in Firestore.");
            setUserProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setLoading(false);
        });

        return () => unsubscribeProfile();
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
        
        // Clear legacy storage
        localStorage.removeItem('staffUID');
        localStorage.removeItem('staffRole');
        localStorage.removeItem('staffEmail');
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // localStorage items are handled in the onAuthStateChanged effect
      window.dispatchEvent(new Event('authChange'));
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  const value = {
    currentUser,
    userProfile,
    isAuthenticated: !!currentUser && !!userProfile,
    loading,
    login: handleLogin,
    logout: handleLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
