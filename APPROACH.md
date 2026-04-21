# APPROACH.md

**Loom walkthrough:** https://www.loom.com/share/83f561e8deee40ca98e145c96c16c5e2

## What I Built

OPL Assistant is a Chrome extension that adds personalized powerlifting context to [openpowerlifting.org](https://www.openpowerlifting.org). You type natural language — "USAPL 82.5kg raw juniors" or "my name is ethan liu, where do I stand" — and get back your percentile rank, scoring (DOTS, Wilks, IPF GL), qualifying total gaps, and a conversational thread that remembers your context across turns.

The extension has two surfaces: an AI Search drawer that slides in from the right edge on any OPL page, and progression charts (squat/bench/deadlift/total over time) injected directly into lifter profile pages. Users can also ask for upcoming meets — "upcoming USAPL meets in NJ" — and get a filtered calendar pulled from three federation sites (USAPL, Powerlifting America, USPA) with liftingcast as a fallback. Everything runs locally in the browser — no accounts, no login, no server-side user data.

The only server component is a Cloudflare Worker proxy that handles eight routes: parsing natural language prompts into structured filters and intent (via Claude Haiku 4.5), fetching and caching OPL rankings data, proxying lifter competition history, generating one-sentence insights from card data, and scraping/normalizing meet calendars from USAPL, Powerlifting America, USPA, and liftingcast. The Worker is stateless — it processes requests and returns results without logging anything.

**Stack:** React + Vite + TypeScript + @crxjs/vite-plugin (extension), Cloudflare Workers + KV (proxy), Claude Haiku 4.5 (entity extraction), uPlot (charting). 29 tests across scoring formulas, filter parsing, and qualifying totals.

**Chrome Web Store status:** submitted for review on 2026-04-20, currently pending approval. The reviewed build is `opl-assistant-1.0.0.zip` at the repo root. I'll add the public Web Store link here once it's approved.

## Why I Picked This Problem

I'm a powerlifter. I compete in the USAPL and AMP federatoins and I use OpenPowerlifting almost daily — checking rankings, looking up competitors, figuring out where I need to be for Nationals qualifying totals.

Powerlifting is still a relatively niche sport. The tooling around it is sparse. Training knowledge is fragmented across different federations (USAPL, USPA, IPF, WRPF, and dozens more), different equipment categories (raw, wraps, single-ply, multi-ply), and different weight class systems that vary by federation. Getting good, consolidated information is genuinely hard.

OpenPowerlifting is the best resource we have — it aggregates competition results across every major federation worldwide. But it's not easy to use. The site is essentially a giant sortable table. Finding where you stand relative to your cohort means manually navigating through federation filters, weight class selectors (which differ between federations), age divisions, and then scrolling through thousands of rows. There's no way to ask "am I close to qualifying for Nationals?" without looking up the qualifying totals separately, finding your rank manually, and doing the math yourself.

I chose this problem because I wanted to build something with direct impact on my life. When you build for yourself, you understand the pain points viscerally — you know which edge cases matter because you've hit them. You know "USAPL 83kg" should resolve to 82.5kg (Traditional classes) not 83kg (IPF classes) because you've been confused by that exact mismatch. You know that showing "estimated 8 months to qualification" would be dishonest because powerlifting progression isn't linear and anyone who's stalled on a plateau knows it.

## Key Decisions and Tradeoffs

**LLMs translate intent, never compute numbers.** Claude Haiku parses "24yo raw 82.5kg hit 585 USAPL male" into structured filters and profile fields. Every number the user sees — percentile, DOTS score, qualifying gap — is computed deterministically from published polynomial coefficients and OPL's own data. The LLM's job is understanding what the user wants, not producing the answer. This means nothing in the UI is hallucinated.

**Federation-first weight class routing.** This was the trickiest domain decision. USAPL left the IPF in 2021, but many lifters (and even some tools) still treat them as IPF-affiliated. When a user says "USAPL 83kg," they mean the 82.5kg Traditional class — not the IPF 83kg class. The routing rule: if a federation is specified, it dictates the class system unconditionally. USAPL/USPA/WRPF/RPS use Traditional classes. IPF-affiliated federations (AMP, CPU, BP, etc.) use IPF classes. Bare numbers with no federation use exact-match priority.

**No predictions.** The extension shows gaps ("38 kg to Raw Nationals"), never timelines ("qualify in 8 months"). Powerlifting progress isn't linear — injuries, weight cuts, life events, and training periodization all create discontinuities. Any timeline prediction would be dishonest. I only show distance to a target, which is factual.

**Fully local, no auth.** I initially built Supabase auth with cross-device sync (chrome-storage adapter, session manager, reconciler — the full stack). Then I removed all of it. The bundle dropped 45%. The core product is search, charting, and qualifying totals — not cross-device sync. Keeping it fully local means zero privacy concerns, zero account friction, and a simpler codebase. Profile and chat history live in `chrome.storage.local` only.

**Conversational thread with profile inheritance.** The drawer isn't a one-shot search box — it's a chat. If you search for "ethan liu in USAPL 75kg" and then ask "where do I stand," the thread remembers your name, total, bodyweight, and federation from the previous turn. This is implemented via `latestProfileFromThread`, which walks backward through card data, LLM-extracted profile fields, and named-lifter OPL data.

**Heuristic parser with LLM escalation.** A deterministic regex parser handles the common cases (federation names, weight classes, equipment, age divisions). The LLM only fires for ambiguous or complex queries. If the LLM fails (timeout, network error, rate limit), the heuristic runs silently as a fallback. The user always gets a result.

**Client-heavy, no Python.** All scoring formulas, qualifying total lookups, and UI rendering happen in the browser. The Worker is a thin proxy — it never computes user-facing numbers. This keeps latency low (no round-trip for computation) and means the extension degrades gracefully if the Worker is unreachable.

**Meet calendar with federation-first sourcing.** The meets feature pulls from three federation websites directly — not a third-party aggregator — so the data matches what lifters see on each federation's own calendar. USAPL uses a custom WordPress accordion I parse with targeted regex (~245 meets); Powerlifting America and USPA both use the Tribe Events Calendar plugin, which I parse via a shared `parseTribeEventsHtml` helper (83 and 30+ meets respectively). Liftingcast is a fallback for niche meets, using their public CouchDB `_all_docs` endpoint with a per-meet extractor that pulls federation, date, and location from the meet doc plus up to 27 division definitions. Location extraction uses a regex pass (state codes + street-suffix filtering) with LLM fallback planned but not currently wired — the regex hits >95% in practice. KV-cached 6h for lists, 24h for per-meet liftingcast detail.

## What I Intentionally Left Out

**SQLite-WASM + OPL CSV ingest.** The original plan called for indexing OPL's ~300MB CSV client-side for offline percentile computation. I shipped on OPL's live JSON API instead — always fresh, no local storage overhead, simpler architecture. The tradeoff is a network dependency, mitigated by 30-minute KV caching.

**k-NN twin lifters.** Finding lifters with similar trajectories requires either the full CSV index or a custom backend. Deferred — the rank-adjacent rows from the cohort API are already available but not rendered.

**JWT-verified rate limiting.** The Worker uses per-IP rate limiting (30 requests/minute) via an in-memory Map. Proper per-user limits would need JWT verification and Durable Objects for global state. Per-IP is sufficient for the current user base.

**Scoring predictions, multi-profile, voice input, mobile, social sharing.** All explicitly scoped out. Some (predictions) are out by design principle. Others (mobile, social) are out by time constraint.

## What Breaks First Under Pressure

1. **Anthropic API costs.** Every `/parse-filter` and `/narrate` call costs tokens. Haiku 4.5 is cheap (~$0.25/M input tokens), but with no spending cap, costs scale linearly with users. This is the only pay-per-use component.

2. **OpenPowerlifting API throttling.** OPL has no documented rate limits, but they could block the Worker's IP under heavy traffic. The 30-minute KV cache absorbs repeated queries for the same cohort, but unique filter combinations all hit OPL directly.

3. **Federation-site HTML structure changes.** The meet calendar feature regex-parses USAPL's WordPress accordion markup and the Tribe Events Calendar plugin output on Powerlifting America and USPA. If any of those sites restructures their event templates, the parsers break until updated. The 6h KV cache masks this briefly but doesn't fix it. Mitigations: shared parser for Tribe-based sites so one fix covers two federations, and explicit "0 meets" detection so the extension can tell a user the source is unavailable rather than silently returning empty.

4. **Cloudflare Worker free tier.** 100K requests/day with 10ms CPU time per invocation. The CPU limit excludes fetch wait time (so outbound calls to Anthropic/OPL/federation sites don't count), and 100K/day is ~70 requests/minute sustained. Plenty for a niche extension, but there's a ceiling.

5. **In-memory rate limiter.** The rate limiter uses a `Map` in Worker memory, but Cloudflare spins up isolates across edge locations. Each isolate has its own Map, so a user hitting different PoPs can bypass the limit. At scale, this needs Durable Objects for globally consistent state.

## What I'd Build Next

1. **Programming and training plans.** The extension already knows a lifter's competition history, totals, and progression. The next step is generating periodized training blocks — connecting lifters to programs that match their federation's competition calendar, their equipment category, and their weak points (derived from S/B/D ratios and historical trends). This isn't a generic "here's a 12-week program" — it's programming that accounts for where you are, when your next meet is, and what your numbers actually say.

2. **Coach-lifter platform.** Connect lifters to coaches within the extension. A coach manages multiple lifters, sees their progression charts and cohort rankings in one view, and gets tools for meet-day decision-making. The biggest unlock here is **attempt selection** — analyzing a lifter's historical attempt jumps (what weight jumps they succeeded at vs. failed), their warm-up-to-opener patterns, and their competition-day performance trends to recommend openers and progressive attempts. This is where the OPL data becomes genuinely actionable, not just informational.

3. **User profiles and personalization.** Once the above features exist, profiles become worth the complexity. A logged-in user gets persistent programming, coach connections, and federation-specific resource routing — linking them to their federation's rulebook, qualifying standards, upcoming meets, and approved equipment lists. The auth layer was built once and removed; re-adding it becomes justified when there's enough value behind the login wall.

4. **Meets ↔ lifter linking.** The liftingcast per-meet endpoint returns the full roster of registered competitors — name, state, birthdate, declared division. Matching those records against OPL usernames would let the extension tell a user "3 of your training partners are competing at this meet" or "you're sharing a platform with the #2 ranked 75kg junior." Deferred because name matching is fuzzy and needs careful handling.

5. **Deeper lifter analytics.** Trend lines, PR velocity over time, bodyweight-adjusted progression, and competition-day consistency metrics. Combined with attempt selection data, this paints a complete picture of a lifter's trajectory — not just where they are, but how reliably they perform under meet conditions.

6. **Broader federation coverage.** Extend qualifying totals and class routing beyond USAPL/AMP to international federations and regional circuits.

## Setup

**Chrome Web Store:** submitted 2026-04-20 — currently pending review. The public store URL will be added here once the review completes. In the meantime, reviewers can load the extension from source (below) or unpack `opl-assistant-1.0.0.zip` at the repo root.

**From source:**
```bash
git clone https://github.com/EthanLiu2003/OPL-Assistant.git
cd OPL-Assistant
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# Extension
cd extension && npm install && npm run build
# Chrome: chrome://extensions → Developer mode → Load unpacked → select extension/dist

# Worker (to use your own Anthropic key)
cd ../proxy && npm install
wrangler secret put ANTHROPIC_API_KEY  # paste your key
wrangler deploy
# Update VITE_PROXY_URL in extension/.env to your Worker URL, rebuild extension
```

**Tests:** `cd extension && npm test` — 29 tests across scoring formulas, filter parsing, and qualifying totals.
