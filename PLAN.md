# OPL Coach — Project Plan

A Chrome browser extension for openpowerlifting.org that transforms raw data tables into personalized answers to "where do I stand?"

This document is the single source of truth for product and engineering decisions. Visual design (color, typography, spacing, motion) lives in a separate design spec and is not covered here.

---

## 1 · The Product in One Paragraph

OPL Coach is a Chrome extension that enhances openpowerlifting.org. It answers the question every competitive powerlifter loads OPL to ask — *"where do I stand?"* — without requiring filter navigation or external calculators. Users type a single sentence describing themselves (e.g. *"24yo raw junior, 83kg, hit 650 USAPL"*) and receive a rich contextual card: their percentile, qualifying-total gaps across three federations, comparable "twin" lifters from OPL's public data, and meets in their area. Optionally, users save a profile so the extension ambiently enhances every OPL page they browse with personalized context.

## 2 · Problem & Prompt Fit

**README prompt:** Option 2 — *"Pick a website you use daily. Identify something that genuinely annoys you about it. Build a browser extension that fixes it."*

**The identified painpoints (all researched and documented):**

1. OPL's main site is *its own FAQ-acknowledged* UX failure — so poor for IPF lifters that OpenIPF was spun up as a workaround
2. Raw tables demand dropdown filtering to answer any personal question
3. Scoring comparison requires bouncing to 5+ external calculator sites (LifterCalc, DOTS Calculator, etc.)
4. No personalization — users see themselves as rows in a table, not as the subject
5. No unified federation qualifying-total tracking
6. No twin-lifter discovery or peer context
7. No inline answer to "where do I rank?"

**Why this is a strong Option 2 fit:**
- Real, specific annoyance (documented)
- No existing browser extensions (true whitespace)
- OPL data is fully public-domain (no hostile bot protection)
- Build time is predictable (no Cloudflare / CAPTCHA debugging)

**Where Option 1 overlap exists (acceptable per recruiter):**
- USAPL / Powerlifting America / USPA qualifying-total data has no public API. Must be compiled by hand from federation sites. This is real data-engineering reverse work.
- Upcoming meet schedules from federation sites: same situation.

## 3 · Who This Is For

**Primary persona:** Competitive and aspiring powerlifters, 18–45, mixed gender, domain-literate. They know DOTS, Wilks, IPF GL, federations, equipment categories, weight classes, age divisions.

**Secondary:** Junior/collegiate lifters curious where they'd fit. Coaches briefly looking at athletes. Powerlifting fans benchmarking elite competitors.

**Not for:** casual gymgoers, CrossFit crossover, fitness-app users in general.

**What this means for tone:** tool-first, information-dense, respectful of domain expertise. No motivational language. No coaching cliché. The product is a professional instrument.

## 4 · Product Thesis

> *OPL shows you the data. OPL Coach shows you **where you stand** and **what it takes to get where you're going**.*

Three taste decisions define the product:

**Decision 1 — Prompt-first, not filter-first.** The status quo assumes users speak the site's filter vocabulary (weight classes, federations, equipment). We flip it: users speak naturally; the extension translates.

**Decision 2 — Context over data.** A 617.5kg total is a number. *"82nd percentile in your division"* is context. The extension's job is transforming the former into the latter, everywhere.

**Decision 3 — Trajectory over snapshot.** Current standing is one data point. The path is the story. Surface twin lifters and compiled historical progression ranges, not static comparison only.

## 5 · Committed Taste Decisions (Do Not Compromise)

These decisions are locked. They differentiate the product from what a generic AI would produce.

