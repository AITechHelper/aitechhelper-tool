import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  upsertUserEntitlement,
  updateSubscriptionStatus,
  getEntitlementByStripeCustomerId,
} from "@/app/lib/db";
import type { Plan } from "@/app/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkUserId = session.metadata?.clerkUserId;
        const plan = session.metadata?.plan as Plan;

        if (!clerkUserId) {
          console.error("No clerkUserId in checkout session metadata");
          break;
        }

        // Get subscription details
        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subData = subscription as any;

        await upsertUserEntitlement({
          clerkUserId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: "active",
          plan: plan || "monthly",
          currentPeriodEnd: subData.current_period_end ? new Date(subData.current_period_end * 1000) : null,
        });

        console.log(`Subscription activated for user ${clerkUserId}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subObj = subscription as any;
        const status = subObj.status === "active" ? "active" :
                       subObj.status === "past_due" ? "past_due" : "inactive";

        await updateSubscriptionStatus(
          subscription.id,
          status,
          subObj.current_period_end ? new Date(subObj.current_period_end * 1000) : undefined
        );

        console.log(`Subscription ${subscription.id} updated to ${status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await updateSubscriptionStatus(subscription.id, "inactive");

        console.log(`Subscription ${subscription.id} deleted/canceled`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const entitlement = await getEntitlementByStripeCustomerId(customerId);
        if (entitlement?.stripeSubscriptionId) {
          await updateSubscriptionStatus(entitlement.stripeSubscriptionId, "past_due");
        }

        console.log(`Payment failed for customer ${customerId}`);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Webhook handler failed", details: errorMessage },
      { status: 500 }
    );
  }
}
