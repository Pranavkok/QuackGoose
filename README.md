# QuackGoose / QuackFocus

QuackFocus is a **productivity platform + Chrome extension** built to help employees stay focused and help admins run policy-driven focus operations.

This monorepo contains:
- `web/`: Next.js 16 app (employee + admin web app + API)
- `extension/`: Chrome MV3 extension (tracking, classification, duck companion, enforcement)

## 1. Implemented Feature Set (Complete)

### Employee-facing web features
- Landing page (`/`) with:
  - product marketing sections (hero, features, process, wellness, pricing, FAQ)
  - plan CTA actions
  - `Sign in` + `Sign up` links
- Auth pages:
  - `/login`: Google OAuth + email/password login
  - `/signup`: Google OAuth + email/password signup + immediate credentials sign-in
  - `/auth-error`: auth error explanation page
- Checkout flow (`/checkout`): simulated/test checkout that routes into org setup
- Onboarding flow (`/onboarding`): 10-step wizard that captures:
  1. productivity type
  2. distraction categories
  3. strictness level
  4. daily focus goal (hours)
  5. work start time
  6. work end time
  7. distraction limit mode/value
  8. always-blocked domains
  9. always-productive domains
  10. enforcement mode
- Employee shell with consistent header/footer, nav, profile, theme toggle, sign out:
  - Dashboard (`/dashboard`)
  - Garden (`/garden`)
  - Analytics (`/analytics`)
  - Rooms (`/rooms`)
  - Settings (`/settings`)
- Dashboard features:
  - daily focus radial progress
  - productive/distraction/streak/score cards
  - distraction budget bar + limit reached signal
  - duck mood card
  - peak productive hour window insight
  - top sites list
  - garden summary tile
  - auto refresh polling
- Garden features:
  - SVG-rendered garden map with asset-based plants
  - alive/total/weekly/health stats
  - plant type breakdown
  - recent plant activity list
- Analytics features:
  - date range filtering + quick 7D/30D/90D presets
  - distraction-over-time chart + average reference line
  - stacked daily productive/neutral/distraction chart
  - weekly score heatmap chart
  - productivity score trend chart
  - subcategory pie chart
  - top productive sites chart
  - top distraction sites chart
  - custom filter view by domain/category/minutes
  - save/apply/delete local saved views
- Settings features:
  - daily goal + work hour controls
  - distraction mode (time/goal-based) and time budget
  - enforcement mode (warn/blur/block/shame+block)
  - duck toggles + weekly email toggle
  - website classification overrides CRUD (productive/distracting/neutral)
- Focus Rooms features:
  - create room with name, duration, allowed domains
  - join room via code
  - room live status view with timer, partner states, distraction events
  - copy code/share flow
  - extension-based distraction updates into room state

### Admin / organization web features
- Org setup (`/setup`, `/org/setup`): create org (name/slug/industry/team size)
- Admin shell (`/org/layout`): consistent admin header/footer + theme toggle + seat/plan pill
- Org Dashboard (`/org/dashboard`):
  - welcome onboarding banner with setup checklist
  - KPI cards (avg score, focused users, breaches, team focus time)
  - seat usage + plan card
  - quick actions
  - employee productivity table
  - org policy snapshot cards
- Members (`/org/members`):
  - seat usage progress
  - active members list with role, score, streak, join date
  - pending invites list
- Invite page (`/org/invite`):
  - email invite flow (pending invite)
  - direct member account creation with email/password (instant org membership)
- Org policies (`/org/settings`):
  - org-level enforcement mode
  - org-level work hours
  - org-level focus and distraction defaults
  - blocked domains list management
  - allowed domains list management

### Chrome extension features
- Google OAuth sign-in (Chrome Identity API)
- Email/password extension login
- Extension popup:
  - signed-out state with Google and email login
  - signed-in state showing focus/distraction budget, duck mood, pause status
  - pause/resume tracking for 15 minutes
  - open dashboard/onboarding via extension-to-web session bridge
  - sign out
