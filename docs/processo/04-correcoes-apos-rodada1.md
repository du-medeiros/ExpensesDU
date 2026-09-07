# Prompts de Correção — ExpensesDu

**Origem:** relatório de teste executado no navegador, 35 itens
**Resultado:** 24 passaram, 4 parciais, 4 falharam, 11 comportamentos inesperados

---

## O diagnóstico que amarra tudo

As três falhas graves são a mesma falha em lugares diferentes: **o app nunca admite incerteza nem erro.**

| Sintoma | O que o usuário vê |
|---|---|
| Feed congela e a transação some | "Processado." e nada aparece |
| Valor ausente é herdado da mensagem anterior | "Processado." e um valor inventado |
| Duas despesas na frase são descartadas | "Processado." e nada é gravado |

Sempre a mesma palavra, sempre afirmando sucesso. Corrigir cada bug isoladamente sem corrigir esse padrão faz o próximo bug falhar do mesmo jeito.

**Regra que passa a valer em todo o app:** nenhuma operação que toca dado financeiro responde de forma genérica. Ou diz o que gravou, com valores, ou diz o que não conseguiu e por quê.

---

## Ordem das correções

| # | Correção | Gravidade | Por que nesta posição |
|---|---|---|---|
| C1 | Feed e acesso às transações | **Crítica** | Há dado financeiro inacessível pela interface agora |
| C2 | Interpretador: não inventar, não engolir | **Crítica** | Fabricação silenciosa de valor |
| C3 | Datas e fuso horário | **Alta** | Corrompe o fechamento de mês em silêncio |
| C4 | Metas: criar, editar, excluir | Alta | Tela anunciada e não funcional |
| C5 | Mensagens e formatação | Média | Markdown cru e locale errado |
| C6 | Acessibilidade e polimento | Média | Itens do RNF-05 não cumpridos |

---

# C1 — Feed congelado e transações órfãs

### Sintoma observado

Depois de cerca de 25 turnos, transações novas somem do feed ao recarregar, mas continuam no banco e no Resumo. Como lixeira e chips de edição só existem no card do feed, essas transações ficam impossíveis de corrigir ou apagar pela interface. No teste, 5 de 6 transações precisaram ser removidas chamando a API diretamente.

### Causa provável

A consulta do histórico usa `limit(50)` com ordenação **ascendente**, então retorna sempre as 50 mensagens mais antigas. Passando de 50, as novas nunca entram na janela.

### Problema de arquitetura por trás

Mesmo corrigindo a consulta, **gerenciar transação só pelo feed é frágil.** O feed é um histórico de conversa; a transação é um registro financeiro. Amarrar a única via de edição e exclusão à posição da mensagem no histórico significa que qualquer problema de paginação vira perda de controle sobre dinheiro.

### Prompt

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-04) antes de começar.

BUG CRÍTICO: transações ficam inacessíveis pela interface.

A consulta do histórico de chat_messages retorna as 50 mensagens MAIS ANTIGAS
em vez das mais recentes. Passando de ~25 turnos, as transações novas não
aparecem no feed. Como excluir e editar só existem no card do feed, elas se
tornam impossíveis de gerenciar. No teste, 5 transações precisaram ser
apagadas via API.

CORREÇÃO 1 — CONSULTA DO FEED
- Buscar as N mensagens mais RECENTES: order by created_at desc, limit N
- Inverter no cliente para exibir em ordem cronológica
- Paginação para cima: ao rolar para o topo, carrega o lote anterior
- Ao abrir a tela, rolar para o FIM do feed (mensagem mais recente).
  Hoje abre no topo, na mensagem mais antiga

CORREÇÃO 2 — VIA ALTERNATIVA DE GESTÃO (obrigatória)
Gerenciar transação não pode depender de a mensagem estar visível no feed.
Adicionar na tela de Resumo uma lista de TODAS as transações do mês
selecionada, com:
- Valor, categoria, data e descrição
- Editar categoria e valor, mesma interação dos chips
- Excluir
- Ordenação por data, mais recente primeiro

Essa lista passa a ser o caminho canônico de gestão. O card no feed
continua existindo como atalho.

