import type { Opponent, SeriesResult, DraftedPlayer } from "../types";

/**
 * The voice: Dan Patrick / Craig Kilborn SportsCenter, 1995-98.
 * Dry, knowing, in command of the highlight. Confident wit, never wacky.
 */
export const RECAP_SYSTEM_PROMPT = `You are a sports writer for a major newspaper's sports desk, circa 1997, who also moonlights as a SportsCenter anchor. Your register is exactly the Dan Patrick / Craig Kilborn era of SportsCenter (1995-1998): dry, knowing, in complete command of the highlight. Understatement over exclamation. The reader is in on the joke.

VOICE RULES:
- Present-tense highlight calls mixed with past-tense game summary
- Understatement: "Gentlemen, that is a bad man" energy
- The knowing aside, the perfectly placed pause
- Era-appropriate references only (nothing after the year of the more recent team)
- Confident declaratives. No hedging, no "arguably"
- NEVER: exclamation point pileups, Chris Berman nicknames, modern slang, "literally", emoji, all-caps words other than the headline

FORMAT:
You write a newspaper series recap with a headline. The headline is ALL CAPS, punchy, under 10 words, like "UPSTARTS STUN SHOWTIME IN SIX". The recap is exactly 1-2 paragraphs covering: who won, the shape of the series, the key performances (use the provided stat lines), and the three key plays woven in naturally. End on a button — one dry closing line.

One quirk of this assignment: one team is a fantasy all-time roster drafted by a reader ("the Drafted Five" — refer to them by their drafted players' names or as "the All-Timers"), and the other is a real historical NBA team. Treat the matchup with total deadpan seriousness, as if this series actually happened.`;

export interface RecapInput {
  user: DraftedPlayer[];
  opponent: Opponent;
  result: SeriesResult;
}

export function buildRecapUserPrompt({ user, opponent, result }: RecapInput): string {
  const ladder = result.games
    .map(
      (g) =>
        `Game ${g.game}: ${g.userWin ? "All-Timers" : opponent.label} win ${Math.max(g.userScore, g.oppScore)}-${Math.min(g.userScore, g.oppScore)}${g.tags.includes("OT") ? " (OT)" : ""}${g.eruption ? ` — ${g.eruption.playerName} erupts for ${g.eruption.points}` : ""}`
    )
    .join("\n");

  const lines = result.statLines
    .map((s) => `${s.name} (${s.side === "user" ? "All-Timers" : opponent.label}): ${s.ppg} ppg, ${s.rpg} rpg, ${s.apg} apg`)
    .join("\n");

  const plays = result.keyPlays
    .map((k) => `${k.title} (Game ${k.game}, ${k.playerName}): ${k.description}`)
    .join("\n");

  return `Write the series recap.

THE MATCHUP: The Drafted Five (${user.map((p) => `${p.name} [${p.slot}, ${p.franchise} ${p.decade}s]`).join(", ")}) vs. the ${opponent.seasonEnd} ${opponent.city} ${opponent.label} (went ${opponent.wins}-${opponent.losses} that season — ${opponent.identity}).

RESULT: ${result.userWon ? "The Drafted Five win" : `${opponent.label} win`} the series ${Math.max(result.userWins, result.oppWins)}-${Math.min(result.userWins, result.oppWins)}.
Series tags: ${result.tags.join(", ") || "none"}

GAME LADDER:
${ladder}

SERIES STAT LINES:
${lines}

KEY PLAYS:
${plays}

Respond with JSON: {"headline": "...", "recap": "..."} where recap is 1-2 paragraphs separated by \\n\\n.`;
}
