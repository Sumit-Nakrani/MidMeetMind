import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Video,
  Calendar,
  ListTodo,
  Plus,
  Building2,
  GraduationCap,
  Briefcase,
  Users,
  Copy,
  Check,
  Bell,
  LogOut,
  Play,
  Share2,
  ExternalLink,
  ChevronRight,
  Clock,
  ShieldCheck,
  Search,
  FileText,
  UserCheck,
  CheckCircle2,
  Sparkles,
  Mic,
  Upload
} from 'lucide-react';
import { Meeting, Task, Summary } from '../../types/index.ts';
import {
  fetchMeetingsByOrg,
  fetchTasks,
  fetchRecentSummaries,
  seedInitialMeetingsIfNeeded
} from '../../lib/meetingService.ts';
import { saveUserProfile } from '../../lib/authService.ts';
import { UpcomingMeetingsList } from './UpcomingMeetingsList.tsx';
import { PendingTasksWidget } from './PendingTasksWidget.tsx';
import { RecentSummariesFeed } from './RecentSummariesFeed.tsx';
import { ScheduleMeetingModal } from './ScheduleMeetingModal.tsx';
import { GoToLiveMeetingModal } from './GoToLiveMeetingModal.tsx';
import { GoToMeetingSummaryModal } from './GoToMeetingSummaryModal.tsx';
import { OrganizationSetupScreen } from '../organization/OrganizationSetupScreen.tsx';
import { MyMeetingsScreen } from '../meetings/MyMeetingsScreen.tsx';
import { AudioTranscriberModal } from '../audio/AudioTranscriberModal.tsx';
import { MeetingDetailModal } from '../meetings/MeetingDetailModal.tsx';
import { MeetingTranscriptModal } from '../meetings/MeetingTranscriptModal.tsx';
import { MeetingRecordingUploadModal } from '../meetings/MeetingRecordingUploadModal.tsx';

