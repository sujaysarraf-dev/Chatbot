-- Copy this entire SQL and run it in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/ywzuppeybsovxneealjr/sql/new

-- Add column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'is_love_effect'
    ) THEN
        ALTER TABLE public.messages 
        ADD COLUMN is_love_effect BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Reload schema cache (THIS FIXES THE ERROR)
SELECT pg_notify('pgrst', 'reload schema');

