# Prompts para o Antigravity — Rodada 4

Cole um por vez, na ordem. Não avance sem verificar o anterior.

**F0 é diagnóstico, sem código.** F1 é o único que corrompe dado. F2 é o que impede a demonstração.

---

## Regra de abertura de sessão

```
Leia /docs/expensesdu-documentacao.md antes de qualquer alteração. Ele é a
fonte de verdade do projeto. Se alguma instrução minha contradisser o
documento, aponte a contradição antes de codar.
```

---

## O que a rodada 3 resolveu — não remexer

| | Rodada 3 | Rodada 4 |
|---|---|---|
| Acurácia de categoria | 76,5% | **88,9%** |
| Feed após reload | zerava | 101 mensagens |
| Metas pelo formulário | PGRST204 | funciona |
| Duplicação | zero | zero |
| Transações inalcançáveis | zero | **zero** |
| Soma × KPIs | ao centavo | ao centavo |
| Formatação de moeda | "12133.2" | R$ 4.661,50 |

Bloco B passou 11 de 12. O único que caiu foi por layout, não por lógica.

---

# F0 — Sumiço das transações de Setembro

*Diagnóstico. Nenhum código nesta etapa.*

```
Leia a PARTE 2 de /docs/expensesdu-documentacao.md (seção sobre migrations
imutáveis).

INVESTIGAÇÃO, SEM CORREÇÃO. Não altere nada. Me apresente o diagnóstico
e espere meu aval.

Ao fim da rodada 3 existiam 28 transações legítimas em Setembro/2026.
Na rodada 4 elas não existem mais. Agosto/2026 sobreviveu intacto
(1 transação, R$ 99,00). A API responde 200 com array vazio — a consulta
está sã, as linhas é que não estão lá.

Isto é perda de dado entre sessões e é mais grave que qualquer bug de
interface.

INVESTIGUE E ME RELATE:

1. Liste todas as migrations aplicadas entre a rodada 3 e a rodada 4,
   com data e conteúdo. Alguma contém DELETE, TRUNCATE, DROP ou ALTER
   destrutivo em transactions?

2. A correção do E3 renomeou a coluna de goals (valor_limite → valor_teto).
   Essa migration tocou em transactions de alguma forma? Recriou tabela?
   Rodou CASCADE?

3. Existe algum script de seed, reset ou limpeza que rode no build ou no
   deploy? Verifique package.json, workflows e configuração da Vercel.

4. Alguma constraint com ON DELETE CASCADE liga goals a transactions?
   A troca de coluna em goals pode ter arrastado linhas.

5. As transações sumiram ou ficaram órfãs? Consulte com privilégio
   elevado, ignorando RLS:
     select count(*), user_id from transactions group by user_id;
   Se aparecerem linhas com user_id que não existe mais em auth.users,
   nada foi perdido — é o caso de dados órfãos.

6. Agosto sobreviveu e Setembro não. O que distingue os dois? Data,
   forma de criação, alguma coluna nova preenchida em um e não no outro?

Me diga qual das hipóteses se confirma, com a evidência. Se nenhuma,
diga isso também — não invente causa.
```

---

# F1 — Fuso horário na gravação

*O único bug da rodada que corrompe dado, não só tela. Corrija antes de tudo.*

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-02, RNF-03) e a
seção 7 (contrato do parser).

BUG P0: o backend carimba "hoje" em UTC, não no fuso do usuário.

EVIDÊNCIA
Teste rodado às 22h de 06/09 no horário de Brasília. Treze lançamentos de
"hoje" foram gravados como 07/09. Medida contra o fuso real do perfil, a
acurácia de data cai de 88,9% para 16,7%.

O parser fez o certo: interpretou "hoje", "ontem", "anteontem" e "dia 1"
de forma coerente entre si. Quem errou foi o carimbo do backend.

CONSEQUÊNCIA
Depois das 21h todo lançamento aparece com a data de amanhã. Nos dias 30
e 31, cai no MÊS seguinte, e o fechamento mensal fica errado sem que o
usuário tenha como perceber.

O CONTRATO JÁ PREVÊ A SOLUÇÃO
A seção 7 define que a entrada da Edge Function inclui dataCliente (ISO)
e timezone. O RF-02 diz: "Data ausente = hoje, resolvida no timezone
recebido, JAMAIS em UTC."

Os campos existem no contrato. Descubra por que não estão sendo usados:
o cliente não envia, a function não lê, ou lê e ignora?

CORREÇÃO
- O cliente envia SEMPRE dataCliente e timezone do perfil
  (padrão America/Sao_Paulo)