| Decision | Rule |
|---|---|
| **No predictions or timelines.** Powerlifting is non-linear. Any ETA or probability is dishonest. | Never emit *"estimated in X months"*, *"Y% chance to qualify"*, *"on pace for"*, *"soon"*, *"eventually"*. |
| **Show all applicable federation paths.** Never pick a "primary" federation for the user. | USAPL, PA, USPA all show if applicable. Lifter decides their focus. |
| **Weight class proximity.** If the lifter's bodyweight is within ~2kg of an adjacent federation class, show both. | Reflects real lifter behavior (cuts and fills are common). |
| **All applicable age divisions displayed.** A 22yo sees Junior + Open + Collegiate totals simultaneously. | Never collapse to a single "most relevant" division. |
| **LLMs translate intent, never compute numbers.** | Every figure in the UI is produced by structured queries over indexed data. LLM output is constrained to entity extraction and narrative phrasing. |
| **Gaps expressed as distance, never deficit.** *"45 kg to USAPL Nationals"* — not *"45 kg behind"* or *"45 kg short"*. | No shame language for distant goals. |
| **Ambient mode visually defers to OPL. Widget mode has distinct identity.** | Ambient injections blend; summoned UI is branded. |
| **No motivational or gamified framing.** No hype words, no emojis in copy. | Professional tool aesthetic at all times. |

## 6 · Scope

### In v1