CORREÇÃO 3 — CONFIRMAÇÃO ANTES DE EXCLUIR
Excluir transação hoje não pede confirmação. Adicionar confirmação com o
valor e a descrição no texto, para o usuário saber o que está apagando.

VERIFICAÇÃO QUE VOCÊ MESMO DEVE RODAR
Criar 60 mensagens de teste e confirmar que a de número 60 aparece no feed
após recarregar, e que é editável e excluível pelas duas vias.
```

### DoD

- [ ] Mensagem número 60 aparece no feed após recarregar
- [ ] Feed abre no fim, não no topo
- [ ] Rolar para o topo carrega mensagens anteriores
- [ ] Lista de transações no Resumo, com editar e excluir
- [ ] Exclusão pede confirmação citando valor e descrição
- [ ] Nenhuma transação acessível apenas via API

### Não fazer

Sem mudança no parser. Sem redesenho visual. Sem alteração de schema.

---

# C2 — O interpretador inventa e engole em silêncio

### Sintomas observados

| Entrada | O que deveria | O que fez |
|---|---|---|
| `almoço` | Perguntar o valor | Gravou R$ 32,00, herdado da mensagem anterior |
| `mercado 120 e farmácia 40` | Duas transações | "Processado.", nada gravado |
| `oi` | Conversa | Card de clarificação "Sim/Não" sem contexto |

### Causas prováveis

**Herança de valor:** o histórico está sendo enviado ao modelo e ele copia o valor anterior quando a mensagem atual não tem número. O contrato permite `valor: null`, mas o prompt de sistema não proíbe explicitamente buscar valor fora da mensagem atual.

**Múltiplas transações descartadas:** o código provavelmente lê `transacoes[0]` ou trata o array como objeto único, e cai num caminho de erro que responde com o texto fixo.

**Clarificação no lugar errado:** o mecanismo funciona — apareceu no `oi`. Está ligado ao gatilho errado.

### Prompt

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-01, RF-02, RF-03)
e o Anexo A antes de começar.

TRÊS BUGS CRÍTICOS no interpretador, todos com o mesmo efeito: o usuário
não sabe o que aconteceu.

BUG 1 — VALOR HERDADO DA MENSAGEM ANTERIOR
Enviar "almoço" logo após "almoço 32" gravou R$ 32,00. O modelo copiou o
valor do histórico. Isso é FABRICAÇÃO DE DADO FINANCEIRO e é o bug mais
grave dos três.

Correção no prompt de sistema, de forma explícita:
- O valor deve vir EXCLUSIVAMENTE da mensagem atual
- Se a mensagem atual não contém valor identificável, devolver valor: null
- É PROIBIDO inferir, estimar ou reaproveitar valor do histórico
- O histórico serve apenas para resolver intenção "corrigir"
  (ex.: "na verdade foi 42")

Correção no servidor, como defesa:
- Intenção "registrar" com valor null ou ausente NUNCA grava
- Dispara o fluxo de esclarecimento

BUG 2 — MÚLTIPLAS TRANSAÇÕES DESCARTADAS
"mercado 120 e farmácia 40" respondeu "Processado." e não gravou nada.
- Verificar se o código lê transacoes[0] em vez de iterar o array
- Gravar TODAS as transações do array
- Renderizar um card por transação
- Se a gravação de alguma falhar, dizer QUAL falhou e por quê

BUG 3 — CLARIFICAÇÃO NO GATILHO ERRADO
O card "Sim/Não" apareceu na mensagem "oi" e NÃO apareceu quando faltava
valor. O mecanismo funciona, está ligado ao caso errado.
- Clarificação dispara quando: intenção "registrar" E (valor null OU
  confiança < 0,80)
- Nunca dispara em intenção "conversa"
- A pergunta precisa ser específica: "Quanto foi o almoço?", não
  "faltou alguma informação"
- Oferecer chips de resposta, não Sim/Não

BUG 4 — "PROCESSADO." COMO RESPOSTA UNIVERSAL
Hoje a mesma palavra responde a sucesso, a dado inventado e a lançamento
perdido. Substituir por resposta que reflita o que aconteceu:

- 1 transação: "Anotei: Alimentação, R$ 32,00, hoje"
- N transações: "Anotei 2 lançamentos: Mercado R$ 120,00 e Farmácia
  R$ 40,00"
- Nada gravado: dizer que não gravou e por quê
- Falha parcial: dizer o que entrou e o que não entrou

NENHUMA resposta genérica em operação que toca dado financeiro.

REGRESSÃO OBRIGATÓRIA
Adicionar ao dataset de teste, e todos devem passar:
  "almoço 32" seguido de "almoço"  → o segundo PERGUNTA, não grava
  "mercado 120 e farmácia 40"      → duas transações
  "oi"                              → sem card de clarificação
  "32"                              → pergunta a categoria
```

