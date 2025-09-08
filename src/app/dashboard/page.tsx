import { createClient } from "@/lib/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // ✅ role-based redirect (all logic in one place)
  switch (profile.role) {
    case "admin":
      return redirect("/dashboard/admin");
    case "customer":
      return redirect("/dashboard/customer");
    case "service_provider":
      return redirect("/dashboard/provider");
    default:
      return redirect("/login");
  }
}
