# ExpensesDu

Controle de gastos por conversa. Você escreve `almoço 32` e o app registra, classifica e confirma.

**[expensesdu.vercel.app](https://expensesdu.vercel.app/)**

Projeto desenvolvido para o curso da DIO.

---

## O problema

As pessoas não abandonam apps de finanças por falta de disciplina. Abandonam porque registrar um café de R$ 8 custa sete toques na tela, e ninguém repete isso trinta vezes por mês.

O gasto acontece na rua, com o celular na mão, em três segundos de atenção. O app pede um formulário. A distância entre esses dois momentos é onde o hábito morre.

## A solução

Trocar o formulário por uma frase.

```
Você:  almoço 32
App:   Anotei: Alimentação, R$ 32,00
       ┌─────────────────────────────┐
       │ Almoço                      │
       │ −R$ 32,00 · Alimentação     │
       │ 07/09/2026          ✏️  🗑️  │
       └─────────────────────────────┘
```

Um campo de texto, uma frase natural, uma confirmação. O mesmo esforço de mandar mensagem para um amigo.

## O que o app faz

**Entende linguagem natural, não comandos.**

```
uber 25                          → Transporte, R$ 25,00, hoje
pizza ontem 78                   → Alimentação, R$ 78,00, ontem
1.250,00 de aluguel              → Moradia, R$ 1.250,00
dois mil reais de aluguel        → Moradia, R$ 2.000,00
mercado 120 e farmácia 40        → duas transações separadas
uber 30 e almoço 40 e café 8     → três transações separadas
mercado 99 dia 31 de agosto      → Alimentação, 31/08
```

**Pergunta quando não sabe, em vez de inventar.**

```
Você:  comprei umas coisas
App:   Qual o valor das coisas que você comprou?
```

A pergunta é construída a partir do texto do usuário, não um template. E o app só pergunta quando falta o **valor** — se a categoria não for reconhecida mas o valor estiver lá, ele registra em *Outros* e segue. Categorização tardia é melhor que atrito.

**Avisa quando desconfia de repetição.**

```
Você:  uber 25
App:   Você registrou Uber R$ 25,00 há pouco. Quer lançar de novo?
       [Sim, lançar]  [Não, era engano]
```

Dois cafés de R$ 25 em cinco minutos é uma compra plausível. O app não decide sozinho qual era a intenção.

**Responde perguntas sobre os próprios dados.**

```
Você:  quanto gastei esse mês?
App:   Você gastou um total de R$ 4.734,60 este mês.

Você:  quanto gastei com comida?
App:   Você gastou um total de R$ 567,00 com comida.
```

Os números vêm de consulta SQL. O modelo recebe o resultado pronto e apenas redige a frase — nunca calcula, estima ou infere um valor.

**Tetos de gasto por categoria**, com acompanhamento de progresso, criáveis pelo formulário ou pela conversa (`no máximo 300 com lazer`). Excluir oferece *"Só este mês"* ou *"Este e os próximos"*.

**Resumo mensal** com totais, comparação com o mês anterior, gráfico de rosca com legenda e a lista completa de transações, cada uma editável e removível com confirmação que cita o que vai sumir.

## Resultados medidos

Cinco rodadas de teste em navegador, com correção entre cada uma. Medição com 25 mensagens e conferência manual dos totais contra o banco.

| Indicador | Meta | Rodada 3 | Rodada 5 |
|---|---|---|---|
| Acurácia de intenção | — | 92,0% | **100%** |
| Acurácia de categoria | ≥ 90% | 76,5% | **100%** |
| Acurácia de valor | — | 88,2% | **100%** |
| Acurácia de data | — | 88,2% | **100%** ¹ |
| Tempo mediano até o card | ≤ 2s | 1,70s | **1,71s** |
| Transações duplicadas | 0 | 0 | **0** |
| Transações inalcançáveis pela interface | 0 | 24 → 0 | **0** ² |

¹ Medida contra a data corrente do app. A resolução de fuso foi corrigida estruturalmente, mas ainda não observada em condição de falha — o teste rodou em horário em que Brasília e UTC coincidem.

² Duas rodadas antes eram 24 transações que existiam no banco sem nenhum caminho de edição ou exclusão pela interface.

Relatório completo: [`docs/relatorio-testes-consolidado.md`](./docs/relatorio-testes-consolidado.md)

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, TypeScript, Vite, PWA |
| Estilo | Tailwind CSS |
| Gráficos | Recharts |
| Backend e banco | Supabase — PostgreSQL, Auth, Edge Functions |
| Interpretação | OpenAI, com Structured Outputs em modo estrito |
| Deploy | Vercel |

## Como funciona

```
Mensagem do usuário
        ↓
Edge Function — valida o JWT, deriva o user_id, resolve o fuso do perfil
        ↓
OpenAI — response_format json_schema, strict: true, temperature: 0
        ↓
JSON com formato garantido: { intencao, transacoes[], pergunta, resposta }
        ↓
Validação Zod das regras de negócio
        ↓
Guarda anti-duplicação
        ↓
  valor presente  →  grava e devolve o card
  valor ausente   →  pergunta, guardando o estado pendente
```

### Quatro decisões de arquitetura

**A chave da API nunca vai para o frontend.** Chave em código React é chave vazada — qualquer pessoa abre o inspetor e leva. A chamada acontece na Edge Function, com o `user_id` derivado do JWT validado, nunca do corpo da requisição.

**Structured Outputs garante o formato; a validação Zod garante o significado.** A restrição do schema é aplicada durante a geração, então JSON malformado deixa de ser possível. Mas o schema obriga `valor` a ser um número, não a ser um número que faça sentido — validação de negócio continua obrigatória.

**`temperature: 0`.** Extração de dado estruturado não é tarefa criativa. Com amostragem ativa, `uber 50` registrava e `uber 25` perguntava a categoria na mesma sessão. Zerar a temperatura levou a acurácia de categoria de 76,5% para 88,9% em uma única mudança.

**Datas resolvidas no fuso do perfil, nunca em UTC.** O cliente envia `dataCliente` e `timezone` a cada mensagem. Sem isso, um lançamento às 22h de Brasília cai no dia seguinte — e no dia 31, no mês seguinte, corrompendo o fechamento sem que o usuário perceba.

## Segurança

- Row Level Security em todas as tabelas, política `user_id = auth.uid()`
- Segredos apenas em variáveis de ambiente da Edge Function
- Validação de JWT em toda chamada
- Rate limit por usuário
- Valores monetários em `numeric(12,2)`, nunca ponto flutuante
- Idempotência por `client_message_id`
- Guarda contra transações idênticas em janela curta

## Como foi testado

O processo de teste foi tão determinante quanto o código. Três regras que mudaram o resultado:

**Medir só depois dos portões.** Nas duas primeiras rodadas a medição foi abortada de propósito: um número de acurácia colhido sobre um parser com defeito conhecido não informa nada.

**Provar que dá para apagar antes de criar volume.** A segunda rodada terminou com 24 transações que o app não conseguia remover, limpas por SQL. A partir dali, a capacidade de exclusão virou portão bloqueante — e o indicador ficou em zero nas três rodadas seguintes.

**Listar o que estava funcionando a cada rodada.** Correção em várias frentes quebra o que já funcionava. A legenda do gráfico, adicionada para melhorar acessibilidade, criou uma regressão de layout a 320px na rodada seguinte.

## Rodando localmente

```bash
git clone https://github.com/du-medeiros/ExpensesDU.git
cd ExpensesDU
npm install
cp .env.example .env.local
npm run dev
```

Preencha o `.env.local`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Os segredos do servidor ficam na Supabase, nunca no `.env.local`:

```bash
npx supabase secrets set OPENAI_API_KEY=...
npx supabase secrets set OPENAI_MODEL=...
npx supabase functions deploy interpretar
```

> O projeto usa exclusivamente a Supabase hospedada, sem instância local. Migrations já aplicadas são imutáveis: toda mudança de schema é arquivo novo.

## Escopo do MVP

Cortes conscientes, não omissões:

| Fora do MVP | Motivo |
|---|---|
| Múltiplas contas | Obrigaria o parser a perguntar "crédito ou débito?" a cada mensagem, reintroduzindo o atrito que o produto elimina |
| Metas de poupança | Exigem saber o saldo real; sem integração bancária, o número seria inventado |
| Categorias personalizadas | Taxonomia fechada de 8 classifica melhor e elimina uma tela de configuração |
| Integração bancária | Certificação e prazo incompatíveis com um MVP |
| WhatsApp | A arquitetura já está pronta; é o próximo passo |

## Limitações conhecidas

- O feed abre no meio do histórico quando há muitas mensagens
- Ao fechar um esclarecimento, a categoria inferida do texto original se perde (`almoço` + valor grava em Outros)
- Uma frase longa sem valor pode ser tratada como registro incompleto

## Roadmap

1. WhatsApp via webhook — o app deixa de exigir que o usuário o abra
2. Foto de comprovante, com extração automática
3. Múltiplas contas e cartões
4. Gastos recorrentes detectados por padrão de repetição
5. Metas de poupança, quando houver dado de saldo confiável

## Documentação

[`/docs`](./docs) contém o PRD completo, o guia de ambiente, os prompts de implementação usados no desenvolvimento e o relatório consolidado de testes.

---

Desenvolvido por [Eduardo Medeiros](https://github.com/du-medeiros).
