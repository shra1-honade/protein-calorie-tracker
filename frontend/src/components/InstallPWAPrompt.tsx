import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-50 card flex items-center gap-3 shadow-lg">
      <Download size={20} className="text-primary-600 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">Install App</p>
        <p className="text-xs text-gray-500">
          Add to home screen for quick access
        </p>
      </div>
      <button onClick={handleInstall} className="btn-primary text-sm py-1 px-3">
        Install
      </button>
      <button onClick={() => setDismissed(true)} className="text-gray-400">
        <X size={18} />
      </button>
    </div>
  );
}
