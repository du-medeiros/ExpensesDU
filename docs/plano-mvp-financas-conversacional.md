# Plano de MVP — App de Finanças Pessoais por Conversa

**Autor:** Eduardo
**Projeto:** ExpensesDu
**Entrega:** Plano de MVP — telas, recursos e validação inicial

---

## 1. O problema, em uma frase

As pessoas não abandonam apps de finanças porque são burras com dinheiro. Abandonam porque registrar um café de R$ 8 custa sete toques na tela, e ninguém faz isso trinta vezes por mês.

O gasto acontece na rua, com o celular na mão, em três segundos de atenção. O app pede um formulário. A distância entre esses dois momentos é onde o hábito morre.

## 2. A aposta

Trocar o formulário por uma frase.

> **Usuário:** almoço 32 no cartão
> **App:** Anotei: Alimentação · R$ 32,00 · hoje ✓

Um campo de texto, uma frase natural, uma confirmação de um toque. É o mesmo esforço de mandar mensagem para um amigo — e essa é exatamente a comparação que queremos que o usuário faça.

O que torna isso possível hoje e não há cinco anos: modelos de linguagem conseguem transformar "almoço 32 no cartão" em dados estruturados de forma confiável e barata. O que antes exigiria um parser frágil cheio de regras agora é uma chamada de API.

## 3. Escopo do MVP

O maior risco de um projeto assim não é técnico, é de escopo. Um app de finanças "completo" tem umas quarenta telas. Este tem quatro.

### O que entra

| Funcionalidade | Por que é essencial |
|---|---|
| Registro por conversa | É a tese do produto. Sem isso, é só mais um app de planilha |
| Classificação automática | Sem ela, o usuário ainda precisa escolher categoria — o atrito volta |
| Teto de gastos por categoria | Dá ao app algo para falar. É o gancho das dicas |
| Agente Financeiro (dicas) | Transforma dados em ação. É o que faz o usuário voltar |
| Relatório simples | Fecha o ciclo: o usuário vê o resultado do esforço dele |

### O que fica de fora (e por quê)

**Múltiplas contas bancárias.** Obrigaria o parser a resolver "crédito ou débito?" em toda mensagem, reintroduzindo a pergunta que o produto promete eliminar. Na v1 existe uma carteira única.

**Metas de poupança ("juntar R$ 5.000").** Exigem saber o saldo real do usuário. Sem integração bancária, o app não sabe — e um número inventado é pior que nenhum número. Teto de gastos usa só o dado que já coletamos.

**Categorias personalizadas.** Oito categorias fixas classificam melhor do que um conjunto aberto, e eliminam uma tela inteira de configuração.

**Integração bancária (Open Finance).** Certificação, custo e prazo incompatíveis com um MVP.

**WhatsApp.** É o destino natural do produto, mas a arquitetura já nasce pronta para ele (ver seção 5). Na v1 o chat é dentro do app.

### As oito categorias

Alimentação · Transporte · Moradia · Saúde · Lazer · Compras · Contas & Assinaturas · Outros

Poucas o bastante para o modelo acertar com consistência, e cobrem a maior parte dos gastos de quem está começando.

## 4. Telas

### 4.1 Conversa (tela inicial)

A tela que abre. Não é um dashboard com a conversa escondida em uma aba — é o contrário.

- Histórico de mensagens, estilo aplicativo de mensagens
- Campo de texto fixo na base, com foco automático
- Cada gasto registrado vira um **card de confirmação** com chips editáveis (valor, categoria, data). Um toque no chip corrige
- Quando o app não tem certeza, ele **pergunta** em vez de chutar: *"R$ 32 em quê? Alimentação ou Transporte?"*

Esse último ponto é a diferença entre um app que ganha confiança e um que gera retrabalho silencioso. Errar e assumir é pior que perguntar.

### 4.2 Resumo do mês

Para onde o usuário vai quando quer ver o resultado.

- Total gasto no mês e comparação com o mês anterior
- Gráfico de rosca por categoria
- Barras de progresso dos tetos definidos, com cor mudando conforme a proximidade do limite
- Lista dos maiores gastos do mês

### 4.3 Metas (tetos de gasto)

- Lista das categorias com teto definido e quanto já foi consumido
- Botão para criar teto: escolher categoria + valor mensal
- Sugestão inicial baseada na média do próprio usuário, quando já houver histórico

### 4.4 Perfil

Nome, e-mail, número de WhatsApp (preparando a v2), preferências de notificação e logout.

**Navegação:** barra inferior fixa com quatro ícones. A Conversa é sempre a primeira.

## 5. Arquitetura e recursos

### Stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, PWA mobile-first
- **Backend e banco:** Supabase (PostgreSQL, Auth, Edge Functions)
- **Interpretação e dicas:** API da OpenAI, chamada por Edge Function
- **Gráficos:** Recharts
- **Deploy:** Vercel

### O motor de interpretação

Todo o valor do produto passa por aqui:

```
Mensagem do usuário
        ↓
Edge Function (Supabase)
        ↓
API da OpenAI — recebe o texto + a lista de categorias
(formato da resposta garantido por Structured Outputs)
        ↓
JSON estruturado: { valor, tipo, categoria, data, confianca }
        ↓
  confianca alta  →  card de confirmação
  confianca baixa →  pergunta de esclarecimento
```

Três decisões que importam:

**A chave de API nunca vai para o frontend.** Chave de API em código React é chave vazada — qualquer pessoa abre o inspetor do navegador e leva. A chamada acontece na Edge Function, no servidor.

**O JSON carrega um campo de confiança.** É o que permite ao app perguntar quando está em dúvida, em vez de registrar errado.

**O canal de entrada é desacoplado.** A Edge Function não sabe se a mensagem veio do chat do app ou de um webhook do WhatsApp via n8n. Isso significa que ligar o WhatsApp na v2 é conectar um canal novo ao mesmo motor — não reescrever o produto.

### Modelo de dados

| Tabela | Campos principais |
|---|---|
| `profiles` | id, nome, whatsapp |
| `transactions` | id, user_id, valor, tipo, categoria, data, descrição, origem |
| `goals` | id, user_id, categoria, valor_limite, mês_referência |
| `chat_messages` | id, user_id, papel, conteúdo, transaction_id |

Toda tabela com **Row Level Security** ativo e política `user_id = auth.uid()`. Isso significa que o próprio banco recusa devolver dados de um usuário para outro, mesmo que o código do app tenha um bug. Em app de finanças, isso não é opcional.

O campo `origem` em `transactions` (`chat` ou `whatsapp`) permite medir depois qual canal o usuário realmente usa.

### Custos

Domínio, Vercel e Supabase cabem nos planos gratuitos para o MVP. A API da OpenAI é o único custo variável, e uma mensagem de gasto consome pouquíssimos tokens — na casa de centavos por usuário ativo por mês.

## 6. Validação inicial

A pergunta que precisa ser respondida **antes** de escrever código não é "consigo construir isso?". É: **as pessoas escrevem os gastos delas se tiverem por onde?**

### Etapa 1 — Teste de Mágico de Oz (1 semana, custo zero)

Criar um grupo de WhatsApp com 8 a 10 pessoas do público-alvo. Pedir que mandem os gastos por mensagem, como mandariam para um amigo. Do outro lado, **eu** anoto tudo numa planilha e respondo confirmando — sem nenhum código rodando.

Chama-se Mágico de Oz porque o usuário acha que tem um sistema automático, mas tem uma pessoa atrás da cortina. É a forma mais barata de testar uma ideia de produto: valida o comportamento antes de construir a tecnologia.

O que se aprende:

- Quantas mensagens por dia cada pessoa manda de verdade
- **Como** elas escrevem — o vocabulário real, que vira material para calibrar o prompt
- Quantas desistem até o sétimo dia
- Quais mensagens são ambíguas até para um humano interpretar

### Etapa 2 — Teste do parser (2 dias)

Juntar as mensagens reais coletadas na Etapa 1, montar um conjunto de uns 50 exemplos e rodar contra a API da OpenAI. Medir quantos por cento são interpretados corretamente.

**Critério de corte: 90% de acerto.** Abaixo disso, o problema é o prompt, não o app — e é muito mais barato descobrir agora.

### Etapa 3 — MVP com usuários reais (2 semanas)

Liberar o app para o mesmo grupo e acompanhar:

| Indicador | Meta |
|---|---|
| Precisão da classificação | ≥ 90% |
| Registros por usuário por semana | ≥ 10 |
| Usuários ativos no dia 7 | ≥ 60% |
| Correções manuais por registro | ≤ 0,2 |

O indicador que mais importa é o **retorno no dia 7**. Registrar gasto no primeiro dia todo mundo registra — a novidade sustenta. Voltar na segunda semana é o que prova que o atrito realmente caiu.

## 7. Depois do MVP

Na ordem de prioridade:

1. **WhatsApp via n8n** — o app deixa de exigir que o usuário abra o app
2. **Foto de comprovante** — o usuário fotografa a nota, o app extrai os dados
3. **Múltiplas contas e cartões**
4. **Gastos recorrentes** — assinaturas detectadas automaticamente pelo padrão de repetição
5. **Metas de poupança**, quando houver dado de saldo confiável