- A Edge Function resolve "hoje", "ontem", "anteontem", "dia N" contra
  dataCliente, nunca contra o relógio do servidor
- Nenhum new Date() do lado do servidor para determinar "hoje"
- Verifique se a coluna data tem default now() no banco. Se tiver,
  remova: a data vem sempre calculada, nunca do default
- created_at continua timestamptz com now(), isso está correto e é
  outra coisa

VERIFICAÇÃO OBRIGATÓRIA
Simule dataCliente às 23h30 de 30/09 no fuso America/Sao_Paulo:
- "almoço 32"  → grava 2026-09-30, aparece em SETEMBRO
- "almoço 32 ontem" → grava 2026-09-29
Repita com 00h30 de 01/10: deve gravar 2026-10-01.

Me mostre o resultado dos dois casos antes de dar por concluído.
```

---

# F2 — Fluxo de esclarecimento

*Três defeitos do mesmo sistema. É o que impede demonstrar sem tropeçar.*

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-02, RF-03).

Três defeitos no esclarecimento. O primeiro é P0.

DEFEITO 1 — RESPONDER O VALOR NÃO FECHA O FLUXO (P0)
"almoço" pergunta o valor corretamente, com campo numérico. Respondendo
"32", volta "Pode esclarecer melhor esse gasto? Faltam detalhes." e
NENHUMA transação é criada. Reproduzido 2 de 2, também com "café" + 15.

A resposta volta em 0,6s — rápido demais para ter passado pelo modelo.
Existe um caminho curto que valida e desiste antes.

A causa é que o valor confirmado chega sem o pendente. O estado parcial
(descrição, categoria já extraídas) não viaja junto.

CORREÇÃO
- A resposta do esclarecimento envia { resposta_para: <pergunta_id>,
  valor: <número> }
- O servidor recupera o pendente por esse id, completa com o valor e
  GRAVA
- Se o pendente não for encontrado (expirado, por exemplo), dizer isso
  ao usuário e pedir a mensagem completa. Nunca "Faltam detalhes."
- Encontre o caminho curto que responde em 0,6s e faça ele completar o
  registro em vez de recusar

DEFEITO 2 — A REGRA NOVA NÃO FOI IMPLEMENTADA (P0)
"gastei 45" e "32" continuam perguntando a categoria. Pela decisão do E4,
deveriam REGISTRAR em "outros" e seguir.

Regra, sem exceção:
- Valor presente + categoria não identificada → grava em "outros".
  NÃO pergunta
- Valor ausente → pergunta o valor
- São os DOIS únicos caminhos

Categorização tardia é recurso previsto no produto. Pergunta
desnecessária é atrito, que é o que o app existe para eliminar.

DEFEITO 3 — BECO SEM SAÍDA (P0)
A pergunta de categoria de "gastei 45"/"32" renderiza SÓ um botão
"Cancelar" — sem chips e sem campo. É literalmente impossível de
responder.

Com o defeito 2 corrigido, essa pergunta deixa de existir. Então:
- REMOVA o caminho de pergunta de categoria do esclarecimento
- Os chips de categoria continuam existindo, mas só no fluxo de EDIÇÃO
  de um card já criado, nunca no esclarecimento
- Garanta que não sobra nenhum estado de pergunta sem opção de resposta

DEFEITO 4 — PERGUNTA ERRADA EM "comprei umas coisas"
Falta o VALOR e ele pergunta a categoria. Mesmo diagnóstico do defeito 2:
o fallback ainda confunde as duas causas.

VERIFICAÇÃO
- "almoço" → pergunta valor → responder "32" → transação CRIADA
- "gastei 45" → registra R$ 45,00 em Outros, sem perguntar
- "32" → registra R$ 32,00 em Outros
- "comprei umas coisas" → pergunta o VALOR
- Nenhuma tela de pergunta fica sem forma de responder
```

---

# F3 — Repetição idêntica engolida em silêncio

*A guarda anti-duplicação está funcionando como especificada. A especificação é que estava incompleta.*

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RNF-03).

BUG P1: mensagens idênticas repetidas somem sem resposta.

EVIDÊNCIA
"uber 25" enviado 5 vezes: a 1ª registrou; da 2ª à 5ª a resposta veio
literalmente VAZIA — bolha em branco, sem texto e sem card — e nenhuma
transação foi criada.

CAUSA PROVÁVEL
É a guarda anti-duplicação da correção D1, que rejeita transação idêntica
(mesmo valor, categoria, data e descrição) criada nos últimos 5 minutos.
Ela foi especificada para registrar em log, mas não para avisar o usuário.

Confirme se é essa a causa antes de corrigir.

