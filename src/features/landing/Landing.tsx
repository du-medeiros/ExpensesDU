import { useState, useRef, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Zap, Shield, PiggyBank, Target, BarChart3, MessageSquare } from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isCard?: boolean;
  cardData?: {
    category: string;
    value: string;
    date: string;
  };
};

const INITIAL_MESSAGES: Message[] = [
  { id: '1', role: 'assistant', content: 'Olá! Sou o ExpensesDu, seu assistente financeiro por mensagem. O que você gastou hoje?' }
];

export function Landing() {
  const { session, isLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  if (session) {
    return <Navigate to="/app" replace />;
  }

  const handleDemoSubmit = (e?: React.FormEvent, presetValue?: string) => {
    e?.preventDefault();
    const text = presetValue || inputValue;
    if (!text.trim()) return;

    // Add user message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // Mock parser response
    setTimeout(() => {
      const lower = text.toLowerCase();
      let responseMsg: Message;

      if (lower.includes('almoço') || lower.includes('comida') || lower.includes('mercado') || lower.includes('lanche')) {
        const valMatch = text.match(/\d+([.,]\d{1,2})?/);
        const val = valMatch ? valMatch[0] : '32';
        
        responseMsg = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Despesa registrada!',
          isCard: true,
          cardData: {
            category: 'Alimentação',
            value: `R$ ${val.replace('.', ',')}`,
            date: 'Hoje'
          }
        };
      } else if (lower.includes('uber') || lower.includes('ônibus') || lower.includes('gasolina')) {
        const valMatch = text.match(/\d+([.,]\d{1,2})?/);
        const val = valMatch ? valMatch[0] : '25';
        
        responseMsg = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Despesa registrada!',
          isCard: true,
          cardData: {
            category: 'Transporte',
            value: `R$ ${val.replace('.', ',')}`,
            date: 'Hoje'
          }
        };
      } else {
        responseMsg = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Não entendi bem o valor ou categoria, poderia reescrever de forma mais simples (ex: "almoço 32")?'
        };
      }

      setMessages(prev => [...prev, responseMsg]);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold">
              E
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">ExpensesDu</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Entrar
            </Link>
            <Link to="/register" className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-full hover:bg-primary/90 transition-colors">
              Criar conta grátis
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section with Demo */}
        <section className="pt-16 pb-24 px-4 bg-slate-50 overflow-hidden">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                Controle seu dinheiro como se enviasse um Zap.
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-lg leading-relaxed">
                Sem planilhas chatas e sem formulários. Você escreve o que gastou, e nós organizamos tudo na hora. É rápido assim.
              </p>
              
              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <Link to="/register" className="inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 active:scale-95 text-lg">
                  Criar conta grátis
                </Link>
              </div>
            </div>

            {/* Interactive Demo */}
            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <div className="relative bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[500px]">
                {/* Chat Header */}
                <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">ExpensesDu</h3>
                    <p className="text-xs text-slate-500">Sempre online</p>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-3 ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-br-none' 
                          : 'bg-muted text-foreground rounded-bl-none'
                      }`}>
                        {msg.content && <p className="text-sm">{msg.content}</p>}
                        
                        {msg.isCard && msg.cardData && (
                          <div className="mt-2 border-2 border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm relative animate-card-enter">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                            <div className="px-3 py-2 flex items-center gap-2 mt-1 ml-1">
                              <span className="text-sm font-semibold text-slate-900 capitalize">{msg.cardData.category}</span>
                            </div>
                            <div className="px-3 pb-3 ml-1">
                              <p className="text-2xl font-bold text-despesa tabular-nums">↓ −{msg.cardData.value}</p>
                              <p className="text-xs text-slate-500 mt-1">{msg.cardData.date}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <div className="bg-white p-3 border-t border-slate-100">
                  <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                    <button onClick={() => handleDemoSubmit(undefined, 'almoço 32')} className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-medium text-slate-600 transition-colors">
                      "almoço 32"
                    </button>
                    <button onClick={() => handleDemoSubmit(undefined, 'uber 15')} className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-medium text-slate-600 transition-colors">
                      "uber 15"
                    </button>
                    <button onClick={() => handleDemoSubmit(undefined, 'mercado 120')} className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-medium text-slate-600 transition-colors">
                      "mercado 120"
                    </button>
                  </div>
                  <form onSubmit={handleDemoSubmit} className="flex items-center gap-2 bg-slate-100 rounded-full p-1 pl-4">
                    <input
                      type="text"
                      placeholder="Digite um gasto..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-700"
                    />
                    <button 
                      type="submit" 
                      disabled={!inputValue.trim()}
                      className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white disabled:opacity-50 disabled:bg-slate-400 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* O Problema */}
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Por que você desiste dos outros aplicativos?
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Você gasta o dinheiro na rua, em três segundos. Mas na hora de anotar, o aplicativo pede que você preencha data, valor, categoria, conta de origem, descrição... é um formulário cansativo. 
              <strong> A distância entre o gasto e o formulário é onde o seu hábito morre.</strong>
            </p>
          </div>
        </section>

        {/* Como Funciona */}
        <section className="py-20 px-4 bg-slate-50 border-y border-slate-200">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Anotar não pode dar trabalho</h2>
              <p className="text-slate-600">Três passos simples para você nunca mais esquecer de anotar.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">1. Escreva como fala</h3>
                <p className="text-slate-600 leading-relaxed">
                  Não navegue por menus. Apenas digite "almoço 35" ou "farmácia 42" no campo de conversa.
                </p>
              </div>
              
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">2. Confirme com um toque</h3>
                <p className="text-slate-600 leading-relaxed">
                  O assistente interpreta o valor e a categoria automaticamente. Se algo estiver errado, você corrige com um toque.
                </p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">3. Acompanhe o resultado</h3>
                <p className="text-slate-600 leading-relaxed">
                  Abra a aba de resumo para ver o total gasto no mês, gráficos simples e quanto ainda falta para atingir seu teto.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Funcionalidades */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-8">
                  Inteligência que trabalha por você
                </h2>
                
                <ul className="space-y-8">
                  <li className="flex gap-4">
                    <div className="mt-1 w-10 h-10 shrink-0 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1">Classificação Automática</h4>
                      <p className="text-slate-600">Nossa inteligência artificial sabe que pão é alimentação e gasolina é transporte. Pare de escolher categorias.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="mt-1 w-10 h-10 shrink-0 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1">Tetos de Gasto</h4>
                      <p className="text-slate-600">Defina um limite para transporte, comida ou lazer. O assistente te avisa quando você estiver chegando perto de estourar.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="mt-1 w-10 h-10 shrink-0 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                      <PiggyBank className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1">Dicas do Agente</h4>
                      <p className="text-slate-600">Receba pequenos avisos de atenção diretamente na conversa caso os seus gastos acelerem muito antes do fim do mês.</p>
                    </div>
                  </li>
                </ul>
              </div>
              
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200">
                <h3 className="text-xl font-bold mb-6 text-slate-900">Pergunte aos seus dados</h3>
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">?</div>
                    <p className="text-sm text-slate-600">"Quanto gastei com comida esse mês?"</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">?</div>
                    <p className="text-sm text-slate-600">"Qual foi meu maior gasto de hoje?"</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">?</div>
                    <p className="text-sm text-slate-600">"Sobrou quanto da meta de lazer?"</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Para quem é & CTA */}
        <section className="py-24 px-4 bg-slate-900 text-white text-center">
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold">Feito para quem já tentou e desistiu</h2>
            <p className="text-lg text-slate-300">
              Se você nunca conseguiu usar uma planilha financeira por mais de duas semanas, o ExpensesDu é para você.
            </p>
            <Link to="/register" className="inline-block bg-primary text-white font-bold px-8 py-4 rounded-full text-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
              Criar conta grátis
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-slate-50 py-12 px-4 border-t border-slate-200 text-center text-sm text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
              E
            </div>
            <span className="font-bold text-slate-900">ExpensesDu</span>
          </div>
          <p>
            © {new Date().getFullYear()} ExpensesDu. Feito para facilitar sua rotina. |{' '}
            <a href="https://medeiros.dev.br" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition-colors font-medium">
              Medeiros.DEV - 2026 - todos os direitos reservados
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
