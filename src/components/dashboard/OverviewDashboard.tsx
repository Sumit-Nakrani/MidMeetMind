import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  BrainCircuit,
  LogOut,
  Building2,
  GraduationCap,
  Briefcase,
  Users,
  Copy,
  Check,
  CheckCircle2,
  Calendar,
  Sparkles,
  FileText,
  ListTodo,
  Bell,
  ArrowRight,
  ShieldCheck,
  Settings,
  Mail,
  PlusCircle,
  ExternalLink
} from 'lucide-react';
import { saveUserProfile } from '../../lib/authService.ts';
import { OrganizationSetupScreen } from '../organization/OrganizationSetupScreen.tsx';

export const OverviewDashboard: React.FC = () => {
  const { profile, organization, logout, reloadUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [roleSwitching, setRoleSwitching] = useState(false);
  const [showOrgSetup, setShowOrgSetup] = useState(false);
  const [orgSetupTab, setOrgSetupTab] = useState<'create' | 'join'>('create');

  const copyInviteCode = () => {
    if (organization?.inviteCode) {
      navigator.clipboard.writeText(organization.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  // If user opened Screen 2 (Organization Setup) or does not have an org yet
  if (showOrgSetup || (!organization && profile)) {
    return (
      <OrganizationSetupScreen
        defaultTab={orgSetupTab}
        onComplete={() => setShowOrgSetup(false)}
        onCancel={organization ? () => setShowOrgSetup(false) : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-100 text-base leading-tight tracking-tight">
                MidMeetMind
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                AI Meeting Companion
              </span>
            </div>
          </div>

          {/* Org & User Profile Controls */}
          <div className="flex items-center gap-2.5">
            {/* Screen 2 Trigger Button */}
            <button
              type="button"
              onClick={() => {
                setOrgSetupTab('create');
                setShowOrgSetup(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-xs font-semibold text-indigo-300 transition-colors cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Org Setup (Screen 2)</span>
            </button>

            {/* Organization pill */}
            {organization && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                {organization.type === 'college' ? (
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                ) : organization.type === 'school' ? (
                  <Building2 className="w-4 h-4 text-amber-400" />
                ) : (
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                )}
                <span className="font-medium text-slate-200">{organization.name}</span>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={copyInviteCode}
                  title="Click to copy invite code"
                  className="flex items-center gap-1 font-mono text-[11px] text-indigo-400 hover:text-indigo-300 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-500/20 transition-colors"
                >
                  <span>{organization.inviteCode}</span>
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}

            {/* User role badge */}
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider ${
                profile?.role === 'admin'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {profile?.role === 'admin' ? 'Admin / Organizer' : 'Participant'}
            </span>

            {/* Logout button */}
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
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        
        {/* Step 1 & 2 Completion Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900/90 border border-indigo-500/30 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Screen 1: Login / Signup Active</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-medium">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Screen 2: Organization Setup Active</span>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Welcome to MidMeetMind, {profile?.name || 'User'}!
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
                Aapka organization workspace scoped hai. Har meeting, summary aur task sirf aapki organization ({organization?.name}) ke members ko dikhega.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setOrgSetupTab('create');
                  setShowOrgSetup(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create / Join Org</span>
              </button>

              <button
                type="button"
                onClick={toggleUserRole}
                disabled={roleSwitching}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>
                  {roleSwitching ? 'Switching...' : `Switch to ${profile?.role === 'admin' ? 'Participant' : 'Admin'} Role`}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Current Session Specs Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* User Profile Card */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">User Identity</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
              <h3 className="text-base font-semibold text-white">{profile?.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{profile?.email}</p>
              <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Role:</span>
                  <span className="font-semibold text-slate-200 capitalize">{profile?.role}</span>
                </div>
                <div className="flex justify-between">
                  <span>Firestore UID:</span>
                  <span className="font-mono text-[10px] text-slate-500">{profile?.id.substring(0, 14)}...</span>
                </div>
              </div>
            </div>
          </div>

          {/* Organization Card with Screen 2 Quick Action */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Organization</span>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-500/10 text-indigo-400">
                  {organization?.type || 'College'}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white">{organization?.name || 'Apex Institute'}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Invite Code: <span className="font-mono font-bold text-indigo-300">{organization?.inviteCode}</span></p>
              
              <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <button
                  type="button"
                  onClick={copyInviteCode}
                  className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied Code!' : 'Copy Code'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOrgSetupTab('join');
                    setShowOrgSetup(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white cursor-pointer"
                >
                  <span>Switch Org</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email &amp; Reminders</span>
                <Mail className="w-4 h-4 text-slate-400" />
              </div>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Summary Emails:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300">Enabled</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Task Follow-up:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300">Real-time / Due</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Weekly Digest:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MidMeetMind Product Roadmap - Next Steps */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>MidMeetMind Architecture &amp; Next Feature Steps</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Screens 1 &amp; 2 complete ho gayi hain. Hum milkar agle step par kaam kar rahe hain.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              2 / 6 Modules Ready
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-400">Step 1 (Live)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">Login &amp; Signup Screen</h4>
              <p className="text-xs text-slate-400 mt-1">
                Firestore auth, organization invite codes, validation, role assignment (Admin vs Member).
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/40 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-400">Step 2 (Live)</span>
                <Building2 className="w-4 h-4 text-indigo-400" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">Organization Setup Screen</h4>
              <p className="text-xs text-slate-400 mt-1">
                Org name, type selector (college/school/company), invite-code generator, first-admin assignment &amp; joining.
              </p>
              <button
                type="button"
                onClick={() => {
                  setOrgSetupTab('create');
                  setShowOrgSetup(true);
                }}
                className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                <span>Open Screen 2 Interface</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-indigo-500/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Step 3 (Next)</span>
                <Calendar className="w-4 h-4 text-violet-400" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">Meeting Scheduling &amp; List</h4>
              <p className="text-xs text-slate-400 mt-1">
                Schedule meetings with agenda, invite participants, recording upload &amp; public share tokens.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-indigo-500/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Step 4</span>
                <FileText className="w-4 h-4 text-indigo-400" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">AI Transcription &amp; Summary</h4>
              <p className="text-xs text-slate-400 mt-1">
                Speech-to-text transcript processing, key points, decisions, and clear executive brief.
              </p>
            </div>

            {/* Step 5 */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-indigo-500/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Step 5</span>
                <ListTodo className="w-4 h-4 text-amber-400" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">Action Items &amp; Task Engine</h4>
              <p className="text-xs text-slate-400 mt-1">
                Extract tasks with owners &amp; deadlines. Top-level tasks collection for My Tasks screen.
              </p>
            </div>

            {/* Step 6 */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-indigo-500/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Step 6</span>
                <Bell className="w-4 h-4 text-rose-400" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">Automated Follow-up Reminders</h4>
              <p className="text-xs text-slate-400 mt-1">
                Quiet follow-ups for open/overdue tasks and meeting participant summary notifications.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
