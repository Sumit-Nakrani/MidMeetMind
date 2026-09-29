/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AuthScreen } from './components/auth/AuthScreen.tsx';
import { HomeScreen } from './components/dashboard/HomeScreen.tsx';
import { GoToLiveMeetingModal } from './components/dashboard/GoToLiveMeetingModal.tsx';
import { GoToMeetingSummaryModal } from './components/dashboard/GoToMeetingSummaryModal.tsx';
import { getMeetingById, getSummaryById } from './lib/meetingService.ts';
import { Meeting, Summary } from './types/index.ts';
import { Video, Loader2, Users, ArrowRight, ShieldCheck } from 'lucide-react';

function AppContent() {
  const { firebaseUser, profile, loading } = useAuth();

  // Route state
  const [routeMeetingId, setRouteMeetingId] = useState<string | null>(null);
  const [routeSummaryId, setRouteSummaryId] = useState<string | null>(null);
  const [routeMeeting, setRouteMeeting] = useState<Meeting | null>(null);
  const [routeSummary, setRouteSummary] = useState<Summary | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [guestName, setGuestName] = useState('Guest Participant');
  const [hasJoinedAsGuest, setHasJoinedAsGuest] = useState(false);

  // Parse path & query params on mount and popstate
  useEffect(() => {
    const parseCurrentRoute = () => {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;

      let mId: string | null = null;
      let sId: string | null = null;

      if (pathname.startsWith('/meet/')) {
        mId = pathname.replace('/meet/', '').split('/')[0]?.split('?')[0];
      } else if (searchParams.get('meet')) {
        mId = searchParams.get('meet');
      } else if (hash.includes('/meet/')) {
        mId = hash.split('/meet/')[1]?.split('?')[0];
      }

      if (pathname.startsWith('/summary/')) {
        sId = pathname.replace('/summary/', '').split('/')[0]?.split('?')[0];
      } else if (searchParams.get('summary')) {
        sId = searchParams.get('summary');
      } else if (hash.includes('/summary/')) {
        sId = hash.split('/summary/')[1]?.split('?')[0];
      }

      setRouteMeetingId(mId || null);
      setRouteSummaryId(sId || null);
    };

    parseCurrentRoute();
    window.addEventListener('popstate', parseCurrentRoute);
    return () => window.removeEventListener('popstate', parseCurrentRoute);
  }, []);

  // Fetch meeting if routeMeetingId is present
  useEffect(() => {
    if (!routeMeetingId) {
      setRouteMeeting(null);
      return;
    }

    let isMounted = true;
    setIsLoadingRoute(true);
    getMeetingById(routeMeetingId)
      .then((m) => {
        if (isMounted) {
          setRouteMeeting(m);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingRoute(false);
      });

    return () => {
      isMounted = false;
    };
  }, [routeMeetingId]);

  // Fetch summary if routeSummaryId is present
  useEffect(() => {
    if (!routeSummaryId) {
      setRouteSummary(null);
      return;
    }

    let isMounted = true;
    setIsLoadingRoute(true);
    getSummaryById(routeSummaryId)
      .then((s) => {
        if (isMounted) {
          setRouteSummary(s);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingRoute(false);
      });

    return () => {
      isMounted = false;
    };
  }, [routeSummaryId]);

  const handleCloseMeeting = () => {
    setRouteMeetingId(null);
    setRouteMeeting(null);
    setHasJoinedAsGuest(false);
    window.history.pushState({}, '', '/');
  };

  const handleCloseSummary = () => {
    setRouteSummaryId(null);
    setRouteSummary(null);
    window.history.pushState({}, '', '/');
  };

  if (loading || isLoadingRoute) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-900 font-sans">
        <div className="w-12 h-12 rounded-xl bg-[#FFE900] text-slate-950 font-black text-xl flex items-center justify-center shadow-md mb-4 animate-pulse">
          M
        </div>
        <p className="text-sm font-bold text-slate-800">Connecting to MidMeetMind...</p>
        <p className="text-xs text-slate-500 mt-1">
          {routeMeetingId ? 'Joining Meeting Room' : routeSummaryId ? 'Loading Meeting Summary' : 'Connecting to workspace'}
        </p>
      </div>
    );
  }

  // 1. Direct Summary Link Handling (/summary/:id or ?summary=:id)
  if (routeSummaryId && routeSummary) {
    return (
      <div className="min-h-screen bg-slate-950">
        <GoToMeetingSummaryModal
          summary={routeSummary}
          onClose={handleCloseSummary}
        />
      </div>
    );
  }

  // 2. Direct Meeting Link Handling (/meet/:id or ?meet=:id)
  if (routeMeetingId) {
    // If logged in or guest already clicked join, show live conference room!
    if (firebaseUser || profile || hasJoinedAsGuest) {
      return (
        <GoToLiveMeetingModal
          meeting={routeMeeting || {
            id: routeMeetingId,
            title: 'MidMeet Live Conference',
            organizerId: 'host',
            organizationId: 'workspace',
            scheduledAt: new Date().toISOString(),
            status: 'in_progress',
            participants: [],
            createdAt: new Date().toISOString()
          }}
          guestName={hasJoinedAsGuest ? guestName : undefined}
          onClose={handleCloseMeeting}
        />
      );
    }

    // Guest Landing Screen for Shared Meeting Links
    return (
      <div className="min-h-screen bg-[#070A11] text-slate-100 flex flex-col items-center justify-center p-4 font-sans select-none">
        <div className="w-full max-w-md bg-[#0F1424] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-[#FFE900] text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg">
            M
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live Conference Ready</span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              {routeMeeting?.title || 'MidMeet Live Meeting'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              You were invited to join this live video session.
            </p>
          </div>

          <div className="w-full text-left space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Enter Your Name
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Rahul, Priya, Alex"
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white font-medium text-xs focus:border-[#FFE900] focus:ring-1 focus:ring-[#FFE900] outline-none transition-all"
              />
            </div>

            <button
              type="button"
              onClick={() => setHasJoinedAsGuest(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-black text-sm shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>Join Meeting as Guest</span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800 w-full flex items-center justify-between text-xs text-slate-400">
            <span>Already have an account?</span>
            <button
              type="button"
              onClick={() => {
                setRouteMeetingId(null);
                window.history.pushState({}, '', '/');
              }}
              className="text-[#FFE900] font-bold hover:underline cursor-pointer"
            >
              Log In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated Home Screen
  if (firebaseUser || profile) {
    return <HomeScreen />;
  }

  // 4. Default: Auth Login / Signup
  return <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
