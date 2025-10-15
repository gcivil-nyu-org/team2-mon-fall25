# 🧩 CollabDesk Frontend – Local Development Setup

This guide walks you through running the **CollabDesk Frontend** locally for development and testing.  
The project uses **React + TypeScript + Vite + TailwindCSS v4**.

---

## ⚙️ 1️⃣ Requirements

| Tool | Recommended Version | Notes |
|------|---------------------|--------|
| **Node.js** | 20.x or 22.x (LTS) | Use `nvm install --lts` |
| **pnpm** | ≥10 | Preferred over npm |
| **Git** | Latest | For branching & commits |

### Quick install
```bash
nvm install --lts
nvm use --lts
corepack enable
corepack prepare pnpm@10 --activate
```

---

## 📦 2️⃣ Clone & Install Dependencies

```bash
git clone https://github.com/<your-org>/<your-repo>.git
cd <your-repo>
git checkout dev
pnpm install
```

> **Note:**  
> The app lives in the repo root (`collabdesk/`).  
> Make sure you’re in that folder before running commands.

---

## 💻 3️⃣ Start the Development Server

```bash
pnpm dev
```

This launches the Vite dev server at:

👉 **http://localhost:5173**

If that port’s already in use, Vite automatically chooses another and shows it in the console.

---

## 🏗️ 4️⃣ Build & Preview (Optional)

Generate a production build:
```bash
pnpm build
```

Preview the built app locally:
```bash
pnpm preview
```

---

## 🧭 5️⃣ Project Overview

- **Tech Stack**
  - React + TypeScript
  - TailwindCSS v4
  - Vite (build + dev server)
  - date-fns (time utilities)
  - localStorage (data persistence)

- **Key Features**
  - Weekly calendar view (Sun → Sat)
  - Add meetings via *Smart Schedule*
  - Block unavailability time slots
  - Delete events from the grid or Agenda panel
  - Light/dark mode toggle
  - Local data persistence per workspace

---

## 🗄️ 6️⃣ Data Persistence

The app stores events locally using **browser `localStorage`**.

Each workspace maintains its own key structure:
```json
{
  "cd.workspace": "product",
  "cd.events.product": [
    {
      "id": "uuid",
      "title": "Sprint Planning",
      "startISO": "2025-10-10T09:00:00Z",
      "endISO": "2025-10-10T12:00:00Z",
      "kind": "meeting"
    }
  ]
}
```

Data persists through refreshes but is not synced to any backend yet.

---

## 🧩 7️⃣ Common Issues & Fixes

**Problem:** `pnpm: command not found`  
→ Run:
```bash
corepack enable
corepack prepare pnpm@10 --activate
```

**Problem:** `Unknown at rule @custom-variant` in VS Code  
→ Tailwind v4 syntax; ignore or set  
`"css.lint.unknownAtRules": "ignore"` in VS Code settings.

**Problem:** Blank page / module error  
→ Check terminal logs or browser console. Fix missing imports or typos, then re-run `pnpm dev`.

---

## 🌿 8️⃣ Branch Workflow

1. Pull latest `dev`
   ```bash
   git checkout dev
   git pull
   ```
2. Create a feature branch
   ```bash
   git checkout -b feat/<short-topic>
   ```
3. Commit & push
   ```bash
   git add .
   git commit -m "feat: short description"
   git push -u origin feat/<short-topic>
   ```
4. Open a PR → `dev` branch.

---

## 🧭 9️⃣ Typical User Flow (Demo)

1. Open **Calendar** from the sidebar  
2. Click **+ Add** → choose:
   - *Smart Schedule* – add meeting with suggested slots  
   - *Schedule Unavailability* – block OOO/focus time  
3. Event appears in grid + right Agenda  
4. Click an event or 🗑️ icon → confirm delete  

✅ The calendar currently shows **only your own events** — no team sync yet.

---

## 🆘 10️⃣ Need Help?

Ping the **Product Team** or tag **@calendar-owners** on Slack/GitHub.  
Attach terminal output or screenshots for faster debugging.

---

### ✅ TL;DR

```bash
git clone https://github.com/<your-org>/<your-repo>.git
cd <your-repo>
git checkout dev
pnpm install
pnpm dev
```

Visit → [http://localhost:5173](http://localhost:5173)  
🎉 You’re live!
