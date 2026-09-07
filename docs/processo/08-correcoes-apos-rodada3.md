# Prompts de Correção — Rodada 3

**Origem:** reteste no navegador, build `index-C2FRejtu.js`
**Situação:** portão 3 passou, bloco B 10/10, E4 zerado. Três P0 pontuais separam o app de demonstrável.

---

## O que a rodada 2 resolveu

Não remexer:

| | Antes | Agora |
|---|---|---|
| Duplicação em cascata | 5 cópias de um aluguel | 25 mensagens → 18 transações, zero sobras |
| Transações inalcançáveis | 24 | **0** |
| Renderização | zero cards em 20 mensagens | card em 1,7s |
| Datas off-by-one | Maiores Gastos subtraía 1 dia | idênticas em todos os lugares |
| Regressão (bloco B) | 3 falhas | 10/10 |
| Acessibilidade | viewport, og:image, legenda | todos corrigidos |

Os números da medição, para o README:

| Indicador | Meta | Medido |
|---|---|---|
| Acurácia de intenção | — | 92,0% |
| Acurácia de categoria | ≥ 90% | **76,5%** |
| Acurácia de valor | — | 88,2% |
| Tempo mediano até o card | ≤ 2s | **1,70s** |
| Duplicação residual | 0 | **0** |

---

## Ordem, por impacto na demonstração

| # | Correção | Efeito |
|---|---|---|
| E1 | Feed: embed ambíguo e exclusão pelo card | A conversa some a cada reload |
| E2 | Esclarecimento: estado pendente e pergunta certa | Chip entra em loop infinito |
| E3 | Metas: coluna, replicação futura | Criar teto pelo formulário sempre falha |
| E4 | Parser: não-determinismo e categorização | 76,5% → provável 88%+ |
| E5 | Formatação e acabamento | Não derruba demo |

E1, E2 e E3 são os três que decidem. E4 é o que move o número do README.

---

# E1 — Feed: embed ambíguo e exclusão pelo card

### Causa do PGRST201, e ela é minha

O `GET /rest/v1/chat_messages` devolve **HTTP 300 / PGRST201**. Existem duas chaves estrangeiras entre `chat_messages` e `transactions`:

- `chat_messages_transaction_id_fkey` — a original
- `transactions_source_message_id_fkey` — **adicionada pela camada 3 do D1**

O PostgREST não sabe qual usar no embed e recusa a consulta. A defesa contra duplicação estava correta; o efeito colateral no select não foi previsto.

Efeito: o feed volta vazio em todo reload **e em toda troca de aba**. Sair de Conversa e voltar já apaga a conversa.

### Prompt

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-04).

BUG P0: o feed carrega ZERO mensagens. GET /rest/v1/chat_messages devolve
HTTP 300 / PGRST201.

CAUSA
Existem duas FKs entre chat_messages e transactions:
  - chat_messages_transaction_id_fkey (original)
  - transactions_source_message_id_fkey (adicionada na correção D1)
O embed é ambíguo e o PostgREST recusa a consulta.

CORREÇÃO 1 — DESAMBIGUAR O EMBED
No select do feed, nomear a FK explicitamente, conforme o hint do próprio
PostgREST:
  transactions!chat_messages_transaction_id_fkey (...)

Atenção: a relação correta para o feed é a que parte de chat_messages
(transaction_id), não a de rastreio (source_message_id). Confirme qual
das duas o feed precisa antes de escrever — elas apontam em direções
opostas.

Auditar TODAS as consultas que fazem embed entre essas duas tabelas, não
só a do feed. Qualquer outra tem o mesmo problema latente.

CORREÇÃO 2 — EXCLUIR PELO CARD DO FEED
O botão "Sim, excluir" no card do feed não faz nada: registrei R$ 12,00,
cliquei, e o total não mudou. O MESMO componente funciona na lista do
Resumo.

- Comparar as duas implementações e descobrir por que uma dispara a
  chamada e a outra não
- Provavelmente handler não conectado ou id ausente no card do feed
- Após excluir, atualizar feed, lista e KPIs

