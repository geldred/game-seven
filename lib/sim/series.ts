import type {
  DraftedPlayer,
  GameResult,
  GameTag,
  KeyPlay,
  Opponent,
  SeriesResult,
  SeriesTag,
  StatLine,
} from "../types";
import { makeRng, randInt, type Rng } from "./rng";
import starsJson from "../data/stars.json";

const STARS: Record<string, { fame: number; signature: string }> = starsJson.stars;

/**
 * Strength rating: weighted blend of the five counting stats, same spirit as
 * 82-0's "Strength Rating". Assists and stocks are weighted up so a balanced
 * five beats five volume scorers.
 */
function playerRating(p: { ppg: number; rpg: number; apg: number; spg: number; bpg: number }): number {
  return p.ppg * 1.0 + p.rpg * 1.2 + p.apg * 1.5 + p.spg * 3.0 + p.bpg * 3.0;
}

/**
 * Era pace adjustment. Counting stats from fast eras (the 60s ran ~120
 * possessions a game; the 90s ~93) are deflated so a 1962 stat line and a
 * 1996 stat line compete on level ground. Player cards still show raw stats —
 * this only applies inside the sim.
 */
export function paceFactor(decade: number): number {
  const FACTORS: Record<number, number> = {
    1950: 0.75, 1960: 0.8, 1970: 0.88, 1980: 0.95,
    1990: 1.0, 2000: 1.01, 2010: 1.0, 2020: 0.98,
  };
  return FACTORS[decade] ?? 1.0;
}

export function userTeamRating(players: DraftedPlayer[]): number {
  return players.reduce((s, p) => s + playerRating(p) * paceFactor(parseInt(p.decade, 10)), 0);
}

/**
 * Opponent rating uses the top-8 rotation scaled to 240 available minutes so a
 * real team's spread-out production is comparable to five star starters.
 * COHESION is the master difficulty knob, calibrated so an all-time dream five
 * beats the '96 Bulls ~85% of the time while an average draft is a slight
 * underdog against the iconic teams.
 */
export function opponentRating(opponent: Opponent): number {
  const roster = opponent.roster;
  const totalMin = roster.reduce((s, p) => s + p.mpg, 0);
  const scale = Math.min(240 / Math.max(totalMin, 1), 1.15);
  const COHESION = 0.98;
  const decade = Math.floor((opponent.seasonEnd - 1) / 10) * 10;
  const raw = roster.reduce((s, p) => s + playerRating(p), 0);
  return raw * scale * COHESION * paceFactor(decade);
}

/** Per-game win probability for the user from the rating gap. */
export function gameWinProb(userRating: number, oppRating: number): number {
  const ratio = (userRating - oppRating) / oppRating;
  return Math.min(0.93, Math.max(0.07, 0.5 + ratio * 1.4));
}

function expectedPoints(rating: number): number {
  // Map a rating to a plausible game score anchor.
  return Math.min(126, Math.max(90, Math.round(rating * 0.52)));
}

const HOME_ORDER: ("user" | "opp")[] = ["user", "user", "opp", "opp", "user", "opp", "user"];

interface SimInput {
  user: DraftedPlayer[];
  opponent: Opponent;
  seed: number;
}

