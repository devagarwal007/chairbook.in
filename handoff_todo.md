# ChairBook.in — Development Handoff & Comprehensive TODO

Welcome! This document serves as a complete handoff status log, engineering summary, and a prioritized TODO list for the ChairBook project. Use this to orient yourself and see exactly what has been done and what is up next.

---

## 1. Project Status Summary

ChairBook.in is a mobile-first, WhatsApp-native salon booking and CRM platform built using:
- **Core**: Next.js 15/16 (App Router), TypeScript, and React 19.
- **Database & Auth**: Supabase (PostgreSQL + RLS + Phone OTP auth).
- **Styling**: Vanilla CSS utilizing design tokens in `colors_and_type.css`.
- **Integrations**: WhatsApp Business Cloud API (Meta API) for automated messaging (auto-confirmations, reminders, broadcasts).

The codebase currently builds successfully (`npm run build` compiles with zero TypeScript or syntax errors) and has fallback mock data in place if Supabase credentials are not locally configured.

---

## 2. Feature Audit Checklist

### Phase 1 — MVP Core (P1)
- [x] **P1.1 Scaffold & Auth**: Next.js setup + Supabase config, phone/OTP mockup in `/auth`.
- [x] **P1.2 Owner Onboarding**: 5-step wizard in `/onboarding` to configure basic salon properties, hours, stylists, and services.
- [x] **P1.3 Core Booking Engine**:
  - [x] **Today's Dashboard** (`/dashboard`): Metric card sparklines, dynamic day/tomorrow appointment timeline, and status updates (Confirmed → Arrived → Completed / No-show).
  - [x] **Walk-in Modal**: Quick add walk-ins from the dashboard directly.
  - [x] **New Booking Form** (`/dashboard/new-booking`): Detailed client lookup, multi-service allocation, slot selection, and internal notes.
  - [x] **Booking Detail View** (`/dashboard/bookings/[id]`): Shows status histories, customer records, and rescheduling/cancellation modals.
- [x] **P1.4 Customer CRM**:
  - [x] **Customer List** (`/dashboard/customers`): Search, sort, and smart engagement tabs (Active / Cooling / Lost).
  - [x] **Customer Profile** (`/dashboard/customers/[id]`): Detailed lifetime spend stats, preferred stylist, and notes log.
- [x] **P1.5 Checkout & POS**:
  - [x] **Checkout** (`/dashboard/checkout/[bookingId]`): Custom bill items, discount adjustments, custom tips, cash calculations (with change counter), card simulation, and receipts screen.
- [x] **P1.6 Essential Settings**:
  - [x] CRUD Salon Profile, CRUD Services, CRUD Stylists, and Owner Account fields.

---

### Phase 2 — Growth & Automation (P2)
- [x] **P2.1 Calendar Dashboard** (`/dashboard/bookings`): Week grid and Day column view per stylist.
- [ ] **P2.1 Block Time**:
  - [ ] Add Block Time action to calendar views.
  - [ ] Render blocks (lunch breaks, salon closed days, vacations) on the calendar.
  - [ ] Form interface to write to the `blocks` database table.
- [ ] **P2.2 WhatsApp Automations**:
  - [ ] Real Meta Business API integration for template delivery.
  - [ ] Template editor tab in Settings (with variables support).
- [x] **P2.3 Revenue & Insights** (`/dashboard/revenue`):
  - [x] Time periods toggles (Today / Week / Month).
  - [x] SVG Bar charts showing revenue curves.
  - [x] Ranks lists for top performing stylists and services.
- [ ] **P2.4 Broadcast Wizard (`/dashboard/broadcast`)**:
  - [ ] Wizard page: Segment Audience → Draft template msg with live mockup → Estimate delivery fee & schedule → Launch.
- [x] **P2.5 Notifications Inbox** (`/dashboard/notifications`):
  - [x] Feed categorizing updates (bookings, reviews, reply notifications).
- [ ] **P2.6 Public Customer Landing/Booking Flow**:
  - [ ] Public-facing client scheduler page at `/[slug]`.
  - [ ] Customer "My Booking" page (`/my-booking/[id]`) to reschedule/cancel from WhatsApp links.
