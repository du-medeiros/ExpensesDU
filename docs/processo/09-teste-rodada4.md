# Roteiro de Teste — Rodada 4

**Execução:** Claude for Chrome, na aba do app já autenticada
**Contexto:** aplicados os prompts E1 a E5

---

## ⚠️ Expectativas que MUDARAM nesta rodada

O E4 trouxe uma decisão de produto que inverte o critério de aceite de alguns casos. Sem isso claro, o comportamento novo e correto seria marcado como falha.

**Regra nova:** categoria não reconhecida, **com valor presente**, registra em `outros` e segue. Não pergunta. Só falta de **valor** gera pergunta.

Motivo: categorização tardia é recurso previsto no produto desde o PRD; pergunta desnecessária é atrito, que é justamente o que o app existe para eliminar.

| Caso | Antes esperava | **Agora espera** |
|---|---|---|
| `"gastei 45"` | pergunta a categoria | **registra em Outros** |
| `"32"` sozinho | pergunta a categoria | **registra em Outros** |
| `"almoço"` | pergunta o valor | pergunta o valor (igual) |
| `"comprei umas coisas"` | pergunta o valor | pergunta o valor (igual) |

---

## Antes de começar

1. O banco terminou a rodada 3 limpo. Confirme e anote o estado inicial
2. Conta de teste. Login feito por você — o testador não preenche senha
3. **Orçamento:** cerca de 50 chamadas. Rate limit de 60/hora. Esbarrar é aprovação do RNF-02, não falha

---

## Roteiro para colar

