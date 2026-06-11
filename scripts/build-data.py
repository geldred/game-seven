#!/usr/bin/env python3
"""
GAME SEVEN data pipeline.

Reads raw historical NBA CSVs (data-raw/) and emits game data (lib/data/):
  - draftPools.json  — per-franchise, per-decade player pools with per-game stats
  - opponents.json   — curated iconic team-seasons with rosters pulled from the data

Sources:
  - nba_1950_2017.csv (TheNBACSV / basketball-reference): season TOTALS.
    NOTE: its "SeasonStart" column is actually the season END year
    (e.g. 1986 = the 1985-86 season). Used for seasons ending <= 1996.
  - player_traditional_rs_1996_2023.csv (Brescou / stats.nba.com): PER-GAME averages,
    SEASON like "1996-97". Used for seasons ending >= 1997.
  - player_index_1996_2023.csv: coarse positions (G/F/C) for modern players.
"""

import csv
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data-raw"
OUT = ROOT / "lib" / "data"
OUT.mkdir(parents=True, exist_ok=True)

DECADES = [1960, 1970, 1980, 1990, 2000, 2010, 2020]

# Map every historical team code (both basketball-reference and stats.nba.com styles)
# to the modern franchise it belongs to.
FRANCHISE_MAP = {
    # modern codes map to themselves
    **{c: c for c in [
        "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
        "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
        "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
    ]},
    # basketball-reference historical codes
    "STL": "ATL", "MLH": "ATL", "TRI": "ATL",
    "NJN": "BKN", "NYN": "BKN", "BRK": "BKN", "NJA": "BKN",
    "CHH": "CHA", "CHO": "CHA",
    "NOH": "NOP", "NOK": "NOP",
    "FTW": "DET",
    "SFW": "GSW", "PHW": "GSW", "GOS": "GSW",
    "SDR": "HOU",
    "SDC": "LAC", "BUF": "LAC",
    "MNL": "LAL",
    "VAN": "MEM",
    "SEA": "OKC",
    "SYR": "PHI", "PHL": "PHI",
    "PHO": "PHX",
    "KCK": "SAC", "KCO": "SAC", "CIN": "SAC", "ROC": "SAC",
    "NOJ": "UTA",
    "WSB": "WAS", "CAP": "WAS", "BAL": "WAS", "CHP": "WAS", "CHZ": "WAS",
    "UTH": "UTA",
}

FINE_POSITIONS = {"PG", "SG", "SF", "PF", "C"}
COARSE_EXPAND = {
    "G": ["PG", "SG"],
    "F": ["SF", "PF"],
    "C": ["C"],
    "G-F": ["SG", "SF"],
    "F-G": ["SG", "SF"],
    "F-C": ["PF", "C"],
    "C-F": ["PF", "C"],
}

# Per-36-minute defensive-stat estimates by position, used for seasons before
# 1973-74 when the NBA didn't track steals/blocks. Same spirit as 82-0's
# "estimated fairly" approach.
DEF_EST_PER36 = {
    "PG": (1.6, 0.2), "SG": (1.3, 0.3), "SF": (1.1, 0.5),
    "PF": (0.9, 0.9), "C": (0.8, 1.5),
}


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def clean_name(name: str) -> str:
    return name.replace("*", "").strip()


def parse_positions(pos_str: str) -> list[str]:
    """Normalize a position string from either dataset to fine positions."""
    if not pos_str:
        return []
    pos_str = pos_str.strip().upper()
    out: list[str] = []
    for token in re.split(r"[-/,]", pos_str):
        token = token.strip()
        if token in FINE_POSITIONS:
            out.append(token)
        elif token in COARSE_EXPAND:
            out.extend(COARSE_EXPAND[token])
    # dedupe preserving order
    seen = set()
    return [p for p in out if not (p in seen or seen.add(p))]


