-- Fix profiles balance precision (numeric(12,2) → numeric(14,6))
-- so per-click earnings of $0.00002 don't round to $0.00

ALTER TABLE public.profiles
  ALTER COLUMN balance_available TYPE numeric(14,6),
  ALTER COLUMN balance_withdrawn TYPE numeric(14,6);

-- Backfill missing balance from existing earnings_ledger
UPDATE public.profiles p
   SET balance_available = COALESCE(sub.total, 0) - COALESCE(p.balance_withdrawn, 0)
  FROM (
    SELECT user_id, SUM(earnings_usd) AS total
      FROM public.earnings_ledger
     GROUP BY user_id
  ) sub
 WHERE sub.user_id = p.id;
