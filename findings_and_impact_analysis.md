# ChairBook.in — Staff Engineer Findings & Impact Analysis

This document outlines the findings, architectural considerations, risk assessments, and implementation strategies for resolving 12 critical UI/UX bugs across the ChairBook salon booking and POS system. 

As a staff engineer, our goal is to deliver these fixes with zero regression, preserving core business workflows and data integrity.

---

## Bug 1 — Notification "Mark as Read" Not Persisting to DB
- **Location:** [notifications/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/notifications/page.tsx)
- **Findings:** The fetch operation retrieves notifications from Supabase but maps them using a sequential `id` (`i + 1`), thereby discarding the actual database UUID (`n.id`). The local action handlers (`markRead` and `markAllRead`) only update the local component state (`setNotifs`), never syncing back to Supabase.
- **Potential Risks:** Users will see read notifications re-appear as unread upon refreshing the page, leading to a frustrating experience.
- **Proposed Solution:** 
  1. Extend the `NotificationItem` interface to include an optional `dbId?: string`.
  2. Map the database UUID to `dbId` in the `useEffect` fetch logic.
  3. Update `markRead` to fire an update query to Supabase: `.update({ read: true }).eq("id", dbId)` using the preserved UUID.
  4. Update `markAllRead` to fire an update query: `.update({ read: true }).eq("salon_id", salonId).eq("read", false)`.

---

## Bug 2 — No Shimmer/Loading Skeleton for Notifications
- **Location:** [notifications/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/notifications/page.tsx)
- **Findings:** When `loading` is true, the notifications page returns a blank container, causing a jarring visual layout shift when the data finally renders.
- **Potential Risks:** Jarring layout shifts and poor perceived performance, especially on slower 3G/4G connections.
- **Proposed Solution:** Replace the blank loading check with a structured loading skeleton that mimics the exact layout of the page using the existing `.pulse` shimmer CSS class.

---

## Bug 3 — All Stylists & Time Slots Show No Visual Difference
- **Location:** [page.tsx (dashboard)](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/page.tsx) and [bookings/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/bookings/page.tsx)
- **Findings:** 
  - The filter chips in dashboard are mapping avatars using `.avatar.sm.tone-${s.tone}`. If no DB tone is defined (or if falls back to empty strings), it defaults incorrectly. In addition, the time slot values need to display in 12-hour AM/PM format (via `formatTime12h`) to maintain consistency and premium design standards.
- **Potential Risks:** Users cannot visually differentiate between stylists or understand the timeline constraints clearly.
- **Proposed Solution:** Ensure the `tone` field correctly resolves to CSS classes `.tone-a` through `.tone-f` (by mapping and stripping the "tone-" prefix in selectors), and ensure the time outputs consistently format to AM/PM.

---

## Bug 4 — Cash Received Input Overflow (Horizontal Scrollbar)
- **Location:** [globals.css](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/globals.css) (line 4482)
- **Findings:** The text input within the cash checkout panel uses a font-size of 36px and lacks flex-shrink boundaries. Standard browsers display number spinners on hover/focus, which pushes the input content out of the parent container, inducing a horizontal scrollbar.
- **Potential Risks:** Layout breakage and horizontal scrolling on mobile checkout screens.
- **Proposed Solution:**
  1. Style `.ck-cash-input input` with `min-width: 0`.
  2. Hide the default outer and inner webkit/firefox number spinner controls.
  3. Apply `overflow: hidden;` to `.ck-pay-panel` as a safety layout wrapper.

---

## Bug 5 — Cannot Mark Booking Complete Without Payment
- **Location:** [page.tsx (dashboard)](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/page.tsx)
- **Findings:** Inside the expanded booking card details, the "Completed" status action button calls `updateStatus(appt.id, "completed")` directly. This updates the status in the database to completed, completely bypassing the checkout and receipt generation pipeline.
- **Potential Risks:** Loss of revenue tracking and payment attribution. Salons could mark bookings as complete without recording UPI/Cash/Card payments, leading to severe discrepancies in the insights/revenue dashboards.
- **Proposed Solution:** Modify the "Completed" button click handler in the expanded dashboard card to redirect the user to `/dashboard/checkout/[bookingId]`. The checkout flow already updates the booking status to "Paid" (which maps to "Completed") upon recording the payment.

---

## Bug 6 — Walk-In Popup Phone Number Overflows Div
- **Location:** [globals.css](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/globals.css) (line 3333) & [page.tsx (dashboard)](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/page.tsx) (WalkInModal)
- **Findings:** `.field-row` is defined as `grid-template-columns: 1fr 1fr` without collapsing on mobile screen widths (e.g. <= 480px). This forces the input elements to squeeze and overflow the modal boundaries. The `.modal` wrapper also lacks viewport constraints.
- **Potential Risks:** Input elements clipping outside the modal box, rendering the form unclickable or cut-off on mobile.
- **Proposed Solution:**
  1. Add a media query for `.field-row` to stack elements into `grid-template-columns: 1fr` below 480px.
  2. Add `max-width: calc(100vw - 32px)` and `box-sizing: border-box` to `.modal` to guarantee safety boundaries.
  3. Apply `width: 100%`, `minWidth: 0`, and `boxSizing: "border-box"` to the inputs inside the modal.

