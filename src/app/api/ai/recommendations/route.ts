import { NextResponse } from "next/server";
import { ensureDbUser } from "@/lib/auth";
import { getAiRecommendations, dismissAiRecommendation, computeAiRecommendations } from "@/services/recommendationEngine";

export async function GET() {
  try {
    const dbUser = await ensureDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const recommendations = await getAiRecommendations(dbUser.id);
    return NextResponse.json({ success: true, recommendations });
  } catch (error: any) {
    console.error("AI Recommendations GET error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const dbUser = await ensureDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { recommendationId, action } = await req.json();

    if (action === "dismiss" && recommendationId) {
      const res = await dismissAiRecommendation(dbUser.id, recommendationId);
      return NextResponse.json(res);
    }

    if (action === "recompute") {
      const recs = await computeAiRecommendations(dbUser.id);
      return NextResponse.json({ success: true, recommendations: recs });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("AI Recommendations POST error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
