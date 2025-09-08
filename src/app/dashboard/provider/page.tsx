"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/client";
import NotificationBar from "@/components/NotificationBar";

interface Service {
  id: string;
  name: string;
  description: string;
  created_by: string;
}

interface Request {
  id: string;
  status: string;
  customer: {
    full_name: string;
  } | null;
}

interface NotificationState {
  message: string;
  type: "success" | "error" | "info" | null;
}

interface Feedback {
  id: string;
  customer: {
    full_name: string;
  } | null;
  feedback: string | null;
  rating: number | null;
}

export default function ProviderDashboard() {
  const supabase = createClient();
  const [services, setServices] = useState<Service[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [file, setFile] = useState<File | null>(null); // <-- added state for file
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [notification, setNotification] = useState<NotificationState>({
    message: "",
    type: null,
  });
  const [loading, setLoading] = useState(true);
  const [customerFeedback, setCustomerFeedback] = useState<Feedback[]>([]);

  // Default placeholder (you can use any service-related stock image or random generator)
  const defaultImage =
    "https://images.unsplash.com/photo-1754613389158-3b13a051a81a?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: null }), 5000);
  };

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Fetch services
      const { data: myServices, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("created_by", user.id);
      if (servicesError) throw servicesError;

      // Fetch requests
      const { data: myRequests, error: requestsError } = await supabase
        .from("service_bookings")
        .select("id, status, customer:customer_id(full_name)")
        .eq("provider_id", user.id);
      if (requestsError) throw requestsError;

      // Fetch customer feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("service_bookings")
        .select("id, feedback, rating, customer:customer_id(full_name)")
        .eq("provider_id", user.id)
        .eq("status", "COMPLETED")
        .not("feedback", "is", null);
      if (feedbackError) throw feedbackError;

      setServices(myServices || []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRequests((myRequests as any) || []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCustomerFeedback((feedbackData as any) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      showNotification(
        "Failed to load data. Please refresh the page.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("provider-requests")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "service_bookings",
        },
        async (payload) => {
          // Check if the request belongs to the logged-in provider
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user && payload.new.provider_id === user.id) {
            showNotification("📩 New service request received!", "info");
            fetchData(); // refresh requests
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createService = async () => {
    if (!name.trim() || !desc.trim()) {
      showNotification(
        "Please fill in both service name and description",
        "error"
      );
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let imageUrl = defaultImage;

      // If user uploaded a file → upload to bucket
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("service-images")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload failed:", uploadError.message);
          showNotification("Error uploading image, using default", "error");
        } else {
          const { data: publicUrlData } = supabase.storage
            .from("service-images")
            .getPublicUrl(fileName);
          imageUrl = publicUrlData.publicUrl;
        }
      }

      const { error: insertError } = await supabase.from("services").insert({
        name: name.trim(),
        description: desc.trim(),
        created_by: user.id,
        image_url: imageUrl,
        price: price,
      });

      if (insertError) {
        showNotification("Error creating service", "error");
        return;
      }

      showNotification("Service created successfully!", "success");
      setName("");
      setDesc("");
      setFile(null);
      setPrice("");
      fetchData();
    } catch (error) {
      console.error("Error creating service:", error);
      showNotification("An error occurred while creating the service", "error");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error: updateError } = await supabase
        .from("service_bookings")
        .update({ status })
        .eq("id", id);
      if (updateError) {
        showNotification("Error updating status", "error");
        return;
      }
      showNotification(
        `Request ${status.toLowerCase()} successfully`,
        "success"
      );
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      showNotification("An error occurred while updating the status", "error");
    }
  };

  const stats = {
    totalServices: services.length,
    pendingRequests: requests.filter((r) => r.status === "PENDING").length,
    acceptedRequests: requests.filter((r) => r.status === "ACCEPTED").length,
    totalRequests: requests.length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Provider Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your services and handle customer requests
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover-lift transition-all duration-300 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 mr-4">
                <span className="text-blue-600 dark:text-blue-400 text-xl">
                  🛠️
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Total Services
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalServices}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover-lift transition-all duration-300 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 mr-4">
                <span className="text-yellow-600 dark:text-yellow-400 text-xl">
                  ⏳
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Pending Requests
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.pendingRequests}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover-lift transition-all duration-300 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 mr-4">
                <span className="text-green-600 dark:text-green-400 text-xl">
                  ✅
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Accepted Requests
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.acceptedRequests}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover-lift transition-all duration-300 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 mr-4">
                <span className="text-purple-600 dark:text-purple-400 text-xl">
                  📊
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Total Requests
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalRequests}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Service Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="mr-2">➕</span>
              Create New Service
            </h2>
            <div className="space-y-4">
              {/* Service Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Service Name
                </label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                  placeholder="Enter service name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                  rows={3}
                  placeholder="Describe the service you offer"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Service Image (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-blue-400 dark:hover:file:bg-gray-600"
                />
                {/* Preview */}
                {file && (
                  <div className="mt-3">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                    />
                  </div>
                )}
              </div>
              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  price
                </label>
                <input
                  type="number"
                  placeholder="Enter the price of the service"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value))}
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={createService}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 px-4 rounded-lg transition-all duration-300 font-medium hover-lift btn-modern"
              >
                Add Service
              </button>
            </div>
          </div>

          {/* Customer Requests Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="mr-2">📋</span>
              Customer Requests
            </h2>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
              </div>
            ) : requests.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                No requests yet. Your services will appear here when customers
                make bookings.
              </p>
            ) : (
              <div className="space-y-4">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {req.customer?.full_name || "Unknown Customer"}
                        </p>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            req.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              : req.status === "AWAITING_PAYMENT"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : req.status === "ACCEPTED"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : req.status === "DECLINED"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                    </div>
                    {req.status === "PENDING" && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() =>
                            updateStatus(req.id, "AWAITING_PAYMENT")
                          }
                          className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-2 px-4 rounded-lg transition-all duration-300 text-sm font-medium btn-modern"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => updateStatus(req.id, "DECLINED")}
                          className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-2 px-4 rounded-lg transition-all duration-300 text-sm font-medium btn-modern"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {/* Awaiting payment actions */}
                    {req.status === "AWAITING_PAYMENT" && (
                      <div className="text-sm text-blue-700 dark:text-blue-300 font-medium mt-2">
                        Waiting for customer to complete payment...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Services Section */}
          {services.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="mr-2">🏷️</span>
                My Services
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 transition-colors"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {svc.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      {svc.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Feedback Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="mr-2">💬</span>
              Customer Reviews
            </h2>
            {customerFeedback.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Reviews Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Customer feedback will appear here once they rate your
                  completed services.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {customerFeedback.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">
                            {feedback.customer?.full_name
                              ?.charAt(0)
                              ?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {feedback.customer?.full_name || "Anonymous"}
                          </p>
                          <div className="flex items-center space-x-1 mt-1">
                            {Array.from(
                              { length: feedback.rating || 0 },
                              (_, i) => (
                                <svg
                                  key={i}
                                  className="w-4 h-4 text-yellow-400 fill-current"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              )
                            )}
                            <span className="text-sm text-gray-600 dark:text-gray-300 ml-2">
                              ({feedback.rating}/5)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                      <p className="text-gray-700 dark:text-gray-200 italic">
                        &ldquo;{feedback.feedback}&rdquo;
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {customerFeedback.length > 0 && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center space-x-4 bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-600">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Average Rating:
                  </span>
                  <div className="flex items-center space-x-1">
                    {Array.from(
                      {
                        length: Math.round(
                          customerFeedback.reduce(
                            (sum, fb) => sum + (fb.rating || 0),
                            0
                          ) / customerFeedback.length
                        ),
                      },
                      (_, i) => (
                        <svg
                          key={i}
                          className="w-4 h-4 text-yellow-400 fill-current"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )
                    )}
                    <span className="text-sm font-semibold text-gray-900 dark:text-white ml-2">
                      {(
                        customerFeedback.reduce(
                          (sum, fb) => sum + (fb.rating || 0),
                          0
                        ) / customerFeedback.length
                      ).toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({customerFeedback.length} reviews)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