def fnum(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def estimate_def_stats(positions: list[str], mpg: float) -> tuple[float, float]:
    pos = positions[0] if positions else "SF"
    s36, b36 = DEF_EST_PER36.get(pos, (1.1, 0.5))
    scale = mpg / 36.0
    return round(s36 * scale, 1), round(b36 * scale, 1)


# ---------------------------------------------------------------------------
# Load season rows from both sources into one normalized list:
# {name, abbr, seasonEnd, gp, mpg, ppg, rpg, apg, spg, bpg, positions, defEstimated}
# ---------------------------------------------------------------------------

rows = []

with open(RAW / "nba_1950_2017.csv", newline="", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        season_end = int(fnum(r["SeasonStart"]))  # mislabeled: this is the END year
        if season_end > 1996:
            continue  # modern source takes over
        abbr = (r["Tm"] or "").strip()
        if abbr == "TOT" or abbr not in FRANCHISE_MAP:
            continue
        g = fnum(r["G"])
        if g < 1:
            continue
        positions = parse_positions(r["Pos"])
        mpg = fnum(r["MP"]) / g
        spg, bpg = fnum(r["STL"]) / g, fnum(r["BLK"]) / g
        def_estimated = False
        if season_end <= 1974 and fnum(r["STL"]) == 0 and fnum(r["BLK"]) == 0:
            spg, bpg = estimate_def_stats(positions, mpg)
            def_estimated = True
        rows.append({
            "name": clean_name(r["PlayerName"]),
            "abbr": abbr,
            "seasonEnd": season_end,
            "gp": g,
            "mpg": mpg,
            "ppg": fnum(r["PTS"]) / g,
            "rpg": fnum(r["TRB"]) / g,
            "apg": fnum(r["AST"]) / g,
            "spg": spg,
            "bpg": bpg,
            "positions": positions,
            "defEstimated": def_estimated,
        })

# Coarse positions for modern players, keyed by stats.nba.com PERSON_ID.
index_pos: dict[str, str] = {}
index_jersey: dict[str, str] = {}
with open(RAW / "player_index_1996_2023.csv", newline="", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        pid = r["PERSON_ID"].strip()
        index_pos[pid] = (r["POSITION"] or "").strip()
        index_jersey[pid] = (r["JERSEY_NUMBER"] or "").strip()

with open(RAW / "player_traditional_rs_1996_2023.csv", newline="", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        season = r["SEASON"]  # "1996-97"
        season_end = int(season[:4]) + 1
        if season_end < 1997:
            continue
        abbr = (r["TEAM_ABBREVIATION"] or "").strip()
        if abbr not in FRANCHISE_MAP:
            continue
        gp = fnum(r["GP"])
        if gp < 1:
            continue
        pid = r["PLAYER_ID"].strip()
        rows.append({
            "name": clean_name(r["PLAYER_NAME"]),
            "abbr": abbr,
            "seasonEnd": season_end,
            "gp": gp,
            "mpg": fnum(r["MIN"]),
            "ppg": fnum(r["PTS"]),
            "rpg": fnum(r["REB"]),
            "apg": fnum(r["AST"]),
            "spg": fnum(r["STL"]),
            "bpg": fnum(r["BLK"]),
            "positions": parse_positions(index_pos.get(pid, "")),
            "defEstimated": False,
            "jersey": index_jersey.get(pid, ""),
        })

print(f"normalized season rows: {len(rows)}")

# ---------------------------------------------------------------------------
# Draft pools: aggregate per (franchise, decade, player), G-weighted.
# ---------------------------------------------------------------------------

# Carry fine-grained positions across a player's career: basketball-reference
# (pre-97) has PG/SG/...; stats.nba.com only G/F/C. Prefer fine.
career_positions: dict[str, list[str]] = defaultdict(list)
for r in rows:
    for p in r["positions"]:
        if p not in career_positions[r["name"]]:
            career_positions[r["name"]].append(p)

pools: dict = defaultdict(lambda: defaultdict(dict))
agg = defaultdict(lambda: {"g": 0.0, "ppg": 0.0, "rpg": 0.0, "apg": 0.0,
                           "spg": 0.0, "bpg": 0.0, "est": False, "jersey": ""})

for r in rows:
    season_start = r["seasonEnd"] - 1
    decade = (season_start // 10) * 10
    if decade not in DECADES:
        continue
    key = (FRANCHISE_MAP[r["abbr"]], decade, r["name"])
    a = agg[key]
    g = r["gp"]
    for stat in ("ppg", "rpg", "apg", "spg", "bpg"):
        a[stat] += r[stat] * g
    a["g"] += g
    a["est"] = a["est"] or r["defEstimated"]
    if r.get("jersey"):
        a["jersey"] = r["jersey"]

MIN_GAMES = {2020: 30}  # partial decade; everything else needs ~70% of a season
DEFAULT_MIN_GAMES = 58
POOL_CAP = 80

for (franchise, decade, name), a in agg.items():
    if a["g"] < MIN_GAMES.get(decade, DEFAULT_MIN_GAMES):
        continue
    entry = {
        "id": slugify(name),
        "name": name,
        "pos": career_positions.get(name) or ["SF"],
        "ppg": round(a["ppg"] / a["g"], 1),
        "rpg": round(a["rpg"] / a["g"], 1),
        "apg": round(a["apg"] / a["g"], 1),
        "spg": round(a["spg"] / a["g"], 1),
        "bpg": round(a["bpg"] / a["g"], 1),
        "games": int(a["g"]),
    }
    if a["est"]:
        entry["defEstimated"] = True
    if a["jersey"]:
        entry["jersey"] = a["jersey"]
    pools[franchise][str(decade)][name] = entry

draft_pools = {}
for franchise, decades in pools.items():
    draft_pools[franchise] = {}
    for decade, players in decades.items():
        ranked = sorted(players.values(), key=lambda p: -p["ppg"])[:POOL_CAP]
        if len(ranked) >= 8:  # don't ship unplayably thin pools
            draft_pools[franchise][decade] = ranked

with open(OUT / "draftPools.json", "w", encoding="utf-8") as f:
    json.dump(draft_pools, f, ensure_ascii=False)

sizes = [len(ps) for d in draft_pools.values() for ps in d.values()]
n_pools = len(sizes)
print(f"draft pools: {n_pools} franchise-decades, "
      f"pool size min/avg/max = {min(sizes)}/{sum(sizes)//n_pools}/{max(sizes)}")
for fr in sorted(draft_pools):
    missing = [str(d) for d in DECADES if str(d) not in draft_pools[fr]]
    if missing:
        print(f"  note: {fr} missing decades: {', '.join(missing)}")

# ---------------------------------------------------------------------------
# Opponents: curated iconic team-seasons + top-8 rotation from the data.
# ---------------------------------------------------------------------------

by_team_season = defaultdict(list)
for r in rows:
    by_team_season[(r["abbr"], r["seasonEnd"])].append(r)

with open(ROOT / "scripts" / "curated_opponents.json", encoding="utf-8") as f:
    curated = json.load(f)["teams"]

opponents = []
for t in curated:
    roster_rows = by_team_season.get((t["abbr"], t["seasonEnd"]), [])
    if not roster_rows:
        print(f"  WARNING: no roster found for {t['label']} ({t['abbr']} {t['seasonEnd']}) — skipped")
        continue
    max_gp = max(r["gp"] for r in roster_rows)
    rotation = [r for r in roster_rows if r["gp"] >= max_gp * 0.45]
    rotation.sort(key=lambda r: -r["mpg"])
    rotation = rotation[:8]
    roster = [{
        "id": slugify(r["name"]),
        "name": r["name"],
        "pos": career_positions.get(r["name"]) or ["SF"],
        "mpg": round(r["mpg"], 1),
        "ppg": round(r["ppg"], 1),
        "rpg": round(r["rpg"], 1),
        "apg": round(r["apg"], 1),
        "spg": round(r["spg"], 1),
        "bpg": round(r["bpg"], 1),
    } for r in rotation]
    opponents.append({
        "id": f"{t['abbr'].lower()}-{t['seasonEnd']}",
        "label": t["label"],
        "city": t["city"],
        "franchise": FRANCHISE_MAP[t["abbr"]],
        "seasonEnd": t["seasonEnd"],
        "wins": t["wins"],
        "losses": t["losses"],
        "weight": t["weight"],
        "identity": t["identity"],
        "roster": roster,
    })

with open(OUT / "opponents.json", "w", encoding="utf-8") as f:
    json.dump(opponents, f, ensure_ascii=False)

print(f"opponents: {len(opponents)} curated team-seasons "
      f"(decades {min(o['seasonEnd'] for o in opponents)}–{max(o['seasonEnd'] for o in opponents)})")
