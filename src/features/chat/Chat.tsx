import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { ChatMessageWithTransaction, Transaction } from '../../types/chat';
import { MessageList } from './MessageList';
import { Send, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessageWithTransaction[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    async function loadHistory() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            *,
            transaction:transactions(*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(50);
          
        if (error) throw error;
        
        // Formata os dados para o tipo correto, extraindo o array de transactions
        const formatted = (data || []).map(msg => ({
          ...msg,
          transaction: msg.transaction && Array.isArray(msg.transaction) && msg.transaction.length > 0 
            ? msg.transaction[0] as Transaction 
            : (msg.transaction as unknown as Transaction) || null
        }));
        
        setMessages(formatted as ChatMessageWithTransaction[]);
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [user]);

  const handleSend = async (text: string) => {
    if (!text.trim() || !user) return;
    
    if (isOffline) {
      toast.error('Você está offline. Conecte-se à internet para enviar.');
      return;
    }

    const clientMsgId = crypto.randomUUID();
    const optimisticUserMsg: ChatMessageWithTransaction = {
      id: clientMsgId,
      user_id: user.id,
      papel: 'user',
      conteudo: text.trim(),
      transaction_id: null,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticUserMsg]);
    setInput('');
    setIsTyping(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interpretar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            texto: text.trim(),
            dataCliente: new Date().toISOString().split('T')[0],
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            client_message_id: clientMsgId,
            historico: messages.slice(-5).map(m => ({ role: m.papel, content: m.conteudo }))
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Você atingiu o limite de 60 mensagens por hora.');
        }
        throw new Error('Erro ao processar mensagem.');
      }

      const result = await response.json();
      
      // Fetch the newly created assistant message from db to get full relations (or construct optimistic)
      if (result.assistant_message_id) {
        const { data: newAssistantMsg, error: fetchError } = await supabase
          .from('chat_messages')
          .select(`
            *,
            transaction:transactions(*)
          `)
          .eq('id', result.assistant_message_id)
          .single();
          
        if (!fetchError && newAssistantMsg) {
           const formatted = {
            ...newAssistantMsg,
            transaction: newAssistantMsg.transaction && Array.isArray(newAssistantMsg.transaction) && newAssistantMsg.transaction.length > 0 
              ? newAssistantMsg.transaction[0] as Transaction 
              : (newAssistantMsg.transaction as unknown as Transaction) || null
          } as ChatMessageWithTransaction;
          
          setMessages(prev => [...prev, formatted]);
        }
      }

    } catch (error: any) {
      console.error('Send error:', error);
      // Rollback
      setMessages(prev => prev.filter(m => m.id !== clientMsgId));
      setInput(text);
      if (error.name === 'AbortError') {
        toast.error('Tempo limite excedido. Tente novamente.');
      } else {
        toast.error(error.message || 'Falha ao enviar mensagem.');
      }
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleUpdateTransaction = (updated: Transaction) => {
    setMessages(prev => prev.map(msg => {
      if (msg.transaction_id === updated.id) {
        return { ...msg, transaction: updated };
      }
      return msg;
    }));
  };

  const handleDeleteTransaction = (id: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.transaction_id === id) {
        return { ...msg, transaction: null };
      }
      return msg;
    }));
  };

  return (
    <div className="flex flex-col h-full bg-muted overflow-hidden relative">
      {isOffline && (
        <div className="bg-estouro text-primary-foreground text-xs font-medium py-1 px-4 flex items-center justify-center gap-2">
          <WifiOff className="w-3 h-3" />
          Sem conexão à internet
        </div>
      )}
      
      {loading && messages.length === 0 ? (
        <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full space-y-4 mt-4">
          <div className="flex flex-col gap-1 items-start w-3/4">
            <div className="h-4 w-24 bg-background border-border rounded animate-pulse mb-1"></div>
            <div className="h-12 w-full bg-background border-border rounded-2xl rounded-tl-sm animate-pulse"></div>
          </div>
          <div className="flex flex-col gap-1 items-end w-3/4 ml-auto">
            <div className="h-4 w-16 bg-background border-border rounded animate-pulse mb-1"></div>
            <div className="h-12 w-full bg-primary/40 rounded-2xl rounded-tr-sm animate-pulse"></div>
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">👋</span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Oi! Eu sou seu agente financeiro.</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Para começar, apenas me diga o que você gastou como se estivesse mandando uma mensagem.
          </p>
          <div className="flex flex-wrap gap-2 justify-center w-full">
            <button 
              onClick={() => handleSend('Almoço 32')}
              className="px-4 py-2 bg-background border border-border rounded-full text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors min-h-[44px]"
            >
              "Almoço 32"
            </button>
            <button 
              onClick={() => handleSend('Uber 15 ontem')}
              className="px-4 py-2 bg-background border border-border rounded-full text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors min-h-[44px]"
            >
              "Uber 15 ontem"
            </button>
            <button 
              onClick={() => handleSend('Quero gastar no máximo 400 com mercado')}
              className="px-4 py-2 bg-background border border-border rounded-full text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors min-h-[44px]"
            >
              "Meta 400 mercado"
            </button>
          </div>
        </div>
      ) : (
        <MessageList 
          messages={messages} 
          isTyping={isTyping}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onClarificationSelect={(answer) => handleSend(answer)}
        />
      )}

      <div className="p-3 bg-background border-t border-border">
        <form 
          className="max-w-4xl mx-auto flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
        >
          <div className="flex-1 bg-muted rounded-2xl border border-transparent focus-within:border-primary/50 focus-within:bg-background overflow-hidden transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite um gasto (ex: Gastei 40 no ifood)"
              className="w-full bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
              autoComplete="off"
              disabled={isTyping}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-primary text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
