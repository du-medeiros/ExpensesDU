# Guia de Ambiente — ExpensesDu

**Projeto:** `D:\dioExpensesDu` · [github.com/du-medeiros/ExpensesDU](https://github.com/du-medeiros/ExpensesDU)
**Backend:** Supabase (nuvem) · **IA:** OpenAI · **Deploy:** Vercel

> **Nota de versão.** Cópia de trabalho da PARTE 2 de `/docs/expensesdu-documentacao.md`, acrescida do schema de Structured Outputs (Anexo A). A fonte de verdade é o documento consolidado.

---


## 1. Decisão de arquitetura: Supabase sempre na nuvem

**Não usamos Supabase local.** O app roda localmente, o banco fica sempre na nuvem.

O Supabase local é reiniciado do zero com facilidade — é para isso que existe. Combinado com um agente de código que reaplica migrations a cada iteração, ele vira uma máquina de apagar dados. Apontar o app local para a base hospedada elimina a categoria do problema: não existe comando de build que zere um banco na nuvem por acidente.

Em troca, perde-se a rede de proteção. Na nuvem não há "resetar e recomeçar", e isso muda o que é seguro fazer.

## 2. ORDEM OBRIGATÓRIA

**1º — Diagnóstico do prompt 9. 2º — Qualquer `db push`.**

Se as migrations contêm `DROP TABLE`, `TRUNCATE` ou `db reset`, rodar `supabase db push` aplica esses comandos na base da nuvem. O problema não some: passa a acontecer com dados reais e sem backup.

Antes de qualquer push, leia os arquivos de `supabase/migrations` procurando por:

```
DROP TABLE
DROP SCHEMA
TRUNCATE
CREATE TABLE (sem IF NOT EXISTS)
```

## 3. Coletando os dados no painel

Em [supabase.com/dashboard](https://supabase.com/dashboard), com o projeto aberto:

**Settings → General**
- Project URL: `https://xxxxxxxxxxxx.supabase.co`
- Reference ID: `xxxxxxxxxxxx` — é o que o CLI usa

**Settings → API Keys**

A Supabase está aposentando as chaves `anon` e `service_role` em favor das chaves publishable e secret. Projetos criados a partir de novembro de 2025 já nascem só com as novas — se você procurar a chave `anon`, não vai encontrar.

Se aparecer um botão "Create new API keys", clique. Criar as novas é seguro: elas são adicionadas ao lado das existentes, sem afetá-las.

| Chave | Formato | Destino | Perigo |
|---|---|---|---|
| **Publishable** | `sb_publishable_...` | Frontend, `.env.local`, Vercel | Baixo. É feita para ser pública |
| **Secret** | `sb_secret_...` | Só servidor. Você provavelmente nem vai precisar | **Alto. Ignora todo o RLS** |

A chave publishable tem os mesmos privilégios baixos da antiga `anon`, então as políticas de RLS se comportam igual.

A chave secret **ignora o RLS inteiro**: dá acesso aos dados de todos os usuários. Nunca no frontend, nunca com prefixo `VITE_`, nunca colada em chat.

**Settings → Database → Database password** — necessária para o CLI.

**[platform.openai.com/api-keys](https://platform.openai.com/api-keys)** — chave no formato `sk-...`. É a mais sensível do conjunto: gera custo direto.

## 4. O arquivo `.env.local`

Confirme antes que o `.gitignore` contém:

```
.env
.env.local
.env*.local
/backups
```

Crie `D:\dioExpensesDu\.env.local`:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxx
```

Duas linhas, só. Nenhuma outra chave recebe prefixo `VITE_` — tudo com esse prefixo é embutido no JavaScript que vai para o navegador do usuário.

Crie também `.env.example`, este versionado, sem valores:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## 5. O que NÃO passar para o Antigravity

O Antigravity registra o que você digita. Chave colada em conversa fica em log e sai do seu controle.

| Dado | Passar? |
|---|---|
| Nomes das variáveis de ambiente | Sim |
| Reference ID do projeto | Sim, é semi-público |
| Chave publishable | Aceitável, mas desnecessário |
| **Chave secret (`sb_secret_`)** | **Nunca** |
| **Chave da OpenAI (`sk-`)** | **Nunca** |
| Senha do banco | Nunca |

O agente escreve o código que **lê** as variáveis. Quem preenche os valores é você, na mão. O agente não precisa conhecer nenhum segredo para trabalhar.

## 6. Vinculando o CLI

```bash
npx supabase stop
npx supabase login
npx supabase link --project-ref xxxxxxxxxxxx
```

Só depois de revisar as migrations (seção 2.2):

```bash
npx supabase db push
```

Confira em **Table Editor** se as quatro tabelas apareceram.

**`supabase db push` é comando seu, não do agente.** Deixe isso explícito em toda sessão nova.

## 7. Edge Functions

```bash
npx supabase secrets set OPENAI_API_KEY=sk-xxxxx
npx supabase secrets set OPENAI_MODEL=nome-do-modelo
npx supabase functions deploy interpretar
```

Não é preciso configurar as chaves da própria Supabase como secret: a plataforma injeta essas variáveis automaticamente no ambiente das functions.

Verifique em **Edge Functions → Secrets** que `OPENAI_API_KEY` aparece listada, com o valor oculto.

### Escolha do modelo

Nomes de modelo da OpenAI mudam com frequência, e um nome errado quebra a function na primeira chamada. **Confirme a lista atual** em [platform.openai.com/docs/models](https://platform.openai.com/docs/models).

O critério não muda: extrair um valor e uma categoria de uma frase curta é tarefa fácil. **Use o modelo mais barato da linha atual que suporte Structured Outputs.** Modelo de ponta aqui é desperdício sem ganho de acerto.

O nome vai em variável de ambiente, nunca fixo no código — assim você troca sem novo deploy quando a versão for aposentada.

## 8. Liberando o localhost

Sem estes dois ajustes, tudo parece quebrado sem motivo aparente.

**Authentication → URL Configuration → Redirect URLs:**

```
http://localhost:5173
http://localhost:5173/**
```

**CORS das Edge Functions:** aceitar `http://localhost:5173` além do domínio de produção.

## 9. Verificação do ambiente

- [ ] `npm run dev` sobe e conecta
- [ ] A URL mostrada é a da nuvem, não `localhost:54321`
- [ ] Cadastro cria usuário — confira em **Authentication → Users**
- [ ] Transação registrada aparece no **Table Editor**
- [ ] **Pare o servidor, rode `npm run build`, suba de novo: a transação continua lá**
- [ ] `git status` não lista `.env.local`
- [ ] O bundle em `dist/` não contém `sb_secret_` nem chave da OpenAI

O quinto item é o teste que fecha o problema de perda de dados. É exatamente o cenário que estava falhando.

## 10. Se uma chave vazar

Trocar o arquivo não resolve: o histórico do Git guarda. É preciso revogar a chave no painel e gerar outra. Uma das vantagens das chaves novas da Supabase é serem revogáveis individualmente e na hora, sem derrubar o resto do projeto.

Para a chave da OpenAI, revogue em [platform.openai.com/api-keys](https://platform.openai.com/api-keys) e confira o uso na aba de billing.


---

## 11. Schema JSON para Structured Outputs

Este é o schema usado na chamada à OpenAI, em `response_format` do tipo `json_schema` com `strict: true`.

```json
{
  "name": "interpretacao",
  "strict": true,
  "schema": {
    "type": "object",
    "additionalProperties": false,
    "required": ["intencao", "transacoes", "pergunta", "resposta"],
    "properties": {
      "intencao": {
        "type": "string",
        "enum": ["registrar", "consultar", "meta", "corrigir", "conversa"]
      },
      "transacoes": {
        "type": "array",
        "items": {
          "type": "object",
          "additionalProperties": false,
          "required": ["valor", "tipo", "categoria", "data", "descricao", "confianca"],
          "properties": {
            "valor": { "type": ["number", "null"] },
            "tipo": { "type": "string", "enum": ["despesa", "receita"] },
            "categoria": {
              "type": "string",
              "enum": ["alimentacao", "transporte", "moradia", "saude",
                       "lazer", "compras", "contas", "outros"]
            },
            "data": { "type": ["string", "null"] },
            "descricao": { "type": "string" },
            "confianca": { "type": "number" }
          }
        }
      },
      "pergunta": { "type": ["string", "null"] },
      "resposta": { "type": ["string", "null"] }
    }
  }
}
```

### Por que este schema é assim

**Todo campo está em `required`.** O modo estrito não admite campo opcional. `pergunta` e `resposta`, que só às vezes têm valor, são declarados como união com `null` e mesmo assim aparecem em `required`. Omitir de `required` faz a chamada ser rejeitada.

**`additionalProperties: false` em todos os objetos.** Também é exigência do modo estrito.

**`categoria` é `enum`.** Com isso, o modelo não consegue emitir uma nona categoria — a restrição é aplicada durante a geração. A regra do PRD que converte categoria inválida em `outros` continua no código como defesa, mas nunca deve disparar.

**`valor` aceita `null`.** Quando a mensagem não traz valor identificável, o modelo devolve `null` e o servidor gera esclarecimento, conforme RF-02. Sem a união com `null`, o modelo seria forçado a inventar um número — exatamente o comportamento que o PRD proíbe.

### Limites que o schema não cobre

O schema garante o formato, não o significado. Continuam sendo responsabilidade da validação Zod:

- `valor` positivo
- `data` nem futura nem anterior a 5 anos
- `confianca` entre 0 e 1
- Coerência entre `intencao` e o conteúdo de `transacoes`

E há um modo de falha que não é JSON: o modelo pode retornar um objeto de recusa. Verificar `message.refusal` antes do parse.

