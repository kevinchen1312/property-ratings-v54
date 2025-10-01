-- Credit-Based Revenue Sharing Migration
-- This updates the revenue sharing system to work with credit redemptions

-- First, create report_redemption table if it doesn't exist
CREATE TABLE IF NOT EXISTS report_redemption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  credits_used INTEGER NOT NULL DEFAULT 1,
  revenue_value DECIMAL(10,2) NOT NULL DEFAULT 10.00, -- Standard $10 per credit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_report_redemption_user_id ON report_redemption(user_id);
CREATE INDEX IF NOT EXISTS idx_report_redemption_property_id ON report_redemption(property_id);
CREATE INDEX IF NOT EXISTS idx_report_redemption_created_at ON report_redemption(created_at);

-- Enable RLS
ALTER TABLE report_redemption ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Users can view their own redemptions" ON report_redemption;
CREATE POLICY "Users can view their own redemptions" ON report_redemption
  FOR SELECT USING (auth.uid() = user_id);

-- Make purchase_id nullable in revenue_distribution to support both direct purchases and credit redemptions
ALTER TABLE revenue_distribution 
  ALTER COLUMN purchase_id DROP NOT NULL;

-- Add redemption_id column to revenue_distribution
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'revenue_distribution' AND column_name = 'redemption_id'
  ) THEN
    ALTER TABLE revenue_distribution 
    ADD COLUMN redemption_id UUID REFERENCES report_redemption(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index
CREATE INDEX IF NOT EXISTS idx_revenue_distribution_redemption_id ON revenue_distribution(redemption_id);

-- Add constraint to ensure either purchase_id or redemption_id is set (but not both)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'revenue_distribution_source_check'
  ) THEN
    ALTER TABLE revenue_distribution 
    ADD CONSTRAINT revenue_distribution_source_check 
    CHECK (
      (purchase_id IS NOT NULL AND redemption_id IS NULL) OR 
      (purchase_id IS NULL AND redemption_id IS NOT NULL)
    );
  END IF;
END $$;

-- Grant permissions
GRANT ALL ON report_redemption TO authenticated;
GRANT ALL ON report_redemption TO service_role;

SELECT '✅ Credit-based revenue sharing migration completed successfully!' as result;

