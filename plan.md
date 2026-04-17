# QuackFocus — Detailed Build Plan

> Step-by-step implementation guide. Follow phases in order — each phase depends on the previous.

**Project layout:**
- `/Users/pranav/Desktop/QuackGoose/web/` — Next.js 16 app (already scaffolded)
- `/Users/pranav/Desktop/QuackGoose/extension/` — Chrome MV3 extension (empty)

**Tech stack locked:**
- Next.js 16 (App Router) — ⚠ breaking changes from prior versions, check `node_modules/next/dist/docs/` before using APIs
- React 19
- PostgreSQL + Prisma 7
- Tailwind CSS v4
- TypeScript
- Chrome Extension MV3 (vanilla JS)

---

## Table of Contents

- [Phase 0: External Services Setup](#phase-0-external-services-setup)
- [Phase 1: Database & Prisma](#phase-1-database--prisma)
- [Phase 2: Website Auth (NextAuth)](#phase-2-website-auth-nextauth)
- [Phase 3: Onboarding Flow (10 Questions)](#phase-3-onboarding-flow-10-questions)
- [Phase 4: Settings Page](#phase-4-settings-page)
- [Phase 5: Chrome Extension Scaffold](#phase-5-chrome-extension-scaffold)
- [Phase 6: Extension Google Auth](#phase-6-extension-google-auth)
- [Phase 7: Tab Tracking + Scraping](#phase-7-tab-tracking--scraping)
- [Phase 8: Classification API + AI](#phase-8-classification-api--ai)
- [Phase 9: Activity Logging + Daily Summary](#phase-9-activity-logging--daily-summary)
- [Phase 10: Enforcement (Blur + Cursor Block)](#phase-10-enforcement-blur--cursor-block)
- [Phase 11: Duck Overlay + Moods](#phase-11-duck-overlay--moods)
- [Phase 12: Dashboard](#phase-12-dashboard)
- [Phase 13: Garden System](#phase-13-garden-system)
- [Phase 14: Analytics Page](#phase-14-analytics-page)
- [Phase 15: Popup + Polish](#phase-15-popup--polish)
- [Phase 16: End-to-End Testing](#phase-16-end-to-end-testing)
- [Phase 17: Deployment](#phase-17-deployment)

---

## Phase 0: External Services Setup

Before writing any code, provision these external services. All of them are free to start.

### 0.1 PostgreSQL Database

Pick one provider. Recommended: **Neon** or **Supabase** (free tier, fast setup).

**Option A — Neon (recommended):**
1. Go to https://neon.tech and sign in
2. Create a new project named `quackfocus`
3. Copy the connection string (format: `postgresql://user:pass@host/db?sslmode=require`)
4. Save it — you'll need it as `DATABASE_URL`

**Option B — Local Postgres:**
```bash
brew install postgresql@16
brew services start postgresql@16
createdb quackfocus
# Connection string: postgresql://localhost:5432/quackfocus
```

### 0.2 Google OAuth Client

You need TWO OAuth clients — one for the website, one for the extension. They must live in the same Google Cloud Project so they share a consent screen.

1. Go to https://console.cloud.google.com
2. Create new project: `quackfocus`
3. Go to **APIs & Services → OAuth consent screen**:
   - Type: External
   - App name: QuackFocus
   - Add scopes: `openid`, `email`, `profile`
   - Add yourself as a test user
4. Go to **APIs & Services → Credentials**:

   **Web Client (for Next.js):**
   - Type: Web application
   - Name: QuackFocus Web
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - (Add production URL later)
   - Save `Client ID` and `Client Secret`

   **Chrome Extension Client:**
   - Type: Chrome App (if not available, pick "Web application" and use the extension ID pattern)
   - Application ID: leave blank initially — you'll update this after loading the extension and getting its ID
   - Save `Client ID`

### 0.3 AI Provider

Pick one — the classification service supports both:

**Option A — Anthropic Claude (recommended for classification):**
1. Go to https://console.anthropic.com
2. Create API key
3. Save as `ANTHROPIC_API_KEY`

**Option B — Google Gemini (free tier more generous):**
1. Go to https://aistudio.google.com
2. Create API key
3. Save as `GEMINI_API_KEY`

### 0.4 Save Credentials

Create a scratch file `secrets.scratch` (add to `.gitignore`) with:
```
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
EXTENSION_GOOGLE_CLIENT_ID=...
ANTHROPIC_API_KEY=sk-ant-...
# OR
GEMINI_API_KEY=...
```

---

## Phase 1: Database & Prisma

### 1.1 Install Prisma

```bash
cd /Users/pranav/Desktop/QuackGoose/web
npm install prisma@^7 @prisma/client@^7
npm install -D prisma@^7
npx prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` and `.env`.

### 1.2 Set DATABASE_URL

Edit `/Users/pranav/Desktop/QuackGoose/web/.env`:
```
DATABASE_URL="postgresql://user:pass@host:5432/quackfocus"
```

### 1.3 Write the Schema

Replace `prisma/schema.prisma` with the full schema from `architecture.md` section 12. Key models:

- `User`
- `OnboardingProfile`
- `UserSettings`
- `ActivityLog`
- `DailySummary`
- `WebsiteClassification`
- `UserWebsiteOverride`
- `Garden`
- `GardenPlant`

Plus enums: `ProductivityType`, `DistractionLimitMode`, `EnforcementLevel`, `SiteCategory`, `SiteSubcategory`, `DuckMood`, `PlantType`, `PlantStatus`.

### 1.4 Run First Migration

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 1.5 Create Prisma Singleton

Create `/Users/pranav/Desktop/QuackGoose/web/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 1.6 Verify

```bash
npx prisma studio
```
Open in browser — confirm all tables exist and are empty.

---

## Phase 2: Website Auth (NextAuth)

### 2.1 Install NextAuth v5 (Auth.js)

```bash
cd /Users/pranav/Desktop/QuackGoose/web
npm install next-auth@beta @auth/prisma-adapter
```

### 2.2 Add NextAuth Prisma Models

Add these to `prisma/schema.prisma` (required by `@auth/prisma-adapter`):

```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}
```

Also update `User`: add `accounts Account[]` and `sessions Session[]` relations.

Run migration:
```bash
npx prisma migrate dev --name add_nextauth
```

### 2.3 Create Auth Config

Create `/Users/pranav/Desktop/QuackGoose/web/lib/auth.ts`:

```typescript
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'database' },
  callbacks: {
    async session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After sign-in, check onboarding status on dashboard redirect
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/dashboard`;
    },
  },
});
```

### 2.4 Create Auth Route Handler

Create `/Users/pranav/Desktop/QuackGoose/web/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
```

### 2.5 Add Env Vars

Add to `/Users/pranav/Desktop/QuackGoose/web/.env`:
```
AUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

Generate secret:
```bash
openssl rand -base64 32
```

### 2.6 Add Session Middleware for Protected Routes

Create `/Users/pranav/Desktop/QuackGoose/web/middleware.ts`:

```typescript
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const PROTECTED = ['/dashboard', '/garden', '/analytics', '/settings', '/onboarding'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  if (isProtected && !req.auth) {
    return NextResponse.redirect(new URL('/', req.url));
  }
});

export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] };
```

### 2.7 Landing Page with Sign-In

Edit `/Users/pranav/Desktop/QuackGoose/web/app/page.tsx`:

```tsx
import { signIn, auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();
  if (session) redirect('/dashboard');

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-white">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold">🦆 QuackFocus</h1>
        <p className="text-xl text-gray-600">Your focus, enforced.</p>
        <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/dashboard' }); }}>
          <button className="bg-black text-white px-6 py-3 rounded-lg">Sign in with Google</button>
        </form>
      </div>
    </main>
  );
}
```

### 2.8 Post-Sign-In Onboarding Check

Create `/Users/pranav/Desktop/QuackGoose/web/app/dashboard/layout.tsx`:

```tsx
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true },
  });

  if (!user?.onboardingCompleted) redirect('/onboarding');
  return <>{children}</>;
}
```

### 2.9 Verify

```bash
npm run dev
```
Visit http://localhost:3000 → click sign in → approve → should redirect to `/onboarding` (404 for now — build in Phase 3).

---

## Phase 3: Onboarding Flow (10 Questions)

### 3.1 Create Onboarding Page

Create `/Users/pranav/Desktop/QuackGoose/web/app/onboarding/page.tsx`:

- Multi-step client component wizard
- One question per screen with Next/Back navigation
- Progress bar (1/10, 2/10, ...)
- Final "Submit" button calls `POST /api/onboarding`

Questions (from architecture.md section 5.2):

| # | Field | Input Type |
|---|-------|-----------|
| 1 | `productivityType` | Radio group (6 options) |
| 2 | `distractionTypes` | Multi-checkbox (6 options) |
| 3 | `strictnessLevel` | Slider 1–5 |
| 4 | `dailyFocusGoalMinutes` | Number input (hours, converted) |
| 5 | `workStartTime` | Time picker |
| 6 | `workEndTime` | Time picker |
| 7 | `distractionLimit` | Radio: 15/30/60/120 min or "goal-based" |
| 8 | `alwaysBlockedDomains` | Text area (comma-separated) |
| 9 | `alwaysProductiveDomains` | Text area (comma-separated) |
| 10 | `enforcementLevel` | Radio (4 options) |

### 3.2 Create Onboarding API

Create `/Users/pranav/Desktop/QuackGoose/web/app/api/onboarding/route.ts`:

```typescript
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const userId = session.user.id;

  // Determine distraction limit mode
  const isGoalBased = body.distractionLimit === 'goal_based';
  const distractionLimitMode = isGoalBased ? 'GOAL_BASED' : 'TIME_BASED';
  const distractionLimitMinutes = isGoalBased ? 0 : parseInt(body.distractionLimit);

  // Parse domain lists
  const parseDomains = (s: string) =>
    s.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);

  await prisma.$transaction([
    prisma.onboardingProfile.create({
      data: {
        userId,
        productivityType: body.productivityType,
        distractionTypes: body.distractionTypes,
        strictnessLevel: body.strictnessLevel,
        dailyFocusGoalMinutes: body.dailyFocusGoalHours * 60,
        workStartTime: body.workStartTime,
        workEndTime: body.workEndTime,
        distractionLimitMode,
        distractionLimitMinutes,
        alwaysBlockedDomains: parseDomains(body.alwaysBlockedDomains),
        alwaysProductiveDomains: parseDomains(body.alwaysProductiveDomains),
        enforcementLevel: body.enforcementLevel,
      },
    }),
    prisma.userSettings.create({
      data: {
        userId,
        distractionLimitMode,
        distractionLimitMinutes,
        dailyFocusGoalMinutes: body.dailyFocusGoalHours * 60,
        enforcementLevel: body.enforcementLevel,
        workStartTime: body.workStartTime,
        workEndTime: body.workEndTime,
      },
    }),
    prisma.garden.create({ data: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    }),
  ]);

  return NextResponse.json({ success: true });
}
```

### 3.3 Build UI Components

Create in `/Users/pranav/Desktop/QuackGoose/web/components/onboarding/`:
- `QuestionWizard.tsx` — state management, navigation
- `Question1_ProductivityType.tsx` through `Question10_Enforcement.tsx`
- Each exports `{ value, onChange }` props pattern

Use Tailwind for styling. Keep design simple and focused.

### 3.4 Verify

- Sign in → land on onboarding
- Complete all 10 questions → submit
- Should redirect to `/dashboard`
- Check Prisma Studio: `OnboardingProfile`, `UserSettings`, `Garden` all populated
- `User.onboardingCompleted = true`

---

## Phase 4: Settings Page

### 4.1 Create Settings API

Create `/Users/pranav/Desktop/QuackGoose/web/app/api/settings/route.ts`:

```typescript
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const updated = await prisma.userSettings.update({
    where: { userId: session.user.id },
    data: body,
  });
  return NextResponse.json(updated);
}
```

### 4.2 Create Settings Page

Create `/Users/pranav/Desktop/QuackGoose/web/app/settings/page.tsx`:

- Form pre-filled from GET `/api/settings`
- Allow editing: distraction limit, daily goal, work hours, enforcement level, duck enabled, weekly email
- Save button calls PUT `/api/settings`

### 4.3 Custom Website Overrides

Create `/Users/pranav/Desktop/QuackGoose/web/app/api/settings/overrides/route.ts`:
- GET: list all `UserWebsiteOverride` for current user
- POST: add override `{ domain, category }`
- DELETE: remove override by domain

Add a section in settings page:
- Text input + dropdown (productive/distraction/neutral) + "Add" button
- Table of existing overrides with delete button per row

---

## Phase 5: Chrome Extension Scaffold

### 5.1 Create File Structure

```bash
cd /Users/pranav/Desktop/QuackGoose/extension
mkdir -p duck-assets
touch manifest.json background.js content.js content.css popup.html popup.js popup.css
```

### 5.2 Write manifest.json

Create `/Users/pranav/Desktop/QuackGoose/extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "QuackFocus",
  "version": "1.0.0",
  "description": "Your focus, enforced by a duck.",
  "permissions": [
    "tabs",
    "webNavigation",
    "storage",
    "alarms",
    "scripting",
    "identity"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle",
      "all_frames": false
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "QuackFocus",
    "default_icon": {
      "16": "duck-assets/icon-16.png",
      "48": "duck-assets/icon-48.png",
      "128": "duck-assets/icon-128.png"
    }
  },
  "web_accessible_resources": [
    {
      "resources": ["duck-assets/*"],
      "matches": ["<all_urls>"]
    }
  ],
  "oauth2": {
    "client_id": "YOUR_EXTENSION_CLIENT_ID.apps.googleusercontent.com",
    "scopes": ["openid", "email", "profile"]
  },
  "key": "GENERATE_WITH_CHROME_LOADED_EXTENSION"
}
```

### 5.3 Add Placeholder Duck Assets

Until final assets exist, add 9 placeholder PNGs (any duck images, even same one duplicated):

Required files in `duck-assets/`:
- `duck-happy.png`
- `duck-idle.png`
- `duck-sleepy.png`
- `duck-watching.png`
- `duck-warning.png`
- `duck-angry.png`
- `duck-chaos.png`
- `duck-proud.png`
- `duck-disappointed.png`
- `icon-16.png`, `icon-48.png`, `icon-128.png`

### 5.4 Minimal background.js

```javascript
// background.js
console.log('[QuackFocus] Service worker loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[QuackFocus] Extension installed');
});

// Keep alive heartbeat
chrome.alarms.create('heartbeat', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'heartbeat') {
    console.log('[QuackFocus] Heartbeat tick');
  }
});
```

### 5.5 Minimal content.js

```javascript
console.log('[QuackFocus] Content script loaded on', location.hostname);
```

### 5.6 Minimal popup.html

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><link rel="stylesheet" href="popup.css"></head>
<body>
  <div class="container">
    <h1>🦆 QuackFocus</h1>
    <div id="status">Loading…</div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

Add basic `popup.css` (width: 300px, padding, font).

### 5.7 Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select `/Users/pranav/Desktop/QuackGoose/extension/`
4. Copy the **Extension ID** (shown under the extension card)
5. Update Google OAuth client:
   - Go to Google Cloud Console → Credentials
   - Edit the Chrome extension client
   - Set Application ID to the extension ID
6. Update `manifest.json`:
   - Replace `YOUR_EXTENSION_CLIENT_ID` with the actual client ID
7. Reload the extension in Chrome

### 5.8 Verify

- Open DevTools → Console on any page → should see `[QuackFocus] Content script loaded`
- Open `chrome://extensions/` → click "Service Worker" → see `[QuackFocus] Service worker loaded`
- Click extension icon → see popup with "🦆 QuackFocus" heading

---

## Phase 6: Extension Google Auth

### 6.1 Add Extension Token Exchange API

Install JWT library:
```bash
cd /Users/pranav/Desktop/QuackGoose/web
npm install jose
```

Create `/Users/pranav/Desktop/QuackGoose/web/app/api/auth/extension-token/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SignJWT } from 'jose';

const EXT_JWT_SECRET = new TextEncoder().encode(process.env.EXTENSION_JWT_SECRET!);

export async function POST(req: Request) {
  const { googleAccessToken } = await req.json();
  if (!googleAccessToken) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  // Verify token with Google
  const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${googleAccessToken}` },
  });
  if (!userinfoRes.ok) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  const userinfo = await userinfoRes.json();

  // Find or create user
  let user = await prisma.user.findUnique({ where: { googleId: userinfo.sub } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        googleId: userinfo.sub,
        email: userinfo.email,
        name: userinfo.name || userinfo.email,
        avatarUrl: userinfo.picture,
      },
    });
  }

  // Issue signed JWT (30 days)
  const jwt = await new SignJWT({ userId: user.id, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .setIssuedAt()
    .sign(EXT_JWT_SECRET);

  return NextResponse.json({
    token: jwt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      onboardingCompleted: user.onboardingCompleted,
    },
  });
}
```

Add `EXTENSION_JWT_SECRET` to `.env` (generate with `openssl rand -base64 32`).

### 6.2 Helper to Verify Extension JWT

Create `/Users/pranav/Desktop/QuackGoose/web/lib/extensionAuth.ts`:

```typescript
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.EXTENSION_JWT_SECRET!);

