import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { UserLayout } from "@/components/layout/UserLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Check, Sparkles, Video, Calendar, Shield, ArrowRight, Loader2 } from "lucide-react";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal: {
    ondismiss: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

const SubscribePage: React.FC = () => {
  const { user, hasActiveSubscription, refreshSubscriptionStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const basePrice = 999;
  const gstRate = 0.05;
  const discountedPrice = basePrice - discount;
  const gstAmount = discountedPrice * gstRate;
  const totalAmount = discountedPrice + gstAmount;

  const features = [
    { icon: Video, text: "Unlimited access to all premium videos" },
    { icon: Calendar, text: "Join exclusive live yoga sessions" },
    { icon: Sparkles, text: "Earn 2x Yogic Points on all sessions" },
    { icon: Shield, text: "Ad-free experience" },
  ];

  /* ===============================
     AUTO LOGIN FROM APP TOKENS
  =============================== */

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (!access_token || !refresh_token) return;

    const autoLogin = async () => {
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        console.error("Auto login failed:", error.message);
        return;
      }

      await refreshSubscriptionStatus();

      // Clean URL after login
      navigate("/subscribe", { replace: true });
    };

    autoLogin();
  }, [location.search]);

  /* ===============================
     LOAD RAZORPAY SCRIPT
  =============================== */

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  /* ===============================
     APPLY COUPON
  =============================== */

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);

    const response = await supabase.functions.invoke("validate-coupon", {
      body: { code: couponCode, baseAmount: basePrice },
    });

    if (response.error) {
      toast.error("Invalid coupon code");
      setIsApplyingCoupon(false);
      return;
    }

    const result = response.data;

    setDiscount(result.discount || 0);
    toast.success(result.message || "Coupon applied");

    setIsApplyingCoupon(false);
  };

  /* ===============================
     SUBSCRIBE HANDLER
  =============================== */

  const handleSubscribe = async () => {
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }

    if (!window.Razorpay) {
      toast.error("Payment system loading...");
      return;
    }

    setIsProcessing(true);

    try {
      const orderResponse = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount: basePrice, couponCode: couponCode || undefined },
      });

      if (orderResponse.error) {
        throw new Error("Failed to create order");
      }

      const { orderId, amount, keyId, prefill, notes } = orderResponse.data;

      const options: RazorpayOptions = {
        key: keyId,
        amount,
        currency: "INR",
        name: "PLAYoga",
        description: "Premium Yearly Subscription",
        order_id: orderId,
        prefill: {
          name: prefill.name || "",
          email: prefill.email || "",
          contact: "",
        },
        theme: { color: "#D4A574" },
        handler: async (response: RazorpayResponse) => {
          const verifyResponse = await supabase.functions.invoke("verify-razorpay-payment", {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              couponId: notes.couponId,
              baseAmount: notes.baseAmount,
              gstAmount: notes.gstAmount,
              discountAmount: notes.discount,
              totalAmount: amount / 100,
            },
          });

          if (verifyResponse.error) {
            toast.error("Payment verification failed");
            setIsProcessing(false);
            return;
          }

          toast.success("Payment successful 🎉");
          await refreshSubscriptionStatus();
          navigate("/browse");
          setIsProcessing(false);
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            toast.info("Payment cancelled");
          },
        },
      };

      new window.Razorpay(options).open();
    } catch (error) {
      toast.error("Payment failed");
      setIsProcessing(false);
    }
  };

  /* ===============================
     ALREADY SUBSCRIBED
  =============================== */

  if (hasActiveSubscription) {
    return (
      <UserLayout>
        <div className="content-container py-16 text-center">
          <Crown className="w-12 h-12 text-success mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-4">You're Already Premium!</h1>
          <Button asChild>
            <Link to="/browse">Browse Content</Link>
          </Button>
        </div>
      </UserLayout>
    );
  }

  /* ===============================
     MAIN UI
  =============================== */

  return (
    <UserLayout>
      <div className="content-container py-12 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Unlock Your Full Potential</h1>
          <p className="text-muted-foreground">Unlimited yoga classes & premium content.</p>
        </div>

        <div className="bg-card border rounded-3xl p-8">
          <div className="text-center mb-6">
            <span className="text-5xl font-bold">₹{totalAmount.toFixed(2)}</span>
            <span className="text-muted-foreground"> / year</span>
          </div>

          <div className="flex gap-2 mb-6">
            <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Coupon code" />
            <Button onClick={applyCoupon} disabled={isApplyingCoupon}>
              {isApplyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
            </Button>
          </div>

          <Button onClick={handleSubscribe} disabled={isProcessing} className="w-full">
            {isProcessing ? "Processing..." : "Subscribe Now"}
          </Button>
        </div>
      </div>
    </UserLayout>
  );
};

export default SubscribePage;
