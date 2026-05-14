/**
 * AuthContext.tsx - Manages authentication and user profile state
 * Updated to handle persistent savedAddresses and impact stats refresh
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  updateEmail,
  updatePassword
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types/user';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  logout: () => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  updateProfileData: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
  updateSettings: (settings: Partial<UserProfile['settings']>) => Promise<void>;
  updateEmailAddress: (newEmail: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  selectedAddressIndex: number;
  setSelectedAddressIndex: (index: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);

  const fetchProfile = async (uid: string, force = false) => {
    // If not forced, check if we have recent data (less than 5 mins old)
    const now = Date.now();
    if (!force && profile && profile.lastFetched && (now - profile.lastFetched < 5 * 60 * 1000)) {
      return;
    }

    setProfileLoading(true);
    const localKey = `profile_${uid}`;
    
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        const profileWithMetadata = { 
          ...data, 
          lastFetched: now 
        };
        setProfile(profileWithMetadata);
        localStorage.setItem(localKey, JSON.stringify(profileWithMetadata));
      } else {
        console.log("Creating new cloud profile for user:", uid);
        const currentUser = auth.currentUser;
        const newProfile: UserProfile = {
          uid: uid,
          email: currentUser?.email || '',
          displayName: currentUser?.displayName || 'Rescue Hero',
          photoURL: currentUser?.photoURL || '',
          savedCO2: 0,
          mealsSaved: 0,
          savedAddresses: [],
          settings: {
            pushNotifications: true,
            emailUpdates: false,
            darkMode: false
          },
          createdAt: new Date().toISOString()
        };
        
        await setDoc(userRef, {
          ...newProfile,
          createdAt: serverTimestamp()
        }, { merge: true });
        
        const profileWithMetadata = { ...newProfile, lastFetched: now };
        setProfile(profileWithMetadata);
        localStorage.setItem(localKey, JSON.stringify(profileWithMetadata));
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
    } finally {
      setProfileLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid, true);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      
      if (authUser) {
        const localKey = `profile_${authUser.uid}`;
        const cached = localStorage.getItem(localKey);
        
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setProfile(parsed);
            
            // If data is recent, we can skip initial background fetch or do it silently
            const now = Date.now();
            if (parsed.lastFetched && (now - parsed.lastFetched < 2 * 60 * 1000)) {
              setLoading(false);
              // Still fetch in background but don't block
              fetchProfile(authUser.uid);
              return;
            }
          } catch (e) {
            console.error("Cache parse error", e);
          }
        }
        
        fetchProfile(authUser.uid).finally(() => setLoading(false));
      } else {
        setProfile(null);
        localStorage.removeItem(user?.uid ? `profile_${user.uid}` : '');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const register = async (email: string, password: string, fullName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: fullName });
      
      const newProfile: UserProfile = {
        uid: userCredential.user.uid,
        email: userCredential.user.email || '',
        displayName: fullName,
        photoURL: '',
        savedCO2: 0,
        mealsSaved: 0,
        savedAddresses: [],
        settings: {
          pushNotifications: true,
          emailUpdates: false,
          darkMode: false
        },
        createdAt: new Date().toISOString()
      };

      setProfile(newProfile);
      localStorage.setItem(`profile_${userCredential.user.uid}`, JSON.stringify(newProfile));

      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          ...newProfile,
          createdAt: serverTimestamp()
        });
      } catch (cloudError) {
        console.warn("Initial cloud profile creation failed:", cloudError);
      }
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (profile?.settings?.darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [profile?.settings?.darkMode]);

  const updateProfileData = async (data: { displayName?: string; photoURL?: string }) => {
    if (!user) return;
    const localKey = `profile_${user.uid}`;
    try {
      const updatedProfile = { ...profile, ...data } as UserProfile;
      setProfile(updatedProfile);
      localStorage.setItem(localKey, JSON.stringify(updatedProfile));

      if (data.displayName || data.photoURL) {
        await updateProfile(user, { 
          displayName: data.displayName || user.displayName,
          photoURL: data.photoURL || user.photoURL
        });
      }
      await setDoc(doc(db, 'users', user.uid), data as any, { merge: true });
      await refreshProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const updateSettings = async (newSettings: Partial<UserProfile['settings']>) => {
    if (!user || !profile) return;
    const localKey = `profile_${user.uid}`;
    try {
      const mergedSettings = { 
        pushNotifications: true,
        emailUpdates: false,
        darkMode: false,
        ...profile.settings, 
        ...newSettings 
      };
      
      const updatedProfile = {
        ...profile,
        settings: mergedSettings
      } as UserProfile;

      setProfile(updatedProfile);
      localStorage.setItem(localKey, JSON.stringify(updatedProfile));

      await setDoc(doc(db, 'users', user.uid), {
        settings: mergedSettings
      }, { merge: true });
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  };

  const updateEmailAddress = async (newEmail: string) => {
    if (!user) return;
    try {
      await updateEmail(user, newEmail);
      await setDoc(doc(db, 'users', user.uid), { email: newEmail }, { merge: true });
      await refreshProfile();
    } catch (error) {
      console.error("Error updating email:", error);
      throw error;
    }
  };

  const updateUserPassword = async (newPassword: string) => {
    if (!user) return;
    try {
      await updatePassword(user, newPassword);
    } catch (error) {
      console.error("Error updating password:", error);
      throw error;
    }
  };

  const logout = async () => {
    if (user) {
      localStorage.removeItem(`profile_${user.uid}`);
    }
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      profileLoading,
      logout, 
      register, 
      login, 
      updateProfileData,
      updateSettings,
      updateEmailAddress,
      updateUserPassword,
      refreshProfile,
      selectedAddressIndex,
      setSelectedAddressIndex
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