- Background service worker:
  - tab activation/update tracking
  - 5-second debounce before tracking active tab
  - page classification and 24h cache per domain
  - activity reporting when leaving tab (duration-based)
  - heartbeat alarm every minute (`chrome.alarms`)
  - broadcast state updates to content scripts
  - pause enforcement logic and active work-window awareness
- Content script:
  - page scraping for title/meta/h1/h2/og
  - duck companion overlay with mood asset + tooltip messages
  - periodic guidance messages
  - classification-aware mood changes
  - gradual blur enforcement + full blocking overlay modes
  - hard org-policy block handling on matching blocked domains

### Backend engine features
- Auth:
  - NextAuth v5 + Prisma adapter
  - Google provider + Credentials provider
  - DB session strategy
  - custom auth pages
- Extension auth bridge:
  - extension JWT issuance (`/api/auth/extension-token`)
  - extension JWT -> web DB session cookie bridge (`/api/auth/extension-bridge`)
- Invite auto-accept:
  - pending invites accepted automatically when user signs in (web or extension)
  - seat updates on successful membership creation
- Classification pipeline:
  - org policy allow/block precedence
  - user overrides precedence
  - onboarding always-blocked/always-productive precedence
  - static preset fallback
  - DB cache fallback
  - AI classification (Anthropic primary, Gemini fallback)
- Productivity engine:
  - activity log ingestion
  - per-day summary upsert/update
  - distraction-limit and goal-complete detection
  - productivity score computation
- Garden engine:
  - plant spawn by productive minute tiers (15/30/60/120)
  - plant death when user exceeds distraction limit by thresholds
- Duck mood engine:
  - mood derived from productivity/distraction/limit/goal state

## 2. Route Map

### Web pages
- `/`
- `/login`
- `/signup`
- `/checkout`
- `/setup`
- `/onboarding`
- `/dashboard`
- `/garden`
- `/analytics`
- `/settings`
- `/rooms`
- `/rooms/[code]`
- `/org/setup`
- `/org/dashboard`
- `/org/members`
- `/org/invite`
- `/org/settings`
- `/auth-error`

### API endpoints
- `GET|POST /api/auth/[...nextauth]`
- `POST /api/auth/signup`
- `POST /api/auth/extension-token`
- `GET /api/auth/extension-bridge`
- `GET /api/dashboard/summary`
- `GET /api/analytics`
- `GET|POST /api/onboarding`
- `GET|PUT /api/settings`
- `GET|POST|DELETE /api/settings/overrides`
- `GET /api/garden`
- `POST /api/rooms`
- `POST /api/rooms/join`
- `GET /api/rooms/[code]`
- `PATCH /api/rooms/[code]/distraction`
- `POST /api/org/create`
- `GET /api/org/me`
- `POST /api/org/invite`
- `POST /api/org/members/create`
- `GET|PUT /api/org/policy`
- `OPTIONS|POST /api/extension/classify`
- `OPTIONS|POST /api/extension/activity`
- `OPTIONS|GET /api/extension/status`

## 3. Data Model (Prisma)

### Identity/auth models
- `User`
- `Account`
- `Session`
- `VerificationToken`

### Employee productivity models
- `OnboardingProfile`
- `UserSettings`
- `ActivityLog`
- `DailySummary`
- `WebsiteClassification`
- `UserWebsiteOverride`
- `Garden`
- `GardenPlant`
- `FocusRoom`
- `FocusRoomMember`

### Organization/admin models
- `Organization`
- `OrgMember`
- `OrgPolicy`
- `Subscription`
- `OrgInvite`

### Key enums
- `ProductivityType`, `DistractionLimitMode`, `EnforcementLevel`
- `SiteCategory`, `SiteSubcategory`, `DuckMood`
- `OrgRole`, `PlanTier`, `SubscriptionStatus`, `OrgInviteStatus`
- `PlantType`, `PlantStatus`, `FocusRoomStatus`