### DoD

- [ ] "almoço" após "almoço 32" pergunta o valor e não grava
- [ ] "mercado 120 e farmácia 40" cria duas transações e dois cards
- [ ] "oi" não dispara clarificação
- [ ] Toda resposta de registro cita valores e categorias
- [ ] Falha diz o que falhou
- [ ] Casos de regressão no dataset, todos passando

### Não fazer

Sem mexer no feed. Sem mudar o schema de Structured Outputs — ele está correto, o problema é o prompt de sistema e o tratamento do array.

---

# C3 — Datas com um dia de diferença

### Sintoma observado

O banco grava `data: "2026-09-06"`. O card mostra 06/09/2026. A lista "Maiores Gastos" mostra **05 Set**. O Uber de 05/09 aparece como 04 Set.

### Causa

Clássica e específica: `new Date("2026-09-06")` interpreta a string como **meia-noite UTC**. Renderizada em `America/Sao_Paulo` (UTC-3), vira 05/09 às 21h — e exibe o dia anterior.

O campo é `date`, não `timestamp`. Não tem hora, não tem fuso, e não deve passar por conversão nenhuma.

### Por que isso é mais grave do que parece

Uma despesa lançada depois das 21h cai no **mês errado** na virada de mês. O total de setembro fica errado e ninguém percebe até conferir à mão.

### Prompt

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-02 e RNF-03).

BUG: datas exibidas com um dia a menos em alguns componentes.

O banco grava data como "2026-09-06" (tipo date, sem hora). O card exibe
06/09 corretamente, mas "Maiores Gastos" exibe 05 Set.

CAUSA
new Date("2026-09-06") é interpretado como meia-noite UTC. Em UTC-3 isso
vira 05/09 às 21h, e o componente exibe o dia anterior.

CORREÇÃO
- NUNCA passar string de data pura para new Date()
- Criar um utilitário único, ex. src/lib/data.ts, com funções para
  interpretar e formatar datas puras usando componentes locais
  (dividir a string em ano, mês e dia)
