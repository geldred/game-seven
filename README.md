# GAME SEVEN

Draft your five. Survive the series.

A fork of the viral [82-0.com](https://www.82-0.com/) concept: spin-draft an all-time NBA starting five (random franchise + decade each round), then get matched against a real iconic team from NBA history and settle it in a best-of-seven — with a series box score, three key plays, and a morning-paper recap written in 1997 SportsCenter voice.

Private friend-group project. Not affiliated with the NBA.

## Run it

```sh
npm install
cp .env.example .env.local   # set GAME_PASSWORD and ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **No `GAME_PASSWORD`** → the gate is open (local dev).
- **No `ANTHROPIC_API_KEY`** → recaps fall back to a built-in template writer (still playable).
- **No `OPENAI_API_KEY`** → key-play images fall back to stylized placeholder cards.

Image cost runs ~$0.10 per game at the default `medium` quality (set `IMAGE_QUALITY=low`
for ~$0.03/game) — and less in practice, since generated images are cached by
star + moment, and repeat combos are free.

## How it's put together

| Piece | Where | Notes |
|---|---|---|
| Draft pools + opponents | `lib/data/*.json` | Generated — see Data pipeline below |
| Sim engine | `lib/sim/series.ts` | Strength ratings, era-pace adjustment, best-of-7 with narrative tags |
| Key-play selection | `lib/sim/series.ts` + `lib/data/stars.json` | Statement / Swing / Dagger, stars-only |
| Recap writer | `app/api/recap/route.ts` + `lib/recap/` | Claude (90s sports-desk voice) with template fallback |
| Image pipeline | `lib/imagegen.ts` + `app/api/keyplay-image/` | **OpenAI gpt-image-1.5** (photoreal key plays, disk-cached in `public/keyplays/`); placeholder SVG cards without a key. Provider research: `docs/imagegen-research.md` |
| Password gate | `proxy.ts` + `app/api/gate/` | Cookie vs. `GAME_PASSWORD`, 90-day session |

### Data pipeline

Raw historical stats live in `data-raw/` (basketball-reference 1950–2017 + stats.nba.com 1996–2023, both from public GitHub datasets). Regenerate the game data with:

```sh
python3 scripts/build-data.py
```

Curated opponent team-seasons (with real W-L records and sampling weights) are in `scripts/curated_opponents.json`. The recognizable-stars list (for key plays and future image prompts) is `lib/data/stars.json`.

### Sim calibration

One knob: `COHESION` in `lib/sim/series.ts`. Calibrated so an all-time dream five beats the '96 Bulls ~85% of the time and an average draft is a slight underdog against the iconic teams. Tests pin this behavior:

```sh
npx vitest run
```

### Images (V1.5 — wired)

Key plays generate through **gpt-image-1.5** (`quality: medium`, `moderation: low`, landscape 1536×1024) via `POST /api/keyplay-image`. Prompts name the player and pull his signature move from `lib/data/stars.json`, with contact-neutral phrasing to dodge the API's twitchy violence filters. Any failure — moderation block, timeout, missing key — falls back to the placeholder card, so a refused image never breaks a game.

If refusal rates get annoying in practice, the fallback plan is fal.ai FLUX.2 reference-photo editing (no name filters; needs cached player photos) — see `docs/imagegen-research.md`. Everything routes through `generateKeyPlayImage()` in `lib/imagegen.ts`, so the swap is a one-file change.
