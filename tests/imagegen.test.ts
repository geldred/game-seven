import { describe, expect, it } from "vitest";
import { buildImagePrompt, placeholderImage, type KeyPlayImageRequest } from "../lib/imagegen";
import type { KeyPlay } from "../lib/types";

const play: KeyPlay = {
  kind: "dagger",
  game: 6,
  playerId: "michael-jordan",
  playerName: "Michael Jordan",
  side: "opp",
  title: "The Dagger",
  description: "Game 6: Michael Jordan closes the show.",
};

const req: KeyPlayImageRequest = {
  play,
  uniformContext: "90's Chicago Bulls road red uniform",
  opponentContext: "the All-Timers",
};

describe("buildImagePrompt", () => {
  it("names the player and pulls his signature move from the star list", () => {
    const prompt = buildImagePrompt(req);
    expect(prompt).toContain("Michael Jordan");
    expect(prompt).toContain("fadeaway"); // from stars.json signature
    expect(prompt).toContain("90's Chicago Bulls road red uniform");
  });

  it("falls back gracefully for a non-star player", () => {
    const prompt = buildImagePrompt({
      ...req,
      play: { ...play, playerId: "some-role-player", playerName: "Some Role Player" },
    });
    expect(prompt).toContain("a game-defining play");
  });

  it("avoids contact phrasing that trips moderation", () => {
    const prompt = buildImagePrompt(req).toLowerCase();
    for (const banned of ["over a defender", "violen", "fight", "posteriz"]) {
      expect(prompt).not.toContain(banned);
    }
  });
});

describe("placeholderImage", () => {
  it("returns an SVG data URL with the player initials", () => {
    const img = placeholderImage(req);
    expect(img.provider).toBe("placeholder");
    expect(img.url.startsWith("data:image/svg+xml")).toBe(true);
    expect(decodeURIComponent(img.url)).toContain("MJ");
    expect(img.caption).toBe(play.description);
  });
});
