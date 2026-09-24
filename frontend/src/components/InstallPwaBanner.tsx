import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed as app)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone;

    if (isStandalone) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show banner on iOS if not standalone & not dismissed
    if (isIosDevice && !sessionStorage.getItem('pwa_banner_dismissed')) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-96 z-50 p-4 border border-brand-primary/30 shadow-2xl backdrop-blur-xl bg-bg-secondary/95 rounded-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-xl shadow-md shrink-0">
            ⚖️
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-text-primary text-sm">Install Equilibrium App</h3>
            <p className="text-text-muted text-xs mt-0.5 leading-relaxed">
              {isIOS ? (
                <span>Tap <strong className="text-brand-primary">Share ⎕↑</strong> and select <strong className="text-brand-primary">Add to Home Screen</strong> for full screen.</span>
              ) : (
                'Install for a fast, full-screen mobile app experience.'
              )}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-text-muted hover:text-text-primary p-1 text-sm transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        {!isIOS && deferredPrompt && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDismiss}
              className="btn-secondary flex-1 py-1.5 text-xs"
            >
              Not now
            </button>
            <button
              onClick={handleInstallClick}
              className="btn-primary flex-1 py-1.5 text-xs font-semibold"
            >
              📲 Install App
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
