-- Remove public SELECT policy on coupons table to prevent coupon code exposure
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;