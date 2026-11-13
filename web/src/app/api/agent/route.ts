import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { runAgent } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const { history, message } = (await req.json()) as { history?: Anthropic.MessageParam[]; message?: string };
  if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set on the server" }, { status: 500 });
  try {
    const out = await runAgent(history ?? [], message);
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
