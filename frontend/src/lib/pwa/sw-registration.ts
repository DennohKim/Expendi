// Service Worker registration utility
export const registerServiceWorker = async () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('SW registered: ', registration);

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available and will be used when all
              // tabs for this page are closed. See https://bit.ly/CRA-PWA.
              console.log(
                'New content is available and will be used when all ' +
                'tabs for this page are closed.'
              );
              
              // Show user a message to refresh the page
              if (confirm('New content is available! Click OK to refresh.')) {
                window.location.reload();
              }
            } else {
              // Content is cached for offline use.
              console.log('Content is cached for offline use.');
            }
          }
        });
      });
    } catch (error) {
      console.log('SW registration failed: ', error);
    }
  }
};

export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.unregister();
      console.log('SW unregistered');
    } catch (error) {
      console.log('SW unregistration failed: ', error);
    }
  }
};

// Check if the app is running as a PWA
export const isPWA = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         ('standalone' in window.navigator && (window.navigator as NavigatorStandalone).standalone === true);
};

// Extend Navigator interface for standalone property
interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

// Prompt user to install PWA
export const promptInstallPWA = () => {
  let deferredPrompt: BeforeInstallPromptEvent | null = null;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e as BeforeInstallPromptEvent;
    
    // Show your own install promotion if needed
    console.log('PWA install prompt available');
    
    // You can show a custom install button here
    return deferredPrompt;
  });

  // Handle the install prompt
  const handleInstall = async () => {
    if (deferredPrompt) {
      // Show the prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      
      // We've used the prompt, and can't use it again, throw it away
      deferredPrompt = null;
    }
  };

  return { handleInstall, canInstall: !!deferredPrompt };
};

// TypeScript interface for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}