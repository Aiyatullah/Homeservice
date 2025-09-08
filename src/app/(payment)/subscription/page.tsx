"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/client";
import Link from "next/link";

export default function SubscriptionPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const checkAuthStatus = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        console.error("Auth error:", error);
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setUser(user);

      if (user) {
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Profile error:", profileError);
          setUserProfile(null);
        } else {
          setUserProfile(profile);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setUser(null);
      setUserProfile(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handleSubscribe = async (planId: string) => {
      const session = await supabase.auth.getSession();
  try {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.data?.session?.access_token}`,
      },
      credentials: "include",
      body: JSON.stringify({ planId }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to start subscription");
    }

    const { url } = await res.json();

    if (url) {
      window.location.href = url; // redirect to Stripe Checkout
    } else {
      alert("Something went wrong. No URL returned.");
    }
  } catch (error: any) {
    console.error("Subscription error:", error);
    alert(error.message || "Unable to start subscription.");
  }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 dark:border-gray-600 border-t-blue-600 dark:border-t-blue-400"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md text-center border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please Login
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You need to be logged in to access subscription features.
          </p>
          <Link href="/login">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
              Go to Login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md text-center border border-gray-200 dark:border-gray-700">
          <svg
            className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 48 48"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M34 16c0 5.523-4.477 10-10 10S14 21.523 14 16s4.477-10 10-10 10 4.477 10 10zM34 16v14M24 30v4m0 0h-4m4 0h4"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Profile Setup Required
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Could not load your profile. Please complete your setup.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            User ID: {user.id}
          </p>
        </div>
      </div>
    );
  }

  // Customer subscription plans
  if (userProfile.role === "customer") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Subscription Plans
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Choose the perfect plan to enhance your home service experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Basic Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 border-2 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Basic
              </h3>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                $19.99
                <span className="text-lg font-normal text-gray-600 dark:text-gray-400">
                  /month
                </span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 mr-3 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Access to service providers
                </li>
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 mr-3 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Basic booking system
                </li>
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 mr-3 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Customer support
                </li>
              </ul>
              <button
                onClick={() => handleSubscribe("basic")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Subscribe Now
              </button>
            </div>

            {/* Premium Plan - Popular */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 border-2 border-blue-500 relative transform scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                  Most Popular
                </span>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Premium
              </h3>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                $39.99
                <span className="text-lg font-normal text-gray-600 dark:text-gray-400">
                  /month
                </span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 mr-3 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Everything in Basic
                </li>
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 mr-3 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Priority booking
                </li>
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 mr-3 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  24/7 emergency support
                </li>
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 mr-3 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  15% service discount
                </li>
              </ul>
              <button
                onClick={() => handleSubscribe("premium")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Subscribe Now
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 border-2 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Enterprise
              </h3>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                $89.99
                <span className="text-lg font-normal text-gray-600 dark:text-gray-400">
                  /month
                </span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 mr-3 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Everything in Premium
                </li>
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 mr-3 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Bulk booking discounts
                </li>
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 mr-3 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Multi-property management
                </li>
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 mr-3 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Dedicated account manager
                </li>
              </ul>
              <button
                onClick={() => handleSubscribe("enterprise")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Subscribe Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (userProfile.role === "service_provider") {  
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Provider Dashboard
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Manage your services and access premium provider features
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Active Services */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-4">
                  <svg
                    className="w-6 h-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Active Services
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Manage your listing
                  </p>
                </div>
              </div>
              <Link href="/active-services">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors">
                  View Services
                </button>
              </Link>
            </div>

            {/* Earnings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-4">
                  <svg
                    className="w-6 h-6 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Earnings
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Track your revenue
                  </p>
                </div>
              </div>
              <button className="w-full bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-medium transition-colors cursor-not-allowed">
                Coming Soon
              </button>
            </div>

            {/* Analytics */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-4">
                  <svg
                    className="w-6 h-6 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Analytics
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Performance insights
                  </p>
                </div>
              </div>
              <button className="w-full bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-medium transition-colors cursor-not-allowed">
                Coming Soon
              </button>
            </div>
          </div>

          {/* Premium Features Section */}
          <div className="mt-16 bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Premium Provider Features
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Upgrade your provider account to unlock advanced features
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="flex flex-col items-center">
                <svg
                  className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  Featured service listings
                </span>
              </div>
              <div className="flex flex-col items-center">
                <svg
                  className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  Priority search rankings
                </span>
              </div>
              <div className="flex flex-col items-center">
                <svg
                  className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  Detailed analytics dashboard
                </span>
              </div>
            </div>
            <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors" onClick={() => handleSubscribe("provider")}>
              Upgrade to Premium
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default case - no role or unknown role
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
        <svg
          className="mx-auto h-16 w-16 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 48 48"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M34 16c0 5.523-4.477 10-10 10s-10-4.477-10-10c0-5.523 4.477-10 10-10s10 4.477 10 10zM34 16v14M24 30v4m0 0h-4m4 0h4"
          />
        </svg>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Profile Setup Required
        </h2>
        <p className="text-gray-600 mb-6">
          Please complete your profile setup to select a role and access
          subscription features.
        </p>
        <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
          <p className="text-sm font-medium text-gray-900 mb-2">Your Info:</p>
          <p className="text-sm text-gray-600">
            <strong>User:</strong> {user.email}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Current Role:</strong> {userProfile.role || "Not set"}
          </p>
        </div>
        <Link href="/dashboard">
          <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
            Complete Profile Setup
          </button>
        </Link>
      </div>
    </div>
  );
}