export async function verifyExtensionToken(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch {
    return null;
  }
}
```

### 6.3 Extension Auth Logic

Create `/Users/pranav/Desktop/QuackGoose/extension/auth.js`:

```javascript
const API_BASE = 'http://localhost:3000';

export async function signIn() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        return reject(chrome.runtime.lastError);
      }
      try {
        const res = await fetch(`${API_BASE}/api/auth/extension-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ googleAccessToken: token }),
        });
        if (!res.ok) throw new Error('Token exchange failed');
        const data = await res.json();
        await chrome.storage.local.set({
          qf_token: data.token,
          qf_user: data.user,
        });
        resolve(data.user);
      } catch (err) { reject(err); }
    });
  });
}

export async function getAuthState() {
  const { qf_token, qf_user } = await chrome.storage.local.get(['qf_token', 'qf_user']);
  return { token: qf_token, user: qf_user };
}

export async function signOut() {
  const { qf_token } = await chrome.storage.local.get('qf_token');
  if (qf_token) await chrome.storage.local.remove(['qf_token', 'qf_user']);
  chrome.identity.clearAllCachedAuthTokens();
}

export async function authFetch(path, options = {}) {
  const { qf_token } = await chrome.storage.local.get('qf_token');
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${qf_token}`,
    },
  });
}
```

### 6.4 Update Popup to Show Sign-In

Edit `/Users/pranav/Desktop/QuackGoose/extension/popup.js`:

```javascript
import { signIn, signOut, getAuthState } from './auth.js';

