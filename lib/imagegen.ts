import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { KeyPlay } from "./types";
import starsJson from "./data/stars.json";

const STARS: Record<string, { fame: number; signature: string }> = starsJson.stars;

/**
 * Image generation pipeline for key plays. SERVER-ONLY (fs + API keys) —
 * the client reaches this through POST /api/keyplay-image.
 *
 * Provider: OpenAI gpt-image-1.5 (public figures allowed by policy; see
 * docs/imagegen-research.md). No OPENAI_API_KEY → stylized SVG placeholder.
 * Generated images are cached on disk by prompt hash — star+moment combos
 * repeat across games, so most series cost less than 3 generations.
 */

export interface KeyPlayImageRequest {
  play: KeyPlay;
  /** Era + uniform context for the prompt, e.g. "90's Bulls uniform". */
  uniformContext: string;
  /** Opposing team context for the scene. */
  opponentContext: string;
}

export interface KeyPlayImage {
  /** Public path, hosted URL, or data URL (placeholder/cache-miss fallback). */
  url: string;
  caption: string;
  provider: "placeholder" | "gpt-image" | "flux";
}

/**
 * Scene prompt. Kept deliberately neutral on contact ("rises for", "soars")
 * — phrases like "dunking over a defender" can trip the API's
 * violence-adjacent moderation even at moderation: "low".
 */
export function buildImagePrompt(req: KeyPlayImageRequest): string {
  const sig = STARS[req.play.playerId]?.signature ?? "a game-defining play";
  return [
    `Photorealistic NBA action photograph in 1990s sports-photography style, shot on film with arena strobes.`,
    `${req.play.playerName} — ${sig} —`,
    `wearing a ${req.uniformContext}, facing ${req.opponentContext}.`,
    `Packed arena crowd, dramatic light, mid-action freeze frame, low-angle baseline camera, shallow depth of field.`,
    `No text, no logos, no watermarks.`,
  ].join(" ");
}

// ---------------------------------------------------------------------------
// OpenAI gpt-image-1.5
// ---------------------------------------------------------------------------

const CACHE_DIR = path.join(process.cwd(), "public", "keyplays");

async function openaiImage(req: KeyPlayImageRequest): Promise<KeyPlayImage | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = buildImagePrompt(req);
  const quality = process.env.IMAGE_QUALITY || "medium";
  const cacheKey = createHash("sha256").update(`gpt-image-1.5|${quality}|${prompt}`).digest("hex").slice(0, 20);
  const fileName = `${cacheKey}.jpg`;
  const filePath = path.join(CACHE_DIR, fileName);

  // Disk cache hit → serve the already-generated image.
  try {
    await readFile(filePath);
    return { url: `/keyplays/${fileName}`, caption: req.play.description, provider: "gpt-image" };
  } catch {
    /* miss — generate */
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1.5",
      prompt,
      n: 1,
      size: "1536x1024",
      quality,
      moderation: "low",
      output_format: "jpeg",
      output_compression: 85,
    }),
  });

  if (!res.ok) {
    // Moderation blocks and transient errors both land here — caller falls
    // back to the placeholder card so the game never breaks.
    const body = await res.text().catch(() => "");
    console.error(`gpt-image generation failed (${res.status}) for ${req.play.playerName}:`, body.slice(0, 300));
    return null;
  }

  const json = (await res.json()) as { data: { b64_json: string }[] };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) return null;

  // Cache to public/ so repeat matchups are free. Read-only hosts (e.g.
  // serverless) throw — fall back to an inline data URL for this response.
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(filePath, Buffer.from(b64, "base64"));
    return { url: `/keyplays/${fileName}`, caption: req.play.description, provider: "gpt-image" };
  } catch {
    return { url: `data:image/jpeg;base64,${b64}`, caption: req.play.description, provider: "gpt-image" };
  }
}

// ---------------------------------------------------------------------------
// Placeholder provider (no key configured, or generation failed)
// ---------------------------------------------------------------------------

const PLAY_COLORS: Record<KeyPlay["kind"], [string, string]> = {
  statement: ["#1d4ed8", "#172554"],
  swing: ["#b45309", "#451a03"],
  dagger: ["#b91c1c", "#450a0a"],
};

export function placeholderImage(req: KeyPlayImageRequest): KeyPlayImage {
  const initials = req.play.playerName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  const [c1, c2] = PLAY_COLORS[req.play.kind];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></radialGradient>
    <pattern id="halftone" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.2" fill="rgba(255,255,255,0.12)"/></pattern>
  </defs>
  <rect width="640" height="480" fill="url(#bg)"/>
  <rect width="640" height="480" fill="url(#halftone)"/>
  <circle cx="320" cy="210" r="110" fill="rgba(0,0,0,0.25)"/>
  <text x="320" y="248" font-family="Georgia, serif" font-size="96" font-weight="bold" fill="rgba(255,255,255,0.92)" text-anchor="middle">${initials}</text>
  <text x="320" y="420" font-family="Georgia, serif" font-size="26" font-style="italic" fill="rgba(255,255,255,0.85)" text-anchor="middle">GAME ${req.play.game} — ${req.play.title.toUpperCase()}</text>
  <text x="320" y="450" font-family="Courier New, monospace" font-size="13" fill="rgba(255,255,255,0.45)" text-anchor="middle">[ SET OPENAI_API_KEY FOR THE REAL PHOTO ]</text>
</svg>`;
  return {
    url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    caption: req.play.description,
    provider: "placeholder",
  };
}

/** Single entry point — tries gpt-image-1.5, falls back to the placeholder card. */
export async function generateKeyPlayImage(req: KeyPlayImageRequest): Promise<KeyPlayImage> {
  try {
    const real = await openaiImage(req);
    if (real) return real;
  } catch (err) {
    console.error("imagegen error, using placeholder:", err);
  }
  return placeholderImage(req);
}