- Substituir TODAS as conversões de data do projeto por esse utilitário
- Buscar no código inteiro por new Date( aplicado a campos de data e
  corrigir cada ocorrência
- Formatação em pt-BR

CUIDADO: created_at é timestamptz e tem outro tratamento. O utilitário
precisa distinguir data pura de timestamp.

VERIFICAÇÃO
- Transação em 2026-09-06 exibe 06/09 em TODOS os componentes: card,
  Maiores Gastos, lista do Resumo, tooltip do gráfico
- Transação registrada às 23h30 cai no dia de hoje
- Transação no último dia do mês, às 23h, aparece no mês correto
```

### DoD

- [ ] Data idêntica em todos os componentes
- [ ] Utilitário único, sem conversão espalhada
- [ ] Teste de 23h30 passando
- [ ] Teste de virada de mês passando

### Não fazer

Sem mudar o tipo da coluna. Sem mexer no parser.

---

# C4 — Metas somente leitura

### Sintomas observados

A tela de Metas não tem criar, editar nem excluir — confirmado na árvore de acessibilidade. O único caminho de criação é acertar a frase na conversa, e não há caminho nenhum para apagar. Os tetos do teste precisaram ser removidos via API.

Além disso: a "meta de poupança" existente soma **toda a receita** (R$ 6.000,00 de R$ 400,00 — "Meta alcançada!") e está duplicada em Setembro e Outubro, então reaparece sozinha todo mês.

### Decisão necessária antes do prompt

O PRD define metas como **teto de gasto por categoria**, e só. A "meta de poupança" está fora de escopo e é justamente a que foi cortada, por precisar do saldo real que o app não conhece. Somar receita não é medir poupança: o app está exibindo um número que não significa o que diz.

Recomendo remover. Se preferir manter, ela precisa de um conceito próprio, não de reaproveitar `goals`.

### Prompt

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-06).

A tela de Metas é somente leitura e há uma meta fora de escopo.

PARTE A — CRUD COMPLETO
- Botão de criar teto na tela: categoria + valor mensal
- Editar valor de teto existente
- Excluir teto, com confirmação
- Estado vazio orientando a criar o primeiro

PARTE B — REMOVER A META DE POUPANÇA
Existe uma meta "Outros (Poupança)" que soma RECEITAS e exibe
"R$ 6.000,00 de R$ 400,00 — Meta alcançada!". Ela não faz parte do
escopo: o PRD define metas como teto de GASTO por categoria.

Somar receita não mede poupança. O número exibido não significa o que diz.

- Migration que remove essa meta
- Garantir que o cálculo de progresso considera apenas transações do
  tipo despesa

PARTE C — DUPLICAÇÃO ENTRE MESES
A mesma meta existe em Setembro e Outubro na tabela goals, e reaparece
todo mês sozinha.
- Confirmar a constraint unique (user_id, categoria, mes_referencia)
- Revisar a lógica de recriação mensal: recriar com o mesmo valor é o
  esperado, duplicar no mesmo mês não
- Limpar as duplicatas existentes

PARTE D — FORMATAÇÃO
A criação por conversa responde "Teto de R$ 400.00 para transporte" —
formato en-US. Deve ser R$ 400,00, pt-BR. Ver C5.
```

### DoD

- [ ] Criar, editar e excluir teto pela tela
- [ ] Exclusão com confirmação
- [ ] Meta de poupança removida
- [ ] Progresso considera só despesas
- [ ] Sem duplicatas entre meses
- [ ] Estado vazio orientando

### Não fazer

Sem criar metas de poupança "corrigidas" — está fora do escopo do MVP. Sem mexer no parser.

---

# C5 — Mensagens e formatação

### Sintomas observados

- Markdown cru na conversa: `**1898**` literal
- Valores sem formatação: `1926,5` em vez de R$ 1.926,50
- Locale misturado: `R$ 400.00` na criação de teto, `R$ 400,00` nos cards
- Respostas placeholder no histórico: "Seu saldo é R$ X." literal
- Títulos inconsistentes: `gastei 30 no uber` → "Uber"; `gastei 350 no uber` → "Gastei 350 No Uber"
- Categorias sem acento e em minúsculas na interface: "alimentacao", "saude"

### Prompt

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-05).

Problemas de formatação e apresentação.

1. MARKDOWN CRU
A conversa exibe **1898** literal. Ou renderizar markdown nas mensagens
do assistente, ou instruir o modelo a não usar markdown. Escolha uma e
aplique de forma consistente.

2. FORMATAÇÃO DE MOEDA
Criar um utilitário único de formatação em pt-BR e usá-lo em TODO lugar:
- R$ 1.926,50, nunca 1926,5 nem R$ 400.00
- Sempre duas casas decimais
- Ponto como separador de milhar, vírgula como decimal
- O texto gerado pelo modelo também precisa passar pelo formatador:
  não confie no modelo para formatar moeda. Peça o número, formate no
  código

3. RESPOSTAS PLACEHOLDER
Há mensagens "Seu saldo é R$ X." literais no histórico, de sessões
antigas. Encontrar a origem e remover. Se for template não substituído,
é bug ativo, não resíduo.

4. RÓTULOS DAS CATEGORIAS
A interface exibe os valores do enum: "alimentacao", "saude". Criar um
mapa de exibição: Alimentação, Saúde, Transporte, Moradia, Lazer,
Compras, Contas, Outros. O enum no banco continua sem acento.
Corrigir também o "Cancelar" do seletor.

