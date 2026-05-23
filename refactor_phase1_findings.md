# Staff Engineer Findings & Impact Analysis: Refactoring Phase 1

This document outlines the findings, structure audit, impact analysis, and verification plan for **Phase 1: Folder Structure Reorganization** of the ChairBook refactoring process.

---

## 1. Structure Audit & Target State

The current layout of the codebase is predominantly flat, with page-level logic and layout mixed together. Phase 1 establishes the structural boundaries by introducing:
1. **Feature directories** under `src/components/features/` to hold colocated modular components.
2. **Hook directory** `src/hooks/` to separate async data-fetching / side-effect state from UI orchestration.
3. **Type definitions directory** `src/types/` to centralize shared interfaces and eliminate duplicate models.

### Directory Creation Plan (Task 1.1)
The following directories will be created to prepare for the component extraction phases:
* `src/components/features/landing`
* `src/components/features/auth`
* `src/components/features/onboarding`
* `src/components/features/dashboard`
* `src/components/features/bookings`
* `src/components/features/customers`
* `src/components/features/checkout`
* `src/components/features/revenue`
* `src/components/features/settings`
* `src/components/features/notifications`
* `src/components/features/block-time`
* `src/components/features/broadcast`
* `src/components/features/new-booking`
* `src/components/features/public-booking`
* `src/hooks`
* `src/types`

---

## 2. File Relocation Analysis (Task 1.2)

### Relocating `useSalonData.ts`
* **Current Location**: `src/lib/useSalonData.ts`
* **Target Location**: `src/hooks/useSalonData.ts`

### Reference Audit
We scanned the codebase for references to `useSalonData`. The findings are:
1. **`src/app/dashboard/page.tsx`**:
   * Line 12: `import { useSalonData, DbStylist, DbService } from "@/lib/useSalonData";`
   * Line 76: `const { stylists: dbStylists, services: dbServices, loading: salonDataLoading } = useSalonData(salonId);`
2. **`src/lib/useSalonData.ts`**:
   * Declaration of `useSalonData` and interface definitions: `DbStylist`, `DbService`, `DbCustomer`.

No other files reference `useSalonData` or its internal interfaces.

---

## 3. Potential Risks & Mitigation Strategies

As a staff engineer, preserving system stability and keeping existing functionality intact is the highest priority. Here are the identified risks and how they are addressed:

### Risk 1: Broken Imports
* **Description**: Moving `useSalonData.ts` could break references in the dashboard page or fail if internal imports within the hook are relative.
* **Analysis**:
  * The only importer is `src/app/dashboard/page.tsx`.
  * `useSalonData.ts` imports from `@/lib/supabase` (using Next.js path alias `@/*` resolving to `src/*`).
* **Mitigation**:
  * Update `src/app/dashboard/page.tsx` line 12 to import from `@/hooks/useSalonData`.
  * Because `useSalonData.ts` uses absolute alias path imports (`@/lib/supabase`), its internal imports remain valid and functional without any modification.

### Risk 2: TypeScript Compilation & Dev Server Jitter
* **Description**: Modifying folder structures and importing paths during an active dev server or build process can sometimes trigger cached Turbopack resolution errors.
* **Mitigation**:
  * Perform the migration clean.
  * Trigger `npm run build` after the file relocation to verify that TypeScript resolves all imports correctly.
  * Check the dev build if running locally.

---

## 4. Verification & Handoff Plan

After completing the directory creation and relocation:
1. **Compilation Check**: Run `npm run build` to verify there are zero TypeScript compiler or Next.js layout compilation issues.
2. **Commit Checkpoint**: Create a clean Git checkpoint representing the structural reorganization.
