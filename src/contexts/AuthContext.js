import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to get and store ID token
  const storeIdToken = async (user) => {
    if (user) {
      try {
        const idToken = await user.getIdToken(true); // Force refresh if needed
        localStorage.setItem('idToken', idToken);
        console.log('Firebase ID Token stored/refreshed in localStorage.');
      } catch (tokenError) {
        console.error('Error getting ID token:', tokenError);
        localStorage.removeItem('idToken'); // Clear potentially stale token
        setError('Falha ao obter token de autenticação.');
      }
    } else {
      localStorage.removeItem('idToken');
      console.log('User logged out, ID Token removed from localStorage.');
    }
  };

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async function login(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Store token immediately after login
    await storeIdToken(userCredential.user);
    return userCredential;
  }

  function logout() {
    // Clear token immediately on logout call
    localStorage.removeItem('idToken');
    console.log('Token removed from localStorage on logout (AuthContext).');
    return signOut(auth);
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("Google Sign-In successful for:", user.email);

      // Store token immediately after Google login
      await storeIdToken(user);

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        console.log("Creating Firestore document for new Google user:", user.uid);
        await setDoc(userDocRef, {
          email: user.email,
          uid: user.uid,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
          bots: []
        });
      } else {
        console.log("Firestore document already exists for Google user:", user.uid);
      }
      return result;
    } catch (error) {
      console.error("Error during Google Sign-In:", error);
      setError(error.message);
      throw error;
    }
  }

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed. User:", user ? user.uid : null);
      setCurrentUser(user);
      // Store or clear token whenever auth state changes
      await storeIdToken(user);
      setLoading(false);
    });

    // Set up an interval to refresh the token periodically (e.g., every 45 minutes)
    // Firebase ID tokens expire after 1 hour.
    const intervalId = setInterval(async () => {
      if (auth.currentUser) {
        console.log("Periodically refreshing ID token...");
        await storeIdToken(auth.currentUser);
      }
    }, 45 * 60 * 1000); // 45 minutes

    // Cleanup function
    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  // Memoiza o valor do contexto
  const value = useMemo(() => ({
    currentUser,
    loading,
    error,
    signup,
    login,
    logout,
    loginWithGoogle
  // Dependências: mudam apenas quando o usuário ou estado de loading/erro mudam
  }), [currentUser, loading, error]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 