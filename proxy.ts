import { NextRequest, NextResponse } from "next/server";

import { GAME_SESSION_COOKIE, validGameSession } from "@/lib/auth/game-session";

export async function proxy(request: NextRequest) {
  const password = process.env.GAME_PASSWORD;
  if (!password) {
    return process.env.NODE_ENV === "production"
      ? NextResponse.json({ error: "Game Seven is unavailable" }, { status: 503 })
      : NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  if (pathname === "/gate" || pathname === "/api/gate") return NextResponse.next();

  if (validGameSession(request.cookies.get(GAME_SESSION_COOKIE)?.value, password)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/gate";
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
