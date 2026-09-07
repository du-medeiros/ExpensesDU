# Prompts de Correção — Rodada 2

**Origem:** reteste no navegador, 06/09/2026
**Diagnóstico:** o backend foi corrigido; o frontend e o contrato entre eles, não

---

## O que mudou no diagnóstico

O interpretador acerta **7 de 7** quando a mensagem é a primeira depois de um reload: valor, categoria, data, e recusa gravar quando falta valor, devolvendo pergunta específica. As correções de linguagem do C2 funcionaram.

Nada disso chega ao usuário.

| Camada | Estado |
|---|---|
| Modelo e prompt de sistema | Bom |
| Edge Function: extração | Boa |
| Edge Function: o que persiste | **Quebrada** — regrava o histórico inteiro |
| Contrato de resposta | **Quebrado** — `resposta: null` em registro |
| Frontend: renderização | **Quebrada** — nunca exibe resposta |
| Frontend: consulta do feed | **Quebrada** — carrega as 50 mais antigas |
| Frontend: gestão de transação | **Inexistente** para lançamentos novos |

O trabalho agora é determinístico. Não há mais ajuste de prompt envolvido nos P0.

---

## Ordem

| # | Correção | Por quê |
|---|---|---|
| D0 | Auditoria do que foi aplicado | A rodada anterior foi reportada como feita e não foi |
| D1 | Duplicação em cascata | Mais destrutivo. Corrompe dado a cada mensagem |
| D2 | Contrato de resposta e renderização | Sem isso o app não tem interface |
| D3 | Feed e lista de transações | Devolve ao usuário o controle sobre os dados |
| D4 | Limpeza do banco poluído | Manual, feita por você |
| D5 | Gráfico vazio e `numeric` como texto | Provável causa única |
| D6 | Regressões do parser | Três casos que funcionavam |
| D7 | O que a rodada 1 não entregou | Datas, metas, formatação, acessibilidade |

---

# D0 — Auditoria: o que foi realmente aplicado

### Por que este passo existe

A rodada anterior foi dada como concluída. O reteste mostra que C3 (datas), C4 (metas CRUD), C5 (formatação) e C6 (acessibilidade) estão praticamente intactos: `user-scalable=no` continua no viewport, `og:image` continua relativa, a tela de Metas continua com dois botões de seta e nada mais.

Mandar os mesmos prompts de novo sem entender o motivo repete o ciclo.

### Prompt

```
Antes de qualquer correção nova, preciso de um levantamento.

Na rodada anterior foram passadas 6 correções (C1 a C6). O reteste indica
que várias não estão no código. Para CADA item abaixo, me diga: IMPLEMENTADO,
PARCIAL ou NÃO IMPLEMENTADO, citando arquivo e linha quando existir.

NÃO corrija nada nesta etapa. Só levantamento.

C1 - Consulta do feed com order desc + limit
C1 - Paginação para cima no feed
C1 - Rolagem para o fim ao abrir
C1 - Lista de transações do mês no Resumo, com editar e excluir
C1 - Confirmação ao excluir transação
C2 - Regra no prompt de sistema proibindo herdar valor do histórico
C2 - Iteração sobre todo o array transacoes
C2 - Clarificação disparando por valor null ou confiança < 0,80
C2 - Resposta citando valores em vez de texto genérico
C3 - Utilitário único de data, sem new Date() em string pura
C4 - Botões de criar, editar e excluir teto
C4 - Remoção da meta de poupança
C5 - Formatador único de moeda em pt-BR
C5 - Mapa de exibição das categorias com acento
C6 - Remoção de user-scalable=no e maximum-scale
C6 - og:image absoluta e og:url
C6 - Legenda no gráfico
C6 - tabular-nums fora dos KPIs

Ao final, me diga em uma frase por que os itens não implementados ficaram
de fora: não foram tentados, foram tentados e revertidos, ou foram feitos
em outro arquivo que não está em uso.
```

### DoD

