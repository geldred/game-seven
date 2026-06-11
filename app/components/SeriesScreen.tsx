"use client";

import { useEffect, useMemo, useState } from "react";
import type { DraftedPlayer, Opponent, SeriesResult } from "@/lib/types";
import { FRANCHISES, DECADE_LABELS } from "@/lib/franchises";

interface KeyPlayImage {
  url: string;
  caption: string;
  provider: "placeholder" | "gpt-image" | "flux";
}

interface Props {
  user: DraftedPlayer[];
  opponent: Opponent;
  result: SeriesResult;
  onRunItBack: () => void;
}

interface Recap {
  headline: string;
  recap: string;
  source: "claude" | "template";
}

export default function SeriesScreen({ user, opponent, result, onRunItBack }: Props) {
  const [revealed, setRevealed] = useState(0);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [images, setImages] = useState<(KeyPlayImage | null)[]>([null, null, null]);
  const done = revealed >= result.games.length;

  // Reveal the ladder one game at a time.
  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 700);
    return () => clearTimeout(t);
  }, [revealed, done]);

  // Once the ladder is out, fetch the recap and render key-play images.
  useEffect(() => {
    if (!done) return;
    fetch("/api/recap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, opponent, result }),
    })
      .then((r) => r.json())
      .then(setRecap)
      .catch(() => setRecap(null));

    // Each image lands as it finishes — gpt-image generations take 20-60s,
    // so the cards fill in one by one instead of waiting for the slowest.
    result.keyPlays.forEach((play, i) => {
      const side = play.side === "user"
        ? user.find((p) => p.id === play.playerId)
        : opponent.roster.find((p) => p.id === play.playerId);
      const uniform = play.side === "user" && side && "franchise" in side
        ? `${DECADE_LABELS[(side as DraftedPlayer).decade]} ${FRANCHISES[(side as DraftedPlayer).franchise]?.name ?? ""} uniform`
        : `${opponent.seasonEnd} ${opponent.city} ${FRANCHISES[opponent.franchise]?.name ?? ""} uniform`;
      fetch("/api/keyplay-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          play,
          uniformContext: uniform,
          opponentContext: play.side === "user" ? `the ${opponent.label}` : "the All-Timers",
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((img: KeyPlayImage | null) => {
          if (img) setImages((prev) => prev.map((p, j) => (j === i ? img : p)));
        })
        .catch(() => {});
    });
  }, [done, user, opponent, result]);

  const userLabel = "ALL-TIMERS";
  const finalLine = `${Math.max(result.userWins, result.oppWins)}–${Math.min(result.userWins, result.oppWins)}`;

  const boxUser = useMemo(() => result.statLines.filter((s) => s.side === "user"), [result]);
  const boxOpp = useMemo(() => result.statLines.filter((s) => s.side === "opp"), [result]);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20">
      {/* ladder */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {result.games.slice(0, revealed).map((g) => (
          <div key={g.game} className={`slide-in rounded-lg border px-4 py-3 text-center min-w-24
            ${g.userWin ? "border-emerald-700 bg-emerald-950/40" : "border-red-800 bg-red-950/30"}`}>
            <div className="font-stat text-[10px] text-zinc-500">GAME {g.game}{g.home === "user" ? " · HOME" : " · AWAY"}</div>
            <div className="font-display text-xl font-bold">
              {g.userScore}–{g.oppScore}
            </div>
            <div className={`font-stat text-[10px] ${g.userWin ? "text-emerald-400" : "text-red-400"}`}>
              {g.userWin ? "W" : "L"}{g.tags.includes("OT") ? " · OT" : ""}{g.tags.includes("BLOWOUT") ? " · ROUT" : ""}
            </div>
            {g.eruption && (
              <div className="font-stat text-[9px] text-amber-400 mt-0.5">{g.eruption.playerName.split(" ").slice(-1)[0]} {g.eruption.points} PTS</div>
            )}
          </div>
        ))}
      </div>

      {done && (
        <div className="slide-in">
          {/* verdict */}
          <div className="text-center mb-10">
            <p className="font-stat text-xs tracking-[0.3em] text-zinc-500 mb-2">FINAL</p>
            <h2 className={`font-display text-5xl font-bold ${result.userWon ? "text-emerald-400" : "text-red-400"}`}>
              {result.userWon ? userLabel : opponent.label.toUpperCase()} WIN, {finalLine}
            </h2>
          </div>

          {/* recap — the morning paper */}
          <div className="halftone rounded-lg border border-zinc-700 bg-[#11141d] p-6 md:p-8 mb-10">
            {recap ? (
              <>
                <h3 className="font-display text-3xl font-bold leading-tight mb-1">{recap.headline}</h3>
                <p className="font-stat text-[10px] text-zinc-500 mb-4">
                  THE MORNING TRIBUNE · SPORTS SECTION{recap.source === "template" ? " · WIRE COPY" : ""}
                </p>
                {recap.recap.split("\n\n").map((para, i) => (
                  <p key={i} className="font-display text-zinc-300 leading-relaxed mb-3">{para}</p>
                ))}
              </>
            ) : (
              <p className="font-stat text-sm text-zinc-500 animate-pulse">The beat writer is typing…</p>
            )}
          </div>

          {/* key plays */}
          <h3 className="font-stat text-xs tracking-[0.3em] text-zinc-500 mb-3">THREE PLAYS YOU&apos;LL BE TALKING ABOUT TOMORROW</h3>
          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {result.keyPlays.map((play, i) => (
              <figure key={play.kind} className="rounded-lg border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                {images[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={images[i]!.url} alt={play.description} className="w-full aspect-[4/3] object-cover" />
                ) : (
                  <div className="w-full aspect-[4/3] bg-zinc-800 animate-pulse flex items-center justify-center">
                    <span className="font-stat text-[10px] tracking-[0.25em] text-zinc-600">DEVELOPING THE PHOTO…</span>
                  </div>
                )}
                <figcaption className="p-3">
                  <div className="font-stat text-[10px] text-amber-400 mb-1">{play.title.toUpperCase()} · GAME {play.game}</div>
                  <p className="text-xs text-zinc-400 leading-snug">{play.description}</p>
                </figcaption>
              </figure>
            ))}
          </div>

          {/* box score */}
          <h3 className="font-stat text-xs tracking-[0.3em] text-zinc-500 mb-3">SERIES BOX SCORE</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-12">
            <BoxTable title="ALL-TIMERS" rows={boxUser} accent="#f59e0b" />
            <BoxTable title={opponent.label.toUpperCase()} rows={boxOpp} accent={FRANCHISES[opponent.franchise]?.color ?? "#999"} />
          </div>

          <div className="text-center">
            <button onClick={onRunItBack}
              className="rounded-md bg-orange-600 hover:bg-orange-500 px-10 py-4 text-lg font-bold tracking-wider text-white">
              RUN IT BACK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BoxTable({ title, rows, accent }: { title: string; rows: { playerId: string; name: string; ppg: number; rpg: number; apg: number }[]; accent: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <h4 className="font-stat text-xs tracking-widest mb-2" style={{ color: accent }}>{title}</h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="font-stat text-[10px] text-zinc-600">
            <th className="text-left font-normal">PLAYER</th>
            <th className="text-right font-normal">PPG</th>
            <th className="text-right font-normal">RPG</th>
            <th className="text-right font-normal">APG</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.playerId} className="border-t border-zinc-800/60">
              <td className="py-1.5">{r.name}</td>
              <td className="text-right font-stat">{r.ppg.toFixed(1)}</td>
              <td className="text-right font-stat">{r.rpg.toFixed(1)}</td>
              <td className="text-right font-stat">{r.apg.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
