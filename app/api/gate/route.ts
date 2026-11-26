import { NextResponse } from "next/server";
import { GAME_SESSION_COOKIE, gameSessionToken } from "@/lib/auth/game-session";

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password?: string };
  const expected = process.env.GAME_PASSWORD;

  if (!expected) {
    return process.env.NODE_ENV === "production"
      ? NextResponse.json({ error: "Game Seven is unavailable" }, { status: 503 })
      : NextResponse.json({ ok: true });
  }
  if (password !== expected) {
    return NextResponse.json({ ok: false, error: "Not tonight, chief." }, { status: 401 });
  }

  const token = gameSessionToken(expected);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(GAME_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 90, // 90 days — it's a friend group
    path: "/",
  });
  return res;
}