- [ ] Levantamento item a item, com arquivo e linha
- [ ] Explicação do motivo das omissões
- [ ] Nenhuma alteração de código nesta etapa

---

# D1 — Duplicação em cascata

### Sintoma medido

Cada mensagem de registro regrava todas as anteriores da sessão:

```
"aluguel 1250"   → 1 transação
"padaria 32,50"  → grava padaria + aluguel DE NOVO
"uber 50"        → grava aluguel + padaria de novo, e PERDE o uber
"recebi 3000"    → grava os 4
```

Resultado: 5 cópias do aluguel, 4 da padaria, 3 do café, 2 do uber, 2 da receita.

### Causa

O histórico é enviado ao modelo como mensagens comuns, sem marcar o que já foi persistido. O modelo re-extrai tudo que enxerga e devolve no array `transacoes`. O servidor grava o array inteiro.

A constraint `unique (user_id, client_message_id)` não protege: cada turno novo tem um `client_message_id` novo, então as duplicatas passam.

### A correção estrutural

Instruir o modelo a "não repetir" não basta — comportamento de modelo é probabilístico e isso é integridade de dado financeiro. São necessárias três camadas.

### Prompt

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-02, RNF-03).

BUG CRÍTICO: duplicação em cascata. Cada mensagem de registro regrava todas
as transações anteriores da sessão. Medido: 5 cópias de um mesmo aluguel.

CAUSA
O histórico vai ao modelo como mensagens comuns. O modelo re-extrai tudo e
devolve no array transacoes. O servidor grava o array inteiro.

CORREÇÃO EM TRÊS CAMADAS. Implemente as três — instrução de prompt sozinha
não é garantia suficiente para dado financeiro.

CAMADA 1 — CONTEXTO
- O histórico NÃO vai mais como mensagens a interpretar
- Passar em campo separado e explicitamente rotulado como já processado,
  apenas para resolver a intenção "corrigir"
- Limitar a 4 turnos
- Regra explícita no prompt de sistema: "O array transacoes deve conter
  EXCLUSIVAMENTE transações extraídas da mensagem atual. Transações do
  histórico já foram registradas e NUNCA devem ser repetidas."

CAMADA 2 — DEFESA NO SERVIDOR
Antes de gravar, para cada transação do array, rejeitar se já existir
transação idêntica do mesmo usuário (mesmo valor, categoria, data e
descrição) criada nos últimos 5 minutos.
Registrar em log quantas foram rejeitadas — é o indicador de que a camada 1
está falhando.

CAMADA 3 — RASTREIO
Adicionar coluna source_message_id em transactions, referenciando a
chat_messages que originou o registro.
- Migration nova, com IF NOT EXISTS, sem DROP
- Toda transação gravada precisa apontar para a mensagem atual
- Permite auditar de qual mensagem cada transação nasceu

VERIFICAÇÃO OBRIGATÓRIA
Enviar em sequência, na MESMA sessão, sem recarregar:
  "aluguel 1250" → "padaria 32,50" → "uber 50" → "recebi 3000"
