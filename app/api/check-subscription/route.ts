import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserEntitlement } from "@/app/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ status: "unauthenticated" }, { status: 401 });
    }

    const entitlement = await getUserEntitlement(userId);

    if (!entitlement || entitlement.subscriptionStatus !== "active") {
      return NextResponse.json({ status: "inactive" });
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
