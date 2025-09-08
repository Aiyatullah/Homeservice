"use client";
import { createClient } from "@/lib/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function Signout() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error.message);
        alert("An error occurred while signing out. Please try again.");
        return;
      }
      // Redirect to login after logout
      router.refresh()
      router.push("/login");
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className="bg-red-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-600 transition duration-300 disabled:bg-red-300 disabled:cursor-not-allowed"
    >
      {isLoading ? "Signing out..." : "Sign out"}
    </button>
  );
}
