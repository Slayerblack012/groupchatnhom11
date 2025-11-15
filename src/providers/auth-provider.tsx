"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut 
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import type { UserProfile } from "@/types";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<any>;
  signUpWithEmail: (email: string, pass: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setUser(docSnap.data() as UserProfile);
        } else {
           const newUserProfile: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || firebaseUser.email,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
          };
          // Using non-blocking write with contextual error handling
          setDocumentNonBlocking(userRef, newUserProfile, { merge: false });
          setUser(newUserProfile);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };
  
  const signUpWithEmail = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const firebaseUser = userCredential.user;
    
    // Create user profile
    const newUserProfile: UserProfile = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || email, // Use email as fallback
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
    };
    const userRef = doc(db, "users", firebaseUser.uid);
    // Use the non-blocking function which handles contextual errors
    setDocumentNonBlocking(userRef, newUserProfile, { merge: false });

    // This is handled by onAuthStateChanged but we can set it here to speed up UI
    setUser(newUserProfile); 
    
    return userCredential;
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const value = { user, loading, signInWithEmail, signUpWithEmail, signOut };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
