"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/client";
import { User } from "@supabase/supabase-js";

interface UserProfile {
  role: string;
  full_name: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser();

        if (currentUser && !error) {
          setUser(currentUser);
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("role, full_name")
            .eq("id", currentUser.id)
            .single();
          setProfile(userProfile);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center transition-colors duration-300">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user && profile) {
    const backgroundImage =
      profile.role === "customer"
        ? "https://content.jdmagicbox.com/comp/def_content/home-services/de0986fce9-home-services-5-k9n8b.jpg"
        : "https://img.freepik.com/free-photo/part-male-construction-worker_329181-3734.jpg";

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300 flex items-center justify-center p-4 relative">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat "
          style={{
            backgroundImage: `url('${backgroundImage}')`
          }}
        ></div>

        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/85 to-white/80 dark:from-gray-900/90 dark:via-gray-800/85 dark:to-gray-700/80"></div>

        <div className="relative z-10 max-w-4xl mx-auto backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center glass-card">
          <div className="mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👤</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back, {profile.full_name}!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              {profile.role === "customer"
                ? "Ready to book or track your home services?"
                : profile.role === "service_provider"
                ? "Check your service requests and manage your offerings"
                : "Manage the Home Service platform"}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {profile.role === "customer" && (
              <>
                <Link
                  href="/dashboard"
                  className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl hover-lift hover:scale-105 transition-all duration-300 block glass"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-white text-2xl">📊</span>
                  </div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    Dashboard
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Overview of your activities
                  </p>
                </Link>
                <Link
                  href="/services"
                  className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl hover-lift hover:scale-105 transition-all duration-300 block glass"
                >
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-white text-2xl">🏷️</span>
                  </div>
                  <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                    Services
                  </h3>
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    Find and book home services
                  </p>
                </Link>
                <Link
                  href="/feedback"
                  className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-xl hover-lift hover:scale-105 transition-all duration-300 block glass"
                >
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-white text-2xl">💬</span>
                  </div>
                  <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">
                    Feedback
                  </h3>
                  <p className="text-purple-700 dark:text-purple-300 text-sm">
                    Share your experience
                  </p>
                </Link>
              </>
            )}

            {profile.role === "service_provider" && (
              <>
                <Link
                  href="/dashboard"
                  className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl hover-lift hover:scale-105 transition-all duration-300 block glass"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-white text-2xl">📊</span>
                  </div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    Dashboard
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Overview of your activities
                  </p>
                </Link>
                <Link
                  href="/active-services"
                  className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl hover-lift hover:scale-105 transition-all duration-300 block glass"
                >
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-white text-2xl">🔧</span>
                  </div>
                  <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                    Active Services
                  </h3>
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    Manage your current bookings
                  </p>
                </Link>
                <Link
                  href="/subscription"
                  className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-xl hover-lift hover:scale-105 transition-all duration-300 block glass"
                >
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-white text-2xl">⭐</span>
                  </div>
                  <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">
                    Subscribe
                  </h3>
                  <p className="text-purple-700 dark:text-purple-300 text-sm">
                    Unlock premium features
                  </p>
                </Link>
              </>
            )}
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-8 rounded-xl hover-lift btn-gradient text-lg font-medium shadow-lg"
          >
            <span>Go to Dashboard</span>
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 transition-colors duration-300">
      {/* Hero Section with Background Image */}
      <section className="relative py-32 px-4 overflow-hidden">
        {/* Background Image - Only for hero section */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100"
          style={{
            backgroundImage:
              "url('https://media.istockphoto.com/id/1457385092/photo/an-asian-young-technician-service-man-wearing-blue-uniform-checking-cleaning-air-conditioner.jpg?s=612x612&w=0&k=20&c=Tqu5jMzD1TKFO1Fvow6d0JMDsEGU8T3kToP706bQFQI=')",
          }}
        ></div>

        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/90 via-indigo-50/85 to-purple-50/80 dark:from-gray-900/90 dark:via-gray-800/85 dark:to-gray-700/80"></div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Professional Home{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Services
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-200 mb-10 leading-relaxed max-w-3xl mx-auto">
            Connecting you with verified service providers for all your home
            maintenance and repair needs. Book, track, and manage services
            effortlessly.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="/signup"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-5 rounded-xl font-semibold text-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 btn-gradient"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-10 py-5 rounded-xl font-semibold text-xl border-2 border-gray-300 dark:border-gray-600 hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              Login
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white/50 dark:bg-gray-800/50 slide-in">
        <div className="max-w-6xl mx-auto fade-in">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Why Choose Home Service Pro?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-700 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 glass float">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-6 mx-auto pulse">
                <span className="text-white text-2xl">✅</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
                Verified Providers
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                All service providers are thoroughly vetted and
                background-checked for your peace of mind.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-700 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 glass float">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-6 mx-auto pulse">
                <span className="text-white text-2xl">📋</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
                Simple Booking
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                Schedule services with just a few clicks. Choose your preferred
                date and time effortlessly.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-700 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 glass float">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-6 mx-auto pulse">
                <span className="text-white text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
                Secure & Insured
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                Your transactions and data are fully secured. All work is
                covered by insurance.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
