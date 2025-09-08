"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/client";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
interface Booking {
  id: string;
  service_id: string;
  provider_id: string;
  status: string;
  service: {
    name: string;
    price: number;
    description: string;
  } | null;
  provider: {
    full_name: string;
  } | null;
}

export default function PayServicesPage() {
  const supabase = createClient();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userSubscriptionPlan, setUserSubscriptionPlan] = useState<string>('NONE');

  useEffect(() => {
    const checkAuthAndFetchBookings = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        if (!user) {
          router.push("/login");
          return;
        }

        // Check user role and subscription plan
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, subscription_plan")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        if (profile?.role !== "customer") {
          router.push("/dashboard");
          return;
        }

        setUser(user);
        setUserRole(profile.role);
        setUserSubscriptionPlan(profile.subscription_plan || 'NONE');

        // Fetch pending payments
        await fetchPendingPayments(user.id);
      } catch (error) {
        console.error("Auth error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchBookings();

    // Set up real-time subscription for payment status changes
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const channel = supabase
          .channel("pay-services-updates")
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "service_bookings",
              filter: `customer_id=eq.${user.id}`,
            },
            async (payload) => {
              // Refresh bookings when status changes
              await fetchPendingPayments(user.id);
            }
          )
          .subscribe();
      }
    };

    setupRealtimeSubscription();
  }, []);

  const fetchPendingPayments = async (userId: string) => {
    try {
      const { data: pendingBookings, error } = await supabase
        .from("service_bookings")
        .select(`
          id,
          service_id,
          provider_id,
          status,
          service:service_id(name, price, description),
          provider:provider_id(full_name)
        `)
        .eq("customer_id", userId)
        .eq("status", "AWAITING_PAYMENT");

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setBookings(pendingBookings as any || []);
    } catch (error) {
      console.error("Error fetching pending payments:", error);
    }
  };


  const getDiscountRate = (subscriptionPlan: string): number => {
    switch (subscriptionPlan) {
      case 'BASIC':
        return 0.10; // 10% discount
      case 'PREMIUM':
        return 0.20; // 20% discount
      case 'ENTERPRISE':
        return 0.30; // 30% discount
      default:
        return 0; // No discount for NONE or PROVIDER
    }
  };

  const getDiscountedPrice = (originalPrice: number): number => {
    const discount = getDiscountRate(userSubscriptionPlan);
    return originalPrice * (1 - discount);
  };

  const getTotalAmount = (): number => {
    return bookings.reduce((total, booking) => total + getDiscountedPrice(booking.service?.price || 0), 0);
  };

  const getOriginalTotalAmount = (): number => {
    return bookings.reduce((total, booking) => total + (booking.service?.price || 0), 0);
  };

const processPayment = async (bookingId: string) => {
  setProcessing(bookingId);
  const session = await supabase.auth.getSession();

  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.data?.session?.access_token}`,
      },
      credentials: "include",
      body: JSON.stringify({ bookingId }),
    });

    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      console.log("Error processing payment:", res.statusText);
    }
  } catch (error) {
    console.log("Payment error:", error);
  } finally {
    setProcessing(null);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12" style={{
            borderColor: "var(--border-primary)",
            borderTopColor: "var(--accent-primary)",
          }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-center" style={{ color: "var(--text-primary)" }}>
            Pay for Services
          </h1>
          <p className="text-center mb-4" style={{ color: "var(--text-secondary)" }}>
            Complete your service payments below
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              All Caught Up!
            </h2>
            <p style={{ color: "var(--text-secondary)" }} className="mb-6">
              You have no pending payments at this time.
            </p>
            <button
              onClick={() => router.push("/services")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Browse More Services
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass rounded-xl p-6 shadow-lg" style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--shadow-lg)",
            }}>
              <h2 className="text-xl font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
                Pending Payments ({bookings.length})
              </h2>

              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-lg p-6 border border-gray-200 dark:border-gray-600"
                    style={{
                      background: "var(--surface-primary)",
                      borderColor: "var(--border-primary)",
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                              {booking.service?.name || "Service"}
                            </h3>
                            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                              Provider: {booking.provider?.full_name || "Unknown"}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                          {booking.service?.description || "Service description"}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            {userSubscriptionPlan !== 'NONE' && userSubscriptionPlan !== 'PROVIDER' && getDiscountRate(userSubscriptionPlan) > 0 ? (
                              <div>
                                <span className="text-lg font-bold" style={{ color: "var(--accent-primary)" }}>
                                  ${getDiscountedPrice(booking.service?.price || 0).toFixed(2)}
                                </span>
                                <span className="text-sm line-through ml-2" style={{ color: "var(--text-secondary)" }}>
                                  ${booking.service?.price || 0}
                                </span>
                                <span className="px-2 py-1 ml-2 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  {Math.round(getDiscountRate(userSubscriptionPlan) * 100)}% OFF
                                </span>
                              </div>
                            ) : (
                              <span className="text-lg font-bold" style={{ color: "var(--accent-primary)" }}>
                                ${booking.service?.price || 0}
                              </span>
                            )}
                            <span className="px-3 py-1 ml-3 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                              AWAITING_PAYMENT
                            </span>
                          </div>

                          <button
                            onClick={() => processPayment(booking.id)}
                            disabled={processing === booking.id}
                            className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                              processing === booking.id
                                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700 text-white"
                            }`}
                          >
                            {processing === booking.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v4z" />
                                </svg>
                                <span>Pay Now</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {bookings.length > 0 && (
                <div className="mt-8 p-4 rounded-lg" style={{ background: "var(--surface-secondary)" }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div>
                      {getTotalAmount() !== getOriginalTotalAmount() && (
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          Total Amount Due
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold" style={{ color: "var(--accent-primary)" }}>
                          ${getTotalAmount().toFixed(2)}
                        </p>
                        {getTotalAmount() !== getOriginalTotalAmount() && (
                          <p className="text-sm line-through" style={{ color: "var(--text-secondary)" }}>
                            ${getOriginalTotalAmount().toFixed(2)}
                          </p>
                        )}
                        {getDiscountRate(userSubscriptionPlan) > 0 && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            You save ${(getOriginalTotalAmount() - getTotalAmount()).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-0 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {bookings.length} service{bookings.length > 1 ? 's' : ''} pending
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
