import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  db,
  handleFirestoreError,
  OperationType,
  testConnection,
} from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  needsProfileSetup: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  saveProfile: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  useEffect(() => {
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
            setNeedsProfileSetup(false);
          } else {
            // New user, prompt for crew display name
            setProfile(null);
            setNeedsProfileSetup(true);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile(null);
        setNeedsProfileSetup(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Error al iniciar sesión con Google:', error);
      throw error;
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      setProfile(null);
      setNeedsProfileSetup(false);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const saveProfile = async (displayName: string) => {
    if (!user) throw new Error('No hay usuario autenticado');
    const trimmed = displayName.trim();
    if (!trimmed) throw new Error('El nombre visible no puede estar vacío');

    const userDocRef = doc(db, 'users', user.uid);
    const nowIso = new Date().toISOString();

    try {
      const data: UserProfile = {
        uid: user.uid,
        displayName: trimmed,
        email: user.email || '',
        createdAt: profile?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      await setDoc(userDocRef, data, { merge: true });
      setProfile(data);
      setNeedsProfileSetup(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        needsProfileSetup,
        signIn,
        logOut,
        saveProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