async function render() {
  const { user } = await getAuthState();
  const statusEl = document.getElementById('status');
  statusEl.innerHTML = '';

  if (!user) {
    const btn = document.createElement('button');
    btn.textContent = 'Sign in with Google';
    btn.onclick = async () => {
      try { await signIn(); await render(); }
      catch (e) { alert('Sign-in failed: ' + e.message); }
    };
    statusEl.appendChild(btn);
    return;
  }

  if (!user.onboardingCompleted) {
    statusEl.innerHTML = `
      <p>Welcome, ${user.name}!</p>
      <p>Complete onboarding on the website:</p>
      <a href="http://localhost:3000/onboarding" target="_blank">Open Onboarding</a>
    `;
    return;
  }

  statusEl.innerHTML = `
    <p>Hello, ${user.name}!</p>
    <p>Tracking active.</p>
    <button id="signout">Sign out</button>
  `;
  document.getElementById('signout').onclick = async () => { await signOut(); await render(); };
}

render();
```

Note: popup.html must use `<script type="module" src="popup.js"></script>` for imports.

### 6.5 CORS for Extension

Since the extension origin is `chrome-extension://<id>`, configure CORS on the Next.js API:

Create `/Users/pranav/Desktop/QuackGoose/web/lib/cors.ts`:

```typescript
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export function corsResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
```

Add `OPTIONS` handler to each extension API route:
```typescript
export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}
```

### 6.6 Verify

1. Click extension icon → popup shows "Sign in with Google"
2. Click sign in → approve → popup shows user's name
3. Check Prisma Studio → `User` record exists
4. Check `chrome.storage.local` in DevTools → sees `qf_token` and `qf_user`

---

## Phase 7: Tab Tracking + Scraping

### 7.1 Tab State Manager in background.js

Replace `background.js` with full tab tracker:

```javascript
import { authFetch, getAuthState } from './auth.js';

let currentTab = null;        // { tabId, url, hostname, startedAt, titlePending }
let debounceTimer = null;
const DEBOUNCE_MS = 5000;

async function onTabChange(tabId, url, title) {
  const hostname = tryHostname(url);
  if (!hostname) return;

  // Finalize previous tab first
  await finalizePreviousTab();

  // Set new pending tab with debounce
  clearTimeout(debounceTimer);
  currentTab = null;

  debounceTimer = setTimeout(async () => {
    currentTab = {
      tabId, url, hostname,
      title: title || hostname,
      startedAt: Date.now(),
    };
    await handleActiveTab(tabId, hostname, title);
  }, DEBOUNCE_MS);
}

async function finalizePreviousTab() {
  if (!currentTab) return;
  const endedAt = Date.now();
  const durationSeconds = Math.floor((endedAt - currentTab.startedAt) / 1000);

  if (durationSeconds < 5) { currentTab = null; return; }

  const classification = await getClassification(currentTab.hostname, currentTab.title);

  try {
    const res = await authFetch('/api/extension/activity', {
      method: 'POST',
      body: JSON.stringify({
        domain: currentTab.hostname,
        pageTitle: currentTab.title,
        category: classification.category,
        subcategory: classification.subcategory,
        isProductive: classification.category === 'PRODUCTIVE',
        durationSeconds,
        startedAt: new Date(currentTab.startedAt).toISOString(),
        endedAt: new Date(endedAt).toISOString(),
      }),
    });
    const data = await res.json();
    // Broadcast mood update + enforcement state to all tabs
    await broadcastState(data);
  } catch (e) {
    console.error('[QuackFocus] activity report failed', e);
  } finally {
    currentTab = null;
  }
}

async function handleActiveTab(tabId, hostname, title) {
  const classification = await getClassification(hostname, title);
  // Tell content.js about classification so it can show proper duck mood
  chrome.tabs.sendMessage(tabId, {
    type: 'PAGE_CLASSIFIED',
    payload: { category: classification.category, hostname },
  }).catch(() => {});
}

function tryHostname(url) {
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    return u.hostname;
  } catch { return null; }
}

async function broadcastState(statusData) {
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) {
    chrome.tabs.sendMessage(t.id, {
      type: 'STATE_UPDATE',
      payload: statusData,
    }).catch(() => {});
  }
}

// Tab activation
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab.url) onTabChange(tabId, tab.url, tab.title);
});

// URL change in same tab
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' && tab.active && tab.url) {
    onTabChange(tabId, tab.url, tab.title);
  }
});

// Tab closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (currentTab?.tabId === tabId) finalizePreviousTab();
});

// Browser window focus
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) finalizePreviousTab();
});

// Heartbeat — refresh status from server
chrome.alarms.create('heartbeat', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'heartbeat') return;
  const { token } = await getAuthState();
  if (!token) return;
  try {
    const res = await authFetch('/api/extension/status');
    const data = await res.json();
    await chrome.storage.local.set({ qf_status: data });
    await broadcastState(data);
  } catch {}
});

// Import classification logic
import { getClassification } from './classification.js';
```

### 7.2 Create Classification Module

Create `/Users/pranav/Desktop/QuackGoose/extension/classification.js`:

