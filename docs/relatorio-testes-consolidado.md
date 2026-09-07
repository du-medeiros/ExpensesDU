# Relatório de Testes — ExpensesDu

**Projeto:** ExpensesDu — controle de gastos por conversa
**Período:** cinco rodadas de teste em navegador, com correção entre cada uma
**Método:** roteiro roteirizado executado por agente no navegador, com conferência manual dos totais contra o banco

---

## Resumo

O app foi de "quebra na primeira mensagem" a "demonstrável sem asterisco" em cinco rodadas. A tabela abaixo é a história em números.

| Indicador | R1 | R2 | R3 | R4 | R5 |
|---|---|---|---|---|---|
| Acurácia de intenção | — | — | 92,0% | 92,0% | **100%** |
| Acurácia de categoria | — | — | 76,5% | 88,9% | **100%** |
| Acurácia de valor | — | — | 88,2% | 88,9% | **100%** |
| Acurácia de data* | — | — | 88,2% | 88,9% | **100%** |
| Esclarecimento correto | — | — | 33% | 50% | **100%** |
| Tempo mediano até o card | ∞ | ∞ | 1,70s | 1,80s | **1,71s** |
| Transações criadas ÷ esperadas | — | — | 0,90 | 0,90 | **1,00** |
| Transações inalcançáveis | 5 | 24 | 0 | 0 | **0** |
| Regressão (bloco B) | — | — | 10/10 | 11/12 | **12/12** |

\* Ver a ressalva sobre fuso horário na seção "O que ainda não foi provado".

**R1 e R2 não têm números de acurácia** porque a medição foi abortada: nas duas rodadas o parser tinha defeito conhecido, e medir acurácia de um parser com bug produz número que não significa nada. A regra adotada foi que o bloco de medição só roda depois que os portões passam.

---

## O que cada rodada encontrou

### Rodada 1 — o app registrava errado em silêncio

Trinta e cinco verificações, quatro falhas graves. O achado central não foi nenhum bug isolado, e sim um padrão: **todas as falhas eram silenciosas.**

- `"almoço"` sozinho gravava R$ 32,00, herdado da mensagem anterior — fabricação de dado financeiro
- `"mercado 120 e farmácia 40"` respondia "Processado." e não gravava nada — perda de dado
- O feed congelava nas 50 primeiras mensagens e as transações novas ficavam órfãs

Os três respondiam a mesma palavra, "Processado.", que afirma sucesso. Três bugs distintos com a mesma decisão de projeto errada por trás: o app nunca admitia incerteza nem falha.

Cinco transações ficaram inalcançáveis pela interface.

### Rodada 2 — o pior estado do projeto

Vinte mensagens enviadas, **zero cards renderizados**. O backend respondia 200 e gravava; o frontend nunca exibia. E surgiu o bug mais destrutivo de todo o projeto: **duplicação em cascata** — cada mensagem de registro regravava todas as anteriores da sessão. Medido: cinco cópias de um mesmo aluguel.

Vinte e quatro transações ficaram inalcançáveis. A limpeza precisou ser feita por SQL, direto no banco.

Foi a rodada que mudou o método de teste: passou a existir um portão verificando que a exclusão funciona **antes** de criar qualquer volume.

### Rodada 3 — a virada

A duplicação morreu: 25 mensagens produziram 18 transações, zero sobras. As transações inalcançáveis foram de 24 para zero. As datas pararam de divergir entre componentes.

Primeira medição válida: categoria em 76,5%, abaixo da meta de 90%. E um achado que virou a chave da rodada seguinte — `"uber 50"` registrava e `"uber 25"` perguntava a categoria, na mesma sessão. Assinatura de amostragem, não de lógica.

Três defeitos pontuais ainda bloqueavam a demonstração: embed ambíguo do PostgREST zerando o feed, chips de esclarecimento em loop infinito, e uma coluna inexistente quebrando a criação de metas.

### Rodada 4 — quase