Resultado esperado: exatamente 4 transações. Nem uma a mais.
Conferir direto no banco, não pela interface.
```

### DoD

- [ ] Sequência de 4 mensagens gera exatamente 4 transações
- [ ] Histórico enviado em campo separado, rotulado
- [ ] Defesa de duplicata no servidor, com log
- [ ] `source_message_id` gravado
- [ ] Migration nova, não destrutiva

### Não fazer

Sem mexer no frontend. Sem alterar o schema de Structured Outputs.

---

# D2 — Contrato de resposta e renderização

### Sintoma medido

Em 20 mensagens enviadas, **zero cards e zero respostas renderizaram.** O backend responde 200, grava a transação e cria `assistant_message_ids`. O frontend nunca busca nem exibe.

Para intenção `registrar`, a API devolve `resposta: null`.

Consequência direta: a pergunta "Qual o valor do almoço?" é gerada corretamente e nunca chega ao usuário. A correção mais importante da rodada 1 está feita e invisível.

### Duas decisões

**1. `resposta` nunca pode ser null.** A regra do C2 — resposta citando valores — foi aplicada só em algumas intenções. Registro é justamente onde ela mais importa.

**2. Devolver o conteúdo, não só IDs.** Obrigar o frontend a fazer uma segunda busca por `assistant_message_ids` cria um passo que pode falhar em silêncio, e foi exatamente o que aconteceu. A Edge Function deve devolver tudo que a tela precisa para renderizar.

### Prompt

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-03, RF-04).

BUG CRÍTICO: nenhuma resposta do assistente renderiza. Em 20 mensagens
enviadas, zero cards e zero respostas apareceram na tela. O backend
funciona; o frontend nunca exibe.

Para intencao "registrar" a API devolve resposta: null, e o front depende
de buscar as mensagens por assistant_message_ids — busca que não acontece.

CORREÇÃO 1 — A EDGE FUNCTION DEVOLVE TUDO QUE A TELA PRECISA
A resposta passa a conter o conteúdo pronto, não apenas identificadores:

{
  "resposta": "texto do assistente, SEMPRE preenchido",
  "transacoes_criadas": [ { id, valor, tipo, categoria, data, descricao } ],
  "pergunta": null | { texto, opcoes: [] },
  "assistant_message_id": "uuid"
}

resposta NUNCA pode ser null. Regras de conteúdo:
- 1 transação: "Anotei: Alimentação, R$ 32,00, hoje"
- N transações: "Anotei 2 lançamentos: Mercado R$ 120,00 e Farmácia R$ 40,00"
- Nada gravado: diz que não gravou e por quê
- Esclarecimento: a pergunta específica
- Falha parcial: o que entrou e o que não entrou

CORREÇÃO 2 — O FRONTEND RENDERIZA DIRETO DA RESPOSTA
- Ao receber o POST, adicionar imediatamente ao feed a mensagem do
  assistente e um card por item de transacoes_criadas
- Não depender de nova busca ao banco para exibir
- A persistência em chat_messages continua, mas serve ao histórico, não
  à renderização imediata
- Erro de rede: mensagem clara no feed e o texto digitado preservado

CORREÇÃO 3 — CARD DE ESCLARECIMENTO
Quando vier pergunta, renderizar o card com o texto específico e os chips
de opção. Hoje existe um card genérico "Parece que faltou alguma
informação. Sim/Não" — substituir pelo conteúdo real.

VERIFICAÇÃO
Enviar "almoço 32" e confirmar que o card aparece na tela em menos de 3s,
sem recarregar. Enviar "almoço" e confirmar que a pergunta "Qual o valor
do almoço?" aparece na tela.
```

### DoD

- [ ] Card aparece na tela ao registrar, sem recarregar
- [ ] `resposta` sempre preenchida, inclusive em registro
- [ ] Pergunta específica renderizada com chips
- [ ] Texto genérico "Processado." eliminado
- [ ] Erro de rede visível, texto preservado

### Não fazer

Sem mexer no feed histórico — é o D3.

---

# D3 — Feed e lista de transações

### Sintoma medido

O feed carrega as **50 mensagens mais antigas**. Recarregado 4 vezes, sempre termina na mesma mensagem de sessões anteriores. Nenhuma das 20 mensagens do dia aparece. Rolar para o topo não carrega nada: contagem fixa em 51 nós.

A lista de transações no Resumo, pedida no C1, **não existe**. Excluir só existe no card do feed, que só existe para as 50 mensagens antigas.

Resultado: 24 transações de teste ficaram impossíveis de apagar pela interface.

### Prompt

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-04, RF-08).

Duas correções do C1 não foram aplicadas. Reaplicar.

CORREÇÃO 1 — CONSULTA DO FEED
Hoje retorna as 50 mensagens MAIS ANTIGAS. Confirmado: o feed sempre
termina na mesma mensagem de sessões anteriores.

