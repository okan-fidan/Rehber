// Push Notification Helper for PWA
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './firebase';

const VAPID_KEY = 'YOUR_VAPID_KEY_HERE'; // Firebase Console'dan alınacak

// Firebase Messaging instance
let messaging = null;

try {
  messaging = getMessaging(app);
} catch (error) {
  console.log('Firebase messaging not supported');
}

// Get FCM Token
export const getFCMToken = async () => {
  if (!messaging) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }
    
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('FCM Token error:', error);
    return null;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback) => {
  if (!messaging) return () => {};
  
  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
};

// Subscribe to topic (server-side)
export const subscribeToTopic = async (token, topic) => {
  // Bu işlem backend'de yapılmalı
  console.log(`Subscribing ${token} to topic ${topic}`);
};

// Request notification permission
export const requestPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

// Show local notification
export const showNotification = (title, options = {}) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  const defaultOptions = {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'default',
    renotify: false,
    requireInteraction: false,
    ...options
  };
  
  new Notification(title, defaultOptions);
};

// Check if app is installed
export const isAppInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

// Prompt user to install app
export const promptInstall = async () => {
  if (window.deferredPrompt) {
    window.deferredPrompt.prompt();
    const { outcome } = await window.deferredPrompt.userChoice;
    console.log('Install prompt outcome:', outcome);
    window.deferredPrompt = null;
    return outcome === 'accepted';
  }
  return false;
};

// Check if install prompt is available
export const canPromptInstall = () => {
  return !!window.deferredPrompt;
};
