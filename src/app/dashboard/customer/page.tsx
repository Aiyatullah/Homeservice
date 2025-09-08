"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/client";
import NotificationBar from "@/components/NotificationBar";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Request {
  id: string;
  customer_id: string;
  service_id: string;
  status: string;
  provider: {
    full_name: string;
  } | null;
}

interface NotificationState {
  message: string;
  type: "success" | "error" | "info" | null;
}

export default function CustomerDashboard() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [notification, setNotification] = useState<NotificationState>({
    message: "",
    type: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5; // Items per page

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: null }), 5000);
  };

  // Fetch user requests with pagination
  const fetchRequests = async (page: number, size: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("No user found");

    const from = (page - 1) * size;
    const to = from + size - 1;

    const { data: requests, error: requestsError } = await supabase
      .from("service_bookings")
      .select(
        "id, status, service_id, customer_id, provider:provider_id(full_name)"
      )
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (requestsError) throw requestsError;

    return {
      data: requests || [],
      hasMore: (requests?.length || 0) === size,
    };
  };

  // TanStack Query for paginated requests
  const { data, isLoading, error } = useQuery({
    queryKey: ["myRequests", currentPage],
    queryFn: () => fetchRequests(currentPage, pageSize),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    // Subscribe to service_bookings updates
    const channel = supabase
      .channel("booking-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "service_bookings",
        },
        (payload) => {
          const updatedBooking = payload.new as Request;
          const statusMessages = {
            PENDING: "still pending",
            ACCEPTED: "accepted 🎉",
            DECLINED: "declined",
            COMPLETED: "completed",
          };
          showNotification(
            `Your booking status was updated to: ${
              statusMessages[
                updatedBooking.status as keyof typeof statusMessages
              ] || updatedBooking.status
            }`,
            "info"
          );
          // Invalidate and refresh the current page's data
          queryClient.invalidateQueries({ queryKey: ["myRequests", currentPage] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);



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
            className="text-3xl font-bold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            My Requests
          </h1>
          <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
            Track the status of your service requests
          </p>
          {/* //add a button with proper styling to navigate to the services page */}
          <div className="mt-4 items-center">
            <button
              className="btn-modern px-6 py-2 rounded-lg font-medium transition-all duration-200 inline-block"
              style={{
                backgroundColor: "var(--accent-primary)",
                color: "white",
              }}
              onClick={() => {
                window.location.href = "/services";
              }}
            >
              Browse Available Services
            </button>
          </div>
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
        ) : (
          <div
            className="glass rounded-xl p-6 shadow-lg max-w-4xl mx-auto"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <h2
              className="text-xl font-semibold mb-6 flex items-center"
              style={{ color: "var(--text-primary)" }}
            >
              <span className="mr-2">📋</span>
              Service Request History
            </h2>
            {(data?.data || []).length === 0 ? (
              <div className="text-center py-12">
                <p style={{ color: "var(--text-secondary)" }} className="mb-4">
                  You haven't made any service requests yet.
                </p>
                <a
                  href="/services"
                  className="btn-modern px-6 py-2 rounded-lg font-medium transition-all duration-200 inline-block"
                  style={{
                    backgroundColor: "var(--accent-primary)",
                    color: "white",
                  }}
                >
                  Browse Available Services
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {(data?.data || []).map((req: any) => (
                  <div
                    key={req.id}
                    className="rounded-lg p-4 hover-lift transition-all duration-300"
                    style={{
                      background: "var(--surface-primary)",
                      border: "1px solid var(--border-primary)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p
                          className="text-sm mb-1"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Request ID: {req.id}
                        </p>
                        <p
                          className="font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          Provider: {req.provider?.full_name || "Unknown"}
                        </p>
                      </div>
                      <span
                        className="px-4 py-2 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor:
                            req.status === "PENDING"
                              ? "var(--warning-bg)"
                              : req.status === "ACCEPTED"
                              ? "var(--success-bg)"
                              : req.status === "DECLINED"
                              ? "var(--error-bg)"
                              : req.status === "COMPLETED"
                              ? "var(--success-bg)"
                              : "var(--surface-secondary)",
                          color:
                            req.status === "PENDING"
                              ? "var(--warning)"
                              : req.status === "ACCEPTED"
                              ? "var(--success)"
                              : req.status === "DECLINED"
                              ? "#7f1d1d"
                              : req.status === "COMPLETED"
                              ? "var(--success)"
                              : "var(--text-secondary)",
                        }}
                      >
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {(data?.data || []).length > 0 && (
              <div className="flex justify-center items-center mt-6 space-x-4">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="btn-pagination px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: currentPage === 1 ? "var(--surface-secondary)" : "var(--accent-primary)",
                    color: "white",
                  }}
                >
                  Previous
                </button>
                <span
                  style={{ color: "var(--text-secondary)" }}
                  className="text-sm"
                >
                  Page {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!data?.hasMore}
                  className="btn-pagination px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: !data?.hasMore ? "var(--surface-secondary)" : "var(--accent-primary)",
                    color: "white",
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
