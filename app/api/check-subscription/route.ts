import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserEntitlement, upsertUserEntitlement } from "@/app/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ status: "unauthenticated" }, { status: 401 });
    }

    let entitlement = await getUserEntitlement(userId);

    // Brand new user — send them to onboarding to pick a plan
    if (!entitlement) {
      return NextResponse.json({ status: "new" });
    }

    // If subscription is inactive/cancelled, downgrade to free instead of blocking
    if (!entitlement || entitlement.subscriptionStatus !== "active") {
      await upsertUserEntitlement({
        clerkUserId: userId,
        subscriptionStatus: "active",
        plan: "free",
      });
      entitlement = await getUserEntitlement(userId);
    }

    if (!entitlement) {
      return NextResponse.json({ status: "error", message: "Failed to create entitlement" }, { status: 500 });
    }

    return NextResponse.json({
      status: "active",
      plan: entitlement.plan,
      currentPeriodEnd: entitlement.currentPeriodEnd,
    });
  } catch (error) {
    console.error("Error checking subscription:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to check subscription" },
      { status: 500 }
    );
  }
}
