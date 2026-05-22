# ChairBook.in — Project Guide

> Mobile-first, WhatsApp-native salon booking & CRM for independent Indian salons.

## Quick Start

```bash
npm install
npm run dev          # → http://localhost:3000
npm run build        # production build (zero errors expected)
npm run lint         # ESLint
```

Environment: copy `.env.local.example` → `.env.local` with your Supabase keys. The app has mock/fallback data so it runs without credentials.

---

## Tech Stack

| Layer        | Tool                                      |
| ------------ | ----------------------------------------- |
| Framework    | **Next.js 16** (App Router)               |
| Language     | **TypeScript** (strict mode)              |
| UI           | **React 19** (Server & Client Components) |
| Styling      | **Vanilla CSS + Tailwind CSS v4** (Coexistence Mode) |
| Database     | **Supabase** (PostgreSQL + RLS)           |
| Auth         | **Supabase Phone OTP**                    |
| Messaging    | **WhatsApp Business Cloud API** (Meta)    |
| Fonts        | Google Fonts CDN — Inter + JetBrains Mono |

---

## Project Structure

```
chairbook/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout (fonts, metadata)
│   │   ├── page.tsx            # Marketing landing page
│   │   ├── globals.css         # ALL styles (single canonical file)
│   │   ├── auth/               # Phone OTP auth flow
│   │   ├── signin/             # Sign-in page
│   │   ├── onboarding/         # 5-step salon setup wizard
│   │   ├── [slug]/             # Public customer booking page (WIP)
│   │   └── dashboard/
│   │       ├── layout.tsx      # Dashboard shell (Header + BottomNav)
│   │       ├── page.tsx        # Today's dashboard (metrics, timeline)
│   │       ├── bookings/       # Calendar views (week/day) + booking detail
│   │       ├── new-booking/    # New booking form
│   │       ├── customers/      # Customer CRM list + profile
│   │       ├── checkout/       # POS checkout flow
│   │       ├── revenue/        # Revenue & insights charts
│   │       ├── notifications/  # Notification inbox
│   │       └── settings/       # Salon settings CRUD
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx      # Top header with profile dropdown
│   │   │   └── BottomNav.tsx   # Bottom navigation bar
│   │   └── ui/
│   │       └── Icons.tsx       # Centralized SVG icon library
│   ├── context/
│   │   └── ProfileContext.tsx  # Global user/salon state (React Context)
│   └── lib/
│       ├── supabase.ts         # Supabase client init
│       ├── utils.ts            # Date parsing, avatar initials, helpers
│       └── onboarding.ts       # Onboarding step logic
├── supabase/
│   └── migrations/             # SQL schema migrations
├── .env.local                  # Supabase keys (gitignored)
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## Architecture Conventions

### Routing
- **App Router** only — no `pages/` directory.
- Dashboard pages live under `src/app/dashboard/`.
- The dashboard has its own `layout.tsx` that wraps all child routes with the shared `Header` and `BottomNav`.

### Styling
- **All styles live in `src/app/globals.css`** — this is the single source of truth (120k+ lines).
- Design tokens are defined as CSS custom properties in `:root` (see `colors_and_type.css` at project root for the token reference).
- **Tailwind Coexistence:** Tailwind CSS v4 is active alongside vanilla CSS. For existing styling, continue using BEM-like classes. For new code, Tailwind utility classes are supported.
- Component styles are scoped by BEM-like prefixes (e.g., `.db-` for dashboard, `.bn-` for bottom nav, `.hdr-` for header).

### Components
- Keep components in `src/components/`. Sub-organize by `layout/` (structural) and `ui/` (presentational).
- All SVG icons go through the centralized `Icons.tsx` namespace — never inline SVGs in page files.
- Use the `@/*` path alias (maps to `./src/*`) for imports.

### State Management
- **ProfileContext** (`src/context/ProfileContext.tsx`) holds user profile + salon config. Loaded once, cached in localStorage, updates propagate globally.
- No external state library — React Context + local state only.

### Data Fetching
- Supabase client initialized in `src/lib/supabase.ts`.
- Pages include mock/fallback data arrays so the app renders without a live database.
- Shimmer loading skeletons display while data loads.

---

## Design System — Key Rules

### Colors
| Token           | Hex       | Usage                                      |
| --------------- | --------- | ------------------------------------------ |
| `--teal`        | `#0F6E56` | Primary CTA, active nav, positive numbers  |
| `--amber`       | `#EF9F27` | Warnings, notification dots, "arrived"     |
| `--wa`          | `#25D366` | WhatsApp actions ONLY — never generic green|
| `--bg`          | `#FAFAF7` | Page background                            |
| `--surface`     | `#FFFFFF` | Card backgrounds                           |
| `--ink`         | `#0E1512` | Primary text                               |
| `--line`        | `#E6E4DC` | 1px borders (hairlines)                    |

Status palette: Blue (Confirmed) → Amber (Arrived) → Green (Completed) → Rose (No-show).

### Typography
- **Inter** for all UI text (400/500/600/700).
- **JetBrains Mono** for numeric metrics, timestamps, and code-style labels only.
- Headlines: `font-weight: 600`, negative letter-spacing.
- Currency: use `₹` glyph, Indian-style thousands (`1,23,400` or `1.23 L`).

### Shape & Motion
- Card radius: `12px`. Large cards/modals: `16px`. Pills: `999px`.
- Cards use 1px solid `--line` borders — **no box-shadows** (except FABs/modals).
- Transitions: hover 150ms, expand 180ms, toast 200ms. No bouncy springs or parallax.
- Modal easing: `cubic-bezier(0.2, 0.9, 0.3, 1.2)`.

### Icons
- Inline SVG, 1.8–2px stroke, `currentColor`, rounded caps/joins.
- Sized 14–20px in UI, 16px in buttons.

---

## Database Schema (Supabase)

Tables defined in `supabase/migrations/`:

| Table              | Purpose                                         |
| ------------------ | ----------------------------------------------- |
| `organizations`    | Account/plan details                            |
| `salons`           | Branch config, hours (JSONB), slug, WhatsApp    |
| `users`            | Profile & auth associations                     |
| `stylists`         | Team members, color, commission rates            |
| `services`         | Menu items, categories, durations, prices        |
| `customers`        | Client CRM registry                              |
| `bookings`         | Appointment records (salon → customer → stylist) |
| `booking_services` | Multi-service junction table                     |
| `payments`         | Payment log (UPI, Card, Cash, Tip, Discount)     |
| `blocks`           | Calendar blocked time (breaks, holidays)         |
| `notifications`    | Notification feed logs                           |
| `broadcasts`       | Campaign metrics log                             |

---

## Current Status & Pending Work

### ✅ Completed
- Auth flow (phone OTP), onboarding wizard
- Dashboard with metrics, sparklines, timeline
- Walk-in modal, new booking form, booking detail
- Customer CRM (list + profile + engagement tabs)
- Checkout/POS with bill builder and receipt
- Calendar views (week grid + day column)
- Revenue/insights page with SVG charts
- Notifications inbox
- Settings CRUD (profile, services, stylists)
- Shared layout (Header, BottomNav, ProfileContext)
- Shimmer skeletons, GPU-accelerated transitions

### 🔧 In Progress
- Smooth bottom nav sliding indicator animation

### 📋 TODO (Priority Order)
1. Calendar block time (lunch breaks, holidays)
2. Broadcast wizard (`/dashboard/broadcast`)
3. Public customer booking page (`/[slug]`)
4. Customer self-service booking page (`/my-booking/[id]`)
5. WhatsApp Business API integration (real template delivery)
6. Settings: Subscription tab, notification toggles
7. Stylist day view (`/stylist-day`)

---

## Do's and Don'ts

### Do
- Write all styles in `globals.css` using design tokens.
- Use the `Icons` namespace from `Icons.tsx` for any SVG icon.
- Provide mock/fallback data so pages render without Supabase.
- Use shimmer skeletons for loading states.
- Keep the mobile-first mindset — this runs on entry-level Android phones.
- Use `'use client'` directive on any component that uses hooks/interactivity.
- Indian number formatting for currency (`₹1,23,400`).

### Don't
- Don't rewrite existing styles to Tailwind (unless migrating specifically). Both styles coexist peacefully.
- Don't add box-shadows to cards (1px borders only).
- Don't use `--wa` (WhatsApp green) for generic success states.
- Don't add bouncy/spring animations or parallax effects.
- Don't create new CSS files — everything goes in `globals.css`.
- Don't inline SVG icons in page components — add them to `Icons.tsx`.
- Don't use external state management libraries.