Portão 4 de 5. A categoria subiu para 88,9%. O fluxo de esclarecimento passou a perguntar certo, mas não fechava: responder o valor devolvia "Faltam detalhes" e não gravava.

O achado mais importante foi de leitura, não de execução: a acurácia de data de 88,9% estava medida contra o "hoje" do app. Medida contra o fuso real do perfil, **cairia para 16,7%** — o backend carimbava "hoje" em UTC, e às 22h de Brasília tudo caía no dia seguinte. Nos dias 30 e 31, no mês seguinte.

Foi o único defeito de todas as rodadas que corrompia o dado em vez da tela.

### Rodada 5 — sem asterisco

Portão 5 de 5. Bloco de regressão 12 de 12. Bloco de medição 25 de 25, **sem uma única entrada errada**.

As três acurácias que vinham sendo acompanhadas foram a 100%. A de categoria, que era a mais resistente, passou a meta.

Um item permanece aberto e um permanece não provado. Ambos na seção seguinte.

---

## O que ainda não foi provado

### O fuso horário

A correção está estruturalmente certa: o payload passou a carregar `dataCliente` e `timezone`, que é exatamente o que o contrato do parser define.

Mas ela **não foi observada em condição de falha.** O teste rodou às 07:47, horário em que Brasília e UTC estão no mesmo dia. Não havia como o bug se manifestar.

Consequência prática: a acurácia de data de 100% vale contra o "hoje" do app. Enquanto não houver um lançamento depois das 21h confirmando que a data sai como o dia corrente, esse número é uma promessa e não uma medição.

**É um teste de dez segundos e fecha o último risco de dado do projeto.**

### O feed abre no meio do histórico

Terceira rodada com o item aberto. Sem impacto em dado: quem abre a conversa vê mensagens de dias atrás e precisa rolar até o fim.

Classificado como P2, mas é a primeira tela que a pessoa vê.

### Duas observações menores

**Injeção de prompt reclassificada.** A frase de teste passou a ser tratada como registro incompleto, e o app pergunta o valor em vez de responder conversa. Não vaza nada e não grava nada, mas se o usuário responder um número, cria um lançamento com essa frase de descrição.

**Perda de categoria ao fechar esclarecimento.** `"almoço"` seguido do valor 32 grava em Outros, não em Alimentação. A palavra está no contexto e se perde no fechamento do fluxo. Não é erro de aceite, mas é informação jogada fora.

---

## O que o processo ensinou

Três decisões de método mudaram o resultado, e valem mais que qualquer correção específica.

**Medir só depois dos portões.** Nas rodadas 1 e 2 a medição foi abortada de propósito. Um número de acurácia colhido sobre um parser com bug conhecido não informa nada e, pior, pode acabar publicado.

**Provar que dá para apagar antes de criar.** A rodada 2 terminou com 24 transações que o app não conseguia remover. A partir daí, a capacidade de exclusão virou portão bloqueante — e o indicador "transações inalcançáveis" ficou em zero nas três rodadas seguintes.

**Separar o que quebrou do que sempre esteve errado.** Cada rodada trouxe uma lista explícita do que estava funcionando e não deveria ser tocado. Rodadas de correção em várias frentes quebram o que já funcionava: a legenda do gráfico, adicionada para melhorar acessibilidade, criou uma regressão de layout a 320px na rodada seguinte.

---

## Conclusão

O app é demonstrável. O roteiro completo — registro simples, múltiplo, com data relativa, com valor por extenso, mensagem sem valor, mensagem sem categoria, consulta total, consulta por categoria, criação de teto por conversa e por formulário, edição, exclusão com confirmação, recarga de página, troca de aba, 320px e navegação por teclado — roda sem tropeço.

O que mais indica maturidade não são os acertos, e sim a forma das respostas. Diante de `"comprei umas coisas"`, o app devolve *"Qual o valor das coisas que você comprou?"* — pergunta construída a partir do texto do usuário, não um template. E ao detectar um lançamento repetido, oferece as duas saídas em vez de decidir sozinho qual era a intenção.

Antes de mostrar para alguém: faça um lançamento depois das 21h.
