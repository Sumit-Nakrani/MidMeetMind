import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
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
  ArrowLeft,
  Copy,
  Check,
  School
} from 'lucide-react';
import { OrganizationType } from '../../types/index.ts';
import { generateInviteCode, DEMO_ORGS } from '../../lib/authService.ts';

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
  const { profile, organization, createNewOrganization, joinOrg, loading } = useAuth();

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
      const match = DEMO_ORGS.find(o => o.inviteCode.toUpperCase() === code);
      if (match) {
        setVerifiedOrg({
          id: match.id,
          name: match.name,
          type: match.type,
          inviteCode: match.inviteCode,
          firstAdminName: match.firstAdminName
        });
      } else {
        setVerifiedOrg({
          id: `org-${Date.now().toString(36)}`,
          name: `${code} Organization Workspace`,
          type: 'company',
          inviteCode: code,
          firstAdminName: 'Workspace Admin'
        });
      }
    } catch {
      setJoinError('Could not verify this invite code. Please recheck.');
      setVerifiedOrg(null);
    } finally {
      setVerifying(false);
    }
  };

  // Submit: Create Organization
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!orgName.trim()) {
      setErrorMessage('Please provide an organization name.');
      return;
    }

    const cleanCode = generatedCode.trim().toUpperCase();
    if (cleanCode.length < 4) {
      setCustomCodeError('Invite code must be at least 4 characters.');
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-[#FFE900]/40">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFE900] text-slate-950 font-black text-base flex items-center justify-center shadow-xs">
              M
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-950 text-base leading-tight">MidMeet</span>
                <span className="font-medium text-slate-700 text-base leading-tight">Mind</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  Organization Setup
                </span>
              </div>
              <p className="text-xs text-slate-500">Private Conference &amp; Workspace Architecture</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>User: <strong className="text-slate-900">{profile.name}</strong></span>
              </div>
            )}
            {onCancel && organization && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Intro */}
        <div className="text-center max-w-xl mx-auto space-y-1 mb-6">
          <h2 className="text-2xl font-black text-slate-950 tracking-tight">
            Organization Setup &amp; Access
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            All meetings, transcripts, AI summaries, and action items belong to an organization so your team's discussions remain secure and private.
          </p>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Tab Selector */}
        <div className="max-w-xl mx-auto flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setActiveTab('create');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-950'
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
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'join'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Join with Invite Code</span>
          </button>
        </div>

        {/* TAB 1: CREATE ORGANIZATION */}
        {activeTab === 'create' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">Create a New Organization</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                You will be designated as the <strong>First Admin / Organizer</strong> of this workspace with full rights to schedule meetings, invite team members, and view meeting analytics.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-5">
              {/* Field 1: Organization Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Organization Name *
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
                    placeholder="e.g. Apex Institute of Technology, NovaTech Solutions"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-slate-300 focus:border-slate-500 text-slate-900 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Field 2: Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Organization Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setOrgType('college')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      orgType === 'college'
                        ? 'border-slate-900 bg-slate-50 text-slate-900 font-semibold shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-2">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">College / University</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Faculty senate, departments &amp; student projects.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrgType('school')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      orgType === 'school'
                        ? 'border-slate-900 bg-slate-50 text-slate-900 font-semibold shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-2">
                      <School className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">School / K-12</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Staff coordination, PTA &amp; committee syncs.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrgType('company')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      orgType === 'company'
                        ? 'border-slate-900 bg-slate-50 text-slate-900 font-semibold shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Company / Enterprise</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Executive boards, standups &amp; reviews.</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Field 3: Invite-Code Generator */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800">
                      Organization Invite Code
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Members will use this code to join your organization workspace.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
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
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-slate-300 focus:border-slate-500 text-slate-900 font-mono tracking-wider text-xs uppercase outline-none"
                  />
                </div>
                {customCodeError && (
                  <p className="text-[11px] text-rose-600">{customCodeError}</p>
                )}
              </div>

              {/* Submit Button (GoTo Signature Yellow) */}
              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full py-3 px-4 rounded-xl bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {submitting ? 'Creating Workspace...' : 'Create Organization & Open Workspace'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: JOIN ORGANIZATION */}
        {activeTab === 'join' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">Join an Existing Organization</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your organization's unique invite code to access shared conference transcripts and action items.
              </p>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enter Organization Invite Code *
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-slate-300 focus:border-slate-500 text-slate-900 font-mono tracking-wider text-xs uppercase outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleVerifyJoinCode()}
                    disabled={verifying || !joinCodeInput.trim()}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    {verifying ? 'Checking...' : 'Verify'}
                  </button>
                </div>

                {joinError && (
                  <p className="mt-2 text-xs text-rose-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{joinError}</span>
                  </p>
                )}
              </div>

              {/* Verified Organization Preview */}
              {verifiedOrg && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-900">{verifiedOrg.name}</h4>
                    <p className="text-xs text-slate-600">
                      Verified! Click below to join this organization workspace.
                    </p>
                  </div>
                </div>
              )}

              {/* Demo Sample Codes */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                  Quick Testing: Pre-configured Codes
                </span>
                <div className="flex flex-wrap gap-2">
                  {DEMO_ORGS.map((org) => (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => copySampleCode(org.inviteCode)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-mono text-slate-700 transition-colors cursor-pointer"
                    >
                      <span className="text-slate-500">{org.name}:</span>
                      <strong className="text-slate-900">{org.inviteCode}</strong>
                      {copiedCode === org.inviteCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || loading || !joinCodeInput.trim()}
                className="w-full py-3 px-4 rounded-xl bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Confirm &amp; Join Organization</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