---

## Bug 7 — Error on "I Have Received the Payment" Button
- **Location:** [checkout/[bookingId]/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/checkout/%5BbookingId%5D/page.tsx) (line 330)
- **Findings:** In `finishPayment`, the code inserts a record into the `payments` table. If this insert fails (e.g. constraint violation, duplicate checkout attempts, or column structure mismatch), the code throws an error. This throws blocks the subsequent critical writes: deleting/inserting updated `booking_services` and marking the booking status as "Paid".
- **Potential Risks:** Stalled POS terminal. The cashier clicks the button, the DB errors, the UI hangs, and the booking remains unpaid in the database, requiring manual support.
- **Proposed Solution:** Re-architect this block to follow a "best-effort" pattern. Wrap the payment insertion block. Make the optional values (`tip` and `discount`) conditional (only add them to the insert payload if > 0). If the insert fails, catch the error and log it, but do NOT throw. Proceed to update the booking status to "Paid" and transition the page to show the receipt.

---

## Bug 8 — Tip for Stylist Default Should Be "None" (₹0)
- **Location:** [checkout/[bookingId]/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/checkout/%5BbookingId%5D/page.tsx)
- **Findings:** The component initial state initializes the `tip` state to `100` instead of `0`. It also resets the state to `100` when a new booking is resolved.
- **Potential Risks:** Cashiers accidentally charging a default ₹100 tip to customers who did not authorize it.
- **Proposed Solution:** Change the initial state value to `0` and update the reset logic to use `0` as the default value.

---

## Bug 9 — Generate Valid QR Code on Payment Screen
- **Location:** [checkout/[bookingId]/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/checkout/%5BbookingId%5D/page.tsx)
- **Findings:** The UPI payment screen renders a simulated, synthetic SVG that mimics a QR code pattern but is completely non-scannable.
- **Potential Risks:** Customers cannot scan the POS terminal to pay, resulting in transaction delays and manual VPA entry.
- **Proposed Solution:** Replace the synthetic SVG with a dynamic `<img>` tag pointing to `https://api.qrserver.com/v1/create-qr-code/`. Format a valid UPI link in the URL parameter containing the payee VPA, payee name, amount to collect, currency, and note.

---

## Bug 10 — Booking Popup on Calendar Shows at Bottom (Should Be Center)
- **Location:** [bookings/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/bookings/page.tsx)
- **Findings:** The selected booking quick view overlay container uses `alignItems: "flex-end"`. This anchors the panel to the bottom of the screen, where it is obscured by the persistent floating bottom navigation bar.
- **Potential Risks:** UI overlaps, hidden controls, and bad touch-target interactions.
- **Proposed Solution:**
  1. Change the backdrop style to use `alignItems: "center"` and add `padding: 16`.
  2. Change the inner container's border radius from bottom-sheet style (`"16px 16px 0 0"`) to a standard centered card layout (`16`).
  3. Add `maxHeight: "calc(100vh - 32px)"` and `overflowY: "auto"` to guarantee readability on small screens.

---

## Bug 11 — Dashboard "Review →" CTA Button Not Working
- **Location:** [page.tsx (dashboard)](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/page.tsx)
- **Findings:** The "Review →" follow-up reminder button is a plain `<button>` element with no click handler.
- **Potential Risks:** Frustrating user experience when clicking interactive-looking buttons that do nothing.
- **Proposed Solution:** Import `useRouter` (which is already imported and instantiated in our refactoring) and add `onClick={() => router.push("/dashboard/bookings")}` (which handles checking active customer details).

---

## Bug 12 — Dashboard Today/Tomorrow Toggle Causes Double API Calls
- **Location:** [page.tsx (dashboard)](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/page.tsx)
- **Findings:** Changing the `day` state triggers a rendering cycle which calls the external async `loadDbBookings` function. This function modifies multiple states (`loadingBookings`, `appts`, `pageLoading`) asynchronously. Because of the separate rendering cycles and lack of cancellation tokens, quick toggles between "Today" and "Tomorrow" generate race conditions and duplicate API requests.
- **Potential Risks:** Infinite rendering loops, race conditions displaying the wrong day's bookings, and excessive database reads.
- **Proposed Solution:**
  1. Inline the fetching logic inside the primary `useEffect` hook.
  2. Add a `cancelled` boolean reference check inside the effect.
  3. Use the cleanup function of the hook to toggle `cancelled = true`. This cancels state updates for any stale API requests, preventing race conditions.
  4. Remove the redundant `loadDbBookings` helper from the component body.