5. TÍTULOS DE TRANSAÇÃO
"gastei 30 no uber" virou "Uber", "gastei 350 no uber" virou
"Gastei 350 No Uber". Instruir o modelo a extrair uma descrição curta
do ITEM, não a repetir a frase. Nunca aplicar capitalização de título
palavra a palavra.
```

### DoD

- [ ] Nenhum markdown cru visível
- [ ] Formatador único de moeda, aplicado inclusive ao texto do modelo
- [ ] Nenhuma resposta placeholder
- [ ] Categorias exibidas com acento e maiúscula
- [ ] Títulos curtos e consistentes

### Não fazer

Sem redesenho visual. Sem mexer no feed nem nas metas.

---

# C6 — Acessibilidade e polimento

### Sintomas observados

| Item | Situação |
|---|---|
| Zoom | `user-scalable=no` e `maximum-scale=1.0` bloqueiam o pinch no Chrome Android |
| Gráfico em escala de cinza | Anel cinza uniforme, sem legenda nem rótulo |
| `tabular-nums` | Presente nos KPIs, ausente no centro do gráfico e em "Maiores Gastos" |
| Recharts a 320px | Wrapper com largura fixa de 407px, recortado |
| `og:image` | Caminho relativo `/og-image.jpg` — preview não funciona |
| Excluir conta | Ao lado de "Sair da Conta", sem separação |
| `/login` logado | Não redireciona para `/app` |
| Scroll ao editar | Editar categoria pula para o fim do feed; editar valor não |

### Prompt

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RNF-05).

1. DESBLOQUEAR O ZOOM
Remover maximum-scale=1.0 e user-scalable=no da meta viewport.
Viola WCAG 1.4.4 e o RNF-05. Deixar apenas
width=device-width, initial-scale=1.0

2. GRÁFICO SEM DEPENDER DE COR
Em escala de cinza o donut vira um anel uniforme. Adicionar legenda com
nome da categoria e valor, ou rótulos nas fatias. A informação não pode
depender só da cor.

3. ALGARISMOS TABULARES
Aplicar font-variant-numeric: tabular-nums também no centro do gráfico e
na lista "Maiores Gastos". Hoje só os KPIs têm.

4. GRÁFICO EM TELA ESTREITA
O wrapper do Recharts mantém 407px fixos e é recortado a 320px. Usar
ResponsiveContainer com largura percentual.

5. OPEN GRAPH
og:image está como /og-image.jpg, caminho relativo — o preview não
aparece no LinkedIn nem no WhatsApp. Trocar por URL absoluta
https://expensesdu.vercel.app/og-image.jpg e adicionar og:url.

6. EXCLUIR CONTA
Está lado a lado com "Sair da Conta". Separar visualmente, mover para o
fim da tela, e exigir confirmação em duas etapas com digitação do e-mail.

7. REDIRECIONAMENTO DE /login
Usuário autenticado acessando /login ou /criar-conta deve ir para /app.

8. SCROLL AO EDITAR
Editar categoria joga o scroll para o fim do feed; editar valor não.
Padronizar: manter a posição de rolagem nos dois casos.
```

### DoD

- [ ] Zoom funcionando no Android
- [ ] Gráfico legível em escala de cinza
- [ ] Algarismos tabulares em todos os números
- [ ] Nada recortado a 320px
- [ ] Preview aparece ao colar o link no WhatsApp
- [ ] Excluir conta separado e com confirmação dupla
- [ ] `/login` redireciona quem já está logado
- [ ] Scroll consistente entre as duas edições

### Não fazer

Sem redesenho de identidade visual. Isso é o prompt 13 e vem depois.

---

## Reteste depois das correções

Rodar de novo, no mínimo, os itens: 2, 3, 8, 9, 20, 25, 27, 28.

E acrescentar dois que o teste anterior não cobria:

**Item 36 — Feed longo.** Criar 60 mensagens, recarregar, confirmar que a última aparece e é editável.

**Item 37 — Virada de mês.** Registrar uma despesa às 23h do último dia do mês e confirmar que ela conta no mês correto.

---

## O que estava bom e não deve ser mexido

Vale registrar, porque em rodada de correção é comum quebrar o que funcionava:

- Interpretação de valores com locale brasileiro: `1.250,00` e `32,50` sem tropeço. É onde a maioria desses apps quebra
- `"ontem"` resolvido corretamente
- Receita distinguida de despesa
- Injeção de prompt sem efeito
- Totais batendo exatamente, sem divergência de centavos — `numeric` está correto
- RLS funcionando: logout e re-login preservam os dados
- Estado vazio bem resolvido
- Foco de teclado visível
- App recusa carregamento em iframe
