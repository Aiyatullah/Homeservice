import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";

export async function POST(req: Request) {
  try {
    const { userId, email, role, full_name } = await req.json();

    if (!userId || !email || !role || !full_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase.from("profiles").insert({
      id: userId,
      email,
      role,
      full_name,
    });

    if (error) {
      console.error("Error inserting profile:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Role assigned!" });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
