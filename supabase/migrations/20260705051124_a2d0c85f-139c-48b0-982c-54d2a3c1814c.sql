-- Fix withdrawal amount precision to allow micro-payouts
ALTER TABLE public.withdrawals ALTER COLUMN amount_usd TYPE numeric(14,6);

-- Drop old check constraint if too strict, recreate to allow > 0
ALTER TABLE public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_amount_usd_check;
ALTER TABLE public.withdrawals ADD CONSTRAINT withdrawals_amount_usd_check CHECK (amount_usd > 0);

-- Fix injection threshold: earnings ledger assumes 1/20 (5%), align app_settings
UPDATE public.app_settings SET injection_threshold = 20 WHERE injection_threshold <> 20;