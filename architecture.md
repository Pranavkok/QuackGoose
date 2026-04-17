# QuackFocus — Detailed System Architecture

> Agentic Focus OS · Next.js 15 (App Router) · PostgreSQL · Prisma 7 · Chrome Extension MV3

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture Diagram](#2-high-level-architecture-diagram)
3. [Component Breakdown](#3-component-breakdown)
4. [Chrome Extension Architecture](#4-chrome-extension-architecture)
5. [Next.js Website Architecture](#5-nextjs-website-architecture)
6. [API Design](#6-api-design)
7. [AI Classification Pipeline](#7-ai-classification-pipeline)
8. [Duck Character System](#8-duck-character-system)
9. [Productivity & Distraction Engine](#9-productivity--distraction-engine)
10. [Garden System](#10-garden-system)
11. [Authentication Flow](#11-authentication-flow)
12. [Database Schema (Prisma 7 + PostgreSQL)](#12-database-schema-prisma-7--postgresql)
13. [Data Flow Diagrams](#13-data-flow-diagrams)
14. [Environment Variables](#14-environment-variables)
15. [Folder Structure](#15-folder-structure)

---

## 1. System Overview

QuackFocus is a two-part productivity enforcement system:

| Part | Technology | Responsibility |
|------|-----------|---------------|
| Chrome Extension | MV3, JS, CSS | Track browsing, scrape pages, inject Duck overlays, blur/block distracting sites |
| Website (Dashboard) | Next.js App Router, PostgreSQL, Prisma 7, Tailwind | Auth, onboarding, analytics, garden, settings |

**Core Loop:**

1. User signs up via Google OAuth in the extension
2. Completes 10-question onboarding → system builds a productivity profile
3. Extension tracks every tab visit, scrapes content, classifies it via AI
4. Productivity and distraction time is tracked and stored
5. When distraction limit is hit → extension blurs the page + freezes cursor
6. Duck character appears on pages, reacting to user's behavior with mood-specific images
7. Productive work grows the garden; distraction kills plants
8. Dashboard shows full analytics, garden state, and settings

---

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              CHROME EXTENSION (MV3)                          │   │
│  │                                                              │   │
│  │  background.js (Service Worker)                              │   │
│  │  ├── Tab tracker (chrome.tabs + chrome.webNavigation)        │   │
│  │  ├── Domain classification cache (chrome.storage)            │   │
│  │  ├── Heartbeat (chrome.alarms)                               │   │
│  │  └── API bridge (fetch to Next.js API routes)               │   │
│  │                                                              │   │
│  │  content.js (injected per page)                              │   │
│  │  ├── Page scraper (title, meta, headings, visible text)      │   │
│  │  ├── Duck overlay renderer (mood images)                     │   │
│  │  ├── Blur injector (CSS filter escalation)                   │   │
│  │  └── Cursor trap (pointer-events: none overlay)              │   │
│  │                                                              │   │
│  │  popup.html — Quick status, daily stats, pause button        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                           │  HTTPS API calls                        │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS 15 APP (App Router)                       │
│                                                                     │
│  App Routes                    API Routes                           │
│  ├── / (landing)               ├── /api/auth/[...nextauth]          │
│  ├── /onboarding               ├── /api/extension/activity          │
│  ├── /dashboard                ├── /api/extension/classify          │
│  ├── /garden                   ├── /api/extension/status            │
│  ├── /analytics                ├── /api/garden                      │
│  └── /settings                 ├── /api/analytics                   │
│                                ├── /api/settings                    │
│                                └── /api/onboarding                  │
│                                                                     │
│  Services (lib/)                                                     │
│  ├── classificationService.ts  (AI call + cache lookup)             │
│  ├── productivityEngine.ts     (scoring, limit checks)              │
│  ├── gardenService.ts          (plant spawn/kill logic)             │
│  └── duckMoodService.ts        (mood state machine)                 │
└────────────────────┬────────────────────────────────────────────────┘
                     │  Prisma Client
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                               │
│                                                                     │
│  Users · OnboardingProfiles · Settings · ActivityLogs               │
│  WebsiteClassifications · DailySummaries · Gardens · GardenPlants   │
└─────────────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│              AI CLASSIFICATION (Claude API / Gemini)                 │
│  Input: domain + page title + meta description + sampled headings   │
│  Output: { category, isProductive, confidence, subcategory }        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Breakdown

### 3.1 Chrome Extension

**Role:** Sensor + enforcer layer. Lightweight. No business logic beyond caching.

| File | Purpose |
|------|---------|
| `manifest.json` | Declares permissions and entry points |
| `background.js` | Service worker — tab events, API bridge, alarm heartbeat |
| `content.js` | Page scraper, duck overlay, blur/cursor blocking |
| `popup.html + popup.js` | Extension popup — status, today's stats |
| `duck-assets/` | PNG images for each duck mood state |

### 3.2 Next.js Website

**Role:** Auth, data persistence, analytics UI, garden visualization, settings.

| Route | Purpose |
|-------|---------|
| `/` | Landing page with product info and extension install CTA |
| `/onboarding` | 10-question wizard (after first Google sign-in) |
| `/dashboard` | Daily summary, productivity score, distraction stats |
| `/garden` | Visual garden — 2D illustration that fills/depletes |
| `/analytics` | Detailed charts — time per category, streaks, trends |
| `/settings` | Distraction limits, custom site lists, duck settings |

---

## 4. Chrome Extension Architecture

### 4.1 manifest.json Permissions

```json
{
  "manifest_version": 3,
  "name": "QuackFocus",
  "version": "1.0.0",
  "permissions": [
    "tabs",
    "webNavigation",
    "storage",
    "alarms",
    "scripting",
    "identity",
    "identity.email"
  ],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "background.js" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }],
  "action": { "default_popup": "popup.html" },
  "oauth2": {
    "client_id": "YOUR_GOOGLE_CLIENT_ID",
    "scopes": ["openid", "email", "profile"]
  }
}
```

### 4.2 background.js — Service Worker

```
State Machine:
  IDLE → TRACKING → CLASSIFIED → ENFORCING

Responsibilities:
  1. Google OAuth via chrome.identity.getAuthToken()
  2. Tab change detection via chrome.tabs.onActivated + chrome.webNavigation.onCommitted
  3. 5-second debounce before registering a tab as "active visit"
  4. Check chrome.storage for cached classification of domain
     - Cache HIT  → use cached result, emit activity to API
     - Cache MISS → send scrape request to content.js, POST /api/extension/classify
  5. POST /api/extension/activity every time user leaves a page (record duration)
  6. GET /api/extension/status every 60s via chrome.alarms (not setInterval — MV3 constraint)
  7. If status.limitReached === true → message content.js to activate enforcement
```

**Critical: chrome.alarms for heartbeat**
```
chrome.alarms.create('heartbeat', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'heartbeat') fetchStatusAndSync();
});
```

### 4.3 content.js — Injected Per Page

**Scraping:**
```
Payload sent to /api/extension/classify:
{
  domain: window.location.hostname,
  title: document.title,
  metaDescription: document.querySelector('meta[name="description"]')?.content,
  h1: document.querySelector('h1')?.innerText,
  h2s: [...document.querySelectorAll('h2')].slice(0,5).map(h => h.innerText),
  ogType: document.querySelector('meta[property="og:type"]')?.content
}
```

**Duck Overlay:**
```
Renders a fixed-position div in the bottom-right corner of every page.
- Shows a duck PNG based on current mood state
- Mood state is received from background.js via chrome.runtime.onMessage
- Clicking the duck opens a small tooltip with a message/roast
- z-index: 2147483647 to stay above all page content
- pointer-events on the duck div only (does not block page interaction)
```

**Blur + Cursor Enforcement (activated when limit is reached):**
```
Phase 1 — Warning (approaching limit, 80% used):
  document.body.style.filter = 'blur(3px) saturate(0.7)';

Phase 2 — Limit Reached:
  1. Apply: document.body.style.filter = 'blur(10px) grayscale(0.8)';
  2. Inject a transparent full-page div with pointer-events: all
     → This blocks all clicks and scrolling on the page
     → The div shows the duck in "angry/disappointed" mood with a message
  3. A "Go Back to Work" button in the overlay links to /dashboard
  
Phase 3 — Goal-based mode (limit = "productive day complete"):
  Same as Phase 2 but message reads "You've earned your break! Come back tomorrow."
```

### 4.4 popup.html

```
Shows:
- User avatar + name
- Today's productive time / distraction time
- Duck mood (current state)
- Daily progress bar (distraction used / limit)
- Quick toggle: Pause QuackFocus for 15 minutes
```

---

## 5. Next.js Website Architecture

### 5.1 Auth

Uses **NextAuth.js v5** with Google provider.

```
/api/auth/[...nextauth]
  - Provider: Google OAuth 2.0
  - On first sign-in: create User record + redirect to /onboarding
  - On return sign-in: redirect to /dashboard
  - JWT stored in httpOnly cookie
  - Extension auth: uses chrome.identity.getAuthToken() → exchanges token
    at /api/auth/extension-token → receives app session token → stored in
    chrome.storage.local
```

### 5.2 Onboarding — The 10 Questions

These questions build the user's productivity profile. All users see the same questions.

| # | Question | Type | Purpose |
|---|----------|------|---------|
| 1 | What best describes your work? | Select (Developer / Designer / Writer / Student / Manager / Other) | Preset productive site list |
| 2 | What are your biggest distractions? | Multi-select (Social media / News / Video / Shopping / Gaming / Other) | Pre-seed distraction list |
| 3 | How strict do you want QuackFocus to be? | Scale 1–5 | Global strictness multiplier |
| 4 | How many hours of focused work is a "productive day" for you? | Number input (1–12) | Daily focus goal |
| 5 | What time does your workday start? | Time picker | Active tracking window |
| 6 | What time does your workday end? | Time picker | Active tracking window |
| 7 | How much total distraction time is acceptable per day? | Select (15min / 30min / 1hr / 2hr / No limit until goal reached) | Distraction limit mode |
| 8 | Are there specific sites you always want blocked? | Text input (comma-separated domains) | Hard block list |
| 9 | Are there specific sites you always want counted as productive? | Text input (comma-separated domains) | Productive whitelist |
| 10 | What should the duck do when you're distracted? | Select (Warn only / Blur screen / Block + cursor / Shame and block) | Enforcement level |

### 5.3 Dashboard Page

```
Layout:
┌──────────────────────────────────────┐
│  Daily Focus Ring   │  Duck Mood     │
│  (donut chart)      │  (current PNG) │
├──────────────────────────────────────┤
│  Today's Stats                       │
│  ├── Productive: Xh Xm              │
│  ├── Distraction: Xm                │
│  ├── Distraction limit: X%          │
│  └── Streak: X days                 │
├──────────────────────────────────────┤
│  Top Sites Today    │  Garden Preview│
│  (table)            │  (thumbnail)   │
└──────────────────────────────────────┘
```

### 5.4 Analytics Page

```
Charts:
- Weekly focus heatmap (GitHub-style calendar)
- Daily breakdown: productive vs distraction (stacked bar)
- Top productive sites (bar chart)
- Top distraction sites (bar chart)
- Productivity trend over time (line chart)
- Focus session lengths histogram

Custom Filters:
- Date range picker
- Category filter
- Site search
```

### 5.5 Garden Page

```
Visual representation:
- 2D illustrated garden (SVG or Canvas)
- Plants appear as the user completes productive sessions
- Plants wilt/disappear for distraction sessions
- Garden has sections: Flower bed (15min sessions), Tree area (60min), 
  Special items (milestones)

Plant spawn rules:
  15 min focus  → small flower
  30 min focus  → medium flower
  60 min focus  → small tree
  2hr focus     → large tree
  
Plant death rules:
  > 30 min distraction in one day → 1 plant dies
  Every additional 30 min over limit → another plant dies

Garden state stored in DB, re-hydrated on page load.
```

---

## 6. API Design

All extension-facing routes require a Bearer token in Authorization header.
All website routes use session cookies via NextAuth.

### Extension API Routes

```
POST /api/extension/activity
  Body: {
    domain: string,
    pageTitle: string,
    category: string,           // from local cache
    isProductive: boolean,
    durationSeconds: number,
    startedAt: ISO string,
    endedAt: ISO string
  }
  Response: {
    gardenEvent?: 'plant_added' | 'plant_removed',
    duckMood: DuckMood,
    distractionUsedPercent: number,
    limitReached: boolean
  }

POST /api/extension/classify
  Body: {
    domain: string,
    title: string,
    metaDescription?: string,
    h1?: string,
    h2s?: string[],
    ogType?: string
  }
  Response: {
    domain: string,
    category: 'productive' | 'distraction' | 'neutral',
    subcategory: string,        // e.g. 'coding', 'social_media', 'news'
    confidence: number,
    cached: boolean
  }

GET /api/extension/status
  Response: {
    userId: string,
    duckMood: DuckMood,
    distractionLimitMinutes: number,
    distractionUsedMinutes: number,
    limitReached: boolean,
    productiveDayComplete: boolean,
    enforceMode: 'warn' | 'blur' | 'block' | 'shame_block',
    activeTimeWindow: { start: string, end: string }
  }
```

### Website API Routes

```
GET/POST /api/onboarding
  GET:  Returns completed onboarding answers (for settings pre-fill)
  POST: Save answers → create OnboardingProfile + Settings records

GET/PUT /api/settings
  GET: Return user settings
  PUT: Update settings (distraction limits, custom sites, enforcement mode)

GET /api/analytics?from=ISO&to=ISO
  Returns: aggregated activity stats for date range

GET /api/analytics/sites?type=productive|distraction&limit=10
  Returns: top sites by time spent

GET/POST /api/garden
  GET:  Return full garden state with all plants
  POST: (internal, called after activity processing) add/remove plant

GET /api/dashboard/summary
  Returns: today's stats, duck mood, garden plant count, streak
```

---

## 7. AI Classification Pipeline

### 7.1 Flow

```
Extension content.js scrapes page metadata
        │
        ▼
background.js checks chrome.storage cache
        │
   Cache HIT ──────────────────────► Use cached result (no API call)
        │
   Cache MISS
        │
        ▼
POST /api/extension/classify
        │
        ▼
classificationService.ts:
  1. Check DB: WebsiteClassification table (7-day TTL)
  2. Check user's OnboardingProfile for overrides
     - Domain in userProductiveSites → return 'productive' immediately
     - Domain in userDistractingSites → return 'distraction' immediately
  3. Check global preset lists (hardcoded common sites)
  4. If none of above → call AI API:
     
     Prompt template:
     ─────────────────────────────────────────────
     You are classifying a website for a productivity tracking app.
     
     User profile: {productivityType} (e.g. "software developer")
     Distractions they identified: {distractionTypes}
     
     Website info:
     - Domain: {domain}
     - Page title: {title}
     - Meta description: {metaDescription}
     - Main heading: {h1}
     - Sub-headings: {h2s}
     - OG type: {ogType}
     
     Classify this page:
     - category: "productive" | "distraction" | "neutral"
     - subcategory: one of [coding, documentation, research, 
       writing, design, learning, social_media, video_entertainment,
       news, shopping, gaming, communication, productivity_tool, other]
     - confidence: 0.0–1.0
     - reasoning: one sentence
     
     Return JSON only.
     ─────────────────────────────────────────────

  5. Store result in WebsiteClassification table with TTL
  6. Store in chrome.storage for 24h to avoid repeat API calls

Rate limiting: 1 classification per domain per 7 days in DB.
Confidence threshold: if confidence < 0.6, classify as 'neutral'.
```

### 7.2 Preset Classification Lists

Hardcoded in `lib/presetClassifications.ts`:

```typescript
const ALWAYS_PRODUCTIVE = [
  'github.com', 'gitlab.com', 'stackoverflow.com', 'docs.google.com',
  'notion.so', 'linear.app', 'figma.com', 'vercel.com', 'railway.app',
  'developer.mozilla.org', 'npmjs.com', 'pkg.go.dev', ...
];

const ALWAYS_DISTRACTION = [
  'youtube.com', 'instagram.com', 'twitter.com', 'x.com', 'facebook.com',
  'tiktok.com', 'reddit.com', 'netflix.com', 'twitch.tv', 'amazon.com',
  'ebay.com', 'buzzfeed.com', ...
];
```

These lists can be overridden per user via their settings.

---

## 8. Duck Character System

### 8.1 Mood States

| Mood | Trigger Condition | Image Asset | Message Tone |
|------|------------------|-------------|--------------|
| `happy` | Productive session active, streak building | `duck-happy.png` | Encouraging |
| `idle` | No active tab / extension just loaded | `duck-idle.png` | Neutral |
| `sleepy` | No activity for > 20 min during work hours | `duck-sleepy.png` | Gentle nudge |
| `watching` | Neutral site visited (not yet classified) | `duck-watching.png` | Curious |
| `warning` | Distraction time at 50–80% of daily limit | `duck-warning.png` | Stern warning |
| `angry` | Distraction time at 80–99% of daily limit | `duck-angry.png` | Roasting |
| `chaos` | Limit reached / enforcement active | `duck-chaos.png` | Full roast mode |
| `proud` | Productive day goal reached | `duck-proud.png` | Celebration |
| `disappointed` | Many plants died this week | `duck-disappointed.png` | Guilt trip |

### 8.2 Mood Determination Logic (Server-side, returned in /api/extension/status)

```
function getDuckMood(user: UserStatus): DuckMood {
  const pct = user.distractionUsedMinutes / user.distractionLimitMinutes;
  
  if (user.productiveDayComplete)      return 'proud';
  if (user.isCurrentlyProductive)      return 'happy';
  if (user.idleMinutes > 20)           return 'sleepy';
  if (pct >= 1.0)                      return 'chaos';
  if (pct >= 0.8)                      return 'angry';
  if (pct >= 0.5)                      return 'warning';
  if (user.currentSiteCategory === 'neutral') return 'watching';
  return 'idle';
}
```

### 8.3 Duck Rendering in Content Script

```javascript
// Injected into every page
const duck = document.createElement('div');
duck.id = '__quackfocus_duck__';
duck.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 80px;
  height: 80px;
  z-index: 2147483647;
  cursor: pointer;
  transition: transform 0.2s ease;
`;

const img = document.createElement('img');
img.src = chrome.runtime.getURL(`duck-assets/${mood}.png`);
duck.appendChild(img);

// Tooltip with message
duck.addEventListener('click', () => showDuckTooltip(message));

document.body.appendChild(duck);
```

### 8.4 Duck Messages (AI-generated or template-based)

For enforcement budget reasons, messages can be template-based with light personalization:

```typescript
const DUCK_MESSAGES: Record<DuckMood, string[]> = {
  warning: [
    "Hey. You've used {pct}% of your distraction budget. Just saying.",
    "I'm watching you. {distractionUsed} minutes wasted so far.",
  ],
  angry: [
    "You're {minutes} away from the blur wall. Keep going, I dare you.",
    "Almost at your limit. Is this {site} really worth it?",
  ],
  chaos: [
    "That's it. I warned you. Blur activated. Go do something real.",
    "Limit reached. Come back when you remember what you're here for.",
  ],
  happy: [
    "Look at you go! {focusTime} minutes of pure focus. Respect.",
    "Your garden thanks you. Keep it up.",
  ],
  // ...
};
```

---

## 9. Productivity & Distraction Engine

### 9.1 Distraction Limit Modes

Two modes, set during onboarding and adjustable in settings:

**Mode 1: Time-Based**
```
User sets: "X minutes of distraction per day"
Logic:
  distractionUsed = SUM(duration of all distraction activity logs for today)
  if distractionUsed >= limit → enforcement activates
```

**Mode 2: Goal-Based**
```
User sets: "No distraction until I complete my daily focus goal"
Logic:
  focusCompleted = SUM(duration of all productive activity logs for today)
  if focusCompleted >= dailyFocusGoalMinutes → distraction unlocked
  else → all distraction sites trigger enforcement immediately
  
  Even after goal reached, applies soft warnings (no hard block).
```

### 9.2 Productivity Score Calculation

```typescript
// Called by productivityEngine.ts, updates DailySummary
function calculateProductivityScore(summary: DailySummary): number {
  const focusRatio = summary.totalFocusMinutes / summary.dailyFocusGoalMinutes;
  const distractionPenalty = Math.min(
    summary.totalDistractionMinutes / summary.distractionLimitMinutes, 
    1.0
  );
  // Score 0–100
  return Math.round(Math.min(focusRatio, 1.0) * 100 * (1 - distractionPenalty * 0.3));
}
```

### 9.3 Active Tracking Window

Extension only tracks activity within the user's defined work hours (from onboarding Q5/Q6).
Outside work hours: extension is passive (no enforcement, duck still shows but in idle mode).

---

## 10. Garden System

### 10.1 Plant Spawn Rules

| Trigger | Condition | Plant Added |
|---------|-----------|-------------|
| Focus milestone | 15 consecutive productive minutes | Small flower |
| Focus milestone | 30 consecutive productive minutes | Medium flower |
| Focus milestone | 60 consecutive productive minutes | Small tree |
| Focus milestone | 120 consecutive productive minutes | Large tree |
| Streak bonus | 5-day streak maintained | Special plant (golden) |

### 10.2 Plant Death Rules

| Trigger | Condition | Plants Removed |
|---------|-----------|---------------|
| Daily distraction | > 30 min over limit in a day | 1 random plant |
| Heavy distraction | > 60 min over limit | 2 random plants |
| Broken streak | Streak broken after 7+ days | 1 plant |

### 10.3 Garden Visualization

The garden is a 2D layered illustration rendered in the browser:
- Background: sky + hills (static SVG)
- Foreground: plant layer (dynamic — plants added/removed as SVG elements or Canvas)
- Plants animate in (grow from ground) and out (wilt and fade)
- Garden sections unlock as the garden grows (starts small, expands)

Implementation: CSS + SVG animations, no heavy 3D library needed for a productive web app.

---

## 11. Authentication Flow

### 11.1 Website Authentication

```
1. User visits QuackFocus website
2. Clicks "Sign in with Google"
3. NextAuth.js handles OAuth2 flow with Google
4. On callback:
   a. Check if User exists in DB (by googleId)
   b. If NEW user:
      - Create User record
      - Create empty Settings record
      - Redirect to /onboarding
   c. If EXISTING user:
      - Check onboardingCompleted flag
      - If false → /onboarding
      - If true → /dashboard
```

### 11.2 Extension Authentication

```
1. User clicks extension icon for the first time
2. Extension calls: chrome.identity.getAuthToken({ interactive: true })
3. User grants permission → receives Google access token
4. Extension POSTs token to /api/auth/extension-token:
   {
     googleToken: "..."
   }
5. Server:
   a. Verifies token with Google tokeninfo endpoint
   b. Finds or creates User record
   c. Returns a signed JWT (app-specific session token)
6. Extension stores JWT in chrome.storage.local
7. All subsequent API calls use: Authorization: Bearer <jwt>
8. JWT expires in 30 days; extension refreshes on expiry
```

---

## 12. Database Schema (Prisma 7 + PostgreSQL)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────

enum ProductivityType {
  DEVELOPER
  DESIGNER
  WRITER
  STUDENT
  MANAGER
  OTHER
}

enum DistractionLimitMode {
  TIME_BASED      // X minutes per day
  GOAL_BASED      // Unlocks after daily focus goal reached
}

enum EnforcementLevel {
  WARN_ONLY        // Duck warns, no visual changes
  BLUR             // Blur the page
  BLOCK            // Blur + cursor blocking overlay
  SHAME_AND_BLOCK  // Blur + block + roast message
}

enum SiteCategory {
  PRODUCTIVE
  DISTRACTION
  NEUTRAL
}

enum SiteSubcategory {
  CODING
  DOCUMENTATION
  RESEARCH
  WRITING
  DESIGN
  LEARNING
  SOCIAL_MEDIA
  VIDEO_ENTERTAINMENT
  NEWS
  SHOPPING
  GAMING
  COMMUNICATION
  PRODUCTIVITY_TOOL
  OTHER
}

enum DuckMood {
  HAPPY
  IDLE
  SLEEPY
  WATCHING
  WARNING
  ANGRY
  CHAOS
  PROUD
  DISAPPOINTED
}

enum PlantType {
  SMALL_FLOWER
  MEDIUM_FLOWER
  SMALL_TREE
  LARGE_TREE
  GOLDEN_PLANT
}

enum PlantStatus {
  ALIVE
  DEAD
}

// ─────────────────────────────────────────
// USER
// ─────────────────────────────────────────

model User {
  id                  String    @id @default(cuid())
  googleId            String    @unique
  email               String    @unique
  name                String
  avatarUrl           String?
  onboardingCompleted Boolean   @default(false)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  // Relations
  onboardingProfile   OnboardingProfile?
  settings            UserSettings?
  activityLogs        ActivityLog[]
  dailySummaries      DailySummary[]
  garden              Garden?
  websiteOverrides    UserWebsiteOverride[]

  @@index([email])
}

// ─────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────

model OnboardingProfile {
  id                    String              @id @default(cuid())
  userId                String              @unique
  user                  User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Q1: Work type
  productivityType      ProductivityType

  // Q2: Distraction types
  distractionTypes      String[]            // ['social_media', 'video', 'news', ...]

  // Q3: Strictness 1-5
  strictnessLevel       Int                 @default(3)

  // Q4: Daily focus goal in minutes
  dailyFocusGoalMinutes Int                 @default(240)

  // Q5 + Q6: Work hours
  workStartTime         String              @default("09:00")  // HH:MM
  workEndTime           String              @default("18:00")  // HH:MM

  // Q7: Distraction limit
  distractionLimitMode  DistractionLimitMode @default(TIME_BASED)
  distractionLimitMinutes Int               @default(60)       // used when mode = TIME_BASED

  // Q8: Hard block domains
  alwaysBlockedDomains  String[]            @default([])

  // Q9: Always productive domains
  alwaysProductiveDomains String[]          @default([])

  // Q10: Enforcement level
  enforcementLevel      EnforcementLevel    @default(BLUR)

  completedAt           DateTime            @default(now())
}

// ─────────────────────────────────────────
// USER SETTINGS (mutable, separate from onboarding)
// ─────────────────────────────────────────

model UserSettings {
  id                    String              @id @default(cuid())
  userId                String              @unique
  user                  User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Overrides from onboarding (can be changed in /settings)
  distractionLimitMode  DistractionLimitMode @default(TIME_BASED)
  distractionLimitMinutes Int               @default(60)
  dailyFocusGoalMinutes Int                 @default(240)
  enforcementLevel      EnforcementLevel    @default(BLUR)
  workStartTime         String              @default("09:00")
  workEndTime           String              @default("18:00")

  // Duck preferences
  duckEnabled           Boolean             @default(true)
  duckMessagesEnabled   Boolean             @default(true)

  // Notifications
  weeklyEmailEnabled    Boolean             @default(true)

  updatedAt             DateTime            @updatedAt
}

// ─────────────────────────────────────────
// ACTIVITY TRACKING
// ─────────────────────────────────────────

model ActivityLog {
  id              String          @id @default(cuid())
  userId          String
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  domain          String
  pageTitle       String?         @db.Text
  category        SiteCategory
  subcategory     SiteSubcategory @default(OTHER)
  isProductive    Boolean

  startedAt       DateTime
  endedAt         DateTime
  durationSeconds Int

  date            DateTime        // Date only (for grouping) — set to start of day UTC

  createdAt       DateTime        @default(now())

  @@index([userId, date])
  @@index([userId, domain])
  @@index([date])
}

// ─────────────────────────────────────────
// DAILY SUMMARY (computed, updated incrementally)
// ─────────────────────────────────────────

model DailySummary {
  id                        String    @id @default(cuid())
  userId                    String
  user                      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  date                      DateTime  // Start of day UTC

  totalFocusMinutes         Int       @default(0)
  totalDistractionMinutes   Int       @default(0)
  totalNeutralMinutes       Int       @default(0)

  distractionLimitMinutes   Int       // Snapshot of limit at the time
  limitReached              Boolean   @default(false)
  productiveDayComplete     Boolean   @default(false)

  productivityScore         Int       @default(0)   // 0–100

  plantsGrown               Int       @default(0)
  plantsLost                Int       @default(0)

  focusStreak               Int       @default(0)   // Consecutive productive days at this point

  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt

  @@unique([userId, date])
  @@index([userId, date])
}

// ─────────────────────────────────────────
// WEBSITE CLASSIFICATIONS (global cache)
// ─────────────────────────────────────────

model WebsiteClassification {
  id              String          @id @default(cuid())
  domain          String          @unique
  category        SiteCategory
  subcategory     SiteSubcategory @default(OTHER)
  confidence      Float           @default(1.0)
  aiClassified    Boolean         @default(false)
  classifiedAt    DateTime        @default(now())
  expiresAt       DateTime        // classifiedAt + 7 days

  @@index([domain])
  @@index([expiresAt])
}

// User-level overrides for site classification
model UserWebsiteOverride {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  domain      String
  category    SiteCategory
  createdAt   DateTime      @default(now())

  @@unique([userId, domain])
  @@index([userId])
}

// ─────────────────────────────────────────
// GARDEN
// ─────────────────────────────────────────

model Garden {
  id          String        @id @default(cuid())
  userId      String        @unique
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  totalPlants Int           @default(0)
  alivePlants Int           @default(0)
  updatedAt   DateTime      @updatedAt

  plants      GardenPlant[]
}

model GardenPlant {
  id          String      @id @default(cuid())
  gardenId    String
  garden      Garden      @relation(fields: [gardenId], references: [id], onDelete: Cascade)

  plantType   PlantType
  status      PlantStatus @default(ALIVE)

  // Position in the garden grid (for consistent rendering)
  positionX   Int
  positionY   Int

  spawnedAt   DateTime    @default(now())
  diedAt      DateTime?

  // Which focus session spawned this plant
  sourceDate  DateTime    // The date this was earned

  @@index([gardenId, status])
}
```

---

## 13. Data Flow Diagrams

### 13.1 Tab Visit → Classification → Activity Log

```
User opens a tab
     │
     ▼
background.js: chrome.tabs.onActivated fires
     │
     ▼  (5s debounce — user must stay on tab)
background.js: Send message to content.js → "scrape this page"
     │
     ▼
content.js: Collect { title, meta, h1, h2s, domain, ogType }
Send back to background.js
     │
     ▼
background.js: Check chrome.storage for domain cache
     │
  HIT (< 24h)              MISS
     │                       │
     │                       ▼
     │              POST /api/extension/classify
     │                       │
     │                       ▼
     │              classificationService:
     │              1. Check UserWebsiteOverride
     │              2. Check preset lists
     │              3. Check WebsiteClassification DB
     │              4. If none → call AI API
     │              5. Cache result in DB + storage
     │                       │
     └───────────────────────┘
                    │
                    ▼
          Store classification in chrome.storage (24h TTL)
                    │
                    ▼
     [User navigates away from tab]
                    │
                    ▼
     background.js: Record duration
     POST /api/extension/activity {domain, category, duration, ...}
                    │
                    ▼
     Server: Create ActivityLog record
             Update DailySummary (focus/distraction totals)
             Check if limit reached → update limitReached flag
             Check garden events → spawn/kill plants
             Return { duckMood, limitReached, gardenEvent }
                    │
                    ▼
     background.js: Cache new duck mood
     Message content.js → update duck overlay mood
```

### 13.2 Distraction Limit → Enforcement

```
GET /api/extension/status (every 60s via chrome.alarms)
     │
     ▼
Server returns { limitReached: true, enforceMode: 'BLOCK' }
     │
     ▼
background.js: Send message to all active content scripts:
{ action: 'enforce', mood: 'chaos', message: '...' }
     │
     ▼
content.js (on every active distraction tab):
  1. Apply CSS blur to document.body
  2. Inject full-page blocking overlay div
  3. Show duck in chaos mood with roast message
  4. Show "Go back to work →" button linking to /dashboard
```

---

## 14. Environment Variables

```bash
# .env.local (website)

# Database
DATABASE_URL="postgresql://user:pass@host:5432/quackfocus"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# AI Classification
ANTHROPIC_API_KEY="..."         # Claude API for classification
# OR
GEMINI_API_KEY="..."            # Alternative: Gemini

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EXTENSION_JWT_SECRET="..."      # Separate secret for extension tokens
```

---

## 15. Folder Structure

```
QuackGoose/
├── extension/
│   ├── manifest.json
│   ├── background.js             # Service worker
│   ├── content.js                # Page injector
│   ├── popup.html
│   ├── popup.js
│   ├── duck-assets/
│   │   ├── duck-happy.png
│   │   ├── duck-idle.png
│   │   ├── duck-sleepy.png
│   │   ├── duck-watching.png
│   │   ├── duck-warning.png
│   │   ├── duck-angry.png
│   │   ├── duck-chaos.png
│   │   ├── duck-proud.png
│   │   └── duck-disappointed.png
│   └── styles/
│       └── content.css
│
└── web/                          # Next.js App
    ├── app/
    │   ├── (auth)/
    │   │   └── onboarding/
    │   │       └── page.tsx
    │   ├── (dashboard)/
    │   │   ├── dashboard/
    │   │   │   └── page.tsx
    │   │   ├── analytics/
    │   │   │   └── page.tsx
    │   │   ├── garden/
    │   │   │   └── page.tsx
    │   │   └── settings/
    │   │       └── page.tsx
    │   ├── api/
    │   │   ├── auth/
    │   │   │   ├── [...nextauth]/
    │   │   │   │   └── route.ts
    │   │   │   └── extension-token/
    │   │   │       └── route.ts
    │   │   ├── extension/
    │   │   │   ├── activity/
    │   │   │   │   └── route.ts
    │   │   │   ├── classify/
    │   │   │   │   └── route.ts
    │   │   │   └── status/
    │   │   │       └── route.ts
    │   │   ├── analytics/
    │   │   │   └── route.ts
    │   │   ├── garden/
    │   │   │   └── route.ts
    │   │   ├── onboarding/
    │   │   │   └── route.ts
    │   │   └── settings/
    │   │       └── route.ts
    │   ├── layout.tsx
    │   └── page.tsx
    ├── lib/
    │   ├── prisma.ts
    │   ├── auth.ts               # NextAuth config
    │   ├── classificationService.ts
    │   ├── productivityEngine.ts
    │   ├── gardenService.ts
    │   ├── duckMoodService.ts
    │   └── presetClassifications.ts
    ├── components/
    │   ├── ui/                   # shadcn/ui components
    │   ├── garden/
    │   │   ├── GardenCanvas.tsx
    │   │   └── PlantSprite.tsx
    │   ├── analytics/
    │   │   ├── FocusRing.tsx
    │   │   ├── ActivityHeatmap.tsx
    │   │   └── SiteBreakdown.tsx
    │   ├── onboarding/
    │   │   └── QuestionWizard.tsx
    │   └── duck/
    │       └── DuckMoodDisplay.tsx
    ├── prisma/
    │   └── schema.prisma
    ├── public/
    │   └── garden-assets/        # Plant SVGs
    ├── .env.local
    ├── next.config.ts
    ├── tailwind.config.ts
    └── package.json
```

---

## Key Architectural Decisions & Rationale

| Decision | Choice | Why |
|----------|--------|-----|
| Blur enforcement | Extension content script (not Electron) | No Electron in this stack; CSS injection via content.js covers browser tabs |
| Extension heartbeat | `chrome.alarms` not `setInterval` | MV3 service workers terminate after ~30s idle; alarms survive |
| Classification caching | Two-layer (chrome.storage + DB) | Avoids redundant AI calls; extension works offline for known domains |
| Distraction scoring | Per-activity-log + DailySummary incremental update | Avoids expensive full-day recalculation on every activity event |
| Garden state | Normalized GardenPlant rows, not JSON blob | Enables querying, history, and resurrection of plants if needed |
| Auth for extension | Separate JWT via Google token exchange | Extensions can't use httpOnly cookies; separate JWT with shorter scope |
| PostgreSQL over MongoDB | User chose Postgres + Prisma | Relational model fits structured onboarding + analytics queries well |
```
