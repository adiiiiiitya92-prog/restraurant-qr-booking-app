import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../services/firebase';

const AuthContext = createContext(null);

const VALID_ROLES = ['admin', 'kitchen'];
const LOCAL_SESSION_KEY = 'gourmet_staff_user';

const NOT_STAFF_MESSAGE =
  'This account is not registered as Junio 8 staff. Ask the admin to add it in Firestore (staff collection).';

/**
 * Looks up the signed-in user's staff record. The role ONLY comes from
 * staff/{uid} in Firestore, which only an admin can write (see firestore.rules).
 * Returns null when the user is not active staff.
 */
async function fetchStaffProfile(user) {
  const snap = await getDoc(doc(db, 'staff', user.uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (!VALID_ROLES.includes(data.role)) return null;
  // Must match firestore.rules exactly: `active` is either missing or the BOOLEAN true.
  // A string "true" typed in the console passes a loose check here but the rules reject it.
  if (data.active !== undefined && data.active !== true) {
    if (data.active !== false) {
      throw Object.assign(
        new Error('Your staff record has "active" saved as text. In Firestore, change the field type of "active" to boolean and set it to true.'),
        { code: 'bad-staff-record' }
      );
    }
    return null;
  }
  return {
    uid: user.uid,
    email: user.email,
    name: data.name || user.email,
    role: data.role,
  };
}

function friendlyAuthError(err) {
  switch (err?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Wrong email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'No internet connection. Check the Wi-Fi and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return err?.message || 'Could not sign in. Please try again.';
  }
}

// ---- Remembered staff profile -------------------------------------------
// The Firebase login itself is persisted by Firebase (see services/firebase.js).
// We also remember the staff role on this device, so a short Wi-Fi drop or a
// slow start does not throw the kitchen tablet back to the login screen.
// Security is unchanged: Firestore rules still check the live staff record on
// every read/write, so a blocked or removed person gets no data.
const PROFILE_CACHE_KEY = 'junio8_staff_profile';

function readCachedProfile(uid) {
  try {
    const cached = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || 'null');
    return cached && cached.uid === uid && VALID_ROLES.includes(cached.role) ? cached : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(profile) {
  try {
    if (profile) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {}
}

// Network / server hiccups that should NOT log anyone out.
function isTransientError(err) {
  return (
    ['unavailable', 'deadline-exceeded', 'resource-exhausted', 'internal', 'cancelled', 'auth/network-request-failed'].includes(err?.code) ||
    /offline|network/i.test(err?.message || '')
  );
}

// Demo-only roles for local mode (no Firebase keys). Never used once Firebase is configured.
function localDemoRole(email) {
  return email.toLowerCase().includes('admin') ? 'admin' : 'kitchen';
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'kitchen' | null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFirebaseConfigured && auth && db) {
      // Clear any session left over from local demo mode.
      localStorage.removeItem(LOCAL_SESSION_KEY);
      localStorage.removeItem('gourmet_demo_user');

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          writeCachedProfile(null);
          setCurrentUser(null);
          setUserRole(null);
          setLoading(false);
          return;
        }

        // Show the remembered role straight away (no login flash on refresh),
        // then confirm it against Firestore.
        const cached = readCachedProfile(user.uid);
        if (cached) {
          setCurrentUser({ ...user, ...cached });
          setUserRole(cached.role);
          setLoading(false);
        }

        try {
          const profile = await fetchStaffProfile(user);
          if (profile) {
            writeCachedProfile(profile);
            setCurrentUser({ ...user, ...profile });
            setUserRole(profile.role);
          } else {
            // Not staff any more (removed or blocked): sign out for real.
            writeCachedProfile(null);
            await firebaseSignOut(auth);
            setCurrentUser(null);
            setUserRole(null);
          }
        } catch (err) {
          console.error('Could not load staff profile:', err);
          if (isTransientError(err) && cached) {
            // Keep the remembered session; Firestore will reconnect on its own.
          } else {
            writeCachedProfile(null);
            setCurrentUser(null);
            setUserRole(null);
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }

    // Local demo mode (no Firebase keys)
    const saved = localStorage.getItem(LOCAL_SESSION_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentUser(parsed);
        setUserRole(parsed.role);
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const cleanEmail = (email || '').trim();

    if (isFirebaseConfigured && auth && db) {
      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      } catch (err) {
        throw new Error(friendlyAuthError(err));
      }

      let profile = null;
      try {
        profile = await fetchStaffProfile(cred.user);
      } catch (err) {
        console.error('Could not load staff profile:', err);
        await firebaseSignOut(auth);
        if (err?.code === 'unavailable' || /offline/i.test(err?.message || '')) {
          throw new Error(
            'Signed in, but the database cannot be reached. Check VITE_FIREBASE_PROJECT_ID in .env matches the Project ID in Firebase settings, and that the Firestore database is created.'
          );
        }
        if (err?.code === 'permission-denied') {
          throw new Error('Database rules blocked reading the staff record. Publish the latest firestore.rules.');
        }
        throw new Error(err?.message || 'Could not load your staff record.');
      }
      if (!profile) {
        await firebaseSignOut(auth);
        throw new Error(NOT_STAFF_MESSAGE);
      }

      writeCachedProfile(profile);
      const userObj = { ...cred.user, ...profile };
      setCurrentUser(userObj);
      setUserRole(profile.role);
      return userObj;
    }

    // Local demo mode: any email works, role guessed from the email.
    const role = localDemoRole(cleanEmail);
    const demoUser = {
      uid: `local_${role}`,
      email: cleanEmail,
      name: role === 'admin' ? 'Admin (demo)' : 'Kitchen (demo)',
      role,
    };
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(demoUser));
    setCurrentUser(demoUser);
    setUserRole(role);
    return demoUser;
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await firebaseSignOut(auth);
      } catch (e) {
        console.error('Firebase signout error:', e);
      }
    }
    localStorage.removeItem(LOCAL_SESSION_KEY);
    localStorage.removeItem('gourmet_demo_user');
    writeCachedProfile(null);
    setCurrentUser(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userRole,
        loading,
        login,
        logout,
        isAdmin: userRole === 'admin',
        isKitchen: userRole === 'kitchen' || userRole === 'admin',
        isFirebaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
