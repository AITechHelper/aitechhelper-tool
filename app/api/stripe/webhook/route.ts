import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  upsertUserEntitlement,
  updateSubscriptionStatus,
  getEntitlementByStripeCustomerId,
} from "@/app/lib/db";
import type { Plan } from "@/app/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function planFromPriceId(priceId: string): Plan {
  if (priceId === process.env.STRIPE_PRICE_BASIC) return "basic";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_PREMIUM) return "premium";
  // Unknown price — default to pro
  return "pro";
}

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

        if (!clerkUserId) {
          console.error("No clerkUserId in checkout session metadata");
          break;
        }

        // Get subscription details
        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subData = subscription as any;

        // Derive plan from Stripe price ID
        const priceId = subData.items?.data?.[0]?.price?.id ?? "";
        const plan = planFromPriceId(priceId);

        await upsertUserEntitlement({
          clerkUserId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: "active",
          plan,
          currentPeriodEnd: subData.current_period_end ? new Date(subData.current_period_end * 1000) : null,
        });

        console.log(`Subscription activated for user ${clerkUserId}, plan=${plan}, priceId=${priceId}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subObj = subscription as any;
        const status = subObj.status === "active" ? "active" :
                       subObj.status === "past_due" ? "past_due" : "inactive";

        // Re-derive plan in case of upgrade/downgrade
        const updatedPriceId = subObj.items?.data?.[0]?.price?.id ?? "";
        const updatedPlan = planFromPriceId(updatedPriceId);

        // Update status AND plan
        const customerId = subObj.customer as string;
        const entitlement = await getEntitlementByStripeCustomerId(customerId);
        if (entitlement) {
          await upsertUserEntitlement({
            clerkUserId: entitlement.clerkUserId,
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: status,
            plan: updatedPlan,
            currentPeriodEnd: subObj.current_period_end ? new Date(subObj.current_period_end * 1000) : undefined,
          });
        } else {
          await updateSubscriptionStatus(
            subscription.id,
            status,
            subObj.current_period_end ? new Date(subObj.current_period_end * 1000) : undefined
          );
        }

        console.log(`Subscription ${subscription.id} updated to ${status}, plan=${updatedPlan}`);
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
