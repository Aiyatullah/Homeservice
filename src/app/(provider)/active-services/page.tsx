"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/client";
import NotificationBar from "@/components/NotificationBar";

interface Request {
  id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  customer: {
    full_name: string;
  } | null;
}

interface NotificationState {
  message: string;
  type: "success" | "error" | "info" | null;
}

export default function ProviderServicesPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<Request[]>([]);
  const [notification, setNotification] = useState<NotificationState>({ message: "", type: null });
  const [loading, setLoading] = useState(true);

  const showNotification = (message: string, type: "success" | "error" | "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: null }), 5000);
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("service_bookings")
        .select(
          "id, status, started_at, ended_at, customer:customer_id(full_name)"
        )
        .eq("provider_id", user.id)
        .in("status", ["ACCEPTED", "IN_PROGRESS"]);

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRequests((data as any) || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      showNotification("Failed to load active services. Please refresh the page.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const startService = async (id: string) => {
    try {
      const { error } = await supabase
        .from("service_bookings")
        .update({ status: "IN_PROGRESS", started_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      showNotification("Service started successfully!", "success");
      fetchRequests();
    } catch (error) {
      console.error("Error starting service:", error);
      showNotification("Failed to start service. Please try again.", "error");
    }
  };

  const endService = async (id: string) => {
    try {
      const { error } = await supabase
        .from("service_bookings")
        .update({ status: "COMPLETED", ended_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      showNotification("Service completed successfully!", "success");
      fetchRequests();
    } catch (error) {
      console.error("Error ending service:", error);
      showNotification("Failed to complete service. Please try again.", "error");
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return '⏳';
      case 'IN_PROGRESS': return '🔄';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Notification Bar */}
      {notification.message && (
        <NotificationBar
          message={notification.message}
          type={notification.type || "info"}
          onClose={() => setNotification({ message: "", type: null })}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Active Services</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your ongoing and accepted service requests</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
            <div className="text-6xl mb-4">🔧</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Active Services</h3>
            <p className="text-gray-600 dark:text-gray-300">You dont have any active service requests at the moment.</p>
            <p className="text-gray-500 dark:text-gray-400 mt-2">New requests will appear here when customers book your services.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {requests.map((req) => (
              <div key={req.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-2xl">{getStatusIcon(req.status)}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Customer: {req.customer?.full_name || "Unknown Customer"}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(req.status)}`}>
                            {req.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {(req.started_at || req.ended_at) && (
                      <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                        {req.started_at && (
                          <p><strong>Started:</strong> {formatTime(req.started_at)}</p>
                        )}
                        {req.ended_at && (
                          <p><strong>Ended:</strong> {formatTime(req.ended_at)}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Duration Tracker for In Progress Services */}
                  {req.status === 'IN_PROGRESS' && req.started_at && (
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 ml-6">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12,6  12,12 16,14"></polyline>
                        </svg>
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-200">Service Duration</span>
                      </div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {(() => {
                          const start = new Date(req.started_at!);
                          const now = new Date();
                          const diff = Math.floor((now.getTime() - start.getTime()) / 1000 / 60);
                          const hours = Math.floor(diff / 60);
                          const mins = diff % 60;
                          return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  {req.status === "ACCEPTED" && (
                    <button
                      onClick={() => startService(req.id)}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="10,8 16,12 10,16"></polyline>
                      </svg>
                      <span>Start Service</span>
                    </button>
                  )}

                  {req.status === "IN_PROGRESS" && (
                    <button
                      onClick={() => endService(req.id)}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium inline-flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="9" cy="12" r="1"></circle>
                        <circle cx="15" cy="12" r="1"></circle>
                        <rect x="5" y="8" width="14" height="8" fill="currentColor"></rect>
                      </svg>
                      <span>Mark as Complete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
