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
| Styling      | **Tailwind CSS v4** (primary)             |
| Database     | **Supabase** (PostgreSQL + RLS)           |
| Auth         | **Supabase Phone OTP**                    |
| Messaging    | **WhatsApp Business Cloud API** (Meta)    |
| Fonts        | Google Fonts CDN — Inter + JetBrains Mono |

---

## Project Structure

```
chairbook/
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── layout.tsx              # Root layout (fonts, providers, metadata)
│   │   ├── page.tsx                # Marketing landing page
│   │   ├── globals.css             # Tailwind import + theme tokens + legacy CSS (see Styling section)
│   │   ├── auth/callback/route.ts  # Supabase auth callback handler
│   │   ├── signin/page.tsx         # Phone OTP sign-in
│   │   ├── onboarding/page.tsx     # 5-step salon setup wizard
│   │   ├── [slug]/page.tsx         # Public customer booking page (WIP)
│   │   └── dashboard/
│   │       ├── layout.tsx          # Dashboard shell (Header + BottomNav)
│   │       ├── page.tsx            # Today's dashboard (metrics, timeline)
│   │       ├── bookings/           # Calendar views (week/day) + booking detail
│   │       │   └── [id]/           # Individual booking detail
│   │       ├── new-booking/        # Multi-step new booking form
│   │       ├── customers/          # Customer CRM list
│   │       │   └── [id]/           # Customer profile + history
│   │       ├── checkout/           # POS checkout flow
│   │       ├── revenue/            # Revenue & insights charts
│   │       ├── notifications/      # Notification inbox
│   │       └── settings/           # Salon settings CRUD
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx          # Top header with greeting + profile dropdown
│   │   │   └── BottomNav.tsx       # Bottom tab nav with sliding indicator
│   │   └── ui/
│   │       ├── Icons.tsx           # Centralized SVG icon library (~30+ icons)
│   │       ├── StatusBadge.tsx     # Booking status pill with color coding
│   │       ├── MetricCard.tsx      # Dashboard metric card with optional sparkline
│   │       ├── SearchBar.tsx       # Reusable search input with debounce + clear
│   │       ├── EmptyState.tsx      # Empty data state placeholder
│   │       ├── ServiceTag.tsx      # Service name pill/tag
│   │       ├── StylistAvatar.tsx   # Circular avatar with initials + stylist color
│   │       └── ErrorBoundary.tsx   # React error boundary with fallback UI
│   ├── constants/
│   │   ├── index.ts               # Barrel exports
│   │   ├── mockData.ts            # Centralized mock/fallback data arrays
│   │   ├── navigation.ts          # Nav items config (BottomNav, Header)
│   │   └── statusConfig.ts        # Status badge color/label mappings
│   ├── context/
│   │   ├── ProfileContext.tsx      # Global user/salon state (React Context)
│   │   └── ToastContext.tsx        # Global toast notification system
│   ├── hooks/
│   │   ├── index.ts               # Barrel exports
│   │   ├── useBookings.ts         # Booking data fetching + state management
│   │   ├── useCustomers.ts        # Customer list with search + pagination
│   │   ├── useServices.ts         # Service menu with category filtering
│   │   ├── useStylists.ts         # Stylist/team data fetching
│   │   ├── useDebounce.ts         # Generic debounce utility hook
│   │   └── useProfile.ts          # Convenience wrapper around ProfileContext
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client initialization
│   │   ├── utils.ts               # Date/time formatting, currency, initials, cn()
│   │   └── onboarding.ts          # Onboarding step definitions + validation
│   └── types/
│       ├── index.ts               # Barrel exports
│       ├── booking.ts             # Booking, BookingService, BookingStatus, TimeSlot
│       ├── customer.ts            # Customer, CustomerVisit, CustomerNote
│       ├── service.ts             # Service, ServiceCategory
│       ├── stylist.ts             # Stylist, StylistSchedule
│       ├── salon.ts               # Salon, Organization, BusinessHours
│       └── common.ts              # SelectOption, DateRange, PaginationParams, ApiResponse
├── supabase/
│   └── migrations/                # SQL schema migrations
├── .env.local                     # Supabase keys (gitignored)
├── package.json
├── tsconfig.json
├── postcss.config.mjs             # Tailwind CSS v4 PostCSS plugin
└── next.config.ts
```

---

## Architecture Conventions

### Routing
- **App Router** only — no `pages/` directory.
- Dashboard pages live under `src/app/dashboard/`.
- The dashboard has its own `layout.tsx` that wraps all child routes with the shared `Header` and `BottomNav`.
- Root `layout.tsx` wraps the entire app with `ProfileProvider` and `ToastProvider`.

