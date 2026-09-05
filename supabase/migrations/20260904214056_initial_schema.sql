-- ENUMS
DO $$ BEGIN
  CREATE TYPE tipo_transacao AS ENUM ('despesa', 'receita');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE categoria AS ENUM ('alimentacao', 'transporte', 'moradia', 'saude', 'lazer', 'compras', 'contas', 'outros');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE origem_transacao AS ENUM ('chat', 'manual', 'whatsapp');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE papel_mensagem AS ENUM ('user', 'assistant');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  whatsapp text,
  timezone text DEFAULT 'America/Sao_Paulo',
  created_at timestamptz DEFAULT now()
);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor numeric(12,2) NOT NULL CHECK (valor > 0),
  tipo tipo_transacao NOT NULL,
  categoria categoria NOT NULL,
  data date NOT NULL,
  descricao text NOT NULL,
  origem origem_transacao NOT NULL,
  confianca numeric(3,2),
  foi_corrigida boolean DEFAULT false NOT NULL,
  client_message_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, client_message_id)
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id_data ON transactions(user_id, data DESC);

-- GOALS
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria categoria NOT NULL,
  valor_limite numeric(12,2) NOT NULL,
  mes_referencia date NOT NULL,
  UNIQUE (user_id, categoria, mes_referencia)
);

-- CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  papel papel_mensagem NOT NULL,
  conteudo text NOT NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id_created_at ON chat_messages(user_id, created_at DESC);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
CREATE POLICY "Users can manage their own profile" ON profiles FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can manage their own transactions" ON transactions;
CREATE POLICY "Users can manage their own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own goals" ON goals;
CREATE POLICY "Users can manage their own goals" ON goals FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own chat_messages" ON chat_messages;
CREATE POLICY "Users can manage their own chat_messages" ON chat_messages FOR ALL USING (auth.uid() = user_id);

-- TRIGGER FOR PROFILES
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
