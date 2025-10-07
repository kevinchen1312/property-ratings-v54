-- Fix credit sync issue
-- This updates the complete_credit_purchase function to handle retries better

CREATE OR REPLACE FUNCTION complete_credit_purchase(
  p_stripe_session_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  purchase_record credit_purchase%ROWTYPE;
  current_credits INTEGER;
  retry_count INTEGER;
BEGIN
  -- Get the purchase record (allow pending OR already completed for idempotency)
  SELECT * INTO purchase_record
  FROM credit_purchase
  WHERE stripe_session_id = p_stripe_session_id
    AND status IN ('pending', 'completed');
  
  IF NOT FOUND THEN
    -- Check if it was marked as failed
    SELECT * INTO purchase_record
    FROM credit_purchase
    WHERE stripe_session_id = p_stripe_session_id
      AND status = 'failed';
    
    IF FOUND THEN
      -- Log the failed purchase for debugging
      RAISE WARNING 'Purchase % was previously marked as failed. Attempting retry.', purchase_record.id;
      
      -- Reset to pending to allow retry
      UPDATE credit_purchase 
      SET status = 'pending', updated_at = NOW()
      WHERE id = purchase_record.id;
      
      -- Refetch the record
      SELECT * INTO purchase_record
      FROM credit_purchase
      WHERE id = purchase_record.id;
    ELSE
      RAISE EXCEPTION 'Purchase not found for session %', p_stripe_session_id;
    END IF;
  END IF;
  
  -- If already completed, return success (idempotency)
  IF purchase_record.status = 'completed' THEN
    RAISE NOTICE 'Purchase % already completed, returning success', purchase_record.id;
    RETURN TRUE;
  END IF;
  
  -- Update purchase status to completed
  UPDATE credit_purchase 
  SET status = 'completed', updated_at = NOW()
  WHERE id = purchase_record.id;
  
  -- Add credits to user account
  INSERT INTO user_credits (user_id, credits)
  VALUES (purchase_record.user_id, purchase_record.credits)
  ON CONFLICT (user_id) DO UPDATE SET 
    credits = user_credits.credits + purchase_record.credits,
    updated_at = NOW();
  
  RAISE NOTICE 'Successfully added % credits to user %', purchase_record.credits, purchase_record.user_id;
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but DON'T mark as failed yet (allow Stripe to retry)
    RAISE WARNING 'Error processing credit purchase %: % - %', purchase_record.id, SQLERRM, SQLSTATE;
    
    -- Only mark as failed if this has been retried multiple times
    -- Check metadata for retry count
    retry_count := COALESCE((purchase_record.metadata->>'retry_count')::INTEGER, 0);
    
    IF retry_count >= 3 THEN
      -- After 3 retries, mark as failed
      UPDATE credit_purchase 
      SET 
        status = 'failed', 
        updated_at = NOW(),
        metadata = COALESCE(metadata, '{}'::jsonb) || 
                   jsonb_build_object('error', SQLERRM, 'error_state', SQLSTATE, 'retry_count', retry_count + 1)
      WHERE id = purchase_record.id;
    ELSE
      -- Increment retry count but keep as pending
      UPDATE credit_purchase 
      SET 
        updated_at = NOW(),
        metadata = COALESCE(metadata, '{}'::jsonb) || 
                   jsonb_build_object('retry_count', retry_count + 1, 'last_error', SQLERRM)
      WHERE id = purchase_record.id;
    END IF;
    
    -- Re-raise the exception so webhook knows to retry
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a function to manually retry failed purchases
CREATE OR REPLACE FUNCTION retry_failed_credit_purchase(
  p_stripe_session_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  purchase_record credit_purchase%ROWTYPE;
BEGIN
  -- Get the failed purchase
  SELECT * INTO purchase_record
  FROM credit_purchase
  WHERE stripe_session_id = p_stripe_session_id
    AND status = 'failed';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No failed purchase found for session %', p_stripe_session_id;
  END IF;
  
  -- Reset to pending
  UPDATE credit_purchase 
  SET 
    status = 'pending', 
    updated_at = NOW(),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('retry_count', 0, 'manual_retry', true)
  WHERE id = purchase_record.id;
  
  -- Now try to complete it
  RETURN complete_credit_purchase(p_stripe_session_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Query to find purchases that need retry
SELECT 
  'To retry failed purchases, run:' as message,
  'SELECT retry_failed_credit_purchase(''' || stripe_session_id || ''');' as command
FROM credit_purchase
WHERE status = 'failed'
ORDER BY created_at DESC;
