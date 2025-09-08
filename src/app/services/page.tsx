"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/client";
import NotificationBar from "@/components/NotificationBar";
import { useRouter } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";

interface Service {
  id: string;
  name: string;
  description: string;
  created_by: string;
  image_url: string;
  price: number;
}

interface NotificationState {
  message: string;
  type: "success" | "error" | "info" | null;
}

// Default service images - you can replace these with actual image URLs or paths
const DEFAULT_SERVICE_IMAGES = [
  "https://source.unsplash.com/random/400x300/?service1",
  "https://source.unsplash.com/random/400x300/?service2",
  "https://source.unsplash.com/random/400x300/?service3",
];

interface Booking {
  id: string;
  service_id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "COMPLETED";
}

interface UserProfile {
  id: string;
  role: "customer" | "service_provider" | "provider" | null;
  subscription_plan?: string;
}

export default function ServicesPage() {
  const supabase = createClient();
  const router = useRouter();
  const [notification, setNotification] = useState<NotificationState>({
    message: "",
    type: null,
  });
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch services with infinite scroll and search
  const fetchServices = async ({ pageParam = 0, query = "" }) => {
    const PAGE_SIZE = 12;
    const from = pageParam * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let queryBuilder = supabase
      .from("services")
      .select("*")
      .range(from, to);

    if (query) {
      queryBuilder = queryBuilder.or(
        `name.ilike.%${query}%,description.ilike.%${query}%`
      );
    }

    const { data: services, error } = await queryBuilder;

    if (error) throw error;

    return {
      data: services || [],
      nextPage: services && services.length === PAGE_SIZE ? pageParam + 1 : undefined,
    };
  };

  // TanStack Query infinite query for services
  const {
    data: servicesPages,
    error,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["services", searchQuery],
    queryFn: ({ pageParam }) => fetchServices({ pageParam, query: searchQuery }),
    getNextPageParam: (lastPage: any) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Intersection observer for infinite scroll
  const { ref, inView } = useInView({
    threshold: 0,
  });

  // Auto-fetch next page when in view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Excise all services from pages
  const allServices = servicesPages?.pages.flatMap((page) => page.data) || [];

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: null }), 5000);
  };

  const checkAuthStatus = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(user);

      // If user is authenticated, fetch their profile and active bookings
      if (user) {
        await fetchUserProfile(user);
        await fetchActiveBookings(user);
      } else {
        setUserProfile(null);
        setActiveBookings([]);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      setUser(null);
      setUserProfile(null);
      setActiveBookings([]);
    }
  };

  const fetchUserProfile = async (user: any) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, role, subscription_plan")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setUserProfile(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUserProfile(null);
    }
  };

  const fetchActiveBookings = async (user: any) => {
    try {
      const { data: bookings, error } = await supabase
        .from("service_bookings")
        .select("id, service_id, status")
        .in("status", ["PENDING", "ACCEPTED"])
        .eq("customer_id", user.id);

      if (error) throw error;
      setActiveBookings(bookings || []);
    } catch (error) {
      console.error("Error fetching active bookings:", error);
      setActiveBookings([]);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const requestService = async (serviceId: string) => {
    const buttonState = getButtonState(serviceId);

    // Redirect to login if not authenticated
    if (buttonState.loginRequired) {
      router.push("/login");
      return;
    }

    // Don't proceed if button is disabled
    if (buttonState.disabled) {
      return;
    }

    try {
      const { data: svc, error: svcError } = await supabase
        .from("services")
        .select("created_by")
        .eq("id", serviceId)
        .single();

      if (svcError || !svc) {
        showNotification("Service not found or error retrieving service", "error");
        return;
      }

      const { error: insertError } = await supabase
        .from("service_bookings")
        .insert({
          customer_id: user.id,
          service_id: serviceId,
          provider_id: svc.created_by,
          status: "PENDING",
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        showNotification("Error creating service request", "error");
        return;
      }

      // Refresh active bookings after successful request
      await fetchActiveBookings(user);

      showNotification(
        "Service requested successfully! We'll notify you when your request is processed.",
        "success"
      );
    } catch (error) {
      console.error("Error requesting service:", error);
      showNotification(
        "An error occurred while requesting the service",
        "error"
      );
    }
  };

  // Get default image for service based on its index
  const getServiceImage = (index: number) => {
    return DEFAULT_SERVICE_IMAGES[index % DEFAULT_SERVICE_IMAGES.length];
  };

  // Discount calculation functions
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
    const discount = getDiscountRate(userProfile?.subscription_plan || 'NONE');
    return originalPrice * (1 - discount);
  };

  const hasDiscount = (): boolean => {
    return !!(userProfile?.subscription_plan
      && userProfile.subscription_plan !== 'NONE'
      && userProfile.subscription_plan !== 'PROVIDER'
      && getDiscountRate(userProfile.subscription_plan) > 0);
  };

  // Helper function to get button state based on user role and active bookings
  const getButtonState = (serviceId: string) => {
    if (!user) {
      return {
        disabled: false,
        text: "Sign in to Request",
        loginRequired: true,
      };
    }

    if (!userProfile) {
      return {
        disabled: false,
        text: "Request Service",
        loginRequired: false,
      };
    }

    // Check user role
    if (userProfile.role === "service_provider" || userProfile.role === "provider") {
      return {
        disabled: true,
        text: "Providers cannot request services",
        loginRequired: false,
      };
    }

    // For customers, check if they have active bookings for this service
    if (userProfile.role === "customer") {
      const hasActiveBooking = activeBookings.some(
        (booking) => booking.service_id === serviceId
      );

      if (hasActiveBooking) {
        return {
          disabled: true,
          text: "Request Pending",
          loginRequired: false,
        };
      }
    }

    // Default state for customers without active bookings
    return {
      disabled: false,
      text: "Request Service",
      loginRequired: false,
    };
  };

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Notification Bar */}
      {notification.message && (
        <NotificationBar
          message={notification.message}
          type={notification.type || "info"}
          onClose={() => setNotification({ message: "", type: null })}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1
            className="text-3xl font-bold mb-2 text-center"
            style={{ color: "var(--text-primary)" }}
          >
            Our Services
          </h1>
          <p className="text-center mb-6" style={{ color: "var(--text-secondary)" }}>
            Browse our available services and book the ones you need
          </p>

          {/* Search Input */}
          <div className="max-w-md mx-auto mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {!user && (
            <div className="mt-4 text-center">
              <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
                Sign in to request services
              </p>
              <button
                onClick={() => router.push("/login")}
                className="btn-modern px-6 py-2 rounded-lg font-medium transition-all duration-200 mr-4"
                style={{
                  backgroundColor: "var(--accent-primary)",
                  color: "white",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "var(--accent-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "var(--accent-primary)")
                }
              >
                Sign In
              </button>
              <button
                onClick={() => router.push("/signup")}
                className="btn-outline px-6 py-2 rounded-lg font-medium transition-all duration-200"
                style={{
                  borderColor: "var(--accent-primary)",
                  color: "var(--accent-primary)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--accent-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--accent-primary)")
                }
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div
              className="animate-spin rounded-full h-12 w-12"
              style={{
                borderColor: "var(--border-primary)",
                borderTopColor: "var(--accent-primary)",
              }}
            ></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p style={{ color: "var(--text-secondary)" }}>
              {error instanceof Error ? error.message : "Error loading services"}
            </p>
          </div>
        ) : (
          <>
            {allServices.length === 0 ? (
              <div className="text-center py-12">
                <p style={{ color: "var(--text-secondary)" }}>
                  {searchQuery ? "No services found matching your search." : "No services available at the moment."}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allServices.map((svc: Service, index: number) => (
                    <div
                      key={svc.id}
                      className="glass rounded-xl overflow-hidden shadow-lg hover-lift transition-all duration-300"
                      style={{
                        background: "var(--glass-bg)",
                        border: "1px solid var(--glass-border)",
                        boxShadow: "var(--shadow-lg)",
                      }}
                    >
                      {/* Service Image */}
                      <div className="h-48 overflow-hidden">
                        <img
                          src={svc.image_url || DEFAULT_SERVICE_IMAGES[0]}
                          alt={`${svc.name} service`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* Service Content */}
                      <div className="p-6">
                        <h3
                          className="text-xl font-semibold mb-2"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {svc.name}
                        </h3>
                        <p
                          className="mb-4"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {svc.description}
                        </p>
                        <div className="mb-4">
                          {user && hasDiscount() ? (
                            <div className="flex items-center gap-2">
                              <span
                                className="font-bold"
                                style={{ color: "var(--accent-primary)" }}
                              >
                                ${getDiscountedPrice(svc.price).toFixed(2)}
                              </span>
                              <span
                                className="text-sm line-through"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                ${svc.price}
                              </span>
                              <span
                                className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              >
                                {Math.round(getDiscountRate(userProfile!.subscription_plan!) * 100)}% OFF
                              </span>
                            </div>
                          ) : (
                            <p style={{ color: "var(--text-secondary)" }}>
                              Price: ${svc.price}
                            </p>
                          )}
                        </div>
                        {(() => {
                          const buttonState = getButtonState(svc.id);
                          const isLoginAction = !user || buttonState.loginRequired;
                          return (
                            <button
                              onClick={() => requestService(svc.id)}
                              disabled={buttonState.disabled && !isLoginAction}
                              className={`w-full px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                                buttonState.disabled && !isLoginAction
                                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                                  : "bg-blue-600 hover:bg-blue-700 text-white btn-modern"
                              }`}
                            >
                              {buttonState.text}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Infinite Scroll Trigger */}
                <div ref={ref} className="flex justify-center py-8">
                  {isFetchingNextPage ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  ) : hasNextPage ? (
                    <div className="text-center">
                      <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                        Loading more services...
                      </p>
                    </div>
                  ) : allServices.length > 0 ? (
                    <div className="text-center">
                      <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                        You've seen all services 🎉
                      </p>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
