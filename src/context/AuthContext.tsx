import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase.ts';
import {
  getUserProfile,
  findUserByEmail,
  saveUserProfile,
  hashPassword,
  findOrganizationByInviteCode,
  createOrganization,
  joinOrganizationByCode,
  updateOrganizationInviteCode,
  getOrganizationById,
  seedInitialOrganizationsIfNeeded,
  DEMO_ORGS
} from '../lib/authService.ts';
import { UserProfile, Organization, UserRole, OrganizationType } from '../types/index.ts';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  organization: Organization | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  signupWithEmail: (params: {
    name: string;
    email: string;
    pass: string;
    role: UserRole;
    inviteCode?: string;
    newOrgName?: string;
    newOrgType?: OrganizationType;
  }) => Promise<boolean>;
  loginWithGoogle: (inviteCode?: string) => Promise<boolean>;
  quickLoginAsDemo: (role: 'admin' | 'member') => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
  joinOrg: (inviteCode: string) => Promise<{ success: boolean; message?: string }>;
  createNewOrganization: (params: {
    name: string;
    type: OrganizationType;
    customInviteCode?: string;
  }) => Promise<{ success: boolean; organization?: Organization; message?: string }>;
  updateInviteCode: (newCode: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Initialize and seed demo data
  useEffect(() => {
    seedInitialOrganizationsIfNeeded();
  }, []);

  // Listen to Firebase Auth state & persistent local profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        let p = await getUserProfile(user.uid);
        if (!p) {
          // If profile does not exist yet (e.g. google login without prior record)
          const fallbackOrg = DEMO_ORGS[0];
          p = {
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Meeting Participant',
            email: user.email || '',
            organizationId: fallbackOrg.id,
            role: 'member',
            notificationPrefs: {
              summaryEmails: true,
              reminderFrequency: 'realtime',
              digest: true
            },
            createdAt: new Date().toISOString()
          };
          await saveUserProfile(p);
        }
        setProfile(p);
        localStorage.setItem('midmeetmind_current_user', JSON.stringify(p));
        if (p.organizationId) {
          const org = await getOrganizationById(p.organizationId);
          setOrganization(org);
        }
      } else {
        // Check saved session profile
        try {
          const savedSession = localStorage.getItem('midmeetmind_current_user');
          if (savedSession) {
            const p: UserProfile = JSON.parse(savedSession);
            setProfile(p);
            if (p.organizationId) {
              const org = await getOrganizationById(p.organizationId);
              setOrganization(org);
            }
          } else {
            setProfile(null);
            setOrganization(null);
          }
        } catch {
          setProfile(null);
          setOrganization(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const inputHash = await hashPassword(pass);

      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
        const p = await getUserProfile(cred.user.uid);
        if (p) {
          setProfile(p);
          localStorage.setItem('midmeetmind_current_user', JSON.stringify(p));
          const org = await getOrganizationById(p.organizationId);
          setOrganization(org);
          return true;
        }
      } catch (authErr: any) {
        // If identity provider is disabled or credentials failed in auth, check registered users
        const found = await findUserByEmail(cleanEmail);
        if (found) {
          // Strict password verification against stored password hash
          if (found.passwordHash) {
            if (found.passwordHash !== inputHash) {
              setError('Incorrect email or password. Please check your password.');
              return false;
            }
          } else {
            // For legacy demo accounts created without passwordHash, require known demo password
            if (pass !== 'MidMeetMind2026!') {
              setError('Incorrect email or password. Please check your password.');
              return false;
            }
          }

          setProfile(found);
          localStorage.setItem('midmeetmind_current_user', JSON.stringify(found));
          const org = await getOrganizationById(found.organizationId);
          setOrganization(org);
          return true;
        }

        // Demo user fallback check
        if (cleanEmail === 'organizer@apex.edu') {
          if (pass === 'MidMeetMind2026!') {
            await quickLoginAsDemo('admin');
            return true;
          } else {
            setError('Incorrect email or password. Please check your password.');
            return false;
          }
        }
        if (cleanEmail === 'student.rahul@apex.edu') {
          if (pass === 'MidMeetMind2026!') {
            await quickLoginAsDemo('member');
            return true;
          } else {
            setError('Incorrect email or password. Please check your password.');
            return false;
          }
        }

        let msg = 'Incorrect email or password. Please check your password.';
        if (authErr.code === 'auth/too-many-requests') {
          msg = 'Too many attempts. Please wait a moment or reset your password.';
        }
        setError(msg);
        return false;
      }
      return true;
    } catch (err: any) {
      setError(err.message || 'Error logging in.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signupWithEmail = async (params: {
    name: string;
    email: string;
    pass: string;
    role: UserRole;
    inviteCode?: string;
    newOrgName?: string;
    newOrgType?: OrganizationType;
  }): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);

      const cleanEmail = params.email.trim().toLowerCase();
      const cleanName = params.name.trim();

      // Check if email already registered in system
      const existing = await findUserByEmail(cleanEmail);
      if (existing) {
        setError(`An account with email "${cleanEmail}" already exists. Please log in.`);
        setLoading(false);
        return false;
      }

      let targetOrgId = '';

      // Determine organization based on role and input
      if (params.role === 'admin' && params.newOrgName) {
        // Admin creates a brand new organization
        const newOrg = await createOrganization(
          params.newOrgName,
          params.newOrgType || 'company',
          params.inviteCode
        );
        targetOrgId = newOrg.id;
        setOrganization(newOrg);
      } else if (params.inviteCode && params.inviteCode.trim()) {
        // Find existing organization via invite code
        const org = await findOrganizationByInviteCode(params.inviteCode.trim());
        if (!org) {
          setError(`Invalid organization invite code "${params.inviteCode.toUpperCase()}". Please check the code or select a pre-seeded code.`);
          setLoading(false);
          return false;
        }
        targetOrgId = org.id;
        setOrganization(org);
      } else {
        // Default to demo college if left blank
        targetOrgId = DEMO_ORGS[0].id;
        setOrganization(DEMO_ORGS[0]);
      }

      let uid = '';

      // Try creating user with Firebase Auth
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.pass);
        uid = cred.user.uid;
        await updateProfile(cred.user, { displayName: cleanName });
      } catch (authErr: any) {
        // If operation-not-allowed or network restriction, generate a resilient UID
        console.warn('Firebase Auth notice, proceeding with profile registration:', authErr?.message || authErr);
        uid = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
      }

      // Compute secure password hash for account verification
      const passwordHash = await hashPassword(params.pass);

      // Create user profile in Firestore
      const newProfile: UserProfile = {
        id: uid,
        name: cleanName,
        email: cleanEmail,
        organizationId: targetOrgId,
        role: params.role,
        passwordHash: passwordHash,
        notificationPrefs: {
          summaryEmails: true,
          reminderFrequency: 'realtime',
          digest: true
        },
        createdAt: new Date().toISOString()
      };

      await saveUserProfile(newProfile);
      localStorage.setItem(`user_${cleanEmail}`, JSON.stringify(newProfile));
      localStorage.setItem('midmeetmind_current_user', JSON.stringify(newProfile));
      setProfile(newProfile);
      return true;
    } catch (err: any) {
      let msg = 'Failed to create account.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please log in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (inviteCode?: string): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);
      const res = await signInWithPopup(auth, googleProvider);
      let p = await getUserProfile(res.user.uid);

      if (!p) {
        let orgId = DEMO_ORGS[0].id;
        if (inviteCode) {
          const found = await findOrganizationByInviteCode(inviteCode);
          if (found) orgId = found.id;
        }

        p = {
          id: res.user.uid,
          name: res.user.displayName || 'Participant',
          email: res.user.email || '',
          organizationId: orgId,
          role: 'member',
          notificationPrefs: {
            summaryEmails: true,
            reminderFrequency: 'realtime',
            digest: true
          },
          createdAt: new Date().toISOString()
        };
        await saveUserProfile(p);
      }

      setProfile(p);
      const org = await getOrganizationById(p.organizationId);
      setOrganization(org);
      return true;
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google sign-in was cancelled or failed.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Instant demo login helper for rapid testing without typing
  const quickLoginAsDemo = async (role: 'admin' | 'member') => {
    setLoading(true);
    setError(null);
    try {
      const demoEmail = role === 'admin' ? 'organizer@apex.edu' : 'student.rahul@apex.edu';
      const demoPass = 'MidMeetMind2026!';
      const targetOrg = DEMO_ORGS[0]; // Apex Institute

      try {
        const cred = await signInWithEmailAndPassword(auth, demoEmail, demoPass);
        let p = await getUserProfile(cred.user.uid);
        if (!p) {
          p = {
            id: cred.user.uid,
            name: role === 'admin' ? 'Prof. Priya Sharma (Admin)' : 'Rahul Verma (Participant)',
            email: demoEmail,
            organizationId: targetOrg.id,
            role: role,
            notificationPrefs: {
              summaryEmails: true,
              reminderFrequency: 'realtime',
              digest: true
            },
            createdAt: new Date().toISOString()
          };
          await saveUserProfile(p);
        }
        setProfile(p);
        setOrganization(targetOrg);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          // If not registered yet, create
          const cred = await createUserWithEmailAndPassword(auth, demoEmail, demoPass);
          const p: UserProfile = {
            id: cred.user.uid,
            name: role === 'admin' ? 'Prof. Priya Sharma (Admin)' : 'Rahul Verma (Participant)',
            email: demoEmail,
            organizationId: targetOrg.id,
            role: role,
            notificationPrefs: {
              summaryEmails: true,
              reminderFrequency: 'realtime',
              digest: true
            },
            createdAt: new Date().toISOString()
          };
          await saveUserProfile(p);
          setProfile(p);
          setOrganization(targetOrg);
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      // In case of any Firebase Auth constraint, set local state representation
      const demoId = role === 'admin' ? 'demo-admin-uid' : 'demo-member-uid';
      const p: UserProfile = {
        id: demoId,
        name: role === 'admin' ? 'Prof. Priya Sharma (Admin)' : 'Rahul Verma (Participant)',
        email: role === 'admin' ? 'organizer@apex.edu' : 'student.rahul@apex.edu',
        organizationId: DEMO_ORGS[0].id,
        role: role,
        notificationPrefs: {
          summaryEmails: true,
          reminderFrequency: 'realtime',
          digest: true
        },
        createdAt: new Date().toISOString()
      };
      setProfile(p);
      setOrganization(DEMO_ORGS[0]);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (!email.trim()) {
        return { success: false, message: 'Please enter your registered email address.' };
      }
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true, message: `Password reset instructions sent to ${email.trim()}. Check your inbox!` };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Could not send reset email. Verify the address is correct.'
      };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Signout note:', err);
    }
    localStorage.removeItem('midmeetmind_current_user');
    setFirebaseUser(null);
    setProfile(null);
    setOrganization(null);
  };

  const reloadUser = async () => {
    if (firebaseUser) {
      const p = await getUserProfile(firebaseUser.uid);
      if (p) {
        setProfile(p);
        const org = await getOrganizationById(p.organizationId);
        setOrganization(org);
      }
    } else if (profile?.id) {
      const p = await getUserProfile(profile.id);
      if (p) {
        setProfile(p);
        const org = await getOrganizationById(p.organizationId);
        setOrganization(org);
      }
    }
  };

  const joinOrg = async (inviteCode: string): Promise<{ success: boolean; message?: string }> => {
    const uid = firebaseUser?.uid || profile?.id;
    if (!uid) return { success: false, message: 'User must be authenticated to join an organization.' };

    setLoading(true);
    try {
      const res = await joinOrganizationByCode(uid, inviteCode);
      if (res.success && res.organization) {
        setOrganization(res.organization);
        await reloadUser();
        return { success: true };
      } else {
        return { success: false, message: res.error || 'Failed to join organization with provided code.' };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Error joining organization.' };
    } finally {
      setLoading(false);
    }
  };

  const createNewOrganization = async (params: {
    name: string;
    type: OrganizationType;
    customInviteCode?: string;
  }): Promise<{ success: boolean; organization?: Organization; message?: string }> => {
    const uid = firebaseUser?.uid || profile?.id;
    if (!uid) return { success: false, message: 'User must be authenticated to create an organization.' };

    setLoading(true);
    try {
      const adminInfo = {
        id: uid,
        name: profile?.name || firebaseUser?.displayName || 'Organizer',
        email: profile?.email || firebaseUser?.email || ''
      };

      const newOrg = await createOrganization(
        params.name,
        params.type,
        params.customInviteCode,
        adminInfo
      );

      setOrganization(newOrg);
      await reloadUser();
      return { success: true, organization: newOrg };
    } catch (err: any) {
      return { success: false, message: err.message || 'Could not create organization.' };
    } finally {
      setLoading(false);
    }
  };

  const updateInviteCode = async (newCode: string): Promise<boolean> => {
    if (!organization?.id) return false;
    const ok = await updateOrganizationInviteCode(organization.id, newCode);
    if (ok) {
      setOrganization({ ...organization, inviteCode: newCode.trim().toUpperCase() });
    }
    return ok;
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        organization,
        loading,
        error,
        clearError,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        quickLoginAsDemo,
        resetPassword,
        logout,
        reloadUser,
        joinOrg,
        createNewOrganization,
        updateInviteCode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
