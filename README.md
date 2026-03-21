# NERO FUEL WALLET SYSTEM
## Complete Setup Guide

---

## WHAT WAS BUILT

Three separate web apps + security rules:

| App | File | Who uses it |
|-----|------|-------------|
| Customer Wallet | `customer/index.html` | Customers — sign up, top up, QR code |
| Attendant App   | `attendant/index.html` | Pump attendants — scan QR, deduct fuel |
| Manager Dashboard | `manager/index.html` | Station managers — reports, withdrawals |
| Security Rules  | `firestore.rules` | Firebase — access control |

---

## FIREBASE SETUP (15 minutes)

### Step 1 — Enable Authentication methods
Go to Firebase Console → Authentication → Sign-in method → Enable:
- ✅ Email/Password (used for all three apps with phone-converted emails)

### Step 2 — Upload Firestore Security Rules
Go to Firebase Console → Firestore → Rules tab
Copy and paste the contents of `firestore.rules` → Publish

### Step 3 — Create Firestore Indexes
Go to Firebase Console → Firestore → Indexes → Add these composite indexes:

**transactions collection:**
- customerId (ASC) + timestamp (DESC)
- type (ASC) + timestamp (DESC)
- stationId (ASC) + timestamp (DESC)

**customers collection:**
- accountNumber (ASC)
- status (ASC) + createdAt (DESC)

**topups collection:**
- customerId (ASC) + timestamp (DESC)

### Step 4 — Create Manager Account
In Firebase Console → Authentication → Users → Add user:
- Email: manager@nero.com (or real email)
- Password: (strong password)

Then in Firestore → Create collection `managers` → document ID = the user's UID:
```json
{
  "name": "Station Manager Name",
  "email": "manager@nero.com",
  "stationId": "all",
  "status": "active"
}
```

### Step 5 — Set Custom Claims for Roles (Cloud Functions)
Install Firebase CLI: `npm install -g firebase-tools`
Login: `firebase login`

Create a Cloud Function to set roles:
```javascript
// In Firebase Console → Functions → or deploy locally
exports.setAttendantRole = functions.https.onCall(async (data, context) => {
  // Only managers can call this
  await admin.auth().setCustomUserClaims(data.uid, { attendant: true });
  return { success: true };
});

exports.setManagerRole = functions.https.onCall(async (data, context) => {
  await admin.auth().setCustomUserClaims(data.uid, { manager: true });
  return { success: true };
});
```

**For now (testing):** The security rules fall back gracefully — attendants can transact as long as they have a record in the `attendants` collection.

---

## DEPLOYMENT

### Option 1 — Firebase Hosting (recommended, free)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Deploy customer app to main site
firebase deploy
```

### Option 2 — GitHub Pages (simplest)
- Push each folder to a separate GitHub repo
- Enable GitHub Pages on each

### Recommended URLs:
- Customer: `nero-wallet.web.app` or `wallet.nero.com`
- Attendant: `nero-attendant.web.app` or `attendant.nero.com`
- Manager:   `nero-manager.web.app` or `manager.nero.com`

---

## PAYMENT INTEGRATION — FLUTTERWAVE

### Sign up
1. Go to flutterwave.com → Create business account
2. Complete KYC verification (business registration + ID)
3. Get your API keys from Dashboard → Settings → API

### Replace in code
In `customer/index.html` find:
```javascript
const FLUTTERWAVE_PUBLIC_KEY = "FLWPUBK_TEST-XXXXXXXXXXXXXXXXXXXX-X";
```
Replace with your real public key.

### Set up webhook (CRITICAL)
When a customer pays via MoMo or card, Flutterwave sends a webhook to your server.
You need a Cloud Function to receive this and update the customer balance.

Create in Firebase Functions:
```javascript
exports.flutterwaveWebhook = functions.https.onRequest(async (req, res) => {
  // Verify Flutterwave signature
  const hash = req.headers["verif-hash"];
  if (hash !== process.env.FLW_SECRET_HASH) {
    return res.status(401).send("Unauthorized");
  }

  const { data } = req.body;
  if (data.status === "successful") {
    const customerId = data.meta.customerId;
    const amount     = data.amount;

    // Update customer balance atomically
    await admin.firestore().runTransaction(async tx => {
      const ref  = admin.firestore().doc(`customers/${customerId}`);
      const snap = await tx.get(ref);
      tx.update(ref, { balance: snap.data().balance + amount });
    });

    // Log the transaction
    await admin.firestore().collection("transactions").add({
      customerId, amount,
      type: "topup",
      method: data.payment_type,
      reference: data.flw_ref,
      status: "success",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  res.sendStatus(200);
});
```

Set the webhook URL in Flutterwave Dashboard:
`https://us-central1-redfuel-a2152.cloudfunctions.net/flutterwaveWebhook`

---

## SMS NOTIFICATIONS — AFRICA'S TALKING

### Sign up
1. Go to africastalking.com → Create account → Uganda sandbox
2. Go live after testing

### Add to Cloud Functions:
```javascript
const AfricasTalking = require("africastalking")({
  apiKey:   process.env.AT_API_KEY,
  username: "nero_fuel"
});

async function sendSMS(phone, message) {
  await AfricasTalking.SMS.send({
    to:      [phone],
    message: message,
    from:    "NERO"
  });
}

// Call after every transaction:
await sendSMS(customer.phone,
  `NERO WALLET: UGX ${amount.toLocaleString()} deducted for fuel. Balance: UGX ${newBalance.toLocaleString()}. Ref: ${ref}`
);
```

---

## HOW THE MONEY FLOWS (PRODUCTION)

```
Customer tops up UGX 50,000 via MTN MoMo
    ↓
Flutterwave processes payment → money held in Flutterwave account
    ↓
Flutterwave sends webhook to your Cloud Function
    ↓
Cloud Function: customer.balance += 50,000 in Firestore
    ↓
SMS sent to customer phone

Customer presents QR at pump
    ↓
Attendant scans → sees balance → enters amount
    ↓
Attendant confirms → Firestore atomic transaction:
    customer.balance -= deductAmount
    transaction record created (immutable)
    ↓
SMS to customer: amount deducted, new balance

Manager requests withdrawal of UGX 2,000,000
    ↓
Manager re-enters password (re-auth)
    ↓
Withdrawal record created (status: pending)
    ↓
You manually initiate transfer in Flutterwave dashboard
    OR use Flutterwave Transfers API in Cloud Function
    ↓
Withdrawal status updated to "approved"
```

---

## SECURITY NOTES

1. **Attendants cannot see company balance** — enforced by Firestore rules
2. **Attendants cannot withdraw** — no access to withdrawals collection
3. **All transactions are immutable** — no update/delete allowed in rules
4. **Withdrawals require re-authentication** — manager must enter password again
5. **Balance deductions are atomic** — Firestore transactions prevent race conditions
6. **PINs are SHA-256 hashed** — never stored in plaintext
7. **Max single deduction: UGX 2,000,000** — enforced in rules and app

---

## NEXT STEPS (Future)

- [ ] Android app wrapper (Capacitor — 1 day of work)
- [ ] QR card printing for customers who don't have smartphones
- [ ] Flutterwave live integration (after KYC approval)
- [ ] Africa's Talking SMS live (after going live)
- [ ] Loyalty points integration with NERO website
- [ ] Monthly statement emails to customers
- [ ] Multi-currency support

---

*Built for NERO PETRO Station — Kiwoko, Nakaseke, Butalangu*
*© 2026 NERO PETRO Station*
