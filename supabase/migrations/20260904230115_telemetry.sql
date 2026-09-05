DO $$ BEGIN
  CREATE TYPE event_type AS ENUM (
    'mensagem_enviada',
    'transacao_criada',
    'transacao_corrigida',
    'esclarecimento_solicitado',
    'esclarecimento_respondido',
    'parser_falhou',
    'meta_criada',
    'dica_exibida',
    'resumo_aberto'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_evento event_type NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert their own events" ON events;
CREATE POLICY "Users can insert their own events" ON events FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Using select for telemetry isn't strictly necessary for the client, but let's allow it so users can read their own.
DROP POLICY IF EXISTS "Users can read their own events" ON events;
CREATE POLICY "Users can read their own events" ON events FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW model_calibration_metrics WITH (security_invoker=true) AS
SELECT
  user_id,
  CASE 
    WHEN confianca >= 0.90 THEN 'Alta (>=0.90)'
    WHEN confianca >= 0.80 THEN 'Média (0.80 - 0.89)'
    ELSE 'Baixa (<0.80)'
  END AS faixa_confianca,
  COUNT(*) as total_transacoes,
  SUM(CASE WHEN foi_corrigida = true THEN 1 ELSE 0 END) as total_corrigidas,
  ROUND(
    (SUM(CASE WHEN foi_corrigida = true THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100,
    2
  ) as taxa_erro_percentual
FROM transactions
WHERE origem = 'chat' AND confianca IS NOT NULL
GROUP BY 
  user_id,
  CASE 
    WHEN confianca >= 0.90 THEN 'Alta (>=0.90)'
    WHEN confianca >= 0.80 THEN 'Média (0.80 - 0.89)'
    ELSE 'Baixa (<0.80)'
  END;