VERIFICAÇÃO
- Registrar, recarregar: a mensagem aparece no feed
- Sair para Resumo e voltar para Conversa: o histórico continua lá
- Excluir pelo card do feed: some do feed, da lista e dos KPIs
```

### DoD

- [ ] Feed carrega após reload
- [ ] Troca de aba preserva a conversa
- [ ] Nenhum outro embed ambíguo no projeto
- [ ] Excluir pelo card do feed funciona
- [ ] Feed, lista e KPIs sincronizados após exclusão

---

# E2 — Esclarecimento: estado pendente e pergunta certa

### Dois defeitos no mesmo fluxo

**Loop infinito.** O clique no chip envia a palavra crua (`"alimentacao"`) como mensagem nova. O backend não tem estado pendente, interpreta como mensagem qualquer e repete a pergunta. Nunca sai disso.

**Pergunta errada.** Para `"almoço"` — falta o **valor** — ele pergunta `"Qual a categoria desse gasto?"`.

### A regressão que importa

Na rodada 1 o backend devolvia `"Qual o valor do almoço?"`, específica e correta, e não renderizava. Agora renderiza com chips bonitos, mas sempre pergunta categoria.

**Trocou-se uma pergunta certa invisível por uma pergunta errada visível.** A correção do D2 provavelmente fixou o renderizador em chips de categoria, ignorando qual campo está de fato faltando.

### Prompt

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-03).

BUG P0: o fluxo de esclarecimento entra em loop e faz a pergunta errada.

DEFEITO 1 — LOOP
Clicar no chip envia a palavra crua ("alimentacao") como mensagem nova.
O backend não guarda o que estava pendente, trata como mensagem comum e
repete a pergunta. O fluxo nunca fecha.

CORREÇÃO
- A Edge Function, ao gerar esclarecimento, PERSISTE o estado pendente:
  a extração parcial já feita e qual campo falta
- A resposta passa a incluir:
    pergunta: { id, texto, campo_faltante, opcoes: [] }
- O clique no chip NÃO envia mensagem nova. Envia a resposta amarrada ao
  id: { resposta_para: <pergunta_id>, valor: <opção escolhida> }
- O servidor recupera o pendente, completa a transação e grava
- Pendente expira (ex.: 30 min) para não acumular lixo
- Se o usuário digitar outra coisa em vez de clicar, o pendente é
  descartado e a nova mensagem processada normalmente

DEFEITO 2 — PERGUNTA ERRADA
"almoço" (falta VALOR) pergunta "Qual a categoria desse gasto?".
Na rodada 1 o backend já devolvia "Qual o valor do almoço?" corretamente —
a renderização foi fixada em chips de categoria.

CORREÇÃO
- campo_faltante determina texto E opções:
    valor ausente     → "Quanto foi o almoço?" · SEM chips, teclado numérico
    categoria ausente → "Qual a categoria?"    · chips das 8 categorias
    ambos ausentes    → pergunta o VALOR primeiro
- Nunca renderizar chips de categoria quando o que falta é valor

DEFEITO 3 — TEXTO DUPLICADO
O texto da pergunta aparece duas vezes: na bolha e no cabeçalho do bloco
de chips. Exibir uma vez só.

DEFEITO 4 — CHIPS EM CONVERSA
"bom dia" e "obrigado" vêm com chips de categoria colados embaixo.
Intenção "conversa" nunca renderiza chips.

VERIFICAÇÃO
- "almoço" → pergunta o VALOR
- Responder "32" → cria a transação e o fluxo FECHA
- "gastei 45" → pergunta a CATEGORIA, com chips
- Clicar num chip → cria a transação, sem repetir a pergunta
- "bom dia" → só texto
```

### DoD

- [ ] Esclarecimento fecha em um clique, sem loop
- [ ] Falta valor pergunta valor; falta categoria pergunta categoria
- [ ] Pendente expira
- [ ] Digitar outra coisa descarta o pendente
- [ ] Texto da pergunta aparece uma vez
- [ ] Conversa sem chips

---

# E3 — Metas: coluna, replicação e confirmação

### Sintomas

**`PGRST204`:** `Could not find the 'valor_limite' column of 'goals' in the schema cache`. Criar e editar teto pelo formulário sempre falham. Editar falha **em silêncio** — o toast só existe na criação.

**Criar por conversa funciona.** A Edge Function grava na coluna certa; o formulário, não. São dois caminhos escrevendo nomes diferentes na mesma tabela.

**Replicação futura:** um teto criado só em Setembro apareceu em Outubro e Novembro. E não é a mesma linha renderizada — apagar o de Setembro deixou os outros dois. São registros independentes, criados por `get_or_create_monthly_goals`.

### Prompt

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-06).

DEFEITO 1 — COLUNA INEXISTENTE (P0)
POST /rest/v1/goals devolve 400 PGRST204: coluna 'valor_limite' não existe
no schema cache.

Criar teto pela CONVERSA funciona; pelo FORMULÁRIO falha. Dois caminhos
usando nomes diferentes para a mesma coluna.

- Descubra o nome REAL da coluna no banco, consultando o schema, não o
  código
