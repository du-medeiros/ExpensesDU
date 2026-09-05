# ExpensesDu

ExpensesDu é um assistente financeiro inteligente e conversacional. Diga ao app o que você gastou, e ele automaticamente categoriza, registra e acompanha suas metas. Sem formulários complexos.

## Tecnologias

- **Frontend**: React, Vite, Tailwind CSS, Recharts, VitePWA
- **Backend/DB**: Supabase (PostgreSQL, Auth, Edge Functions)
- **IA**: OpenAI GPT-4o-mini
- **Linguagem**: TypeScript

## Como Rodar Localmente

1. Clone o repositório.
2. Instale as dependências com `npm install`.
3. Inicie o banco de dados local do Supabase:
   ```bash
   npx supabase start
   ```
4. Crie o arquivo `.env` na raiz do projeto (cópia do `.env.example`):
   ```
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=sua-anon-key-local
   ```
5. Crie o arquivo `supabase/functions/.env` para a Edge Function:
   ```
   OPENAI_API_KEY=sk-sua-chave-aqui
   ```
6. Inicie a Edge Function localmente:
   ```bash
   npx supabase functions serve interpretar --env-file supabase/functions/.env
   ```
7. Inicie o servidor frontend:
   ```bash
   npm run dev
   ```

## Gerenciamento do Banco de Dados e Migrations

Para prevenir perda de dados e garantir a segurança do ambiente local:

1. **Backup**: Antes de realizar alterações estruturais, rode o comando abaixo para gerar um backup (apenas dados, não estrutural) em `/backups`:
   ```bash
   npm run backup
   ```
2. **Migrations Imutáveis**: Nunca edite arquivos de migration já aplicados. Mudanças de schema devem ser feitas criando novos arquivos.
3. **Idempotência**: As migrations usam `IF NOT EXISTS` para evitar conflitos, minimizando a necessidade de comandos de reset destrutivos como `supabase db reset`.
4. **Instância Local vs Remota**: Os comandos `supabase` padrão atuam na instância local (`npx supabase start`). Para apontar para produção, configure o `.env` de acordo e use o `supabase link` antes de fazer pushes remotos.

## Deploy na Vercel

O aplicativo está configurado para ser implantado facilmente na Vercel. 
1. Conecte seu repositório do GitHub na Vercel.
2. Configure as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` apontando para o seu projeto Supabase em produção.
3. Não esqueça de publicar sua Edge Function no Supabase também:
   ```bash
   npx supabase functions deploy interpretar
   npx supabase secrets set OPENAI_API_KEY=sk-...
   ```

## Acurácia e Telemetria

O sistema possui uma tabela `events` que registra todas as interações. 
A view `model_calibration_metrics` no banco de dados avalia a confiança do modelo. Se o usuário precisar corrigir a transação frequentemente em palpites de alta confiança (>0.90), o modelo tem "alucinação confiante". Você pode monitorar isso diretamente no SQL Editor do Supabase executando:
```sql
SELECT * FROM model_calibration_metrics;
```
