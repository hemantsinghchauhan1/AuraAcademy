import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    
    const cronSecret = process.env.CRON_SECRET;
    const isDev = process.env.NODE_ENV === "development";

    // Secure validation: strictly enforce CRON_SECRET checks on production Vercel servers
    if (!isDev && authHeader !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized cron request", { status: 401 });
    }

    // Daily Missions Reset:
    // By purging UserMission logs, the learning platform will dynamically seed/recreate fresh
    // daily quests on each student's next workspace load.
    const resetLogs = await db.userMission.deleteMany({});
    
    console.log(`[Vercel Cron Reset] Purged ${resetLogs.count} student quest rows at midnight.`);

    return NextResponse.json({
      success: true,
      message: "Daily missions successfully reset",
      purgedCount: resetLogs.count
    });
  } catch (error: any) {
    console.error("[Cron Reset Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
