# Plano de MVP — App de Finanças Pessoais por Conversa

**Desafio:** Organização de Finanças Pessoais com IA
**Aluno:** Eduardo Medeiros
**Entrega:** plano de MVP com telas, recursos necessários e esboço de validação inicial

---

## Antes de começar: o problema real

Vale começar por uma pergunta simples. **Por que você desistiu do último app de finanças que baixou?**

A resposta quase nunca é "porque não me importo com dinheiro". É outra coisa: registrar um café de R$ 8 custava sete toques na tela. Abrir o app, achar o botão, escolher a conta, digitar o valor, escolher a categoria, escolher a data, salvar. Ninguém repete isso trinta vezes por mês.

E o detalhe que decide tudo: **o gasto acontece na rua**, com o celular na mão, em três segundos de atenção. O app pede um formulário. É nessa distância que o hábito morre.

Ou seja: o problema não é de disciplina do usuário. É de atrito do produto.

## A ideia central

Trocar o formulário por uma frase.

> **Você:** almoço 32
> **App:** Anotei: Alimentação, R$ 32,00, hoje ✓

Um campo de texto, uma frase natural, uma confirmação. O mesmo esforço de mandar mensagem para um amigo — e essa é exatamente a comparação que queremos que o usuário faça.

O que torna isso possível hoje, e não há cinco anos: modelos de linguagem conseguem transformar "almoço 32" em dados estruturados de forma confiável e barata. O que antes exigiria um programa cheio de regras frágeis hoje é uma chamada de API.

---

## Parte 1 — As telas

O maior risco de um projeto assim não é técnico, é de escopo. Um app de finanças "completo" tem umas quarenta telas. Este tem quatro.

### Tela 1 — Conversa (a principal)

É a tela que abre. Não é um painel com a conversa escondida numa aba — é o contrário.

- Histórico de mensagens, no estilo de um aplicativo de conversa
- Campo de texto fixo na base, com foco automático
- Cada gasto vira um **card de confirmação** com os campos editáveis em um toque

O ponto mais importante desta tela: **quando o app não tem certeza, ele pergunta em vez de chutar.**

> **Você:** comprei umas coisas
> **App:** Qual o valor das coisas que você comprou?

Repare que a pergunta usa as palavras do usuário. Não é um texto pronto.

E há uma regra que parece pequena e muda a experiência: o app só pergunta quando falta o **valor**. Se ele não reconhecer a categoria mas o valor estiver lá, ele registra em *Outros* e segue em frente. A pessoa pode arrumar a categoria depois. Perguntar por algo que dá para resolver sozinho é justamente o atrito que queremos eliminar.

### Tela 2 — Resumo do mês

Para onde a pessoa vai quando quer ver o resultado do esforço.

- Total gasto no mês e comparação com o mês anterior
- Gráfico de rosca por categoria, com legenda
- Progresso dos tetos de gasto
- Lista completa das transações, cada uma editável e removível

### Tela 3 — Metas (tetos de gasto)

- Lista das categorias com teto definido e quanto já foi consumido
- Criação por formulário ou pela própria conversa
- Faixas de cor com rótulo em texto: dentro do limite, atenção, estourou

### Tela 4 — Perfil

Nome, e-mail, fuso horário, preferências e saída da conta.

**Navegação:** barra inferior com quatro ícones. A Conversa é sempre a primeira.

---

## Parte 2 — Recursos necessários

### Tecnologia

| Camada | Escolha | Por quê |
|---|---|---|
| Frontend | React + TypeScript + Vite | Rápido, tipado, e vira aplicativo instalável no celular |
| Estilo | Tailwind CSS | Agiliza o visual sem escrever CSS do zero |
| Banco e login | Supabase | PostgreSQL, autenticação e funções de servidor num pacote só |
| Interpretação | API de LLM | Transforma a frase em dados estruturados |
| Publicação | Vercel | Publica direto do repositório, sem servidor para administrar |

### O caminho de uma mensagem

```
Você escreve "almoço 32"
        ↓
Função de servidor (Supabase) — confere quem é você
        ↓
API de LLM — devolve os dados estruturados
        ↓
Validação das regras de negócio
        ↓
Card de confirmação na tela
```

### Três cuidados que não são opcionais

**A chave da API nunca vai para o navegador.** Se ela estiver no código do site, qualquer pessoa abre as ferramentas do navegador e leva. Ela fica só no servidor.

**Cada usuário só enxerga os próprios dados.** No Supabase isso se chama Row Level Security: é o próprio banco que recusa devolver o dado de uma pessoa para outra, mesmo que o código do app tenha um erro. Em app de finanças, isso não é opcional.

