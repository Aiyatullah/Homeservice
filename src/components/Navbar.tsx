"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/client";
import Signout from "./Signout";
import NotificationsPanel from "./NotificationsPanel";
import { useNotifications } from "@/hooks/useNotifications";
import { ModeToggle } from "./Toggle";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

const ListItem = React.forwardRef<
  React.ElementRef<"li">,
  React.ComponentPropsWithoutRef<"li"> & { href: string; title: string }
>(({ className, title, children, href, ...props }, ref) => {
  return (
    <li ref={ref} {...props}>
      <NavigationMenuLink asChild>
        <Link
          href={href}
          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const supabase = createClient();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  const [userState, setUserState] = useState(() => ({
    isAuthenticated: false,
    userRole: null as string | null,
    hasPendingPayments: false,
  }));

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

          const { data: pendingBookings } = await supabase
            .from("service_bookings")
            .select("id")
            .eq("customer_id", user.id)
            .eq("status", "AWAITING_PAYMENT");

          setUserState({
            isAuthenticated: true,
            userRole: profile?.role || null,
            hasPendingPayments: Boolean(pendingBookings && pendingBookings.length > 0),
          });
        } else {
          setUserState({
            isAuthenticated: false,
            userRole: null,
            hasPendingPayments: false,
          });
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      }
    };

    checkUser();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);

      if (event === "SIGNED_IN" && session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        const { data: pendingBookings } = await supabase
          .from("service_bookings")
          .select("id")
          .eq("customer_id", session.user.id)
          .eq("status", "AWAITING_PAYMENT");

        setUserState({
          isAuthenticated: true,
          userRole: profile?.role || null,
          hasPendingPayments: Boolean(pendingBookings && pendingBookings.length > 0),
        });
      } else if (event === "SIGNED_OUT") {
        setUserState({
          isAuthenticated: false,
          userRole: null,
          hasPendingPayments: false,
        });
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const { isAuthenticated, userRole, hasPendingPayments } = userState;

  return (
    <>
      <nav className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Home Service Pro
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex">
              <NavigationMenu viewport={false}>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>Home</NavigationMenuTrigger>
                    <NavigationMenuContent className="z-[9999]">
                      <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                        <li className="row-span-3">
                          <NavigationMenuLink asChild>
                            <Link
                              href="/"
                              className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-hidden focus:shadow-md"
                            >
                              <div className="mb-2 mt-4 text-lg font-medium">
                                Home Service Pro
                              </div>
                              <p className="text-sm leading-tight text-muted-foreground">
                                Professional home services for your every need.
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                        <ListItem href="/dashboard" title="Dashboard">
                          Overview of your services and activities
                        </ListItem>
                        <ListItem href="/services" title="Services">
                          Browse and book professional home services
                        </ListItem>
                        <ListItem href="/features" title="Features">
                          Discover our premium features
                        </ListItem>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  {isAuthenticated && (
                    <NavigationMenuItem>
                      <NavigationMenuTrigger>
                        {userRole === "customer" ? "Services" : "Active Services"}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent className="z-[9999]">
                        <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                          <ListItem href="/dashboard" title="📊 Dashboard">
                            Overview of your activities
                          </ListItem>
                          {userRole === "customer" ? (
                            <>
                              <ListItem href="/services" title="🏷️ Services">
                                Find and book home services
                              </ListItem>
                              <ListItem href="/feedback" title="💬 Feedback">
                                Share your experience
                              </ListItem>
                              {hasPendingPayments && (
                                <ListItem href="/pay-services" title="💳 Pay Services">
                                  Complete pending payments
                                </ListItem>
                              )}
                            </>
                          ) : (
                            <ListItem href="/active-services" title="🔧 Active Services">
                              Manage your current bookings
                            </ListItem>
                          )}
                          <ListItem href="/subscription" title="⭐ Subscribe">
                            Unlock premium features
                          </ListItem>
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  )}

                  {isAuthenticated && (
                    <NavigationMenuItem>
                      <NavigationMenuTrigger>Account</NavigationMenuTrigger>
                      <NavigationMenuContent className="z-[9999]">
                        <ul className="grid w-[300px] gap-3 p-4">
                          <ListItem href="/subscription" title="⭐ Subscribe">
                            Unlock premium features
                          </ListItem>
                          {userRole === "customer" && hasPendingPayments && (
                            <ListItem href="/pay-services" title="💳 Pay Services">
                              Complete pending payments
                            </ListItem>
                          )}
                          <li className="row-span-3">
                            <Signout />
                          </li>
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  )}

                  {!isAuthenticated && (
                    <NavigationMenuItem>
                      <NavigationMenuTrigger>Discover</NavigationMenuTrigger>
                      <NavigationMenuContent className="z-[9999]">
                        <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                          <li className="row-span-3">
                            <NavigationMenuLink asChild>
                              <Link
                                href="/"
                                className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-hidden focus:shadow-md"
                              >
                                <div className="mb-2 mt-4 text-lg font-medium">
                                  Home Service Pro
                                </div>
                                <p className="text-sm leading-tight text-muted-foreground">
                                  Professional home services platform.
                                </p>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                          <ListItem href="/about" title="📖 About">
                            Learn about our service
                          </ListItem>
                          <ListItem href="/features" title="✨ Features">
                            Explore our features
                          </ListItem>
                          <ListItem href="/login" title="🔐 Login">
                            Sign in to your account
                          </ListItem>
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  )}

                  {/* Auth Links */}
                  {!isAuthenticated && (
                    <>
                      <NavigationMenuItem>
                        <Link href="/login">
                          Login
                        </Link>
                      </NavigationMenuItem>
                      <NavigationMenuItem>
                        <Link href="/signup" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                          Sign Up
                        </Link>
                      </NavigationMenuItem>
                    </>
                  )}

                  {/* Theme Toggle */}
                  <NavigationMenuItem>
                    <ModeToggle />
                  </NavigationMenuItem>

                  {/* Notifications */}
                  {isAuthenticated && (
                    <NavigationMenuItem>
                      <button
                        onClick={() => setShowNotifications(true)}
                        className="h-9 w-9 bg-transparent hover:bg-accent rounded p-1.5 relative"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 17h5l-5-5V7h-5v5l5 5zM12 2A10 10 0 002 12a10 10 0 1010 8"
                          />
                        </svg>
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                      </button>
                    </NavigationMenuItem>
                  )}
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              {isAuthenticated && (
                <button
                  onClick={() => setShowNotifications(true)}
                  className="h-9 w-9 bg-transparent hover:bg-accent rounded p-1.5 relative"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-5-5V7h-5v5l5 5zM12 2A10 10 0 002 12a10 10 0 1010 8"
                    />
                  </svg>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                </button>
              )}

              <ModeToggle />

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="h-9 w-9 bg-transparent hover:bg-accent rounded p-1.5"
              >
                <span className="sr-only">Open menu</span>
                {isMenuOpen ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-background border-t z-50">
            <div className="px-4 py-3 space-y-2 max-h-96 overflow-y-auto">
              <Link href="/" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium rounded-md hover:bg-accent">
                Home
              </Link>

              {isAuthenticated ? (
                <>
                  <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium rounded-md hover:bg-accent">
                    📊 Dashboard
                  </Link>
                  {userRole === "customer" ? (
                    <>
                      <Link href="/services" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium rounded-md hover:bg-accent">
                        🏷️ Services
                      </Link>
                      <Link href="/feedback" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium rounded-md hover:bg-accent">
                        💬 Feedback
                      </Link>
                      {hasPendingPayments && (
                        <Link href="/pay-services" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-md">
                          💳 Pay Services
                        </Link>
                      )}
                    </>
                  ) : (
                    <Link href="/active-services" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium rounded-md hover:bg-accent">
                      🔧 Active Services
                    </Link>
                  )}
                  <Link href="/subscription" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium rounded-md hover:bg-accent">
                    ⭐ Subscribe
                  </Link>
                  <div className="pt-2 border-t">
                    <Signout />
                  </div>
                </>
              ) : (
                <>
                  <Link href="/about" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium rounded-md hover:bg-accent">
                    📖 About
                  </Link>
                  <Link href="/features" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium rounded-md hover:bg-accent">
                    ✨ Features
                  </Link>
                  <Link href="/login" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium rounded-md hover:bg-accent">
                    🔐 Login
                  </Link>
                  <Link href="/signup" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md">
                    📝 Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkRead={markAsRead}
        onMarkAllRead={markAllAsRead}
      />
    </>
  );
}
