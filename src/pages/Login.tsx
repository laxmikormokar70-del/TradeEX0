import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Sparkles, Send, CheckCircle, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import firebaseConfig from '../../firebase-applet-config.json';
import TradeEXLogo from '../components/TradeEXLogo';

export default function LoginPage({ 
  onNavigateToSignup, 
  onLoginSuccess 
}: { 
  onNavigateToSignup: () => void;
  onLoginSuccess: () => void;
}) {
  const { 
    signInWithEmail, 
    signInWithGoogle, 
    signUpWithEmail,
    pendingSecurityUser, 
    verifySecurityCode,
    cancelSecurityLogin,
    resetPassword,
    user
  } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firebaseConfigError, setFirebaseConfigError] = useState<'auth-not-initialized' | 'provider-not-enabled' | null>(null);
  
  // Forgot Password States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Security Code State
  const [securityCode, setSecurityCode] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  useEffect(() => {
    if (user && verificationSuccess) {
      onLoginSuccess();
    }
  }, [user, verificationSuccess, onLoginSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all email and password fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setFirebaseConfigError(null);
    try {
      if (email === 'laxmikormokar70@gmail.com') {
        try {
          await signInWithEmail(email, password);
        } catch (signInErr: any) {
          if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential' || (signInErr.message && signInErr.message.includes('not-found'))) {
            try {
               await signUpWithEmail(email, password, 'Exchange Administrator', '1985-01-01', '102030');
            } catch (signUpErr: any) {
               throw signInErr;
            }
          } else {
            throw signInErr;
          }
        }
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      let errMsg = 'Failed to sign in. Please verify your credentials.';
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
        if (err.code === 'auth/user-not-found') errMsg = 'Account not found. Please create an account first.';
        else if (err.code === 'auth/wrong-password') errMsg = 'Incorrect password.';
        else if (err.code === 'auth/invalid-email') errMsg = 'Invalid email structure.';
        else if (err.code === 'auth/invalid-credential') errMsg = 'Invalid email or password.';
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    setFirebaseConfigError(null);
    try {
      await signInWithGoogle();
      onLoginSuccess();
    } catch (err: any) {
      let errMsg = 'Failed to sign in with Google.';
      const errCode = err.code || '';
      const errStr = err.message || '';
      const isConfigNotFound = errCode === 'auth/configuration-not-found' || errStr.includes('auth/configuration-not-found') || errStr.includes('configuration-not-found');
      const isOperationNotAllowed = errCode === 'auth/operation-not-allowed' || errStr.includes('auth/operation-not-allowed') || errStr.includes('operation-not-allowed');
      const isUnauthorizedDomain = errCode === 'auth/unauthorized-domain' || errStr.includes('auth/unauthorized-domain') || errStr.includes('unauthorized-domain');
      const isClientOffline = errStr.includes('client is offline');
      const isPopupClosed = errCode === 'auth/popup-closed-by-user' || errStr.includes('popup-closed-by-user');

      if (isPopupClosed) {
        setIsLoading(false);
        return;
      }

      if (isConfigNotFound) {
        setFirebaseConfigError('auth-not-initialized');
        errMsg = 'Firebase Authentication is not activated in your Firebase console. Please click "Get Started" on the Authentication tab.';
      } else if (isOperationNotAllowed) {
        setFirebaseConfigError('provider-not-enabled');
        errMsg = 'Google sign-in provider is disabled. Please enable it in the Firebase Console -> Authentication -> Sign-in method.';
      } else if (isUnauthorizedDomain) {
        setFirebaseConfigError('unauthorized-domain');
        errMsg = 'Domain not authorized for OAuth. Please add aistudio.google.com and ais-dev-*.run.app to Authorized Domains in Firebase console -> Authentication -> Settings -> Authorized domains.';
      } else if (isClientOffline) {
        setFirebaseConfigError('offline');
        errMsg = 'Network error: Client is offline. Please disable ad-blockers, check your internet connection, or try again later.';
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecurityCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*$/.test(val) && val.length <= 6) {
      setSecurityCode(val);
    }
  };

  const handleVerifySecurityCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (securityCode.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    setIsLoading(true);
    setError(null);
    const success = await verifySecurityCode(securityCode);
    if (success) {
      setVerificationSuccess(true);
      setTimeout(() => {
        onLoginSuccess();
      }, 1000);
    } else {
      setError('Invalid security code. Please try again.');
    }
    setIsLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetError('Please enter your email address.');
      return;
    }
    setIsLoading(true);
    setResetError(null);
    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
    } catch (err: any) {
      setResetError('Could not send password reset email. Check if the email exists.');
    } finally {
      setIsLoading(false);
    }
  };

  if (verificationSuccess) {
    return (
      <div className="min-h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF7ED] to-[#FFF3E2] p-4 pb-28 sm:pb-12 sm:p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-white rounded-2xl sm:rounded-[24px] p-6 sm:p-8 shadow-[0_16px_40px_rgba(249,115,22,0.06),0_1px_3px_rgba(249,115,22,0.02)] border border-[#FED7AA] flex flex-col items-center text-center my-auto"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#f0fdf4] rounded-full flex items-center justify-center text-[#22c55e] mb-4 sm:mb-6 shadow-xs border border-[#bbf7d0]">
            <CheckCircle size={36} className="sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-[20px] sm:text-[24px] font-bold text-slate-800 leading-tight mb-2">Login Successful</h2>
          <p className="text-[13px] sm:text-[14px] text-slate-500 font-medium">Entering your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (pendingSecurityUser) {
    return (
      <div className="min-h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF7ED] to-[#FFF3E2] p-4 pb-28 sm:pb-12 sm:p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl sm:rounded-[28px] p-6 sm:p-8 shadow-[0_16px_40px_rgba(249,115,22,0.06),0_1px_3px_rgba(249,115,22,0.02)] border border-[#FED7AA] flex flex-col items-center my-auto mx-auto"
        >
          <div className="w-12 h-12 rounded-full bg-[#FFF7ED] border border-orange-100 flex items-center justify-center mb-4 text-[#F97316]">
             <Shield size={24} />
          </div>
          <div className="text-center w-full mb-5 sm:mb-6">
            <h2 className="text-[24px] sm:text-[28px] font-bold text-slate-800 leading-tight">Enter Security Code</h2>
            <p className="text-[13px] sm:text-[14px] text-slate-500 mt-2 font-medium">Input your 6-digit security code</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 flex items-start gap-2 mb-5 text-[12.5px] font-medium"
              >
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleVerifySecurityCode} className="w-full space-y-4 sm:space-y-5">
            <div>
              <input 
                type="text"
                placeholder="000000"
                value={securityCode}
                onChange={handleSecurityCodeChange}
                required
                autoFocus
                maxLength={6}
                className="w-full h-[50px] sm:h-[60px] px-4 text-center bg-white border-2 border-[#FED7AA] hover:border-[#FDBA74] rounded-xl sm:rounded-[16px] text-[24px] sm:text-[28px] tracking-[0.5em] font-mono font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/10 transition-all duration-200"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || securityCode.length !== 6}
              className="w-full h-[50px] sm:h-[56px] bg-[#F97316] hover:bg-[#ea580c] disabled:opacity-50 text-white rounded-xl sm:rounded-[18px] font-bold text-[15px] sm:text-[16px] shadow-[0_8px_24px_rgba(249,115,22,0.25)] hover:shadow-[0_12px_30px_rgba(249,115,22,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Continue"
              )}
            </button>
            
            <button
              type="button"
              onClick={cancelSecurityLogin}
              disabled={isLoading}
              className="w-full h-[50px] sm:h-[56px] border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50 rounded-xl sm:rounded-[18px] font-bold text-[15px] sm:text-[16px] transition-all flex items-center justify-center gap-2"
            >
              Cancel Login
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
          className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(249,115,22,0.1)] border border-orange-200 flex flex-col"
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
          
          <div className="space-y-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 sm:p-5 text-left mb-6 font-medium">
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
              Back to Login
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

  return (
    <div className="min-h-full bg-gradient-to-b from-[#FFF2E2] via-[#FFF9F2] to-[#FFFBF8] flex flex-col items-center justify-center p-4 pb-28 sm:pb-12 sm:p-8 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/50 backdrop-blur-md border border-[#FFF0E2] shadow-[0_32px_64px_-24px_rgba(255,138,0,0.08)] rounded-[40px] p-8 sm:p-12 flex flex-col items-center relative overflow-hidden my-auto shrink-0"
      >
        <div className="mb-6 w-[100px] h-[100px] flex items-center justify-center bg-white rounded-[24px] border border-orange-100/60 shadow-[0_10px_25px_rgba(255,115,0,0.06)] p-3 overflow-hidden">
          <TradeEXLogo size={76} />
        </div>

        <div className="text-center w-full mb-8">
          <h2 className="text-[32px] font-extrabold text-[#1E293B] tracking-tight leading-none mb-1">Welcome Back</h2>
          <h1 className="text-[44px] font-black text-[#FF7300] tracking-tight leading-tight mb-4">TradeEX</h1>
          <p className="text-[14px] text-slate-500 font-medium tracking-tight">Sign in to access your smart journey.</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="w-full bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 flex items-start gap-2.5 mb-4 text-[12.5px] font-medium"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div className="flex items-center w-full h-[58px] sm:h-[64px] bg-white border border-slate-200/80 rounded-[20px] px-4 focus-within:border-[#F97316] focus-within:ring-4 focus-within:ring-[#F97316]/10 transition-all duration-200 shadow-xs">
            <div className="w-9 h-9 bg-[#FF8A00] rounded-xl flex items-center justify-center text-white mr-4 shrink-0 shadow-sm">
              <Mail size={18} />
            </div>
            <input 
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 bg-transparent border-none text-[15px] font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none h-full"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center w-full h-[58px] sm:h-[64px] bg-white border border-slate-200/80 rounded-[20px] px-4 focus-within:border-[#F97316] focus-within:ring-4 focus-within:ring-[#F97316]/10 transition-all duration-200 shadow-xs">
              <div className="w-9 h-9 bg-[#FF8A00] rounded-xl flex items-center justify-center text-white mr-4 shrink-0 shadow-sm">
                <Lock size={18} />
              </div>
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="flex-1 bg-transparent border-none text-[15px] font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none h-full"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 p-2 transition-colors ml-2"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            <div className="flex justify-end pr-1">
              <button 
                type="button" 
                onClick={() => setShowResetModal(true)}
                className="text-[13px] font-bold text-[#FF8A00] hover:text-[#ea580c] transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[58px] sm:h-[64px] bg-gradient-to-r from-[#FF9820] to-[#FF7300] hover:from-[#FF8F23] hover:to-[#FF6F01] text-white rounded-[20px] font-bold text-[16px] sm:text-[18px] shadow-[0_8px_24px_rgba(255,115,0,0.2)] hover:shadow-[0_12px_30px_rgba(255,115,0,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Sign In"
            )}
          </button>
          
          <div className="py-2 w-full flex items-center justify-center space-x-4">
            <div className="h-[1px] bg-slate-200/60 flex-1"></div>
            <span className="text-slate-400 font-medium text-[12px] tracking-wider uppercase">OR</span>
            <div className="h-[1px] bg-slate-200/60 flex-1"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-[58px] sm:h-[64px] border border-slate-200/80 hover:border-orange-200 hover:bg-orange-50/10 text-slate-700 bg-white rounded-[20px] font-bold text-[15px] sm:text-[16px] transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] shadow-xs"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            <span>Continue with Google</span>
          </button>
        </form>

        <p className="text-[14px] sm:text-[15px] text-slate-500 font-medium mt-8 text-center">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onNavigateToSignup}
            className="text-[#FF8A00] hover:text-[#ea580c] font-black cursor-pointer transition-colors"
          >
            Create Now
          </button>
        </p>
      </motion.div>

      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-[24px] p-6 shadow-xl border border-[#FED7AA] flex flex-col z-10"
            >
              <div className="w-12 h-12 rounded-full bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center mb-4 text-[#F97316]">
                <Sparkles size={22} />
              </div>
              
              <h3 className="text-[20px] font-bold text-slate-800 leading-tight">Reset Password</h3>
              <p className="text-[13px] text-slate-500 mt-1 mb-5">We will email you a linkage code to configure a password refresh code.</p>
              
              {resetSuccess ? (
                <div className="text-center py-4">
                  <div className="text-[#22c55e] font-bold text-[15px] mb-4">Reset Email Sent! 📬</div>
                  <p className="text-[13px] text-slate-500 mb-6">Check your inbox for password recovery instructions.</p>
                  <button 
                    onClick={() => { setShowResetModal(false); setResetSuccess(false); setResetEmail(''); }}
                    className="w-full h-[48px] bg-slate-900 hover:bg-slate-800 text-white rounded-[14px] font-bold text-[14px] transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  {resetError && (
                    <div className="text-red-600 bg-red-50 p-3 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                      <AlertCircle size={14} />
                      <span>{resetError}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Your Registered Email</label>
                    <input 
                      type="email"
                      required
                      placeholder="you@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full h-[48px] px-4 bg-white border border-[#FED7AA] hover:border-[#FDBA74] rounded-xl text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/10 transition-all"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button" 
                      onClick={() => { setShowResetModal(false); setResetError(null); }}
                      className="flex-1 h-[48px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[14px] font-semibold text-[14px] transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 h-[48px] bg-[#F97316] hover:bg-[#ea580c] text-white rounded-[14px] font-bold text-[14px] transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={14} />
                          Send
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
