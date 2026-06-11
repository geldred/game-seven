"use client";

import type { DraftedPlayer, Position } from "@/lib/types";
import { POSITIONS } from "@/lib/types";

const SLOT_POS: Record<Position, { x: number; y: number }> = {
  C: { x: 38, y: 18 },
  PF: { x: 62, y: 18 },
  SF: { x: 16, y: 50 },
  SG: { x: 84, y: 50 },
  PG: { x: 50, y: 64 },
};

interface Props {
  roster: Partial<Record<Position, DraftedPlayer>>;
  highlight: Position[]; // slots eligible for the currently selected player
  onSlotClick?: (slot: Position) => void;
}

export default function CourtDiagram({ roster, highlight, onSlotClick }: Props) {
  return (
    <div className="relative w-full aspect-[5/4] rounded-lg bg-[#101626] border border-zinc-800 overflow-hidden">
      {/* half-court lines */}
      <svg viewBox="0 0 100 80" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <rect x="30" y="0" width="40" height="22" fill="none" stroke="#2a3550" strokeWidth="0.4" />
        <circle cx="50" cy="22" r="9" fill="none" stroke="#2a3550" strokeWidth="0.4" />
        <path d="M 8 0 A 46 46 0 0 0 92 0" fill="none" stroke="#2a3550" strokeWidth="0.4" transform="translate(0, 0) scale(1, 1.4)" />
        <circle cx="50" cy="4.5" r="2.2" fill="none" stroke="#2a3550" strokeWidth="0.4" />
      </svg>

      {POSITIONS.map((slot) => {
        const player = roster[slot];
        const hot = highlight.includes(slot);
        const { x, y } = SLOT_POS[slot];
        return (
          <button
            key={slot}
            onClick={() => hot && onSlotClick?.(slot)}
            disabled={!hot}
            className={`absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-lg border-2 text-center transition-all
              ${player
                ? "bg-zinc-800 border-zinc-600"
                : hot
                  ? "bg-amber-500/20 border-amber-500 border-dashed cursor-pointer hover:bg-amber-500/40 animate-pulse"
                  : "bg-zinc-900/60 border-zinc-700 border-dashed"}`}
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            {player ? (
              <span className="flex flex-col items-center justify-center leading-tight">
                <span className="font-bold text-sm text-zinc-100">
                  {player.name.split(" ").map((w) => w[0]).join("").slice(0, 3)}
                </span>
                <span className="text-[10px] text-amber-400 font-stat">{slot}</span>
                <span className="text-[9px] text-zinc-500 font-stat">{player.franchise}·{player.decade.slice(2)}s</span>
              </span>
            ) : (
              <span className={`font-stat text-sm ${hot ? "text-amber-400" : "text-zinc-600"}`}>{slot}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
