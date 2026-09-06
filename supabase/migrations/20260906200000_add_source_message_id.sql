ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_message_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL;