**Federations:** USAPL, Powerlifting America, USPA
**Sexes:** Men and women
**Age divisions:** Sub-Junior, Junior, Open, Masters (M1, M2, M3, M4), Collegiate
**Equipment:** Raw, Raw with Wraps, Single-Ply
**Three core surfaces:**
- Widget Drawer with "Where You Stand" card (prompt-first)
- Lifter profile inline panel (ambient)
- Rankings table row overlay (ambient)
**Supporting surfaces:** Extension icon popup, Settings page, First-install onboarding
**Profile saving:** Single profile, two fill paths (prompt-based, OPL-URL-link), inline CTA at bottom of card
**Data:** Full OPL CSV indexed client-side; curated qualifying totals database (3 federations); upcoming meet data (from OPL's meet endpoints)

### Out of v1 (document in APPROACH.md as "what we'd build next")

- Voice input
- Meet scraping from federation sites beyond OPL's own data
- Training program / attempt-selection suggestions
- Multi-profile / coach mode
- Group/squad comparison
- Mobile experience (extension is desktop-only)
- Export to training apps (PowerComp, StrengthLog, etc.)
- Social sharing
- Lifter watchlist with alerts
- Cross-federation strength normalization models
- Ranking-based qualification probability modeling (deferred by design — would violate no-predictions rule unless done very carefully)
- Coverage of federations beyond the three primary US ones

## 7 · Surface-by-Surface Specification

Visual details (dimensions, colors, typography) are captured in the separate design spec. This section defines purpose, content, interaction, and state coverage only.

### Surface 1 — Widget Drawer

**Purpose:** primary active-query interface. Houses the prompt bar and renders the "Where You Stand" card.

**Placement:** right-side slide-in drawer. Full viewport height. Resizable with persisted width.

**Triggers:**
- `⌘K` / `Ctrl+K` on any OPL page
- Click Chrome extension icon in toolbar
- Click "Open Full Comparison" link in the Lifter Profile Inline Panel

**Dismiss:** `Esc`, click outside, close button.

**Content areas:**
- Header (logomark, wordmark, settings icon, close icon)
- Prompt bar with palette-style input
- Suggestion chip row (only in empty state)
- Main scrollable content (the "Where You Stand" card)
- Collapsible footer (recent query history)

**States to design:**
- Empty (no query yet)
- Loading (skeleton matching card structure — no spinners)
- Populated
- Error (inline, gentle)
- Stale-data indicator

### Surface 2 — "Where You Stand" Card

**Purpose:** core value delivery. Rendered inside the Widget Drawer after prompt submission. Single scrollable column; sections separated by hairline dividers.

**Sections:**

**2.1 — Hero**
- Percentile label naming the specific cohort (*"TOP 8.3% OF ACTIVE JUNIOR RAW 83KG LIFTERS"*)
- Rank metadata (*"#47 of 261 · last 12 months"*)
- Lifter's total (prominent)
- Score row (DOTS, Wilks, IPF GL)
- Division tab switcher if lifter qualifies in multiple divisions (e.g. Junior + Open)

**2.2 — Qualifying Totals**
- Rows grouped by federation (USAPL, PA, USPA)
- Per row: status indicator, federation + event name, qualifying total, gap status
- Expandable: click a row to reveal eligible meets inline (not a modal)
- Status semantics: qualified / near / distant — never red, never shame language

**2.3 — Your Twins**
- Header: *"YOUR TWINS"*
- Subline: *"3 similar trajectories — lifters who were here at your age"*
- 3 compact lifter cards with: name, current age, current total + federation, historical progression note (*"Took 2 years to add 74 kg"*)
- Variance in progression times is intentional — reinforces non-linearity
- Click a card → opens that lifter's OPL profile in new tab
- Footer link: *"See all 12 twins"*

**2.4 — Meets Near You**
- Header: *"MEETS NEAR YOU"*
- Subline: *"Next 6 months · USAPL, PA, USPA"*
- Rows: date, meet name, distance, factual placement note (*"you'd podium"* based on historical qualifying thresholds — never predicted)

**2.5 — Federation Paths (optional / toggleable)**
- Three columns for USAPL, PA→IPF, USPA→IPL pathways
- Each level marked qualified / near / distant

**2.6 — Save Profile CTA**
- Persistent button at bottom: *"Save as your profile"*
- Post-save state: *"Saved — last updated just now"*
- Subtext explaining what saving unlocks (ambient mode)

### Surface 3 — Lifter Profile Inline Panel

**Purpose:** ambient enhancement injected into OPL's lifter profile pages. Shows the viewed lifter in the user's context.

**Placement:** right column of OPL's lifter profile page, matching OPL's column shape.

**Visual tone:** defers to OPL's design language. This is the "blend in" treatment.

**Visible only if user has saved a profile.** Otherwise show a single-line link *"Set your profile to compare"* that opens the widget.

**Content:**
- Header: *"YOU VS THIS LIFTER"*
- Their total / your total, with kg gap
- Compact checklists of their vs. your qualifying status
- Text button: *"Open Full Comparison ▸"* → opens Widget Drawer with this lifter pre-loaded as reference
- Subtle identity marker so users know the content is from the extension

### Surface 4 — Rankings Row Overlay

**Purpose:** inject the user's hypothetical row into any OPL rankings table at their computed position.

**Visual treatment:** distinct from surrounding rows (accent-border or background tint, per design spec) but structurally identical to OPL's own rows.

**Additional column:** delta to rank above (*"+35 to rank above"*).

**Interactions:**
- Hover: tooltip
- Click: opens Widget Drawer for deeper analysis

**Visible only if user has saved a profile.**

### Surface 5 — Extension Icon Popup

**Purpose:** quick access from Chrome toolbar.

**Content (profile set):**
- Current total, percentile, division summary
- Nearest qualifying gap
- Meets this month
- Primary button to open the Widget Drawer

**Content (no profile):** single CTA to set up a profile.

### Surface 6 — Options / Settings Page

**Purpose:** configuration. Full browser tab. Left-nav sections.

1. **Profile:** sex, age, bodyweight, equipment, preferred federations (multi-select), weight class, current total, display unit (kg/lb), location ZIP.
2. **Preferences:** display unit toggle (kg/lb), applied globally to all rendered numbers.
3. **Privacy:** *"Everything runs locally. LLM calls route through the proxy but no personal data is stored server-side."*
4. **About:** version, OpenPowerlifting attribution (required by AGPL data licensing), repo link, credits.

### Surface 7 — First-Install / Zero State

**Purpose:** get a new user to their first card in under 30 seconds.

**Trigger:** first install detected → widget auto-opens in onboarding state.

**Content:**
- Heading: *"Where do you stand?"*
- Sub-heading: *"One sentence is all it takes."*
- Prompt input
- Divider: *"— or try a sample —"*
- 3 sample prompt chips (tap to auto-submit):
  - *"24yo raw 83kg hit 650 USAPL"*
  - *"32yo raw 93kg hit 720 PA"*
  - *"19yo single-ply 63kg woman hit 410 USPA"*
- Footer microcopy: *"Works entirely locally. Sign in later if you want cross-device sync."*

No wizard. No login. No tour. One screen.

## 8 · Profile System

**Storage:** `chrome.storage.local` is the authoritative local read path. Supabase (Postgres + Auth) is a durable backup when signed in — opt-in cloud sync for cross-device portability. Ambient mode reads only local state and never gates on sign-in.

**Fill paths (both populate the same profile object):**
1. **Prompt-based (default):** extract entities from user's natural-language input using LLM-backed parser.
2. **Name-search (auto-detect):** user searches for themselves by name → OPL data populates thread context (total, bodyweight, sex) → used for "where I stand" card without requiring manual profile entry.
3. **Options page:** manual entry of sex, age, bodyweight, equipment, federation, weight class, total.

**Profile schema (TypeScript):**

```typescript
type Profile = {
  userId: string | null;           // auth.users.id when signed in; local UUID otherwise
  sex?: "M" | "F";
  ageYears?: number;
  bodyweightKg?: number;
  weightClass?: string;
  ageDivisions?: AgeDivision[];    // multiple simultaneous divisions
  equipment?: Equipment;
  federations?: Federation[];      // multi-select
  currentTotalKg?: number;
  locationZip?: string;
  oplProfileUrl?: string;
  extras: ProfileExtras;           // flex bag including display_unit
  clientUpdatedAt: string;         // ISO; drives LWW sync
  serverUpdatedAt?: string;        // ISO; set after server round-trip
};
```

**Single profile in v1.** Multi-profile is a documented v2 feature. Cloud sync / auth is a potential v2 addition — v1 is fully local.

## 9 · Architecture

**Client-heavy with a thin LLM proxy.** Most work runs in the browser; only LLM calls route through a server.

### Runtime topology

```
┌─────────────────────────────────────┐
│  Chrome Extension (Manifest V3)     │
│                                     │
│  • UI: Widget drawer (chat-style),  │
│    lifter profile view, popup,      │
│    settings (with auth)             │
│  • Content scripts: drawer +        │
│    OPL name injection               │
│  • Service worker: alarm-based      │
│    auth refresh, message routing    │
│                                     │
│  Storage:                           │
│  • chrome.storage.local (profile,   │
│    settings, chat thread, auth)     │
│                                     │
│  Bundled data:                      │
│  • Curated qualifying totals JSON   │
│    (~KB; updated per release)       │
└─────────────────────────────────────┘
     │              │              │
     ▼              ▼              ▼
  OPL's         LLM + Data      Supabase
  rankings      Proxy            (Auth +
  + lifter      (Cloudflare      profile/
  CSV APIs      Worker)          goals/
  (via proxy)        │           saved cards)
                     ▼
               Anthropic API
               (Haiku 4.5)
```

### Tech stack

| Layer | Choice | Why |
|---|---|---|
| Extension framework | Chrome Manifest V3 + TypeScript + React | Current standard; reviewer-familiar; strong tooling |
| Bundler | Vite with `@crxjs/vite-plugin` | Fast HMR for extensions; ecosystem support |
| UI | React + Tailwind CSS | Fast polish iteration; design tokens defined in separate design spec |
| State | Zustand | Lightweight; works in service worker context |
| Charting | uPlot (canvas-based, 8KB gzipped) | Lightweight, shadow-DOM-safe, built-in tooltips |
| Data backbone | OPL's JSON rankings API via Cloudflare Worker + KV cache | Always-live (no local CSV to drift), 30min cache TTL |
| Auth + sync | Supabase (Postgres + Auth) with `chrome.storage.local` adapter | RLS + hosted Postgres + auth SDK; anon key + RLS for security |
| LLM client | Direct call to proxy via `fetch` | Thin; no SDK needed |
| LLM proxy | Cloudflare Worker (`proxy/`) | Zero config, rate-limitable, low cold-start |
| LLM model | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) | Cheap, fast (~400ms), prompt-cached system prompt |
| Scoring | Local compute (DOTS, Wilks 2020, IPF GL) | Published polynomial coefficients, ~20 lines each |

