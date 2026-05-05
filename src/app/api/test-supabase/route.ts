import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

type TestResult = {
  data: unknown;
  error: unknown;
  count: number;
};

export async function GET() {
  try {
    console.log("🧪 Testing Supabase connection...");

    // Test multiple tables
    const results: Record<string, TestResult> = {};

    // Test organizational_structure
    const orgResult = await supabase
      .from("organizational_structure")
      .select("id, jabatan");

    results.organizational_structure = {
      data: orgResult.data,
      error: orgResult.error,
      count: orgResult.data?.length || 0
    };

    // Test room_locations
    const roomResult = await supabase
      .from("room_locations")
      .select("id, room_name");

    results.room_locations = {
      data: roomResult.data,
      error: roomResult.error,
      count: roomResult.data?.length || 0
    };

    // Test device
    const deviceResult = await supabase
      .from("device")
      .select("id, name");

    results.device = {
      data: deviceResult.data,
      error: deviceResult.error,
      count: deviceResult.data?.length || 0
    };

    // Test security_checklist_items
    const checklistResult = await supabase
      .from("security_checklist_items")
      .select("id, category, item_text");

    results.security_checklist_items = {
      data: checklistResult.data,
      error: checklistResult.error,
      count: checklistResult.data?.length || 0
    };

    console.log("📊 Test results:", results);

    return NextResponse.json({
      success: true,
      results: results,
      message: "Connection test completed"
    });

  } catch (err) {
    console.error("💥 Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}