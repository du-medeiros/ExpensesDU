# PRD — ExpensesDu

**Versão:** 1.0
**Autor:** Eduardo
**Status:** Aprovado para implementação
**Substitui:** PRD "Fricção Zero" (rascunho anterior)
**Provedor de IA:** OpenAI, com Structured Outputs em modo estrito

> **Nota de versão.** Cópia de trabalho da PARTE 1 de `/docs/expensesdu-documentacao.md`, com as correções de OpenAI já aplicadas na seção 7. A fonte de verdade é o documento consolidado.

---

## 1. Visão

Aplicativo de finanças pessoais cuja interface primária é a conversa. O usuário registra gastos escrevendo em linguagem natural; o sistema interpreta, classifica e confirma. Relatórios e metas existem como consulta, não como fluxo de entrada.

**Princípio de projeto:** todo requisito que aumente o número de toques necessários para registrar um gasto deve ser justificado ou recusado.

## 2. Personas

**Primária — Iniciante.** Nunca manteve controle financeiro por mais de duas semanas. Abandonou pelo menos um app antes. Não sabe (nem quer saber) a diferença entre categorias contábeis. Usa o celular para quase tudo.

**Secundária — Recomeçante.** Já usou planilha, desistiu pelo esforço de manutenção. Tem noção do próprio padrão de gasto e quer confirmar suspeitas ("acho que gasto demais com delivery").

Ambas compartilham a característica que define o produto: **vão registrar o gasto no momento em que ele acontece, ou não vão registrar.**

## 3. Escopo

### 3.1 Dentro do MVP

Registro conversacional, classificação automática, consulta em linguagem natural, tetos de gasto por categoria, dicas do Agente Financeiro, resumo mensal.

### 3.2 Fora do MVP

Múltiplas contas e cartões · Integração bancária (Open Finance) · Categorias personalizadas · Metas de poupança · Canal WhatsApp · Leitura de comprovante por foto · Exportação de dados · Múltiplas moedas · Transações recorrentes automáticas.

Cada item acima é uma decisão consciente, não um esquecimento. A arquitetura não deve impedi-los, mas a v1 não os implementa.

### 3.3 Taxonomia fixa

`alimentacao` · `transporte` · `moradia` · `saude` · `lazer` · `compras` · `contas` · `outros`

Conjunto fechado. Não há CRUD de categorias na v1. `outros` é o destino de qualquer coisa não classificável e serve como sinal: se `outros` passar de 15% das transações, a taxonomia precisa ser revista.

---

## 4. Requisitos funcionais

### RF-01 — Roteamento por intenção

Toda mensagem do usuário passa por classificação de intenção antes de qualquer outro processamento.

| Intenção | Exemplo | Ação |
|---|---|---|
| `registrar` | "almoço 32" | Extrai transação(ões) |
| `consultar` | "quanto gastei esse mês?" | Consulta agregada e resposta |
| `meta` | "quero gastar no máximo 400 com comida" | Cria teto |
| `corrigir` | "na verdade foi 42" | Edita a última transação |
| `conversa` | "oi", "obrigado" | Resposta curta, sem escrita no banco |

**Este requisito é crítico.** Se o campo de texto é a interface principal, ele recebe tudo — e um parser que só sabe extrair gastos tentará registrar uma transação de valor nulo a partir de "bom dia".

### RF-02 — Extração de transação

A partir de mensagem com intenção `registrar`, o sistema extrai: valor, tipo (despesa/receita), categoria, data e descrição.

**Regras obrigatórias:**

- **Valor ausente → nunca assumir.** Sem valor identificável, o sistema pergunta.
- **Múltiplos valores → múltiplas transações.** "mercado 120 e farmácia 40" gera duas transações, confirmadas em cards separados.
- **Data ausente → hoje**, resolvido no fuso horário do usuário (padrão `America/Sao_Paulo`), nunca em UTC.
- **Datas relativas** ("ontem", "sexta passada", "dia 3") são resolvidas no servidor, que recebe a data corrente do cliente.
- **Formatos de valor aceitos:** `32`, `32,50`, `32.50`, `R$ 32`, `1.250,00`, `trinta e dois reais`.
- **Tipo padrão é despesa.** Receita só quando explícita ("recebi", "salário", "entrou").

### RF-03 — Confiança e esclarecimento

A resposta do modelo inclui um escore de confiança de 0 a 1.

| Confiança | Comportamento |
|---|---|
| ≥ 0,80 | Registra e exibe card de confirmação |
| < 0,80 | Não registra. Faz uma pergunta objetiva com opções |

A pergunta deve ser fechada sempre que possível: *"R$ 32 em quê?"* seguido de dois ou três chips clicáveis, não um campo aberto.

**Justificativa:** registrar errado em silêncio é o pior resultado possível. O usuário só descobre no fim do mês, quando o relatório está contaminado, e a confiança no app não se recupera.

### RF-04 — Card de confirmação