```
Você está numa aba do ExpensesDu, app de finanças que registra gastos por
conversa. Já estou autenticado. Foi aplicada a rodada 3 de correções
(E1 a E5): embed do feed, fluxo de esclarecimento, metas, não-determinismo
do parser e formatação.

ATENÇÃO — REGRA DE ACEITE QUE MUDOU
Categoria não reconhecida COM VALOR PRESENTE deve REGISTRAR em "outros",
sem perguntar. Só falta de VALOR gera pergunta.
Portanto: "gastei 45" e "32" devem REGISTRAR, não perguntar. Isso é o
comportamento correto agora, não uma falha.

Execute na ordem. O PORTÃO é bloqueante.

Antes de tudo, anote e me informe: saldo, receitas, despesas, total do mês
e quantas transações existem.

═══════════════════════════════════════
PORTÃO — OS TRÊS P0 (bloqueante)
═══════════════════════════════════════

G1 Registre "almoço 32". Recarregue a página.
   A conversa continua lá? (era o PGRST201 do feed)
G2 Saia para o Resumo e volte para a Conversa.
   O histórico continua lá? (a troca de aba também apagava)
G3 Envie "almoço" sozinho. Ele pergunta o VALOR?
   (antes perguntava a categoria, errado)
G4 Responda "32". A transação é criada e o fluxo FECHA?
   (antes entrava em loop infinito)
G5 Em Metas, crie um teto pelo FORMULÁRIO: Alimentação, R$ 100.
   Funciona? (era PGRST204, coluna inexistente)

Me relate os 5 antes de seguir. Falhando algum, pare.

═══════════════════════════════════════
BLOCO A — VERIFICAÇÃO DAS CORREÇÕES
═══════════════════════════════════════

--- A1: feed (E1) ---
A1.1 Quantas mensagens o feed carrega? Qual é a mais recente?
A1.2 Ao abrir, está rolado para o fim?
A1.3 Role até o topo. Carrega mensagens anteriores?
A1.4 CRÍTICO: o card de cada mensagem mostra a transação CORRETA?
     A correção desambiguou duas chaves estrangeiras que apontam em
     direções opostas. Se escolheram a errada, o erro some e os dados
     vêm TROCADOS. Confira 3 cards contra a lista do Resumo
A1.5 Exclua uma transação pelo CARD do feed. Funciona?
     (antes o botão não fazia nada)
A1.6 Após excluir, feed, lista e KPIs ficam sincronizados?

--- A2: esclarecimento (E2) ---
A2.1 "almoço" → pergunta o VALOR, com teclado numérico e SEM chips
     de categoria?
A2.2 O texto da pergunta aparece UMA vez, ou duplicado na bolha e no
     cabeçalho dos chips?
A2.3 Envie "café" e, em vez de responder, digite outra coisa:
     "uber 30". O pendente é descartado e o uber registrado?
A2.4 "bom dia" → só texto, SEM chips de categoria colados embaixo?
A2.5 "obrigado" → idem?
A2.6 Existe algum caso em que a pergunta ainda entra em loop?

--- A3: metas (E3) ---
A3.1 Editar um teto para R$ 150 funciona? Mostra toast?
A3.2 Se der erro, aparece aviso? (antes editar falhava em silêncio)
A3.3 Crie teto em Setembro. Navegue para Outubro e Novembro.
     Ele aparece lá? (NÃO deveria)
A3.4 Excluir teto: a confirmação é inline (padrão do app) ou
     window.confirm nativo?
A3.5 A confirmação cita categoria e valor?
A3.6 REGRESSÃO IMPORTANTE: criar teto pela CONVERSA ainda funciona?
     "no máximo 300 com lazer" — este caminho funcionava ANTES do E3,
     e o E3 mexeu no nome da coluna. Pode ter quebrado

--- A4: parser determinístico (E4) ---
A4.1 Envie "uber 25" CINCO vezes seguidas.
     As 5 respostas são idênticas? (antes "uber 50" registrava e
     "uber 25" perguntava, na mesma sessão)
A4.2 "netflix 39,90" → categoria Contas? (antes: Outros)
A4.3 "açougue 60" → categoria Alimentação? (antes: Outros)
A4.4 "gastei 45" → REGISTRA em Outros, sem perguntar?
     (regra nova — perguntar aqui é FALHA)
A4.5 "32" sozinho → REGISTRA em Outros? (regra nova)
A4.6 "teste 12 no lazer" → a descrição preserva o texto do usuário,
     ou virou só "Lazer"?
A4.7 "teste 10 lazer" e "teste 11 lazer" → comportamento idêntico?

--- A5: formatação (E5) ---
A5.1 "quanto gastei esse mês?" → transcreva a resposta EXATA.
     Formato R$ 1.234,56, com cifrão, milhar e duas casas?
     (antes: "7866" e "12133.2")
A5.2 "quanto gastei com comida?" → mesmo formato?
A5.3 O texto da resposta usa categoria com acento ("Anotei:
     Alimentação") ou enum cru ("alimentacao")?
A5.4 O badge de comparação mostra percentual plausível?
     (antes: "7648%", "9191%")
A5.5 Navegue para um mês cujo anterior esteja zerado. O badge esconde
     o percentual ou mostra valor absoluto?
A5.6 Em escala de cinza, dá para casar cada fatia do gráfico com sua
     categoria?

═══════════════════════════════════════
BLOCO B — REGRESSÃO
═══════════════════════════════════════
O E2 e o E4 mexeram no parser; o E3 mexeu no schema. Tudo abaixo
funcionava 10/10 na rodada anterior.

B1  "1.250,00 de aluguel"     → R$ 1.250,00, Moradia
B2  "32,50 padaria"           → R$ 32,50, sem regravar a anterior
B3  "gastei 50 ontem no uber" → Transporte, ontem
B4  "recebi 3000"             → RECEITA, sem duplicata
B5  Injeção de prompt         → não vaza, não cria transação
B6  DUPLICAÇÃO: na mesma sessão envie 4 mensagens de registro em
    sequência. Foram criadas EXATAMENTE 4 transações?
    Este era o pior bug do projeto. O E2 e o E4 mexeram no contexto
    enviado ao modelo
B7  Some manualmente as despesas do mês e compare com os KPIs.
    Batem ao centavo?
B8  Datas: registre "café 15 ontem". A data é idêntica no card, no
    Histórico do Mês e em Maiores Gastos?
B9  Mês sem dados → estado vazio
B10 320px → nada recortado
B11 Tab → foco visível
B12 /login com sessão → redireciona para /app

═══════════════════════════════════════
BLOCO C — MEDIÇÃO
═══════════════════════════════════════
Só execute se o PORTÃO e o bloco B passaram.

25 mensagens, uma por vez, recarregando a cada 5.
Registre para cada: intenção, categoria, valor, data, e o tempo até o
card aparecer.

⚠️ Note as expectativas ATUALIZADAS de C17 e C25.

C1  "almoço 32"                    → Alimentação, 32,00, hoje
C2  "uber 25"                      → Transporte, 25,00, hoje
C3  "conta de luz 180"             → Contas, 180,00, hoje
C4  "farmácia 45,90"               → Saúde, 45,90, hoje
C5  "cinema 60"                    → Lazer, 60,00, hoje
C6  "aluguel 1.500,00"             → Moradia, 1500,00, hoje
C7  "tênis novo 299,90"            → Compras, 299,90, hoje
C8  "netflix 39,90"                → Contas, 39,90, hoje
C9  "pizza ontem 78"               → Alimentação, 78,00, ontem
C10 "gasolina 200 anteontem"       → Transporte, 200,00, anteontem
C11 "mercado 250 dia 1"            → Alimentação, dia 1
C12 "recebi salário 4500"          → RECEITA, 4500,00
C13 "entrou 800 de freela"         → RECEITA, 800,00
C14 "café 7,50"                    → Alimentação, 7,50
C15 "padaria 12 e açougue 60"      → DUAS, ambas Alimentação
C16 "uber 30 e almoço 40 e café 8" → TRÊS transações
C17 "gastei 45"                    → REGISTRA em Outros (regra nova)
C18 "almoço"                       → PERGUNTA o VALOR
C19 "comprei umas coisas"          → PERGUNTA o VALOR
C20 "quanto gastei esse mês?"      → CONSULTA, não escreve
C21 "quanto gastei com comida?"    → CONSULTA por categoria
C22 "no máximo 300 com lazer"      → META
C23 "bom dia"                      → CONVERSA, sem chips
C24 "obrigado"                     → CONVERSA, sem chips
C25 "32"                           → REGISTRA em Outros (regra nova)

CÁLCULO — me apresente, comparando com a rodada 3:
1. Intenção            (rodada 3: 92,0%)
2. Categoria           (rodada 3: 76,5% · meta 90%)
3. Valor               (rodada 3: 88,2%)
4. Data                (rodada 3: 88,2%)
5. Esclarecimento certo: C18 e C19 perguntaram o VALOR? ÷ 2
6. Tempo mediano e pior caso (rodada 3: 1,70s / 2,50s)
7. Criadas ÷ esperado  (rodada 3: 0,90, zero duplicação)
8. Determinismo: alguma entrada igual gerou saída diferente?
9. Lista de TODOS os erros: o que veio e o que deveria vir

═══════════════════════════════════════
BLOCO D — LIMPEZA
═══════════════════════════════════════
D1 Apague todas as transações criadas
D2 Apague todos os tetos criados, e confira se apagar num mês resolve
   ou se ainda é preciso mês a mês
D3 Totais de volta ao estado inicial anotado?
D4 Alguma transação impossível de apagar pela interface?
   (rodada 3: zero. Manter em zero)

═══════════════════════════════════════
RELATÓRIO
═══════════════════════════════════════
1. Resultado do portão
2. Tabela de A e B item a item
3. Números do bloco C, comparados com a rodada 3
4. Correções que não pegaram, por gravidade
5. Regressões novas
6. Comportamentos inesperados
7. O app está demonstrável em 2 minutos?
```

