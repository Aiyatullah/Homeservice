import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/server";

export async function POST(req: Request) {
  try {
    const { planId } = await req.json();
    if (!planId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user) throw new Error("User not found");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    // Map planId to Stripe Price IDs (from your Stripe dashboard)
    const priceMap: Record<string, string> = {
      basic: process.env.STRIPE_CUSTOMER_BASIC_PRICE_ID!,
      premium: process.env.STRIPE_CUSTOMER_PREMIUM_PRICE_ID!,
      enterprise: process.env.STRIPE_CUSTOMER_ENTERPRISE_PRICE_ID!,
      provider: process.env.STRIPE_PROVIDER_PRICE_ID!,
    };

    const priceId = priceMap[planId];
    if (!priceId) {
      return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
    }

    // Create checkout session for subscription
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id, // so webhook knows who subscribed
        planId, // so webhook knows which plan
      },
      customer_email: user.email ?? undefined,
      success_url: `${baseUrl}/subscription/success`,
      cancel_url: `${baseUrl}/subscription/cancel`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: any) {
    console.error("Stripe subscription error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