Toda transação registrada aparece como card na conversa contendo valor, categoria, data e ação de desfazer.

- Cada campo é um chip editável em um toque
- Editar categoria abre lista das oito opções
- "Desfazer" remove a transação (exclusão real, não lógica) e permanece disponível enquanto a mensagem estiver visível na conversa
- Correção manual é registrada como evento de telemetria — é o principal indicador de qualidade do parser

### RF-05 — Consulta em linguagem natural

O sistema responde a perguntas sobre os próprios dados: total do mês, total por categoria, comparação com mês anterior, maior gasto do período.

**Restrição absoluta:** os números vêm de consulta SQL. O modelo de linguagem recebe o resultado da consulta e apenas redige a frase. O modelo nunca calcula, estima ou infere um valor monetário.

Consulta fora do escopo suportado → resposta honesta de que ainda não sabe responder. Nunca uma aproximação.

### RF-06 — Tetos de gasto

- Criação por tela ou por conversa ("no máximo 400 de comida por mês")
- Um teto por categoria por mês; recriado automaticamente no mês seguinte com o mesmo valor
- Progresso visível na tela de Metas e no Resumo
- Faixas visuais: até 70% neutro, 70–100% atenção, acima de 100% estouro

### RF-07 — Agente Financeiro

Dicas geradas por **regra determinística + redação por LLM**. A regra identifica a situação e calcula os números; o modelo apenas escreve a frase em linguagem acessível.

**Gatilhos da v1:**

1. Categoria com teto atingiu 80% antes do dia 20 do mês
2. Categoria com gasto ≥ 30% acima da média dos dois meses anteriores (exige ao menos dois meses de histórico)
3. Fechamento de mês: maior categoria e variação em relação ao mês anterior

**Restrições:**

- O modelo não recebe autonomia para inventar observações fora dos gatilhos
- O Agente não dá conselho de investimento, não sugere produtos financeiros e não emite juízo moral sobre o gasto do usuário
- Máximo de uma dica por dia

### RF-08 — Resumo mensal

Total do mês, variação percentual contra o mês anterior, gráfico de rosca por categoria, progresso dos tetos, cinco maiores gastos. Seletor de mês.

### RF-09 — Autenticação e perfil

E-mail e senha via Supabase Auth. Perfil com nome, WhatsApp (opcional, coletado para a v2) e fuso horário. Exclusão de conta com remoção completa dos dados.

---

## 5. Requisitos não funcionais

### RNF-01 — Latência

Resposta do parser em **até 2s no p95**. Acima disso a conversa parece travada. Indicador de digitação exibido desde o envio.

Se a chamada exceder 8s, o sistema falha com mensagem clara e **preserva o texto digitado** para reenvio.

### RNF-02 — Segurança

- Chave da API da OpenAI exclusivamente em variável de ambiente da Edge Function. **Nunca no bundle do frontend.**
- RLS ativo em todas as tabelas, política `user_id = auth.uid()`, sem exceção
- Edge Function valida o JWT do Supabase e deriva o `user_id` do token — jamais do corpo da requisição
- Rate limit de 60 mensagens por usuário por hora

O rate limit não é proteção contra abuso de terceiros: é proteção contra o próprio custo. Um endpoint que aciona um LLM sem limite é uma fatura aberta.

### RNF-03 — Integridade financeira

- Valores monetários em `numeric(12,2)`. **Nunca `float`.** Ponto flutuante em dinheiro produz erro de arredondamento acumulado.
- `valor > 0` garantido por constraint; o sinal é dado pelo campo `tipo`
- Toda escrita de transação é idempotente por `client_message_id`, evitando duplicata em reenvio ou retry de rede

### RNF-04 — Disponibilidade offline

O PWA abre e exibe dados já carregados sem conexão. Envio de mensagem exige rede: sem conexão, o app informa e mantém o texto no campo. **Não há fila de sincronização na v1** — é complexidade desproporcional ao ganho.

### RNF-05 — Acessibilidade

Contraste mínimo AA. Alvos de toque ≥ 44px. Cor nunca como único portador de informação (faixas de teto trazem rótulo textual). Navegação por leitor de tela na conversa e nos cards.

---

## 6. Modelo de dados

### `profiles`
| Campo | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | FK → `auth.users` |
| `nome` | text | |
| `whatsapp` | text null | E.164, preparação v2 |
| `timezone` | text | default `America/Sao_Paulo` |
| `created_at` | timestamptz | |

### `transactions`
| Campo | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `auth.users` |
| `valor` | numeric(12,2) | check `valor > 0` |
| `tipo` | enum | `despesa` \| `receita` |
| `categoria` | enum | taxonomia da seção 3.3 |
| `data` | date | |
| `descricao` | text | |
| `origem` | enum | `chat` \| `manual` \| `whatsapp` |
| `confianca` | numeric(3,2) null | escore do parser |
| `foi_corrigida` | boolean | default false |
| `client_message_id` | uuid | unique com `user_id` — idempotência |
| `created_at` | timestamptz | |

