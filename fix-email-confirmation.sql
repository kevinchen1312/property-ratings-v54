-- Fix Email Confirmation for Mobile Apps
-- This disables email confirmation requirement for development
-- Run this in Supabase SQL Editor

-- Option 1: Disable email confirmation (easiest for development)
-- Go to Supabase Dashboard > Authentication > Providers > Email
-- Turn OFF "Confirm email"

-- Option 2: Auto-confirm new users (if you want to keep confirmation enabled but skip it for now)
-- This trigger will auto-confirm users when they sign up

CREATE OR REPLACE FUNCTION auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm the user's email
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = NEW.id
  AND email_confirmed_at IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;

-- Create trigger to auto-confirm users
CREATE TRIGGER on_auth_user_auto_confirm
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_user();

SELECT 'Email auto-confirmation enabled! Users will be confirmed automatically.' as status;

