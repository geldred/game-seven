# Image Generation for Realistic NBA Player Likenesses — Research Report (June 2026)

## Recommended path

**Primary: Reference-photo editing via FLUX.2 on fal.ai (or BFL's own API).** Don't fight the "named celebrity" filters — sidestep them. Feed 1–2 real photos of the player (LeBron, MJ, Shaq) into FLUX.2 [pro] edit or FLUX.1 Kontext with a prompt like "this player rising for a game-winning dunk over a defender, arena lighting, photoreal." FLUX.2 supports up to 10 reference images per request with strong identity persistence, costs ~$0.03/image, returns in ~6–10 seconds, and BFL/fal don't run a celebrity-name blocklist — their terms put the consent burden on you (which is exactly the right shape for a private, non-commercial hobby site). At 3 images per game session this is pennies per night.

**Co-primary / try first because it's easiest: OpenAI gpt-image-1.5.** Since March 2025, OpenAI's official stance is that public figures *can* be depicted unless they've opted out — the most permissive written policy of any major lab. One API call, no reference photos needed, the model actually knows what Michael Jordan looks like. ~$0.034/image (medium quality, 1024px), set `moderation: "low"`. The catch: API moderation is inconsistent in practice — developers report prompts that work in ChatGPT getting blocked in the API, and refusals are unpredictable for sports/contact scenarios ("dunking over a defender" can trip violence-adjacent filters). Worth a 30-minute test before committing; if refusal rates annoy you, fall to the FLUX path.

**Fallback: fal.ai FLUX PuLID** (~$0.033/image) — single face photo in, person in a new scene out. Less polished than FLUX.2 edit but dead simple. **Avoid:** Gemini/Imagen (hard category block on named public figures as of the 2026 Nano Banana 2 policy) and Midjourney (no real public API, prohibits automation).

---

## Provider-by-provider

| Provider / Model | Named-real-person behavior | Reference photo | Price/image | Latency | Tier |
|---|---|---|---|---|---|
| **OpenAI gpt-image-1.5** | **Gray-green.** Policy allows public figures (opt-out list); API moderation inconsistent, blocks some prompts ChatGPT allows | Yes (edits, `input_fidelity: high`) | $0.009–0.133 by quality; ~$0.034 medium | 20–60s | **A (test first)** |
| **fal.ai / BFL — FLUX.2 [pro] edit** | **Gray-green.** No name blocklist; identity comes from your reference photos; ToS requires you to have "consents" (self-certified) | Yes — up to 10 refs, best-in-class identity persistence | ~$0.03 (pro), $0.012/MP (dev) | 6–10s | **A** |
| **BFL FLUX.1 Kontext (pro/max)** | Same as above; BFL API has a `safety_tolerance` 0–6 knob | Yes — single-image in-context editing | ~$0.04–0.08 | ~5–10s | A− |
| **fal.ai FLUX PuLID** | Gray. Face-embedding pipeline, no name filter | Yes — one face photo | $0.0333/MP | ~5–10s | **B (fallback)** |
| **Ideogram 4.0 + Character API** | Gray. Blocks "deepfakes" nominally but Character feature takes any reference photo | Yes — one photo, consistent across scenes | ~$0.03–0.08 | ~10–20s | B |
| **xAI grok-imagine-image** | Gray and volatile. Was the most permissive of 2025; post-scandal (Jan 2026) filters tightened, AUP prohibits publicity-rights violations, but still looser than Google/OpenAI in practice | Yes (text + image input) | **$0.02** | ~5s | B− (cheap, but policy churn risk) |
| **Google Gemini / Imagen (Nano Banana 2)** | **Blocked.** Named celebrities/athletes refused as a category, regardless of intent; face-swap also refused | Yes, but not for real-person identity | $0.03–0.13 | ~10s | D |
| **Stability (Stable Image Ultra)** | Gray. AUP silent on celebrities specifically; SD-class models are weak at rendering specific athletes from names alone | Limited | ~$0.08 | ~10s | C |
| **Midjourney** | No broadly available public API as of mid-2026; ToS bans automation; guidelines prohibit offensive celebrity images | Yes (omni/character ref) in-app | n/a via API | n/a | D for this use |
| **Anthropic** | No image generation product. Claude is text/vision-in only — useful for writing the play descriptions, not rendering them | — | — | — | n/a |

## Self-hosted option

FLUX.1-dev or FLUX.2-dev locally (or on a rented GPU): no API refusals at all — restrictions become purely licensing/legal. The dev licenses are **non-commercial**, which is fine here, and they prohibit uses violating publicity/"digital replica" rights — same self-certification shape as the hosted APIs. Practical notes:

- Needs a 24GB-class GPU (RTX 4090 runs FLUX.2-dev quantized; ~$0.40–0.70/hr rented on RunPod/Vast).
- **Civitai banned all real-person likeness LoRAs in May 2025** (Visa/Mastercard pressure), so the once-easy "download a LeBron LoRA" path is gone. Many migrated to Hugging Face mirrors; otherwise you'd train your own LoRA from ~20 photos (~30–60 min on a 4090).
- Honest take: for 3 images a night, this is a weekend-project tax you don't need to pay. Reference-photo editing on fal.ai gets you 90% of the result with zero infrastructure. Tier C — only if the hosted filters start blocking you.

## Legal context (brief, not legal advice)

Right of publicity protects *commercial exploitation* of identity — using a likeness to sell something. A password-protected, non-commercial site for a small friend group is about as low-risk as this use case gets; commentators consistently distinguish "deepfake shared with a limited group of friends" from advertising use. Two real caveats: (1) NBA players are unusually litigious about NIL because likeness *is* their licensing business (see Jordan v. Jewel — but that was an ad), so never let this drift toward anything public, monetized, or merch-like; (2) the practical risk isn't a lawsuit, it's **platform ToS enforcement** — account suspension if a provider decides your reference-photo use violates their consent warranty. Keep it private, keep it free, don't depict players in violent/sexual/defamatory scenarios, and the residual risk is minimal. State laws vary (CA/NY strongest) and the federal NO FAKES-style proposals target distribution of digital replicas — another reason "private and small" matters.

## Practical build notes

- For best likeness: pull a clean headshot + an action shot per player (NBA media photos), cache them, and pass both as FLUX.2 edit references. Generate at 1MP to stay at the price floor.
- Pipeline that works well: sim engine → Claude writes the key-play description → prompt template → FLUX.2 edit with the two players' reference photos → image. Cost: under $0.10 per game session.
- Policies in this space changed materially three times in the last 18 months (OpenAI loosened, Google hardened, xAI whipsawed). Abstract the image-gen call behind one function so you can swap providers in an afternoon.

## Sources

- [TechCrunch — OpenAI peels back ChatGPT's image safeguards](https://techcrunch.com/2025/03/28/openai-peels-back-chatgpts-safeguards-around-image-creation/)
- [Machine.news — OpenAI celebrity opt-out](https://www.machine.news/openai-grants-celebrities-a-chatgpt-image-generation-opt-out/)
- [OpenAI Model Spec (Dec 2025)](https://model-spec.openai.com/2025-12-18.html)
- [OpenAI dev forum — gpt-image moderation blocks prompts DALL·E 3 allowed](https://community.openai.com/t/gpt-image-1-moderation-blocks-prompts-allowed-by-dall-e-3-pop-culture-references/1252701)
- [GPT Image 1.5 API pricing](https://www.aifreeapi.com/en/posts/gpt-image-1-5-pricing-api) · [OpenAI pricing](https://platform.openai.com/docs/pricing/)
- [LaoZhang — Gemini people-generation restrictions, 2026 guide](https://blog.laozhang.ai/en/posts/gemini-image-generation-people-restriction) · [Google Vertex AI responsible AI docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/gemini-image-responsible-ai)
- [BFL usage policy](https://bfl.ai/legal/usage-policy) · [BFL developer ToS](https://bfl.ai/legal/developer-terms-of-service) · [FLUX.1-dev license](https://huggingface.co/black-forest-labs/FLUX.1-dev/blob/main/LICENSE.md) · [FLUX.1 Kontext](https://bfl.ai/announcements/flux-1-kontext)
- [fal.ai FLUX.2 pro edit](https://fal.ai/models/fal-ai/flux-2-pro/edit) · [fal.ai FLUX PuLID](https://fal.ai/models/fal-ai/flux-pulid) · [fal.ai AUP](https://fal.ai/legal/acceptable-use-policy)
- [Ideogram Character](https://ideogram.ai/features/character/) · [Ideogram API pricing](https://ideogram.ai/features/api-pricing)
- [xAI grok-imagine-image docs](https://docs.x.ai/developers/models/grok-imagine-image) · [Grok deepfake scandal — Wikipedia](https://en.wikipedia.org/wiki/Grok_sexual_deepfake_scandal) · [NBC — Grok still making sexual deepfakes](https://www.nbcnews.com/tech/tech-news/musks-ai-chatbot-grok-xai-making-sexual-deepfakes-imagine-rcna265855)
- [Midjourney API status](https://10b.ai/blog/does-midjourney-have-an-api) · [Midjourney community guidelines](https://docs.midjourney.com/hc/en-us/articles/32013696484109-Community-Guidelines)
- [Stability AI AUP](https://stability.ai/use-policy)
- [Civitai real-person likeness ban](https://civitai.com/articles/15022/policy-update-removal-of-real-person-likeness-content) · [404 Media on the ban](https://www.404media.co/civitai-ban-of-real-people-content-deals-major-blow-to-the-nonconsensual-ai-porn-ecosystem/)
- [Bloomberg Law — AI & right of publicity](https://www.bloomberglaw.com/external/document/XBLNMJMK000000/copyrights-professional-perspective-ai-advertising-the-right-of-) · [CRS — federal right of publicity](https://www.congress.gov/crs-product/LSB11052)
