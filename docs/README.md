# Documentação — ExpensesDu

Índice da pasta. Comece por aqui.

---

## Se você tem 5 minutos

**[`entrega-dio.md`](./entrega-dio.md)** — o plano de MVP: o problema, as quatro telas, os recursos necessários e o esboço de validação. Tom acessível, sem jargão. É a entrega do curso.

## Se você quer ver os números

**[`relatorio-testes-consolidado.md`](./relatorio-testes-consolidado.md)** — cinco rodadas de teste em navegador, com correção entre cada uma. Acurácia de categoria saiu de 76,5% para 100%; transações inacessíveis pela interface, de 24 para zero. Inclui o que ainda não foi provado.

## Se você vai mexer no código

**[`expensesdu-documentacao.md`](./expensesdu-documentacao.md)** — documento único de referência, em quatro partes:

| Parte | Conteúdo |
|---|---|
| 1 | PRD: requisitos funcionais, não funcionais, modelo de dados, contrato do parser |
| 2 | Ambiente: chaves da Supabase e da OpenAI, `.env`, CLI, Edge Functions |
| 3 | Prompts de implementação 1 a 8 — construção |
| 4 | Prompts de implementação 9 a 14 — segurança, integridade e publicação |
| Anexo A | Schema JSON para Structured Outputs |

**É a fonte de verdade.** Se algo em `referencia/` ou `processo/` contradisser este documento, vale este.

---

## `referencia/`

Cópias de trabalho, extraídas do documento consolidado. Mesmas correções aplicadas. Úteis para leitura isolada; em caso de divergência, vale o consolidado.

| Arquivo | Corresponde a |
|---|---|
| `prd-expensesdu.md` | Parte 1 |
| `guia-ambiente.md` | Parte 2 + Anexo A |
| `plano-mvp-financas-conversacional.md` | Versão anterior do plano, escrita antes da construção. Superada por `entrega-dio.md`, mantida como registro |

## `processo/`

O histórico de como o app foi construído e corrigido, em ordem cronológica. Cada rodada de teste gerou uma rodada de correção.

| # | Arquivo | O que é |
|---|---|---|
| 01 | `01-implementacao-fase1.md` | Prompts 1 a 8: fundação, motor de interpretação, banco, auth, conversa, resumo, metas, telemetria |
| 02 | `02-implementacao-fase2.md` | Prompts 9 a 14: perda de dados, segurança, integridade, landing, visual, deploy |
| 03 | `03-teste-rodada1.md` | Primeiro roteiro de teste em navegador — 35 verificações |
| 04 | `04-correcoes-apos-rodada1.md` | Feed congelado, parser inventando valor, metas somente leitura |
| 05 | `05-teste-rodada2.md` | Roteiro de reteste e medição |
| 06 | `06-correcoes-apos-rodada2.md` | Duplicação em cascata, renderização, `numeric` como texto |
| 07 | `07-teste-rodada3.md` | Roteiro com três portões bloqueantes |
| 08 | `08-correcoes-apos-rodada3.md` | Embed ambíguo do PostgREST, esclarecimento em loop, `temperature` |
| 08b | `08b-correcoes-rodada3-so-prompts.md` | Os mesmos prompts, sem a análise em volta |
| 09 | `09-teste-rodada4.md` | Roteiro com critérios de aceite atualizados |
| 10 | `10-correcoes-apos-rodada4.md` | Fuso horário na gravação, fechamento do esclarecimento, dedup silenciosa |

### Por que este histórico está aqui

Não é registro burocrático. Três decisões de método explicam por que a acurácia saiu de 76,5% para 100% em duas rodadas, em vez de ficar oscilando:

**Medir só depois dos portões.** Nas rodadas 1 e 2 a medição foi abortada de propósito. Número de acurácia colhido sobre parser com defeito conhecido não informa nada — e pode acabar publicado.

**Provar que dá para apagar antes de criar volume.** A rodada 2 terminou com 24 transações que o app não conseguia remover, limpas por SQL. A partir dali a exclusão virou portão bloqueante.

**Listar a cada rodada o que estava funcionando.** Correção em várias frentes quebra o que já funcionava: a legenda do gráfico, adicionada para melhorar acessibilidade, criou uma regressão de layout a 320px na rodada seguinte.

---

## Convenções do projeto

**Migrations já aplicadas são imutáveis.** Toda mudança de schema é arquivo novo. Nenhuma migration contém `DROP`, `TRUNCATE` ou reset.

**O banco é sempre o remoto.** Não há instância local da Supabase. `supabase db push` é comando manual, nunca do agente de código.

**Segredos nunca entram em chat.** O agente escreve o código que lê as variáveis de ambiente; os valores são preenchidos à mão, no `.env.local` e no `supabase secrets set`.

**Nenhuma resposta pode ser vazia.** Toda operação que toca dado financeiro diz o que gravou, com valores, ou diz o que não conseguiu e por quê.
