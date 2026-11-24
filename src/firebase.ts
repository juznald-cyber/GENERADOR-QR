import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'generador-qr-96098',
  appId: '1:911846801181:web:8e7d475c95c2f2d5b52bf4',
  storageBucket: 'generador-qr-96098.firebasestorage.app',
  apiKey: 'AIzaSyDC9hwIr4mgjZiOipAQC0e8f56s0iv1u34',
  authDomain: 'generador-qr-96098.firebaseapp.com',
  messagingSenderId: '911846801181',
  measurementId: 'G-YMRKE7DMNB',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Permanent public base URL used inside generated QR codes.
 * Using Firebase Hosting guarantees clean /r/<shortId> URLs that never expire.
 */
export const QR_BASE_URL = 'https://generador-qr-96098.web.app';

export function buildDynamicQrUrl(shortId: string): string {
  return `${QR_BASE_URL}/r/${shortId}`;
}