O PROBLEMA DE PRODUTO
Dois cafés de R$ 25 em cinco minutos é uma compra plausível, não um erro.
A guarda não pode decidir sozinha que o segundo é engano.

CORREÇÃO
- A guarda deixa de bloquear em silêncio
- Ao detectar repetição, responde perguntando:
    "Você registrou Uber R$ 25,00 há pouco. Quer lançar de novo?"
  com as opções "Sim, lançar" e "Não, era engano"
- Confirmando, grava normalmente
- Recusando, não grava e confirma que ignorou
- Manter o log de rejeições — é o indicador de que a camada de contexto
  está falhando

REGRA GERAL, que vale para todo o app
Nenhuma resposta pode ser vazia. Bolha em branco é sempre defeito: ou há
texto, ou não deveria haver bolha.
Adicione uma verificação: se a Edge Function for responder com texto
vazio, isso é erro e deve ser tratado como tal.

VERIFICAÇÃO
- "uber 25" cinco vezes: as 5 recebem resposta. Nenhuma bolha vazia
- Confirmando a repetição, a transação é criada
- Nenhuma resposta em branco em nenhum fluxo
```

---

# F4 — Feed abre no meio e legenda transbordando

*Dois defeitos de apresentação, ambos introduzidos por correções anteriores.*

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-04, RNF-05).

DEFEITO 1 — O FEED ABRE NO MEIO
Com 101 mensagens, o feed abre em scrollTop 3408 de 6220 — no meio do
histórico, mostrando mensagens de sessões antigas em vez das últimas.

A paginação reversa funciona (rolar ao topo carrega anteriores, mantendo
a âncora). O que falta é a rolagem inicial.

- Ao abrir a tela, rolar para o FIM, na mensagem mais recente
- Fazer isso DEPOIS de as mensagens e os cards renderizarem, não antes:
  provavelmente a rolagem acontece com o conteúdo ainda incompleto e a
  altura final é maior
- A âncora da paginação para cima não pode ser afetada

DEFEITO 2 — LEGENDA TRANSBORDA A 320 px
Com 4 categorias passava; com 6 a legenda transborda o card e colide com
o título "Maiores Gastos" — "Transporte (R$ 105,00)" aparece sobreposto
ao cabeçalho.

Regressão de layout introduzida pela legenda adicionada no E5.

- A legenda quebra em linhas dentro do próprio card, sem vazar
- O card cresce em altura conforme o número de categorias
- Testar com as 8 categorias a 320 px, que é o pior caso possível
- Nenhuma sobreposição com elementos seguintes

VERIFICAÇÃO
- Abrir a Conversa com mais de 100 mensagens: mostra as últimas
- Rolar ao topo: carrega anteriores sem pular
- Resumo a 320 px com 8 categorias: nada sobreposto
```

---

# F5 — Acabamento

*Nada aqui derruba a demonstração.*

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-05, RF-07).

1. NÚMEROS NO INSIGHT AUTOMÁTICO
O insight novo é bom: "💡 Sua média de gastos com alimentação era de 49,5
e agora você gastou 92."
Mas os números vêm crus, sem R$ nem centavos — o mesmo defeito já
corrigido nas outras respostas.
Aplicar o formatador pt-BR também aqui: R$ 49,50 e R$ 92,00.
Auditar TODOS os textos gerados, para não sobrar nenhum ponto sem
formatação.

2. DESCRIÇÃO ENCURTA DEMAIS
"teste 12 no lazer" virou descrição "Teste". Melhorou (antes virava
"Lazer", que é a categoria), mas ainda perde informação.
A descrição deve preservar o termo que identifica o gasto, não a
primeira palavra da frase.
Exemplos do comportamento desejado:
  "teste 12 no lazer"   → "Teste"        (aceitável, não há mais o que usar)
  "almoço no shopping"  → "Almoço no shopping" ou "Almoço"
  "uber para o aeroporto" → "Uber aeroporto" ou "Uber"
Nunca reduzir a uma palavra genérica quando a frase tem um termo melhor.

VERIFICAÇÃO
- Nenhum número sem formatação em nenhuma resposta, insight incluído
- Descrições preservam o termo identificador
```

---

## Verificação de 5 minutos, depois de F1 e F2

1. Registre um gasto e confira a data. **Bate com o dia de hoje no seu relógio?**
2. Se puder, teste depois das 21h — é quando o bug do fuso aparece
3. Envie `"almoço"`, responda `"32"`. **A transação é criada?**
4. Envie `"gastei 45"`. **Registra em Outros, sem perguntar?**
5. Envie `"uber 25"` duas vezes. **A segunda recebe resposta?**

Cinco respostas certas e some a única ressalva que o testador fez sobre demonstrar o app.