- Alinhe os dois caminhos ao mesmo nome
- Se a coluna realmente não existir, crie por migration nova (IF NOT
  EXISTS, sem DROP) e rode NOTIFY pgrst, 'reload schema'
- Me diga qual dos dois casos era

DEFEITO 2 — FALHA SILENCIOSA
Editar meta falha sem nenhum aviso: o toast de erro só existe na criação.
Toda operação de escrita mostra sucesso ou erro. Nenhuma falha em silêncio.

DEFEITO 3 — REPLICAÇÃO PARA MESES FUTUROS
Um teto criado só em Setembro apareceu em Outubro e Novembro como
registros SEPARADOS. Apagar o de Setembro não removeu os outros; foi
preciso apagar mês a mês.

get_or_create_monthly_goals está criando meses futuros de forma
antecipada. Correção:
- Criar a meta do mês corrente apenas quando aquele mês for acessado,
  nunca meses à frente
- Ao excluir, perguntar: "Só este mês" ou "Este e os próximos"
- Limpar as metas futuras já criadas indevidamente

DEFEITO 4 — CONFIRMAÇÃO NATIVA
A exclusão usa window.confirm, destoando das confirmações inline do resto
do app, e não cita categoria nem valor.
Substituir por confirmação inline citando os dois, no mesmo padrão da
lista de transações.

VERIFICAÇÃO
- Criar teto pelo formulário: funciona
- Editar: funciona, com toast
- Criar em Setembro: não aparece em Outubro
- Excluir: confirmação inline citando categoria e valor
```

### DoD

- [ ] Criar e editar pelo formulário funcionam
- [ ] Os dois caminhos usam a mesma coluna
- [ ] Nenhuma escrita falha em silêncio
- [ ] Sem replicação para meses futuros
- [ ] Metas futuras indevidas limpas
- [ ] Confirmação inline citando categoria e valor

---

# E4 — Parser: não-determinismo e categorização

### O achado mais interessante do relatório

`"uber 50"` registra. `"uber 25"` pergunta a categoria. Mesma sessão, mesmo formato. `"teste 10 lazer"` registra, `"teste 11 lazer"` pergunta.

### Hipótese principal: `temperature` acima de zero

Entrada quase idêntica com saída diferente é assinatura de amostragem. Extração de dado estruturado não é tarefa criativa — não há resposta "mais interessante" para `"uber 25"`.

Com `temperature: 0`, D2 e D14 provavelmente passam a registrar, o que sozinho leva a acurácia de categoria de **76,5% para cerca de 88%**.

### Segundo problema: o fallback conflita casos diferentes

O relatório identificou o padrão: quando o parser não reconhece a palavra, cai em "categoria desconhecida" — **mesmo quando o problema é outro**, como falta de valor. Um único caminho de fallback está absorvendo situações distintas.

### Terceiro: lacunas reais de taxonomia

`netflix` → Outros (deveria ser Contas). `açougue` → Outros (deveria ser Alimentação). Essas não são não-determinismo, são falta de referência no prompt.

### Prompt

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (seção 3.3, RF-02).

Acurácia de categoria medida: 76,5%. Meta: 90%.

DEFEITO 1 — NÃO-DETERMINISMO (investigar primeiro)
"uber 50" registra; "uber 25" pergunta a categoria. Mesma sessão, mesmo
formato. "teste 10 lazer" registra; "teste 11 lazer" pergunta.

HIPÓTESE: temperature acima de 0 na chamada à OpenAI.

- Verifique o valor atual e me informe ANTES de alterar
- Extração estruturada deve usar temperature: 0. Não é tarefa criativa
- Se já estiver em 0, o não-determinismo vem de outro lugar: investigue
  o que varia entre as duas chamadas (histórico enviado, ordem dos
  campos, seed)

DEFEITO 2 — FALLBACK ÚNICO PARA CAUSAS DIFERENTES
Quando o parser não reconhece a palavra, cai em "categoria desconhecida",
mesmo quando o que falta é o VALOR.

- Categoria não identificada, com valor presente → categoria "outros",
  registra normalmente. NÃO pergunta
- Valor ausente → pergunta o valor (ver E2)
- São caminhos distintos e não podem compartilhar o mesmo fallback

Registrar em "outros" é melhor que travar o usuário: a categorização
tardia é recurso previsto no produto; a pergunta desnecessária é atrito.

DEFEITO 3 — LACUNAS DE TAXONOMIA
netflix → Outros (deveria ser Contas)
açougue → Outros (deveria ser Alimentação)

Acrescentar ao prompt de sistema exemplos de vocabulário por categoria,
com termos brasileiros de uso real:
  alimentacao: mercado, padaria, açougue, feira, ifood, restaurante,
               lanche, café, hortifruti
  transporte:  uber, 99, gasolina, ônibus, metrô, estacionamento, pedágio
  moradia:     aluguel, condomínio, IPTU, reforma
  saude:       farmácia, remédio, consulta, exame, plano de saúde
  lazer:       cinema, bar, show, viagem, streaming de vídeo
  compras:     roupa, tênis, eletrônico, presente
  contas:      luz, água, internet, telefone, netflix, spotify, assinatura

DEFEITO 4 — DESCRIÇÃO PERDE A PALAVRA DO USUÁRIO
"teste 12 no lazer" virou um lançamento chamado "Lazer". A descrição deve
preservar o que o usuário escreveu, não repetir a categoria.

VERIFICAÇÃO
Rode o dataset completo e me apresente a acurácia por campo, comparando
com: intenção 92,0% · categoria 76,5% · valor 88,2%.
Envie "uber 25" cinco vezes seguidas: as 5 respostas devem ser idênticas.
```

