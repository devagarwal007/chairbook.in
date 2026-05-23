# Staff Engineer Findings & Impact Analysis: CSS Migration (Phase 5)

This document tracks findings, migration strategies, and verification logs for **Phase 5: CSS Migration: globals.css → Tailwind**.

## 1. Refactoring Strategy

Following the guidelines of a staff engineer, we prioritize safety, backward compatibility, and methodical refactoring to prevent regressions. 

### Core Rules:
1. **Incremental Changes**: We do not delete all 6,500 lines of CSS at once. We proceed **bottom-up**, class-by-class or component-by-component.
2. **Double Verification**: After migrating each set of classes, we run `npm run build` to ensure no TypeScript compilation or Tailwind build issues.
3. **No Placeholders / Broken Layouts**: Every converted style must exactly replicate the existing visual aesthetics.
4. **Log Everything**: This file documents the exact mapping of CSS classes to Tailwind CSS utility classes.

---

## 2. Active Audits & Tailwind Mappings

### Target Batch 1: CSS Classes at the Bottom of `globals.css`

#### 1. `.my-flash`
* **Original CSS**:
  ```css
  .my-flash {
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: var(--ink); color: #fff; padding: 12px 18px;
    border-radius: 12px; font-size: 14px; z-index: 80;
    box-shadow: 0 16px 32px -12px rgba(0,0,0,0.3);
    animation: pop .25s cubic-bezier(0.2,0.9,0.3,1.2);
  }
  ```
* **Tailwind Translation**:
  `fixed bottom-[80px] left-1/2 -translate-x-1/2 bg-ink text-white py-3 px-[18px] rounded-xl text-sm z-[80] shadow-[0_16px_32px_-12px_rgba(0,0,0,0.3)] animate-pop`
  *(Note: `animate-pop` uses the custom keyframe `@keyframes pop` which is defined in `globals.css` and will remain in the keyframe/resets section of the lean file).*
* **Usage**:
  * [block-time/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/block-time/page.tsx)
  * [new-booking/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/new-booking/page.tsx)

#### 2. `.cust-empty` and `.cust-empty-ic`
* **Original CSS**:
  ```css
  .cust-empty {
    display: flex; gap: 14px; align-items: flex-start;
    padding: 32px; background: #fff; border: 1px solid var(--line); border-radius: 12px;
    margin-top: 8px;
  }
  .cust-empty-ic {
    width: 44px; height: 44px; border-radius: 12px; background: var(--bg-2);
    display: grid; place-items: center; flex-shrink: 0;
  }
  ```
* **Tailwind Translation**:
  * `.cust-empty` -> `flex gap-3.5 items-start p-8 bg-white border border-line rounded-xl mt-2`
  * `.cust-empty-ic` -> `w-11 h-11 rounded-xl bg-bg-2 grid place-items-center shrink-0`
* **Usage**:
  * [block-time/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/block-time/page.tsx)
  * [customers/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/customers/page.tsx)
  * [notifications/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/notifications/page.tsx) (Note: `notifications/page.tsx` has some inline style overrides that we must handle carefully).

#### 3. `.cust-list-head`, `.cust-count`
* **Original CSS**:
  ```css
  .cust-list-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 4px 10px; gap: 12px;
  }
  .cust-count { font-size: 13px; color: var(--ink); font-weight: 500; }
  @media (max-width: 720px) {
    .cust-list-head { flex-direction: column; align-items: flex-start; gap: 8px; }
  }
  ```
* **Tailwind Translation**:
  * `.cust-list-head` -> `flex items-center justify-between px-1 pb-2.5 gap-3 max-[720px]:flex-col max-[720px]:items-start max-[720px]:gap-2`
  * `.cust-count` -> `text-[13px] text-ink font-medium`
* **Usage**:
  * [block-time/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/block-time/page.tsx)
  * [customers/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/customers/page.tsx)

#### 4. `.eng-tabs`, `.eng-tab`, `.eng-count`
* **Original CSS**:
  ```css
  .eng-tabs {
    display: flex; gap: 6px; align-items: center; margin-bottom: 18px; flex-wrap: wrap;
  }
  .eng-tab {
    height: 34px; padding: 0 14px; border-radius: 999px;
    border: 1px solid var(--line); background: #fff;
    display: inline-flex; align-items: center; gap: 8px;
    font-family: inherit; font-size: 13px; color: var(--ink-2); cursor: pointer;
    transition: background .15s, border-color .15s, color .15s;
  }
  .eng-tab:hover { border-color: var(--line-2); }
  .eng-tab.on { background: var(--ink); border-color: var(--ink); color: #fff; }
  .eng-tab.on .eng-count { background: rgba(255,255,255,0.18); color: #fff; }
  .eng-count {
    font-size: 11px; padding: 2px 7px; border-radius: 999px;
    background: var(--bg-2); color: var(--ink-3); font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
  }
  @media (max-width: 720px) {
    .eng-tabs { overflow-x: auto; flex-wrap: nowrap; margin: 0 -16px 16px; padding: 0 16px; }
    .eng-tabs::-webkit-scrollbar { display: none; }
    .eng-tabs > div { display: none; }
  }
  ```
