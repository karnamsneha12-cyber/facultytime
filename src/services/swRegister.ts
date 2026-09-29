export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('FacultyFlow Service Worker registered successfully:', registration.scope);
    return registration;
  } catch (error) {
    console.warn('Service Worker registration skipped or failed:', error);
    return null;
  }
}
