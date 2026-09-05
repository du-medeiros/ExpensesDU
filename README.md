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

## Separação de Ambientes (Dev vs Prod)

Este projeto segue a arquitetura de **Isolamento de Ambientes**. Existem dois projetos Supabase completamente distintos para evitar que testes e dados falsos se misturem com a produção, ou que resets de banco apaguem dados reais acidentalmente.

### 1. Supabase de Desenvolvimento (Local ou Nuvem Dev)
- **Uso:** Criação de novas tabelas, testes do agente, mock de transações.
- **Vercel Preview Deployments:** Qualquer PR no GitHub irá gerar uma URL de Preview que **deve apontar para este banco de desenvolvimento**. 

### 2. Supabase de Produção (Exclusivo)
- **Uso:** Dados reais dos usuários finais.
- **Deploy:** A branch `master` é automaticamente implantada na Vercel para Produção e **deve apontar para este banco de produção**.

## Como fazer Deploy para Produção

Se você acabou de criar o **Supabase de Produção**, execute os seguintes passos no terminal para subir a infraestrutura:

1. Autentique-se e linke o projeto apontando para o *Reference ID* da Produção:
   ```bash
   npx supabase login
   npx supabase link --project-ref [REF_DA_PRODUCAO]
   ```
2. Empurre as Migrations para a Nuvem de Produção:
   ```bash
   npx supabase db push
   ```
3. Publique a Edge Function:
   ```bash
   npx supabase functions deploy interpretar
   ```
4. Configure as variáveis na Nuvem de Produção:
   ```bash
   npx supabase secrets set OPENAI_API_KEY=sk-sua-chave-aqui
   npx supabase secrets set CORS_ORIGIN=https://seu-app.vercel.app
   ```
5. No painel da **Vercel**:
   - Mude as chaves `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` de Produção para apontarem para as chaves deste novo Supabase.
   - Mude as chaves do ambiente *Preview* e *Development* para apontarem para o seu Supabase Dev.
6. No painel do **Supabase Produção** (Authentication > URL Configuration):
   - Adicione a sua URL final da Vercel (ex: `https://seu-app.vercel.app`) em **Redirect URLs**.

## Acurácia e Telemetria

O sistema possui uma tabela `events` que registra todas as interações. 
A view `model_calibration_metrics` no banco de dados avalia a confiança do modelo. Se o usuário precisar corrigir a transação frequentemente em palpites de alta confiança (>0.90), o modelo tem "alucinação confiante". Você pode monitorar isso diretamente no SQL Editor do Supabase executando:
```sql
SELECT * FROM model_calibration_metrics;
```