```javascript
import { authFetch } from './auth.js';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export async function getClassification(hostname, title) {
  const cacheKey = `cls_${hostname}`;
  const cached = (await chrome.storage.local.get(cacheKey))[cacheKey];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // Ask content script to scrape the active page (best-effort)
  const pageData = await requestScrape(hostname) || { title, domain: hostname };

  try {
    const res = await authFetch('/api/extension/classify', {
      method: 'POST',
      body: JSON.stringify(pageData),
    });
    const data = await res.json();
    await chrome.storage.local.set({
      [cacheKey]: { data, expiresAt: Date.now() + CACHE_TTL_MS },
    });
    return data;
  } catch (e) {
    console.error('[QuackFocus] classify failed', e);
    return { category: 'NEUTRAL', subcategory: 'OTHER', confidence: 0 };
  }
}

async function requestScrape(hostname) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return null;
  try {
    return await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PAGE' });
  } catch { return null; }
}
```

### 7.3 Add Scrape Handler to content.js

```javascript
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SCRAPE_PAGE') {
    const data = {
      domain: location.hostname,
      title: document.title,
      metaDescription: document.querySelector('meta[name="description"]')?.content || '',
      h1: document.querySelector('h1')?.innerText?.slice(0, 200) || '',
      h2s: [...document.querySelectorAll('h2')].slice(0, 5).map(h => h.innerText.slice(0, 100)),
      ogType: document.querySelector('meta[property="og:type"]')?.content || '',
    };
    sendResponse(data);
    return true;
  }
});
```

### 7.4 Verify

- Sign in via extension
- Browse some pages
- Check service worker console: see activity POSTs firing
- Check Prisma Studio → `ActivityLog` records appearing (after Phase 8 + 9)

---

## Phase 8: Classification API + AI

### 8.1 Preset Classification Lists

Create `/Users/pranav/Desktop/QuackGoose/web/lib/presetClassifications.ts`:

```typescript
export const ALWAYS_PRODUCTIVE: Record<string, string> = {
  'github.com': 'CODING',
  'gitlab.com': 'CODING',
  'stackoverflow.com': 'CODING',
  'docs.google.com': 'DOCUMENTATION',
  'notion.so': 'PRODUCTIVITY_TOOL',
  'linear.app': 'PRODUCTIVITY_TOOL',
  'figma.com': 'DESIGN',
  'vercel.com': 'CODING',
  'developer.mozilla.org': 'DOCUMENTATION',
  'npmjs.com': 'CODING',
  'claude.ai': 'PRODUCTIVITY_TOOL',
  'chat.openai.com': 'PRODUCTIVITY_TOOL',
};

export const ALWAYS_DISTRACTION: Record<string, string> = {
  'youtube.com': 'VIDEO_ENTERTAINMENT',
  'instagram.com': 'SOCIAL_MEDIA',
  'twitter.com': 'SOCIAL_MEDIA',
  'x.com': 'SOCIAL_MEDIA',
  'facebook.com': 'SOCIAL_MEDIA',
  'tiktok.com': 'VIDEO_ENTERTAINMENT',
  'reddit.com': 'SOCIAL_MEDIA',
  'netflix.com': 'VIDEO_ENTERTAINMENT',
  'twitch.tv': 'VIDEO_ENTERTAINMENT',
  'amazon.com': 'SHOPPING',
};

export function checkPreset(domain: string): { category: string; subcategory: string } | null {
  const d = domain.replace(/^www\./, '');
  if (ALWAYS_PRODUCTIVE[d]) return { category: 'PRODUCTIVE', subcategory: ALWAYS_PRODUCTIVE[d] };
  if (ALWAYS_DISTRACTION[d]) return { category: 'DISTRACTION', subcategory: ALWAYS_DISTRACTION[d] };
  return null;
}
```

### 8.2 AI Classification Service

Install Anthropic SDK (if using Claude):
```bash
cd /Users/pranav/Desktop/QuackGoose/web
npm install @anthropic-ai/sdk
```

Create `/Users/pranav/Desktop/QuackGoose/web/lib/classificationService.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { checkPreset } from './presetClassifications';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ScrapeInput {
  domain: string;
  title?: string;
  metaDescription?: string;
  h1?: string;
  h2s?: string[];
  ogType?: string;
}

interface ClassificationResult {
  category: 'PRODUCTIVE' | 'DISTRACTION' | 'NEUTRAL';
  subcategory: string;
  confidence: number;
  cached: boolean;
}

export async function classifyPage(
  userId: string,
  input: ScrapeInput
): Promise<ClassificationResult> {
  const normalizedDomain = input.domain.replace(/^www\./, '').toLowerCase();

  // 1. Check user override
  const override = await prisma.userWebsiteOverride.findUnique({
    where: { userId_domain: { userId, domain: normalizedDomain } },
  });
  if (override) {
    return { category: override.category, subcategory: 'OTHER', confidence: 1, cached: true };
  }

  // 2. Check onboarding always-lists
  const profile = await prisma.onboardingProfile.findUnique({ where: { userId } });
  if (profile?.alwaysProductiveDomains.includes(normalizedDomain)) {
    return { category: 'PRODUCTIVE', subcategory: 'OTHER', confidence: 1, cached: true };
  }
  if (profile?.alwaysBlockedDomains.includes(normalizedDomain)) {
    return { category: 'DISTRACTION', subcategory: 'OTHER', confidence: 1, cached: true };
  }

  // 3. Check preset lists
  const preset = checkPreset(normalizedDomain);
  if (preset) {
    return { ...preset, confidence: 1, cached: true } as ClassificationResult;
  }

  // 4. Check DB cache
  const cached = await prisma.websiteClassification.findUnique({
    where: { domain: normalizedDomain },
  });
  if (cached && cached.expiresAt > new Date()) {
    return {
      category: cached.category,
      subcategory: cached.subcategory,
      confidence: cached.confidence,
      cached: true,
    };
  }

  // 5. Call AI
  const result = await callClaude(profile?.productivityType || 'OTHER', input);

  // 6. Cache in DB
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.websiteClassification.upsert({
    where: { domain: normalizedDomain },
    create: {
      domain: normalizedDomain,
      category: result.category,
      subcategory: result.subcategory,
      confidence: result.confidence,
      aiClassified: true,
      expiresAt,
    },
    update: {
      category: result.category,
      subcategory: result.subcategory,
      confidence: result.confidence,
      classifiedAt: new Date(),
      expiresAt,
    },
  });

  return { ...result, cached: false };
}

async function callClaude(productivityType: string, input: ScrapeInput) {
  const prompt = `You are classifying a website for a productivity tracking app.

User's work type: ${productivityType}

Website info:
- Domain: ${input.domain}
- Page title: ${input.title || 'N/A'}
- Meta description: ${input.metaDescription || 'N/A'}
- Main heading: ${input.h1 || 'N/A'}
- Sub-headings: ${input.h2s?.join(' | ') || 'N/A'}
- OG type: ${input.ogType || 'N/A'}

Classify this page. Return ONLY a JSON object, no prose:
{
  "category": "PRODUCTIVE" | "DISTRACTION" | "NEUTRAL",
  "subcategory": one of [CODING, DOCUMENTATION, RESEARCH, WRITING, DESIGN, LEARNING, SOCIAL_MEDIA, VIDEO_ENTERTAINMENT, NEWS, SHOPPING, GAMING, COMMUNICATION, PRODUCTIVITY_TOOL, OTHER],
  "confidence": 0.0-1.0,
  "reasoning": "one sentence"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { category: 'NEUTRAL' as const, subcategory: 'OTHER', confidence: 0 };
  }
  const parsed = JSON.parse(jsonMatch[0]);
  // Guard low confidence
  if (parsed.confidence < 0.6) parsed.category = 'NEUTRAL';
  return parsed;
}
```

### 8.3 Classify API Route

Create `/Users/pranav/Desktop/QuackGoose/web/app/api/extension/classify/route.ts`:

```typescript
import { verifyExtensionToken } from '@/lib/extensionAuth';
import { classifyPage } from '@/lib/classificationService';
import { corsHeaders, corsResponse } from '@/lib/cors';

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