- order by created_at DESC, limit 50
- Inverter no cliente para exibir em ordem cronológica
- Ao abrir, rolar para o fim (mensagem mais recente)
- Paginação: rolar até o topo carrega o lote anterior, mantendo a posição
  de leitura

CORREÇÃO 2 — LISTA DE TRANSAÇÕES NO RESUMO
Não existe. Sem ela, transação fora das 50 mensagens é ingerenciável.

Adicionar na tela de Resumo, abaixo do gráfico, a lista de TODAS as
transações do mês selecionado:
- Data, descrição, categoria e valor
- Ordenada por data, mais recente primeiro
- Editar categoria e valor, na mesma interação dos chips do feed
- Excluir
- Estado vazio orientando

Esta lista passa a ser o caminho canônico de gestão. O card do feed é atalho.

CORREÇÃO 3 — CONFIRMAÇÃO AO EXCLUIR
Hoje um clique apaga direto, sem confirmação e sem desfazer. No teste isso
apagou uma transação real por engano.
- Confirmação citando valor e descrição
- Vale para o feed e para a lista nova

VERIFICAÇÃO
Com mais de 50 mensagens no histórico, criar uma transação nova e confirmar
que ela aparece no feed após recarregar, e que é editável e excluível pelos
dois caminhos.
```

### DoD

- [ ] Feed mostra as mensagens mais recentes
- [ ] Rolagem para o topo carrega anteriores
- [ ] Abre no fim
- [ ] Lista de transações no Resumo, com editar e excluir
- [ ] Exclusão com confirmação citando valor
- [ ] Nenhuma transação inalcançável

---

# D4 — Limpeza do banco (manual, sua)

O app está poluído e **o usuário não consegue limpar pela interface**. Não é prompt: é SQL, e você executa depois que o D3 estiver funcionando.

| | Inicial | Agora |
|---|---|---|
| Saldo | R$ 5.470,00 | R$ 4.361,00 |
| Receitas Set | R$ 6.000,00 | R$ 12.000,00 |
| Despesas Set | R$ 530,00 | R$ 7.639,00 |
| Despesas Ago | R$ 0,00 | R$ 99,00 |

**Faça backup antes:**

```bash
npm run backup
```

Inspecione o que existe antes de apagar:

```sql
select id, data, descricao, categoria, valor, tipo, created_at
from transactions
where user_id = auth.uid()
order by created_at desc;
```

As transações de teste são as criadas a partir de 06/09/2026 16:17. Apague por janela de tempo, conferindo a lista antes:

```sql
delete from transactions
where user_id = 'SEU_USER_ID'
  and created_at >= '2026-09-06 19:17:00+00';
```

E o teto de transporte criado no teste:

```sql
delete from goals
where user_id = 'SEU_USER_ID'
  and categoria = 'transporte';
```

O Uber de R$ 30,00 apagado por engano você recria pelo app, ou insere manualmente se quiser preservar a data original.

**Não use "Excluir minha conta" para limpar.** Ela remove tudo, inclusive o histórico legítimo.

---

# D5 — Gráfico vazio e `numeric` como texto

### Sintoma medido

O `<svg class="recharts-surface">` existe, em 366×256px, com o grupo `recharts-pie` presente e **zero elementos `<path>`**. Reproduzido com 50 transações e 5 categorias, e também em Agosto com uma única transação.

O badge de comparação mostra `7616%`, sem formatação nem contexto.

### Hipótese principal

Colunas `numeric` do PostgreSQL são devolvidas ao JavaScript como **string**, não como número — o cliente faz isso de propósito, para não perder precisão em valores grandes.

Se o código soma com `+`, `"500" + "30"` vira `"50030"`. Recharts recebe string onde espera número e não desenha nada.

Isso explica os dois sintomas de uma vez. E explica por que os KPIs funcionam: eles provavelmente vêm somados do SQL, onde o tipo se mantém.

### Prompt

```
BUG: o gráfico de rosca renderiza vazio e um badge mostra "7616%".

