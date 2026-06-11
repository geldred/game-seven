import { NextResponse } from "next/server";
import { createHash } from "crypto";

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password?: string };
  const expected = process.env.GAME_PASSWORD;

  if (!expected) {
    return NextResponse.json({ ok: true }); // no gate configured
  }
  if (password !== expected) {
    return NextResponse.json({ ok: false, error: "Not tonight, chief." }, { status: 401 });
  }

  const token = createHash("sha256").update(expected).digest("hex");
  const res = NextResponse.json({ ok: true });
  res.cookies.set("g7_auth", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 90, // 90 days — it's a friend group
    path: "/",
  });
  return res;
}
