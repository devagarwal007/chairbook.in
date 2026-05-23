# Staff Engineer Findings & Impact Analysis: Refactoring Phase 3

This document details the findings, duplicate helper functions audit, consolidation strategy, and verification plan for **Phase 3: Utility Consolidation (DRY Critical)** of the ChairBook refactoring process.

---

## 1. Helper Function Duplication & Discrepancies Audit

We audited the codebase for utility functions and found several copy-pasted helper functions. Below is the mapping of duplicate functions:

### 1.1 `isUUID` function
* **Locations**: 
  * `src/app/dashboard/page.tsx` (lines 283, 320)
  * `src/app/dashboard/checkout/[bookingId]/page.tsx` (lines 140, 224, 327, 354)
  * `src/app/dashboard/bookings/[id]/page.tsx` (lines 385, 606, 648, 696, 743)
  * `src/app/dashboard/customers/[id]/page.tsx` (lines 268, 421)
* **Current Implementation**:
  `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)`
* **Consolidated Helper (`isUUID` in `src/lib/utils.ts`)**:
  ```typescript
  export const isUUID = (str: string): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  ```

### 1.2 `formatTime12h` and `formatTime12hFromMin` functions
* **Locations**:
  * `src/app/dashboard/page.tsx` (lines 16, 26, 397)
* **Consolidated Helpers (in `src/lib/utils.ts`)**:
  ```typescript
  export const formatTime12h = (timeStr: string): string => {
    const min = toMin(timeStr);
    return formatTime12hFromMin(min);
  };

  export const formatTime12hFromMin = (min: number): string => {
    let h = Math.floor(min / 60);
    const m = min % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
  };
  ```

### 1.3 `formatDateDisplay` function
* **Locations**:
  * `src/app/dashboard/page.tsx` (line 66)
* **Consolidated Helper (in `src/lib/utils.ts`)**:
  ```typescript
  export const formatDateDisplay = (date: Date): string => {
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const dayNum = String(date.getDate()).padStart(2, "0");
    const monthName = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${dayName} · ${dayNum} ${monthName} ${year} · ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
  };
  ```

### 1.4 `toLocalDateKey` function
* **Locations**:
  * `src/app/[slug]/page.tsx` (line 60)
* **Consolidated Helper**:
  We already have `formatDateKey` in `src/lib/utils.ts`. We will remove `toLocalDateKey` from `src/app/[slug]/page.tsx` and replace its calls with `formatDateKey`.

### 1.5 `formatPhone` function
* **Locations**:
  * `src/app/[slug]/page.tsx` (line 55)
* **Consolidated Helper (in `src/lib/utils.ts`)**:
  ```typescript
  export const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    return digits.startsWith("91") ? `+${digits}` : `+91${digits}`;
  };
  ```

### 1.6 `mapDbStatusToUi` function
* **Locations**:
  * `src/app/dashboard/page.tsx` (line 192)
* **Consolidated Helper (in `src/lib/utils.ts`)**:
  ```typescript
  export const mapDbStatusToUi = (s: string): "confirmed" | "arrived" | "completed" | "noshow" => {
    const lower = (s || "").toLowerCase();
    if (lower === "confirmed") return "confirmed";
    if (lower === "arrived") return "arrived";
    if (lower === "completed" || lower === "paid") return "completed";
    if (lower === "no-show") return "noshow";
    return "confirmed";
  };
  ```

---

## 2. Potential Risks & Mitigation Strategies

### Risk 1: Formatting Differences (leading zeros / case differences in PM/AM)
* **Risk**: If the consolidated helper formats time or phone numbers slightly differently than before, it might affect UI layouts or API payloads.
* **Mitigation**: We carefully verified that the consolidated helper code is structurally identical to the legacy local code. For instance, `formatTime12hFromMin` will preserve the PM/AM output matching the exact casing.

### Risk 2: Type Imports
* **Risk**: `mapDbStatusToUi` returns specific union types like `"confirmed" | "arrived" | "completed" | "noshow"`. We must ensure we import `BookingStatus` from `@/types` if needed, or define the return type correctly to avoid compiler errors.
* **Mitigation**: We will import `BookingStatus` in `src/lib/utils.ts` from `@/types` to ensure strict type alignment.

---

## 3. Verification Plan

1. **Compilation Check**: Run `npm run build` after consolidating the utility functions and updating the page files.
2. **Behavioral Check**: Ensure all dates, times, statuses, and phone numbers are correctly rendered/processed in the application.
