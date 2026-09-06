-- Rename valor_limite to valor_teto in goals table
ALTER TABLE public.goals 
RENAME COLUMN valor_limite TO valor_teto;