---

## Como ler os resultados

### O item mais perigoso de todos

**A1.4.** A correção do E1 desambiguou duas chaves estrangeiras que apontam em direções opostas: `chat_messages.transaction_id` e `transactions.source_message_id`. Se escolheram a errada, o `PGRST201` desaparece e o app passa a exibir a transação errada em cada card.

É a pior classe de defeito: o erro visível vira erro silencioso. Por isso o roteiro pede conferência de três cards contra a lista do Resumo, e não apenas "o feed carrega".

### As regressões de maior risco

**A3.6** — criar teto pela conversa funcionava antes do E3, e o E3 mexeu no nome da coluna. É o candidato mais provável a ter quebrado.

**B6** — duplicação. O E2 mudou o estado pendente e o E4 mudou o `temperature`; ambos tocam o contexto enviado ao modelo. Era o pior bug do projeto e vale reconfirmar a cada rodada que mexer nessa área.

### O número que decide

**Item 2 do cálculo: acurácia de categoria.** Estava em 76,5% contra meta de 90%. Se a hipótese do `temperature` estiver certa, C2 e C14 passam a registrar e o número vai para cerca de 88%; `netflix` e `açougue` corrigidos fecham o resto.

Se continuar em 76%, a hipótese estava errada — e o **item 8**, sobre determinismo, é o que diz onde procurar.

### O que não pode piorar

E4 do bloco D: transações impossíveis de apagar. Foi de 24 para zero na rodada anterior. Qualquer número acima de zero é regressão grave, porque é perda de controle do usuário sobre o próprio dado.

---

## Antes de chamar a sessão

Rode o portão você mesmo: são cinco itens e cinco minutos. Se os cinco passarem, o app já está demonstrável e a sessão completa vale a pena. Se algum falhar, volte ao prompt correspondente — é mais barato que uma hora de navegador.

E faça você o teste de logout e login, que o testador não pode executar por envolver senha.
