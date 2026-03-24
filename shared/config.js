// ============================================================
//  NERO FUEL WALLET — SHARED CONFIG
//  Update these values as you get each service set up
// ============================================================

// ── Firebase (same project as your NERO website) ──
export const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyA5KJn-Qvseh2BTs3091npF2IMMtWtAVus",
  authDomain:        "redfuel-a2152.firebaseapp.com",
  projectId:         "redfuel-a2152",
  storageBucket:     "redfuel-a2152.firebasestorage.app",
  messagingSenderId: "782154176195",
  appId:             "1:782154176195:web:46af20e4252e415ba77476"
};

// ── Flutterwave ──
// Step 1: Sign up at flutterwave.com
// Step 2: Go to Settings → API Keys
// Step 3: Copy your Test Public Key and paste below
export const FLUTTERWAVE_PUBLIC_KEY = "FLWPUBK_TEST-xxxxxxxxxxxx-X";
// When going live, swap the above for your live key: "FLWPUBK-xxxxxxxxxxxx-X"

// ── Your WhatsApp number (already on the website) ──
export const WHATSAPP_NUMBER = "256708870667";

// ── Currency ──
export const CURRENCY     = "UGX";
export const CURRENCY_SYM = "UGX";

// ── Transaction limits ──
export const MIN_TOPUP  = 5000;      // Minimum top-up: UGX 5,000
export const MAX_TOPUP  = 5000000;   // Maximum top-up: UGX 5,000,000
export const MAX_DEDUCT = 2000000;   // Max single fuel deduction: UGX 2,000,000

// ── Fuel prices (fallback if Firebase is unreachable) ──
export const DEFAULT_PETROL_PRICE = 5400;  // UGX per litre
export const DEFAULT_DIESEL_PRICE = 4900;  // UGX per litre

// ── Station names (must match exactly what's in Firestore) ──
export const STATIONS = [
  { id: "kiwoko",   name: "NERO Kiwoko",   address: "Next to the roundabout, Kiwoko" },
  { id: "nakaseke", name: "NERO Nakaseke", address: "Nakaseke Town" },
  { id: "butalangu",name: "NERO Butalangu",address: "Butalangu Town" }
];

// ── App URLs (update these once deployed) ──
export const APP_URLS = {
  customer:  "https://yourusername.github.io/nero-customer-wallet",
  attendant: "https://yourusername.github.io/nero-attendant-app",
  manager:   "https://yourusername.github.io/nero-manager-dashboard"
};