import { NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { stripe } from "@/libs/stripe";
import { upsertPriceRecord, upsertProductRecord, manageSubscriptionStatusChange } from "@/libs/supabaseAdmin";

const relevantEvents = new Set([
  "product.created",
  "product.updated",
  "price.created",
  "price.updated",
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.deleted",
  "customer.subscription.updated",
]);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("Stripe-Signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) return;
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: any) {
    console.log(error.message);
    return new NextResponse(error.message, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case "product.created":
        case "product.updated":
          await upsertProductRecord(event.data.object as Stripe.Product);
          break;

        case "price.created":
        case "price.updated":
          await upsertPriceRecord(event.data.object as Stripe.Price);
          break;

        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          const subscription = event.data.object as Stripe.Subscription;
          await manageSubscriptionStatusChange(
            subscription.id,
            subscription.customer as string,
            event.type === "customer.subscription.created"
          );
          break;

        case "checkout.session.completed":
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
          if (checkoutSession.mode === "subscription") {
            const subscriptionId = checkoutSession.subscription;
            await manageSubscriptionStatusChange(subscriptionId as string, checkoutSession.customer as string, true);
          }
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
          throw new Error("Unhandled relevant event.");
      }
    } catch (error: any) {
      console.log(error);
      return new NextResponse(error.message, { status: 400 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