export function simulateSeries({ user, opponent, seed }: SimInput): SeriesResult {
  const rng = makeRng(seed);
  const userRating = userTeamRating(user);
  const oppRating = opponentRating(opponent);
  const baseProb = gameWinProb(userRating, oppRating);
  // Higher-rated team gets home court.
  const userHasHome = userRating >= oppRating;

  const games: GameResult[] = [];
  let userWins = 0;
  let oppWins = 0;

  while (userWins < 4 && oppWins < 4) {
    const g = games.length + 1;
    const slot = HOME_ORDER[g - 1];
    const home: "user" | "opp" = userHasHome ? slot : slot === "user" ? "opp" : "user";
    let p = baseProb + (home === "user" ? 0.03 : -0.03);

    // Desperation bump: a team facing elimination plays over its head.
    if (oppWins === 3 && userWins < 3) p += 0.04;
    if (userWins === 3 && oppWins < 3) p -= 0.04;

    const userWin = rng() < p;

    const winnerAnchor = expectedPoints(userWin ? userRating : oppRating);
    const margin = sampleMargin(rng);
    const ot = margin <= 2 && rng() < 0.45;
    const winScore = winnerAnchor + randInt(rng, -6, 8) + (ot ? randInt(rng, 4, 10) : 0);
    const loseScore = winScore - margin;

    const tags: GameTag[] = [];
    if (ot) tags.push("OT");
    if (margin >= 16) tags.push("BLOWOUT");
    if (margin <= 3 && !ot) tags.push("NAILBITER");

    const game: GameResult = {
      game: g,
      userScore: userWin ? winScore : loseScore,
      oppScore: userWin ? loseScore : winScore,
      userWin,
      home,
      tags,
    };

    // Star eruption: ~28% of games, someone on the winning side goes off.
    if (rng() < 0.28) {
      const side: "user" | "opp" = userWin ? "user" : "opp";
      const pool: { id: string; name: string; ppg: number }[] =
        side === "user" ? user : opponent.roster;
      const star = pickTopScorer(pool, rng);
      const points = Math.round(star.ppg * (1.5 + rng() * 0.5));
      if (points >= 32) {
        tags.push("ERUPTION");
        game.eruption = { playerId: star.id, playerName: star.name, side, points };
      }
    }

    games.push(game);
    if (userWin) userWins++;
    else oppWins++;
  }

  const userWon = userWins === 4;
  const tags = seriesTags(games, userWon, baseProb);
  const statLines = buildStatLines(user, opponent, games, rng);
  const keyPlays = pickKeyPlays(user, opponent, games, userWon, rng);

  return {
    games,
    userWins,
    oppWins,
    userWon,
    tags,
    clincherGame: games.length,
    statLines,
    keyPlays,
    userRating: Math.round(userRating * 10) / 10,
    oppRating: Math.round(oppRating * 10) / 10,
  };
}

/** Margins: mostly single digits, occasional blowout. */
function sampleMargin(rng: Rng): number {
  const r = rng();
  if (r < 0.35) return randInt(rng, 1, 4);
  if (r < 0.7) return randInt(rng, 5, 9);
  if (r < 0.9) return randInt(rng, 10, 15);
  return randInt(rng, 16, 27);
}

function seriesTags(games: GameResult[], userWon: boolean, baseProb: number): SeriesTag[] {
  const tags: SeriesTag[] = [];
  const n = games.length;
  if (n === 4) tags.push("SWEEP");
  if (n === 5) tags.push("GENTLEMANS_SWEEP");
  if (n === 7) tags.push("WENT_SEVEN");

  // Comebacks, from the winner's perspective.
  const winnerWinAt = (i: number) => (userWon ? games[i].userWin : !games[i].userWin);
  let w = 0;
  let l = 0;
  let was02 = false;
  let was13 = false;
  for (let i = 0; i < n; i++) {
    if (winnerWinAt(i)) w++;
    else l++;
    if (w === 0 && l === 2) was02 = true;
    if (w === 1 && l === 3) was13 = true;
  }
  if (was13) tags.push("COMEBACK_FROM_1_3");
  else if (was02) tags.push("COMEBACK_FROM_0_2");

  // Upset: the side the ratings favored lost.
  if ((baseProb > 0.58 && !userWon) || (baseProb < 0.42 && userWon)) tags.push("UPSET");
  return tags;
}

function pickTopScorer<T extends { ppg: number }>(pool: T[], rng: Rng): T {
  // Usually the best scorer, sometimes the second option.
  const sorted = [...pool].sort((a, b) => b.ppg - a.ppg);
  return rng() < 0.7 || sorted.length < 2 ? sorted[0] : sorted[1];
}

function buildStatLines(
  user: DraftedPlayer[],
  opponent: Opponent,
  games: GameResult[],
  rng: Rng
): StatLine[] {
  const eruptions = new Map<string, number>();
  for (const g of games) {
    if (g.eruption) eruptions.set(g.eruption.playerId, (eruptions.get(g.eruption.playerId) ?? 0) + 1);
  }
  const line = (p: { id: string; name: string; ppg: number; rpg: number; apg: number }, side: "user" | "opp"): StatLine => {
    const swing = () => 0.85 + rng() * 0.3;
    const eruptBoost = 1 + (eruptions.get(p.id) ?? 0) * 0.08;
    return {
      playerId: p.id,
      name: p.name,
      side,
      ppg: Math.round(p.ppg * swing() * eruptBoost * 10) / 10,
      rpg: Math.round(p.rpg * swing() * 10) / 10,
      apg: Math.round(p.apg * swing() * 10) / 10,
    };
  };
  const oppTop = [...opponent.roster].sort((a, b) => b.ppg - a.ppg).slice(0, 5);
  return [...user.map((p) => line(p, "user")), ...oppTop.map((p) => line(p, "opp"))];
}

