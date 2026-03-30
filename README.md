# 🎯 ApplyRadar

> Track job applications across Naukri, LinkedIn, and Internshala — all in one place.

A Chrome extension + dashboard that lets Indian job seekers save listings with one click, track application status on a Kanban board, and automatically detect duplicate listings across platforms.

---

## ✨ Features

- **One-click save** on Naukri, LinkedIn, and Internshala job pages
- **Kanban board** — Saved → Applied → Interview → Offer → Rejected
- **Duplicate detection** — flags when the same role appears on multiple platforms
- **Detail drawer** — add notes, update status, open original listing
- **CSV export** — download all your applications as a spreadsheet
- **Real-time sync** — extension and dashboard update instantly

---

## 🚀 Installing the Extension (No Build Required)

This is an unpacked Chrome extension — no npm install, no build step. Just load the folder directly into Chrome.

### Step 1 — Download the code

Clone or download this repo. You need the `extension/` folder on your computer.

```
applyradar/
├── extension/      ← this is what you load into Chrome
│   ├── manifest.json
│   ├── background.js
│   ├── content/
│   ├── popup/
│   └── icons/
└── dashboard/      ← opened automatically by the extension
```

### Step 2 — Add placeholder icons

Chrome requires icon files to load an extension. Create simple placeholder PNGs named:
- `extension/icons/icon16.png`
- `extension/icons/icon48.png`
- `extension/icons/icon128.png`

**Quickest way:** Download any 128×128 PNG image, resize copies to 16px and 48px, and save them with those names. Or use any online favicon generator.

> We haven't included icons in the repo to keep it clean — you can add a proper logo later.

### Step 3 — Load into Chrome

1. Open Chrome and go to `chrome://extensions`
2. Turn on **Developer mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select the `extension/` folder from this repo
5. You should see **ApplyRadar** appear in your extensions list

### Step 4 — Pin the extension

Click the puzzle icon 🧩 in Chrome's toolbar → find ApplyRadar → click the pin icon. The ApplyRadar icon will now appear in your toolbar.

---

## 📖 How to Use

### Saving a job

1. Go to any job listing on **Naukri**, **LinkedIn**, or **Internshala**
2. A **"Save to ApplyRadar"** button will appear on the page (near the job title)
3. Click it — the job is instantly saved

### Opening the dashboard

Click the ApplyRadar icon in your toolbar → click **"Open Dashboard"**

The dashboard opens in a new tab and shows:
- Your Kanban board with all saved jobs
- Sidebar filters by status and platform
- Stats (total saved, applied, interviews, offers)
- Duplicate warning badge if the same role appears on multiple platforms

### Updating a job's status

Click any card in the Kanban → a drawer opens on the right → change the status dropdown → click **Save changes**

### Exporting your data

Click **Export CSV** in the top-right of the dashboard to download all applications as a spreadsheet.

---

## 🗂 Project Structure

```
extension/
├── manifest.json           # Chrome extension config
├── background.js           # Service worker: storage, dedup logic
├── content/
│   ├── shared.js           # Injected button + save utilities
│   ├── naukri.js           # Naukri page detector + job extractor
│   ├── linkedin.js         # LinkedIn page detector + job extractor
│   └── internshala.js      # Internshala page detector + job extractor
└── popup/
    ├── popup.html          # Toolbar popup UI
    └── popup.js            # Popup stats loader

dashboard/
├── index.html              # Full dashboard UI
└── dashboard.js            # Kanban, filters, drawer, export
```

---

## 🔧 How Duplicate Detection Works

When a job is saved, the background script checks if any existing saved job has the **same title AND same company** (case-insensitive). If yes, it blocks the save and shows a warning.

Jobs that were already saved before duplicates were detected are flagged with an orange **"⚠ Duplicate"** badge on their Kanban card.

---

## 🗺 Roadmap

- [ ] ATS resume scorer (compare JD keywords vs your resume)
- [ ] Resume templates page (curated ATS-friendly templates for Indian recruiters)
- [ ] Job recommendation feed (based on saved roles)
- [ ] Follow-up date reminders
- [ ] Notes synced to cloud (Supabase)
- [ ] Firefox support

---

## 📄 License

MIT
