import { createHash, timingSafeEqual } from "node:crypto";

export const GAME_SESSION_COOKIE = "g7_auth";

export function gameSessionToken(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function validGameSession(cookie: string | undefined, password: string): boolean {
  if (!cookie || !/^[0-9a-f]{64}$/.test(cookie)) return false;
  return timingSafeEqual(Buffer.from(cookie, "hex"), Buffer.from(gameSessionToken(password), "hex"));
}
