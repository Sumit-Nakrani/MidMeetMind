/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AuthScreen } from './components/auth/AuthScreen.tsx';
import { HomeScreen } from './components/dashboard/HomeScreen.tsx';
import { BrainCircuit } from 'lucide-react';

function AppContent() {
  const { firebaseUser, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-900 font-sans">
        <div className="w-12 h-12 rounded-xl bg-[#FFE900] text-slate-950 font-black text-xl flex items-center justify-center shadow-md mb-4 animate-pulse">
          M
        </div>
        <p className="text-sm font-bold text-slate-800">Loading MidMeetMind...</p>
        <p className="text-xs text-slate-500 mt-1">Connecting to workspace</p>
      </div>
    );
  }

  // If user is authenticated and has a profile loaded, show Screen 3: Dashboard / Home Screen
  if (firebaseUser || profile) {
    return <HomeScreen />;
  }

  // Otherwise, show Screen 1: Login / Signup
  return <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
