import React, { useEffect, useRef } from 'react';
import type { ChatMessageWithTransaction, Transaction } from '../../types/chat';
import { TransactionCard } from './TransactionCard';
import { ClarificationCard } from './ClarificationCard';

interface MessageListProps {
  messages: ChatMessageWithTransaction[];
  isTyping: boolean;
  onUpdateTransaction: (updated: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onClarificationSelect: (pergunta_id: string, campo_faltante: 'valor' | 'categoria', answer: string) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isTyping,
  onUpdateTransaction,
  onDeleteTransaction,
  onClarificationSelect,
  hasMore,
  loadingMore,
  onLoadMore
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(messages.length);
  const prevScrollHeight = useRef<number>(0);
  
  // Intersection Observer for infinite scroll to top
  useEffect(() => {
    if (!topSentinelRef.current || !hasMore || loadingMore || !onLoadMore) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (containerRef.current) {
             prevScrollHeight.current = containerRef.current.scrollHeight;
          }
          onLoadMore();
        }
      },
      { root: containerRef.current, threshold: 0.1 }
    );
    
    observer.observe(topSentinelRef.current);
    
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  // Adjust scroll position after prepending older messages
  useEffect(() => {
    if (containerRef.current && prevMessagesLength.current > 0 && messages.length > prevMessagesLength.current) {
      // If we prepended messages (i.e. first message changed or just more messages but last user message wasn't the trigger)
      const isNewUserMsg = messages[messages.length - 1]?.papel === 'user';
      if (!isNewUserMsg && containerRef.current.scrollHeight > prevScrollHeight.current) {
         // Restore scroll position
         const diff = containerRef.current.scrollHeight - prevScrollHeight.current;
         containerRef.current.scrollTop += diff;
      }
    }
  }, [messages]);

  useEffect(() => {
    // Só desce a tela se for uma mensagem nova sendo adicionada (ou inicial)
    // Se paginou para trás, não empurra pra baixo
    if (messages.length > prevMessagesLength.current && messages[messages.length - 1]?.papel === 'user') {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } else if (prevMessagesLength.current === 0 && messages.length > 0) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 150);
    }
    prevMessagesLength.current = messages.length;
  }, [messages, isTyping]);

  return (
    <div ref={containerRef} className="flex-1 w-full overflow-y-auto px-4 py-6 space-y-6">
      <div ref={topSentinelRef} className="h-4 w-full flex-shrink-0" />
      {hasMore && loadingMore && (
        <div className="flex justify-center pb-4">
          <div className="text-muted-foreground text-sm flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            Carregando anteriores...
          </div>
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <p>Nenhuma mensagem ainda. Como posso ajudar com suas finanças?</p>
        </div>
      )}

      {messages.map((msg, index) => {
        const isUser = msg.papel === 'user';
        
        const isLastAssistantMessage = index === messages.length - 1 && !isUser;
        
        let needsClarification = false;
        let clarificationOptions: string[] | undefined = undefined;

        let clarificationId: string | undefined = undefined;
        let clarificationCampo: 'valor' | 'categoria' | undefined = undefined;

        if (isLastAssistantMessage) {
           if (msg.pergunta) {
             needsClarification = true;
             clarificationId = msg.pergunta.id;
             clarificationCampo = msg.pergunta.campo_faltante;
             clarificationOptions = msg.pergunta.opcoes;
           }
        }

        return (
          <div key={msg.id || index} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
            <div className={`px-4 py-3 rounded-2xl max-w-[85%] ${
                isUser 
                  ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                  : 'bg-background border border-border text-foreground rounded-tl-sm'
              } ${(!msg.conteudo || msg.conteudo.trim() === '') ? 'hidden' : ''}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
            </div>
            
            {!isUser && msg.transaction && (
              <TransactionCard 
                transaction={msg.transaction}
                onUpdate={onUpdateTransaction}
                onDelete={onDeleteTransaction}
              />
            )}

            {needsClarification && clarificationId && clarificationCampo && (
              <ClarificationCard 
                campo_faltante={clarificationCampo}
                options={clarificationOptions}
                onSelect={(answer) => onClarificationSelect(clarificationId!, clarificationCampo!, answer)}
              />
            )}
          </div>
        );
      })}

      {isTyping && (
        <div className="flex gap-1 items-center px-4 py-3 bg-background border border-border rounded-2xl rounded-tl-sm shadow-sm w-fit">
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}
      
      <div ref={bottomRef} />
    </div>
  );
};