export async function POST(req: Request) {
  const userId = await verifyExtensionToken(req);
  if (!userId) return corsResponse({ error: 'Unauthorized' }, 401);
  const body = await req.json();
  const result = await classifyPage(userId, body);
  return corsResponse(result);
}
```

### 8.4 Verify

- Visit `github.com` → should hit preset list → `PRODUCTIVE`
- Visit a random blog → should hit AI → check Anthropic dashboard for API call
- Visit same blog again → cached → no new API call
- Check `WebsiteClassification` table in Prisma Studio

---

## Phase 9: Activity Logging + Daily Summary

### 9.1 Activity API Route

Create `/Users/pranav/Desktop/QuackGoose/web/app/api/extension/activity/route.ts`:

```typescript
import { verifyExtensionToken } from '@/lib/extensionAuth';
import { prisma } from '@/lib/prisma';
import { corsHeaders, corsResponse } from '@/lib/cors';
import { recordActivity } from '@/lib/productivityEngine';

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

export async function POST(req: Request) {
  const userId = await verifyExtensionToken(req);
  if (!userId) return corsResponse({ error: 'Unauthorized' }, 401);
  const body = await req.json();
  const result = await recordActivity(userId, body);
  return corsResponse(result);
}
```

### 9.2 Productivity Engine

Create `/Users/pranav/Desktop/QuackGoose/web/lib/productivityEngine.ts`:

```typescript
import { prisma } from '@/lib/prisma';
import type { SiteCategory, SiteSubcategory } from '@prisma/client';
import { spawnPlantIfEarned, killPlantsIfOverLimit } from './gardenService';
import { computeDuckMood } from './duckMoodService';

interface ActivityInput {
  domain: string;
  pageTitle: string;
  category: SiteCategory;
  subcategory: SiteSubcategory;
  isProductive: boolean;
  durationSeconds: number;
  startedAt: string;
  endedAt: string;
}

export async function recordActivity(userId: string, input: ActivityInput) {
  const startedAt = new Date(input.startedAt);
  const endedAt = new Date(input.endedAt);
  const date = new Date(Date.UTC(
    startedAt.getUTCFullYear(),
    startedAt.getUTCMonth(),
    startedAt.getUTCDate()
  ));

  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings) throw new Error('Settings missing');

  // 1. Insert activity log
  await prisma.activityLog.create({
    data: {
      userId,
      domain: input.domain,
      pageTitle: input.pageTitle,
      category: input.category,
      subcategory: input.subcategory,
      isProductive: input.isProductive,
      startedAt,
      endedAt,
      durationSeconds: input.durationSeconds,
      date,
    },
  });

  // 2. Upsert daily summary
  const durationMinutes = input.durationSeconds / 60;
  const summary = await prisma.dailySummary.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      distractionLimitMinutes: settings.distractionLimitMinutes,
      totalFocusMinutes: input.category === 'PRODUCTIVE' ? Math.round(durationMinutes) : 0,
      totalDistractionMinutes: input.category === 'DISTRACTION' ? Math.round(durationMinutes) : 0,
      totalNeutralMinutes: input.category === 'NEUTRAL' ? Math.round(durationMinutes) : 0,
    },
    update: {
      totalFocusMinutes: {
        increment: input.category === 'PRODUCTIVE' ? Math.round(durationMinutes) : 0,
      },
      totalDistractionMinutes: {
        increment: input.category === 'DISTRACTION' ? Math.round(durationMinutes) : 0,
      },
      totalNeutralMinutes: {
        increment: input.category === 'NEUTRAL' ? Math.round(durationMinutes) : 0,
      },
    },
  });

  // 3. Check limit
  const limitReached = settings.distractionLimitMode === 'TIME_BASED'
    ? summary.totalDistractionMinutes >= settings.distractionLimitMinutes
    : summary.totalFocusMinutes < settings.dailyFocusGoalMinutes && input.category === 'DISTRACTION';

  const productiveDayComplete = summary.totalFocusMinutes >= settings.dailyFocusGoalMinutes;

  // 4. Compute productivity score
  const focusRatio = Math.min(summary.totalFocusMinutes / settings.dailyFocusGoalMinutes, 1);
  const distractionPenalty = settings.distractionLimitMinutes > 0
    ? Math.min(summary.totalDistractionMinutes / settings.distractionLimitMinutes, 1)
    : 0;
  const score = Math.round(focusRatio * 100 * (1 - distractionPenalty * 0.3));

  await prisma.dailySummary.update({
    where: { userId_date: { userId, date } },
    data: { limitReached, productiveDayComplete, productivityScore: score },
  });

  // 5. Garden events
  let gardenEvent: 'plant_added' | 'plant_removed' | null = null;
  if (input.category === 'PRODUCTIVE') {
    const added = await spawnPlantIfEarned(userId, summary.totalFocusMinutes, date);
    if (added) gardenEvent = 'plant_added';
  } else if (input.category === 'DISTRACTION' && limitReached) {
    const killed = await killPlantsIfOverLimit(
      userId,
      summary.totalDistractionMinutes,
      settings.distractionLimitMinutes
    );
    if (killed) gardenEvent = 'plant_removed';
  }

  // 6. Compute duck mood
  const duckMood = await computeDuckMood(userId, {
    isCurrentlyProductive: input.category === 'PRODUCTIVE',
    distractionUsedMinutes: summary.totalDistractionMinutes,
    distractionLimitMinutes: settings.distractionLimitMinutes,
    productiveDayComplete,
    currentSiteCategory: input.category,
  });

  return {
    gardenEvent,
    duckMood,
    distractionUsedPercent: Math.min(
      (summary.totalDistractionMinutes / Math.max(settings.distractionLimitMinutes, 1)) * 100,
      100
    ),
    limitReached,
    productiveDayComplete,
    totalFocusMinutes: summary.totalFocusMinutes,
    totalDistractionMinutes: summary.totalDistractionMinutes,
  };
}
```

### 9.3 Duck Mood Service (stub for now)

Create `/Users/pranav/Desktop/QuackGoose/web/lib/duckMoodService.ts`:

```typescript
import type { DuckMood } from '@prisma/client';

interface MoodInput {
  isCurrentlyProductive: boolean;
  distractionUsedMinutes: number;
  distractionLimitMinutes: number;
  productiveDayComplete: boolean;
  currentSiteCategory: string;
}

export async function computeDuckMood(_userId: string, input: MoodInput): Promise<DuckMood> {
  const pct = input.distractionLimitMinutes > 0
    ? input.distractionUsedMinutes / input.distractionLimitMinutes
    : 0;

  if (input.productiveDayComplete) return 'PROUD';
  if (input.isCurrentlyProductive) return 'HAPPY';
  if (pct >= 1.0) return 'CHAOS';
  if (pct >= 0.8) return 'ANGRY';
  if (pct >= 0.5) return 'WARNING';
  if (input.currentSiteCategory === 'NEUTRAL') return 'WATCHING';
  return 'IDLE';
}
```

### 9.4 Garden Service (stub)

Create `/Users/pranav/Desktop/QuackGoose/web/lib/gardenService.ts`:

```typescript
import { prisma } from '@/lib/prisma';
import type { PlantType } from '@prisma/client';

const PLANT_TIERS: { minutes: number; plant: PlantType }[] = [
  { minutes: 15, plant: 'SMALL_FLOWER' },
  { minutes: 30, plant: 'MEDIUM_FLOWER' },
  { minutes: 60, plant: 'SMALL_TREE' },
  { minutes: 120, plant: 'LARGE_TREE' },
];

