"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GatePage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({ error: "Try again." }));
      setError(data.error ?? "Try again.");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      <h1 className="font-display text-5xl font-bold tracking-tight text-amber-400">GAME SEVEN</h1>
      <p className="text-zinc-400 text-sm">Friends and family only. You know the word.</p>
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="rounded-md bg-zinc-900 border border-zinc-700 px-4 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          disabled={busy || !password}
          className="rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-50 px-5 py-2 font-semibold text-zinc-950"
        >
          {busy ? "Checking the tape..." : "Enter"}
        </button>
      </form>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </main>
  );
}
