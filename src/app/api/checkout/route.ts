import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@/lib/server";

export async function POST(req: Request) {
  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = await createClient()
    // const supabase = createServerClient(
    //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
    //   {
    //     cookies: {
    //       get(name: string) {
    //         return cookieStore.get(name)?.value;
    //       },
    //     },
    //   }
    // );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;

    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, subscription_plan")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    if (profile?.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch booking + service details together
    const { data: booking, error: bookingError } = await supabase
      .from("service_bookings")
      .select("id, service_id, customer_id, status, services(name, price)")
      .eq("id", bookingId)
      .single();

    if (bookingError) throw bookingError;

    if (booking?.status !== "AWAITING_PAYMENT") {
      return NextResponse.json(
        { error: "Invalid booking status" },
        { status: 400 }
      );
    }

    const service = Array.isArray(booking.services)
      ? booking.services[0]
      : booking.services;

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Apply discount based on subscription plan
    let discountRate = 0;
    const subscriptionPlan = profile?.subscription_plan;

    switch (subscriptionPlan) {
      case 'BASIC':
        discountRate = 0.10; // 10% discount
        break;
      case 'PREMIUM':
        discountRate = 0.20; // 20% discount
        break;
      case 'ENTERPRISE':
        discountRate = 0.30; // 30% discount
        break;
      default:
        discountRate = 0; // No discount for NONE or PROVIDER
    }

    const originalPrice = service.price;
    const discountedPrice = originalPrice * (1 - discountRate);

    // Build line item dynamically
    const lineItems = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: service.name,
          },
          unit_amount: Math.round(discountedPrice * 100), // convert dollars to cents
        },
        quantity: 1,
      },
    ];

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      success_url: `${baseUrl}/success`,
      cancel_url: `${baseUrl}/cancel`,
      metadata: {
        bookingId: booking.id, // so you can update status later in webhook
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
