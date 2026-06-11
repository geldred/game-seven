export type Position = "PG" | "SG" | "SF" | "PF" | "C";

export const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];

export interface PoolPlayer {
  id: string;
  name: string;
  pos: Position[];
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  games: number;
  defEstimated?: boolean;
  jersey?: string;
}

/** A drafted player: pool entry + where he came from and where he plays. */
export interface DraftedPlayer extends PoolPlayer {
  franchise: string;
  decade: string; // "1960" ... "2020"
  slot: Position;
}

export interface OpponentPlayer {
  id: string;
  name: string;
  pos: Position[];
  mpg: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
}

export interface Opponent {
  id: string;
  label: string; // "'96 Bulls"
  city: string;
  franchise: string;
  seasonEnd: number;
  wins: number;
  losses: number;
  weight: number;
  identity: string;
  roster: OpponentPlayer[];
}

export type GameTag = "OT" | "BLOWOUT" | "NAILBITER" | "ERUPTION";

export interface GameResult {
  game: number; // 1-7
  userScore: number;
  oppScore: number;
  userWin: boolean;
  home: "user" | "opp";
  tags: GameTag[];
  /** Set when ERUPTION: who went off, for how many. */
  eruption?: { playerId: string; playerName: string; side: "user" | "opp"; points: number };
}

export type SeriesTag =
  | "SWEEP"
  | "GENTLEMANS_SWEEP"
  | "WENT_SEVEN"
  | "COMEBACK_FROM_0_2"
  | "COMEBACK_FROM_1_3"
  | "UPSET";

export interface StatLine {
  playerId: string;
  name: string;
  side: "user" | "opp";
  ppg: number;
  rpg: number;
  apg: number;
}

export interface KeyPlay {
  kind: "statement" | "swing" | "dagger";
  game: number;
  playerId: string;
  playerName: string;
  side: "user" | "opp";
  title: string;
  description: string;
}

export interface SeriesResult {
  games: GameResult[];
  userWins: number;
  oppWins: number;
  userWon: boolean;
  tags: SeriesTag[];
  clincherGame: number;
  statLines: StatLine[];
  keyPlays: KeyPlay[];
  userRating: number;
  oppRating: number;
}
