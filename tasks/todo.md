# GAME SEVEN — V1 Build

Fork of 82-0.com. Draft loop + best-of-seven vs. historical team + box score + recap.
Password-protected, image pipeline stubbed (research running in background).

## Plan

- [x] Scaffold Next.js app (TS, Tailwind, App Router)
- [x] Data pipeline: `scripts/build-data.py` — aggregate raw CSVs into:
  - [x] `draftPools.json` — player per-decade averages by modern franchise (60s–2020s)
  - [x] `opponents.json` — curated iconic team-seasons w/ real W-L, rosters from data
  - [x] `stars.json` — curated recognizable-star tier list for key plays
- [x] Sim engine (`lib/sim/`): strength rating, best-of-7 with narrative tags, series stat lines
- [x] Key play selector: 3 plays from tags + star list
- [x] Recap: Claude API route (90s SportsCenter voice) + template fallback when no key
- [x] Image pipeline: clean interface + placeholder card renderer (real API post-research)
- [x] UI: draft (spin → pick → place on court) → matchup reveal → series ladder → results
- [x] Password gate: proxy.ts + cookie, password from env (Next 16 renamed middleware → proxy)
- [x] Tests: vitest on sim engine (10 passing)
- [x] Verify in browser end to end (full game played via preview: draft → '71 Bucks → lost 4-2)

## Review

**Done.** Full V1 working: spin-draft (with team/era re-rolls + free re-spin when nobody
fits), weighted iconic-opponent draw, seeded best-of-7 sim with narrative tags
(OT/blowout/eruption/comeback/upset), series box score, statement/swing/dagger key plays
(placeholder SVG cards), and the recap (Claude opus-4-8 w/ prompt-cached system prompt;
template fallback verified working without a key). Password gate via Next 16 proxy.ts.

**Calibration notes:** era-pace adjustment was required (70s raw stats out-rated the '96
Bulls); single COHESION constant (0.98) is the difficulty dial, pinned by tests.

**V1.5 (done):** OpenAI gpt-image-1.5 integration wired — server-side
/api/keyplay-image route, prompts from stars.json signatures (contact-neutral phrasing
for moderation), disk cache in public/keyplays/ keyed by prompt hash, placeholder
fallback on any failure. Images fill in card-by-card as generations land (20-60s each).
Also fixed: spin animation now completes on elapsed time, not tick count — background
tabs throttle setInterval and could strand the draft mid-spin.

**Open items:**
- Set OPENAI_API_KEY and taste-test real generations (likeness quality + refusal rate).
  If refusals annoy: swap to fal.ai FLUX.2 edit per docs/imagegen-research.md (one-file
  change in lib/imagegen.ts; needs cached player reference photos).
- Recap quality untested with a real ANTHROPIC_API_KEY — taste-test the voice.
- 2020s pools end at 2022-23 (dataset ceiling); fine for now.
- "Run it back with one re-drafted position" rematch idea still on the shelf (V2).