### DoD

- [ ] `temperature` verificado e informado
- [ ] Cinco envios de `"uber 25"` com resultado idêntico
- [ ] Categoria desconhecida vira `outros`, sem perguntar
- [ ] `netflix` → Contas, `açougue` → Alimentação
- [ ] Descrição preserva o texto do usuário
- [ ] Acurácia de categoria ≥ 90%

---

# E5 — Formatação e acabamento

Nada aqui derruba uma demonstração de dois minutos. É o que separa "funciona" de "cuidado".

### Prompt

```
Leia a PARTE 1 de /docs/expensesdu-documentacao.md (RF-05, RNF-05).

1. NÚMEROS NAS RESPOSTAS DO CHAT
"Você gastou um total de 7866 este mês" · "12133.2" · "1538.5"
Sem R$, sem separador de milhar, sem duas casas, e com PONTO decimal.

O formatador existe e funciona na interface. O texto do modelo não passa
por ele.
- A Edge Function devolve o NÚMERO em campo separado
- O texto é montado no código, com o formatador pt-BR
- Nunca pedir ao modelo que formate moeda

2. ENUM CRU NO TEXTO
"Anotei: alimentacao, R$ 32,00" — a UI toda já está com acento; só o
texto da resposta não. Aplicar o mesmo mapa de exibição.

3. BADGE DE COMPARAÇÃO
Mostra "7648%", "9191%", "3774%".
Quando o mês anterior é próximo de zero, a variação percentual não
informa nada.
- Mês anterior igual a zero: não exibir percentual. Mostrar o valor
  absoluto ou "sem base de comparação"
- Percentual formatado, sem casas decimais, com sinal
- Teto de exibição (ex.: acima de 999%, mostrar "+999%")

4. LEGENDA EM ESCALA DE CINZA
A legenda diz quais categorias existem, mas os quadradinhos também ficam
cinza — casar fatia com categoria ainda depende de cor.
Adicionar o percentual ou o valor na legenda, ou rótulo direto na fatia.

VERIFICAÇÃO
- Toda resposta com valor exibe R$ 1.234,56
- Categorias com acento também no texto
- Badge plausível com mês anterior zerado
- Gráfico legível em escala de cinza
```

### DoD

- [ ] Moeda formatada em pt-BR em toda resposta
- [ ] Categorias com acento no texto
- [ ] Badge plausível e formatado
- [ ] Legenda legível sem cor

---

## Verificação rápida depois do E1, E2 e E3

Cinco minutos, antes de chamar reteste:

1. Registre `"almoço 32"`, recarregue. **A conversa continua lá?**
2. Envie `"almoço"`. **Pergunta o VALOR?**
3. Responda `"32"`. **A transação é criada e o fluxo fecha?**
4. Em Metas, crie um teto pelo formulário. **Funciona?**
5. Navegue para Outubro. **O teto criado em Setembro está lá?** (não deveria)

Cinco respostas certas e o app está demonstrável.

---

## O que não deve ser mexido

- Duplicação: zero em 25 mensagens com reloads intercalados
- Aritmética: 36 linhas somadas à mão, idênticas aos KPIs, zero centavo
- Datas: corrigidas em todos os pontos, inclusive a virada de mês
- Bloco B inteiro: 10/10
- Injeção de prompt: sem vazamento e sem criar transação
- Zona de perigo do Perfil, com digitação do e-mail
- `tabular-nums` em todos os números
- 320px, viewport, `og:image`, legenda do gráfico
- Erro de rede visível com texto preservado
- Tempo mediano de 1,70s — abaixo da meta
