# Staff Engineer Findings & Impact Analysis: Custom Hooks Extraction (Phase 7)

This document tracks findings, design details, implementation details, and verification plans for **Phase 7: Custom Hooks Extraction**.

## 1. Objectives & Refactoring Strategy

In modern React and Next.js, colocating UI and side-effect logic inside page-level files makes codebases hard to read, maintain, and test. Phase 7 targets the extraction of tangled concerns into modular, testable Custom Hooks:
1. **`useBookings.ts`**: Encapsulates the Supabase data fetching, real-time client validation, error handling, and type mapping for salon bookings.
2. **`useAuthState.ts`**: Encapsulates the Supabase authentication state verification, user metadata resolver, and next routing path mapping.
3. **`useTimeUpdate.ts`**: Encapsulates the real-time clock tick side effect that runs every minute to keep the timeline and greeting message accurate.
4. **`useFlash.ts`**: Encapsulates the flash notification timeout pattern to unify feedback notifications across multiple pages, preventing timeout-collision bugs.

---

## 2. Hook Designs & Interface Declarations

### Hook 1: `useBookings`
* **File Path**: `src/hooks/useBookings.ts`
* **Signature**:
  ```typescript
  export function useBookings(salonId: string | null, day: string): {
    bookings: Appointment[];
    setBookings: React.Dispatch<React.SetStateAction<Appointment[]>>;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
  }
  ```
* **Rationale**: We return `setBookings` to allow components to perform local/optimistic status transitions before background database sync completes, matching existing UX behaviors in `dashboard/page.tsx`.

### Hook 2: `useAuthState`
* **File Path**: `src/hooks/useAuth.ts`
* **Signature**:
  ```typescript
  export interface LandingAuthState {
    isChecking: boolean;
    isSignedIn: boolean;
    displayName: string | null;
    nextPath: "/dashboard" | "/onboarding" | "/auth";
    nextLabel: string;
  }

  export function useAuthState(): LandingAuthState;
  ```
* **Rationale**: Standardizes authentication and onboarding routing logic. We preserve `syncSession` and `onAuthStateChange` subscription management.

### Hook 3: `useTimeUpdate`
* **File Path**: `src/hooks/useTimeUpdate.ts`
* **Signature**:
  ```typescript
  export function useTimeUpdate(enabled: boolean): {
    nowTimeMin: number;
    dateDisplayStr: string;
  }
  ```
* **Rationale**: Runs an interval timer every 60 seconds. Uses a `useRef` or local state initialization with `new Date()` to prevent client-side hydration mismatch.

### Hook 4: `useFlash`
* **File Path**: `src/hooks/useFlash.ts`
* **Signature**:
  ```typescript
  export function useFlash(durationMs?: number): {
    flash: string | null;
    show: (msg: string) => void;
    clear: () => void;
  }
  ```
* **Rationale**: Implements timeout clearing to prevent race conditions when the user invokes multiple consecutive flash messages.

---

## 3. Risk Assessment & Mitigations

As a staff engineer, we must identify potential breakage vectors and design appropriate defenses.

| Risk Area | Potential Issue | Mitigation Strategy |
|---|---|---|
| **Optimistic Updates** | Dashboard status change updates state immediately. If the hook does not export `setBookings`, this state sync breaks. | Hook exports `setBookings` state updater, allowing exact preservation of the existing UI state transition logic. |
| **Hydration Mismatch** | `useTimeUpdate` initializes based on current server-time, but client-time might vary, inducing Next.js hydration issues. | Use lazy state initialization. Return standard reactive states. |
| **Race Conditions in Hook Toggles** | Changing `day` fast in dashboard spawns multiple async fetch loops in `useBookings`. | Retain the `cancelled = true` hook cleanup cancellation token strategy inside the `useEffect` within `useBookings`. |
| **Unregistered Imports** | Moving core pieces out of pages might cause import path syntax errors. | Conduct a full workspace compilation check (`npm run build`) after each hook integration. |

---

## 4. Final Execution & Verification Summary

### 4.1. Syntax Error Resolution
Upon resuming the task, the production build was failing due to a syntax error in [src/app/dashboard/block-time/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/block-time/page.tsx#L436-L452). A `useEffect` hook was missing its closing parenthesis and dependency array `}, [salonId, loadBlocks]);`. This was corrected first to ensure a stable base state.

### 4.2. Remaining Hooks Integration
The local `[flash, setFlash] + setTimeout` state pattern was successfully replaced with the custom `useFlash` hook in the following components:
1. **[src/app/dashboard/new-booking/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/new-booking/page.tsx)**: Replaced local state with `useFlash(2000)` and updated all database loading/saving statuses to call `showFlash` with custom persistent timeouts for async operations.
2. **[src/app/dashboard/notifications/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/notifications/page.tsx)**: Replaced local state with `useFlash(1600)` and deleted the custom helper function `flashMsg` since `show` is returned directly from the hook.
3. **[src/app/dashboard/settings/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/settings/page.tsx)**: Replaced local state with `useFlash(1800)`. Updated 10+ mock buttons, the save handler, and the logout action to use `showFlash` instead of manual setTimeout hooks.
4. **[src/components/layout/Header.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/components/layout/Header.tsx)**: Integrated `useFlash(1800)` for the salon open/closed status toggle, removing the redundant `useEffect` listener and cleanup timeout logic.

### 4.3. Risks and Mitigations (Post-Implementation)
- **Active Timeout Race Conditions**: 
  - *Risk*: A user clicks multiple actions consecutively (e.g., in Settings where there are 10+ mockup alerts). The browser might queue multiple `setTimeout` timers that overwrite or prematurely clear the flash state.
  - *Mitigation*: Our custom `useFlash` hook employs a `timeoutRef` to actively check and clear any pending timeouts (`clearTimeout(timeoutRef.current)`) before setting a new message. This guarantees that only the most recent notification remains active and will persist for its full duration.
- **State Separation**:
  - *Risk*: Unifying notifications might inadvertently merge unrelated UI indicators.
  - *Mitigation*: In Settings, the green success badge (`saved` state) is kept separate from the standard warning/action flash messages because it has distinct CSS styles and layouts. Only standard action/warning toasts are managed by `useFlash`.

### 4.4. Verification Results
- Run `npm run build` which compiled successfully (Turbopack) with zero errors. All routes were fully generated.

