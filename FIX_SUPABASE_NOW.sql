-- URGENT: Fix Supabase Schema Cache
-- Copy and paste this ENTIRE file into Supabase SQL Editor
-- Project: ywzuppeybsovxneealjr
-- URL: https://supabase.com/dashboard/project/ywzuppeybsovxneealjr/sql/new

-- Step 1: Add column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'is_love_effect'
    ) THEN
        ALTER TABLE public.messages 
        ADD COLUMN is_love_effect BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Step 2: Reload PostgREST schema cache (THIS IS THE KEY FIX)
SELECT pg_notify('pgrst', 'reload schema');

-- Step 3: Verify it worked
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'messages' 
AND column_name = 'is_love_effect';


