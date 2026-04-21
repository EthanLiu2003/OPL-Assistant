# Loom Walkthrough Script — OPL Assistant

**Target length:** ~5 minutes
**Tone:** direct, personal, technical where it matters

---

## [0:00–0:30] Context

"Hey, I'm Ethan. I'm a powerlifter — I compete in USAPL and AMP at 75kg. For the take-home I picked Option 2, fix something annoying, because I use OpenPowerlifting almost daily and it's genuinely frustrating to navigate. It's the primary database for powerlifting competition results, but it's basically a giant sortable table. Finding where I stand means clicking through federation filters, different weight class systems, age divisions, then scrolling through thousands of rows. I built OPL Assistant — a Chrome extension that turns all that into one natural language question, plus upcoming meet discovery, plus progression charts injected into lifter profiles."

---

## [0:30–1:30] The Headline Demo — Where You Stand

"I'll open any OpenPowerlifting page. You'll see an 'AI Search' button at the top. Click it — drawer slides in from the right. I'll type:
`my name is ethan liu, im USAPL 75kg, find me and show me where i stand`"

*[Card renders]*

"Everything you see here is computed locally — my percentile rank, DOTS, Wilks, IPF GL. The qualifying totals at the bottom show my gap to each USAPL event — Collegiate Nationals I'm qualified, Raw Nationals I'm 38kg away, Junior Nationals I just qualified. All derived from official USAPL data, not hallucinated. The LLM only parsed my prompt into filters — it doesn't produce any numbers."

---

## [1:30–2:30] Meet Calendar

"One of the things I shipped was an upcoming-meet feature. I'll type:
`upcoming USAPL meets in NJ`"

*[Meets list renders with ~5-10 NJ meets]*

"This pulls from USAPL's own calendar, parses their accordion-style HTML on the Worker side, extracts location and date, and caches the list for 6 hours in Cloudflare KV. I can also ask:
`what meets are coming up`"

*[Aggregated list of USAPL + PA + USPA meets]*

"That fans out to three federation websites in parallel — USAPL, Powerlifting America, USPA. Each one goes through a slightly different parser — USAPL has a custom WordPress accordion, the other two use the Tribe Events Calendar plugin which I parse with a shared helper. Each meet gets normalized into one `Meet` type with federation, date, location, and registration link."

---

## [2:30–3:30] Lifter Profile Charting + Name Search

"Second surface. If I navigate to any lifter's profile — `/u/chakeraingram` — you'll see a progression chart injected directly into the page. Total, squat, bench, deadlift over time. It matches OPL's native dark style because I inject into their DOM, not a shadow root."

*[Back on rankings page]*

"Back in the drawer, let me search `USAPL 82.5kg raw juniors`. Instant cohort preview — top 5, total count. The chat remembers context — if I now ask `where do I stand`, it inherits the cohort I was just looking at. And if I search for a specific lifter by name, I get a 'Where You Stand' button on their result card that runs the percentile math with their own totals."

---

## [3:30–4:30] Taste Decisions

"A few things I intentionally didn't do:

**One — no predictions.** I never show 'qualify in 8 months' because powerlifting progression isn't linear. Only distance to a target, which is factual.

**Two — federation-first weight class routing.** USAPL left IPF in 2021, so 'USAPL 83kg' correctly snaps to 82.5, not ipf83. Most tools get this wrong.

**Three — LLMs translate intent, never compute numbers.** Every score, percentile, gap, and upcoming meet is deterministic. Nothing is hallucinated. The LLM's only job is understanding what the user wants.

**Four — federation-first meet sourcing.** Meets come from each federation's own calendar, not a third-party aggregator, so the data matches what lifters see on the sites they already trust. Liftingcast is a fallback for niche meets.

**Five — fully local.** I built Supabase auth then ripped it out. Bundle dropped 45%, zero privacy concerns."

---

## [4:30–5:00] Architecture + What's Next

"Quick architecture: React + Vite + TypeScript Chrome extension. Shadow DOM for the drawer, direct DOM injection for the lifter charts and WordPress content script injection for the rankings tables. One Cloudflare Worker as a proxy — eight routes: parse-filter calls Claude Haiku, cohort pages through OPL's rankings API with 30-minute KV caching, lifter-csv proxies competition history, narrate generates one-sentence insights, and four meet endpoints scrape and cache federation calendars. Scoring formulas run locally from published coefficients. 29 tests across scoring, filter parsing, and qualifying totals.

**Next up:** training programs tied to your competition calendar and weak points, a coach-lifter platform with attempt selection recommendations based on historical jump success, and profiles once those features exist to justify the login. Published on the Chrome Web Store. Thanks for watching."

---

## Shot list / B-roll

- [ ] **0:00** — OPL home page → click AI Search → drawer slides in
- [ ] **0:45** — type where-you-stand prompt, show card rendering with scoring chips and qualifying totals
- [ ] **1:30** — type "upcoming USAPL meets in NJ" → show 5-10 NJ meets with date/location/register links
- [ ] **2:00** — type "what meets are coming up" → show aggregated list (USAPL + PA + USPA mixed)
- [ ] **2:30** — navigate to `/u/chakeraingram` → scroll down to show progression chart inline
- [ ] **2:50** — back to rankings → type "USAPL 82.5kg raw juniors" → cohort preview → inherited context demo
- [ ] **3:30** — highlight one gap line ("38 kg to Raw Nationals") while narrating no-predictions point
- [ ] **4:30** — zoom into a scoring chip briefly while narrating "every score is local compute"
- [ ] **4:45** — Chrome Web Store listing page as final frame

## Recording notes

- Run from a fresh thread (clear chat) so the demo starts clean
- Pre-open the drawer before the first prompt to save ~1 second
- For the meets demo: test `upcoming USAPL meets in NJ` beforehand — if the Worker's KV cache is cold it takes 3-5s to scrape USAPL's accordion (~245 meets). On a warm cache it's <100ms
- For the lifter chart demo: pre-load `/u/chakeraingram` in another tab so the uPlot canvas is already initialized when you switch
- Keep the chat history visible throughout — showing the thread helps demonstrate the conversational nature
