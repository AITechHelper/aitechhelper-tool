import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { upsertUserEntitlement } from "@/app/lib/db";

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await upsertUserEntitlement({
      clerkUserId: userId,
      subscriptionStatus: "active",
      plan: "free",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error selecting free plan:", error);
    return NextResponse.json(
      { error: "Failed to activate free plan" },
      { status: 500 }
    );
  }
}
