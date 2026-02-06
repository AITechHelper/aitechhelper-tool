import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  getTokenKey,
  getDefaultTokenData,
  resetTokensIfNewMonth,
  calculateRemainingTokens,
  type TokenData,
} from "../../lib/tokens";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get token data from localStorage-like storage
    // For now, we'll use a simple in-memory store
    // In production, this would be a database
    const tokenKey = getTokenKey(userId);

    let tokenData: TokenData;

    // Try to get from local storage (browser side will handle this)
    // For server-side, we'll start with defaults
    try {
      const stored = globalThis.localStorage?.getItem(tokenKey);
      tokenData = stored ? JSON.parse(stored) : getDefaultTokenData();
    } catch {
      tokenData = getDefaultTokenData();
    }

    // Reset tokens if it's a new month
    const resetData = resetTokensIfNewMonth(tokenData);

    // Save back if reset occurred
    if (resetData.tokenMonth !== tokenData.tokenMonth) {
      try {
        globalThis.localStorage?.setItem(tokenKey, JSON.stringify(resetData));
      } catch {
        // Ignore localStorage errors on server
      }
    }

    const remainingTokens = calculateRemainingTokens(resetData);

    return NextResponse.json({
      tokensUsed: resetData.tokensUsedThisMonth,
      tokensRemaining: remainingTokens,
      totalMonthlyTokens: resetData.totalMonthlyTokens,
      currentMonth: resetData.tokenMonth,
    });
  } catch (error) {
    console.error("Error fetching token balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch token balance" },
      { status: 500 }
    );
  }
}
