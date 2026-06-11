"use client";

import { useCallback, useRef, useState } from "react";
import type { DraftedPlayer, Opponent, PoolPlayer, Position, SeriesResult } from "@/lib/types";
import { pickOpponent, randomSeed, randomSpin, type SpinResult } from "@/lib/game";
import { simulateSeries } from "@/lib/sim/series";
import DraftScreen from "./components/DraftScreen";
import MatchupReveal from "./components/MatchupReveal";
import SeriesScreen from "./components/SeriesScreen";

type Phase = "intro" | "draft" | "matchup" | "series";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState(1);
  const [roster, setRoster] = useState<Partial<Record<Position, DraftedPlayer>>>({});
  const [spin, setSpin] = useState<SpinResult | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rerolls, setRerolls] = useState({ team: 2, era: 2 });
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [result, setResult] = useState<SeriesResult | null>(null);
  const spinTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const doSpin = useCallback(() => {
    // A second spin (double-click, free re-spin) must kill the previous
    // animation, and completion is judged by elapsed time rather than tick
    // count — browsers throttle timers in background tabs, and counting ticks
    // would strand `spinning` until the tab comes back to the foreground.
    if (spinTimer.current) clearInterval(spinTimer.current);
    setSpinning(true);
    setSpin(randomSpin());
    const started = Date.now();
    const id = setInterval(() => {
      setSpin(randomSpin());
      if (Date.now() - started >= 1200) {
        clearInterval(id);
        if (spinTimer.current === id) spinTimer.current = null;
        setSpinning(false);
      }
    }, 120);
    spinTimer.current = id;
  }, []);

  function startGame() {
    setRoster({});
    setRound(1);
    setSpin(null);
    setRerolls({ team: 2, era: 2 });
    setOpponent(null);
    setResult(null);
    setPhase("draft");
  }

  function handleReroll(next: SpinResult, kind: "team" | "era") {
    setRerolls((r) => ({ ...r, [kind]: r[kind] - 1 }));
    setSpin(next);
  }

  function handlePlace(player: PoolPlayer, slot: Position) {
    if (!spin) return;
    const drafted: DraftedPlayer = { ...player, franchise: spin.franchise, decade: spin.decade, slot };
    const nextRoster = { ...roster, [slot]: drafted };
    setRoster(nextRoster);
    setSpin(null);

    if (round >= 5) {
      const opp = pickOpponent();
      setOpponent(opp);
      setPhase("matchup");
    } else {
      setRound((r) => r + 1);
    }
  }

  function playSeries() {
    if (!opponent) return;
    const five = Object.values(roster) as DraftedPlayer[];
    setResult(simulateSeries({ user: five, opponent, seed: randomSeed() }));
    setPhase("series");
  }

  const five = Object.values(roster) as DraftedPlayer[];

  return (
    <main className="flex-1 py-8">
      <header className="text-center mb-8">
        <h1 className="font-display text-4xl font-bold tracking-tight">
          <span className="text-amber-400">GAME</span> SEVEN
        </h1>
        <p className="font-stat text-[11px] tracking-[0.25em] text-zinc-500 mt-1">
          DRAFT YOUR FIVE. SURVIVE THE SERIES.
        </p>
      </header>

      {phase === "intro" && (
        <div className="max-w-xl mx-auto px-4 text-center">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-8 mb-6 text-left">
            <h2 className="font-display text-2xl font-bold mb-4 text-center">How It Works</h2>
            <ol className="space-y-3 text-sm text-zinc-300">
              <li><span className="font-stat text-amber-400 mr-2">1.</span>Spin for a random franchise and decade, five rounds. Pick one player each round and put him at a position he actually played.</li>
              <li><span className="font-stat text-amber-400 mr-2">2.</span>Then the schedule comes out — you draw a real team from NBA history. The &rsquo;96 Bulls are in the pool. So are worse fates.</li>
              <li><span className="font-stat text-amber-400 mr-2">3.</span>Best of seven. Box score, three key plays, and the morning paper write-up. Settle the argument.</li>
            </ol>
            <p className="text-[11px] text-zinc-600 mt-4 font-stat">* Steals and blocks before 1974 are estimated. Fairly. Mostly.</p>
          </div>
          <button onClick={startGame}
            className="rounded-md bg-orange-600 hover:bg-orange-500 px-10 py-4 text-lg font-bold tracking-wider text-white">
            START THE DRAFT
          </button>
        </div>
      )}

      {phase === "draft" && (
        <DraftScreen
          round={round}
          spin={spin}
          spinning={spinning}
          roster={roster}
          rerolls={rerolls}
          onSpin={doSpin}
          onReroll={handleReroll}
          onPlace={handlePlace}
        />
      )}

      {phase === "matchup" && opponent && (
        <MatchupReveal user={five} opponent={opponent} onPlay={playSeries} />
      )}

      {phase === "series" && opponent && result && (
        <SeriesScreen user={five} opponent={opponent} result={result} onRunItBack={startGame} />
      )}

      <footer className="mt-16 text-center text-[10px] text-zinc-700 font-stat px-4">
        A private fan project. Not affiliated with, endorsed by, or sponsored by the NBA. Inspired by 82-0.com.
      </footer>
    </main>
  );
}
