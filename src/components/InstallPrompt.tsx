import React, { useState, useEffect } from 'react';
import { Download, X, Heart, BellRing, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTradingContext } from '../store/TradingContext';

const defaultLogo = 'https://i.ibb.co/W4zjpw4c/upscalemedia-transformed.png';

export function InstallPrompt() {
  const { appSettings } = useTradingContext() || {};
  const logoUrl = appSettings?.logoUrl || defaultLogo;

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showLoveNotif, setShowLoveNotif] = useState(false);

  useEffect(() => {
    // Check if it's mobile or touch device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (isMobile && !localStorage.getItem('hideInstallPrompt')) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen to real PWA successful installation completion
    const installedHandler = () => {
      console.log('TradeEX PWA successfully installed!');
      triggerLoveNotification();
    };
    window.addEventListener('appinstalled', installedHandler);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isMobile && !isStandalone && !localStorage.getItem('hideInstallPrompt')) {
      const timer = setTimeout(() => setShowPrompt(true), 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
        window.removeEventListener('appinstalled', installedHandler);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const triggerLoveNotification = async () => {
    // 1. Activate custom high-fidelity on-screen system notification ("popa")
    setShowLoveNotif(true);

    // 2. Add to local storage so the real notification bar matches
    localStorage.setItem('pwa_installed_notif', 'true');
    // Save to the unread list so it immediately appears in their notification center
    const readStates = JSON.parse(localStorage.getItem('user_notif_read_states_v5') || '{}');
    readStates['pwa-love-notif'] = true; // Mark as unread/notified
    localStorage.setItem('user_notif_read_states_v5', JSON.stringify(readStates));

    // 3. Dispatch an event to immediately refresh any UI
    window.dispatchEvent(new Event('refresh-notifications'));

    // 4. Request real Browser native Notification permission and fire if granted
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification("TradeEX", {
            body: "I love you",
            icon: logoUrl,
            requireInteraction: true,
            tag: 'tradeex-pwa-love'
          });
        }
      } catch (err) {
        console.warn('Native notification request blocked or failed inside sandboxed container:', err);
      }
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setShowPrompt(false);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        triggerLoveNotification();
      } else {
        console.log('User dismissed the install prompt');
      }
      setDeferredPrompt(null);
    } else {
      // Manual/Fallback triggers the PWA Love Notification immediately too!
      await triggerLoveNotification();
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('hideInstallPrompt', 'true');
  };

  const handleNotificationAreaClick = async () => {
    // If the user clicks the floating notification area/area, fire/resend another real browser notification!
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification("TradeEX System", {
            body: "I love you - Thank you for installing TradeEX App!",
            icon: logoUrl
          });
        } else {
          alert("I love you ❤️ (Enable browser notification permissions to see this as a real push notification)");
        }
      } catch (err) {
        alert("I love you ❤️ (Thank you for choosing TradeEX!)");
      }
    } else {
      alert("I love you ❤️");
    }
  };

  return (
    <>
      {/* 📥 Prompt banner at the top */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-0 left-0 right-0 z-[100] px-4 pt-4 pb-2 pb-safe"
          >
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/50 p-3.5 max-w-sm mx-auto flex items-center justify-between gap-3 text-slate-800">
              
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 shadow-md border border-orange-500/20 bg-white p-0.5">
                  <img src={logoUrl} alt="TradeEX" className="w-full h-full object-contain" />
                </div>
                
                <div className="flex flex-col truncate">
                  <h3 className="font-extrabold text-[13px] text-slate-900 tracking-tight leading-tight uppercase flex items-center gap-1">
                    TradeEX App
                    <Sparkles size={11} className="text-[#ff8c2a]" />
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium truncate">Premium Futures Trading PWA</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] font-black text-[#ff8c2a] uppercase tracking-wider bg-orange-50 px-1.5 py-0.5 rounded-sm border border-orange-200">Secure</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={handleInstallClick}
                  className="bg-[#ff8c2a] hover:bg-orange-500 text-white px-4 py-1.5 rounded-full font-black text-[11px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Download size={11} />
                  Install
                </button>
                
                <button 
                  onClick={handleDismiss}
                  className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                  title="Dismiss"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔔 Real/Onscreen Push Notification Pop-up Modal ("popa lives there") */}
      <AnimatePresence>
        {showLoveNotif && (
          <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="w-full max-w-sm cursor-pointer relative"
              onClick={handleNotificationAreaClick}
            >
              <div 
                className="bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border-2 border-orange-500/30 flex items-start gap-4 relative overflow-hidden transition-all hover:border-orange-500 hover:shadow-orange-500/20"
                title="Click here for a real push notification detail"
              >
                {/* Logo / App Avatar */}
                <div className="w-14 h-14 bg-white p-1 rounded-2xl overflow-hidden shrink-0 shadow-md border border-orange-500/20 mt-0.5 relative">
                  <img src={logoUrl} alt="TradeEX" className="w-full h-full object-contain" />
                  <div className="absolute right-0 bottom-0 bg-red-500 p-1 rounded-tl-lg">
                    <Heart size={10} className="text-white fill-white" />
                  </div>
                </div>

                {/* Text Information */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <BellRing size={12} className="text-[#ff8c2a] animate-bounce" />
                      TradeEX App
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 tracking-tight">System • Just now</span>
                  </div>
                  <h4 className="text-[15px] font-black text-slate-800 leading-snug">TradeEX Installed Successfully</h4>
                  <p className="text-[14px] text-orange-900 font-extrabold tracking-wide mt-1.5 flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">
                    <Heart size={16} className="text-red-500 fill-red-500 shrink-0 animate-pulse" />
                    I love you
                  </p>
                  <div className="mt-3 text-[11px] font-bold text-orange-500 flex items-center gap-1 hover:underline">
                    <span>Click to trigger real phone/browser notification</span>
                  </div>
                </div>

                {/* Close Button */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLoveNotif(false);
                  }}
                  className="absolute right-3 top-3 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-full transition-all"
                  title="Dismiss"
                >
                  <X size={14} />
                </button>

                {/* Real Progress indicator timeline */}
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 7, ease: "linear" }}
                  onAnimationComplete={() => setShowLoveNotif(false)}
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
