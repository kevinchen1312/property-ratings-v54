-- Revenue Sharing System Database Schema (Ultra Safe Version)
-- Run this in your Supabase SQL Editor - handles all existing objects gracefully

-- Table to track contributor statistics per property
CREATE TABLE IF NOT EXISTS property_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_ratings INTEGER NOT NULL DEFAULT 0,
  last_rating_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'property_contributors_property_id_user_id_key'
  ) THEN
    ALTER TABLE property_contributors ADD CONSTRAINT property_contributors_property_id_user_id_key UNIQUE(property_id, user_id);
  END IF;
END $$;

-- Table to track revenue distribution for each sale
CREATE TABLE IF NOT EXISTS revenue_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchase(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  
  -- Revenue breakdown
  total_revenue DECIMAL(10,2) NOT NULL,
  platform_share DECIMAL(10,2) NOT NULL, -- 70%
  top_contributor_share DECIMAL(10,2) NOT NULL, -- 10%
  other_contributors_share DECIMAL(10,2) NOT NULL, -- 10%
  
  -- Top contributor info
  top_contributor_id UUID REFERENCES auth.users(id),
  top_contributor_rating_count INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track individual contributor payouts
CREATE TABLE IF NOT EXISTS contributor_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revenue_distribution_id UUID NOT NULL REFERENCES revenue_distribution(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Payout details
  payout_amount DECIMAL(10,2) NOT NULL,
  rating_count INTEGER NOT NULL, -- How many ratings this contributor had
  is_top_contributor BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Payout status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  payout_method TEXT, -- 'paypal', 'stripe', 'bank_transfer', etc.
  payout_reference TEXT, -- External payment reference
  paid_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_contributors_property_id ON property_contributors(property_id);
CREATE INDEX IF NOT EXISTS idx_property_contributors_user_id ON property_contributors(user_id);
CREATE INDEX IF NOT EXISTS idx_property_contributors_last_rating ON property_contributors(last_rating_at);

CREATE INDEX IF NOT EXISTS idx_revenue_distribution_purchase_id ON revenue_distribution(purchase_id);
CREATE INDEX IF NOT EXISTS idx_revenue_distribution_property_id ON revenue_distribution(property_id);

CREATE INDEX IF NOT EXISTS idx_contributor_payouts_user_id ON contributor_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_contributor_payouts_status ON contributor_payouts(status);

-- Enable RLS
ALTER TABLE property_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_payouts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own contributions" ON property_contributors;
DROP POLICY IF EXISTS "Users can view their own payouts" ON contributor_payouts;
DROP POLICY IF EXISTS "Admins can view all revenue data" ON revenue_distribution;
DROP POLICY IF EXISTS "Admins can manage payouts" ON contributor_payouts;

-- RLS Policies
CREATE POLICY "Users can view their own contributions" ON property_contributors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own payouts" ON contributor_payouts
  FOR SELECT USING (auth.uid() = user_id);

-- Admin policies (you'll need to create an admin role)
CREATE POLICY "Admins can view all revenue data" ON revenue_distribution
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage payouts" ON contributor_payouts
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Drop existing trigger and function safely (in correct order)
DROP TRIGGER IF EXISTS trigger_update_contributor_stats ON rating;
DROP FUNCTION IF EXISTS update_contributor_stats();

-- Function to update contributor stats when a rating is added
CREATE OR REPLACE FUNCTION update_contributor_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update contributor stats
  INSERT INTO property_contributors (property_id, user_id, total_ratings, last_rating_at)
  VALUES (NEW.property_id, NEW.user_id, 1, NEW.created_at)
  ON CONFLICT (property_id, user_id)
  DO UPDATE SET
    total_ratings = property_contributors.total_ratings + 1,
    last_rating_at = NEW.created_at,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update contributor stats
CREATE TRIGGER trigger_update_contributor_stats
  AFTER INSERT ON rating
  FOR EACH ROW
  EXECUTE FUNCTION update_contributor_stats();

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_top_contributor(UUID);

-- Function to get top contributor for a property in the past month
CREATE OR REPLACE FUNCTION get_top_contributor(property_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  rating_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.user_id,
    COUNT(*) as rating_count
  FROM rating r
  WHERE r.property_id = property_uuid
    AND r.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY r.user_id
  ORDER BY COUNT(*) DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

SELECT 'Revenue sharing schema applied successfully!' as result;
