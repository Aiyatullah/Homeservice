import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/server";

export const runtime = "nodejs"; // ensure Node.js runtime (not edge)

export async function POST(req: Request) {
  const body = await req.text(); // raw body required
  const sig = req.headers.get("stripe-signature") as string;

  try {
    // Verify event with Stripe
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;

      // ---------------------------
      // 1) Service Booking Payments
      // ---------------------------
      const bookingId = session.metadata?.bookingId;
      if (bookingId) {
        const supabase = await createClient();

        const { error } = await supabase
          .from("service_bookings")
          .update({ status: "ACCEPTED" })
          .eq("id", bookingId);

        if (error) {
          console.error("❌ Supabase update error (booking):", error);
        } else {
          console.log(`✅ Booking ${bookingId} marked as ACCEPTED`);
        }
      }

      // ---------------------------
      // 2) Subscription Payments
      // ---------------------------
      const userId = session.metadata?.userId;
      const planId = session.metadata?.planId; // e.g. "basic", "premium", "enterprise", "provider"

      if (userId && planId) {
        const supabase = await createClient();

        const planMap: Record<string, string> = {
          basic: "BASIC",
          premium: "PREMIUM",
          enterprise: "ENTERPRISE",
          provider: "PROVIDER",
        };

        const newPlan = planMap[planId] ?? "NONE";

        const { error } = await supabase
          .from("profiles")
          .update({ subscription_plan: newPlan })
          .eq("id", userId);

        if (error) {
          console.error("❌ Supabase update error (subscription):", error);
        } else {
          console.log(`✅ User ${userId} subscribed to ${newPlan}`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook Error:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }
}