### Styling — ⚠️ IMPORTANT

**Tailwind CSS v4 is the only styling approach for all new code.** Do NOT write new styles in `globals.css`.

- **Tailwind v4** uses CSS-based configuration (no `tailwind.config.js`). Theme tokens are defined via `@theme { ... }` in `globals.css`.
- **`globals.css`** exists solely for: (1) the `@import "tailwindcss"` directive, (2) `@theme` design token definitions, and (3) legacy BEM-style CSS that has not yet been migrated. **Do not add new CSS rules to this file.**
- Legacy CSS in `globals.css` uses BEM-like prefixes (`.db-`, `.bn-`, `.hdr-`, `.auth-`, `.onb-`, `.cal-`, `.rev-`, `.set-`, `.cust-`, `.co-`, `.nb-`, `.not-`, `.bk-detail-`, `.walk-in-`, etc.). This is technical debt scheduled for removal — do not extend it.
- Custom Tailwind theme tokens are available as utility classes (e.g., `bg-teal`, `text-ink`, `text-ink-soft`, `border-line`, `bg-surface`, `font-mono`).
- Use the `cn()` helper from `@/lib/utils` to merge conditional class names.

### Components
- Keep components in `src/components/`. Sub-organize by `layout/` (structural) and `ui/` (presentational).
- **Reusable UI components** are available in `src/components/ui/` — always check for an existing component before creating a new one:
  - `StatusBadge` — booking status pills
  - `MetricCard` — dashboard metric display
  - `SearchBar` — search input with debounce
  - `EmptyState` — empty data placeholder
  - `ServiceTag` — service name pills
  - `StylistAvatar` — circular avatar with initials
  - `ErrorBoundary` — React error boundary
- All SVG icons go through the centralized `Icons.tsx` namespace — never inline SVGs in page files.
- Use the `@/*` path alias (maps to `./src/*`) for all imports.

### Types
- Shared TypeScript interfaces and types live in `src/types/`.
- Import types from `@/types` (barrel export) — never define shared types inline in page files.
- Available type modules: `booking`, `customer`, `service`, `stylist`, `salon`, `common`.

### Constants
- Centralized constants live in `src/constants/`.
- Import from `@/constants` (barrel export).
- **`mockData.ts`** — all mock/fallback data arrays (bookings, customers, stylists, services, notifications, revenue data).
- **`navigation.ts`** — navigation item configurations for BottomNav and Header.
- **`statusConfig.ts`** — status badge color/label mappings with `getStatusColor()` and `getStatusLabel()` helpers.

### Hooks
- Custom hooks live in `src/hooks/`.
- Import from `@/hooks` (barrel export).
- **Data fetching hooks**: `useBookings`, `useCustomers`, `useServices`, `useStylists` — each handles loading, error states, and Supabase queries with mock data fallback.
- **Utility hooks**: `useDebounce` (generic debounce), `useProfile` (ProfileContext shortcut).

### State Management
- **ProfileContext** (`src/context/ProfileContext.tsx`) — user profile + salon config. Loaded once, cached in localStorage.
- **ToastContext** (`src/context/ToastContext.tsx`) — global toast notification system. Supports `success`, `error`, `info`, `warning` types with auto-dismiss and max 3 visible toasts.
- No external state library — React Context + local state only.
- Use `useToast()` hook to trigger toasts from any client component. Use `useProfile()` for profile access.

### Data Fetching
- Supabase client initialized in `src/lib/supabase.ts`.
- Pages use custom hooks (`useBookings`, `useCustomers`, etc.) for data fetching — not inline fetch logic.
- Mock/fallback data from `@/constants/mockData` ensures the app renders without a live database.
- Shimmer loading skeletons display while data loads.

---

## Design System — Key Rules

### Colors (Tailwind Theme Tokens)

| Token / Class       | Hex       | Usage                                      |
| ------------------- | --------- | ------------------------------------------ |
| `teal`              | `#0F6E56` | Primary CTA, active nav, positive numbers  |
| `teal-light`        | `#E8F5F0` | Teal backgrounds, selected states          |
| `amber`             | `#EF9F27` | Warnings, notification dots, "arrived"     |
| `amber-light`       | `#FEF5E7` | Amber backgrounds                          |
| `wa`                | `#25D366` | WhatsApp actions ONLY — never generic green|
| `bg`                | `#FAFAF7` | Page background                            |
| `surface`           | `#FFFFFF` | Card backgrounds                           |
| `ink`               | `#0E1512` | Primary text                               |
| `ink-soft`          | `#637570` | Secondary/muted text                       |
| `line`              | `#E6E4DC` | 1px borders (hairlines)                    |
| `danger`            | `#E53E3E` | Error states, destructive actions           |
| `danger-light`      | `#FDE8E8` | Danger backgrounds                         |