### LLM integration pattern

Single LLM call per query (entity extraction only — narrative synthesis deferred to v1.1):

1. **Filter + profile extraction (Haiku, cheap):**
   - Input: user's natural-language prompt + optional `activeFilter` for continuation
   - Output: structured JSON (filter fields + profile fields + name search)
   - System prompt: ~80 lines with numbered priority rules, federation-first class routing
   - Prompt-cached via `cache_control: { type: "ephemeral" }` — ~90% discount after first call
   - Fallback: silent fallback to heuristic regex parser on any Worker failure

**LLMs never compute figures.** Every number in the UI has a traceable query trail (scoring formulas, OPL API response, qualifying-totals JSON).

### Cloudflare Worker routes

| Route | Method | Purpose |
|---|---|---|
| `/parse-filter` | POST | LLM entity extraction from prompts |
| `/cohort` | GET | Paginated OPL rankings with binary-search userRank, name search, KV-cached |
| `/lifter-csv/<username>` | GET | Individual lifter competition history (OPL CSV → JSON) |
| `/health` | GET | Status check |
// headers: X-Client-Signature (rotating token from extension)
//
// - Rate limit: 20 req/min per IP
// - Hard monthly spend cap: $100 (return 429 when hit)
// - Allowlist of models (Haiku, Sonnet 4.6)
// - No logging of prompt contents (privacy)
```

BYOK override available in settings: users can paste their own Anthropic API key, stored in `chrome.storage.local`, sent directly to Anthropic, bypassing proxy.

## 10 · Data Pipeline

### OPL's lifter data

- Source: `openpowerlifting.gitlab.io/opl-csv` — public, maintained weekly
- Fetch: on first install + weekly background refresh
- Storage: IndexedDB, indexed by `(name)`, `(sex, equipment, weightClass, ageDivision)`, `(federation, meetDate)`
- Query layer: SQLite-WASM reads IndexedDB-backed storage
- Size: ~100–300MB uncompressed; chunked loading with progress indicator

### Qualifying totals

- Source: manually compiled from USAPL, Powerlifting America, USPA websites
- Format: JSON bundled with extension
- Update cadence: per-release (Chrome Web Store update)
- Schema:

```typescript
type QualifyingTotal = {
  federation: "USAPL" | "PA" | "USPA";
  event: string;              // e.g. "Nationals", "Collegiate Nationals"
  sex: "M" | "F";
  ageDivision: AgeDivision;
  weightClassKg: number;
  equipment: Equipment;
  totalKg: number;
  sourceUrl: string;          // citation for transparency
  lastVerified: string;       // ISO date
};
```

### Meet data

Deferred to v1.1. Liftingcast JSON API + USAPL calendar scraping were designed (see plan file §8) but not built. Meet section in the card is stubbed.

### Lifter competition history

- Source: OPL's `/api/liftercsv/<username>` (CSV → JSON via Worker `/lifter-csv/<username>`)
- Cache: Cloudflare KV, 30min TTL
- Used for: lifter profile view (progression chart + competition history list)

### Derived computations (all client-side)

- Percentile computation within cohort (via binary-search on OPL rankings API)
- Scoring: DOTS, Wilks 2020, IPF GL (local polynomial computation)
- Weight-class snapping: federation-first routing (USAPL→Traditional, IPF-affiliated→IPF)
- Gap computation against all applicable qualifying totals (bundled JSON)
- Lifter progression: total + S/B/D over time (uPlot chart from lifter CSV)

## 11 · Copy Voice Guidelines

### Do

- *"45 kg to USAPL Open Nationals qualifying."*
- *"3 twin lifters. Current: 680–735 kg."*
- *"You've qualified for 3 of 7 paths."*
- *"Your twins took 1–3 years to add this much."*
- *"Last synced 2 days ago."*

### Don't (never ship these)

- *"You're crushing it!"*
- *"Keep grinding."*
- *"You'll get there!"*
- *"Estimated 8–14 months to qualify."*
- *"45 kg behind the qualifying mark."*
- *"You're on pace to hit Nationals soon."*
- Any emoji in body copy (icons in UI are fine; emoji is not)

### Rules

- Numbers always carry a unit. Unit follows the user's display preference (kg or lb); conversion is exact via NIST constant (`0.45359237`); never mix units in a single phrase. *"45 kg to Nationals"* becomes *"99 lb to Nationals"* for lb users.
- Gaps as distance, never deficit — *"N kg to goal"*, never *"N kg behind"*.
- No timeline or probability language ever.
- No hype words.
- Voice is tool, not coach.

## 12 · Interaction Patterns

| Input | Result |
|---|---|
| `⌘⇧O` / `Ctrl+Shift+O` | Open Widget Drawer (on any OPL page) |
| `Esc` | Close Drawer |
| `Enter` in prompt | Submit query |
| `↑` / `↓` in prompt | Cycle query history |
| `Tab` / `Shift+Tab` | Move focus through interactive elements |
| `⌘+,` / `Ctrl+,` | Open Settings |
| Hover any number | Tooltip with plain-language explanation |
| Click qualifying row | Expand inline showing qualifying-eligible meets |
| Click twin lifter card | Open that lifter's OPL profile in new tab |
| Click meet card | Open meet's OPL page in new tab |

## 13 · Accessibility Requirements

- Full keyboard navigation; no mouse required
- ARIA labels on all interactive elements
- Focus trap inside drawer when open; focus restored on close
- Screen reader announcements for drawer open/close and card load
- State indicators use icon + text (never color alone)
- Respect `prefers-reduced-motion`

(Contrast ratios, specific ARIA patterns, and other visual a11y rules live in the design spec.)

## 14 · Suggested Repository Structure

```
/
├── README.md                    (original Luma README — leave alone)
├── APPROACH.md                  (our narrative doc)
├── PLAN.md                      (this file)
├── .env.example                 (extend with ANTHROPIC_API_KEY, PROXY_URL)
├── .gitignore
├── dist/                        (original Luma session packagers — leave alone)
├── submit.sh                    (original — leave alone)
│
├── extension/                   (Chrome extension source)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── manifest.json
│   ├── src/
│   │   ├── background/          (service worker)
│   │   │   └── index.ts
│   │   ├── content/             (content scripts for OPL pages)
│   │   │   ├── ranking-overlay.tsx
│   │   │   ├── lifter-panel.tsx
│   │   │   └── selectors.ts     (defensive DOM selectors)
│   │   ├── popup/               (toolbar popup)
│   │   │   └── index.tsx
│   │   ├── widget/              (the drawer + card UI)
│   │   │   ├── Drawer.tsx
│   │   │   ├── PromptBar.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── sections/
│   │   │   │   ├── Hero.tsx
│   │   │   │   ├── QualifyingTotals.tsx
│   │   │   │   ├── Twins.tsx
│   │   │   │   └── Meets.tsx
│   │   │   └── SaveProfileCTA.tsx
│   │   ├── options/             (settings page)
│   │   │   └── index.tsx
│   │   ├── onboarding/          (first-install state)
│   │   │   └── index.tsx
│   │   ├── data/                (data layer)
│   │   │   ├── opl-csv-fetcher.ts
│   │   │   ├── sqlite-init.ts
│   │   │   ├── queries.ts
│   │   │   ├── percentile.ts
│   │   │   ├── knn-twins.ts
│   │   │   └── qualifying-totals.json
│   │   ├── llm/
│   │   │   ├── proxy-client.ts
│   │   │   ├── extract-intent.ts
│   │   │   └── narrate.ts
│   │   ├── profile/
│   │   │   ├── schema.ts
│   │   │   ├── store.ts
│   │   │   └── opl-profile-parser.ts
│   │   ├── ui/                  (reusable components — styles per design spec)
│   │   │   ├── Button.tsx
│   │   │   ├── StatusPill.tsx
│   │   │   ├── Divider.tsx
│   │   │   ├── ScoreChip.tsx
│   │   │   └── QualifyingRow.tsx
│   │   └── lib/                 (utilities, types, constants)
│   │       ├── types.ts
│   │       ├── weight-classes.ts
│   │       ├── federations.ts
│   │       └── constants.ts
│   └── public/
│       └── icons/
│
├── proxy/                       (Cloudflare Worker / Vercel Edge Fn)
│   ├── package.json
│   ├── wrangler.toml            (or vercel.json)
│   └── src/
│       └── index.ts
│
└── docs/
    ├── screenshots/
    └── loom-script.md
