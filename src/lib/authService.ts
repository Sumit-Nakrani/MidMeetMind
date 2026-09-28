import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  limit
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';
import { auth, db, googleProvider } from './firebase.ts';
import { Organization, UserProfile, OrganizationType, UserRole } from '../types/index.ts';

// Initial pre-seeded demo organizations to ensure instant invite-code testing
export const DEMO_ORGS: Organization[] = [
  {
    id: 'org-apex-college',
    name: 'Apex Institute of Technology',
    type: 'college',
    inviteCode: 'APEX2026',
    createdAt: new Date().toISOString()
  },
  {
    id: 'org-novatech',
    name: 'NovaTech Solutions',
    type: 'company',
    inviteCode: 'NOVA-CORP',
    createdAt: new Date().toISOString()
  },
  {
    id: 'org-st-marks',
    name: 'St. Marks Academy',
    type: 'school',
    inviteCode: 'STMARKS',
    createdAt: new Date().toISOString()
  }
];

// Helper to seed initial sample orgs if they do not exist
export async function seedInitialOrganizationsIfNeeded() {
  try {
    for (const org of DEMO_ORGS) {
      const orgRef = doc(db, 'organizations', org.id);
      const snap = await getDoc(orgRef);
      if (!snap.exists()) {
        await setDoc(orgRef, org);
      }
    }
  } catch (err) {
    console.warn('Initial org seeding note:', err);
  }
}

// Secure client-side password hashing using Web Crypto API SHA-256
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_midmeetmind_secure_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Find organization by its unique invite code
export async function findOrganizationByInviteCode(inviteCode: string): Promise<Organization | null> {
  const cleanCode = inviteCode.trim().toUpperCase();
  if (!cleanCode) return null;

  // First check pre-seeded demo fallback
  const demoMatch = DEMO_ORGS.find(o => o.inviteCode.toUpperCase() === cleanCode);

  try {
    const q = query(
      collection(db, 'organizations'),
      where('inviteCode', '==', cleanCode),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0].data();
      return { id: snap.docs[0].id, ...docData } as Organization;
    }
  } catch (err) {
    console.warn('Error querying Firestore for invite code:', err);
  }

  // Fallback to demo org if network/firestore index is warm-up
  return demoMatch || null;
}

// Generate a random, human-friendly invite code
export function generateInviteCode(orgName?: string): string {
  const prefix = orgName && orgName.trim().length >= 3
    ? orgName.trim().slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '')
    : ['TEAM', 'APEX', 'NOVA', 'MIND', 'MEET', 'CAMP', 'CORP'][Math.floor(Math.random() * 7)];
  
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix || 'ORG'}-${randomNum}`;
}

// Create a new organization with First-Admin Assignment
export async function createOrganization(
  name: string,
  type: OrganizationType,
  customInviteCode?: string,
  adminUser?: { id: string; name: string; email: string }
): Promise<Organization> {
  const inviteCode = customInviteCode?.trim().toUpperCase() || generateInviteCode(name);
  const orgId = `org-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  
  const orgPayload: Record<string, any> = {
    id: orgId,
    name: name.trim(),
    type,
    inviteCode,
    createdAt: new Date().toISOString(),
    memberCount: 1
  };

  if (adminUser?.id) {
    orgPayload.firstAdminId = adminUser.id;
  }
  if (adminUser?.name) {
    orgPayload.firstAdminName = adminUser.name;
  }
  if (adminUser?.email) {
    orgPayload.firstAdminEmail = adminUser.email;
  }

  const newOrg = orgPayload as Organization;

  try {
    await setDoc(doc(db, 'organizations', orgId), orgPayload);

    // If adminUser is provided, assign them as the first-admin of this organization
    if (adminUser?.id) {
      const existingUser = await getUserProfile(adminUser.id);
      const updatedUser: UserProfile = {
        id: adminUser.id,
        name: adminUser.name || existingUser?.name || 'Admin',
        email: adminUser.email || existingUser?.email || '',
        organizationId: orgId,
        role: 'admin',
        notificationPrefs: existingUser?.notificationPrefs || {
          summaryEmails: true,
          reminderFrequency: 'realtime',
          digest: true
        },
        createdAt: existingUser?.createdAt || new Date().toISOString()
      };
      await saveUserProfile(updatedUser);
    }
  } catch (err) {
    console.error('Failed to create organization in Firestore:', err);
  }

  return newOrg;
}

// Join an existing organization via invite code
export async function joinOrganizationByCode(
  userId: string,
  inviteCode: string
): Promise<{ success: boolean; organization?: Organization; error?: string }> {
  const org = await findOrganizationByInviteCode(inviteCode);
  if (!org) {
    return {
      success: false,
      error: `No organization found with invite code "${inviteCode.toUpperCase()}". Please verify the code.`
    };
  }

  try {
    const existingUser = await getUserProfile(userId);
    if (existingUser) {
      await saveUserProfile({
        ...existingUser,
        organizationId: org.id
      });
    }
    return { success: true, organization: org };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to join organization' };
  }
}

// Admin function to regenerate or change invite code
export async function updateOrganizationInviteCode(orgId: string, newCode: string): Promise<boolean> {
  try {
    const cleanCode = newCode.trim().toUpperCase();
    await setDoc(doc(db, 'organizations', orgId), { inviteCode: cleanCode }, { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to update invite code:', err);
    return false;
  }
}

// Get all members for an organization
export async function getOrganizationMembers(orgId: string): Promise<UserProfile[]> {
  try {
    const q = query(collection(db, 'users'), where('organizationId', '==', orgId));
    const snap = await getDocs(q);
    const members: UserProfile[] = [];
    snap.forEach((d) => {
      members.push({ id: d.id, ...d.data() } as UserProfile);
    });
    return members;
  } catch (err) {
    console.warn('Could not query members:', err);
    return [];
  }
}

// Get user profile from Firestore
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as UserProfile;
    }
  } catch (err) {
    console.warn('Could not fetch user profile:', err);
  }
  return null;
}

// Find user profile by email
export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const q = query(collection(db, 'users'), where('email', '==', cleanEmail), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    }
  } catch (err) {
    console.warn('Could not search user by email:', err);
  }

  // Check localStorage fallback
  try {
    const local = localStorage.getItem(`user_${cleanEmail}`);
    if (local) {
      return JSON.parse(local) as UserProfile;
    }
  } catch {}

  return null;
}

// Save or update user profile
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    const ref = doc(db, 'users', profile.id);
    const cleanPayload: Record<string, any> = {};
    for (const [k, v] of Object.entries(profile)) {
      if (v !== undefined) {
        cleanPayload[k] = v;
      }
    }
    await setDoc(ref, cleanPayload, { merge: true });
  } catch (err) {
    console.error('Failed to save user profile:', err);
  }
}

// Get organization details
export async function getOrganizationById(orgId: string): Promise<Organization | null> {
  try {
    const ref = doc(db, 'organizations', orgId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Organization;
    }
  } catch (err) {
    console.warn('Could not fetch organization:', err);
  }
  return DEMO_ORGS.find(o => o.id === orgId) || null;
}
