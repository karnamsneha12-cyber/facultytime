// FacultyFlow Service Worker
const CACHE_NAME = 'facultyflow-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming push events (real web push or internal simulate)
self.addEventListener('push', (event) => {
  let data = {
    title: '🔔 FacultyFlow — Class Alert',
    body: 'Upcoming class scheduled in 5 minutes.',
    room: '',
    section: '',
    time: '',
    subject: '',
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: `facultyflow-alert-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 300],
    data: data,
    actions: [
      { action: 'open_timetable', title: 'Open Timetable' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🔔 FacultyFlow — Class Alert', options)
  );
});

// Handle client messages (e.g. triggered background notifications)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const payload = event.data.payload || {};
    const options = {
      body: payload.body || 'Class starts in 5 minutes!',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: payload.tag || `class-alert-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: payload,
      actions: [
        { action: 'open_timetable', title: 'View Timetable' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(payload.title || '🔔 FacultyFlow — Class Alert', options)
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
