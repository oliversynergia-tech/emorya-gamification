# xPortal Setup

This app now supports xPortal through WalletConnect, but it needs a WalletConnect Cloud project ID before the browser-side connect flow can work.

## What you need

- a WalletConnect Cloud account
- a WalletConnect Cloud project ID
- your local origin allowlisted in WalletConnect

## Step 1: Create a WalletConnect Cloud project

1. Open `https://dashboard.walletconnect.com`
2. Sign in or create an account
3. Create a new project
4. Copy the project ID

## Step 2: Allowlist your local origin

In the WalletConnect Dashboard project settings, add these origins while developing locally:

- `http://localhost:3000`
- `http://127.0.0.1:3000`

If you preview the app on another local port later, add that too.

## Step 3: Add the project ID to local env

Open:

- `.env.local`

Set:

```env
NEXT_PUBLIC_MULTIVERSX_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
```

## Step 4: Restart the dev server

Stop the dev server if it is running, then start it again:

```bash
cd "/Users/olivermills/Documents/Emorya Gamify/emorya-gamification"
npm run dev
```

## Step 5: Test xPortal

1. Open `http://localhost:3000/auth`
2. Sign in
3. Click `Connect with xPortal`
4. Scan the QR code with xPortal
5. Approve the connection
6. Approve the message signing request

If the project ID and allowlist are correct, the wallet should link automatically after signing.

## Current behavior

- challenge creation is backed by PostgreSQL
- signature verification uses the MultiversX SDK on the server
- the browser currently uses WalletConnect + QR flow for xPortal
- manual signature paste is still available as a fallback

## Troubleshooting

### Button is disabled

`NEXT_PUBLIC_MULTIVERSX_WALLETCONNECT_PROJECT_ID` is missing from `.env.local`.

### QR appears but connection fails

Most likely causes:

- the local origin is not allowlisted in WalletConnect Cloud
- the project ID is wrong
- xPortal rejected the connection request

### Signing succeeds but link fails

Most likely causes:

- a different wallet address was connected than the one challenged
- the wallet is already linked to another account
- the challenge expired before signing
