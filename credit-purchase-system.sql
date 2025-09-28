-- Credit Purchase System Migration
-- This creates the credit purchase table and updates the webhook handler

-- Create credit_purchase table
CREATE TABLE IF NOT EXISTS credit_purchase (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  package_id TEXT NOT NULL,
  credits INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint to auth.users
ALTER TABLE credit_purchase 
ADD CONSTRAINT fk_credit_purchase_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_purchase_user_id ON credit_purchase(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchase_stripe_session ON credit_purchase(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchase_status ON credit_purchase(status);
CREATE INDEX IF NOT EXISTS idx_credit_purchase_created_at ON credit_purchase(created_at);

-- Enable RLS
ALTER TABLE credit_purchase ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_purchase
CREATE POLICY "Users can view their own credit purchases" ON credit_purchase
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit purchases" ON credit_purchase
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON credit_purchase TO authenticated;

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_credit_purchase_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_credit_purchase_updated_at ON credit_purchase;
CREATE TRIGGER trigger_update_credit_purchase_updated_at
  BEFORE UPDATE ON credit_purchase
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_purchase_updated_at();

-- Function to process credit purchase completion
CREATE OR REPLACE FUNCTION complete_credit_purchase(
  p_stripe_session_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  purchase_record credit_purchase%ROWTYPE;
  current_credits INTEGER;
BEGIN
  -- Get the purchase record
  SELECT * INTO purchase_record
  FROM credit_purchase
  WHERE stripe_session_id = p_stripe_session_id
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase not found or already processed';
  END IF;
  
  -- Update purchase status
  UPDATE credit_purchase 
  SET status = 'completed', updated_at = NOW()
  WHERE id = purchase_record.id;
  
  -- Add credits to user account
  INSERT INTO user_credits (user_id, credits)
  VALUES (purchase_record.user_id, purchase_record.credits)
  ON CONFLICT (user_id) DO UPDATE SET 
    credits = user_credits.credits + purchase_record.credits,
    updated_at = NOW();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Mark purchase as failed
    UPDATE credit_purchase 
    SET status = 'failed', updated_at = NOW()
    WHERE id = purchase_record.id;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert success message
SELECT 'Credit purchase system migration completed successfully!' as result;
