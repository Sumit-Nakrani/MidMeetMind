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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 mb-4 animate-pulse">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-slate-400">Loading MidMeetMind...</p>
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