SINTOMA
O svg recharts-surface existe com o grupo recharts-pie presente e ZERO
elementos <path>. Ocorre com 50 transações e 5 categorias, e também com
uma única transação.

HIPÓTESE A INVESTIGAR PRIMEIRO
Colunas numeric do PostgreSQL chegam ao JavaScript como STRING, não como
número — comportamento intencional do cliente, para preservar precisão.

Se o código faz soma com +, "500" + "30" resulta em "50030". Recharts
recebe string onde espera número e não desenha. Isso também explicaria o
badge de 7616%.

Verifique o typeof dos valores logo após a consulta ao Supabase e me diga
o que encontrou ANTES de corrigir.

CORREÇÃO, se a hipótese se confirmar
- Converter numeric para número em UM ponto só, na camada de acesso a
  dados, nunca espalhado pelos componentes
- Usar conversão explícita, não coerção implícita
- Tipar o retorno para que string em campo de valor seja erro de compilação
- Auditar TODAS as agregações feitas no cliente: gráfico, badge de
  comparação, Maiores Gastos, progresso de metas

CUIDADO
Não converter para float e voltar a gravar. A precisão de numeric(12,2)
precisa ser preservada na escrita. A conversão é só para exibição e cálculo
de apresentação.

VERIFICAÇÃO
- Gráfico desenha as fatias com 1 transação e com 50
- Badge mostra percentual plausível e formatado
- Somas do cliente batem com as do SQL
```

### DoD

- [ ] Hipótese confirmada ou descartada, com evidência
- [ ] Conversão em ponto único
- [ ] Gráfico desenhando
- [ ] Badge plausível e formatado
- [ ] Agregações do cliente auditadas

---

# D6 — Regressões do parser

Três casos que funcionavam e pararam.

| Caso | Antes | Agora |
|---|---|---|
| `"32"` sozinho | Perguntava a categoria | Cai em conversa genérica |
| `"gastei 50 ontem no uber"` | Registrava | Ignorada; resposta repete as anteriores |
| `"quanto gastei esse mês?"` | Total do mês | Responde sobre uma categoria; às vezes vira criação de meta |

### Prompt

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-01, RF-05).

Três regressões no roteamento de intenção.

REGRESSÃO 1 — "32" sozinho
Antes perguntava a categoria. Agora é classificado como "conversa" e
responde saudação genérica.
Uma mensagem que contém apenas um número é intenção "registrar" com
categoria ausente. Deve perguntar a categoria.

REGRESSÃO 2 — "gastei 50 ontem no uber" engolida
A mensagem foi ignorada e a resposta repetiu transações anteriores.
Provavelmente efeito colateral da duplicação em cascata (D1). Reteste
depois do D1 e, se persistir, investigue o roteamento.

REGRESSÃO 3 — consulta virou resposta por categoria
"quanto gastei esse mês?" respondeu sobre transporte em vez do total, e em
uma ocasião foi classificada como intenção "meta", recriando um teto.

Classificar uma pergunta como criação de meta é grave: uma consulta
escreveu no banco. Consulta NUNCA pode gravar.

- "quanto gastei esse mês?" → total de TODAS as categorias
- "quanto gastei com comida?" → apenas a categoria citada
- Intenção "consultar" não escreve no banco em nenhuma hipótese.
  Adicionar essa trava no servidor, não só no prompt

ADICIONAR AO DATASET DE REGRESSÃO
  "32"                      → pergunta categoria
  "gastei 50 ontem no uber" → registra, transporte, ontem
  "quanto gastei esse mês?" → total do mês, sem escrita
  "no máximo 300 com lazer" → cria teto
```

### DoD

- [ ] `"32"` pergunta a categoria
- [ ] Mensagem de registro nunca é ignorada
- [ ] Consulta devolve o total do mês
- [ ] Trava no servidor: `consultar` não escreve
- [ ] Casos no dataset

---

# D7 — O que a rodada 1 não entregou

Depende do resultado do D0. Se o levantamento mostrar que não foram tentados, reaplicar; se foram feitos em arquivo fora de uso, o problema é outro.