- [ ] **P2.7 Stylist Day View (`/stylist-day`)**:
  - [ ] Custom mobile-first daily schedule for individual stylists.
- [ ] **P2.8 Remaining Settings Tabs**:
  - [ ] **Subscription Tab**: Plan details and solo/salon billing options.
  - [ ] **Notification Toggle Matrix**: Per-channel & per-event toggle board.

---

## 3. Completed Engineering & Refactoring (DRY / YAGNI)

We have successfully modularized the layout, icons, utilities, and page components:

- **Common Icons & Utilities**:
  - Centralized all inline SVG elements into `Icons.tsx` under a unified `Icons` namespace.
  - Consolidated date/time parsing, avatar initials, and lookup helpers into `utils.ts`.
- **Shared Layout Components**:
  - Extracted the main top header with profile dropdown and notifications alert to `Header.tsx`.
  - Extracted the bottom navigation bar to `BottomNav.tsx`.
  - Converted the main `/dashboard` folder into a wrapper layout using `layout.tsx`.
- **Monolithic Page Cleanups**:
  - Refactored dashboard, calendar, customer list, settings, and insights subpages to leverage the shared layout components, eliminating redundant code.
- **UI/UX Polish & Optimizations (Latest)**:
  - **Shimmer Loading Skeleton**: Replaced blank mockups and raw text jumps with smooth pulse shimmer animations on dashboard metrics, calendars, and list elements while fetching database records.
  - **Unified Profile Context (`ProfileContext.tsx`)**: Created a React Context wrapper around the dashboard layout. User profile settings, initials, and salon configurations are loaded once, cached in localStorage, and updated dynamically. Editing profile details in settings instantly propagates to the header avatar initials and dropdown globally.
  - **Tactile Sliding Segment Bubbles**: Implemented physical sliding backgrounds for segment controls (e.g. Today/Tomorrow toggle, Day/Week toggle) using pure CSS absolute-translation.
  - **GPU-Accelerated Content Transitions**: Applied `fadeInUp` and `fadeIn` transitions with hardware acceleration properties (`will-change: opacity, transform`) on timeline rows and page viewports.

---

## 4. Current Work: Smooth Navigation Transitions (Active Task)

We are currently optimizing navigation transition effects when moving between pages via the bottom navigation bar:
- **Horizontal Sliding Indicator Pill**: Introduce a custom dynamic indicator (`.bn-active-pill`) on the `BottomNav` element that calculates the selected menu item's `offsetLeft` and `offsetWidth` via React references and a layout ResizeObserver, creating a sliding bubble effect.
- **Synchronized Route Loading**: Keep page entry timings (`animate-fade-in`) in sync with the indicator slides to eliminate visual jitter or content layout jumping during client-side navigation.

---

## 5. Database Schema Quick-Reference

Supabase tables defined in `supabase/migrations/20260520000000_init.sql`:
- `organizations`: Account plan details.
- `salons`: Branch configs, working hours (JSONB), slug, WhatsApp configuration.
- `users`: Core profile and dashboard auth associations.
- `stylists`: Salon team members, color styling, commission rates.
- `services`: Salon menu items, categories, durations, prices.
- `customers`: Client CRM registry.
- `bookings`: Appointment records (linked to salon, customer, stylist).
- `booking_services`: Junction table mapping multi-service orders to bookings.
- `payments`: Payments log (UPI, Card, Cash, Tip, Discount).
- `blocks`: Time periods blocked on stylist/salon calendar.
- `notifications`: Notifications feed logs.
- `broadcasts`: Campaign metrics log.

---

## 6. Immediate Prioritized Tasks for Next Sessions

1. **Complete Smooth Navigation transitions** (Active task).
2. **Build the Broadcast Wizard** (`/dashboard/broadcast`): Marketing campaign dispatch wizard UI, enabling owners to segment clients, preview templates, and send broadcasts.
3. **Build Customer-Facing Pages**:
   - Complete `/my-booking/[id]` reschedule and cancellation UI.
   - Build client-facing reservation scheduler at public route `/[slug]`.
4. **Implement Calendar Block Time**: Create modal/flow to schedule block slots (lunch breaks, holidays) and persist them to the `blocks` database table.