/**
 * Three key plays across the series arc: the statement, the swing, the dagger.
 * Stars only — a play needs a recognizable name on it, so we prefer players
 * from the curated star list (by fame), falling back to the top scorer.
 */
function pickKeyPlays(
  user: DraftedPlayer[],
  opponent: Opponent,
  games: GameResult[],
  userWon: boolean,
  rng: Rng
): KeyPlay[] {
  type Candidate = { id: string; name: string; ppg: number; side: "user" | "opp" };
  const candidates: Candidate[] = [
    ...user.map((p) => ({ id: p.id, name: p.name, ppg: p.ppg, side: "user" as const })),
    ...opponent.roster.map((p) => ({ id: p.id, name: p.name, ppg: p.ppg, side: "opp" as const })),
  ];

  const fame = (c: Candidate) => (STARS[c.id]?.fame ?? 0) * 100 + c.ppg;
  const starOn = (side: "user" | "opp", exclude: Set<string>) => {
    const pool = candidates.filter((c) => c.side === side && !exclude.has(c.id));
    pool.sort((a, b) => fame(b) - fame(a));
    return pool[0];
  };

  const used = new Set<string>();
  const plays: KeyPlay[] = [];
  const sig = (id: string) => STARS[id]?.signature;

  // 1. The statement — Game 1, winner of that game.
  const g1 = games[0];
  const stmtSide: "user" | "opp" = g1.userWin ? "user" : "opp";
  const stmt = g1.eruption && g1.eruption.side === stmtSide
    ? { id: g1.eruption.playerId, name: g1.eruption.playerName, ppg: 0, side: stmtSide }
    : starOn(stmtSide, used);
  used.add(stmt.id);
  plays.push({
    kind: "statement",
    game: 1,
    playerId: stmt.id,
    playerName: stmt.name,
    side: stmt.side,
    title: "The Statement",
    description:
      sig(stmt.id)
        ? `Game 1: ${stmt.name} sets the tone — ${sig(stmt.id)}.`
        : `Game 1: ${stmt.name} sets the tone and announces this series has a protagonist.`,
  });

  // 2. The swing — most dramatic middle game: eruption > OT > nailbiter > biggest swing in momentum.
  const middle = games.slice(1, games.length - 1);
  const swingGame =
    middle.find((g) => g.tags.includes("ERUPTION")) ??
    middle.find((g) => g.tags.includes("OT")) ??
    middle.find((g) => g.tags.includes("NAILBITER")) ??
    middle[Math.floor(middle.length / 2)] ??
    games[Math.max(games.length - 2, 0)];
  const swingSide: "user" | "opp" = swingGame.userWin ? "user" : "opp";
  const swing = swingGame.eruption
    ? { id: swingGame.eruption.playerId, name: swingGame.eruption.playerName, ppg: 0, side: swingGame.eruption.side }
    : starOn(swingSide, used);
  used.add(swing.id);
  const swingFlavor = swingGame.tags.includes("OT")
    ? "in overtime, with the building losing its mind"
    : swingGame.eruption
      ? `with ${swingGame.eruption.points} points and zero interest in your defensive scheme`
      : "in a game that turned the whole series";
  plays.push({
    kind: "swing",
    game: swingGame.game,
    playerId: swing.id,
    playerName: swing.name,
    side: swing.side,
    title: "The Swing",
    description: sig(swing.id)
      ? `Game ${swingGame.game}: ${swing.name} — ${sig(swing.id)} — ${swingFlavor}.`
      : `Game ${swingGame.game}: ${swing.name} takes over ${swingFlavor}.`,
  });

  // 3. The dagger — clincher, winner's star.
  const last = games[games.length - 1];
  const dagSide: "user" | "opp" = userWon ? "user" : "opp";
  const dagger = last.eruption && last.eruption.side === dagSide
    ? { id: last.eruption.playerId, name: last.eruption.playerName, ppg: 0, side: dagSide }
    : starOn(dagSide, used);
  plays.push({
    kind: "dagger",
    game: last.game,
    playerId: dagger.id,
    playerName: dagger.name,
    side: dagger.side,
    title: "The Dagger",
    description: sig(dagger.id)
      ? `Game ${last.game}: ${dagger.name} closes the show — ${sig(dagger.id)}. Series over.`
      : `Game ${last.game}: ${dagger.name} puts it away. Turn out the lights.`,
  });

  // Avoid unused-variable lint on rng if branches above didn't consume it.
  void rng;
  return plays;
}
