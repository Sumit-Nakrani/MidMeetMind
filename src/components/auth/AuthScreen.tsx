import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Mail,
  Lock,
  User,
  Building2,
  GraduationCap,
  Briefcase,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Video,
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

  // Validate invite code on blur
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

      if (isCreatingOrg && !newOrgName.trim()) {
        errors.newOrgName = 'Organization name is required';
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

  const fillDemoAccount = (demoRole: 'admin' | 'member') => {
    if (demoRole === 'admin') {
      setEmail('organizer@apex.edu');
      setPassword('MidMeetMind2026!');
    } else {
      setEmail('student.rahul@apex.edu');
      setPassword('MidMeetMind2026!');
    }
    clearError();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-[#FFE900]/40">
      {/* Top Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          {/* MidMeetMind Yellow Mark in GoTo style */}
          <div className="w-10 h-10 rounded-xl bg-[#FFE900] text-slate-950 font-black text-xl flex items-center justify-center shadow-xs">
            M
          </div>
          <div className="flex items-center gap-1.5 text-left">
            <span className="font-black text-slate-950 text-2xl tracking-tight">
              MidMeet
            </span>
            <span className="font-medium text-slate-700 text-2xl tracking-tight">
              Mind
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          AI Meeting Companion &amp; Executive Workspace
        </p>
      </div>

      {/* Main Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-xl rounded-2xl border border-slate-200">
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                clearError();
                setFormErrors({});
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                clearError();
                setFormErrors({});
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={() => loginWithGoogle(inviteCode)}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2.5 shadow-2xs transition-colors cursor-pointer mb-5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Clean Divider */}
          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative px-3 bg-white text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              or continue with email
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name (Sign Up only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sumit Nakrani"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-slate-500 bg-white text-slate-900"
                  />
                </div>
                {formErrors.name && (
                  <p className="mt-1 text-[11px] text-rose-600">{formErrors.name}</p>
                )}
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-slate-500 bg-white text-slate-900"
                />
              </div>
              {formErrors.email && (
                <p className="mt-1 text-[11px] text-rose-600">{formErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Password *
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setShowForgotModal(true);
                      setForgotMessage(null);
                    }}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-slate-500 bg-white text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formErrors.password && (
                <p className="mt-1 text-[11px] text-rose-600">{formErrors.password}</p>
              )}
            </div>

            {/* Sign Up: Role Selection & Optional Org */}
            {mode === 'signup' && (
              <div className="space-y-4 pt-3 border-t border-slate-200">
                {/* Role Switcher */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Your Primary Workspace Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('member')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col transition-all ${
                        role === 'member'
                          ? 'border-slate-900 bg-slate-50 text-slate-950 font-semibold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs">Participant</span>
                      <span className="text-[10px] text-slate-500 font-normal mt-0.5">Joins video meetings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col transition-all ${
                        role === 'admin'
                          ? 'border-slate-900 bg-slate-50 text-slate-950 font-semibold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs">Organizer / Admin</span>
                      <span className="text-[10px] text-slate-500 font-normal mt-0.5">Schedules &amp; manages org</span>
                    </button>
                  </div>
                </div>

                {/* Optional Invite Code or Create Org */}
                {role === 'admin' && (
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingOrg(false)}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                        !isCreatingOrg
                          ? 'bg-slate-200 text-slate-900 font-semibold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Join Existing Org
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingOrg(true)}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                        isCreatingOrg
                          ? 'bg-[#FFE900] text-slate-950 font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      + Create New Organization
                    </button>
                  </div>
                )}

                {isCreatingOrg ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        placeholder="e.g. Apex Tech University"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none focus:border-slate-500 bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Organization Invite Code
                      </label>
                      <span className="text-[11px] text-slate-500">Optional</span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        onBlur={handleInviteCodeBlur}
                        placeholder="e.g. APEX2026, NOVA-CORP"
                        className="w-full pl-3 pr-16 py-2 text-xs font-mono uppercase tracking-wider rounded-lg border border-slate-300 outline-none focus:border-slate-500 bg-white text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={handleInviteCodeBlur}
                        className="absolute inset-y-1 right-1 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                      >
                        Verify
                      </button>
                    </div>
                    {orgLookupStatus?.name && (
                      <p className="mt-1 text-[11px] text-emerald-600 font-medium">
                        ✓ Connected to: {orgLookupStatus.name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Submit Button (GoTo Signature Yellow CTA) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-bold text-sm shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <span>Processing...</span>
              ) : mode === 'login' ? (
                <>
                  <span>Sign In to MidMeetMind</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick 1-Click Demo Accounts */}
          {mode === 'login' && (
            <div className="mt-6 pt-5 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-2.5 text-center">
                1-Click Demo Accounts (Fast Testing)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('admin')}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-left text-xs text-slate-700 transition-colors"
                >
                  <span className="font-bold text-slate-900 block">Organizer Demo</span>
                  <span className="text-[10px] text-slate-500 font-mono">organizer@apex.edu</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('member')}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-left text-xs text-slate-700 transition-colors"
                >
                  <span className="font-bold text-slate-900 block">Participant Demo</span>
                  <span className="text-[10px] text-slate-500 font-mono">student.rahul@apex.edu</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Reset Your Password
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter your registered email address and we will send you password reset instructions.
            </p>

            {forgotMessage && (
              <div className={`p-3 rounded-lg text-xs mb-4 ${
                forgotMessage.isError
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}>
                {forgotMessage.text}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-slate-500 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-1.5 rounded-lg bg-[#FFE900] text-slate-950 font-bold text-xs hover:bg-[#F5DE00] transition-colors"
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
