import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  BrainCircuit,
  Mail,
  Lock,
  User,
  Building2,
  GraduationCap,
  Briefcase,
  KeyRound,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Users
} from 'lucide-react';
import { DEMO_ORGS, findOrganizationByInviteCode } from '../../lib/authService.ts';
import { OrganizationType, UserRole } from '../../types/index.ts';

export const AuthScreen: React.FC = () => {
  const {
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    resetPassword,
    error,
    clearError,
    loading
  } = useAuth();

  // Mode: 'login' | 'signup'
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  
  // Org join/create fields
  const [inviteCode, setInviteCode] = useState('');
  const [orgLookupStatus, setOrgLookupStatus] = useState<{ checked: boolean; name?: string; type?: string } | null>(null);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgType, setNewOrgType] = useState<OrganizationType>('college');

  // Forgot Password Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Validation errors
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Validate invite code on blur or change
  const handleInviteCodeBlur = async () => {
    if (!inviteCode.trim()) {
      setOrgLookupStatus(null);
      return;
    }
    const found = await findOrganizationByInviteCode(inviteCode);
    if (found) {
      setOrgLookupStatus({ checked: true, name: found.name, type: found.type });
      setFormErrors(prev => {
        const next = { ...prev };
        delete next.inviteCode;
        return next;
      });
    } else {
      setOrgLookupStatus({ checked: true });
      setFormErrors(prev => ({ ...prev, inviteCode: 'Organization not found with this code' }));
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        errors.name = 'Full name is required';
      }

      if (isCreatingOrg) {
        if (!newOrgName.trim()) {
          errors.newOrgName = 'Organization name is required';
        }
      } else {
        if (!inviteCode.trim()) {
          errors.inviteCode = 'Organization invite code is required';
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validateForm()) return;

    if (mode === 'login') {
      await loginWithEmail(email, password);
    } else {
      await signupWithEmail({
        name,
        email,
        pass: password,
        role,
        inviteCode: isCreatingOrg ? undefined : inviteCode.trim(),
        newOrgName: isCreatingOrg ? newOrgName.trim() : undefined,
        newOrgType: isCreatingOrg ? newOrgType : undefined
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotMessage({ text: 'Please enter your email.', isError: true });
      return;
    }
    setForgotLoading(true);
    const res = await resetPassword(forgotEmail);
    setForgotLoading(false);
    setForgotMessage({ text: res.message, isError: !res.success });
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setInviteCode(code);
    handleInviteCodeBlur();
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500/30">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Brand Icon & Heading */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-xl shadow-indigo-500/25 mb-4 ring-1 ring-white/20">
          <BrainCircuit className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          MidMeetMind
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          AI-Powered Meeting Assistant for Colleges, Schools &amp; Companies
        </p>
      </div>

      {/* Main Auth Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 shadow-2xl rounded-2xl p-6 sm:p-8">
          
          {/* Top Toggle: Login vs Sign Up */}
          <div className="flex p-1 bg-slate-950/60 rounded-xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                clearError();
                setFormErrors({});
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                clearError();
                setFormErrors({});
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* If Sign Up: Full Name */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Aryan Patel"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 text-sm placeholder-slate-500 outline-none transition-all"
                  />
                </div>
                {formErrors.name && (
                  <p className="mt-1 text-[11px] text-rose-400">{formErrors.name}</p>
                )}
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.edu or company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 text-sm placeholder-slate-500 outline-none transition-all"
                />
              </div>
              {formErrors.email && (
                <p className="mt-1 text-[11px] text-rose-400">{formErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setShowForgotModal(true);
                      setForgotMessage(null);
                    }}
                    className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 text-sm placeholder-slate-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formErrors.password && (
                <p className="mt-1 text-[11px] text-rose-400">{formErrors.password}</p>
              )}
            </div>

            {/* If Sign Up: Role Selection & Organization Options */}
            {mode === 'signup' && (
              <div className="space-y-4 pt-2 border-t border-slate-800/80">
                {/* User Role Selection */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Your Primary Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('member')}
                      className={`p-3 rounded-xl border text-left flex flex-col transition-all ${
                        role === 'member'
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-semibold text-slate-200">Participant / Member</span>
                      <span className="text-[11px] text-slate-400 mt-0.5">Joins meetings, receives summaries &amp; tasks</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`p-3 rounded-xl border text-left flex flex-col transition-all ${
                        role === 'admin'
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-semibold text-slate-200">Admin / Organizer</span>
                      <span className="text-[11px] text-slate-400 mt-0.5">Schedules, uploads recordings, manages org</span>
                    </button>
                  </div>
                </div>

                {/* Organization Join vs Create */}
                {role === 'admin' && (
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingOrg(false)}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                        !isCreatingOrg
                          ? 'bg-slate-800 text-indigo-300 font-medium'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      Join Existing Org
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingOrg(true)}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                        isCreatingOrg
                          ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 font-medium'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      + Create New Organization
                    </button>
                  </div>
                )}

                {isCreatingOrg ? (
                  /* Create New Organization */
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-indigo-500/20 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        placeholder="e.g. Cambridge Tech University"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-indigo-500 text-slate-100 text-xs outline-none"
                      />
                      {formErrors.newOrgName && (
                        <p className="mt-1 text-[11px] text-rose-400">{formErrors.newOrgName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Organization Type
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['college', 'school', 'company'] as OrganizationType[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setNewOrgType(t)}
                            className={`py-1.5 px-2 rounded-lg border text-xs capitalize text-center ${
                              newOrgType === t
                                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-medium'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Organization Invite Code */
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        Organization Invite Code
                      </label>
                      <span className="text-[11px] text-slate-400">Required to link your org</span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => {
                          setInviteCode(e.target.value.toUpperCase());
                          if (orgLookupStatus) setOrgLookupStatus(null);
                        }}
                        onBlur={handleInviteCodeBlur}
                        placeholder="e.g. APEX2026, NOVA-CORP"
                        className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 text-sm tracking-wider font-mono placeholder-slate-500 outline-none uppercase transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleInviteCodeBlur}
                        className="absolute inset-y-1 right-1 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                      >
                        Verify
                      </button>
                    </div>

                    {/* Org verification status badge */}
                    {orgLookupStatus?.name && (
                      <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-300 text-xs">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Found: <strong>{orgLookupStatus.name}</strong> ({orgLookupStatus.type})</span>
                      </div>
                    )}

                    {orgLookupStatus && !orgLookupStatus.name && (
                      <p className="mt-1 text-[11px] text-amber-400">
                        Unrecognized code. You can use one of the pre-seeded sample codes below.
                      </p>
                    )}

                    {/* Pre-seeded sample invite codes */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                      <p className="text-[11px] text-slate-400 mb-1.5">
                        Sample Organizations to test:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {DEMO_ORGS.map((org) => (
                          <button
                            key={org.id}
                            type="button"
                            onClick={() => copyToClipboard(org.inviteCode)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-indigo-300 font-mono transition-colors"
                          >
                            <span>{org.name.split(' ')[0]}:</span>
                            <span className="font-bold">{org.inviteCode}</span>
                            {copiedCode === org.inviteCode ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to MidMeetMind' : 'Complete Registration'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-3 text-slate-500">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={() => loginWithGoogle(inviteCode)}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-sm font-medium flex items-center justify-center gap-3 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.66-5.17 3.66-9.09z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.1A11.996 11.996 0 0 0 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.32a7.18 7.18 0 0 1 0-4.64v-3.1H1.25a11.99 11.99 0 0 0 0 10.84l4.03-3.1z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.39 0 3.4 2.65 1.25 6.58l4.03 3.1c.95-2.83 3.6-4.93 6.72-4.93z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>

        {/* Footer Note */}
        <p className="mt-4 text-center text-xs text-slate-500">
          MidMeetMind uses secure Firebase Authentication &amp; Firestore with organization isolation.
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Reset Password</h3>
                <p className="text-xs text-slate-400">We'll email you a link to reset your password</p>
              </div>
            </div>

            {forgotMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  forgotMessage.isError
                    ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                    : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                }`}
              >
                {forgotMessage.isError ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{forgotMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@college.edu"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/30"
                >
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
