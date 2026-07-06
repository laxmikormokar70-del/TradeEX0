import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';

const totp = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin()
});

export interface UserProfile {
  uid: string;
  customUid?: string;
  name: string;
  email: string;
  phone?: string;
  dob?: string;
  createdAt: any;
  profilePhoto?: string;
  securitySecret?: string;
  staticPin?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  gender?: string;
  verified?: boolean;
  currencyPreference?: 'USDT' | 'INR';
  status?: string;
  role?: string;
  kycStatus?: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

async function getDocWithRetry(docRef: any, maxRetries = 4, delayMs = 250): Promise<any> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await getDoc(docRef);
    } catch (error: any) {
      const isPermissionError = error?.message?.includes('permission') || error?.code?.includes('permission') || String(error).toLowerCase().includes('permission');
      if (isPermissionError && attempt < maxRetries - 1) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        continue;
      }
      throw error;
    }
  }
  return await getDoc(docRef);
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;
  // Security Code states
  pendingSecurityUser: User | null;
  verifySecurityCode: (code: string) => Promise<boolean>;
  cancelSecurityLogin: () => void;
  getCurrentSecurityCode: () => Promise<string | null>;
  getSecurityCodeTimeRemaining: () => number;
  
  signUpWithEmail: (email: string, password: string, name: string, dob: string, staticPin: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [pendingSecurityUser, setPendingSecurityUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDocWithRetry(userDocRef);
          
          if (userDoc.exists()) {
             const data = userDoc.data() as UserProfile;
             if (data.currencyPreference) {
                localStorage.setItem('currency_preference', data.currencyPreference);
             } else {
                localStorage.setItem('currency_preference', 'USDT');
             }
             
             // If we have a pending security user, do NOT auto-login user state
             if (pendingSecurityUser && pendingSecurityUser.uid === firebaseUser.uid) {
                setProfile(data);
                setLoading(false);
                return;
             }
             
             if (!pendingSecurityUser) {
                setUser(firebaseUser);
                setProfile(data);
             }
          } else {
             setUser(firebaseUser);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
        setProfile(null);
        setPendingSecurityUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pendingSecurityUser]);

  const signUpWithEmail = async (email: string, password: string, name: string, dob: string, staticPin: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      const secret = totp.generateSecret();
      
      // Generate a unique 8-digit customUid like DX-82475193
      const randNum = Math.floor(10000000 + Math.random() * 90000000); // 8 digits
      let customUid = `DX-${randNum}`;

      const newProfile: UserProfile = {
        uid,
        customUid,
        name,
        email,
        dob,
        createdAt: new Date().toISOString(),
        profilePhoto: `https://api.dicebear.com/7.x/adventurer/svg?seed=${uid}`,
        securitySecret: secret,
        staticPin,
        country: '',
        state: '',
        city: '',
        address: '',
        gender: '',
        verified: false, // Explicitly set to false (unverified) until KYC is approved
        kycStatus: 'not_started', // Explicitly keep as uncompleted KYC status
        currencyPreference: 'USDT' // Default currency preference is USDT
      };

      try {
        localStorage.setItem('currency_preference', 'USDT');
        await setDoc(doc(db, 'users', uid), newProfile);
        setProfile(newProfile);
        setUser(userCredential.user);
        setPendingSecurityUser(null);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `users/${uid}`);
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDocWithRetry(userDocRef);
      if (!userDoc.exists()) {
        if (email === 'laxmikormokar70@gmail.com') {
          const adminProfile: UserProfile = {
            uid,
            customUid: 'DX-ADMIN777',
            name: 'Exchange Administrator',
            email: email,
            createdAt: new Date().toISOString(),
            verified: false,
            kycStatus: 'not_started',
            status: 'active',
            role: 'admin',
            currencyPreference: 'USDT'
          };
          await setDoc(userDocRef, adminProfile);
          setProfile(adminProfile);
          setUser(cred.user);
          setPendingSecurityUser(null);
          return;
        } else {
          await firebaseSignOut(auth);
          throw { code: 'auth/user-not-found' };
        }
      }
      
      const data = userDoc.data() as UserProfile;
      if (data.currencyPreference) {
        localStorage.setItem('currency_preference', data.currencyPreference);
      } else {
        localStorage.setItem('currency_preference', 'USDT');
      }
      setProfile(data);
      if (data.staticPin || data.securitySecret) {
        setPendingSecurityUser(cred.user);
        setUser(null); // Wait for security code
      } else {
        setUser(cred.user);
        setPendingSecurityUser(null);
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDocWithRetry(userDocRef);
      
      if (!userDoc.exists()) {
        await user.delete().catch(() => {});
        await firebaseSignOut(auth);
        throw new Error('User Not Registered. Please create an account first.');
      } else {
        const data = userDoc.data() as UserProfile;
        
        // Ensure secret exists
        if (!data.securitySecret) {
            const secret = totp.generateSecret();
            data.securitySecret = secret;
            await updateDoc(userDocRef, { securitySecret: secret });
        }
        setProfile(data);
        setUser(user);
        setPendingSecurityUser(null);
      }
    } catch (error) {
      throw error;
    } finally {
       setLoading(false);
    }
  };

  const verifySecurityCode = async (code: string) => {
    if (!pendingSecurityUser || !profile) return false;
    try {
      if (profile.staticPin) {
        if (code === profile.staticPin) {
           setUser(pendingSecurityUser);
           setPendingSecurityUser(null);
           return true;
        } else {
           // Provide fallback to TOTP if somehow they also have that
           if (profile.securitySecret) {
             const result = await totp.verify(code, { secret: profile.securitySecret });
             if (result.valid) {
                setUser(pendingSecurityUser);
                setPendingSecurityUser(null);
                return true;
             }
           }
           return false;
        }
      }

      if (profile.securitySecret) {
        const result = await totp.verify(code, { secret: profile.securitySecret });
        if (result.valid) {
           setUser(pendingSecurityUser);
           setPendingSecurityUser(null);
           return true;
        }
      }
      return false;
    } catch(err) {
      console.error('TOTP validation error:', err);
      return false;
    }
  };

  const cancelSecurityLogin = () => {
    firebaseSignOut(auth);
    setPendingSecurityUser(null);
    setUser(null);
    setProfile(null);
  };

  const getCurrentSecurityCode = async () => {
    if (!profile?.securitySecret) return null;
    try {
      return await totp.generate({ secret: profile.securitySecret });
    } catch {
      return null;
    }
  };

  const getSecurityCodeTimeRemaining = () => {
    return 30 - (Math.floor(Date.now() / 1000) % 30);
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setProfile(null);
      setPendingSecurityUser(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  };

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      if (updates.currencyPreference) {
        localStorage.setItem('currency_preference', updates.currencyPreference);
      }
      await updateDoc(userDocRef, updates);
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isProfileOpen,
      setIsProfileOpen,
      pendingSecurityUser,
      verifySecurityCode,
      cancelSecurityLogin,
      getCurrentSecurityCode,
      getSecurityCodeTimeRemaining,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      resetPassword,
      updateProfileData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