Índice: `(user_id, data desc)`

### `goals`
| Campo | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | |
| `categoria` | enum | |
| `valor_limite` | numeric(12,2) | |
| `mes_referencia` | date | primeiro dia do mês |

Constraint: unique `(user_id, categoria, mes_referencia)`

### `chat_messages`
| Campo | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | |
| `papel` | enum | `user` \| `assistant` |
| `conteudo` | text | |
| `transaction_id` | uuid null | vínculo com a transação gerada |
| `created_at` | timestamptz | |

Índice: `(user_id, created_at desc)`

**Campos com propósito analítico:** `origem` mede qual canal o usuário realmente usa quando o WhatsApp entrar. `confianca` e `foi_corrigida`, cruzados, revelam se o escore do modelo é calibrado — confiança alta com correção frequente indica que o parser erra convicto, o pior modo de falha.

---

## 7. Contrato do parser

**Entrada para a Edge Function:** texto da mensagem, data e fuso do cliente, últimas mensagens da conversa (janela curta, para resolver "na verdade foi 42").

**Saída obrigatória (JSON estrito, sem texto ao redor):**

```json
{
  "intencao": "registrar | consultar | meta | corrigir | conversa",
  "transacoes": [
    {
      "valor": 32.00,
      "tipo": "despesa",
      "categoria": "alimentacao",
      "data": "2026-09-04",
      "descricao": "almoço",
      "confianca": 0.94
    }
  ],
  "pergunta": null,
  "resposta": null
}
```

### Garantia de formato

A chamada usa **Structured Outputs em modo estrito** da OpenAI: `response_format` do tipo `json_schema` com `strict: true`. A restrição é aplicada durante a geração — tokens que quebrariam o schema são bloqueados antes de serem emitidos. Aderência ao formato deixa de ser probabilidade e vira garantia.

O modo JSON antigo (`{ type: "json_object" }`) **não atende**: ele garante sintaxe válida, não conformidade ao schema.

Duas restrições do modo estrito que afetam este contrato:

- Todos os campos vão em `required`. Não existe campo opcional. `pergunta` e `resposta`, que só às vezes têm valor, são declarados como união com `null` e mesmo assim entram em `required`
- `additionalProperties: false` em todos os objetos

O schema completo está no Anexo A.

### Validação no servidor, antes de qualquer escrita

**O schema garante o formato, não o significado.** O modelo é obrigado a devolver um número em `valor`; nada o impede de devolver `-50` ou uma data em 2031. Estrutura correta, conteúdo absurdo.

Por isso a validação Zod permanece obrigatória, agora cobrindo apenas regras de negócio:

- `valor` ≤ 0 ou ausente em intenção `registrar` → força esclarecimento
- `data` mais de 5 anos no passado ou qualquer data futura → esclarecimento
- `confianca` fora do intervalo de 0 a 1 → erro estruturado
- `categoria` fora da taxonomia → convertida em `outros`. Com o `enum` no schema isso é estruturalmente impossível; a regra permanece como defesa, e se disparar indica erro de configuração

**Novo modo de falha:** o modelo pode retornar um objeto de recusa em vez do JSON. Verificar `message.refusal` antes do parse. Havendo recusa, responder ao usuário sem gravar nada.

O modelo é tratado como fonte não confiável. Nada do que ele devolve chega ao banco sem passar por validação.

---

## 8. Telemetria

Eventos mínimos para avaliar o produto:

`mensagem_enviada` · `transacao_criada` (com `confianca` e `origem`) · `transacao_corrigida` (campo alterado) · `esclarecimento_solicitado` · `esclarecimento_respondido` · `parser_falhou` · `meta_criada` · `dica_exibida` · `resumo_aberto`

**Indicadores de sucesso:**

| Indicador | Meta |
|---|---|
| Precisão da classificação | ≥ 90% |
| Taxa de correção manual | ≤ 0,2 por transação |
| Transações por usuário ativo por semana | ≥ 10 |
| Retenção no dia 7 | ≥ 60% |
| Latência do parser (p95) | ≤ 2s |

---

## 9. Questões em aberto

1. **Receita no MVP.** Registrar entradas sem saldo inicial produz um "balanço" que não corresponde ao dinheiro real do usuário. Manter só despesa é mais honesto, mas frustra quem quiser anotar o salário. *Pendente de decisão.*

2. **Retenção do histórico de conversa.** Manter tudo cresce indefinidamente; a janela enviada ao modelo já é curta. Definir se há arquivamento após N meses.

3. **Calibragem do limiar de 0,80.** Escolhido por razoabilidade, não por medição. Deve ser ajustado após a Etapa 2 da validação, com dados reais.

4. **Custo por usuário ativo.** Estimado em centavos por mês, ainda não medido. Necessário antes de qualquer distribuição aberta.
