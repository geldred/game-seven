import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { RECAP_SYSTEM_PROMPT, buildRecapUserPrompt, type RecapInput } from "@/lib/recap/voice";
import { templateRecap } from "@/lib/recap/template";
import { GAME_SESSION_COOKIE, validGameSession } from "@/lib/auth/game-session";

export const maxDuration = 60;

const RECAP_SCHEMA = {
  type: "object" as const,
  properties: {
    headline: { type: "string" as const, description: "ALL CAPS headline, under 10 words" },
    recap: { type: "string" as const, description: "1-2 paragraph series recap, paragraphs separated by \\n\\n" },
  },
  required: ["headline", "recap"],
  additionalProperties: false as const,
};

export async function POST(request: NextRequest) {
  const password = process.env.GAME_PASSWORD;
  if (!password && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Game Seven is unavailable" }, { status: 503 });
  }
  if (password && !validGameSession(request.cookies.get(GAME_SESSION_COOKIE)?.value, password)) {
    return NextResponse.json({ error: "Sign in to request a recap" }, { status: 401 });
  }

  const input = (await request.json()) as RecapInput;

  if (!password || process.env.ENABLE_PAID_RECAP !== "true" || !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ...templateRecap(input), source: "template" });
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: process.env.RECAP_MODEL || "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: RECAP_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      output_config: {
        format: { type: "json_schema", schema: RECAP_SCHEMA },
      },
      messages: [{ role: "user", content: buildRecapUserPrompt(input) }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("no text block in response");
    const parsed = JSON.parse(textBlock.text) as { headline: string; recap: string };
    return NextResponse.json({ ...parsed, source: "claude" });
  } catch (err) {
    console.error("recap generation failed, falling back to template:", err);
    return NextResponse.json({ ...templateRecap(input), source: "template" });
  }
}
