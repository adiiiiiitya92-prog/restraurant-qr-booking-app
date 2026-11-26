# ☕ Junio 8 Café - QR Code Menu & Table Ordering PWA

A modern, serverless, real-time Progressive Web App (PWA) for restaurant table ordering built with **React (Vite) + Tailwind CSS + Firebase Firestore & Auth**, designed for static deployment on **Netlify**.

---

## 🌟 Key Features

### 1. 📱 Customer Table Ordering (`/order/:tableId`)
- **Zero Login Required**: Guests scan the table QR code with their mobile camera and immediately access the menu.
- **Categorized Menu & Filters**: Sticky category tabs (Starters, Main Course, Pizza & Burgers, Beverages, Desserts), instant search, and Veg-only filter.
- **Interactive Cart & Special Notes**: Add dishes with custom cooking instructions (e.g., *"Less spicy"*, *"No onions"*).
- **Anti-Spam Rate Limiting**: 5-second submission lock to prevent duplicate orders.
- **Live Status Tracker (`/order/:tableId/status/:orderId`)**: Real-time Firestore `onSnapshot` tracking (`Pending` ➔ `Preparing` ➔ `Ready` ➔ `Served`) with human-friendly order IDs like `#T3-014`.
- **"Call Waiter" Button**: Instant assistance alerts for water refills, cutlery, or check requests.

### 2. 👨‍🍳 Kitchen Live Display System (`/kitchen`)
- **Real-Time KDS**: Auto-syncs new orders in real-time.
- **Audible & Visual Chimes**: Synthesized Web Audio alert chime when new orders arrive (works 100% offline).
- **Urgency Color Indicators**: Elapsed time counter turns yellow at 10 mins and pulsating red at 20 mins.
- **One-Click Workflow**: Advance orders from `Pending` ➔ `Preparing` ➔ `Ready` ➔ `Served`.
- **Print KOT (Kitchen Order Ticket)**: Integrated 80mm thermal receipt printer view via browser print.
- **Active Waiter Calls Banner**: Promptly attend to table requests.

### 3. 🛡️ Admin Dashboard (`/admin`)
- **Analytics Overview**: Today's revenue, order volume, active tables, and top-selling dishes.
- **Table & QR Code Manager (`/admin/tables`)**: Add dining tables, toggle active/inactive status, download high-resolution QR codes as PNG, and print tabletop standee sheets.
- **Menu CRUD (`/admin/menu`)**: Add/edit dishes, manage prices, upload photos to Firebase Storage, and toggle instant "Sold Out" availability.
- **Full Order History (`/admin/orders`)**: Filter by date, table number, and status with detailed receipt modals.

### 4. ⚡ Progressive Web App (PWA)
- Installable on mobile devices with standalone display mode.
- Offline shell caching via `vite-plugin-pwa`.

---

## 🏗️ Tech Stack

- **Frontend**: React 18, Vite, React Router v6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **QR Generation**: `qrcode.react`
- **Celebration Effects**: `canvas-confetti`
- **Backend & Database**: Firebase Firestore (Real-time NoSQL)
- **Authentication**: Firebase Authentication (Email/Password)
- **Storage**: Firebase Storage (Menu item images)
- **Deployment**: Netlify (Pure static SPA build — 100% serverless)

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```

Fill in your Firebase credentials in `.env`:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Optional Branding
VITE_RESTAURANT_CURRENCY="₹"
VITE_RESTAURANT_TAX_PERCENT=5
```

> **Note on Demo Mode:** If you haven't linked Firebase credentials yet, the app will automatically run in **Reactive Demo Mode** using local storage so you can test all customer, kitchen, and admin workflows immediately!

### 3. Start Local Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔥 Firebase Setup Guide

### 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/) and click **Add Project**.
2. Name your project (e.g. `junio8-cafe`).
3. Click **Add App** ➔ Select **Web (`</>`)** ➔ Register your app.
4. Copy the `firebaseConfig` keys into your `.env` file.

### 2. Enable Authentication
1. In Firebase Console, navigate to **Build ➔ Authentication** ➔ **Get Started**.
2. In the **Sign-in method** tab, enable **Email/Password**.
3. Pre-configured staff accounts (auto-provisioned or created manually):
   - **Admin Account**: `admin@junio8.com` | `Password@123`
   - **Kitchen Account**: `kitchen@junio8.com` | `Password@123`
   - **Waiter Account**: `waiter@junio8.com` | `Password@123`

### 3. Enable Cloud Firestore
1. Navigate to **Build ➔ Firestore Database** ➔ **Create Database**.
2. Start in **Production Mode** and select your closest cloud region.

### 4. Enable Firebase Storage (Optional for photo uploads)
1. Navigate to **Build ➔ Storage** ➔ **Get Started**.

### 5. Deploy Firestore Security Rules
Install Firebase CLI globally (if not already installed):
```bash
npm install -g firebase-tools
```

Login to Firebase and select your project:
```bash
firebase login
firebase use --add
```

Deploy the security rules and indexes directly from this repository:
```bash
firebase deploy --only firestore:rules
```

---

## 🔒 Firestore Security Rules Overview

The included `firestore.rules` file enforces zero-backend security:
- **`orders`**: Unauthenticated guests can create orders (`status == 'pending'`). Guests can read their specific order by ID (`/order/:tableId/status/:orderId`). Listing all orders and updating statuses is restricted strictly to authenticated staff (`admin` or `kitchen`).
- **`menuItems` & `tables`**: Public read for customer menu browsing; write access is restricted strictly to `admin`.
- **`waiterCalls`**: Public creation by table; read/resolve restricted to staff.
- **`staff`**: Readable by authenticated staff, writable only by `admin`.

---

## 🌐 Deploying to Netlify

This project is configured as a static Single-Page Application (SPA) with zero server functions needed.

### Method 1: Netlify Git Continuous Deployment (Recommended)
1. Push your repository to GitHub / GitLab / Bitbucket.
2. Log in to [Netlify](https://app.netlify.com/) and click **Add new site ➔ Import an existing project**.
3. Select your repository. Netlify will auto-detect the build settings from `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Go to **Site settings ➔ Environment variables** and add your `VITE_FIREBASE_*` variables.
5. Click **Deploy Site**.

### Method 2: Manual Netlify CLI Deployment
```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

---

## 📱 Routes & Panels

| Route | Description | Access |
| :--- | :--- | :--- |
| `/` | Landing page & interactive table QR simulation | Public |
| `/order/:tableId` | Customer digital menu pre-bound to table | Public (No Login) |
| `/order/:tableId/cart` | Cart review, item notes, & place order | Public (No Login) |
| `/order/:tableId/status/:orderId` | Live order timeline & "Call Waiter" | Public (No Login) |
| `/login` | Staff & Admin login portal | Public |
| `/kitchen` | Kitchen Live Display System (KDS) & audio alerts | Staff / Admin |
| `/admin` | Real-time analytics, revenue, & order volume | Admin |
| `/admin/tables` | Table management & downloadable QR codes | Admin |
| `/admin/menu` | Menu CRUD, prices, & availability toggles | Admin |
| `/admin/orders` | Full order ledger & receipt viewer | Admin |

---

## 📄 License
MIT License. Built for seamless restaurant operations.
