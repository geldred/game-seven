"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { DraftedPlayer, PoolPlayer, Position } from "@/lib/types";
import { FRANCHISES, DECADE_LABELS } from "@/lib/franchises";
import { eligibleSlots, poolFor, rerollDecade, rerollFranchise, type SpinResult } from "@/lib/game";
import CourtDiagram from "./CourtDiagram";

// On mobile, show 4 players so the court is always visible below without scrolling.
const MOBILE_LIMIT = 4;

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
  const [showAll, setShowAll] = useState(false);

  const taken = useMemo(() => new Set(Object.keys(roster) as Position[]), [roster]);
  const pool = useMemo(() => spin ? poolFor(spin) : [], [spin]);
  const anyFit = pool.some((p) => eligibleSlots(p, taken).length > 0);
  const highlight = selected ? eligibleSlots(selected, taken) : [];

  // Eligible players first — ensures the default 4 visible slots are actionable.
  const sortedPool = useMemo(
    () => [...pool].sort((a, b) =>
      (eligibleSlots(a, taken).length > 0 ? 0 : 1) - (eligibleSlots(b, taken).length > 0 ? 0 : 1)
    ),
    [pool, taken]
  );
  const visiblePool = showAll ? sortedPool : sortedPool.slice(0, MOBILE_LIMIT);
  const hiddenCount = Math.max(0, sortedPool.length - MOBILE_LIMIT);

  // Clear selection + expansion on spin change (re-roll, new round).
  useEffect(() => {
    setSelected(null);
    setShowAll(false);
  }, [spin]);

  function place(slot: Position) {
    if (!selected) return;
    onPlace(selected, slot);
    setSelected(null);
    setShowAll(false);
  }

  const isPlacing = !!selected;

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      {/* Desktop: side-by-side. Mobile: stacked with animated layout. */}
      <div className="md:grid md:grid-cols-2 md:gap-8 flex flex-col gap-3">

        {/* ── Left: spin tiles + player selection ──────────────────── */}
        <div>
          {/* Spin tiles */}
          <div className="flex items-end gap-3 mb-4">
            <SpinTile label="TEAM" value={spin?.franchise ?? "—"} color="#f59e0b"
              spinning={spinning} sub={spin ? (FRANCHISES[spin.franchise]?.name ?? "") : ""} />
            <SpinTile label="ERA" value={spin ? DECADE_LABELS[spin.decade] : "—"} color="#a855f7"
              spinning={spinning} sub="" />
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

          {/* Player list / selected mini-card — swap with animation */}
          <AnimatePresence mode="wait" initial={false}>
            {!spin || spinning ? null : isPlacing ? (

              /* ── Placing mode: selected player mini-card ─────────── */
              <motion.div key="placing"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}>
                <div className="flex items-center gap-3 rounded-md border border-amber-500 bg-amber-500/10 px-3 py-3">
                  <div className="flex-1 min-w-0">
                    <span className="block font-semibold text-sm text-zinc-100">{selected!.name}</span>
                    <span className="block text-[11px] text-sky-400 font-stat">{selected!.pos.join(" · ")}</span>
                  </div>
                  <span className="flex gap-2 font-stat text-xs text-zinc-300 shrink-0">
                    <Stat v={selected!.ppg} l="PPG" />
                    <Stat v={selected!.rpg} l="RPG" />
                    <Stat v={selected!.apg} l="APG" />
                  </span>
                  {/* X to deselect and return to list */}
                  <button
                    onClick={() => setSelected(null)}
                    aria-label="Pick a different player"
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-100 hover:bg-zinc-700/50 transition-colors text-sm font-bold">
                    ✕
                  </button>
                </div>
                {highlight.length === 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-red-400 mt-1.5 font-stat">
                    All his positions are filled — pick someone else.
                  </motion.p>
                )}
              </motion.div>

            ) : (

              /* ── Browse mode: player list ─────────────────────────── */
              <motion.div key="browsing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}>
                <p className="text-xs text-zinc-500 mb-2 font-stat">
                  {pool.length} players available
                  {!anyFit && <span className="text-red-400"> — nobody fits your open slots</span>}
                </p>
                {!anyFit && (
                  <button onClick={onSpin}
                    className="mb-2 rounded-md bg-orange-600 hover:bg-orange-500 px-4 py-1.5 text-sm font-bold text-white">
                    FREE RE-SPIN
                  </button>
                )}
                <ul className="space-y-1.5">
                  {visiblePool.map((p) => {
                    const fits = eligibleSlots(p, taken);
                    const dead = fits.length === 0;
                    return (
                      <li key={p.id}>
                        <button
                          disabled={dead}
                          onClick={() => !dead && setSelected(p)}
                          className={`w-full flex items-center justify-between rounded-md border px-3 py-2.5 text-left transition-colors
                            ${dead
                              ? "opacity-30 cursor-not-allowed border-zinc-800 bg-zinc-900/60"
                              : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 active:border-amber-500/60 active:bg-amber-500/5"
                            }`}>
                          <span>
                            <span className="block font-semibold text-sm">{p.name}</span>
                            <span className="block text-[11px] text-sky-400 font-stat">{p.pos.join(" · ")}</span>
                          </span>
                          <span className="flex gap-2 font-stat text-xs text-zinc-300">
                            <Stat v={p.ppg} l="PPG" />
                            <Stat v={p.rpg} l="RPG" />
                            <Stat v={p.apg} l="APG" />
                            <Stat v={p.spg} l="SPG" est={p.defEstimated} />
                            <Stat v={p.bpg} l="BPG" est={p.defEstimated} />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* Show more / fewer toggle */}
                {hiddenCount > 0 && (
                  <button
                    onClick={() => setShowAll((s) => !s)}
                    className="mt-2 w-full py-2 text-xs font-stat tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors">
                    {showAll ? "▲ SHOW FEWER" : `▼ ${hiddenCount} MORE`}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right: court diagram — slides up when player selected ─── */}
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 380, damping: 34 }}>
          <div className="flex items-center justify-between mb-2">
            <AnimatePresence>
              {isPlacing && highlight.length > 0 && (
                <motion.span key="pick-hint"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ delay: 0.08 }}
                  className="font-stat text-[11px] text-amber-400 tracking-widest">
                  PICK A SLOT FOR {selected!.name.split(" ").pop()!.toUpperCase()}
                </motion.span>
              )}
            </AnimatePresence>
            <p className="font-stat text-xs text-zinc-500 ml-auto">ROUND {round}/5</p>
          </div>
          <CourtDiagram roster={roster} highlight={highlight} onSlotClick={place} />
        </motion.div>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SpinTile({ label, value, sub, color, spinning }: {
  label: string; value: string; sub?: string; color: string; spinning: boolean;
}) {
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
