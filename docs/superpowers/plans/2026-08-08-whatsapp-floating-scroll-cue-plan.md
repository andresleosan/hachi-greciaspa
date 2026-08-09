# WhatsApp Floating Scroll Cue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the home WhatsApp action into a round floating icon that remains available after the hero, and make the scroll cue visibly vertical.

**Architecture:** Keep the scroll cue in `CinematicHero`, but render the persistent WhatsApp action at the `LandingNueva` level so GSAP transforms cannot trap its fixed positioning inside the hero. `CinematicHero` reports logo visibility through an optional callback; `LandingNueva` uses that state to reveal the floating action. Use an inline SVG icon with an accessible label and adjust the cue label/line styling without introducing dependencies.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, CSS in `src/styles/luxe.css`.

## Global Constraints

- Do not modify authentication, Firebase, reservations, or business logic.
- Reuse `WHATSAPP_URL` and `WHATSAPP_DISPLAY` from `src/config/contact.ts`.
- Preserve responsive behavior, visible keyboard focus, and reduced-motion compatibility.
- Use only official project assets and no new dependencies.

---

### Task 1: Update the WhatsApp icon and vertical cue contract

**Files:**
- Modify: `src/landing/CinematicHero.tsx:64-148`
- Modify: `src/pages/LandingNueva.tsx:1-78`
- Modify: `src/styles/luxe.css:531-592`
- Test: `tools/CinematicHero.test.ts:66-80`

**Interfaces:**
- Consumes: existing `WHATSAPP_URL`, `WHATSAPP_DISPLAY`, `sl-hero--logo-visible`, and cue markup.
- Produces: `onLogoVisibleChange` visibility contract, round `.sl-hero-whatsapp` icon action, and a vertical `.sl-scroll-cue` contract.

- [x] **Step 1: Extend the source contract test**

Assert that `CinematicHero` exposes the logo visibility callback, `LandingNueva` renders an inline SVG WhatsApp action with an accessible label, and the scroll label uses vertical writing mode while the CTA uses fixed positioning.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run tools/CinematicHero.test.ts`

Expected: FAIL because the current CTA is inside the transformed hero and the scroll cue is horizontal.

- [x] **Step 3: Implement the minimal JSX and CSS changes**

Add the optional logo visibility callback to `CinematicHero`, render the WhatsApp anchor in `LandingNueva`, and replace visible text with an inline SVG plus accessible label. Set the CTA to `position: fixed`, make it circular, and place it above the cue. Set `.sl-scroll-label` to vertical writing mode and keep the arrow as a vertical line.

- [x] **Step 4: Run the focused test and verify it passes**

Run: `npx vitest run tools/CinematicHero.test.ts`

Expected: PASS.

### Task 2: Verify the landing behavior

**Files:**
- Test: `tools/CinematicHero.test.ts`
- Verify: `src/landing/CinematicHero.tsx`, `src/styles/luxe.css`

- [x] **Step 1: Run the client suite**

Run: `npm run test:client`

Expected: all client test files and tests pass.

- [x] **Step 2: Run static checks**

Run: `npm run lint`; `npx tsc --noEmit`; `npm run build`; `npm run assets:check`

Expected: all commands exit successfully.

- [x] **Step 3: Verify in the browser**

Start the production preview and inspect `/` at desktop and mobile widths. Confirm the WhatsApp circle is hidden before logo reveal, visible after reveal, remains visible while scrolling through the landing and near the footer, and sits above the vertical `Desliza` cue. Confirm keyboard focus is visible.
