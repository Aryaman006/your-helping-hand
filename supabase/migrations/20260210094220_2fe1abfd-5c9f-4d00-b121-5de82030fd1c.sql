
-- Fix handle_subscription_commission: referrer_id in referrals is already a user_id (from auth.users),
-- not a profiles.id. So we should use it directly for the wallet insert.
CREATE OR REPLACE FUNCTION public.handle_subscription_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  referral_record referrals%rowtype;
  commission_amount numeric := 50;
begin
  -- Only when subscription becomes active
  if new.status != 'active' then
    return new;
  end if;

  -- Find pending referral for this user
  select *
  into referral_record
  from referrals
  where referred_user_id = new.user_id
    and status = 'pending'
  limit 1;

  -- If no referral, exit safely
  if not found then
    return new;
  end if;

  -- Prevent duplicate commission
  if exists (
    select 1
    from commissions
    where referred_user_id = new.user_id
      and subscription_id = new.id
  ) then
    return new;
  end if;

  -- Insert commission record
  insert into commissions (
    referrer_id,
    referred_user_id,
    referral_id,
    subscription_id,
    amount,
    created_at
  ) values (
    referral_record.referrer_id,
    referral_record.referred_user_id,
    referral_record.id,
    new.id,
    commission_amount,
    now()
  );

  -- Ensure wallet exists — referrer_id IS already a user_id
  insert into wallets (user_id, balance)
  values (referral_record.referrer_id, commission_amount)
  on conflict (user_id)
  do update set balance = wallets.balance + commission_amount,
               updated_at = now();

  -- Mark referral as completed
  update referrals
  set status = 'completed'
  where id = referral_record.id;

  return new;
end;
$function$;

-- Also drop the duplicate trigger to avoid double-processing
DROP TRIGGER IF EXISTS trg_handle_referral_commission ON public.subscriptions;
DROP FUNCTION IF EXISTS public.handle_referral_commission();
