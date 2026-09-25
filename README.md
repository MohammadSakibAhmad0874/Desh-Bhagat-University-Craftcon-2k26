# CRAFTCON 2K26 - Desh Bhagat University

> **The Official Event Registration & Gaming Tournament Portal**
> Faculty of Engineering, Technology and Computing | Desh Bhagat University

[![Netlify](https://img.shields.io/badge/Netlify-craftcon2k26--dbu--arena.netlify.app-brightgreen?style=for-the-badge&logo=netlify)](https://craftcon2k26-dbu-arena.netlify.app)
[![Vercel](https://img.shields.io/badge/Vercel-craftcon2k26--mu.vercel.app-black?style=for-the-badge&logo=vercel)](https://craftcon2k26-mu.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-MohammadSakibAhmad0874-black?style=for-the-badge&logo=github)](https://github.com/MohammadSakibAhmad0874/Desh-Bhagat-University-Craftcon-2k26)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Razorpay](https://img.shields.io/badge/payment-Razorpay-0050FF?style=for-the-badge&logo=razorpay)](https://razorpay.com)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

---

## Live Deployments

- **Vercel:** [https://craftcon2k26-mu.vercel.app](https://craftcon2k26-mu.vercel.app)
- **Netlify:** [https://craftcon2k26-dbu-arena.netlify.app](https://craftcon2k26-dbu-arena.netlify.app)

---

## Features

| Feature | Description |
|---|---|
| **Multi-Event Registration** | Hackathon, Gaming Arena, Cultural & Technical Events |
| **Razorpay Payments** | Automatic payment verification via Razorpay Checkout |
| **Google Sheets Sync** | All registrations auto-sync to Google Sheets in real-time |
| **Gaming Wizard** | 6 gaming events - BGMI, Free Fire MAX, MLBB, Ludo, Chess, Carrom |
| **Admin Dashboard** | Secure admin panel to view, verify, and manage registrations |
| **Email Notifications** | Automated confirmation emails with booking IDs |
| **Mobile Responsive** | Fully optimized for all screen sizes |
| **Live Counters** | Real-time participant counters on the home page |

---

## Project Structure

```
craftcon-2k26/
+-- index.html              # Main event registration portal
+-- gaming.html             # Gaming tournament registration portal
+-- admin.html              # Admin dashboard (protected)
+-- main.js                 # Frontend logic - wizard, Razorpay, payment flow
+-- gaming.js               # Gaming events frontend logic
+-- gaming-wizard.js        # Step-by-step gaming registration wizard
+-- server.js               # Express API server - all backend routes
+-- db.js                   # Turso / libSQL database layer
+-- googleSheetsService.js  # Google Sheets integration service
+-- emailService.js         # Email notification service
+-- eventsRegistry.js       # Event definitions and fee registry
+-- code.gs                 # Google Apps Script (deploy separately in Google Sheets)
+-- style.css               # Main styles
+-- gaming.css              # Gaming portal styles
+-- .env.example            # Environment variable template
+-- netlify.toml            # Netlify deployment configuration
+-- vercel.json             # Vercel deployment configuration
+-- GOOGLE_SHEETS_SETUP.md  # Google Sheets setup guide
```

---

## Quick Start - Local Development

### 1. Clone the Repository
`ash
git clone https://github.com/MohammadSakibAhmad0874/Desh-Bhagat-University-Craftcon-2k26.git
cd Desh-Bhagat-University-Craftcon-2k26
`

### 2. Install Dependencies
`ash
npm install
`

### 3. Configure Environment Variables
`ash
cp .env.example .env
`

Edit .env with your actual credentials.

### 4. Start Development Server
`ash
npm run dev
`

Visit http://localhost:3000

---

## Environment Variables

> **NEVER commit your .env file or zp-key.csv to any public repository.**

| Variable | Required | Description |
|---|---|---|
| RAZORPAY_KEY_ID | Yes | Your Razorpay Key ID (live/test) |
| RAZORPAY_KEY_SECRET | Yes | Your Razorpay Key Secret |
| TURSO_DATABASE_URL | Yes (prod) | Turso database URL for persistent storage |
| TURSO_AUTH_TOKEN | Yes (prod) | Turso auth token |
| RAZORPAY_WEBHOOK_SECRET | Yes | For webhook signature verification |
| GOOGLE_APPS_SCRIPT_URL | Yes | Google Apps Script Web App URL |
| SMTP_* | Optional | Email credentials for notifications |

---

## Razorpay Payment Integration

This project uses **Razorpay Checkout** for automatic payment collection and verification.

### How it works:
1. User fills out the registration form
2. A Razorpay order is created via /api/payments/create-order
3. The Razorpay checkout modal opens in the browser
4. On success, payment signature is verified server-side at /api/payments/verify
5. Registration is confirmed and synced to Google Sheets with Payment Done = YES

### API Endpoints:
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/payments/create-order | Create Razorpay order |
| POST | /api/payments/verify | Verify & confirm payment |
| POST | /api/register | Submit registration |
| GET | /api/registrations | Get all registrations (admin) |
| POST | /api/admin/verify-payment | Manual payment verification (admin) |

---

## Google Sheets Integration

All registration data is automatically synced to Google Sheets.

### Setup:
1. Open your Google Sheet
2. Go to **Extensions > Apps Script**
3. Paste the contents of code.gs
4. Deploy as **Web App** (Execute as: Me, Access: Anyone)
5. Copy the Web App URL and add it to .env as GOOGLE_APPS_SCRIPT_URL

---

## Deploy to Netlify

Live at: **[https://craftcon2k26-dbu-arena.netlify.app](https://craftcon2k26-dbu-arena.netlify.app)**

### Deploy via CLI
`ash
npm install -g netlify-cli
netlify login
netlify deploy --prod
`

### Required Netlify Environment Variables
In the Netlify dashboard > Site Settings > Environment Variables, add:

- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- RAZORPAY_WEBHOOK_SECRET
- TURSO_DATABASE_URL
- TURSO_AUTH_TOKEN
- GOOGLE_APPS_SCRIPT_URL
- NODE_ENV=production

---

## Gaming Events

| Event | Format | Entry Fee | Prize Pool |
|---|---|---|---|
| BGMI Squad Royale | Squad (4) | Rs. 200/squad | Rs. 15,000 |
| Free Fire MAX | Squad (4) | Rs. 200/squad | Rs. 10,000 |
| Mobile Legends (MLBB) | 5v5 | Rs. 250/squad | Rs. 8,000 |
| Ludo King Championship | Solo | Rs. 50/player | Rs. 3,000 |
| Speed Chess Masters | Solo | Rs. 50/player | Rs. 4,000 |
| Carrom Strike Tourney | Solo | Rs. 50/player | Rs. 3,000 |

---

## Admin Panel

Access the admin dashboard at /admin.

Features:
- View all registrations (hackathon + gaming)
- Filter by event, status, payment
- Manually verify payments (UTR/screenshot)
- Export data to CSV
- Sync individual records to Google Sheets

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript |
| **Backend** | Node.js + Express.js |
| **Database** | Turso (libSQL / SQLite) |
| **Payments** | Razorpay |
| **Sheets Sync** | Google Sheets API (Apps Script) |
| **Email** | Nodemailer (SMTP / Gmail) |
| **Deployment** | Netlify |

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Developed By

**Desh Bhagat University**  
Faculty of Engineering, Technology and Computing  
CRAFTCON 2K26 Event Team

*For queries, contact the CRAFTCON 2K26 organizing team.*
