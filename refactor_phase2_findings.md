# Staff Engineer Findings & Impact Analysis: Refactoring Phase 2

This document details the findings, interface comparison, consolidation strategy, and verification plan for **Phase 2: Shared Type Definitions (DRY)** of the ChairBook refactoring process.

---

## 1. Type Duplication & Discrepancies Audit

We audited the codebase and identified widespread copy-pasted `interface` definitions with slight discrepancies across pages. Below is the mapping of duplicate models:

### 1.1 Stylist Type
* **Locations**: 
  * `src/app/dashboard/bookings/page.tsx` (`Stylist`)
  * `src/app/dashboard/new-booking/page.tsx` (`Stylist`)
  * `src/app/onboarding/page.tsx` (`Stylist`)
  * `src/hooks/useSalonData.ts` (`DbStylist`)
  * `src/app/dashboard/settings/page.tsx` (`StylistItem`)
* **Discrepancy**:
  * Onboarding uses `id: number`, whereas bookings and DB fetching use `id: string`.
  * Settings includes `active: boolean` and `commission_pct: number`.
* **Consolidated Model (`Stylist` in `src/types/stylist.ts`)**:
  ```typescript
  export interface Stylist {
    id: string | number;
    name: string;
    tone: string;
    short?: string;
    role?: string;
    role_label?: string;
    commission_pct?: number;
    active?: boolean;
  }
  ```

### 1.2 Service Type
* **Locations**:
  * `src/app/dashboard/new-booking/page.tsx` (`Service`)
  * `src/app/onboarding/page.tsx` (`Service`)
  * `src/hooks/useSalonData.ts` (`DbService`)
  * `src/app/dashboard/settings/page.tsx` (`ServiceItem`)
* **Discrepancy**:
  * Onboarding includes optional `preset?: boolean`.
  * Settings uses `duration_min` instead of `duration`, and includes `active: boolean`.
* **Consolidated Model (`Service` in `src/types/service.ts`)**:
  ```typescript
  export interface Service {
    id: string;
    name: string;
    duration: number;
    duration_min?: number; // fallback compatibility for settings
    price: number;
    category?: string;
    preset?: boolean;
    active?: boolean;
  }
  ```

### 1.3 Customer Type
* **Locations**:
  * `src/app/dashboard/checkout/[bookingId]/page.tsx` (`Customer`)
  * `src/app/dashboard/customers/page.tsx` (`Customer`)
  * `src/app/dashboard/new-booking/page.tsx` (`Customer`)
  * `src/hooks/useSalonData.ts` (`DbCustomer`)
* **Discrepancy**:
  * Basic fields (`id`, `name`, `phone`) are present in all.
  * CRM and DB hook definitions include `visits`, `lastDays`, `spend`, and `tone`.
* **Consolidated Model (`Customer` in `src/types/customer.ts`)**:
  ```typescript
  export interface Customer {
    id: string | number;
    name: string;
    phone: string;
    visits?: number;
    lastDays?: number;
    spend?: number;
    tone?: string;
    created_at?: string;
  }
  ```

### 1.4 Booking & Appointment Types
* **Locations**:
  * `src/app/dashboard/page.tsx` (`Appointment`)
  * `src/app/dashboard/bookings/page.tsx` (`CalAppt`)
  * `src/app/dashboard/checkout/[bookingId]/page.tsx` (`Booking`)
  * `src/app/dashboard/bookings/[id]/page.tsx` (`BookingData`)
* **Discrepancy**:
  * Dashboard uses `time` (string: "HH:MM") and status flags.
  * Calendar uses `startH`, `startM`, `dayKey` (date string).
  * Booking details page uses nested models for customer/stylist details, plus activity lists and payment info.
* **Consolidated Models (`BookingStatus`, `Appointment`, `CalAppt`, `BookingData` in `src/types/booking.ts`)**:
  These interfaces represent different shapes of bookings utilized in different layers of the application. They will be defined under `src/types/booking.ts` with consistent base type definitions.

---

## 2. Potential Risks & Mitigation Strategies

### Risk 1: Type Conflicts (Union types of string vs number for IDs)
* **Risk**: Some parts of the UI expect `id: string` while others (specifically mock data or onboarding inputs) expect `id: number`.
* **Mitigation**: Define the `id` field as `string | number` in the consolidated interfaces, allowing backwards compatibility without forcing massive type conversions across the legacy components.

### Risk 2: Settings duration vs duration_min mismatch
* **Risk**: `settings/page.tsx` uses `duration_min` while other screens use `duration`.
* **Mitigation**: Define both fields as optional (`duration` and `duration_min`) in the consolidated `Service` interface to ensure compatibility.

---

## 3. Verification Plan

1. **Compilation Check**: Run `npm run build` after establishing the shared types and replacing the inline types in the page files.
2. **Runtime Verification**: Ensure that the calendar, dashboard, settings, and onboarding flows render without crashes.
