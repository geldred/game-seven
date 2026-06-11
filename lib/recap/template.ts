import type { RecapInput } from "./voice";

/**
 * Offline fallback recap — used when no ANTHROPIC_API_KEY is configured.
 * Template-assembled 90s sports-desk copy. Less sparkling than the real
 * writer, but the game stays playable without a key.
 */
export function templateRecap({ user, opponent, result }: RecapInput): {
  headline: string;
  recap: string;
} {
  const winnerName = result.userWon ? "THE ALL-TIMERS" : opponent.label.toUpperCase().replace("'", "'");
  const loserName = result.userWon ? `the ${opponent.seasonEnd} ${opponent.label}` : "the All-Timers";
  const count = `${Math.max(result.userWins, result.oppWins)}-${Math.min(result.userWins, result.oppWins)}`;
  const inGames = result.games.length === 4 ? "IN A SWEEP" : `IN ${result.games.length}`;

  const headline = result.tags.includes("UPSET")
    ? `${winnerName} SHOCK THE WORLD ${inGames}`
    : `${winnerName} CLOSE IT OUT ${inGames}`;

  const topUser = [...result.statLines.filter((s) => s.side === "user")].sort((a, b) => b.ppg - a.ppg)[0];
  const topOpp = [...result.statLines.filter((s) => s.side === "opp")].sort((a, b) => b.ppg - a.ppg)[0];
  const dagger = result.keyPlays[2];
  const swing = result.keyPlays[1];

  const shape = result.tags.includes("COMEBACK_FROM_1_3")
    ? "They were down three games to one, which is usually where we cue the sad music. Not this time."
    : result.tags.includes("COMEBACK_FROM_0_2")
      ? "Down two games to none, somebody apparently passed around the memo: win four of five. They read it."
      : result.tags.includes("WENT_SEVEN")
        ? "Seven games. You could not script it any tighter, and frankly, we tried."
        : result.games.length === 4
          ? "Four games. That is not a series, that is a statement with a return address."
          : "Five or six games of basketball, and only one team looked like it had somewhere better to be.";

  const recap = [
    `${result.userWon ? "The All-Timers" : `The ${opponent.seasonEnd} ${opponent.label}`} took care of ${loserName}, ${count}. ${shape} ${topUser.name} poured in ${topUser.ppg} a night, while ${topOpp.name} answered with ${topOpp.ppg} of his own — and for a while there, it mattered.`,
    `${swing.description} Then came Game ${dagger.game}: ${dagger.description.replace(`Game ${dagger.game}: `, "")} You can't stop ${dagger.playerName}. You can only hope to contain him — and nobody did. ${user.length === 5 ? "Good night, everybody." : ""}`,
  ].join("\n\n");

  return { headline, recap };
}
