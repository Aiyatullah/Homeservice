"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/client";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// ---- Define types ----
interface ServiceBooking {
  id: string;
  customer_id: string;
  provider_id: string;
  service_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  timestamp: string;
  read: boolean;
}

export default function CustomerDashboard() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel("customer-notifications")
      .on<ServiceBooking>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_bookings",
        },
        (payload: RealtimePostgresChangesPayload<ServiceBooking>) => {
          if (!payload.new) return; // safeguard for DELETE events

          if ('id' in payload.new){
          const newNotification: Notification = {
            id: payload.new?.id ?? '',
            title: getNotificationTitle(payload.eventType, payload.new),
            message: getNotificationMessage(payload.eventType, payload.new),
            type: getNotificationType(payload.eventType),
            timestamp: new Date().toISOString(),
            read: false,
          };

          setNotifications((prev) => [newNotification, ...prev]);
        }
  })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  return (
    <div className="p-8 rounded-xl">
      <h3 className="text-2xl font-bold mb-6">Real-Time Notifications Demo</h3>

      <div className="space-y-3">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`p-4 rounded-lg border ${!notif.read ? "ring-2" : ""}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-medium">{notif.title}</h4>
                <p className="text-sm mt-1">{notif.message}</p>
                <span className="text-xs">
                  {new Date(notif.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <button
                onClick={() => markAsRead(notif.id)}
                className={`text-xs px-2 py-1 rounded ${
                  notif.read ? "bg-gray-200" : "bg-blue-500 text-white"
                }`}
              >
                {notif.read ? "Read" : "Mark Read"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Helper functions with proper typing ----
function getNotificationTitle(
  eventType: RealtimePostgresChangesPayload<ServiceBooking>["eventType"],
  data: ServiceBooking | null
): string {
  switch (eventType) {
    case "INSERT":
      return "Service Requested";
    case "UPDATE":
      return "Booking Updated";
    case "DELETE":
      return "Booking Cancelled";
    default:
      return "Notification";
  }
}

function getNotificationMessage(
  eventType: RealtimePostgresChangesPayload<ServiceBooking>["eventType"],
  data: ServiceBooking | null
): string {
  switch (eventType) {
    case "INSERT":
      return "New service booking has been submitted";
    case "UPDATE":
      return `Booking status changed to: ${data?.status}`;
    case "DELETE":
      return "Service booking has been cancelled";
    default:
      return "You have a new notification";
  }
}

function getNotificationType(
  eventType: RealtimePostgresChangesPayload<ServiceBooking>["eventType"]
): Notification["type"] {
  switch (eventType) {
    case "INSERT":
      return "success";
    case "UPDATE":
      return "info";
    case "DELETE":
      return "warning";
    default:
      return "info";
  }
}
