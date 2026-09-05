# Prompts de Implementação — ExpensesDu

**Projeto:** `D:\dioExpensesDu` · [github.com/du-medeiros/ExpensesDU](https://github.com/du-medeiros/ExpensesDU)
**Ferramenta:** Antigravity · **Deploy:** Vercel · **Backend:** Supabase
**Documentos de referência:** `/docs/expensesdu-documentacao.md` e `/docs/plano-mvp-financas-conversacional.md`

> **Nota de versão.** Este arquivo é uma cópia de trabalho da PARTE 3 de `/docs/expensesdu-documentacao.md`, com as correções de OpenAI (Structured Outputs) e chave publishable já aplicadas. A fonte de verdade é o documento consolidado — se os dois divergirem, vale o consolidado.

---

## Como usar este documento

Cada prompt é uma unidade de trabalho fechada, com critério de aceite verificável. Execute na ordem. **Não avance sem cumprir o DoD do prompt anterior** — em projeto com agente de código, dívida acumulada vira retrabalho exponencial.

Cada bloco traz:

- **Objetivo** — o que essa etapa entrega
- **Leia antes** — documentos que o agente deve carregar no contexto
- **Prompt** — texto para colar no Antigravity
- **DoD** — condições objetivas de conclusão
- **Verificação** — o que conferir antes de dar por pronto
- **Não fazer** — limite de escopo (agentes de código tendem a construir além do pedido)

### Regra permanente

Inclua esta linha no início de toda sessão nova do Antigravity:

> Leia `/docs/expensesdu-documentacao.md (PARTE 1)` antes de qualquer alteração. Ele é a fonte de verdade do projeto. Se alguma instrução minha contradisser o PRD, aponte a contradição antes de codar.

### Segurança — antes do primeiro commit

O repositório é público. Faça isto agora:

```
.env
.env.local
.env*.local
```

no `.gitignore`. A chave da API da OpenAI vive **apenas** em Supabase → Edge Functions → Secrets. A chave secret (`sb_secret_`) do Supabase nunca sai do servidor. No Vercel entram somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

### Ordem e justificativa

| # | Etapa | Por que nesta posição |
|---|---|---|
| 1 | Fundação | Base para tudo |
| 2 | **Motor de interpretação** | **Maior risco do projeto. Testável sem UI e sem banco** |
| 3 | Banco e RLS | Estrutura antes dos dados |
| 4 | Auth e perfil | Desbloqueia telas autenticadas |
| 5 | Conversa | Tela principal, liga motor ao banco |
| 6 | Consultas e Resumo | Fecha o ciclo de valor |
| 7 | Metas e Agente | Camada de engajamento |
| 8 | Telemetria e polimento | Mede e finaliza |

---

# Prompt 1 — Fundação do projeto

**Objetivo:** projeto rodando local e em produção, com navegação vazia e tema aplicado.

**Leia antes:** `/docs/expensesdu-documentacao.md (PARTE 1)`, seções 1 e 5.

### Prompt

```
Leia /docs/expensesdu-documentacao.md (PARTE 1) antes de começar.

Inicialize o projeto ExpensesDu:

STACK
- Vite + React 18 + TypeScript em modo estrito
- Tailwind CSS
- React Router DOM
- Lucide React para ícones
- sonner para toasts
- Zod para validação

ESTRUTURA
src/
  components/    componentes reutilizáveis
  features/      chat/, resumo/, metas/, perfil/
  lib/           supabase.ts, utils
  types/         tipos compartilhados
  hooks/

LAYOUT
- Mobile-first. Shell com altura de viewport e scroll apenas na área de conteúdo
- Barra de navegação inferior fixa com 4 itens: Conversa, Resumo, Metas, Perfil
- A rota inicial "/" é a Conversa
- Em telas md ou maiores, a navegação vira lateral

TEMA
- Dark mode nativo do Tailwind via classe
- Cores semânticas no config: primary, despesa, receita, atencao, estouro
- Fonte de sistema

CONFIGURAÇÃO
- .env.local com VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY
- .env e variantes locais no .gitignore
- Cliente Supabase em src/lib/supabase.ts lendo das variáveis de ambiente
- PWA: manifest.json e ícones

As 4 telas devem existir como placeholders vazios. Nenhuma lógica de negócio nesta etapa.
```

### DoD

- [ ] `npm run dev` sobe sem erro nem warning de TypeScript
- [ ] `npm run build` conclui
- [ ] As 4 rotas navegam pela barra inferior
- [ ] Dark mode alterna corretamente
- [ ] Deploy na Vercel acessível por URL pública
- [ ] `git status` não mostra nenhum arquivo `.env`

### Verificação

Abra a URL da Vercel no celular. A navegação inferior deve ficar acima da barra do navegador, sem cortar. Rode `git log -p | grep -i "key\|secret"` e confirme que não retorna nada sensível.

### Não fazer

Sem autenticação, sem chamadas ao Supabase, sem componentes de gráfico, sem layout de chat.

---

# Prompt 2 — Motor de interpretação (isolado)

**Objetivo:** Edge Function que transforma texto em JSON validado, com precisão medida. **Sem banco, sem UI.**

**Leia antes:** `/docs/expensesdu-documentacao.md (PARTE 1)`, seções 3.3, 4 (RF-01 a RF-03) e 7 — na íntegra.

### Prompt

```
Leia /docs/expensesdu-documentacao.md (PARTE 1), com atenção às seções 3.3, RF-01, RF-02, RF-03 e 7.

Crie a Edge Function do Supabase `interpretar` e um harness de teste. Nesta etapa
NÃO há escrita em banco de dados e NÃO há interface.

ENTRADA
{ texto: string, dataCliente: string ISO, timezone: string, historico?: [] }

PROCESSAMENTO
1. Monta o prompt de sistema com a taxonomia fixa das 8 categorias
2. Chama a API da OpenAI em https://api.openai.com/v1/chat/completions
   - Header Authorization: Bearer, chave em Deno.env, nunca no código
   - Nome do modelo vindo de Deno.env.get("OPENAI_MODEL"), nunca fixo
   - response_format do tipo json_schema com strict: true, usando o
     schema do Anexo A. NÃO usar { type: "json_object" }
3. Verifica message.refusal ANTES do parse
4. Valida as regras de negócio com Zod (o schema garante o formato,
   não o conteúdo: valor negativo e data em 2031 passam pelo schema)

Não implemente repetição por JSON malformado: com modo estrito, o formato
é garantido na geração e esse cenário não existe.

REGRAS OBRIGATÓRIAS (seção RF-02 do PRD)
- Sem valor identificável, nunca assumir: retorna pedido de esclarecimento
- Vários valores na mesma frase geram várias transações
- Data ausente = hoje, resolvida no timezone recebido, jamais em UTC
- Datas relativas resolvidas no servidor
- Aceitar "32", "32,50", "R$ 32", "1.250,00", "trinta e dois reais"
- Tipo padrão despesa; receita só quando explícita
- Categoria fora da taxonomia vira "outros"
- Confiança abaixo de 0,80 não registra: gera pergunta fechada

ROTEAMENTO DE INTENÇÃO (RF-01)
Classificar em: registrar, consultar, meta, corrigir, conversa.
Nesta etapa apenas classifique e retorne — não execute consulta nem meta.

HARNESS
Script `scripts/testar-parser.ts` que lê `scripts/dataset.json` (array de
{ texto, esperado }), roda cada caso e imprime: acurácia de intenção, acurácia
de categoria, erro médio de valor, e a lista de casos que falharam.
```

### DoD

- [ ] Function responde localmente via `supabase functions serve`
- [ ] Todo retorno passa por validação Zod antes de sair
- [ ] `dataset.json` com **no mínimo 50 casos reais**, escritos como você escreveria de fato
- [ ] Script imprime as métricas
- [ ] **Acurácia de categoria ≥ 90%**
- [ ] Chave da API ausente do código versionado

### Verificação

Este é o portão de decisão do projeto. Rode o harness e olhe a lista de falhas, não só o número agregado.

Teste manualmente estes casos de borda:

```
"almoço"                        → deve perguntar, não registrar
"mercado 120 e farmácia 40"     → duas transações
"gastei 50 ontem no uber"       → transporte, data de ontem
"recebi 3000"                   → receita
"quanto gastei esse mês?"       → intenção consultar
"oi"                            → intenção conversa
"1.250,00 de aluguel"           → 1250.00, moradia
```

Se ficar abaixo de 90%, **não avance**. O problema está no prompt de sistema. Ajuste o texto e rode de novo — é muito mais barato agora do que com o app inteiro construído em cima.

### Não fazer

Sem tabelas, sem tela de chat, sem gravar transação, sem autenticação.

---

# Prompt 3 — Banco de dados e RLS

**Objetivo:** schema completo com isolamento por usuário comprovado.

**Leia antes:** `/docs/expensesdu-documentacao.md (PARTE 1)`, seções 6 e RNF-02, RNF-03.

### Prompt

```
Leia /docs/expensesdu-documentacao.md (PARTE 1), seções 6 (modelo de dados), RNF-02 e RNF-03.

Crie as migrations do Supabase implementando exatamente o modelo da seção 6.

ENUMS
tipo_transacao: despesa, receita
categoria: alimentacao, transporte, moradia, saude, lazer, compras, contas, outros
origem_transacao: chat, manual, whatsapp
papel_mensagem: user, assistant

TABELAS: profiles, transactions, goals, chat_messages — com todos os campos,
tipos e constraints da seção 6.

OBRIGATÓRIO
- valor em numeric(12,2), nunca float ou double precision
- constraint check (valor > 0)
- unique (user_id, client_message_id) em transactions para idempotência
- unique (user_id, categoria, mes_referencia) em goals
- índice (user_id, data desc) em transactions
- índice (user_id, created_at desc) em chat_messages
- RLS habilitado em TODAS as tabelas, política user_id = auth.uid() para
  select, insert, update e delete
- Trigger que cria a linha em profiles ao criar usuário em auth.users

Gere também os tipos TypeScript em src/types/database.ts espelhando o schema.
```

### DoD

- [ ] Migrations aplicam do zero sem erro
- [ ] `select relrowsecurity from pg_class` retorna `true` para as 4 tabelas
- [ ] Constraints e índices criados
- [ ] Tipos TS gerados e compilando

### Verificação

**Teste o RLS de verdade.** Habilitado não significa funcionando — a política pode estar errada. Crie dois usuários no painel, insira transação para o usuário A e, autenticado como B, rode:

```sql
select count(*) from transactions;
```

Precisa retornar `0`. Se retornar 1, a política está incorreta e **todo o app está exposto**.

Teste a idempotência inserindo duas vezes o mesmo `client_message_id`: a segunda deve falhar por constraint.

### Não fazer

Sem seed de dados fictícios em produção, sem views ou funções de agregação ainda, sem tocar no frontend.

---

# Prompt 4 — Autenticação e perfil

**Objetivo:** cadastro, login, rotas protegidas e tela de perfil.

**Leia antes:** `/docs/expensesdu-documentacao.md (PARTE 1)`, RF-09.

### Prompt

```
Leia /docs/expensesdu-documentacao.md (PARTE 1), requisito RF-09.

Implemente autenticação com Supabase Auth (e-mail e senha).

- AuthProvider com Context API escutando onAuthStateChange
- Componente ProtectedRoute com tela de carregamento em altura cheia,
  evitando piscar conteúdo antes de resolver a sessão
- Telas de cadastro e login com validação Zod + React Hook Form
- Mensagens de erro em português e específicas: "e-mail já cadastrado",
  "senha muito curta", não "erro ao autenticar"

TELA DE PERFIL (/perfil)
- Nome, WhatsApp (opcional, máscara e validação E.164), timezone
  com padrão America/Sao_Paulo
- Upsert em profiles
- Logout
- Excluir conta, com confirmação em duas etapas, removendo todos os dados

As 4 rotas do app passam a exigir sessão ativa.
```

### DoD

- [ ] Cadastro cria usuário e linha em `profiles` pelo trigger
- [ ] Recarregar a página mantém a sessão
- [ ] Rota protegida sem sessão redireciona para login
- [ ] Perfil salva e relê os dados
- [ ] Exclusão de conta remove tudo

### Verificação

Recarregue com F5 numa rota interna e confirme que não aparece a tela de login por um instante antes do conteúdo. Esse flash é o defeito mais comum aqui e denuncia que o `ProtectedRoute` não espera o carregamento da sessão.

### Não fazer

Sem login social, sem recuperação de senha (v2), sem onboarding.

---

# Prompt 5 — Tela de conversa

**Objetivo:** a tela principal do produto, ligando motor e banco.

**Leia antes:** `/docs/expensesdu-documentacao.md (PARTE 1)`, RF-01 a RF-04, RNF-01, RNF-03.

### Prompt

```
Leia /docs/expensesdu-documentacao.md (PARTE 1), requisitos RF-01, RF-02, RF-03, RF-04, RNF-01 e RNF-03.

Implemente a tela de Conversa como rota inicial "/".

INTERFACE
- Lista de mensagens, mais recente embaixo, rolagem automática
- Campo de texto fixo na base, foco automático ao abrir
- Enter envia; teclado não deve cobrir o campo no mobile
- Indicador de digitação desde o envio até a resposta

CARD DE CONFIRMAÇÃO (RF-04)
- Valor, categoria, data e ação de desfazer
- Cada campo é um chip editável em um toque
- Editar categoria abre as 8 opções
- Desfazer exclui a transação de fato
- Correção manual marca foi_corrigida = true

ESCLARECIMENTO (RF-03)
- Confiança abaixo de 0,80 exibe a pergunta com chips de resposta clicáveis,
  não campo aberto
- A resposta do usuário conclui o registro

INTEGRAÇÃO
- A Edge Function passa a gravar em transactions e chat_messages
- user_id vem SEMPRE do JWT validado, nunca do corpo da requisição
- client_message_id gerado no cliente garante idempotência
- Rate limit de 60 mensagens por usuário por hora
- UI otimista: mensagem aparece na hora; falha faz rollback com toast e
  preserva o texto digitado para reenvio
- Timeout de 8s com mensagem clara

Histórico carrega as mensagens anteriores ao abrir a tela.
```

### DoD

- [ ] Mensagem em linguagem natural vira transação no banco
- [ ] Card aparece com dados corretos e chips editam
- [ ] Desfazer remove do banco
- [ ] Mensagem ambígua gera pergunta, sem gravar
- [ ] Rate limit responde com mensagem amigável
- [ ] Modo avião: erro claro e texto preservado

### Verificação

Envie a mesma mensagem duas vezes rapidamente e confirme que gera **uma** transação. Ative o modo avião no meio de um envio e verifique que o texto não se perde. No celular real, com o teclado aberto, o campo precisa continuar visível.

Confira no banco que `confianca` está sendo gravada — ela é o dado que valida o parser depois.

### Não fazer

Sem gráficos, sem tela de resumo, sem consultas agregadas, sem dicas do Agente.

---

# Prompt 6 — Consultas e Resumo mensal

**Objetivo:** o usuário vê o resultado do que registrou.

**Leia antes:** `/docs/expensesdu-documentacao.md (PARTE 1)`, RF-05 e RF-08.

### Prompt

```
Leia /docs/expensesdu-documentacao.md (PARTE 1), requisitos RF-05 e RF-08.

PARTE A — Consultas na conversa (RF-05)
Quando a intenção for "consultar", executar agregação SQL e responder.
Suportar: total do mês, total por categoria, comparação com mês anterior,
maior gasto do período.

RESTRIÇÃO ABSOLUTA: os números vêm da consulta SQL. O modelo recebe o
resultado pronto e apenas redige a frase. O modelo NUNCA calcula, estima
ou infere valor monetário.

Consulta fora do escopo suportado: responder honestamente que ainda não
sabe responder isso. Nunca aproximar.

Crie funções SQL ou views para as agregações, respeitando RLS.

PARTE B — Tela de Resumo (RF-08)
- Seletor de mês no topo, filtro primário
- Total do mês e variação percentual contra o anterior
- Gráfico de rosca por categoria (Recharts), total no centro
- Cinco maiores gastos
- Estado vazio com orientação, quando não houver transações no mês
```

### DoD

- [ ] "quanto gastei esse mês?" responde com valor conferido no banco
- [ ] "quanto gastei com comida?" responde por categoria
- [ ] Pergunta não suportada admite a limitação em vez de inventar
- [ ] Resumo bate com o somatório real
- [ ] Mês sem dados exibe estado vazio, não erro ou zero solto

### Verificação

**Confira o número à mão.** Some as transações do mês direto no SQL e compare com o que a conversa e o Resumo mostram. Divergência aqui é o defeito mais grave possível neste app — um app de finanças que erra um total perde o usuário de vez.

Pergunte algo fora do escopo, como "qual meu gasto médio às terças?", e confirme que ele admite não saber em vez de produzir um número plausível.

### Não fazer

Sem gráfico de linha, sem exportação, sem previsão de gastos, sem metas ainda.

---

# Prompt 7 — Metas e Agente Financeiro

**Objetivo:** camada que faz o usuário voltar.

**Leia antes:** `/docs/expensesdu-documentacao.md (PARTE 1)`, RF-06 e RF-07.

### Prompt

```
Leia /docs/expensesdu-documentacao.md (PARTE 1), requisitos RF-06 e RF-07.

PARTE A — Tetos de gasto (RF-06)
- Tela /metas: categorias com teto, valor consumido e barra de progresso
- Criar teto: categoria + valor mensal
- Criar também por conversa, quando a intenção for "meta"
- Um teto por categoria por mês; recriar automaticamente no mês seguinte
  com o mesmo valor
- Faixas: até 70% neutro, 70 a 100% atenção, acima de 100% estouro
- Cor nunca é o único indicador: incluir rótulo textual (RNF-05)
- Sugerir valor inicial pela média do usuário, quando houver histórico

PARTE B — Agente Financeiro (RF-07)
Regra determinística calcula, LLM apenas redige.

Gatilhos:
1. Categoria com teto atinge 80% antes do dia 20
2. Categoria com gasto 30% ou mais acima da média dos 2 meses anteriores
   (exige 2 meses de histórico)
3. Fechamento de mês: maior categoria e variação contra o anterior

Implementar cada gatilho como consulta SQL que devolve os números.
Enviar ao modelo apenas os números apurados, pedindo a redação em
linguagem acessível.

RESTRIÇÕES
- O modelo não inventa observações fora dos gatilhos
- Sem conselho de investimento, sem indicação de produto financeiro,
  sem juízo moral sobre o gasto do usuário
- Máximo de uma dica por dia
- A dica aparece como mensagem do assistente na conversa
```

### DoD

- [ ] Teto criado pela tela e pela conversa
- [ ] Progresso e faixas corretos
- [ ] Cada gatilho dispara na condição certa
- [ ] Números da dica conferem com o banco
- [ ] Limite de uma dica por dia respeitado

### Verificação

Force cada gatilho inserindo transações no banco e confirme que a dica **cita o número certo**. Este é o ponto onde a alucinação é mais provável e mais cara: uma dica com número errado destrói a confiança em todo o resto do app.

Leia as dicas geradas e verifique o tom. Se soar como julgamento — "você está gastando demais" — ajuste o prompt. O produto é para iniciante, e culpa é o motivo pelo qual as pessoas abandonam controle financeiro.

### Não fazer

Sem metas de poupança, sem notificação push, sem gamificação.

---

# Prompt 8 — Telemetria, polimento e entrega

**Objetivo:** app medível, apresentável e publicado.

**Leia antes:** `/docs/expensesdu-documentacao.md (PARTE 1)`, seção 8 e RNF-04, RNF-05.

### Prompt

```
Leia /docs/expensesdu-documentacao.md (PARTE 1), seção 8 (telemetria), RNF-04 e RNF-05.

TELEMETRIA
Registrar os eventos da seção 8: mensagem_enviada, transacao_criada
(com confianca e origem), transacao_corrigida (com campo alterado),
esclarecimento_solicitado, esclarecimento_respondido, parser_falhou,
meta_criada, dica_exibida, resumo_aberto.

Tabela events com RLS. Criar uma consulta que cruze confianca com
foi_corrigida — é ela que revela se o escore do modelo é calibrado.

POLIMENTO
- Estado vazio em todas as telas, com orientação do que fazer
- Estado de carregamento com skeleton, não spinner solto
- Estado de erro com ação de repetir
- Primeira abertura: mensagem do assistente explicando como usar,
  com exemplos clicáveis
- Acessibilidade: contraste AA, alvos de toque de 44px, leitor de tela
  na conversa e nos cards
- PWA instalável, com ícone e splash

ENTREGA
- README com o que é o app, stack, como rodar, variáveis de ambiente
  necessárias e link do deploy
- Deploy final na Vercel
```

### DoD

- [ ] Eventos gravando corretamente
- [ ] Consulta de calibragem funcionando
- [ ] Todas as telas com estado vazio, carregando e erro
- [ ] Primeira abertura orienta o usuário
- [ ] Instalável como PWA no celular
- [ ] README completo
- [ ] Deploy no ar

### Verificação

Use o app do zero com uma conta nova, como se fosse um usuário. O caminho da primeira mensagem até o primeiro card deve ser óbvio sem instrução.

Rode a consulta de calibragem: se houver muitas correções em transações com confiança acima de 0,90, o modelo está errando com convicção — o pior modo de falha, porque não gera esclarecimento.

Confirme uma última vez que nenhuma chave aparece no bundle: abra as ferramentas do navegador em produção e busque por `sk-` nos arquivos JavaScript.

### Não fazer

Sem refatoração ampla nesta etapa. Sem funcionalidade nova.

---

## Checklist final antes da entrega da DIO

- [ ] Repositório público sem nenhuma credencial no histórico de commits
- [ ] URL do deploy funcionando em celular
- [ ] Os dois documentos em `/docs` versionados
- [ ] Acurácia do parser medida e registrada no README
- [ ] Fluxo principal demonstrável em menos de 2 minutos: escrever "almoço 32", ver o card, abrir o Resumo, ver o gráfico