### Prompt

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-06, RNF-05).

Estes itens foram pedidos na rodada anterior e o reteste confirma que não
estão no app. Reaplique.

DATAS (era o C3)
Maiores Gastos e o gráfico exibem um dia a MENOS. O card do feed acerta.
Backend grava 2026-09-06; Maiores Gastos exibe 05 Set. Confirmado também
em 31/08 exibido como 30 Ago.
- Causa: new Date("2026-09-06") interpretado como meia-noite UTC e
  renderizado em UTC-3
- Utilitário único de data, sem new Date() em string pura
- Substituir TODAS as ocorrências, com atenção a Maiores Gastos e ao
  tooltip do gráfico
- created_at é timestamptz e tem tratamento diferente

METAS (era o C4)
A tela tem exatamente 2 botões: seta ‹ e seta ›.
- Criar teto: categoria + valor
- Editar valor
- Excluir, com confirmação
- Remover a meta "Outros (Poupança)", que soma RECEITA contra teto de
  poupança e exibe "R$ 6.000,00 de R$ 400,00 — Meta alcançada!"
- Corrigir get_or_create_monthly_goals, que está duplicando essa meta em
  Outubro automaticamente
- Progresso considera apenas transações do tipo despesa

FORMATAÇÃO (era o C5)
- Valores nas respostas do chat sem separador e sem centavos: "R$ 380",
  "R$ 5246", "R$ 6000". Formatador único pt-BR aplicado ao texto do
  modelo também — peça o número, formate no código
- Categorias exibidas como enum: "Alimentacao", "saude". Mapa de exibição
  com acento e maiúscula, no Resumo e no seletor do card
- Placeholders "Seu saldo é R$ X." persistem no histórico: identificar a
  origem e limpar

ACESSIBILIDADE (era o C6)
- Remover maximum-scale=1.0 e user-scalable=no do viewport
- og:image absoluta (https://expensesdu.vercel.app/og-image.jpg) e
  adicionar og:url
- Legenda ou rótulos no gráfico: em escala de cinza é ilegível
- tabular-nums no centro do gráfico e em Maiores Gastos
- Separar "Excluir minha conta" de "Sair da Conta", em zona de perigo
- /login e /criar-conta redirecionam para /app quando há sessão
```

### DoD

- [ ] Data idêntica em card, Maiores Gastos, lista e tooltip
- [ ] CRUD de metas completo
- [ ] Meta de poupança removida e sem recriação
- [ ] Moeda formatada em todo lugar, inclusive no texto do modelo
- [ ] Categorias com acento
- [ ] Zoom liberado, `og:image` absoluta
- [ ] Gráfico legível sem cor
- [ ] `/login` redirecionando

---

## Antes de chamar o reteste

Cheque você mesmo, em 5 minutos:

1. Envie `"almoço 32"`. **O card aparece na tela?** Se não, o D2 não pegou e não vale retestar
2. Envie `"aluguel 1250"` e depois `"padaria 30"`. **Foram criadas exatamente 2 transações?**
3. Recarregue. **A conversa mostra as mensagens de hoje?**
4. Abra o Resumo. **Existe lista de transações com excluir?**
5. Abra o gráfico. **Desenha as fatias?**

Cinco "sim" e o roteiro completo faz sentido. Qualquer "não" e o reteste vai medir de novo o mesmo bug.

---

## O que está bom e não deve ser mexido

- Extração de valor, categoria e data: 7 de 7 em mensagem limpa
- Locale brasileiro: `1.250,00` e `32,50` sem tropeço
- Datas relativas: "ontem", "dia 31 de agosto"
- Receita distinguida de despesa
- Aritmética dos totais: previsto R$ 7.669,00, exibido R$ 7.669,00. Zero divergência de centavos
- Injeção de prompt sem vazamento
- Estado vazio, foco de teclado, responsividade a 320px
- Confirmação dupla ao excluir conta
- Scroll consistente ao editar
