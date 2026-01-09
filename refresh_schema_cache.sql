-- Quick fix: Refresh PostgREST schema cache
-- Run this in Supabase SQL Editor for project: ywzuppeybsovxneealjr

-- Reload PostgREST schema cache (this will pick up the is_love_effect column)
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'messages' 
AND column_name = 'is_love_effect';

