import { NextResponse } from "next/server";
import { getTreasury, getVendors, getRequests, getHistory, getWindow, getBlocked } from "@/lib/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const vendors = await getVendors();
    const [treasury, requests, history, window] = await Promise.all([getTreasury(), getRequests(vendors), getHistory(vendors), getWindow()]);
    return NextResponse.json({ treasury, vendors, requests, history, window, blocked: getBlocked() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