* **Tailwind Translation**:
  * `.eng-tabs` -> `flex gap-1.5 items-center mb-4.5 flex-wrap max-[720px]:overflow-x-auto max-[720px]:flex-nowrap max-[720px]:mx-[-16px] max-[720px]:mb-4 max-[720px]:px-4 [&::-webkit-scrollbar]:hidden`
  * `.eng-tab` -> `h-[34px] px-3.5 rounded-full border border-line bg-white inline-flex items-center gap-2 font-inherit text-[13px] text-ink-2 cursor-pointer transition-all duration-150 hover:border-line-2`
    * Active state (`.on`): `bg-ink border-ink text-white`
  * `.eng-count` -> `text-[11px] py-0.5 px-1.75 rounded-full bg-bg-2 text-ink-3 font-mono font-medium`
    * Active state style override: `.eng-tab.on .eng-count` -> `bg-[rgba(255,255,255,0.18)] text-white`
* **Usage**:
  * [block-time/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/block-time/page.tsx)
  * [customers/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/customers/page.tsx)
  * [notifications/page.tsx](file:///c:/Users/devag/Downloads/Test%20design%20gemini/chairbook/src/app/dashboard/notifications/page.tsx)

---

- [x] **Batch 1 Compile Verification**: Run `npm run build` after replacing Batch 1 classes in globals.css and the target pages.
  * *Result*: Compiled successfully in 2.3s, TypeScript checked in 4.4s, zero errors.

### Target Batch 2: `checkbox-row` and `bt-` Classes

#### 1. `.checkbox-row` and `.checkbox-row input`
* **Original CSS**:
  ```css
  .checkbox-row{
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; cursor: pointer;
  }
  .checkbox-row input{ accent-color: var(--teal); width: 16px; height: 16px; flex-shrink: 0; }
  ```
* **Tailwind Translation**:
  * `.checkbox-row` -> `flex items-center gap-2.5 text-[13px] cursor-pointer`
  * `.checkbox-row input` -> `accent-teal w-4 h-4 shrink-0`
* **Usage**:
  * `dashboard/block-time/page.tsx`
  * `dashboard/bookings/[id]/page.tsx`
  * `dashboard/bookings/page.tsx`
  * `dashboard/new-booking/page.tsx`

#### 2. `.bt-stylist-row` and `.bt-stylist`
* **Original CSS**:
  ```css
  .bt-stylist-row{
    display: flex; gap: 6px; flex-wrap: wrap;
  }
  .bt-stylist{
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 12px; border: 1px solid var(--line); background: #fff;
    border-radius: 999px; font-family: inherit; font-size: 13px; color: var(--ink-2);
    cursor: pointer; transition: border-color .15s, background .15s;
  }
  .bt-stylist:hover{ border-color: var(--line-2); }
  .bt-stylist.on{ border-color: var(--teal); background: var(--teal-soft); color: var(--teal-ink); font-weight: 500; }
  ```
* **Tailwind Translation**:
  * `.bt-stylist-row` -> `flex gap-1.5 flex-wrap`
  * `.bt-stylist` -> `inline-flex items-center gap-2 py-2 px-3 border border-line bg-white rounded-full font-inherit text-[13px] text-ink-2 cursor-pointer transition-all duration-150 hover:border-line-2`
    * Active state (`.on`): `border-teal bg-teal-soft text-teal-ink font-medium`
* **Usage**:
  * `dashboard/block-time/page.tsx`

#### 3. `.bt-reason-grid`, `.bt-reason`, `.bt-reason-ic`
* **Original CSS**:
  ```css
  .bt-reason-grid{
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
  }
  .bt-reason{
    display: flex; align-items: center; gap: 8px;
    padding: 10px 12px; border: 1px solid var(--line); background: #fff;
    border-radius: 10px; font-family: inherit; font-size: 13px; color: var(--ink-2);
    cursor: pointer; transition: border-color .15s, background .15s;
    text-align: left;
  }
  .bt-reason:hover{ border-color: var(--line-2); }
  .bt-reason.on{ border-color: var(--teal); background: var(--teal-soft); color: var(--teal-ink); font-weight: 500; }
  .bt-reason-ic{
    width: 24px; height: 24px; border-radius: 6px;
    display: grid; place-items: center; flex-shrink: 0;
    background: var(--bg-2); color: var(--ink-2);
  }
  .bt-reason.on .bt-reason-ic{ background: var(--teal); color: #fff; }
  @media (max-width: 720px){
    .bt-reason-grid{ grid-template-columns: repeat(2, 1fr); }
  }
  ```
* **Tailwind Translation**:
  * `.bt-reason-grid` -> `grid grid-cols-3 gap-1.5 max-[720px]:grid-cols-2`
  * `.bt-reason` -> `flex items-center gap-2 py-2.5 px-3 border border-line bg-white rounded-[10px] font-inherit text-[13px] text-ink-2 cursor-pointer transition-all duration-150 text-left hover:border-line-2`
    * Active state (`.on`): `border-teal bg-teal-soft text-teal-ink font-medium`
  * `.bt-reason-ic` -> `w-6 h-6 rounded-md grid place-items-center shrink-0 bg-bg-2 text-ink-2`
    * Active state (`.on .bt-reason-ic`): `bg-teal text-white`
* **Usage**:
  * `dashboard/block-time/page.tsx`

#### 4. `.bt-list`, `.bt-row`, `.bt-ic`, `.bt-main`, `.bt-name`, `.bt-meta`, `.bt-note`, `.bt-actions`
* **Original CSS**:
  ```css
  .bt-list{
    display: flex; flex-direction: column; gap: 8px;
  }
  .bt-row{
    display: grid; grid-template-columns: 44px 1fr auto;
    gap: 14px; padding: 14px 18px; align-items: center;
    background: #fff; border: 1px solid var(--line); border-radius: 12px;
  }
  .bt-ic{
    width: 40px; height: 40px; border-radius: 10px;
    display: grid; place-items: center; flex-shrink: 0;
    background: var(--bg-2); color: var(--ink-2);
  }
  .bt-tone-amber .bt-ic{ background: var(--amber-soft); color: var(--amber-ink); }
  .bt-tone-rose .bt-ic{ background: var(--rose-soft); color: var(--rose); }
  .bt-main{ min-width: 0; }
  .bt-name{
    font-size: 14px; font-weight: 600; letter-spacing: -0.005em;
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  }
  .bt-meta{
    font-size: 12px; color: var(--ink-3); margin-top: 4px; line-height: 1.5;
  }
  .bt-meta strong{ color: var(--ink-2); font-weight: 500; }
  .bt-note{
    font-size: 12px; color: var(--ink-3); font-style: italic; margin-top: 6px;
    padding-left: 10px; border-left: 2px solid var(--line-2);
  }
  .bt-actions{ display: flex; gap: 6px; }
  ```
* **Tailwind Translation**:
  * `.bt-list` -> `flex flex-col gap-2`
  * `.bt-row` -> `grid grid-cols-[44px_1fr_auto] gap-3.5 p-[14px_18px] items-center bg-white border border-line rounded-xl`
  * `.bt-ic` -> dynamic background and text color classes depending on the stylist block tone:
    * `w-10 h-10 rounded-[10px] grid place-items-center shrink-0`
    * If amber: `bg-amber-soft text-amber-ink`
    * If rose: `bg-rose-soft text-rose`
    * Otherwise: `bg-bg-2 text-ink-2`
  * `.bt-main` -> `min-w-0`
  * `.bt-name` -> `text-sm font-semibold tracking-[-0.005em] flex items-center gap-2 flex-wrap`
  * `.bt-meta` -> `text-xs text-ink-3 mt-1 leading-[1.5]`
    * Inner strong: `text-ink-2 font-medium`
  * `.bt-note` -> `text-xs text-ink-3 italic mt-1.5 pl-2.5 border-l-2 border-line-2`
  * `.bt-actions` -> `flex gap-1.5`
* **Usage**:
  * `dashboard/block-time/page.tsx`

- [x] **Batch 2 Compile Verification**: Run `npm run build` after replacing Batch 2 classes.
  * *Result*: Compiled successfully, TypeScript checked, zero errors.

### Target Batch 3: Settings Page Classes (`set-`)
* **Original CSS**:
  ```css
  .set-toggle, .set-toggle-track, .set-container, etc.
  ```
* **Tailwind Translation**:
  * iOS toggles were translated using pure Tailwind peer-checked sibling states: `peer-checked:bg-teal`, `peer-checked:before:translate-x-[14px]`, etc.
* **Usage**:
  * `dashboard/settings/page.tsx`
  * `checkout/[bookingId]/page.tsx`
* **Result**: All `set-` classes completely eliminated.

### Target Batch 4: Customer Profile & Booking Details Profile Layout Classes
* **Original CSS**:
  ```css
  .profile-app, .profile-topbar, .profile-topbar-inner, .profile-topbar .book-back, .profile-main, .profile-cta, and all associated max-width/responsive media query overrides.
  ```
* **Tailwind Translation**:
  * `.profile-app` -> `pb-[120px] max-[640px]:pb-[100px]`
  * `.profile-topbar` -> `bg-surface border-b border-line sticky top-0 z-30`
  * `.profile-topbar-inner` -> `max-w-[760px] mx-auto flex items-center h-14 px-6 max-[640px]:px-4 max-[640px]:h-[52px]`
  * `.profile-topbar .book-back` -> `grid place-items-center w-9 h-9 rounded-full text-ink-2 transition-colors duration-150 no-underline hover:bg-bg-2 hover:text-ink`
  * `.profile-main` -> `max-w-[760px] mx-auto p-[22px_24px_32px] flex flex-col gap-4.5 max-[640px]:p-[18px_16px_28px] max-[640px]:gap-3.5`
  * `.profile-cta` -> `fixed bottom-[calc(var(--bottom-nav-h)+24px)] left-1/2 -translate-x-1/2 max-w-[712px] w-[calc(100%-48px)] bg-white/92 backdrop-blur border border-line rounded-2xl p-2.5 flex gap-2.5 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.1)] z-40 max-[640px]:left-4 max-[640px]:right-4 max-[640px]:transform-none max-[640px]:max-w-none max-[640px]:w-auto max-[640px]:bottom-[calc(var(--bottom-nav-h)+16px)]`
  * `.profile-cta .btn-lg` -> `h-12 text-sm px-4.5 max-[640px]:text-[13px] max-[640px]:h-11 max-[640px]:px-3.5`
* **Usage**:
  * `dashboard/customers/[id]/page.tsx`
  * `dashboard/bookings/[id]/page.tsx`
* **Result**: Safely deleted lines 5656 to 6042 and lines 6053 to 6175 in `src/app/globals.css`.

---

- [x] **Phase 5 Compile Verification (Part 1)**: Run `npm run build` after replacing all target classes (Batch 1-4) and cleaning up `globals.css`.
  * *Result*: Compiled successfully in 4.2s, TypeScript checked in 15.5s, zero errors. All pages prerendered successfully.

### Target Batch 5: Notifications Page Classes (`nt-`)
* **Original CSS**:
  ```css
  .nt-unread-pill, .nt-group, .nt-day, .nt-list, .nt-row, .nt-kind-dot, .nt-kind-ic, .nt-body, .nt-title, .nt-dot, .nt-meta, .nt-side, .nt-ts, .nt-dismiss, and all associated media queries and hover overrides.
  ```
* **Tailwind Translation**:
  * `.nt-unread-pill` -> `inline-block text-[10px] bg-rose-soft text-rose py-0.5 px-2 rounded-full font-semibold align-middle`
  * `.nt-group` -> `mb-2`
  * `.nt-day` -> `text-[11px] font-bold text-ink-3 uppercase tracking-[0.07em] py-3 px-0 pb-1.5`
  * `.nt-list` -> `flex flex-col gap-0 border border-line rounded-lg overflow-hidden bg-white`
  * `.nt-row` -> `flex items-start gap-3 p-[14px_16px] border-b border-line last:border-b-0 transition-colors duration-120 relative hover:bg-bg-2 max-[540px]:p-3 max-[540px]:gap-2.5 ${n.unread ? 'bg-[#f7fbf9] hover:bg-teal-soft' : 'bg-white'}`
  * `.nt-kind-dot` -> `absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full grid place-items-center border-2 border-white [&>svg]:w-2.25 [&>svg]:h-2.25` (with dynamic background and text mapping classes for `kind.tone`)
  * `.nt-kind-ic` -> `w-10 h-10 min-w-10 rounded-[10px] grid place-items-center shrink-0` (with dynamic background and text mapping classes for `kind.tone`)
  * `.nt-body` -> `flex-1 min-w-0`
  * `.nt-title` -> `text-[13px] font-medium text-ink leading-[1.4] flex items-center gap-1.5 flex-wrap`
  * `.nt-dot` -> `w-1.5 h-1.5 rounded-full bg-teal shrink-0 inline-block`
  * `.nt-meta` -> `text-xs text-ink-3 mt-0.75 leading-[1.45] whitespace-nowrap overflow-hidden text-ellipsis max-[540px]:text-[11px]`
  * `.nt-side` -> `flex flex-col items-end gap-1.5 shrink-0 min-w-[50px]`
  * `.nt-ts` -> `text-[11px] text-ink-4 whitespace-nowrap tabular-nums max-[540px]:text-[10px] mono`
  * `.nt-dismiss` -> `w-5.5 h-5.5 rounded-md border border-line bg-transparent grid place-items-center cursor-pointer text-ink-3 transition-all duration-100 p-0 hover:bg-rose-soft hover:text-rose hover:border-rose`
* **Usage**:
  * `dashboard/notifications/page.tsx`
* **Result**: Safely deleted lines 5435 to 5624 in `src/app/globals.css`.

---

- [x] **Phase 5 Compile Verification (Part 2)**: Run `npm run build` after replacing all Batch 5 notification classes and cleaning up `globals.css`.
  * *Result*: Compiled successfully in 5.3s, TypeScript checked in 5.2s, zero errors. All pages prerendered successfully.

### Target Batch 6: Bookings Calendar Page Classes (`bk-`)
* **Original CSS**:
  ```css
  .bk-toolbar, .bk-toolbar-l, .bk-toolbar-r, .bk-nav, .bk-date-range, .bk-calendar, .bk-grid-head, .bk-day-head, .bk-day-dow, .bk-day-dom, .bk-day-count, .bk-stylist-head, .bk-stylist-name, .bk-stylist-count, .bk-grid, .bk-time-col, .bk-time-row, .bk-time-lbl, .bk-day-col, .bk-hour-row, .bk-now, .bk-now-lbl, .bk-block, .bk-block-top, .bk-block-name, .bk-block-time, .bk-block-svc, and responsive overrides.
  ```
* **Tailwind Translation**:
  * `.bk-toolbar` -> `flex items-center justify-between gap-4 mb-3.5 flex-wrap max-[980px]:flex-col max-[980px]:items-stretch`
  * `.bk-toolbar-l`, `.bk-toolbar-r` -> `flex items-center gap-4 max-[980px]:justify-between` / `flex items-center gap-2.5 max-[980px]:justify-between`
  * `.bk-nav` -> `flex gap-1.5 items-center`
  * `.bk-date-range` -> `flex flex-col gap-0.5`
  * `.bk-calendar` -> `overflow-hidden p-0 max-[720px]:overflow-x-auto`
  * `.bk-grid-head` -> `grid grid-cols-[60px_repeat(7,1fr)] border-b border-line bg-white sticky top-0 z-10 max-[720px]:grid-cols-[44px_repeat(7,minmax(80px,1fr))] max-[720px]:min-w-[600px]`
  * `.bk-day-head` -> `p-3 text-center border-r border-line flex flex-col items-center justify-center max-[720px]:p-[8px_6px] ${isToday ? 'bg-teal-soft' : ''}`
  * `.bk-day-dow`, `.bk-day-dom`, `.bk-day-count` -> custom Tailwind classes corresponding to `isToday` state.
  * `.bk-block` -> custom dynamic left border, background, and text colors based on appointment status.
  * `.bk-now`, `.bk-now-lbl` -> inline absolute position classes using dynamic top property.
* **Usage**:
  * `dashboard/bookings/page.tsx`
* **Result**: Safely deleted calendar styles block (lines 5211 to 5398) in `src/app/globals.css`.

### Target Batch 7: Duplicate Notification Styles (`nt-` duplicate)
* **Original CSS**:
  ```css
  Duplicates of notification styling classes imported from styles.css (lines 5130 to 5210).
  ```
* **Tailwind Translation**:
  * This duplicate CSS section has been completely cleaned up as `notifications/page.tsx` was fully migrated to Tailwind in Batch 5.
* **Result**: Safely deleted duplicate notification styles block (lines 5130 to 5210) in `src/app/globals.css`.

---

- [x] **Phase 5 Compile Verification (Part 3)**: Run `npm run build` after replacing all calendar page classes and duplicate notification classes, and cleaning up `globals.css`.
  * *Result*: Compiled successfully in 2.3s, TypeScript checked in 4.4s, zero errors. All pages prerendered successfully.
