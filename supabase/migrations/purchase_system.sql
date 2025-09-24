-- Purchase System Database Schema

-- Create purchase table
CREATE TABLE IF NOT EXISTS purchase (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Customer details
  email TEXT NOT NULL,
  customer_name TEXT,
  
  -- Stripe details
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  
  -- Purchase details
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create purchase_item table
CREATE TABLE IF NOT EXISTS purchase_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign keys
  purchase_id UUID NOT NULL REFERENCES purchase(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES property(id),
  
  -- Item details
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  
  -- Report generation
  report_url TEXT,
  report_generated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_purchase_email ON purchase(email);
CREATE INDEX IF NOT EXISTS idx_purchase_stripe_session ON purchase(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_purchase_status ON purchase(status);
CREATE INDEX IF NOT EXISTS idx_purchase_item_purchase ON purchase_item(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_item_property ON purchase_item(property_id);

-- Add RLS policies
ALTER TABLE purchase ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_item ENABLE ROW LEVEL SECURITY;

-- Purchase policies (customers can only see their own purchases)
CREATE POLICY "Users can view their own purchases" ON purchase
  FOR SELECT USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Service role can manage all purchases" ON purchase
  FOR ALL USING (auth.role() = 'service_role');

-- Purchase item policies
CREATE POLICY "Users can view their own purchase items" ON purchase_item
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM purchase 
      WHERE purchase.id = purchase_item.purchase_id 
      AND purchase.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Service role can manage all purchase items" ON purchase_item
  FOR ALL USING (auth.role() = 'service_role');

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_purchase_updated_at 
  BEFORE UPDATE ON purchase 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

