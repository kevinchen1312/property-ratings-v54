-- Credit System Migration
-- This creates the missing user_credits table and required functions for the credit system

-- Create user_credits table
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create report_redemption table for tracking
CREATE TABLE IF NOT EXISTS report_redemption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint to auth.users (Supabase auth table)
-- Note: This references the auth.users table, not app_user
ALTER TABLE user_credits 
ADD CONSTRAINT fk_user_credits_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_report_redemption_user_id ON report_redemption(user_id);
CREATE INDEX IF NOT EXISTS idx_report_redemption_property_id ON report_redemption(property_id);

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_redemption ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_credits
CREATE POLICY "Users can view their own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits" ON user_credits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credits" ON user_credits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for report_redemption
CREATE POLICY "Users can view their own redemptions" ON report_redemption
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own redemptions" ON report_redemption
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON user_credits TO authenticated;
GRANT ALL ON report_redemption TO authenticated;

-- Function to increment credits if user exists
CREATE OR REPLACE FUNCTION increment_credits_if_exists(
  p_user UUID,
  p_amount INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  -- Try to update existing record
  UPDATE user_credits 
  SET credits = credits + p_amount, updated_at = NOW()
  WHERE user_id = p_user;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  -- If no rows were updated, insert a new record
  IF rows_affected = 0 THEN
    INSERT INTO user_credits (user_id, credits)
    VALUES (p_user, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET 
      credits = user_credits.credits + p_amount,
      updated_at = NOW();
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to debit credits atomically
CREATE OR REPLACE FUNCTION debit_credits(
  p_user UUID,
  p_amount INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Get current credits with row lock
  SELECT credits INTO current_credits
  FROM user_credits
  WHERE user_id = p_user
  FOR UPDATE;
  
  -- Check if user has enough credits
  IF current_credits IS NULL OR current_credits < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Debit the credits
  UPDATE user_credits 
  SET credits = credits - p_amount, updated_at = NOW()
  WHERE user_id = p_user;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user credits safely
CREATE OR REPLACE FUNCTION get_user_credits(p_user UUID DEFAULT auth.uid())
RETURNS INTEGER AS $$
DECLARE
  user_credits_count INTEGER;
BEGIN
  SELECT credits INTO user_credits_count
  FROM user_credits
  WHERE user_id = p_user;
  
  RETURN COALESCE(user_credits_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_user_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_user_credits_updated_at();

-- Insert a success message
SELECT 'Credit system migration completed successfully!' as result;