export const HomeScreen: React.FC = () => {
  const { profile, organization, logout, reloadUser } = useAuth();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summaries, setSummaries] = useState<{ summary: Summary; meeting?: Meeting }[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'meetings' | 'recordings' | 'tasks'>('overview');

  // Modals & Navigation
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isTranscriberOpen, setIsTranscriberOpen] = useState(false);
  const [showOrgSetup, setShowOrgSetup] = useState(false);
  const [activeLiveMeeting, setActiveLiveMeeting] = useState<Meeting | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<{ summary: Summary; meeting?: Meeting } | null>(null);
  const [detailMeeting, setDetailMeeting] = useState<Meeting | null>(null);
  const [transcriptMeeting, setTranscriptMeeting] = useState<Meeting | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTargetMeeting, setUploadTargetMeeting] = useState<Meeting | null>(null);

  // Quick join input
  const [quickJoinId, setQuickJoinId] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [roleSwitching, setRoleSwitching] = useState(false);

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

  const copyOrgInvite = () => {
    if (organization?.inviteCode) {
      navigator.clipboard.writeText(organization.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const toggleUserRole = async () => {
    if (!profile) return;
    setRoleSwitching(true);
    const newRole = profile.role === 'admin' ? 'member' : 'admin';
    await saveUserProfile({
      ...profile,
      role: newRole
    });
    await reloadUser();
    setRoleSwitching(false);
  };

  const handleStartInstantMeeting = () => {
    const instantMeeting: Meeting = {
      id: `meet-${Date.now().toString(36)}`,
      title: `${profile?.name || 'Workspace'}'s Instant Meeting`,
      organizationId: organization?.id || 'org-apex-college',
      organizerId: profile?.id || 'host',
      scheduledAt: new Date().toISOString(),
      status: 'in_progress',
      participants: [
        {
          userId: profile?.id || 'host',
          name: profile?.name || 'Host',
          email: profile?.email || '',
          attended: true,
          role: 'organizer'
        }
      ]
    };
    setActiveLiveMeeting(instantMeeting);
  };

  const handleJoinById = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickJoinId.trim()) return;
    const targetMeeting = meetings.find(m => m.id.toLowerCase() === quickJoinId.trim().toLowerCase()) || {
      id: quickJoinId.trim(),
      title: `Meeting (${quickJoinId.trim()})`,
      organizationId: organization?.id || 'org-apex-college',
      organizerId: 'external',
      scheduledAt: new Date().toISOString(),
      status: 'in_progress' as const,
      participants: []
    };
    setActiveLiveMeeting(targetMeeting);
    setQuickJoinId('');
  };

  const handleOpenMeetingSummary = (m: Meeting) => {
    const found = summaries.find(s => s.meeting?.id === m.id || s.summary.meetingId === m.id);
    if (found) {
      setSelectedSummary(found);
    } else {
      setSelectedSummary({
        meeting: m,
        summary: {
          id: `sum-${m.id}`,
          meetingId: m.id,
          summaryText: `AI executive notes & key decisions for "${m.title}". Meeting discussion was processed into highlights, action items, and searchable notes.`,
          keyPoints: [
            'All primary agenda points reviewed and evaluated by participants.',
            'Milestones and deliverables scheduled according to timeline.',
            'Action points delegated to designated owners.'
          ],
          decisions: [
            'Approved committee proposals as presented during the session.',
            'Follow-up sync set for next milestone review.'
          ],
          createdAt: m.scheduledAt
        }
      });
    }
  };

  // If user opens Organization Setup
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-[#FFE900]/40">
      {/* Top Bar - Clean White with GoTo Visual Hierarchy */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: MidMeetMind Brand & Nav */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FFE900] text-slate-950 font-black text-lg flex items-center justify-center shadow-xs">
                M
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-black text-slate-950 text-lg leading-tight tracking-tight">
                    MidMeet
                  </span>
                  <span className="font-medium text-slate-700 text-lg leading-tight tracking-tight">
                    Mind
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                  AI Meeting Companion &amp; Workspace
                </p>
              </div>
            </div>

            {/* Nav Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-slate-100 text-slate-950'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('meetings')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'meetings'
                    ? 'bg-slate-100 text-slate-950'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                Meetings ({meetings.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'tasks'
                    ? 'bg-slate-100 text-slate-950'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                Action Items ({pendingTasksCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('recordings')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'recordings'
                    ? 'bg-slate-100 text-slate-950'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                Summaries &amp; Transcripts
              </button>
            </nav>
          </div>

          {/* Right: Organization & Profile */}
          <div className="flex items-center gap-3">
            {/* Organization context badge */}
            {organization && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                {organization.type === 'college' ? (
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                ) : organization.type === 'school' ? (
                  <Building2 className="w-4 h-4 text-amber-600" />
                ) : (
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                )}
                <span className="font-semibold text-slate-900">{organization.name}</span>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={copyOrgInvite}
                  className="font-mono text-[11px] text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Copy Org Invite Code"
                >
                  <span>{organization.inviteCode}</span>
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                </button>
              </div>
            )}

            {/* Schedule Button (GoTo Signature Yellow) */}
            <button
              type="button"
              onClick={() => setIsScheduleOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule</span>
            </button>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-[#FFE900] font-bold text-xs flex items-center justify-center">
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {profile?.name || 'Account'}
                </p>
                <p className="text-[10px] text-slate-500 capitalize">
                  {profile?.role === 'admin' ? 'Organizer / Admin' : 'Participant'}
                </p>
              </div>

              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors ml-1 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ======================================================== */}
        {/* WELCOME & STATUS BANNER (MidMeetMind Core Context) */}
        {/* ======================================================== */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Workspace Active
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-medium text-slate-600">
                Organization: <strong>{organization?.name || 'Apex Institute'}</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Welcome back, {profile?.name || 'Team Member'}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Your organizational workspace is ready. Access scheduled video conferences, view AI summaries with key decisions, and track your pending deliverables.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowOrgSetup(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Org Settings</span>
            </button>

            <button
              type="button"
              onClick={toggleUserRole}
              disabled={roleSwitching}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#FFE900]" />
              <span>{roleSwitching ? 'Updating...' : `Role: ${profile?.role === 'admin' ? 'Admin' : 'Member'}`}</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* QUICK METRICS BAR (GoTo Meeting Clean Cards) */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat 1: Scheduled Meetings */}
          <div
            onClick={() => setActiveTab('meetings')}
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs cursor-pointer hover:border-slate-300 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduled Meetings</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{meetings.length}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              {upcomingMeetingsCount} upcoming conference sessions
            </p>
          </div>

          {/* Stat 2: Pending Action Items */}
          <div
            onClick={() => setActiveTab('tasks')}
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs cursor-pointer hover:border-slate-300 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Action Items</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ListTodo className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{pendingTasksCount}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Extracted from conference transcripts
            </p>
          </div>

          {/* Stat 3: AI Summaries */}
          <div
            onClick={() => setActiveTab('recordings')}
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs cursor-pointer hover:border-slate-300 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Processed Summaries</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{summaries.length}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Audio recordings &amp; transcript archives
            </p>
          </div>

          {/* Stat 4: Organization Code */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Organization Code</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-mono font-bold text-slate-900">
                {organization?.inviteCode || 'APEX2026'}
              </span>
              <button
                type="button"
                onClick={copyOrgInvite}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs transition-colors"
                title="Copy Invite Code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Share code with participants to join
            </p>
          </div>
        </div>

        {/* ======================================================== */}
        {/* QUICK ACTION BAR (Instant Meeting, Schedule, Join) */}
        {/* ======================================================== */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Start Instant Meeting */}
            <button
              type="button"
              onClick={handleStartInstantMeeting}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Start Instant Meeting</span>
            </button>

            {/* Schedule Meeting */}
            <button
              type="button"
              onClick={() => setIsScheduleOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule Session</span>
            </button>

            {/* Mic Audio Transcribe (gemini-3.5-transcribe) */}
            <button
              type="button"
              onClick={() => setIsTranscriberOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-950 font-bold text-xs transition-colors cursor-pointer"
              title="Record and transcribe audio with gemini-3.5-transcribe"
            >
              <Mic className="w-3.5 h-3.5 text-indigo-600" />
              <span>Transcribe Audio</span>
            </button>

            {/* Upload Recording (Screen 7: Meeting Recording / Upload) */}
            <button
              type="button"
              onClick={() => {
                setUploadTargetMeeting(null);
                setIsUploadModalOpen(true);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              title="Upload recorded audio or video file to feed into AI pipeline"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>Upload Recording</span>
            </button>
          </div>

          {/* Quick Join by ID Form */}
          <form onSubmit={handleJoinById} className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={quickJoinId}
              onChange={(e) => setQuickJoinId(e.target.value)}
              placeholder="Enter Meeting ID to join..."
              className="flex-1 sm:w-60 px-3 py-2 text-xs rounded-xl border border-slate-300 outline-none focus:border-slate-500 bg-slate-50 text-slate-900"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Join
            </button>
          </form>
        </div>

        {/* ======================================================== */}
        {/* MAIN DASHBOARD SECTIONS (Based on Active Tab) */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Upcoming Meetings & AI Summaries */}
            <div className="lg:col-span-2 space-y-6">
              <UpcomingMeetingsList
                meetings={meetings}
                onOpenScheduleModal={() => setIsScheduleOpen(true)}
                onStartMeeting={(m) => setActiveLiveMeeting(m)}
                onViewAll={() => setActiveTab('meetings')}
                onOpenMeetingDetail={(m) => setDetailMeeting(m)}
              />

              <RecentSummariesFeed
                summaries={summaries}
                onSelectSummary={(sum, m) => setSelectedSummary({ summary: sum, meeting: m })}
              />
            </div>

            {/* Right 1 Col: Pending Action Items */}
            <div className="space-y-6">
              <PendingTasksWidget
                tasks={tasks}
                onTasksUpdated={(updated) => setTasks(updated)}
              />
            </div>
          </div>
        )}

        {activeTab === 'meetings' && (
          <MyMeetingsScreen
            meetings={meetings}
            onOpenScheduleModal={() => setIsScheduleOpen(true)}
            onStartMeeting={(m) => setActiveLiveMeeting(m)}
            onViewSummary={(m) => handleOpenMeetingSummary(m)}
            onViewTranscript={(m) => setTranscriptMeeting(m)}
            onOpenMeetingDetail={(m) => setDetailMeeting(m)}
          />
        )}

        {activeTab === 'tasks' && (
          <div className="max-w-4xl mx-auto">
            <PendingTasksWidget
              tasks={tasks}
              onTasksUpdated={(updated) => setTasks(updated)}
            />
          </div>
        )}

        {activeTab === 'recordings' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Video className="w-4 h-4 text-slate-700" />
                  <span>Meeting Recordings &amp; AI Summaries</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Browse processed meeting audio, review AI key decisions, or upload a new recording to process.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUploadTargetMeeting(null);
                  setIsUploadModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Recording</span>
              </button>
            </div>

            <RecentSummariesFeed
              summaries={summaries}
              onSelectSummary={(sum, m) => setSelectedSummary({ summary: sum, meeting: m })}
            />
          </div>
        )}
      </main>

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onMeetingScheduled={handleMeetingScheduled}
      />

      {/* Live Video Conference Modal */}
      {activeLiveMeeting && (
        <GoToLiveMeetingModal
          meeting={activeLiveMeeting}
          onClose={() => setActiveLiveMeeting(null)}
          onMeetingCompleted={(id) => {
            setMeetings(prev => prev.map(m => m.id === id ? { ...m, status: 'completed' } : m));
          }}
        />
      )}

      {/* Meeting Summary & Recording Modal */}
      {selectedSummary && (
        <GoToMeetingSummaryModal
          summary={selectedSummary.summary}
          meeting={selectedSummary.meeting}
          onClose={() => setSelectedSummary(null)}
          onTaskToggle={(taskId) => {
            setTasks(prev => prev.map(t => t.id === taskId ? {
              ...t,
              status: t.status === 'completed' ? 'pending' : 'completed'
            } : t));
          }}
        />
      )}

      {/* Audio Transcriber Modal (Model: gemini-3.5-transcribe) */}
      <AudioTranscriberModal
        isOpen={isTranscriberOpen}
        onClose={() => setIsTranscriberOpen(false)}
        meetingTitle="Workspace Audio Recording"
      />

      {/* Screen 6: Meeting Detail Screen (Modal View of single meeting context) */}
      {detailMeeting && (
        <MeetingDetailModal
          isOpen={!!detailMeeting}
          meeting={detailMeeting}
          summary={summaries.find(s => s.meeting?.id === detailMeeting.id || s.summary.meetingId === detailMeeting.id)?.summary}
          onClose={() => setDetailMeeting(null)}
          onStartMeeting={(m) => {
            setDetailMeeting(null);
            setActiveLiveMeeting(m);
          }}
          onViewSummary={(m) => {
            handleOpenMeetingSummary(m);
          }}
          onViewTranscript={(m) => {
            setTranscriptMeeting(m);
          }}
          onOpenUploadRecording={(m) => {
            setDetailMeeting(null);
            setUploadTargetMeeting(m);
            setIsUploadModalOpen(true);
          }}
          onMeetingUpdated={(updated) => {
            setMeetings(prev => prev.map(m => m.id === updated.id ? updated : m));
            setDetailMeeting(updated);
          }}
          onMeetingCancelled={(id) => {
            setMeetings(prev => prev.map(m => m.id === id ? { ...m, status: 'cancelled' as any } : m));
            setDetailMeeting(null);
          }}
        />
      )}

      {/* Meeting Transcript Modal */}
      {transcriptMeeting && (
        <MeetingTranscriptModal
          isOpen={!!transcriptMeeting}
          meeting={transcriptMeeting}
          summary={summaries.find(s => s.meeting?.id === transcriptMeeting.id || s.summary.meetingId === transcriptMeeting.id)?.summary}
          onClose={() => setTranscriptMeeting(null)}
        />
      )}

      {/* Screen 7: Meeting Recording / Upload Screen */}
      <MeetingRecordingUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUploadTargetMeeting(null);
        }}
        meetings={meetings}
        initialMeeting={uploadTargetMeeting}
        onProcessingComplete={async (meetingId) => {
          const orgId = organization?.id || 'org-apex-college';
          const [meets, sums, tsks] = await Promise.all([
            fetchMeetingsByOrg(orgId),
            fetchRecentSummaries(),
            fetchTasks(orgId, profile?.id)
          ]);
          setMeetings(meets);
          setSummaries(sums);
          setTasks(tsks);
        }}
        onOpenSummary={(m) => {
          handleOpenMeetingSummary(m);
        }}
      />
    </div>
  );
};
