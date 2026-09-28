import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  BrainCircuit,
  Building2,
  GraduationCap,
  Briefcase,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Users,
  ArrowRight,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  School
} from 'lucide-react';
import { OrganizationType } from '../../types/index.ts';
import { generateInviteCode, findOrganizationByInviteCode, DEMO_ORGS } from '../../lib/authService.ts';

interface OrganizationSetupScreenProps {
  onComplete?: () => void;
  onCancel?: () => void;
  defaultTab?: 'create' | 'join';
}

export const OrganizationSetupScreen: React.FC<OrganizationSetupScreenProps> = ({
  onComplete,
  onCancel,
  defaultTab = 'create'
}) => {
  const { profile, organization, createNewOrganization, joinOrg, updateInviteCode, loading } = useAuth();

  // Active Tab: 'create' | 'join'
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(defaultTab);

  // --- Form 1: Create Organization ---
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState<OrganizationType>('college');
  const [generatedCode, setGeneratedCode] = useState(() => generateInviteCode('APEX'));
  const [customCodeError, setCustomCodeError] = useState<string | null>(null);

  // --- Form 2: Join Organization ---
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [verifiedOrg, setVerifiedOrg] = useState<{
    id: string;
    name: string;
    type: OrganizationType;
    inviteCode: string;
    firstAdminName?: string;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // General Status & Feedback
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Regeneration of code
  const handleRegenerateCode = () => {
    const fresh = generateInviteCode(orgName || 'MIND');
    setGeneratedCode(fresh);
    setCustomCodeError(null);
  };

  // Verify code for joining
  const handleVerifyJoinCode = async (codeToVerify?: string) => {
    const code = (codeToVerify || joinCodeInput).trim().toUpperCase();
    if (!code) {
      setJoinError('Please enter an invite code to verify.');
      setVerifiedOrg(null);
      return;
    }

    setVerifying(true);
    setJoinError(null);
    try {
      const found = await findOrganizationByInviteCode(code);
      if (found) {
        setVerifiedOrg({
          id: found.id,
          name: found.name,
          type: found.type,
          inviteCode: found.inviteCode,
          firstAdminName: found.firstAdminName
        });
        setJoinError(null);
      } else {
        setVerifiedOrg(null);
        setJoinError(`No organization found matching invite code "${code}". Please check with your organizer.`);
      }
    } catch (err: any) {
      setJoinError('Could not verify code at this moment. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  // Submit: Create Organization (First-Admin Assignment)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!orgName.trim()) {
      setErrorMessage('Please enter an Organization Name.');
      return;
    }

    const cleanCode = generatedCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 3) {
      setCustomCodeError('Invite code must be at least 3 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createNewOrganization({
        name: orgName.trim(),
        type: orgType,
        customInviteCode: cleanCode
      });

      if (res.success && res.organization) {
        setSuccessMessage(`Organization "${res.organization.name}" successfully created! You are designated as the First Admin.`);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 1200);
      } else {
        setErrorMessage(res.message || 'Failed to create organization. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unexpected error creating organization.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit: Join Organization via Invite Code
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const code = joinCodeInput.trim().toUpperCase();
    if (!code) {
      setErrorMessage('Please enter an invite code.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await joinOrg(code);
      if (res.success) {
        setSuccessMessage('Successfully joined the organization! Redirecting to workspace...');
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 1200);
      } else {
        setErrorMessage(res.message || 'Failed to join organization with this code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unexpected error joining organization.');
    } finally {
      setSubmitting(false);
    }
  };

  const copySampleCode = (code: string) => {
    setJoinCodeInput(code);
    handleVerifyJoinCode(code);
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl"></div>
      </div>

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-base leading-tight">MidMeetMind</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Organization Workspace
                </span>
              </div>
              <p className="text-xs text-slate-400">Scoped &amp; Private Meeting Architecture</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>User: <strong className="text-slate-200">{profile.name}</strong></span>
              </div>
            )}
            {onCancel && organization && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 relative z-10 space-y-6">
        
        {/* Intro Banner */}
        <div className="text-center max-w-xl mx-auto space-y-2 mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Organization Setup &amp; Access
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            All meetings, transcripts, AI summaries, and action items belong to an organization so your team's discussions remain secure and private.
          </p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-300 text-xs sm:text-sm animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-300 text-xs sm:text-sm animate-fadeIn">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Tab Selector */}
        <div className="max-w-xl mx-auto flex p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab('create');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-3 px-4 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Create Organization (First-Admin)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('join');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-3 px-4 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'join'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Join with Invite Code</span>
          </button>
        </div>

        {/* TAB 1: CREATE ORGANIZATION (First-Admin Assignment) */}
        {activeTab === 'create' && (
          <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Header info */}
            <div className="border-b border-slate-800/80 pb-5">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>First-Time Organizer Setup</span>
              </div>
              <h3 className="text-lg font-bold text-white">Create a New Organization</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                You will be automatically designated as the <strong>First Admin / Organizer</strong> of this workspace with full rights to schedule meetings, invite team members, and view meeting analytics.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-6">
              {/* Field 1: Organization Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Organization Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => {
                      setOrgName(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="e.g. Apex Institute of Technology, NovaTech Solutions, Cambridge High"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 text-sm placeholder-slate-500 outline-none transition-all"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  This name will appear on all meeting invites, AI summaries, and participant emails.
                </p>
              </div>

              {/* Field 2: Type Selector (College / School / Company) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Organization Type <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* College */}
                  <button
                    type="button"
                    onClick={() => setOrgType('college')}
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      orgType === 'college'
                        ? 'border-indigo-500 bg-indigo-600/15 text-white ring-1 ring-indigo-500/50 shadow-md shadow-indigo-600/10'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700/80 hover:bg-slate-950/70'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">College / University</h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Departments, faculty senate, student project syncs &amp; academic seminars.
                      </p>
                    </div>
                  </button>

                  {/* School */}
                  <button
                    type="button"
                    onClick={() => setOrgType('school')}
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      orgType === 'school'
                        ? 'border-amber-500 bg-amber-500/15 text-white ring-1 ring-amber-500/50 shadow-md shadow-amber-500/10'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700/80 hover:bg-slate-950/70'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                      <School className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">School / K-12</h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Staff coordination, PTA meetings, curriculum reviews &amp; committee syncs.
                      </p>
                    </div>
                  </button>

                  {/* Company */}
                  <button
                    type="button"
                    onClick={() => setOrgType('company')}
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      orgType === 'company'
                        ? 'border-emerald-500 bg-emerald-500/15 text-white ring-1 ring-emerald-500/50 shadow-md shadow-emerald-500/10'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700/80 hover:bg-slate-950/70'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">Company / Enterprise</h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Executive boards, client reviews, sprint standups &amp; cross-functional teams.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Field 3: Invite-Code Generator */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200">
                      Organization Invite Code Generator
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Members will use this code to join your organization workspace.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-medium text-indigo-300 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Generate Fresh Code</span>
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={generatedCode}
                    onChange={(e) => {
                      setGeneratedCode(e.target.value.toUpperCase().replace(/\s+/g, ''));
                      setCustomCodeError(null);
                    }}
                    placeholder="e.g. APEX-9421"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-indigo-500 text-slate-100 font-mono tracking-wider text-sm uppercase outline-none"
                  />
                </div>
                {customCodeError && (
                  <p className="text-[11px] text-rose-400">{customCodeError}</p>
                )}
              </div>

              {/* Field 4: First-Admin Assignment Confirmation Card */}
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                      First-Admin Assignment
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Super Organizer
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    <strong>{profile?.name || 'You'}</strong> ({profile?.email || 'Authenticated User'}) will be set as the initial administrator. You can invite additional organizers or members later.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Create Organization &amp; Open Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: JOIN EXISTING ORGANIZATION */}
        {activeTab === 'join' && (
          <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Header info */}
            <div className="border-b border-slate-800/80 pb-5">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <Users className="w-4 h-4" />
                <span>Member / Participant Flow</span>
              </div>
              <h3 className="text-lg font-bold text-white">Join an Existing Organization</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Enter your organization's unique invite code. Once linked, you will receive all meeting summaries, action items, and task follow-ups scoped to this organization.
              </p>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-6">
              {/* Field: Invite Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Enter Organization Invite Code <span className="text-rose-400">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => {
                        setJoinCodeInput(e.target.value.toUpperCase().replace(/\s+/g, ''));
                        if (joinError) setJoinError(null);
                        if (verifiedOrg) setVerifiedOrg(null);
                      }}
                      placeholder="e.g. APEX2026, NOVA-CORP"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 font-mono tracking-wider text-sm placeholder-slate-500 uppercase outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleVerifyJoinCode()}
                    disabled={verifying || !joinCodeInput.trim()}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {verifying ? 'Checking...' : 'Verify'}
                  </button>
                </div>

                {joinError && (
                  <p className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{joinError}</span>
                  </p>
                )}
              </div>

              {/* Verified Organization Preview Card */}
              {verifiedOrg && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-4 animate-fadeIn">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{verifiedOrg.name}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300">
                        {verifiedOrg.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Organization verified! Click below to link your account to this workspace.
                    </p>
                    {verifiedOrg.firstAdminName && (
                      <p className="text-[11px] text-slate-400">
                        Organizer: <strong>{verifiedOrg.firstAdminName}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Pre-seeded Sample Codes Helper */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                  Quick Testing: Pre-configured Organization Codes
                </span>
                <div className="flex flex-wrap gap-2">
                  {DEMO_ORGS.map((org) => (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => copySampleCode(org.inviteCode)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono text-indigo-300 transition-colors cursor-pointer"
                    >
                      <span className="text-slate-400">{org.name}:</span>
                      <strong className="text-white">{org.inviteCode}</strong>
                      {copiedCode === org.inviteCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500">
                  Click any demo code to test instant lookup and joining.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || loading || !joinCodeInput.trim()}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Confirm &amp; Join Organization</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Current Active Organization Info Card (if already member of one) */}
        {organization && (
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Your Current Active Organization:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">{organization.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {organization.type}
                </span>
                <span className="font-mono text-xs text-indigo-300 font-semibold ml-1">
                  Code: {organization.inviteCode}
                </span>
              </div>
            </div>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors self-start sm:self-auto cursor-pointer"
              >
                Keep Current &amp; Return to Dashboard
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
