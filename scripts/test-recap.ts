/**
 * Smoke test for the live recap writer: simulates a dream-five vs '96 Bulls
 * series and POSTs it to the running dev server. Run with the dev server up:
 *   npx tsx scripts/test-recap.ts
 */
import { simulateSeries } from "../lib/sim/series";
import type { DraftedPlayer, Opponent, Position } from "../lib/types";
import opponentsJson from "../lib/data/opponents.json";

const opponents = opponentsJson as Opponent[];
const bulls96 = opponents.find((o) => o.id === "chi-1996")!;

const d = (
  name: string, slot: Position, franchise: string, decade: string,
  ppg: number, rpg: number, apg: number, spg: number, bpg: number
): DraftedPlayer => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, pos: [slot],
  ppg, rpg, apg, spg, bpg, games: 300, franchise, decade, slot,
});

const user = [
  d("Magic Johnson", "PG", "LAL", "1980", 19.5, 7.2, 11.9, 1.9, 0.4),
  d("Kobe Bryant", "SG", "LAL", "2000", 27.9, 5.6, 4.8, 1.6, 0.6),
  d("LeBron James", "SF", "CLE", "2010", 26.2, 7.7, 8.0, 1.4, 0.7),
  d("Tim Duncan", "PF", "SAS", "2000", 21.6, 11.6, 3.2, 0.8, 2.4),
  d("Hakeem Olajuwon", "C", "HOU", "1990", 24.8, 11.4, 3.0, 1.8, 3.4),
];

const result = simulateSeries({ user, opponent: bulls96, seed: 19970608 });

async function main() {
  const ladder = result.games
    .map((g) => `G${g.game} ${g.userWin ? "W" : "L"} ${g.userScore}-${g.oppScore}${g.tags.includes("OT") ? " OT" : ""}`)
    .join("  ");
  console.log(`SERIES: ${result.userWon ? "All-Timers" : bulls96.label} in ${result.games.length}  |  ${ladder}\n`);

  const res = await fetch("http://localhost:3000/api/recap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, opponent: bulls96, result }),
  });
  const recap = (await res.json()) as { headline: string; recap: string; source: string };

  console.log(`SOURCE: ${recap.source}\n`);
  console.log(recap.headline + "\n");
  console.log(recap.recap);
}

main();