export async function spawnPlantIfEarned(userId: string, totalFocusToday: number, date: Date) {
  // Find highest unlocked tier
  const eligible = PLANT_TIERS.filter(t => totalFocusToday >= t.minutes);
  if (eligible.length === 0) return false;

  // Check if plant for the latest tier was already spawned today
  const garden = await prisma.garden.findUnique({ where: { userId } });
  if (!garden) return false;

  for (const tier of eligible) {
    const existing = await prisma.gardenPlant.findFirst({
      where: { gardenId: garden.id, plantType: tier.plant, sourceDate: date },
    });
    if (existing) continue;

    // Spawn it
    const countSameDate = await prisma.gardenPlant.count({
      where: { gardenId: garden.id, sourceDate: date },
    });
    await prisma.gardenPlant.create({
      data: {
        gardenId: garden.id,
        plantType: tier.plant,
        positionX: Math.floor(Math.random() * 10),
        positionY: Math.floor(Math.random() * 10),
        sourceDate: date,
      },
    });
    await prisma.garden.update({
      where: { id: garden.id },
      data: { totalPlants: { increment: 1 }, alivePlants: { increment: 1 } },
    });
    return true;
  }
  return false;
}

export async function killPlantsIfOverLimit(
  userId: string,
  distractionUsed: number,
  limit: number
) {
  const over = distractionUsed - limit;
  if (over < 30) return false;

  const expectedDeaths = Math.floor(over / 30);
  const garden = await prisma.garden.findUnique({
    where: { userId },
    include: { plants: { where: { status: 'ALIVE' } } },
  });
  if (!garden || garden.plants.length === 0) return false;

  const alreadyKilledToday = await prisma.gardenPlant.count({
    where: {
      gardenId: garden.id,
      status: 'DEAD',
      diedAt: { gte: new Date(new Date().toDateString()) },
    },
  });
  const toKill = expectedDeaths - alreadyKilledToday;
  if (toKill <= 0) return false;

  const victims = garden.plants.slice(0, toKill);
  for (const p of victims) {
    await prisma.gardenPlant.update({
      where: { id: p.id },
      data: { status: 'DEAD', diedAt: new Date() },
    });
  }
  await prisma.garden.update({
    where: { id: garden.id },
    data: { alivePlants: { decrement: toKill } },
  });
  return toKill > 0;
}
```

### 9.5 Status Endpoint

Create `/Users/pranav/Desktop/QuackGoose/web/app/api/extension/status/route.ts`:

```typescript
import { verifyExtensionToken } from '@/lib/extensionAuth';
import { prisma } from '@/lib/prisma';
import { corsHeaders, corsResponse } from '@/lib/cors';
import { computeDuckMood } from '@/lib/duckMoodService';

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

export async function GET(req: Request) {
  const userId = await verifyExtensionToken(req);
  if (!userId) return corsResponse({ error: 'Unauthorized' }, 401);

  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings) return corsResponse({ error: 'No settings' }, 404);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const summary = await prisma.dailySummary.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  const distractionUsed = summary?.totalDistractionMinutes || 0;
  const productiveMinutes = summary?.totalFocusMinutes || 0;

  const limitReached = settings.distractionLimitMode === 'TIME_BASED'
    ? distractionUsed >= settings.distractionLimitMinutes
    : productiveMinutes < settings.dailyFocusGoalMinutes;

  const productiveDayComplete = productiveMinutes >= settings.dailyFocusGoalMinutes;

  const duckMood = await computeDuckMood(userId, {
    isCurrentlyProductive: false,
    distractionUsedMinutes: distractionUsed,
    distractionLimitMinutes: settings.distractionLimitMinutes,
    productiveDayComplete,
    currentSiteCategory: 'NEUTRAL',
  });

  return corsResponse({
    userId,
    duckMood,
    distractionLimitMinutes: settings.distractionLimitMinutes,
    distractionUsedMinutes: distractionUsed,
    totalFocusMinutes: productiveMinutes,
    dailyFocusGoalMinutes: settings.dailyFocusGoalMinutes,
    limitReached,
    productiveDayComplete,
    enforceMode: settings.enforcementLevel,
    activeTimeWindow: {
      start: settings.workStartTime,
      end: settings.workEndTime,
    },
  });
}
```

### 9.6 Verify

- Browse sites → check Prisma Studio for `ActivityLog` + `DailySummary` records
- Browse productive site for 15+ minutes → `GardenPlant` row created
- Browse distracting site past limit → extra plants get marked `DEAD`

---

## Phase 10: Enforcement (Blur + Cursor Block)

### 10.1 Content Script Enforcement Handler

Append to `/Users/pranav/Desktop/QuackGoose/extension/content.js`:

```javascript
let enforcementActive = false;
let enforcementOverlay = null;

function applyBlur(level) {
  // level: 0 (none), 1 (warn), 2 (heavy), 3 (block)
  const filters = {
    0: '',
    1: 'blur(3px) saturate(0.7)',
    2: 'blur(8px) grayscale(0.5)',
    3: 'blur(12px) grayscale(0.8)',
  };
  document.body.style.transition = 'filter 0.3s';
  document.body.style.filter = filters[level];
}

function injectBlockOverlay(message, mood) {
  if (enforcementOverlay) return;
  enforcementOverlay = document.createElement('div');
  enforcementOverlay.id = '__quackfocus_block__';
  enforcementOverlay.innerHTML = `
    <div class="qf-block-content">
      <img src="${chrome.runtime.getURL('duck-assets/duck-' + mood.toLowerCase() + '.png')}" />
      <h1>${message}</h1>
      <button id="qf-back-to-work">Back to Work →</button>
    </div>
  `;
  enforcementOverlay.style.cssText = `
    position: fixed; inset: 0; z-index: 2147483646;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    pointer-events: auto;
  `;
  document.documentElement.appendChild(enforcementOverlay);
  document.getElementById('qf-back-to-work').onclick = () => {
    window.location.href = 'http://localhost:3000/dashboard';
  };
}

function removeBlockOverlay() {
  if (enforcementOverlay) {
    enforcementOverlay.remove();
    enforcementOverlay = null;
  }
}

async function handleStateUpdate(data) {
  const isDistractionSite = await isCurrentPageDistraction();
  if (!isDistractionSite) {
    applyBlur(0);
    removeBlockOverlay();
    return;
  }

  const pct = data.distractionUsedPercent || 0;
  const mode = data.enforceMode || 'BLUR';
  const reached = data.limitReached;

  if (!reached && pct < 50) { applyBlur(0); removeBlockOverlay(); return; }
  if (!reached && pct < 80) { applyBlur(1); removeBlockOverlay(); return; }
  if (!reached) { applyBlur(2); removeBlockOverlay(); return; }

  // Limit reached
  if (mode === 'WARN_ONLY') { applyBlur(1); return; }
  if (mode === 'BLUR') { applyBlur(3); return; }
  applyBlur(3);
  injectBlockOverlay(
    mode === 'SHAME_AND_BLOCK'
      ? "You failed. Back to work."
      : "Daily distraction limit reached.",
    data.duckMood || 'CHAOS'
  );
}

async function isCurrentPageDistraction() {
  const key = `cls_${location.hostname}`;
  const stored = await chrome.storage.local.get(key);
  return stored[key]?.data?.category === 'DISTRACTION';
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'STATE_UPDATE') handleStateUpdate(msg.payload);
});
```

### 10.2 Content CSS

Create `/Users/pranav/Desktop/QuackGoose/extension/content.css`:

```css
#__quackfocus_block__ .qf-block-content {
  background: white;
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
#__quackfocus_block__ .qf-block-content img {
  width: 150px;
  height: 150px;
  object-fit: contain;
}
#__quackfocus_block__ .qf-block-content h1 {
  font-size: 28px;
  margin: 20px 0;
  font-family: system-ui, sans-serif;
}
#__quackfocus_block__ #qf-back-to-work {
  background: black;
  color: white;
  padding: 12px 24px;
  font-size: 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
```

### 10.3 Verify

- Manually set a low limit (e.g., 1 minute) in settings
- Browse YouTube for 1 minute
- Page should blur + show overlay with duck
- Click "Back to Work" → redirects to dashboard

---

## Phase 11: Duck Overlay + Moods

### 11.1 Duck Element Injection

Append to `content.js`:

```javascript
let duckElement = null;
let currentMood = 'IDLE';

