-- Fix Rating Permissions - Temporary Solution
-- This script fixes the RLS policies for rating submissions

-- First, let's temporarily disable RLS to allow testing
ALTER TABLE rating DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with proper policies
ALTER TABLE rating ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all ratings" ON rating;
DROP POLICY IF EXISTS "Users can insert their own ratings" ON rating;
DROP POLICY IF EXISTS "Users can update their own ratings" ON rating;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON rating;

-- Create new, more permissive policies for testing
CREATE POLICY "Anyone can view ratings" ON rating
    FOR SELECT USING (true);

-- Allow authenticated users to insert ratings (less restrictive for testing)
CREATE POLICY "Authenticated users can insert ratings" ON rating
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own ratings
CREATE POLICY "Users can update their own ratings" ON rating
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Allow users to delete their own ratings  
CREATE POLICY "Users can delete their own ratings" ON rating
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Grant necessary permissions
GRANT ALL ON rating TO authenticated;

-- Add a comment for tracking
COMMENT ON TABLE rating IS 'Ratings table with temporarily relaxed RLS policies for testing';
