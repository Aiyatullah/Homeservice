"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/client";
import { REALTIME_POSTGRES_CHANGES_LISTEN_EVENT } from "@supabase/realtime-js";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: string;
  read: boolean;
}

interface ServiceBooking {
  id: string;
  customer_id?: string;
  provider_id?: string;
  service_id?: string;
  status?: string;
}

interface Service {
  id: string;
  name?: string;
  created_by?: string;
}

interface SupabasePayload<T = Record<string, unknown>> {
  new?: T;
  old?: T;
  eventType: string;
  schema?: string;
  table?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  // Generate a unique ID for notifications
  const generateId = () =>
    Date.now().toString() + Math.random().toString(36).substr(2, 9);

  // Add a new notification
  const addNotification = useCallback(
    (
      title: string,
      message: string,
      type: "info" | "success" | "warning" | "error" = "info"
    ) => {
      const newNotification: Notification = {
        id: generateId(),
        title,
        message,
        type,
        timestamp: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Auto-remove after 10 minutes
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, 10 * 60 * 1000);

      return newNotification.id;
    },
    []
  );

  // Remove a notification
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const notificationToRemove = prev.find((n) => n.id === id && !n.read);
      const newNotifications = prev.filter((n) => n.id !== id);

      if (notificationToRemove && !notificationToRemove.read) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }

      return newNotifications;
    });
  }, []);

  // Mark as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
    setUnreadCount(0);
  }, []);

  // Set up Supabase real-time listeners
  useEffect(() => {
    const channels: string[] = [];

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const providerChannelName = `provider-${user.id}`;
      const customerChannelName = `customer-${user.id}`;
      const servicesChannelName = `services-${user.id}`;

      // Store channel names for cleanup
      channels.push(
        providerChannelName,
        customerChannelName,
        servicesChannelName
      );

      // Listen for new service bookings (providers get notified)
      /* eslint-disable */
      supabase
        .channel(providerChannelName)
        .on(
          // @ts-ignore
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "service_bookings",
            filter: `provider_id=eq.${user.id}`,
          },
          (payload: SupabasePayload<ServiceBooking>) => {
            const booking = payload.new;
            addNotification(
              "🔔 New Service Request",
              `You have received a new service request from a customer.`,
              "info"
            );
          }
        )
        .subscribe();

      // Listen for booking status updates (customers get notified)

      supabase
        .channel(customerChannelName)
        .on(
          // @ts-ignore
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "service_bookings",
            filter: `customer_id=eq.${user.id}`,
          },
          (payload: SupabasePayload<ServiceBooking>) => {
            const booking = payload.new;
            const statusMessages = {
              PENDING: "Your request is still pending review",
              ACCEPTED: "🎉 Great! Your service request has been accepted",
              DECLINED: "Sorry, your service request was declined",
              COMPLETED: "✅ Your service has been completed successfully",
            };

            const title =
              booking?.status === "ACCEPTED"
                ? "🎉 Service Accepted!"
                : booking?.status === "COMPLETED"
                ? "✅ Service Completed!"
                : booking?.status === "DECLINED"
                ? "⚠️ Service Request Update"
                : "📋 Request Update";

            addNotification(
              title,
              statusMessages[booking?.status as keyof typeof statusMessages] ||
                `Your booking status is now: ${booking?.status}`,
              booking?.status === "ACCEPTED"
                ? "success"
                : booking?.status === "DECLINED"
                ? "warning"
                : booking?.status === "COMPLETED"
                ? "success"
                : "info"
            );
          }
        )
        .subscribe();

      // Listen for new services created by providers
      supabase
        .channel(servicesChannelName)
        .on(
          // @ts-ignore
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "services",
            filter: `created_by=eq.${user.id}`,
          },
          (payload: SupabasePayload<Service>) => {
            const service = payload.new;
            addNotification(
              "✨ Service Added",
              `Your service "${service?.name}" has been added successfully.`,
              "success"
            );
          }
        )
        .subscribe();
    });

    // Cleanup function
    return () => {
      channels.forEach((channelName) => {
        supabase.removeChannel(supabase.channel(channelName));
      });
    };
  }, [addNotification]);

  return {
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
  };
}
