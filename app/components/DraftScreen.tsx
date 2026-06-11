"use client";

import { useMemo, useState } from "react";
import type { DraftedPlayer, PoolPlayer, Position } from "@/lib/types";
import { FRANCHISES, DECADE_LABELS } from "@/lib/franchises";
import { eligibleSlots, poolFor, rerollDecade, rerollFranchise, type SpinResult } from "@/lib/game";
import CourtDiagram from "./CourtDiagram";

interface Props {
  round: number;
  spin: SpinResult | null;
  spinning: boolean;
  roster: Partial<Record<Position, DraftedPlayer>>;
  rerolls: { team: number; era: number };
  onSpin: () => void;
  onReroll: (next: SpinResult, kind: "team" | "era") => void;
  onPlace: (player: PoolPlayer, slot: Position) => void;
}

export default function DraftScreen({ round, spin, spinning, roster, rerolls, onSpin, onReroll, onPlace }: Props) {
  const [selected, setSelected] = useState<PoolPlayer | null>(null);
  const taken = useMemo(() => new Set(Object.keys(roster) as Position[]), [roster]);
  const pool = spin ? poolFor(spin) : [];
  const anyFit = pool.some((p) => eligibleSlots(p, taken).length > 0);
  const highlight = selected ? eligibleSlots(selected, taken) : [];

  function place(slot: Position) {
    if (!selected) return;
    onPlace(selected, slot);
    setSelected(null);
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 w-full max-w-6xl mx-auto px-4">
      {/* left: spin + pool */}
      <div>
        <div className="flex items-end gap-4 mb-4">
          <SpinTile label="TEAM" value={spin ? spin.franchise : "—"} color="#f59e0b" spinning={spinning}
            sub={spin ? FRANCHISES[spin.franchise]?.name : ""} />
          <SpinTile label="ERA" value={spin ? DECADE_LABELS[spin.decade] : "—"} color="#a855f7" spinning={spinning} sub="" />
          {!spin && !spinning && (
            <button onClick={onSpin}
              className="rounded-md bg-orange-600 hover:bg-orange-500 px-8 py-3 font-bold tracking-wider text-white">
              SPIN
            </button>
          )}
          {spin && !spinning && (
            <div className="flex flex-col gap-1 text-xs">
              <button disabled={rerolls.team <= 0} onClick={() => onReroll(rerollFranchise(spin), "team")}
                className="rounded border border-amber-600/60 text-amber-400 px-2 py-1 disabled:opacity-30 hover:bg-amber-500/10">
                ↻ Team ({rerolls.team})
              </button>
              <button disabled={rerolls.era <= 0} onClick={() => onReroll(rerollDecade(spin), "era")}
                className="rounded border border-purple-600/60 text-purple-400 px-2 py-1 disabled:opacity-30 hover:bg-purple-500/10">
                ↻ Era ({rerolls.era})
              </button>
            </div>
          )}
        </div>

        {spin && !spinning && (
          <>
            <p className="text-xs text-zinc-500 mb-2 font-stat">
              {pool.length} players available
              {selected && <span className="text-amber-400"> — placing {selected.name}: pick a glowing slot</span>}
              {!anyFit && <span className="text-red-400"> — nobody fits your open slots. Spin again, no charge.</span>}
            </p>
            {!anyFit && (
              <button onClick={onSpin} className="mb-2 rounded-md bg-orange-600 hover:bg-orange-500 px-4 py-1.5 text-sm font-bold text-white">
                FREE RE-SPIN
              </button>
            )}
            <ul className="space-y-1.5 max-h-[26rem] overflow-y-auto pr-1">
              {pool.map((p) => {
                const fits = eligibleSlots(p, taken);
                const dead = fits.length === 0;
                return (
                  <li key={p.id}>
                    <button
                      disabled={dead}
                      onClick={() => setSelected(selected?.id === p.id ? null : p)}
                      className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors
                        ${selected?.id === p.id ? "border-amber-500 bg-amber-500/10" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"}
                        ${dead ? "opacity-35 cursor-not-allowed" : ""}`}
                    >
                      <span>
                        <span className="block font-semibold text-sm">{p.name}</span>
                        <span className="block text-[11px] text-sky-400 font-stat">{p.pos.join(" · ")}</span>
                      </span>
                      <span className="flex gap-3 font-stat text-xs text-zinc-300">
                        <Stat v={p.ppg} l="PPG" /><Stat v={p.rpg} l="RPG" /><Stat v={p.apg} l="APG" />
                        <Stat v={p.spg} l="SPG" est={p.defEstimated} /><Stat v={p.bpg} l="BPG" est={p.defEstimated} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* right: court */}
      <div>
        <p className="font-stat text-xs text-zinc-500 mb-2 text-right">ROUND {round}/5</p>
        <CourtDiagram roster={roster} highlight={highlight} onSlotClick={place} />
        {selected && highlight.length === 0 && (
          <p className="text-xs text-red-400 mt-2">His positions are all filled. Pick someone else.</p>
        )}
      </div>
    </div>
  );
}

function SpinTile({ label, value, sub, color, spinning }: { label: string; value: string; sub?: string; color: string; spinning: boolean }) {
  return (
    <div className="rounded-lg border-2 px-6 py-3 text-center min-w-28" style={{ borderColor: color }}>
      <div className="text-[10px] font-stat tracking-widest" style={{ color }}>{label}</div>
      <div key={value + String(spinning)} className={`font-display text-3xl font-bold ${spinning ? "spinflash" : ""}`}>
        {value}
      </div>
      {sub ? <div className="text-[10px] text-zinc-500">{sub}</div> : null}
    </div>
  );
}

function Stat({ v, l, est }: { v: number; l: string; est?: boolean }) {
  return (
    <span className="text-center w-9">
      <span className="block font-bold">{v.toFixed(1)}{est ? "*" : ""}</span>
      <span className="block text-[9px] text-zinc-600">{l}</span>
    </span>
  );
}
