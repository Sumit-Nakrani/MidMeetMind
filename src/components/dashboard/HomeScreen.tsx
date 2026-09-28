import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  BrainCircuit,
  Calendar,
  ListTodo,
  Sparkles,
  Plus,
  Building2,
  GraduationCap,
  Briefcase,
  Users,
  Copy,
  Check,
  Bell,
  LogOut,
  ShieldCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  CheckCircle2,
  FolderOpen
} from 'lucide-react';
import { Meeting, Task, Summary } from '../../types/index.ts';
import {
  fetchMeetingsByOrg,
  fetchTasks,
  fetchRecentSummaries,
  seedInitialMeetingsIfNeeded
} from '../../lib/meetingService.ts';
import { UpcomingMeetingsList } from './UpcomingMeetingsList.tsx';
import { PendingTasksWidget } from './PendingTasksWidget.tsx';
import { RecentSummariesFeed } from './RecentSummariesFeed.tsx';
import { ScheduleMeetingModal } from './ScheduleMeetingModal.tsx';
import { OrganizationSetupScreen } from '../organization/OrganizationSetupScreen.tsx';

export const HomeScreen: React.FC = () => {
  const { profile, organization, logout, reloadUser } = useAuth();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summaries, setSummaries] = useState<{ summary: Summary; meeting?: Meeting }[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Modals & Navigation
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [showOrgSetup, setShowOrgSetup] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Load live data from Firestore / Service
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      const orgId = organization?.id || 'org-apex-college';
      await seedInitialMeetingsIfNeeded(orgId);

      const [mList, tList, sList] = await Promise.all([
        fetchMeetingsByOrg(orgId),
        fetchTasks(orgId, profile?.id),
        fetchRecentSummaries()
      ]);

      setMeetings(mList);
      setTasks(tList);
      setSummaries(sList);
      setLoadingData(false);
    };

    loadData();
  }, [organization?.id, profile?.id]);

  const handleMeetingScheduled = (newMeeting: Meeting) => {
    setMeetings([newMeeting, ...meetings]);
  };

  const copyInvite = () => {
    if (organization?.inviteCode) {
      navigator.clipboard.writeText(organization.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // If user opens Screen 2 (Organization Setup)
  if (showOrgSetup) {
    return (
      <OrganizationSetupScreen
        onComplete={() => setShowOrgSetup(false)}
        onCancel={() => setShowOrgSetup(false)}
      />
    );
  }

  const pendingTasksCount = tasks.filter(t => t.status !== 'completed').length;
  const upcomingMeetingsCount = meetings.filter(m => m.status === 'scheduled').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Platform Tag */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-100 text-base leading-tight tracking-tight">
                  MidMeetMind
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  Meeting Workspace
                </span>
              </div>
              <p className="text-[11px] text-slate-400">AI Meeting Companion</p>
            </div>
          </div>

          {/* Org Pill & Navigation Controls */}
          <div className="flex items-center gap-2.5">
            {/* Organization context badge */}
            {organization && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                {organization.type === 'college' ? (
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                ) : organization.type === 'school' ? (
                  <Building2 className="w-4 h-4 text-amber-400" />
                ) : (
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                )}
                <span className="font-semibold text-slate-200">{organization.name}</span>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={copyInvite}
                  className="flex items-center gap-1 font-mono text-[11px] text-indigo-400 hover:text-indigo-300 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-500/20 transition-colors cursor-pointer"
                  title="Copy Org Invite Code"
                >
                  <span>{organization.inviteCode}</span>
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}

            {/* Screen 2 Switcher */}
            <button
              type="button"
              onClick={() => setShowOrgSetup(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
              title="Open Organization Setup (Screen 2)"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Org Setup</span>
            </button>

            {/* User Role Badge */}
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider ${
                profile?.role === 'admin'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {profile?.role === 'admin' ? 'Admin' : 'Member'}
            </span>

            {/* Logout */}
            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 relative z-10">
        
        {/* 1. Welcome Message & Action Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {getGreeting()}, {profile?.name || 'Organizer'}!
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Here is your central hub for <strong>{organization?.name || 'your Organization'}</strong>. Track upcoming meeting sessions, outstanding action items, and AI-generated summaries in one place.
            </p>
          </div>

          {/* Primary Action Button */}
          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10">
            <button
              type="button"
              onClick={() => setIsScheduleOpen(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule New Meeting</span>
            </button>
          </div>
        </div>

        {/* 2. Quick Stat Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Stat 1 */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white tracking-tight">{upcomingMeetingsCount}</span>
              <p className="text-xs text-slate-400 font-medium">Upcoming Meetings</p>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <ListTodo className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white tracking-tight">{pendingTasksCount}</span>
              <p className="text-xs text-slate-400 font-medium">Pending Action Items</p>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white tracking-tight">{summaries.length}</span>
              <p className="text-xs text-slate-400 font-medium">Summaries Generated</p>
            </div>
          </div>
        </div>

        {/* 3. Main Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column (2 Cols wide on desktop): Upcoming Meetings & Recent Summaries Feed */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming Meetings List */}
            <UpcomingMeetingsList
              meetings={meetings}
              onOpenScheduleModal={() => setIsScheduleOpen(true)}
            />

            {/* Recent Meeting Summaries Feed */}
            <RecentSummariesFeed
              summaries={summaries}
            />
          </div>

          {/* Right Column (1 Col wide on desktop): Pending Tasks Widget & Org Information */}
          <div className="space-y-8">
            {/* Pending Tasks Widget */}
            <PendingTasksWidget
              tasks={tasks}
              onTasksUpdated={(updated) => setTasks(updated)}
            />

            {/* Organization Invite Card */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Team Workspace
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-500/10 text-indigo-400">
                  {organization?.type || 'College'}
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">{organization?.name}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Share this invite code with colleagues, students, or staff so they join your organization's meeting feed:
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-indigo-500/30 flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-indigo-300 tracking-wider">
                  {organization?.inviteCode || 'APEX2026'}
                </span>
                <button
                  type="button"
                  onClick={copyInvite}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold text-indigo-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Role: <strong>{profile?.role === 'admin' ? 'Organizer / Admin' : 'Participant'}</strong></span>
                <button
                  type="button"
                  onClick={() => setShowOrgSetup(true)}
                  className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  Manage Org &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onMeetingScheduled={handleMeetingScheduled}
      />
    </div>
  );
};