## 4. Classification and Enforcement Logic

### Classification precedence (highest to lowest)
1. Org blocked domains -> `DISTRACTION`
2. Org allowed domains -> `PRODUCTIVE`
3. User override table
4. Onboarding always-productive/always-blocked lists
5. Hardcoded preset domain maps
6. Cached DB classification (`WebsiteClassification`)
7. AI model classification (Anthropic, then Gemini)
8. fallback neutral

### Enforcement behavior
- Enforced only when:
  - not paused
  - inside active work window
- If domain is org-blocked:
  - `WARN_ONLY`: mild blur
  - `BLUR`/`BLOCK`/`SHAME_AND_BLOCK`: heavy blur + blocking overlay (message differs)
- For distraction domains:
  - `<50%` budget: no blur
  - `50–79%`: mild blur
  - `80–99%`: medium blur
  - `>=100%` and mode escalation applies

## 5. Tech Stack

- Next.js 16.2.4 (App Router)
- React 19.2.4
- NextAuth v5 beta + Prisma adapter
- Prisma 7.7 + PostgreSQL (`@prisma/adapter-pg`)
- Recharts
- Tailwind CSS v4
- Chrome Extension Manifest V3 (vanilla JS)
- Anthropic SDK + Gemini REST fallback

## 6. Local Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL database (local or hosted)
- Chrome browser for extension

### Environment variables (`web/.env`)
Required:
- `DATABASE_URL`
- `DIRECT_URL` (or reuse `DATABASE_URL`)
- `AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `EXTENSION_JWT_SECRET`

Optional (AI classification):
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`

Optional (seed):
- `SEED_EMAIL`

### Install and run
```bash
cd web
npm install
npx prisma migrate dev
npm run dev
```

### Seed demo data (optional)
```bash
cd web
npx tsx prisma/seed.ts --email=you@company.com
```

### Load extension
1. Open `chrome://extensions`
2. Enable Developer Mode
3. Load unpacked -> select `extension/`
4. Ensure web app is running at `http://localhost:3000`

## 7. Repository Structure

```text
QuackGoose/
  extension/
    manifest.json
    background.js
    content.js
    classification.js
    auth.js
    popup.html
    popup.js
    popup.css
    content.css
    duck-assets/
  web/
    app/
      api/
      dashboard/
      garden/
      analytics/
      settings/
      rooms/
      org/
      onboarding/
      login/
      signup/
      setup/
    components/
      layout/
      onboarding/
      ui/
    lib/
      auth.ts
      classificationService.ts
      productivityEngine.ts
      gardenService.ts
      duckMoodService.ts
      orgInviteService.ts
    prisma/
      schema.prisma
      migrations/
      seed.ts
```

## 8. Important Notes / Current Constraints

- Extension web endpoints are currently hardcoded to `http://localhost:3000` in `extension/auth.js` and `extension/popup.js`.
- `/org/billing` is linked from admin pages but route implementation is not present in this repo yet.
- Weekly email setting exists in UI + DB, but email delivery worker is not implemented in this repo.
- Middleware redirects protected employee routes to `/` when no session cookie is present.

## 9. Troubleshooting

### `P2022: The column User.password does not exist`
Cause: DB schema is behind code.
Fix:
```bash
cd web
npx prisma migrate dev
```

### `Failed to execute 'json' on 'Response': Unexpected end of JSON input`
Cause: frontend tried to parse empty/non-JSON error body.
Status: signup page now uses safe error parsing via `res.text()` + guarded JSON parse.

### Extension sign-in succeeds but web opens unauthenticated
Use `/api/auth/extension-bridge?token=...&next=/dashboard` so extension JWT is converted into NextAuth DB session cookies.

---

If you want, the next step can be a second document (`docs/API.md`) with request/response payload examples for every endpoint.
