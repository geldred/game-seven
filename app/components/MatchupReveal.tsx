"use client";

import type { DraftedPlayer, Opponent } from "@/lib/types";
import { FRANCHISES } from "@/lib/franchises";

interface Props {
  user: DraftedPlayer[];
  opponent: Opponent;
  onPlay: () => void;
}

export default function MatchupReveal({ user, opponent, onPlay }: Props) {
  return (
    <div className="max-w-3xl mx-auto px-4 text-center">
      <p className="font-stat text-xs tracking-[0.3em] text-zinc-500 mb-2">YOUR OPPONENT HAS ENTERED THE BUILDING</p>
      <h2 className="font-display text-5xl font-bold text-amber-400 mb-1">{opponent.label}</h2>
      <p className="text-zinc-400 mb-1">
        {opponent.city} · {opponent.wins}–{opponent.losses} that year
      </p>
      <p className="text-zinc-500 italic font-display mb-8">&ldquo;{opponent.identity}&rdquo;</p>

      <div className="grid grid-cols-2 gap-6 text-left mb-8">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="font-stat text-xs tracking-widest text-amber-400 mb-3">YOUR FIVE</h3>
          <ul className="space-y-2">
            {user.map((p) => (
              <li key={p.id} className="flex justify-between text-sm">
                <span>
                  <span className="font-stat text-zinc-500 mr-2">{p.slot}</span>
                  {p.name}
                </span>
                <span className="font-stat text-zinc-400">{p.ppg.toFixed(1)} ppg</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="font-stat text-xs tracking-widest mb-3" style={{ color: FRANCHISES[opponent.franchise]?.color ?? "#999" }}>
            {opponent.label.toUpperCase()} ROTATION
          </h3>
          <ul className="space-y-2">
            {opponent.roster.slice(0, 5).map((p) => (
              <li key={p.id} className="flex justify-between text-sm">
                <span>{p.name}</span>
                <span className="font-stat text-zinc-400">{p.ppg.toFixed(1)} ppg</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button onClick={onPlay}
        className="rounded-md bg-orange-600 hover:bg-orange-500 px-10 py-4 text-lg font-bold tracking-wider text-white">
        PLAY THE SERIES
      </button>
    </div>
  );
}