**O modelo garante o formato, não o significado.** Existe um recurso que obriga a resposta da IA a seguir exatamente o formato que você definiu. Ótimo — mas ele garante que o campo "valor" é um número, não que seja um número que faça sentido. O servidor ainda precisa conferir se o valor é positivo e se a data existe neste século.

### Custos

Vercel e Supabase cabem nos planos gratuitos para um MVP. A API de LLM é o único custo variável, e uma mensagem de gasto consome pouquíssimo — na casa de centavos por usuário ativo por mês.

---

## Parte 3 — Esboço de validação inicial

A pergunta que precisa ser respondida **antes** de escrever código não é "consigo construir isso?". É: **as pessoas escrevem os gastos delas se tiverem por onde?**

### Etapa 1 — Teste do Mágico de Oz (1 semana, custo zero)

Criar um grupo de conversa com 8 a 10 pessoas do público-alvo. Pedir que mandem os gastos por mensagem, como mandariam para um amigo. Do outro lado, **você** anota tudo numa planilha e responde confirmando — sem nenhum código rodando.

Chama-se Mágico de Oz porque o usuário acha que existe um sistema automático, mas tem uma pessoa atrás da cortina. É a forma mais barata de testar uma ideia de produto: valida o comportamento antes de construir a tecnologia.

O que se aprende:

- Quantas mensagens por dia cada pessoa manda de verdade
- **Como** elas escrevem — o vocabulário real, que depois serve para calibrar a IA
- Quantas desistem até o sétimo dia
- Quais mensagens são ambíguas até para um humano interpretar

### Etapa 2 — Teste da interpretação (2 dias)

Juntar as mensagens reais da Etapa 1, montar um conjunto de uns 50 exemplos e rodar contra a API. Medir quantos por cento são interpretados corretamente.

**Critério de corte: 90% de acerto.** Abaixo disso, o problema está na instrução dada ao modelo, não no app — e é muito mais barato descobrir isso agora.

### Etapa 3 — MVP com usuários reais (2 semanas)

| Indicador | Meta |
|---|---|
| Precisão da classificação | ≥ 90% |
| Registros por usuário por semana | ≥ 10 |
| Usuários ativos no dia 7 | ≥ 60% |
| Tempo até a confirmação aparecer | ≤ 2s |

O indicador que mais importa é o **retorno no dia 7**. Registrar gasto no primeiro dia todo mundo registra — a novidade sustenta. Voltar na segunda semana é o que prova que o atrito realmente caiu.

---

## O que aconteceu quando eu construí

O plano acima foi executado. O app está no ar em **[expensesdu.vercel.app](https://expensesdu.vercel.app/)**, e a etapa de medição foi feita: cinco rodadas de teste, com correção entre cada uma.

| Indicador | Meta | 3ª rodada | 5ª rodada |
|---|---|---|---|
| Acurácia de intenção | — | 92,0% | **100%** |
| Acurácia de categoria | ≥ 90% | 76,5% | **100%** |
| Acurácia de valor | — | 88,2% | **100%** |
| Tempo até a confirmação | ≤ 2s | 1,70s | **1,71s** |

E três lições que só apareceram construindo:

**Uma linha de configuração valia 12 pontos de acurácia.** O modelo estava com `temperature` acima de zero, ou seja, com um grau de aleatoriedade. Resultado: `uber 50` registrava certo e `uber 25` pedia esclarecimento, na mesma sessão. Extração de dado não é tarefa criativa — não existe resposta "mais interessante" para `uber 25`. Zerar isso levou a categoria de 76,5% para 88,9%.

**O pior defeito de um app de dinheiro é o silencioso.** Numa das rodadas o app respondia "Processado." tanto quando gravava certo, quanto quando inventava um valor, quanto quando perdia o lançamento. Sempre a mesma palavra, sempre afirmando sucesso. Um usuário consegue perceber que algo não foi registrado. Ele não tem como perceber que algo foi registrado errado.

**Fuso horário estraga dado sem avisar.** O servidor carimbava "hoje" no horário de Londres. Às 22h em Brasília, todo lançamento caía no dia seguinte — e no dia 31, no mês seguinte, bagunçando o fechamento sem nenhum sinal na tela.

---

## Conclusão

A aposta deste MVP é que o problema de controle financeiro não é de disciplina, e sim de atrito. E que a forma de reduzir atrito não é ter menos campos no formulário — é não ter formulário.

O corte de escopo foi tão importante quanto o que foi construído. Ficaram de fora múltiplas contas bancárias, metas de poupança e categorias personalizadas — todas por um motivo parecido: cada uma reintroduzia uma decisão que o usuário teria que tomar, e a pessoa que a gente está tentando ajudar é justamente quem desistiu de tomar decisões sobre dinheiro.

O que sobrou faz uma coisa só, mas faz bem: transformar uma frase em um registro financeiro.
