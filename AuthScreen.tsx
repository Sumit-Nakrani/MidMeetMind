import React, { useState } from 'react';
import { UserAccount, TravelStyle } from '../types';
import { loginUser, registerUser, resetPassword, INITIAL_USERS } from '../lib/auth';
import {
  Globe2,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Compass,
  Star,
  ShieldCheck,
  Luggage,
  MapPin,
  Sparkles,
  Plane
} from 'lucide-react';

interface AuthScreenProps {
  onAuthenticated: (user: UserAccount) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot_password';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>('login');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [homeCurrency, setHomeCurrency] = useState('INR');
  const [preferredStyle, setPreferredStyle] = useState<TravelStyle>('Cultural');
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Forgot password flow
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [generatedDemoCode, setGeneratedDemoCode] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Validation helpers
  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const getPasswordStrength = (pass: string): { label: string; color: string; percent: number } => {
    if (!pass) return { label: 'Empty', color: 'bg-slate-200', percent: 0 };
    if (pass.length < 6) return { label: 'Weak (min 6)', color: 'bg-rose-500', percent: 25 };
    
    let score = 1;
    if (pass.length >= 8) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score === 1) return { label: 'Fair', color: 'bg-amber-500', percent: 50 };
    if (score === 2) return { label: 'Good', color: 'bg-blue-500', percent: 75 };
    return { label: 'Strong', color: 'bg-emerald-500', percent: 100 };
  };

  const passwordStrength = getPasswordStrength(password);

  // Handle Login Submit
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = loginUser(email, password, rememberMe);
      setIsLoading(false);

      if (result.success && result.user) {
        setSuccessMessage('Login successful! Redirecting to your dashboard...');
        setTimeout(() => {
          onAuthenticated(result.user!);
        }, 300);
      } else {
        setErrorMessage(result.error || 'Invalid email or password.');
      }
    }, 350);
  };

  // Handle Sign Up Submit
  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Please accept the Terms & Privacy policy.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = registerUser(
        name.trim(),
        email.trim(),
        password,
        homeCurrency,
        preferredStyle
      );

      setIsLoading(false);

      if (result.success && result.user) {
        setSuccessMessage('Account created successfully! Redirecting...');
        setTimeout(() => {
          onAuthenticated(result.user!);
        }, 350);
      } else {
        setErrorMessage(result.error || 'Failed to create account.');
      }
    }, 400);
  };

  // Handle Quick Demo Account Login
  const handleQuickDemoLogin = (demoUser: typeof INITIAL_USERS[0]) => {
    setEmail(demoUser.email);
    setPassword(demoUser.passwordHash || '');
    setErrorMessage(null);
    setSuccessMessage(`Logging in as ${demoUser.name}...`);
    setIsLoading(true);

    setTimeout(() => {
      const result = loginUser(demoUser.email, demoUser.passwordHash || '', true);
      setIsLoading(false);
      if (result.success && result.user) {
        onAuthenticated(result.user);
      }
    }, 300);
  };

  // Handle Forgot Password - Step 1: Send Code
  const handleSendResetCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !validateEmail(email)) {
      setErrorMessage('Please enter a valid registered email.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedDemoCode(code);
      setResetCode(code);
      setResetStep(2);
      setSuccessMessage(`Code sent! (Demo Code: ${code})`);
    }, 350);
  };

  // Handle Forgot Password - Step 2: Set New Password
  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!resetCode || resetCode.length < 4) {
      setErrorMessage('Please enter the 4-digit code.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const result = resetPassword(email, newPassword);
      setIsLoading(false);

      if (result.success) {
        setSuccessMessage('Password updated! Signing in...');
        setTimeout(() => {
          const loginRes = loginUser(email, newPassword, true);
          if (loginRes.success && loginRes.user) {
            onAuthenticated(loginRes.user);
          } else {
            setMode('login');
          }
        }, 500);
      } else {
        setErrorMessage(result.error || 'Failed to reset password.');
      }
    }, 350);
  };

  return (
    <div className="min-h-screen bg-[#071426] flex items-center justify-center p-3 sm:p-5 lg:p-8 selection:bg-[#ef3643] selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-900/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#ef3643]/15 rounded-full blur-3xl"></div>
      </div>

      {/* Main Authentic Card */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col md:flex-row z-10 max-h-[92vh]">
        
        {/* Left Side: Real Travel Cover & Branding */}
        <div className="md:w-5/12 bg-gradient-to-br from-[#0b2247] via-[#091b38] to-[#041024] text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shrink-0">
          {/* Subtle Background Pattern & Image Accent */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#93c5fd_1px,transparent_1px)] [background-size:20px_20px]"></div>
          <div 
            className="absolute inset-0 opacity-15 bg-cover bg-center pointer-events-none mix-blend-overlay"
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80')` }}
          ></div>
          
          <div className="relative z-10">
            {/* Brand Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ef3643] to-[#e41d2d] text-white flex items-center justify-center font-black shadow-md shadow-red-500/30">
                <Globe2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-white leading-none">
                  Globe<span className="text-[#ef3643]">Trotter</span>
                </span>
                <span className="block text-[10px] font-semibold text-slate-300 tracking-wider uppercase">
                  Travel Planner
                </span>
              </div>
            </div>

            {/* Editorial Heading */}
            <div className="mt-8 space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                Plan memorable journeys, effortlessly.
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Personalized multi-city routes, day-by-day schedules, hotel check-ins, and accurate budget management in one place.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="mt-6 space-y-2.5 text-xs text-slate-200">
              <div className="flex items-center gap-2.5 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                <Compass className="w-4 h-4 text-[#ef3643] shrink-0" />
                <span>Multi-city smart itinerary builder</span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Budget estimator with live currency rates</span>
              </div>
            </div>
          </div>

          {/* Quick Demo Travelers */}
          <div className="relative z-10 mt-6 pt-4 border-t border-white/10">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-2">
              Quick One-Click Demo Sign In:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {INITIAL_USERS.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleQuickDemoLogin(demo)}
                  className="flex items-center gap-2 p-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 text-left transition-colors group"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#ef3643] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    {demo.name[0]}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate">{demo.name.split(' ')[0]}</p>
                    <p className="text-[10px] text-slate-300 truncate">{demo.homeCurrency} · {demo.preferredStyle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Clean Form Section */}
        <div className="md:w-7/12 bg-white p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Header Tabs */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  id="tab-auth-login"
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  id="tab-auth-signup"
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    mode === 'signup'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Register
                </button>
              </div>

              <span className="text-xs font-medium text-slate-400">
                {mode === 'login' && 'Existing Account'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot_password' && 'Password Help'}
              </span>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-700 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* LOGIN MODE */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="input-login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#ef3643] focus:ring-2 focus:ring-[#ef3643]/15 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setResetStep(1);
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs font-semibold text-[#ef3643] hover:text-[#d82b38]"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="input-login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#ef3643] focus:ring-2 focus:ring-[#ef3643]/15 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#ef3643] focus:ring-[#ef3643]"
                    />
                    <span>Remember me</span>
                  </label>
                </div>

                <button
                  id="btn-submit-login"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-[#ef3643] to-[#e41d2d] hover:from-[#d82b38] hover:to-[#c81625] text-white font-bold text-sm rounded-xl shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* REGISTER MODE */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="input-signup-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      required
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ef3643] focus:ring-2 focus:ring-[#ef3643]/15"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="input-signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ef3643] focus:ring-2 focus:ring-[#ef3643]/15"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="input-signup-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 chars"
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ef3643]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="input-signup-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm"
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ef3643]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500">Strength: {passwordStrength.label}</span>
                      {password === confirmPassword && confirmPassword.length > 0 && (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Passwords match
                        </span>
                      )}
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${passwordStrength.percent}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Travel Preferences */}
                <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Travel Style
                    </label>
                    <select
                      value={preferredStyle}
                      onChange={(e) => setPreferredStyle(e.target.value as TravelStyle)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#ef3643]"
                    >
                      <option value="Cultural">Cultural & Heritage</option>
                      <option value="Adventure">Adventure & Treks</option>
                      <option value="Budget">Budget Friendly</option>
                      <option value="Luxury">Luxury & Resorts</option>
                      <option value="Romantic">Romantic Getaway</option>
                      <option value="Family">Family Vacation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Preferred Currency
                    </label>
                    <select
                      value={homeCurrency}
                      onChange={(e) => setHomeCurrency(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#ef3643]"
                    >
                      <option value="INR">INR (₹) India</option>
                      <option value="USD">USD ($) US Dollar</option>
                      <option value="EUR">EUR (€) Euro</option>
                      <option value="GBP">GBP (£) British Pound</option>
                      <option value="AED">AED (AED) UAE Dirham</option>
                      <option value="SGD">SGD (S$) Singapore</option>
                      <option value="JPY">JPY (¥) Japanese Yen</option>
                      <option value="AUD">AUD (A$) Australian Dollar</option>
                      <option value="CAD">CAD (C$) Canadian Dollar</option>
                    </select>
                  </div>
                </div>

                <div className="pt-0.5">
                  <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#ef3643] focus:ring-[#ef3643]"
                    />
                    <span className="text-[11px] leading-tight">
                      I agree to the Terms of Service & Privacy Policy.
                    </span>
                  </label>
                </div>

                <button
                  id="btn-submit-signup"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-[#ef3643] to-[#e41d2d] hover:from-[#d82b38] hover:to-[#c81625] text-white font-bold text-sm rounded-xl shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* FORGOT PASSWORD MODE */}
            {mode === 'forgot_password' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-red-50 text-[#ef3643] flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Reset Password</h3>
                    <p className="text-xs text-slate-500">
                      {resetStep === 1
                        ? 'Enter your registered email to receive a recovery code.'
                        : 'Enter verification code and choose a new password.'}
                    </p>
                  </div>
                </div>

                {resetStep === 1 && (
                  <form onSubmit={handleSendResetCode} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Registered Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          required
                          className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ef3643]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 bg-gradient-to-r from-[#ef3643] to-[#e41d2d] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span>Send Recovery Code</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {resetStep === 2 && (
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        4-Digit Verification Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="Enter code"
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center tracking-widest font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-[#ef3643]"
                      />
                      {generatedDemoCode && (
                        <p className="text-[11px] text-amber-700 mt-1 text-center font-medium">
                          Demo security code: {generatedDemoCode}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ef3643]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Confirm password"
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ef3643]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Update Password</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Switcher */}
          <div className="pt-4 mt-2 border-t border-slate-100 text-center text-xs text-slate-500">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="font-bold text-[#ef3643] hover:underline cursor-pointer"
                >
                  Create account
                </button>
              </p>
            ) : mode === 'signup' ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="font-bold text-[#ef3643] hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </p>
            ) : null}
          </div>
        </div>

      </div>
    </div>
  );
};