function injectDuck() {
  if (duckElement) return;
  duckElement = document.createElement('div');
  duckElement.id = '__quackfocus_duck__';
  duckElement.innerHTML = `
    <img id="qf-duck-img" src="${chrome.runtime.getURL('duck-assets/duck-idle.png')}" />
    <div id="qf-duck-tooltip"></div>
  `;
  document.documentElement.appendChild(duckElement);

  duckElement.addEventListener('click', () => {
    const tip = document.getElementById('qf-duck-tooltip');
    tip.classList.toggle('qf-show');
    tip.textContent = getDuckMessage(currentMood);
    setTimeout(() => tip.classList.remove('qf-show'), 5000);
  });
}

function updateDuckMood(mood) {
  currentMood = mood;
  if (!duckElement) injectDuck();
  const img = document.getElementById('qf-duck-img');
  if (img) img.src = chrome.runtime.getURL(`duck-assets/duck-${mood.toLowerCase()}.png`);
}

function getDuckMessage(mood) {
  const messages = {
    HAPPY: "You're on fire! Keep going.",
    IDLE: "I'm watching. Always.",
    SLEEPY: "Hey, wake up. Work time.",
    WATCHING: "Hmm... what are we doing?",
    WARNING: "Careful. You're close to the edge.",
    ANGRY: "Really? On THIS site? Again?",
    CHAOS: "That's it. You've earned this blur.",
    PROUD: "Daily goal crushed. Take a break.",
    DISAPPOINTED: "Your garden is dying.",
  };
  return messages[mood] || '';
}

// Listen for classification + state updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'STATE_UPDATE') {
    handleStateUpdate(msg.payload);
    if (msg.payload.duckMood) updateDuckMood(msg.payload.duckMood);
  }
  if (msg.type === 'PAGE_CLASSIFIED') {
    updateDuckMood(msg.payload.category === 'DISTRACTION' ? 'WARNING' : 'WATCHING');
  }
});

// Initial inject
if (document.readyState === 'complete') injectDuck();
else window.addEventListener('load', injectDuck);
```

### 11.2 Duck CSS

Add to `content.css`:

```css
#__quackfocus_duck__ {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 80px;
  height: 80px;
  z-index: 2147483647;
  cursor: pointer;
  transition: transform 0.2s;
}
#__quackfocus_duck__:hover {
  transform: scale(1.1);
}
#qf-duck-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}
#qf-duck-tooltip {
  position: absolute;
  bottom: 90px;
  right: 0;
  background: black;
  color: white;
  padding: 10px 14px;
  border-radius: 8px;
  font-family: system-ui, sans-serif;
  font-size: 14px;
  max-width: 200px;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.2s, transform 0.2s;
  pointer-events: none;
}
#qf-duck-tooltip.qf-show {
  opacity: 1;
  transform: translateY(0);
}
```

### 11.3 Verify

- Open any page → duck appears bottom-right
- Click duck → tooltip shows message
- Browse distraction sites → duck changes to warning/angry/chaos

---

## Phase 12: Dashboard

### 12.1 Dashboard API

Create `/Users/pranav/Desktop/QuackGoose/web/app/api/dashboard/summary/route.ts`:

```typescript
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [summary, settings, garden, topSites] = await Promise.all([
    prisma.dailySummary.findUnique({ where: { userId_date: { userId: session.user.id, date: today } } }),
    prisma.userSettings.findUnique({ where: { userId: session.user.id } }),
    prisma.garden.findUnique({ where: { userId: session.user.id } }),
    prisma.activityLog.groupBy({
      by: ['domain', 'category'],
      where: { userId: session.user.id, date: today },
      _sum: { durationSeconds: true },
      orderBy: { _sum: { durationSeconds: 'desc' } },
      take: 10,
    }),
  ]);

  // Calculate streak
  const streak = await calculateStreak(session.user.id);

  return NextResponse.json({
    summary,
    settings,
    garden,
    topSites: topSites.map(s => ({
      domain: s.domain,
      category: s.category,
      minutes: Math.round((s._sum.durationSeconds || 0) / 60),
    })),
    streak,
  });
}

async function calculateStreak(userId: string): Promise<number> {
  const summaries = await prisma.dailySummary.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 60,
  });
  let streak = 0;
  for (const s of summaries) {
    if (s.productiveDayComplete) streak++;
    else break;
  }
  return streak;
}
```

### 12.2 Dashboard Page

Create `/Users/pranav/Desktop/QuackGoose/web/app/dashboard/page.tsx`:

- Fetch `/api/dashboard/summary`
- Render:
  - Header with user avatar + name + sign-out
  - Focus Ring (productive minutes / daily goal) — use `recharts` or custom SVG
  - Stats cards: productive time, distraction time, streak, score
  - Distraction budget bar
  - Top 10 sites table (with category badges)
  - Duck mood card
  - Garden preview thumbnail (links to `/garden`)

Install charting:
```bash
npm install recharts
```

Navigation links: `/dashboard`, `/analytics`, `/garden`, `/settings`.

### 12.3 Verify

- Sign in → land on dashboard
- All cards populate with today's data
- Refreshing after extension records activity → numbers update

---

## Phase 13: Garden System

### 13.1 Garden API

Create `/Users/pranav/Desktop/QuackGoose/web/app/api/garden/route.ts`:

```typescript
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const garden = await prisma.garden.findUnique({
    where: { userId: session.user.id },
    include: {
      plants: { orderBy: { spawnedAt: 'asc' } },
    },
  });

  return NextResponse.json(garden);
}
```

### 13.2 Garden Page

Create `/Users/pranav/Desktop/QuackGoose/web/app/garden/page.tsx`:

- Fetch garden data
- Render 2D SVG garden:
  - Sky (gradient background)
  - Hills (static SVG path)
  - Grid of plants:
    - Alive `SMALL_FLOWER` → small flower SVG (pink)
    - Alive `MEDIUM_FLOWER` → medium flower SVG (yellow)
    - Alive `SMALL_TREE` → tree SVG (green)
    - Alive `LARGE_TREE` → big tree SVG (dark green)
    - Alive `GOLDEN_PLANT` → special gold plant
    - Dead plants → grey stumps
  - Plants positioned via `positionX, positionY` (0-10 grid)
- Stats overlay: total plants, alive plants, plants this week

### 13.3 Plant SVG Assets

Create plant SVGs in `/Users/pranav/Desktop/QuackGoose/web/public/garden-assets/`:
- `flower-small.svg`
- `flower-medium.svg`
- `tree-small.svg`
- `tree-large.svg`
- `plant-golden.svg`
- `stump.svg` (for dead)

Simple hand-crafted SVGs are fine (don't need 3D).

### 13.4 Verify

- Earn 15+ productive minutes → flower appears
- Refresh garden page → plants render from DB
- Exceed distraction limit → plants wilt/die

---

## Phase 14: Analytics Page

### 14.1 Analytics API

Create `/Users/pranav/Desktop/QuackGoose/web/app/api/analytics/route.ts`:

```typescript
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const fromStr = url.searchParams.get('from');
  const toStr = url.searchParams.get('to');
  const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = toStr ? new Date(toStr) : new Date();

  const [summaries, topProductive, topDistraction, categoryBreakdown] = await Promise.all([
    prisma.dailySummary.findMany({
      where: { userId: session.user.id, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    }),
    prisma.activityLog.groupBy({
      by: ['domain'],
      where: {
        userId: session.user.id,
        category: 'PRODUCTIVE',
        date: { gte: from, lte: to },
      },
      _sum: { durationSeconds: true },
      orderBy: { _sum: { durationSeconds: 'desc' } },
      take: 10,
    }),
    prisma.activityLog.groupBy({
      by: ['domain'],
      where: {
        userId: session.user.id,
        category: 'DISTRACTION',
        date: { gte: from, lte: to },
      },
      _sum: { durationSeconds: true },
      orderBy: { _sum: { durationSeconds: 'desc' } },
      take: 10,
    }),
    prisma.activityLog.groupBy({
      by: ['subcategory'],
      where: { userId: session.user.id, date: { gte: from, lte: to } },
      _sum: { durationSeconds: true },
    }),
  ]);

  return NextResponse.json({ summaries, topProductive, topDistraction, categoryBreakdown });
}
```

### 14.2 Analytics Page

Create `/Users/pranav/Desktop/QuackGoose/web/app/analytics/page.tsx`:

Charts to include (all with `recharts`):
- Daily stacked bar (productive vs distraction vs neutral)
- Weekly heatmap (productivity score per day)
- Line chart: productivity score trend
- Horizontal bar: top 10 productive sites
- Horizontal bar: top 10 distraction sites
- Pie chart: subcategory breakdown

Date range picker component filters all charts.

### 14.3 Custom Analytics (New Relic-style)

Add a section "Custom Views":
- Let user define a custom filter (domain contains, category, date range, etc.)
- Save filter as `SavedAnalyticsView` (new Prisma model — add later if time permits)
- Render the filtered data as a chart

### 14.4 Verify

- Navigate to `/analytics`
- Charts render with real data
- Date range picker updates all charts
- Can identify patterns (e.g., "I'm most distracted on Fridays")

---

## Phase 15: Popup + Polish

### 15.1 Upgrade Popup UI

Edit `popup.html` and `popup.js` to show:
- User avatar + name
- Today's focus time / distraction time (fetch from `/api/extension/status`)
- Distraction budget progress bar
- Current duck mood image
- Quick toggle: "Pause for 15 min"
- Link: "Open Dashboard" → opens `http://localhost:3000/dashboard`

