/** Modern franchise codes with display names and brand colors for the UI. */
export interface Franchise {
  code: string;
  name: string;
  color: string; // primary brand-ish color
}

export const FRANCHISES: Record<string, Franchise> = {
  ATL: { code: "ATL", name: "Hawks", color: "#e03a3e" },
  BOS: { code: "BOS", name: "Celtics", color: "#007a33" },
  BKN: { code: "BKN", name: "Nets", color: "#8d8d8d" },
  CHA: { code: "CHA", name: "Hornets", color: "#00788c" },
  CHI: { code: "CHI", name: "Bulls", color: "#ce1141" },
  CLE: { code: "CLE", name: "Cavaliers", color: "#860038" },
  DAL: { code: "DAL", name: "Mavericks", color: "#00538c" },
  DEN: { code: "DEN", name: "Nuggets", color: "#fec524" },
  DET: { code: "DET", name: "Pistons", color: "#c8102e" },
  GSW: { code: "GSW", name: "Warriors", color: "#ffc72c" },
  HOU: { code: "HOU", name: "Rockets", color: "#ce1141" },
  IND: { code: "IND", name: "Pacers", color: "#fdbb30" },
  LAC: { code: "LAC", name: "Clippers", color: "#c8102e" },
  LAL: { code: "LAL", name: "Lakers", color: "#fdb927" },
  MEM: { code: "MEM", name: "Grizzlies", color: "#5d76a9" },
  MIA: { code: "MIA", name: "Heat", color: "#98002e" },
  MIL: { code: "MIL", name: "Bucks", color: "#00471b" },
  MIN: { code: "MIN", name: "Timberwolves", color: "#236192" },
  NOP: { code: "NOP", name: "Pelicans", color: "#0c2340" },
  NYK: { code: "NYK", name: "Knicks", color: "#f58426" },
  OKC: { code: "OKC", name: "Thunder", color: "#007ac1" },
  ORL: { code: "ORL", name: "Magic", color: "#0077c0" },
  PHI: { code: "PHI", name: "76ers", color: "#006bb6" },
  PHX: { code: "PHX", name: "Suns", color: "#e56020" },
  POR: { code: "POR", name: "Trail Blazers", color: "#e03a3e" },
  SAC: { code: "SAC", name: "Kings", color: "#5a2d81" },
  SAS: { code: "SAS", name: "Spurs", color: "#c4ced4" },
  TOR: { code: "TOR", name: "Raptors", color: "#ce1141" },
  UTA: { code: "UTA", name: "Jazz", color: "#002b5c" },
  WAS: { code: "WAS", name: "Wizards", color: "#002b5c" },
};

export const DECADE_LABELS: Record<string, string> = {
  "1960": "60's",
  "1970": "70's",
  "1980": "80's",
  "1990": "90's",
  "2000": "00's",
  "2010": "10's",
  "2020": "20's",
};
