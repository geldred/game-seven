import { NextResponse } from "next/server";
import { generateKeyPlayImage, type KeyPlayImageRequest } from "@/lib/imagegen";

// gpt-image generations run 20-60s; needs Vercel Pro (Hobby hard-caps at 10s).
export const maxDuration = 60;

export async function POST(request: Request) {
  const req = (await request.json()) as KeyPlayImageRequest;
  if (!req?.play?.playerName) {
    return NextResponse.json({ error: "missing play" }, { status: 400 });
  }
  const image = await generateKeyPlayImage(req);
  return NextResponse.json(image);
}
