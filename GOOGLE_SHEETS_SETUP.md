# 📊 CRAFTCON '26 — GOOGLE SHEETS AUTOMATIC SYNC SETUP

All Hackathon and Gaming registrations are connected to your Google Spreadsheet:
🔗 **Target Spreadsheet:** [https://docs.google.com/spreadsheets/d/1aygA4U5Lcre_3thSZ-Snn26pkjlKHNyUw5SijtwoYCA/edit](https://docs.google.com/spreadsheets/d/1aygA4U5Lcre_3thSZ-Snn26pkjlKHNyUw5SijtwoYCA/edit)

---

## 🚀 30-Second Quick Setup (No Google Cloud / API Keys Needed!)

We have prepared a ready-to-use Google Apps Script file: [`code.gs`](file:///c:/Users/Ghosty/Desktop/Game&2027/new-main/code.gs).

Follow these 4 simple steps to connect:

1. **Open your Google Sheet:**
   👉 [Click to open spreadsheet](https://docs.google.com/spreadsheets/d/1aygA4U5Lcre_3thSZ-Snn26pkjlKHNyUw5SijtwoYCA/edit)
2. **Open Apps Script Editor:**
   - In Google Sheets top menu, click **Extensions** -> **Apps Script**.
3. **Paste the Script:**
   - Delete any default code in `Code.gs`.
   - Copy the entire contents of [`code.gs`](file:///c:/Users/Ghosty/Desktop/Game&2027/new-main/code.gs) and paste it into the editor.
   - Click the 💾 **Save** icon.
4. **Deploy as Web App:**
   - Click the blue **Deploy** button (top right) -> **New deployment**.
   - Click the gear icon ⚙️ next to "Select type" and choose **Web app**.
   - Set:
     - **Description:** `CRAFTCON 2026 Sync`
     - **Execute as:** `Me (your email)`
     - **Who has access:** `Anyone` *(Crucial so the website can submit registration rows)*
   - Click **Deploy** and grant permissions if prompted.
   - Copy the generated **Web App URL** (looks like `https://script.google.com/macros/s/AKfycb.../exec`).
5. **Paste into `.env`:**
   - In `new-main/.env`, set:
     ```env
     GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
     ```
   - Done! Every Hackathon squad and Gaming team registration will instantly append as a row in the Google Sheet.

---

## 📑 Automatically Created Worksheets & Columns

The script will automatically format and maintain two sheets:

### 1. `Hackathon_Registrations`
- Registration ID (e.g. `HACK-0001`)
- Timestamp
- Category (`HACKATHON`)
- Biome / Track (AI & Agents, Overworld, Redstone Lab, Deep Dark, Nether, Sandbox)
- Squad Name & Squad Size (1–4)
- Leader Name, Email, Phone, College / University
- Member 2, Member 3, Member 4
- Project Concept Brief & Portfolio URL
- Entry Fee (`FREE`)

### 2. `Gaming_Registrations`
- Registration ID (e.g. `GAME-0001`)
- Timestamp
- Category (`GAMING`)
- Game Arena (BGMI, Free Fire MAX, MLBB, Ludo, Chess, Carrom)
- Registration Type (`SQUAD` / `SOLO`)
- Team Name & College
- Captain Name, Email, Phone, In-Game IGN/UID
- Player 2, Player 3, Player 4, Player 5 (Names & IGNs)
- Total Players & Total Fee (INR)
- UTR / Transaction ID & Payment Status (`VERIFIED` / `SUBMITTED`)