```

## 15 · Implementation Phases

*Removed.* Day-by-day phasing is scope-ordering noise; the work items, critical files, and verification steps in the plan file describe what to build without prescribing when. Ordering lives in commit history.

## 16 · APPROACH.md Outline (What to Write)

Section structure to write during the final push:

1. **What this is** (1 paragraph) — link to Chrome Web Store + landing page + demo Loom
2. **Why I picked Option 2** — real painpoint, domain expertise via PowerComp, whitespace, predictable shipping
3. **Product thesis** — prompt-first, context over data, trajectory over snapshot
4. **Key decisions and why:**
   - No predictions (domain truth about non-linearity)
   - All federation paths, not auto-inferred
   - Weight class proximity handling; federation-first routing (USAPL→Traditional, IPF-affiliated→IPF)
   - LLMs translate intent, never compute numbers
   - Chat-style drawer with conversational thread, not modal filter form
   - Fully local — no accounts, no server-side storage
   - Single profile v1; NL prompt serves as multi-profile escape hatch
5. **Architecture** — client-heavy + Cloudflare Worker proxy + Supabase auth; data flow diagram
6. **What I cut and why**
7. **What breaks first under pressure** — OPL DOM changes, CSV freshness, LLM cost under high traffic
8. **What I'd build next** (ordered priorities)
9. **Cost model** — per-query cost, dev cost, review-window cost
10. **Install instructions** — Chrome Web Store link primary, unpacked fallback

## 17 · Loom Outline (~5 min)

**Script structure:**

1. **0:00–0:30 — Context.** *"I'm a powerlifter. Every time I load OPL I want to know the same thing — where do I stand. OPL answers that with filters and tables. OPL Coach answers it with one sentence."*

2. **0:30–1:30 — The headline demo.** Press `⌘K`, type a prompt, walk through the card. Hit every section: percentile, qualifying totals across 3 federations, twin lifters, meets near me.

3. **1:30–2:30 — Ambient mode.** Navigate to a competitor's OPL profile. Inline panel appears. Navigate to rankings. Your row is in the table at your position. Demo the cross-reference flow.

4. **2:30–3:30 — Taste decisions called out explicitly.**
   - *"Notice there's no 'projected to hit Nationals in 8 months.' Powerlifting isn't linear. Any timeline is dishonest. I only show gaps, not predictions."*
   - *"I show all federation paths because the lifter owns that decision — I don't pick a primary for them."*
   - *"Every number in the UI comes from a local query against OPL's public data. The LLM translates my prompt into a query; it never computes numbers. That's why nothing here is hallucinated."*

5. **3:30–4:30 — Architecture briefly.** Data is local, LLM is proxied, profile is local. Privacy as a product feature.

6. **4:30–5:00 — What I'd build next.** Coach mode, training-implication narration, international federation coverage.

## 18 · Deployment

### Chrome Web Store (primary deploy target)

- Developer account: $5 one-time (set up early — takes a few hours for verification)
- Submit 1–3 days before take-home deadline (store review is 1–3 days)
- Privacy disclosures: minimal — we only store locally, call one external API (the proxy), no analytics

### Landing page (secondary)

- Static site (Vercel free tier)
- Content:
  - Hero: what the extension does in one sentence
  - Loom embed
  - Screenshots (hero card, ambient panel, rankings overlay)
  - Chrome Web Store install button
  - Link to GitHub repo
- Keep simple; don't let landing-page polish eat extension polish time

### LLM proxy

- Cloudflare Worker, deployed via Wrangler
- Environment: `ANTHROPIC_API_KEY`
- Deployed URL goes in extension `.env.example` as `PROXY_URL`

### Local development

For reviewers who clone the repo and want to run from source:

```bash
git clone <repo>
cd <repo>
cp .env.example .env
# Add ANTHROPIC_API_KEY
npm install --prefix extension
npm run build --prefix extension
# Then in Chrome: chrome://extensions → Developer mode → Load unpacked → select extension/dist
```

Document this prominently in APPROACH.md because the browser-extension category doesn't match the "fresh Linux container" expectation.

## 19 · Open Decisions (Not Yet Locked)

Product-level decisions. Visual decisions (color, typography, logomark) live in the design spec.

1. **Final name** — OPL Coach is a placeholder; alternatives: OPL Lens, Bench, Lifter, Meet Line
2. **Federation Paths section** — show by default vs. collapsed vs. hidden behind toggle
3. **First-install sample prompts** — which three specifically
4. **Widget prompt bar placement** — top of drawer (current lean) vs. bottom

## 20 · Non-Goals

Explicitly out of scope. Don't accidentally scope-creep into these.

- Mobile version
- User accounts / login / server-side data storage
- Server-side storage of queries, browsing history, or analytics
- Analytics / telemetry
- Social features
- In-app purchases
- Training program authoring
- Meet registration
- Coach tools (multi-athlete view)
- Real-time collaboration
- Notifications / alerts
- SQLite-WASM / full OPL CSV ingest (v1 uses the live rankings API via Worker)

## 21 · Risk Register

| Risk | Mitigation |
|---|---|
| OPL's rankings API changes response shape | Probe fixture in `proxy/fixtures/opl-rankings.json`; `normalizeRow` is the single point of change |
| OPL's lifter CSV endpoint changes columns | Column-index mapping in `proxy/src/lifter-csv.ts:parseCSV`; header-based lookup adapts automatically |
| LLM costs blow up from reviewer traffic | Rate limits on proxy + hard monthly cap; BYOK option in settings |
| Chrome Web Store review delay | Submit 3+ days before deadline; fallback to unpacked install instructions |
| Federation qualifying totals data is wrong | Cite source URL per row; mark `lastVerified` date; invite corrections |
| Scope creep during build | Refer to this document. Anything not in section 6 is v2. |

## 22 · Quick Reference — Things to Say No To

When in doubt, default to **no** on any of these:

- "Let's add training program suggestions to the card."
- "What if we included voice input?"
- "The timeline for hitting Nationals would be helpful though, right?"
- "We should let coaches track multiple athletes."
- "A mobile version wouldn't be that much more work."
- "What if the LLM could write a motivational coaching paragraph?"
- "Let's expand to all 20+ federations."
- "Can we infer their primary goal automatically?"

Every one of these is explicitly cut. They live in APPROACH.md's *"what we'd build next"* — not in v1.

---

## Appendix A — Sample Prompts for Development Testing

Use these during Phase 2–3 to validate the pipeline:

- *"24yo raw junior, 82.5kg, hit 585 total USAPL"* (strong lifter, multi-division)
- *"19yo single-ply, 60kg woman, 410 total, USPA"* (women's junior, single-ply)
- *"42yo raw masters M1, 90kg, 680 total, AMP"* (masters path, IPF-affiliated)
- *"16yo raw sub-junior, 52kg, 270 total, USAPL"* (youngest division)
- *"32yo raw open, 100kg, 770 total, USAPL"* (open elite)
- *"29yo raw wraps, 75kg, 560 total, USPA"* (equipment variant)

## Appendix B — Sample Expected Output Card

Given: *"24yo raw junior, 82.5kg, hit 585 USAPL male, bw 82.3"*

Expected card should show:
- Percentile: top ~26% of active USAPL raw junior 82.5kg men (rank ~1418 of 5395, via OPL rankings API)
- DOTS: ~426, Wilks: ~498, IPF GL: ~81 (computed locally from published coefficients)
- Qualifying totals: USAPL Junior Raw Nationals (585 target → 0 kg to go), USAPL Collegiate Nationals (~15 kg cushion), USAPL Open Nationals (~80 kg to go)
- Your Position block: ±2 rows around rank #1418 showing adjacent lifters
- No twin lifters (deferred to v1.1)
- No meets section (deferred to v1.1)

All specifics derived from live OPL rankings API data — no hardcoded values in the production card.

---

*End of plan.*
