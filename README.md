# ApplyRadar 🎯

> Track every job application across Naukri, LinkedIn, and Internshala — all in one place.

A Chrome extension that lets Indian job seekers save listings with one click and manage their entire hunt on a clean Kanban dashboard. No spreadsheets. No forgotten applications.

![ApplyRadar Dashboard](docs/dashboard-screenshot.png)

---

## ✨ Features

- **One-click save** on Naukri, LinkedIn, and Internshala job detail pages
- **Kanban board** — drag cards between Saved → Applied → Interview → Offer → Rejected
- **Popup save** — save from the extension popup even if the page button isn't visible
- **Duplicate detection** — flags the same role appearing across multiple platforms
- **Already-saved state** — button turns green on pages you've already tracked
- **Light & dark mode** — toggle in the dashboard, preference saved
- **CSV export** — download all applications as a spreadsheet
- **Notes per application** — add interview feedback, follow-up dates, anything

---

## 📸 Screenshots

### Dashboard — Kanban view
![Dashboard Kanban](docs/dashboard-screenshot.png)

### Save button on Naukri
![Naukri save button](docs/naukri-save.png)

### Extension popup with quick save
![Popup](docs/popup-screenshot.png)

### Save button on Internshala
![Internshala save button](docs/internshala-save.png)

---

## 🚀 Installation

This is an unpacked Chrome extension — no build step, no npm install.

### Step 1 — Download

Clone or download this repo:

```bash
git clone https://github.com/nikhil-thomas-a/applyradar.git
```

### Step 2 — Load into Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `applyradar-v2` folder — the one that has `manifest.json` directly inside it
5. ApplyRadar will appear in your extensions list

### Step 3 — Pin the extension

Click the puzzle icon 🧩 in Chrome's toolbar → find ApplyRadar → click the pin icon.

### Step 4 — Enable site access

Click **Details** on the ApplyRadar card in `chrome://extensions`, then turn on the toggle for all three sites:
- `https://internshala.com/*`
- `https://www.linkedin.com/*`
- `https://www.naukri.com/*`

---

## 📖 How to Use

### Saving a job

The **Save to ApplyRadar** button appears automatically on job detail pages. Here's how to get to the detail page on each platform:

#### Naukri
1. Search for jobs on Naukri as normal
2. Click any job listing — it opens a detail view on the right panel
3. **Click the job title** to open it as a full page (the URL will change to something like `naukri.com/job-listings-...`)
4. The **Save to ApplyRadar** button appears below the job title

> Alternatively: right-click any listing in the search results → **Open in new tab**

#### LinkedIn
1. Go to `linkedin.com/jobs` and search for roles
2. Click any listing in the left panel — the details load on the right
3. **Click the job title text** (it's a link) to open the full detail page
4. The URL must contain `/jobs/view/` followed by a number — e.g. `linkedin.com/jobs/view/4361498042`
5. Once on that URL, the **Save to ApplyRadar** button appears next to the Easy Apply button

> If the button doesn't appear: click the **ApplyRadar icon** in your toolbar → the popup shows a **"Save this job"** button that works directly from the popup

#### Internshala
1. Search for internships or jobs on Internshala
2. Click any listing — it opens a detail page with the URL `internshala.com/internship/detail/...`
3. The **Save to ApplyRadar** button appears at the top of the page, above "Actively hiring"

---

### Opening the dashboard

Click the **ApplyRadar icon** in your Chrome toolbar → click **Open Dashboard**.

The dashboard opens in a new tab showing your full Kanban board.

---

### Moving a job between stages

**Option 1 — Drag and drop:** Grab any card and drag it to a different column. The column highlights as you hover over it.

**Option 2 — Detail drawer:** Click any card → a drawer opens on the right → change the **Status** dropdown → click **Save changes**.

---

### Updating notes

Click any card → the drawer opens → type in the **Notes** field → click **Save changes**. Good for storing interview feedback, recruiter names, follow-up dates.

---

## 📁 Project Structure

```
applyradar-v2/
├── manifest.json              # Chrome extension config (Manifest V3)
├── background.js              # Service worker: storage, duplicate detection
├── content/
│   ├── shared.js              # Injected save button + already-saved check
│   ├── naukri.js              # Naukri page detector and job extractor
│   ├── linkedin.js            # LinkedIn page detector and job extractor
│   └── internshala.js         # Internshala page detector and job extractor
├── popup/
│   ├── popup.html             # Toolbar popup UI
│   └── popup.js               # Stats, quick-save, tab detection
├── dashboard/
│   ├── index.html             # Full dashboard UI
│   └── dashboard.js           # Kanban, filters, drawer, drag-drop, export
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🔧 How It Works

### Saving a job
When you click **Save to ApplyRadar**, the content script reads the visible page DOM and sends the job data to the background service worker via `chrome.runtime.sendMessage`. The service worker writes it to `chrome.storage.local`.

### Duplicate detection
On every save, the background script checks if any existing job has the same **title + company** (case-insensitive). If yes, it blocks the save and returns a duplicate warning. Jobs already tracked show an orange **⚠ Duplicate** badge on the Kanban card.

### Already-saved state
When you navigate to a job page, the content script checks `chrome.storage.local` against the current URL before rendering the button. If the job is already saved, it shows a green **✓ Saved to ApplyRadar** button instead — clicking it opens the dashboard.

### LinkedIn title extraction
LinkedIn renders the job title as a `<p>` element containing a `#verified-medium` SVG badge. The content script locates the SVG by its stable ID, walks up to the parent `<p>`, and extracts direct text nodes — ignoring the SVG and badge children. Company is found via `a[href*="/company/"]` scoped to the main content area.

### Popup save (fallback)
If the page button fails to appear, opening the popup on a supported job page shows a **Save this job** button. This runs `chrome.scripting.executeScript` to inject an extraction function directly into the live tab — bypassing any timing or rendering issues.

---

## ⚠️ Known Limitations

| Limitation | Reason |
|---|---|
| Only works on job **detail** pages | The extension needs a single job's data — listing/search pages show 20+ jobs simultaneously |
| LinkedIn requires `/jobs/view/` URL | Only the full detail page (not the split-panel view) has the complete job card |
| Salary not always captured on LinkedIn | LinkedIn doesn't consistently show salary in the DOM |
| Chrome only | Manifest V3 with `scripting` API — Firefox support would need a separate build |

---

## 🗺 Roadmap

- [ ] ATS resume scorer — compare job description keywords against your resume
- [ ] Resume templates page — curated ATS-friendly templates for Indian recruiters
- [ ] Follow-up date reminders with browser notifications
- [ ] Job recommendation feed based on your saved roles
- [ ] Notes sync to cloud (Supabase)
- [ ] Firefox support

---

## 🤝 Contributing

Issues and PRs welcome. If a selector breaks (job platforms update their DOM regularly), open an issue with the page HTML and the broken selector — fixes are usually a one-liner.

---

## 📄 License

MIT — free to use, modify, and distribute.
