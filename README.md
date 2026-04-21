<div align="center">

# MILESTONE**GG**

### Track your game progression across every title

*Bosses · Story · Collectibles · DLC · 100% Completion*

---

</div>

MilestoneGG is a personal game progression tracker built for players who want to track everything — not just achievements, but every boss, story beat, side quest, collectible, and DLC mission across every game they play. Add games, organize milestones into categories, tick them off as you go, and watch your progress bars fill up.

Built with React and Supabase. Hosted free on GitHub Pages.

---

## Features

**For Users**
- Browse available games and add them to your personal sidebar
- Organize milestones by category — collapse and expand sections freely
- Search missions in real time with text highlighting
- Progress bars per game and per category, synced live to the database
- Session persists across devices — log in from any browser with your code
- Installable as a PWA — add to your phone home screen for a native app feel

**For Admin**
- Full game management — add, edit, delete, show/hide games
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
| Hosting | GitHub Pages |
| Auth | Custom 4-character codes |
| Deployment | GitHub Actions |

---

## Project Structure

```
src/
├── lib/
│   ├── supabase.js          # Supabase client
│   ├── auth.js              # Auth context + session management
│   └── toast.js             # Notification system
├── pages/
│   ├── Login.js             # Login screen (code entry + admin access)
│   ├── Admin.js             # Admin panel
│   └── Dashboard.js         # User dashboard
├── components/
│   ├── GameChecklist.js     # Main checklist view with search + collapse
│   ├── CategoryMissionEditor.js  # Admin drag-to-reorder editor
│   ├── GameFormModal.js     # Add/edit game modal with CSS tab
│   ├── JsonUploadModal.js   # Bulk JSON import
│   ├── UserManager.js       # Generate + manage user codes
│   └── ErrorBoundary.js     # Crash recovery
└── styles/
    └── global.css           # Design system + responsive breakpoints

public/
├── icons/                   # Game icon PNGs (256x256, square)
├── manifest.json            # PWA manifest
└── favicon.svg              # Browser tab icon
```

---

## Setup Guide

### 1. Supabase

1. Create a free account at [supabase.com](https://supabase.com) — no credit card required
2. Create a new project
3. Go to **SQL Editor** and run the following:

```sql
-- Tables
create table users (
  id uuid primary key default gen_random_uuid(),
  code char(4) not null unique,
  note text default '',
  created_at timestamptz default now()
);

create table games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  icon text,
  color text,
  theme text default 'default',
  custom_css text default '',
  visible boolean default true,
  created_at timestamptz default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  name text not null,
  order_index integer default 0
);

create table missions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  text text not null,
  note text default '',
  order_index integer default 0
);

create table user_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  game_id uuid references games(id) on delete cascade,
  added_at timestamptz default now(),
  unique(user_id, game_id)
);

create table progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  mission_id uuid references missions(id) on delete cascade,
  done boolean default false,
  completed_at timestamptz,
  unique(user_id, mission_id)
);

-- Disable RLS (personal project, no cross-user data risk)
alter table users disable row level security;
alter table games disable row level security;
alter table categories disable row level security;
alter table missions disable row level security;
alter table user_games disable row level security;
alter table progress disable row level security;
```

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

**Upload your files:**

Upload everything inside the project folder to your GitHub repo via the web interface or GitHub Desktop. The deploy workflow at `.github/workflows/deploy.yml` runs automatically on every push.

Your site will be live at:
```
https://YOUR-USERNAME.github.io/milestonegg
```

---

## Game Icons

Icons are stored in `/public/icons/` as PNG files.

- **Recommended size:** 256×256px square with transparency
- **Best source:** [SteamGridDB](https://www.steamgriddb.com) → search your game → Icons tab → download PNG
- **Usage:** upload the PNG to `/public/icons/` in your repo, then type the filename (e.g. `fallout4.png`) in the admin panel game form

---

## JSON Import Format

Upload games in bulk from the admin panel using this format:

```json
{
  "name": "Fallout 4",
  "icon": "fallout4.png",
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
- Use the ✎ edit button to open the game form, which includes a **Custom CSS** tab for per-game theming
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
6. Search across missions with the search bar (`/` to focus)
7. Click any category header to collapse or expand it

---

## License

No license. All rights reserved. This is a personal project — you may not copy, distribute, or use this code without permission.
