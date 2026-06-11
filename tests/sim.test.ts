import { describe, expect, it } from "vitest";
import { simulateSeries, userTeamRating, opponentRating, gameWinProb } from "../lib/sim/series";
import type { DraftedPlayer, Opponent } from "../lib/types";
import opponentsJson from "../lib/data/opponents.json";

const opponents = opponentsJson as Opponent[];
const bulls96 = opponents.find((o) => o.id === "chi-1996")!;
const bullets78 = opponents.find((o) => o.id === "wsb-1978")!;

function drafted(
  name: string,
  slot: DraftedPlayer["slot"],
  ppg: number,
  rpg: number,
  apg: number,
  spg: number,
  bpg: number
): DraftedPlayer {
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    pos: [slot],
    ppg,
    rpg,
    apg,
    spg,
    bpg,
    games: 300,
    franchise: "CHI",
    decade: "1990",
    slot,
  };
}

const DREAM_TEAM: DraftedPlayer[] = [
  drafted("Magic Johnson", "PG", 19.5, 7.2, 11.9, 1.9, 0.4),
  drafted("Michael Jordan", "SG", 31.0, 6.3, 5.4, 2.7, 0.9),
  drafted("LeBron James", "SF", 26.2, 7.7, 8.0, 1.4, 0.7),
  drafted("Larry Bird", "PF", 24.3, 10.0, 6.3, 1.7, 0.8),
  drafted("Shaquille O'Neal", "C", 27.2, 12.1, 2.6, 0.6, 2.6),
];

const SCRUB_TEAM: DraftedPlayer[] = [
  drafted("Role Guard", "PG", 9.0, 2.5, 4.0, 0.9, 0.1),
  drafted("Bench Wing", "SG", 11.0, 3.0, 2.0, 0.8, 0.2),
  drafted("Glue Guy", "SF", 8.5, 4.5, 1.5, 0.7, 0.3),
  drafted("Energy Big", "PF", 7.0, 6.5, 1.0, 0.5, 0.7),
  drafted("Backup Center", "C", 6.0, 5.0, 0.5, 0.3, 0.9),
];

describe("ratings", () => {
  it("rates the dream team above a real iconic team", () => {
    expect(userTeamRating(DREAM_TEAM)).toBeGreaterThan(opponentRating(bulls96));
  });

  it("rates the 96 Bulls above the 78 Bullets", () => {
    expect(opponentRating(bulls96)).toBeGreaterThan(opponentRating(bullets78));
  });

  it("clamps win probability away from certainty", () => {
    expect(gameWinProb(1000, 100)).toBeLessThanOrEqual(0.93);
    expect(gameWinProb(100, 1000)).toBeGreaterThanOrEqual(0.07);
  });
});

describe("simulateSeries", () => {
  it("is deterministic for the same seed", () => {
    const a = simulateSeries({ user: DREAM_TEAM, opponent: bulls96, seed: 42 });
    const b = simulateSeries({ user: DREAM_TEAM, opponent: bulls96, seed: 42 });
    expect(a).toEqual(b);
  });

  it("always produces a valid best-of-seven", () => {
    for (let seed = 0; seed < 200; seed++) {
      const r = simulateSeries({ user: DREAM_TEAM, opponent: bulls96, seed });
      expect(r.games.length).toBeGreaterThanOrEqual(4);
      expect(r.games.length).toBeLessThanOrEqual(7);
      expect(Math.max(r.userWins, r.oppWins)).toBe(4);
      expect(r.userWins + r.oppWins).toBe(r.games.length);
      expect(r.clincherGame).toBe(r.games.length);
      // every game has a sane score
      for (const g of r.games) {
        expect(g.userScore).not.toBe(g.oppScore);
        expect(Math.min(g.userScore, g.oppScore)).toBeGreaterThan(60);
        expect(Math.max(g.userScore, g.oppScore)).toBeLessThan(170);
        expect(g.userWin).toBe(g.userScore > g.oppScore);
      }
    }
  });

  it("dream team beats the 96 Bulls most of the time, but not always", () => {
    let wins = 0;
    const N = 400;
    for (let seed = 0; seed < N; seed++) {
      if (simulateSeries({ user: DREAM_TEAM, opponent: bulls96, seed }).userWon) wins++;
    }
    expect(wins / N).toBeGreaterThan(0.55);
    expect(wins / N).toBeLessThan(0.98);
  });

  it("a scrub team gets crushed by the 96 Bulls", () => {
    let wins = 0;
    const N = 200;
    for (let seed = 0; seed < N; seed++) {
      if (simulateSeries({ user: SCRUB_TEAM, opponent: bulls96, seed }).userWon) wins++;
    }
    expect(wins / N).toBeLessThan(0.1);
  });

  it("tags sweeps and seven-game series correctly", () => {
    for (let seed = 0; seed < 200; seed++) {
      const r = simulateSeries({ user: DREAM_TEAM, opponent: bulls96, seed });
      if (r.games.length === 4) expect(r.tags).toContain("SWEEP");
      if (r.games.length === 7) expect(r.tags).toContain("WENT_SEVEN");
      if (r.games.length === 5) expect(r.tags).toContain("GENTLEMANS_SWEEP");
    }
  });

  it("produces exactly three key plays with the dagger on the winning side", () => {
    for (let seed = 0; seed < 100; seed++) {
      const r = simulateSeries({ user: DREAM_TEAM, opponent: bulls96, seed });
      expect(r.keyPlays).toHaveLength(3);
      expect(r.keyPlays.map((k) => k.kind)).toEqual(["statement", "swing", "dagger"]);
      const dagger = r.keyPlays[2];
      expect(dagger.side).toBe(r.userWon ? "user" : "opp");
      expect(dagger.game).toBe(r.clincherGame);
      for (const k of r.keyPlays) {
        expect(k.playerName.length).toBeGreaterThan(0);
        expect(k.description).toContain(`Game ${k.game}`);
      }
    }
  });

  it("builds stat lines for all five starters and the opponent top five", () => {
    const r = simulateSeries({ user: DREAM_TEAM, opponent: bulls96, seed: 7 });
    expect(r.statLines.filter((s) => s.side === "user")).toHaveLength(5);
    expect(r.statLines.filter((s) => s.side === "opp")).toHaveLength(5);
    const mj = r.statLines.find((s) => s.name === "Michael Jordan" && s.side === "user")!;
    expect(mj.ppg).toBeGreaterThan(20);
    expect(mj.ppg).toBeLessThan(45);
  });
});
