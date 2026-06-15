// Edge Function: delete-account
// Deletes the authenticated user's account and all associated data.
// Auth: requires a valid Supabase Auth JWT in the Authorization header.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1) Verify the caller's JWT
    const authed = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await authed.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = claims.claims.sub as string;

    // 2) Admin client to perform privileged cleanup + deletion
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3) Best-effort cleanup of app data. Most FKs reference auth.users with
    //    ON DELETE CASCADE, but we also clear satellite tables explicitly
    //    so nothing personal is retained.
    const cleanupTables = [
      "wishlist",
      "watch_progress",
      "yogic_points_transactions",
      "device_tokens",
      "media_events",
      "live_session_registrations",
      "course_purchases",
      "payments",
      "subscriptions",
      "referrals",
      "commissions",
      "wallets",
      "withdrawal_requests",
      "corporate_members",
      "mobile_auth_codes",
      "profiles",
    ];

    for (const table of cleanupTables) {
      try {
        await admin.from(table).delete().eq("user_id", userId);
      } catch (_) {
        // ignore per-table failures; continue cleanup
      }
    }

    // referrals also reference the user as referred_user_id
    try {
      await admin.from("referrals").delete().eq("referred_user_id", userId);
    } catch (_) {}

    // 4) Delete the auth user (revokes all sessions + refresh tokens)
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error("deleteUser failed", delErr);
      return new Response(
        JSON.stringify({ error: "Failed to delete account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("delete-account error", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
