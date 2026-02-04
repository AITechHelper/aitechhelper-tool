import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { plan } = body as { plan: "monthly" | "yearly" };

    const priceId =
      plan === "yearly"
        ? process.env.STRIPE_PRICE_ID_YEARLY!
        : process.env.STRIPE_PRICE_ID_MONTHLY!;

    const appUrl = process.env.APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?sub=success`,
      cancel_url: `${appUrl}/subscribe?canceled=1`,
      metadata: {
        clerkUserId: userId,
        plan: plan,
      },
      subscription_data: {
        metadata: {
          clerkUserId: userId,
          plan: plan,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
