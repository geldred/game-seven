import draftPoolsJson from "./data/draftPools.json";
import opponentsJson from "./data/opponents.json";
import type { Opponent, PoolPlayer, Position } from "./types";

export const DRAFT_POOLS = draftPoolsJson as Record<string, Record<string, PoolPlayer[]>>;
export const OPPONENTS = opponentsJson as Opponent[];

export interface SpinResult {
  franchise: string;
  decade: string;
}

/** All valid (franchise, decade) combos — pools only exist where the franchise existed. */
const VALID_COMBOS: SpinResult[] = Object.entries(DRAFT_POOLS).flatMap(([franchise, decades]) =>
  Object.keys(decades).map((decade) => ({ franchise, decade }))
);

export function randomSpin(): SpinResult {
  return VALID_COMBOS[Math.floor(Math.random() * VALID_COMBOS.length)];
}

/** Re-roll the franchise, keeping the decade (only franchises with that decade). */
export function rerollFranchise(current: SpinResult): SpinResult {
  const options = VALID_COMBOS.filter((c) => c.decade === current.decade && c.franchise !== current.franchise);
  return options.length ? options[Math.floor(Math.random() * options.length)] : current;
}

/** Re-roll the decade, keeping the franchise. */
export function rerollDecade(current: SpinResult): SpinResult {
  const decades = Object.keys(DRAFT_POOLS[current.franchise] ?? {}).filter((d) => d !== current.decade);
  if (!decades.length) return current;
  return { franchise: current.franchise, decade: decades[Math.floor(Math.random() * decades.length)] };
}

export function poolFor(spin: SpinResult): PoolPlayer[] {
  return DRAFT_POOLS[spin.franchise]?.[spin.decade] ?? [];
}

/** Positions a player could still fill given the open slots. */
export function eligibleSlots(player: PoolPlayer, taken: Set<Position>): Position[] {
  return player.pos.filter((p) => !taken.has(p));
}

/** Weighted random opponent — iconic teams come up more often. */
export function pickOpponent(): Opponent {
  const total = OPPONENTS.reduce((s, o) => s + o.weight, 0);
  let roll = Math.random() * total;
  for (const o of OPPONENTS) {
    roll -= o.weight;
    if (roll <= 0) return o;
  }
  return OPPONENTS[OPPONENTS.length - 1];
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
