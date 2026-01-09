-- Fix Supabase schema for project: ywzuppeybsovxneealjr.supabase.co
-- Run this in your Supabase SQL Editor

-- Step 1: Add is_love_effect column to messages table if it doesn't exist
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
        
        RAISE NOTICE 'Column is_love_effect added successfully';
    ELSE
        RAISE NOTICE 'Column is_love_effect already exists';
    END IF;
END $$;

-- Step 2: Reload PostgREST schema cache to pick up the new column
SELECT pg_notify('pgrst', 'reload schema');

-- Step 3: Verify the column exists
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'messages' 
AND column_name = 'is_love_effect';