Status palette: Blue (Confirmed) → Amber (Arrived) → Green (Completed) → Rose (No-show).

### Typography
- **Inter** (`font-sans`) for all UI text (400/500/600/700).
- **JetBrains Mono** (`font-mono`) for numeric metrics, timestamps, and code-style labels only.
- Headlines: `font-semibold`, negative letter-spacing.
- Currency: use `₹` glyph, Indian-style thousands (`1,23,400` or `1.23 L`). Use `formatCurrency()` from `@/lib/utils`.

### Shape & Motion
- Card radius: `rounded-xl` (12px). Large cards/modals: `rounded-2xl` (16px). Pills: `rounded-full`.
- Cards use 1px solid `border-line` — **no box-shadows** (except FABs/modals).
- Transitions: hover 150ms, expand 180ms, toast 200ms. No bouncy springs or parallax.
- Modal easing: `cubic-bezier(0.2, 0.9, 0.3, 1.2)`.

### Icons
- Inline SVG via `Icons` namespace, 1.8–2px stroke, `currentColor`, rounded caps/joins.
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
- **Refactoring complete (10 phases):**
  - Shared types extracted to `src/types/`
  - Constants & mock data centralized in `src/constants/`
  - Reusable UI components (StatusBadge, MetricCard, SearchBar, EmptyState, ServiceTag, StylistAvatar)
  - Custom data-fetching hooks in `src/hooks/`
  - Error boundaries
  - ProfileContext refactored for maintainability
  - URL-based state management
  - Global ToastContext provider
  - Performance optimizations (React.memo, useCallback, useMemo)
  - CSS migration to Tailwind CSS v4

### 📋 TODO (Priority Order)
1. Calendar block time (lunch breaks, holidays)
2. Broadcast wizard (`/dashboard/broadcast`)
3. Public customer booking page (`/[slug]`)
4. Customer self-service booking page (`/my-booking/[id]`)
5. WhatsApp Business API integration (real template delivery)
6. Settings: Subscription tab, notification toggles
7. Stylist day view (`/stylist-day`)
8. Complete legacy CSS migration — remove remaining BEM styles from `globals.css`

---

## Do's and Don'ts

### Do
- ✅ **Use Tailwind CSS utility classes** for all new styling. Use theme tokens (`bg-teal`, `text-ink`, `border-line`, etc.).
- ✅ Use the `cn()` helper from `@/lib/utils` for conditional class merging.
- ✅ Import shared types from `@/types` — never define shared interfaces inline.
- ✅ Import mock data and constants from `@/constants` — never define mock arrays inline in pages.
- ✅ Use custom hooks from `@/hooks` for data fetching — never write inline Supabase queries in page components.
- ✅ Use existing reusable UI components from `@/components/ui/` before creating new ones.
- ✅ Use the `Icons` namespace from `Icons.tsx` for any SVG icon.
- ✅ Use `useToast()` for user notifications — never create inline toast/flash UI.
- ✅ Provide mock/fallback data so pages render without Supabase.
- ✅ Use shimmer skeletons for loading states.
- ✅ Keep the mobile-first mindset — this runs on entry-level Android phones.
- ✅ Use `'use client'` directive on any component that uses hooks/interactivity.
- ✅ Indian number formatting for currency (`₹1,23,400`). Use `formatCurrency()` from utils.
- ✅ Use barrel imports (`@/types`, `@/hooks`, `@/constants`) for clean import statements.

### Don't
- ❌ **Don't write new CSS in `globals.css`** — it contains only the Tailwind import, theme tokens, and legacy styles pending migration.
- ❌ **Don't create new CSS files** — use Tailwind utility classes exclusively.
- ❌ **Don't use BEM-style class names** in new code — that pattern is legacy.
- ❌ Don't define shared types, constants, or mock data inline in page files.
- ❌ Don't write inline Supabase queries in page components — create/use hooks.
- ❌ Don't create inline toast/flash notification UI — use `useToast()`.
- ❌ Don't add box-shadows to cards (1px borders only).
- ❌ Don't use `--wa` (WhatsApp green) for generic success states.
- ❌ Don't add bouncy/spring animations or parallax effects.
- ❌ Don't inline SVG icons in page components — add them to `Icons.tsx`.
- ❌ Don't use external state management libraries.
