import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User, Calendar, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import firebaseConfig from '../../firebase-applet-config.json';

export default function SignupPage({ 
  onNavigateToLogin, 
  onSignupSuccess 
}: { 
  onNavigateToLogin: () => void;
  onSignupSuccess: () => void;
}) {
  const { signUpWithEmail, user } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [dobError, setDobError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [pin, setPin] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firebaseConfigError, setFirebaseConfigError] = useState<'auth-not-initialized' | 'provider-not-enabled' | null>(null);
  const [setupSuccess, setSetupSuccess] = useState(false);

  useEffect(() => {
    if (user && setupSuccess) {
       onSignupSuccess();
    }
  }, [user, setupSuccess, onSignupSuccess]);

  const calculateAge = (birthDateString: string) => {
    if (!birthDateString) return 0;
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  };

  useEffect(() => {
    if (dob) {
      const age = calculateAge(dob);
      if (age < 15) {
        setDobError('You must be at least 15 years old to create an account.');
      } else {
        setDobError(null);
      }
    } else {
      setDobError(null);
    }
  }, [dob]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword || !name || !dob) {
      setError('Please fill in all details.');
      return;
    }

    if (calculateAge(dob) < 15) {
      setError('You must be at least 15 years old to create an account.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least 1 uppercase letter.');
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least 1 lowercase letter.');
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least 1 number.');
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setError('Password must contain at least 1 special character.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    setIsLoading(true);
    // Simulate slight delay for validation check
    setTimeout(() => {
       setIsLoading(false);
       setIsSettingPin(true);
    }, 400);
  };

  const handleFinalSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) {
      setError('Please enter a valid 6-digit security code.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setFirebaseConfigError(null);
    try {
      await signUpWithEmail(email, password, name, dob, pin);
      setSetupSuccess(true);
    } catch (err: any) {
      let errMsg = 'Failed to create account.';
      const errCode = err.code || '';
      const errStr = err.message || '';
      const isConfigNotFound = errCode === 'auth/configuration-not-found' || errStr.includes('auth/configuration-not-found') || errStr.includes('configuration-not-found');
      const isOperationNotAllowed = errCode === 'auth/operation-not-allowed' || errStr.includes('auth/operation-not-allowed') || errStr.includes('operation-not-allowed');

      if (isConfigNotFound) {
        setFirebaseConfigError('auth-not-initialized');
        errMsg = 'Firebase Authentication is not activated in your Firebase console. Please click "Get Started" on the Authentication tab.';
      } else if (isOperationNotAllowed) {
        setFirebaseConfigError('provider-not-enabled');
        errMsg = 'Email/Password sign-in provider is disabled. Please enable it in the Firebase Console -> Authentication -> Sign-in method.';
      } else if (err.code) {
        if (err.code === 'auth/email-already-in-use') errMsg = 'An account already exists with this email.';
        else if (err.code === 'auth/invalid-email') errMsg = 'Invalid email structure.';
        else if (err.code === 'auth/weak-password') errMsg = 'Weak password. Please use a stronger password.';
        else errMsg = err.message || err.code;
      } else if (err.message) {
        try {
           const parsed = JSON.parse(err.message);
           if (parsed && parsed.error) {
             errMsg = `Database Error: ${parsed.error}`;
           } else {
             errMsg = err.message;
           }
        } catch {
           errMsg = err.message;
        }
      }
      setError(errMsg);
      setIsSettingPin(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (setupSuccess) {
    return (
      <div className="min-h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF7ED] to-[#FFF3E2] p-4 pb-28 sm:pb-12 sm:p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-white rounded-2xl p-6 sm:p-8 shadow-[0_16px_40px_rgba(249,115,22,0.06),0_1px_3px_rgba(249,115,22,0.02)] border border-[#FED7AA] flex flex-col items-center text-center my-auto"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#FFF7ED] rounded-full flex items-center justify-center text-[#F97316] mb-4 sm:mb-6 shadow-xs border border-[#FED7AA]">
            <CheckCircle size={36} className="sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-[20px] sm:text-[24px] font-bold text-slate-800 leading-tight mb-2">Account Created Successfully</h2>
          <p className="text-[13px] sm:text-[14px] text-slate-500 font-medium">Entering secure platform...</p>
        </motion.div>
      </div>
    );
  }

  if (isSettingPin) {
    return (
      <div className="min-h-full w-full bg-gradient-to-br from-[#FFF7ED] to-[#FFF3E2] font-sans flex flex-col justify-center items-center p-4 pb-28 sm:pb-12 sm:p-6 md:p-8">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-white rounded-[24px] p-6 sm:p-8 shadow-[0_20px_50px_rgba(249,115,22,0.08)] border border-orange-100 flex flex-col"
        >
          <div className="w-12 h-12 rounded-[16px] bg-[#FFF7ED] border border-orange-100 flex items-center justify-center mb-4 text-[#F97316] shrink-0 mx-auto">
            <Lock size={24} />
          </div>
          
          <h2 className="text-[20px] sm:text-[24px] font-bold text-slate-800 leading-tight mb-2 text-center">Set Security Code</h2>
          <p className="text-[13px] sm:text-[14px] text-slate-500 font-medium mb-6 text-center leading-relaxed">
            Please enter a 6-digit PIN to secure your account linked to <span className="font-bold text-slate-700">{email}</span>. You will use this code when logging in.
          </p>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 flex items-start gap-2.5 mb-5 text-[12.5px] font-medium"
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <form onSubmit={handleFinalSignup} className="space-y-4">
            <div className="relative">
              <input 
                type="text"
                maxLength={6}
                placeholder="000000"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full h-[56px] bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/10 rounded-[16px] text-[24px] font-mono font-bold text-slate-800 text-center tracking-[0.5em] placeholder-slate-300 transition-all"
              />
            </div>
            
            <button 
              type="submit"
              disabled={isLoading || pin.length !== 6}
              className="w-full h-[56px] bg-[#F97316] hover:bg-[#ea580c] disabled:opacity-50 text-white rounded-[16px] font-bold text-[16px] shadow-[0_8px_24px_rgba(249,115,22,0.25)] hover:shadow-[0_12px_30px_rgba(249,115,22,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Set & Register"
              )}
            </button>
            <button
               type="button"
               onClick={() => setIsSettingPin(false)}
               className="w-full h-[40px] mt-2 text-slate-500 hover:text-slate-800 text-[13px] font-bold transition-colors"
            >
               Back
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (firebaseConfigError) {
    const isNotInitialized = firebaseConfigError === 'auth-not-initialized';
    return (
      <div className="min-h-full w-full bg-gradient-to-br from-[#FFF7ED] to-[#FFF3E2] font-sans flex flex-col justify-center items-center p-4 pb-28 sm:pb-12 sm:p-6 md:p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm sm:max-w-md bg-white rounded-[24px] p-6 shadow-[0_20px_50px_rgba(249,115,22,0.1)] border border-orange-200 flex flex-col"
        >
          <div className="w-12 h-12 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center mb-4 text-[#F97316] shrink-0">
            <AlertCircle size={24} />
          </div>
          
          <h2 className="text-[20px] sm:text-[24px] font-bold text-slate-800 leading-tight mb-2">
            {isNotInitialized ? "Firebase Auth Activation Required" : "Authentication Setup Required"}
          </h2>
          <p className="text-[13px] sm:text-[14px] text-slate-500 font-medium mb-6">
            {isNotInitialized 
              ? "You have successfully linked your own Firebase project, but Authentication is not activated yet. You must initialize it in the Firebase Console so the app can create sessions for you."
              : "Email/Password or Google authentication is currently disabled in your Firebase console. Please enable them to allow secure login and signup."}
          </p>
          
          <div className="space-y-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 md:p-5 text-left mb-6 font-medium">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {isNotInitialized ? "How to Activate Firebase Auth:" : "How to Enable Sign-in Providers:"}
            </h4>
            <ol className="list-decimal list-inside space-y-2.5 text-slate-600 text-[12.5px] leading-relaxed">
              <li>
                Open the{' '}
                <a 
                  href={`https://console.firebase.google.com/project/${(firebaseConfig as any).projectId}/authentication`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[#F97316] hover:text-[#ea580c] underline font-bold"
                >
                  Firebase Authentication Console
                </a>
              </li>
              {isNotInitialized ? (
                <>
                  <li>Click the orange <strong className="text-slate-800">"Get Started"</strong> button to initialize Firebase Authentication.</li>
                  <li>Click the <strong className="text-slate-800">"Sign-in method"</strong> tab.</li>
                  <li>Click **"Add new provider"**, choose **"Email/Password"**, enable it, and save.</li>
                  <li>In **"Add new provider"**, choose **"Google"**, enable it (select a support email), and save.</li>
                </>
              ) : (
                <>
                  <li>Click the <strong className="text-slate-800">"Sign-in method"</strong> tab.</li>
                  <li>Verify **"Email/Password"** and **"Google"** are both enabled.</li>
                  <li>If not, click each provider, configure/toggle them to enabled, and click <strong className="text-slate-900 font-bold">Save</strong>.</li>
                </>
              )}
              <li>Once completed, return here and refresh to register, sign in and trade!</li>
            </ol>
          </div>
          
          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={() => setFirebaseConfigError(null)}
              className="flex-1 h-[48px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-[14px] transition-colors"
            >
              Back to Signup
            </button>
            <a 
              href={`https://console.firebase.google.com/project/${(firebaseConfig as any).projectId}/authentication`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 h-[48px] bg-[#F97316] hover:bg-[#ea580c] text-white rounded-xl font-bold text-[14px] transition-colors flex items-center justify-center gap-2 shadow-[0_8px_16px_rgba(249,115,22,0.2)]"
            >
              Configure Console
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const isStrong = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  return (
    <div className="min-h-full w-full bg-gradient-to-br from-[#FFF7ED] to-[#FFF3E2] font-sans flex flex-col justify-center items-center p-4 pb-28 sm:pb-12 sm:p-6 md:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-lg bg-white rounded-[24px] p-6 sm:p-8 shadow-[0_20px_50px_rgba(249,115,22,0.08)] border border-orange-100 flex flex-col my-auto shrink-0"
      >
        <div className="w-full flex flex-col items-center justify-center mb-6 shrink-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#FFF7ED] rounded-[18px] border border-orange-100 flex items-center justify-center mb-3 text-[#F97316]">
             <User size={24} />
          </div>
          <h2 className="text-[22px] sm:text-[26px] font-bold text-slate-800 leading-tight text-center">Create Account</h2>
          <p className="text-[13.5px] text-slate-500 mt-1 font-medium text-center">Join us and start trading today</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="w-full bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 flex items-start gap-2.5 mb-5 text-[12.5px] font-medium"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSignup} className="w-full space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">Full Name</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <User size={16} />
                </span>
                <input 
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full h-[50px] sm:h-[56px] pl-10 sm:pl-[46px] pr-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/10 rounded-xl sm:rounded-[16px] text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">Date of Birth</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Calendar size={16} />
                </span>
                <input 
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  className="w-full h-[50px] sm:h-[56px] pl-10 sm:pl-[46px] pr-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/10 rounded-xl sm:rounded-[16px] text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all font-sans"
                />
              </div>
              {dobError && (
                <p className="text-red-500 text-xs font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle size={12} className="shrink-0 text-red-500" /> {dobError}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={16} />
                </span>
                <input 
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-[50px] sm:h-[56px] pl-10 sm:pl-[46px] pr-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/10 rounded-xl sm:rounded-[16px] text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={16} />
                </span>
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-[50px] sm:h-[56px] pl-10 sm:pl-[46px] pr-10 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/10 rounded-xl sm:rounded-[16px] text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-2 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">Confirm Password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={16} />
                </span>
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full h-[50px] sm:h-[56px] pl-10 sm:pl-[46px] pr-10 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/10 rounded-xl sm:rounded-[16px] text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all"
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-2 transition-colors duration-200"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Dynamic Verification Badges */}
          {password.length > 0 && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-2 text-[12.5px] font-medium">
              <div className="flex items-center gap-2 font-bold mb-1">
                {isStrong ? (
                  <span className="text-emerald-600 flex items-center gap-1.5"><CheckCircle size={14} /> Password Strength: Strong</span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1.5">Password Strength: Weak</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${hasMinLength ? 'bg-emerald-500' : 'bg-slate-300'} transition-all`} />
                  <span className={hasMinLength ? 'text-emerald-600' : 'text-slate-500'}>Minimum 8 characters</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${hasUppercase ? 'bg-emerald-500' : 'bg-slate-300'} transition-all`} />
                  <span className={hasUppercase ? 'text-emerald-600' : 'text-slate-500'}>1 Uppercase letter</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${hasLowercase ? 'bg-emerald-500' : 'bg-slate-300'} transition-all`} />
                  <span className={hasLowercase ? 'text-emerald-600' : 'text-slate-500'}>1 Lowercase letter</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${hasNumber ? 'bg-emerald-500' : 'bg-slate-300'} transition-all`} />
                  <span className={hasNumber ? 'text-emerald-600' : 'text-slate-500'}>1 Number</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${hasSpecial ? 'bg-emerald-500' : 'bg-slate-300'} transition-all`} />
                  <span className={hasSpecial ? 'text-emerald-600' : 'text-slate-500'}>1 Special Character</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${passwordsMatch ? 'bg-emerald-500' : 'bg-slate-300'} transition-all`} />
                  <span className={passwordsMatch ? 'text-emerald-600' : 'text-slate-500'}>Passwords match</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !isStrong || !passwordsMatch || !dob || !!dobError}
              className="w-full h-[50px] sm:h-[56px] bg-[#F97316] hover:bg-[#ea580c] disabled:opacity-50 text-white rounded-xl sm:rounded-[18px] font-bold text-[15px] sm:text-[16px] shadow-[0_8px_24px_rgba(249,115,22,0.25)] hover:shadow-[0_12px_30px_rgba(249,115,22,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Create Account"
              )}
            </button>
          </div>
        </form>

        <div className="w-full flex items-center justify-center mt-6">
          <div className="text-[13px] sm:text-sm font-medium text-slate-500">
            Already have an account?{' '}
            <button 
              type="button"
              onClick={onNavigateToLogin}
              className="font-bold text-[#F97316] hover:text-[#ea580c] transition-all underline decoration-orange-200 hover:decoration-[#F97316] inline-flex items-center gap-1.5"
            >
              Login
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

