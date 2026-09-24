# ?? CRAFTCON 2K26 — Desh Bhagat University

> **The Official Event Registration & Gaming Tournament Portal**
> Faculty of Engineering, Technology and Computing | Desh Bhagat University

[![Deploy on Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/MohammadSakibAhmad0874/Desh-Bhagat-University-Craftcon-2k26)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![Razorpay](https://img.shields.io/badge/payment-Razorpay-blue.svg)

---

## ? Features

| Feature | Description |
|---|---|
| ?? **Multi-Event Registration** | Hackathon, Gaming Arena, Cultural & Technical Events |
| ?? **Razorpay Payments** | Automatic payment verification via Razorpay checkout |
| ?? **Google Sheets Sync** | All registrations auto-sync to Google Sheets in real-time |
| ?? **Gaming Wizard** | 6 gaming events — BGMI, Free Fire MAX, MLBB, Ludo, Chess, Carrom |
| ?? **Admin Dashboard** | Secure admin panel to view, verify, and manage registrations |
| ?? **Email Notifications** | Automated confirmation emails with booking IDs |
| ?? **Mobile Responsive** | Fully optimized for all screen sizes |

---

## ??? Project Structure

```
craftcon-2k26/
+-- index.html              # Main event registration portal (Hackathon + Tech Events)
+-- gaming.html             # Gaming tournament registration portal
+-- admin.html              # Admin dashboard (protected)
+-- main.js                 # Frontend logic — wizard, Razorpay, payment flow
+-- gaming.js               # Gaming events frontend logic
+-- gaming-wizard.js        # Step-by-step gaming registration wizard
+-- server.js               # Express API server — all backend routes
+-- db.js                   # Turso / libSQL database layer
+-- googleSheetsService.js  # Google Sheets integration service
+-- emailService.js         # Email notification service
+-- eventsRegistry.js       # Event definitions and fee registry
+-- code.gs                 # Google Apps Script (deploy separately in Google Sheets)
+-- style.css               # Main styles
+-- gaming.css              # Gaming portal styles
+-- .env.example            # Environment variable template
+-- vercel.json             # Vercel deployment configuration
+-- GOOGLE_SHEETS_SETUP.md  # Google Sheets setup guide
```

---

## ?? Quick Start (Local Development)

### 1. Clone the Repository
```bash
git clone https://github.com/MohammadSakibAhmad0874/Desh-Bhagat-University-Craftcon-2k26.git
cd Desh-Bhagat-University-Craftcon-2k26
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
```
Then edit `.env` with your actual credentials (see table below).

### 4. Start Development Server
```bash
npm run dev
```
Visit `http://localhost:3000`

---

## ?? Environment Variables

> ?? **NEVER commit your `.env` file or `rzp-key.csv` to any public repository.**

Create a `.env` file based on `.env.example`:

```env
# Server
PORT=3000
NODE_ENV=development

# Turso / libSQL (Production Database)
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token

# Razorpay Payment Gateway
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
RAZORPAY_TEST_MODE=false

# Email (optional)
EMAIL_PROVIDER=smtp
EMAIL_FROM=CRAFTCON 2K26 <no-reply@yourmail.com>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

| Variable | Required | Description |
|---|---|---|
| `RAZORPAY_KEY_ID` | ? | Your Razorpay Key ID (live/test) |
| `RAZORPAY_KEY_SECRET` | ? | Your Razorpay Key Secret |
| `TURSO_DATABASE_URL` | ? (prod) | Turso database URL for persistent storage |
| `TURSO_AUTH_TOKEN` | ? (prod) | Turso auth token |
| `RAZORPAY_WEBHOOK_SECRET` | ? | For webhook signature verification |
| `SMTP_*` | ? | Email credentials for notifications |

---

## ?? Razorpay Payment Integration

This project uses **Razorpay Checkout** for automatic payment collection and verification.

### How it works:
1. User fills out the registration form
2. A Razorpay order is created via `/api/payments/create-order`
3. The Razorpay checkout modal opens in the browser
4. On success, payment signature is verified server-side at `/api/payments/verify`
5. Registration is confirmed and synced to Google Sheets with `Payment Done = YES`

### API Endpoints:
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/payments/create-order` | Create Razorpay order |
| `POST` | `/api/payments/verify` | Verify & confirm payment |
| `POST` | `/api/register` | Submit registration |
| `GET` | `/api/registrations` | Get all registrations (admin) |
| `POST` | `/api/admin/verify-payment` | Manual payment verification (admin) |

---

## ?? Google Sheets Integration

All registration data is automatically synced to Google Sheets.

### Setup Google Sheets:
1. Open your Google Sheet
2. Go to **Extensions ? Apps Script**
3. Paste the contents of `code.gs`
4. Deploy as **Web App** (Execute as: Me, Access: Anyone)
5. Copy the Web App URL and add it to `googleSheetsService.js`

See [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) for full instructions.

---

## ?? Deploy to Vercel

### CLI Deploy
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Required Vercel Environment Variables
In the Vercel dashboard ? Project Settings ? Environment Variables, add:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `NODE_ENV=production`

> ?? Do **NOT** add the `.env` file — configure these manually in the Vercel dashboard.

---

## ?? Gaming Events

| Event | Format | Entry Fee | Prize Pool |
|---|---|---|---|
| BGMI Squad Royale | Squad (4) | ?200/squad | ?15,000 |
| Free Fire MAX | Squad (4) | ?200/squad | ?10,000 |
| Mobile Legends (MLBB) | 5v5 | ?250/squad | ?8,000 |
| Ludo King Championship | Solo | ?50/player | ?3,000 |
| Speed Chess Masters | Solo | ?50/player | ?4,000 |
| Carrom Strike Tourney | Solo | ?50/player | ?3,000 |

---

## ?? Admin Panel

Access the admin dashboard at `/admin`.

Features:
- View all registrations (hackathon + gaming)
- Filter by event, status, payment
- Manually verify payments (UTR/screenshot)
- Export data to CSV
- Sync individual records to Google Sheets

---

## ??? Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript |
| **Backend** | Node.js + Express.js |
| **Database** | Turso (libSQL / SQLite) |
| **Payments** | Razorpay |
| **Sheets Sync** | Google Sheets API (Apps Script) |
| **Email** | Nodemailer (SMTP / Gmail) |
| **Deployment** | Vercel (Serverless) |

---

## ?? License

MIT License — see [LICENSE](LICENSE) for details.

---

## ????? Developed By

**Desh Bhagat University**
Faculty of Engineering, Technology and Computing
CRAFTCON 2K26 Event Team
