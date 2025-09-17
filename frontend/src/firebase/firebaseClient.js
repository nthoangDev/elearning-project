import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FB_API_KEY,
  authDomain: process.env.REACT_APP_FB_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FB_PROJECT_ID,
  appId: process.env.REACT_APP_FB_APP_ID,
  messagingSenderId: process.env.REACT_APP_FB_MESSAGING_SENDER_ID,
  storageBucket: process.env.REACT_APP_FB_STORAGE_BUCKET,
  measurementId: process.env.REACT_APP_FB_MEASUREMENT_ID,
};

export const fbApp = initializeApp(firebaseConfig);

let _messaging = null;

export async function initMessaging() {
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  if (!_messaging) _messaging = getMessaging(fbApp);
  return _messaging;
}

export async function getFcmToken() {
  const messaging = _messaging || (await initMessaging());
  if (!messaging) return null;

  const vapidKey = process.env.REACT_APP_FB_VAPID_KEY;
  if (!vapidKey) {
    console.warn("Missing REACT_APP_FB_VAPID_KEY");
    return null;
  }
  try {
    const token = await getToken(messaging, { vapidKey });
    return token || null;
  } catch (err) {
    console.error("getToken error:", err);
    return null;
  }
}

export { onMessage, isSupported };
