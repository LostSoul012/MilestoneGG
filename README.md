<div align="center">

# MILESTONE**GG**

### Track your game progression across every title

*Bosses · Story · Collectibles · DLC · 100% Completion*

---

</div>

MilestoneGG is a personal game progression tracker built for players who want to track everything — not just achievements, but every boss, story beat, side quest, collectible, and DLC mission across every game they play. Add games, organise milestones into categories, tick them off as you go, and watch your progress bars fill up.

Built with React and Supabase. Hosted free on GitHub Pages.

---

## Features

**For Users**
- Browse available games and add them to your personal sidebar
- Organise milestones by category — collapse and expand sections freely
- Search missions in real time with text highlighting
- Progress bars per game and per category, synced live to the database
- Session persists across page refreshes — log in from any browser with your code
- Installable as a PWA — add to your phone home screen for a native feel

**For Admin**
- Full game management — add, edit, delete, show/hide games
- Upload game icons directly from the admin panel — stored in Supabase Storage, no manual file commits needed
- Upload games in bulk via JSON file
- Export any game back to JSON for backup or sharing
- Drag to reorder categories and missions
- Add notes to individual missions — hints or context shown to users
- Per-game custom CSS — write styles that apply only when that game is active
- Generate 4-character access codes for users, with editable notes per code

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 |
| Database | Supabase (PostgreSQL) |
| File Storage | Supabase Storage |
| Hosting | GitHub Pages |
| Auth | Custom 4-character codes |
| Deployment | GitHub Actions |

---

## Project Structure

```
src/
├── lib/
│   ├── supabase.js               # Supabase client
│   ├── auth.js                   # Auth context + session management
│   └── toast.js                  # Notification system
├── pages/
│   ├── Login.js / .css           # Login screen (code entry + admin access)
│   ├── Admin.js / .css           # Admin panel
│   └── Dashboard.js / .css       # User dashboard
├── components/
│   ├── GameChecklist.js / .css   # Main checklist view with search + collapse
│   ├── CategoryMissionEditor.js  # Admin drag-to-reorder editor
│   ├── GameFormModal.js          # Add/edit game modal with icon upload + CSS tab
│   ├── JsonUploadModal.js        # Bulk JSON import
│   ├── UserManager.js            # Generate + manage user codes
│   └── ErrorBoundary.js          # Crash recovery
└── styles/
    └── global.css                # Design system + responsive breakpoints
```

---

## Setup Guide

### 1. Supabase

1. Create a free account at [supabase.com](https://supabase.com) — no credit card required
2. Create a new project
3. Go to **SQL Editor** and run the entire contents of `supabase_setup.sql` — this creates all tables, indexes, grants, and the icon storage bucket in one go
4. Go to **Project Settings → API** and copy your **Project URL** and **anon public key**

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
REACT_APP_ADMIN_SECRET=anything-you-want
```

The admin secret is your personal password for the admin panel. Choose anything — it never touches the database.

### 3. Run Locally

```bash
npm install
npm start
```

Visit `http://localhost:3000`. Click **Admin Access** at the bottom of the login screen and enter your admin secret.

### 4. Deploy to GitHub Pages

**Add secrets to GitHub:**

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**

Add these three — exact names matter:

| Secret | Value |
|---|---|
| `REACT_APP_SUPABASE_URL` | Your Supabase project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `REACT_APP_ADMIN_SECRET` | Your chosen admin secret |

**Enable GitHub Pages:**

Repo → **Settings → Pages → Source → GitHub Actions**

**Push your files to GitHub.** The deploy workflow at `.github/workflows/deploy.yml` runs automatically on every push to `main`.

Your site will be live at:
```
https://YOUR-USERNAME.github.io/milestonegg
```

---

## Game Icons

Icons are uploaded directly from the admin panel and stored in Supabase Storage — no manual file commits needed.

- Click **⬆ Upload Image** in the game form to pick a file from your computer
- Supported formats: PNG, JPG, WebP, GIF, SVG — max 2 MB
- Recommended size: 256×256px square with transparency
- Best source: [SteamGridDB](https://www.steamgriddb.com) → search your game → Icons tab → download PNG
- You can also paste any public image URL directly into the URL field as a fallback

---

## JSON Import Format

Upload games in bulk from the admin panel using this format:

```json
{
  "name": "Fallout 4",
  "icon": "https://your-project.supabase.co/storage/v1/object/public/game-icons/fallout4.png",
  "color": "#4ade80",
  "description": "Post-apocalyptic RPG set in the Commonwealth.",
  "categories": [
    {
      "name": "Main Quest",
      "missions": [
        { "text": "War Never Changes" },
        { "text": "Out of Time" },
        { "text": "Find Shaun", "note": "Main objective of the entire game" }
      ]
    }
  ]
}
```

Missions can be plain strings or objects with an optional `note` field. The Export JSON button in the admin editor always produces a file in this exact format.

---

## Admin Panel

Access the admin panel by clicking **Admin Access** on the login screen and entering your admin secret. The admin panel has two tabs:

**Games tab**
- Add games manually or upload a JSON file
- Click any game to open the category and mission editor on the right
- Drag the ⠿ handle to reorder categories or missions
- Use the ✎ edit button to open the game form — upload an icon and customise the theme from here
- Toggle visibility with 👁 to show or hide games from users without deleting them
- Export any game back to JSON with the ⬇ Export JSON button

**Users tab**
- Generate 4-character codes (uppercase letters + numbers, no ambiguous characters)
- Add a note to each code so you remember who it belongs to
- Delete a user to revoke their access and remove all their progress

---

## User Flow

1. Enter your 4-character code on the login screen
2. Go to **Browse** to see all available games — click **+ Add** to add one to your list
3. Select a game from **My Games** in the sidebar
4. Check off milestones as you complete them — progress saves instantly
5. Use the filter tabs to view All / To Do / Done
6. Search across missions with the search bar
7. Click any category header to collapse or expand it

---

## License

No license. All rights reserved. This is a personal project — you may not copy, distribute, or use this code without permission.
