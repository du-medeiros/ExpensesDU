CREATE TABLE IF NOT EXISTS pending_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parsed_data jsonb NOT NULL,
  campo_faltante text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index to query pending transactions quickly and for automatic expiration/cleanup if needed
CREATE INDEX IF NOT EXISTS idx_pending_transactions_user_id ON pending_transactions(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE pending_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own pending_transactions" ON pending_transactions;
CREATE POLICY "Users can manage their own pending_transactions" ON pending_transactions FOR ALL USING (auth.uid() = user_id);
