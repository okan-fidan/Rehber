import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

const AuthContext = createContext(undefined);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Function to fetch user profile from backend
  const fetchUserProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setUserProfile(null);
      return null;
    }

    setProfileLoading(true);
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const profile = await response.json();
        // Check if user needs to complete registration
        if (profile.needsRegistration || !profile.firstName) {
          setUserProfile(null);
          setProfileLoading(false);
          return null;
        } else {
          setUserProfile(profile);
          localStorage.setItem('userProfile', JSON.stringify(profile));
          setProfileLoading(false);
          return profile;
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
    setProfileLoading(false);
    return null;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        await fetchUserProfile(firebaseUser);
      } else {
        setUserProfile(null);
        localStorage.removeItem('userProfile');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchUserProfile]);

  const signIn = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Wait for profile to be loaded
    await fetchUserProfile(userCredential.user);
    return userCredential;
  };

  const signUp = async (email, password) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
    localStorage.removeItem('userProfile');
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, profileLoading, signIn, signUp, signOut, userProfile, setUserProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
