"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/client";
import NotificationBar from "@/components/NotificationBar";

interface Booking {
  id: string;
  status: string;
  services: {
    name: string;
  } | null;
  provider: {
    full_name: string;
  } | null;
  feedback: string | null;
  rating: number | null;
}

interface NotificationState {
  message: string;
  type: "success" | "error" | "info" | null;
}

export default function CustomerFeedbackPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notification, setNotification] = useState<NotificationState>({ message: "", type: null });
  const [loading, setLoading] = useState(true);

  const showNotification = (message: string, type: "success" | "error" | "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: null }), 5000);
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("service_bookings")
        .select(
          "id, status, feedback, rating, services(name), provider:provider_id(full_name)"
        )
        .eq("customer_id", user.id)
        .eq("status", "COMPLETED");

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setBookings((data as any) || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      showNotification("Failed to load completed services. Please refresh the page.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const submitFeedback = async (id: string) => {
    if (!feedbacks[id] || !ratings[id]) {
      showNotification("Please provide both feedback and rating", "error");
      return;
    }

    if (ratings[id] < 1 || ratings[id] > 5) {
      showNotification("Rating should be between 1 and 5", "error");
      return;
    }

    try {
      const { error } = await supabase
        .from("service_bookings")
        .update({
          feedback: feedbacks[id],
          rating: ratings[id],
        })
        .eq("id", id);

      if (error) throw error;

      showNotification("Feedback submitted successfully!", "success");
      fetchBookings();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      showNotification("Failed to submit feedback. Please try again.", "error");
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-5 h-5 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Service Feedback</h1>
          <p className="text-gray-600 dark:text-gray-300">Share your experience with completed services to help us improve</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
            <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Completed Services</h3>
          <p className="text-gray-600 dark:text-gray-300">You dont have any completed services to provide feedback for yet.</p>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Feedback will be available once your service requests are completed.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                          {booking.services?.name.charAt(0)?.toUpperCase() || "S"}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{booking.services?.name || "Service"}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          by {booking.provider?.full_name || "Provider"} • Completed
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {booking.feedback ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <span className="text-green-600 font-medium mr-2">✓ Feedback Submitted</span>
                      {booking.rating && (
                        <div className="flex items-center space-x-1">
                          {renderStars(booking.rating)}
                          <span className="text-sm text-gray-600 ml-2">({booking.rating}/5)</span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-700 italic">{booking.feedback}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your Feedback
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Tell us about your experience with this service..."
                        value={feedbacks[booking.id] || ""}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                        onChange={(e) =>
                          setFeedbacks({ ...feedbacks, [booking.id]: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rating (1-5 stars)
                      </label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="number"
                          min="1"
                          max="5"
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={ratings[booking.id] || ""}
                          onChange={(e) =>
                            setRatings({ ...ratings, [booking.id]: Number(e.target.value) })
                          }
                        />
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Number(ratings[booking.id]) || 0 }, (_, i) => (
                            <svg key={i} className="w-6 h-6 text-yellow-400 fill-current" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => submitFeedback(booking.id)}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Submit Feedback
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
