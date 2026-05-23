# Staff Engineer Findings & Impact Analysis: Toast/Flash Provider (Phase 8)

This document tracks findings, design details, implementation details, and verification plans for **Phase 8: Toast/Flash Provider**.

## 1. Objectives & Refactoring Strategy

In the current codebase, the toast notification ("flash") UI and timeout logic are copy-pasted across 10+ pages and components. This leads to code duplication, inconsistent styling (different z-indexes, padding, font-sizes, and animation definitions), and potential race conditions/overlapping elements if multiple toasts trigger simultaneously.

To address this DRY violation, Phase 8 introduces a unified global toast system:
1. **`ToastContext` & `ToastProvider`**: A global context provider wrapping the dashboard route tree to manage active toast state, handle timing side effects, and render a single high-priority toast element.
2. **`useToast`**: A custom React context hook that exposes a consistent `show(message, durationMs?)` interface to trigger toasts from any descendant component.
3. **Refactoring Pages & Components**: Removing the local `useFlash` hook references, local state variables, and fixed-position `<div>` markup in all dashboard views and the `Header` component, replacing them with a simple call to `useToast()`.

---

## 2. API Design & Context Specifications

### Provider Details
* **File Path**: `src/context/ToastContext.tsx`
* **Signature**:
  ```typescript
  export interface ToastContextType {
    show: (msg: string, durationMs?: number) => void;
  }
  
  export function ToastProvider({ children }: { children: React.ReactNode }): React.ReactElement;
  export function useToast(): ToastContextType;
  ```

### Styling Specifications
To maintain absolute visual parity with the existing premium design, the unified toast DOM element in `ToastProvider` will use:
* **Tailwind CSS classes**: `fixed bottom-[100px] left-1/2 -translate-x-1/2 bg-ink text-white p-[10px_16px] rounded-[10px] text-[13px] z-[9999] shadow-[0_12px_24px_-10px_rgba(0,0,0,0.3)] animate-[pop_0.2s_ease-out]`
* **Z-Index**: `z-[9999]` (guarantees the toast sits on top of all modal backdrops which run at `z-100` or `z-[999]`).

---

## 3. Risk Assessment & Mitigations

As a staff engineer, we must preemptively analyze potential breakage vectors and detail the necessary defenses:

| Risk Area | Potential Issue | Mitigation Strategy |
|---|---|---|
| **Context Access Out of Bounds** | If a page/component attempts to call `useToast` outside the provider context, React will throw a runtime error. | Wrap `DashboardLayout` in `src/app/dashboard/layout.tsx` with `ToastProvider`. Since all screens using toast notifications are dashboard sub-routes or parts of the dashboard UI (like the `Header`), they are guaranteed to sit within the provider's boundaries. |
| **Custom Duration Overrides** | Pages like `dashboard/page.tsx` pass dynamic values to `showFlash` (e.g., 1800ms, 3000ms). If `show` only supports a fixed 2s duration, this UX nuance is lost. | Define `show` in `ToastContextType` to accept an optional `durationMs` parameter, defaulting to 2000ms. |
| **State Collision in Settings** | The Settings page features a green "Changes saved successfully" alert (`saved` state) alongside general warning toasts. Merging both into the global provider could break the distinct styling of the green success box. | Keep the `saved` local success banner separate as it has distinct styles (`bg-[var(--green)]` vs standard dark gray `bg-ink`) and is tied to form submission lifecycle. Only refactor general actions/mockup warning toasts (`flash` state) to use the global provider. |
| **Timeout Race Conditions** | If a user rapidly clicks multiple interactive actions, overlapping timeouts might trigger, causing the toast to hide prematurely. | The global `ToastProvider` will utilize a `timeoutRef` to clear any pending timeout before setting a new toast message. This ensures that only the latest toast message is shown and stays active for its full duration. |

---

## 4. Implementation Steps

1. Create `src/context/ToastContext.tsx`.
2. Wrap children in `src/app/dashboard/layout.tsx` with `ToastProvider`.
3. Sequentially update each of the 11 files, removing `useFlash` imports/calls and deleting local toast markup `{flash && ...}`.
4. Clean up `src/hooks/useFlash.ts` and its export in `src/hooks/index.ts` once it is completely decommissioned.
5. Validate via production build (`npm run build`).
