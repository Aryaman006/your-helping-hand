import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const { amount, upi_id, bank_account_number, bank_ifsc, bank_name } = await req.json();

    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error("Invalid withdrawal amount");
    }

    // Must provide UPI or bank details
    if (!upi_id && !bank_account_number) {
      throw new Error("Please provide UPI ID or bank account details");
    }

    // Check wallet balance
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (!wallet || wallet.balance < amount) {
      throw new Error("Insufficient wallet balance");
    }

    // Check for existing pending withdrawal
    const { data: pendingWithdrawal } = await supabase
      .from("withdrawal_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingWithdrawal) {
      throw new Error("You already have a pending withdrawal request");
    }

    // Create withdrawal request (balance is NOT deducted yet - admin does it)
    const { data: withdrawal, error: insertError } = await supabase
      .from("withdrawal_requests")
      .insert({
        user_id: userId,
        amount,
        upi_id: upi_id || null,
        bank_account_number: bank_account_number || null,
        bank_ifsc: bank_ifsc || null,
        bank_name: bank_name || null,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      throw new Error("Failed to create withdrawal request");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Withdrawal request submitted. Admin will review and process it.",
        withdrawal,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
