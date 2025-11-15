
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut 
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import type { UserProfile } from "@/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

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
        try {
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
            // Use setDoc and catch potential permission errors
            setDoc(userRef, newUserProfile, { merge: false })
              .then(() => {
                setUser(newUserProfile);
              })
              .catch(error => {
                const permissionError = new FirestorePermissionError({
                  path: userRef.path,
                  operation: 'create',
                  requestResourceData: newUserProfile,
                });
                errorEmitter.emit('permission-error', permissionError);
              });
          }
        } catch (error) {
           // This could be a permission error on getDoc
           const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'get',
          });
          errorEmitter.emit('permission-error', permissionError);
          setUser(null); // Clear user if profile can't be fetched
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
    
    const newUserProfile: UserProfile = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || email,
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
    };
    const userRef = doc(db, "users", firebaseUser.uid);
    
    // Using setDoc with contextual error handling
    setDoc(userRef, newUserProfile, { merge: false })
      .then(() => {
        // This is handled by onAuthStateChanged but we can set it here to speed up UI
        setUser(newUserProfile); 
        // If the user is the admin, create the admin role document
        if (email === 'admin@gmail.com') {
            const adminRoleRef = doc(db, "roles_admin", firebaseUser.uid);
            setDoc(adminRoleRef, { admin: true }).catch(error => {
                const permissionError = new FirestorePermissionError({
                    path: adminRoleRef.path,
                    operation: 'create',
                    requestResourceData: { admin: true },
                });
                errorEmitter.emit('permission-error', permissionError);
            });
        }
      })
      .catch(error => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'create',
          requestResourceData: newUserProfile,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
    
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
