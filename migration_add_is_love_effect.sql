-- Migration: Add is_love_effect column to messages table
-- Project: ywzuppeybsovxneealjr
-- Run this via Supabase MCP or SQL Editor

-- Add the column if it doesn't exist
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

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

