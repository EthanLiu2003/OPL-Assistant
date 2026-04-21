# OPL Assistant — Conversation Export

_Exported: 2026-04-21_

---

## Session Overview

This conversation covers the design and prototyping of **OPL Assistant**, a Chrome extension for competitive powerlifters that augments openpowerlifting.org with personalized standings, qualifying-total tracking, and lifter comparisons.

---

## Decisions Made

### Product positioning
- **Extension name:** OPL Assistant
- **Target site:** openpowerlifting.org
- **Audience:** Competitive powerlifters (not casual gym-goers)

### Surfaces & UX
- **Query interface location:** Right-side drawer (420px wide), toggled with `Ctrl+Shift+O`
- **Ambient mode:** Floating card (auto-shown on lifter profile pages)
- **Information density:** Balanced — generous whitespace, but data-rich
- **Design direction:** **OPL-Native / Blended** (matches the host site's aesthetic, not a foreign overlay)

### Visual direction (after prototype review)
**Direction C — Minimal Focus** was selected over:
- Direction A: Dense Terminal (too utilitarian)
- Direction B: Card Sections (too generic / web-app feeling)

**Palette:**
| Token | Value | Use |
|---|---|---|
| Background | `#111118` | Drawer, popup, ambient surfaces |
| Text | `#c8c8d0` | Body copy |
| Accent (red) | `#e05050` | Section headers, primary brand |
| Metrics (blue) | `#60a5fa` | DOTS / Wilks / IPF GL numbers, links |
| Positive (green) | `#4ade80` | Qualified totals, PRs |
| Gap (amber) | `#f59e0b` | Distance-to-qualifying indicators |

**Typography:** System sans-serif stack for UI, JetBrains Mono for numerical values. No card borders — content breathes.

---

## Implementation Plan (Approved)

### Phase 1 — Design system & shared components
- CSS variables aligned to OPL-native dark palette
- Reusable components: `SectionHeader`, `MetricValue`, `QualifyingBar`, `LifterRow`, `MeetRow`

### Phase 2 — Six preview routes
1. **`/drawer`** — Primary query interface with hero percentile, qualifying totals, comparable lifters, upcoming meets. States: empty, loading, results, error.
2. **`/popup`** — 320px toolbar popup with profile summary
3. **`/ambient`** — Floating "You vs. [Lifter]" comparison card
4. **`/ranking-row`** — Demo of injected highlighted row in OPL ranking tables
5. **`/settings`** — Profile (bodyweight, age, sex, equipment, federations, weight class), refresh controls, privacy
6. **`/onboarding`** — First-install single-page setup with sample prompts

### Phase 3 — Chrome extension package (Manifest V3)
- `extension/manifest.json` — `activeTab`, `storage`, content script for OPL
- `extension/content.js` + `content.css` — drawer injection
- `extension/background.js` — keyboard shortcut handler
- `extension/popup.html` + `popup.js` — toolbar popup
- `extension/options.html` — settings page
- `public/opl-assistant.zip` — distributable bundle
- Landing page at `/` with install instructions

---

## Technical Notes
- All data is **mocked** in this phase — no real OPL scraping or AI yet
- Profile persistence via `chrome.storage.local`
- Built on React 18 + Vite + Tailwind + TypeScript
- Keyboard shortcut: `Ctrl+Shift+O` (Cmd+Shift+O on macOS) toggles drawer

---

## Files Created

**Shared components**
- `src/components/opl/SectionHeader.tsx`
- `src/components/opl/MetricValue.tsx`
- `src/components/opl/QualifyingBar.tsx`
- `src/components/opl/LifterRow.tsx`
- `src/components/opl/MeetRow.tsx`

**Preview pages**
- `src/pages/DrawerPage.tsx`
- `src/pages/PopupPage.tsx`
- `src/pages/AmbientPage.tsx`
- `src/pages/RankingRowPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/OnboardingPage.tsx`
- `src/pages/Index.tsx` (landing page)

**Mock data**
- `src/lib/mock-data.ts`

**Chrome extension**
- `extension/manifest.json`
- `extension/background.js`
- `extension/content.js`
- `extension/content.css`
- `extension/popup.html`
- `extension/popup.js`
- `extension/options.html`
- `extension/icon48.png`, `extension/icon128.png`

**Distribution**
- `public/opl-assistant.zip`

**Design system**
- `src/index.css` (palette tokens)
- `tailwind.config.ts` (semantic color mapping)

---

## Open Questions / Next Steps
- Real data layer: scrape OPL or use the public dataset CSV?
- AI query parsing: which provider (Lovable AI Gateway recommended)?
- Federation qualifying-total source-of-truth (USAPL, IPF, USPA, etc.)
- DOTS/Wilks/IPF GL scoring formulas (deterministic — no AI needed)
- Profile sync across devices (currently `chrome.storage.local` only)
