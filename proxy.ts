import { NextRequest, NextResponse } from "next/server";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function proxy(request: NextRequest) {
  const password = process.env.GAME_PASSWORD;
  // No password configured (local dev) — open door.
  if (!password) return NextResponse.next();

  const cookie = request.cookies.get("g7_auth")?.value;
  const expected = await sha256Hex(password);
  if (cookie === expected) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/gate") || request.nextUrl.pathname.startsWith("/api/gate")) {
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
