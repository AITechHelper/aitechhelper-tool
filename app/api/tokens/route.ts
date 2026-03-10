import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getTokenStatus } from "../../lib/tokens";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getTokenStatus(userId);

    return NextResponse.json({
      tokensUsed: status.used,
      tokensRemaining: status.remaining,
      totalMonthlyTokens: status.allowance,
      plan: status.plan, // null = never selected any plan; "free" | "basic" | "pro" | "premium" otherwise
    });
  } catch (error) {
    console.error("Error fetching token balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch token balance" },
      { status: 500 }
    );
  }
}