Popup width 320px, clean Tailwind-like styling (inline CSS since popup can't use Tailwind easily unless bundled).

### 15.2 Pause Feature

When user clicks "Pause":
- Store `qf_paused_until` in `chrome.storage.local` = `Date.now() + 15*60*1000`
- In `background.js`: check if paused before any enforcement
- Show duck in `IDLE` mood during pause

### 15.3 Active Time Window Check

In `background.js`, before recording activity:
```javascript
const settings = await fetchSettings();
const now = new Date();
const [startH, startM] = settings.workStartTime.split(':').map(Number);
const [endH, endM] = settings.workEndTime.split(':').map(Number);
const nowMinutes = now.getHours() * 60 + now.getMinutes();
const startMinutes = startH * 60 + startM;
const endMinutes = endH * 60 + endM;
if (nowMinutes < startMinutes || nowMinutes > endMinutes) {
  // Outside work hours — don't enforce, but still track
  return;
}
```

### 15.4 Style Polish Checklist

- [ ] Landing page hero section with screenshot
- [ ] Onboarding transitions between questions
- [ ] Dashboard cards with consistent padding/radius
- [ ] Garden page with sky gradient and subtle animations
- [ ] Analytics charts with consistent color palette
- [ ] Loading states (skeleton screens) on all pages
- [ ] Error boundaries with friendly messages
- [ ] Dark mode toggle (optional)

---

## Phase 16: End-to-End Testing

### 16.1 Happy Path Test

1. Fresh browser profile, install extension
2. Click extension icon → sign in with Google
3. Popup says "Complete onboarding" → click link
4. On website: complete all 10 questions
5. Redirected to dashboard (empty)
6. Open `github.com` → duck mood: `HAPPY` or `WATCHING`
7. Leave tab open for 15 minutes → new plant in garden
8. Open `youtube.com` → duck mood: `WARNING` (if pct ≥ 50%)
9. Continue watching past limit → screen blurs + block overlay
10. Click "Back to Work" → redirect to dashboard
11. Check dashboard numbers updated
12. Check analytics page → charts populated
13. Check garden → plant exists

### 16.2 Edge Cases

- [ ] User closes browser mid-session → last tab should still be logged on next open
- [ ] Extension disabled for 5 min → reactivated → resumes tracking
- [ ] User's OAuth token expires → extension re-auths via popup
- [ ] Distraction site on whitelist → not classified as distraction
- [ ] Classification AI returns low confidence → defaults to NEUTRAL
- [ ] User visits unknown domain offline → cached fallback used
- [ ] Settings updated on website → extension picks up on next heartbeat

### 16.3 Database Validation

Run in Prisma Studio or psql:
- All users have `OnboardingProfile`, `UserSettings`, `Garden`
- `ActivityLog` entries have valid `date` (UTC midnight)
- `DailySummary` totals match sum of `ActivityLog` for that day
- No orphaned records (cascading deletes working)

---

## Phase 17: Deployment

### 17.1 Database

- Production Neon/Supabase tier
- Run `npx prisma migrate deploy` on production DB

### 17.2 Website

Deploy to Vercel:
```bash
cd /Users/pranav/Desktop/QuackGoose/web
vercel
```

Set environment variables in Vercel dashboard:
- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL=https://your-domain.vercel.app`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `EXTENSION_JWT_SECRET`
- `ANTHROPIC_API_KEY`

Update Google OAuth authorized redirects with production URL.

### 17.3 Extension

1. In `manifest.json`: update `API_BASE` to production URL
2. Zip extension folder: `zip -r quackfocus.zip . -x "*.git*"`
3. Upload to Chrome Web Store ($5 one-time dev fee):
   - https://chrome.google.com/webstore/devconsole
   - Provide screenshots, description, privacy policy
4. Once approved: update `manifest.json` oauth2 client_id with production client ID (using the WebStore-assigned extension ID)

### 17.4 Privacy Policy (Required for Web Store)

Create a simple privacy policy page `/app/privacy/page.tsx`:
- What data is collected (domains visited, time on site, page titles)
- What is NOT collected (full URLs, form data, passwords)
- How it's used (productivity tracking only)
- Google OAuth scope justification
- How to delete account

### 17.5 Post-Launch Monitoring

- Vercel analytics + logs
- Postgres query performance (add indexes as needed)
- Anthropic usage dashboard (set rate limits)
- Extension error reports via `chrome.runtime.onInstalled`

---

## Appendix A: Build Order Cheat Sheet

Fastest path to MVP (skip polish):

1. **Day 1 (backend):** Phases 0 → 1 → 2 → 3 → 4 (auth + onboarding + settings)
2. **Day 2 (extension basics):** Phases 5 → 6 → 7 (scaffold + auth + tracking)
3. **Day 3 (core logic):** Phases 8 → 9 (classification + activity)
4. **Day 4 (enforcement + visuals):** Phases 10 → 11 (blur + duck)
5. **Day 5 (website polish):** Phases 12 → 13 → 14 (dashboard + garden + analytics)
6. **Day 6 (polish + launch):** Phases 15 → 16 → 17

## Appendix B: Quick Reference Commands

```bash
# Start dev
cd /Users/pranav/Desktop/QuackGoose/web && npm run dev

# Prisma
npx prisma migrate dev --name <name>
npx prisma generate
npx prisma studio
npx prisma db push        # for rapid prototyping

# Extension reload
# chrome://extensions/ → click reload icon on QuackFocus card

# Generate secrets
openssl rand -base64 32

# Check logs
# Website: npm run dev terminal
# Service worker: chrome://extensions → QuackFocus → "service worker" link
# Content script: DevTools on the page being debugged
```

## Appendix C: Critical Gotchas

1. **Next.js 16 breaking changes** — always check `web/node_modules/next/dist/docs/` before assuming an API works the same
2. **MV3 service worker dies** — never use `setInterval`, always `chrome.alarms`
3. **Content script origin** — you CAN'T use `fetch` directly to your API from content.js without CORS headers. Route through `background.js` instead.
4. **chrome.identity token caching** — tokens get cached; use `clearAllCachedAuthTokens()` on sign-out or they'll stick
5. **Prisma `@@unique` for upsert** — `DailySummary.userId_date` compound unique is mandatory for the upsert pattern
6. **Time zones** — store all dates as UTC in DB; convert to user's local only in UI
7. **Extension CSS injection** — content.css is scoped by default but page CSS can still win; use `!important` on duck/blur styles if needed
8. **Tailwind v4 syntax** — differs from v3; check `web/node_modules/tailwindcss/docs/` or `app/globals.css` for `@theme` usage
9. **NextAuth v5 (Auth.js)** — callbacks signature changed from v4; check docs
