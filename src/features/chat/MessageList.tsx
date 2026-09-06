import React, { useEffect, useRef } from 'react';
import type { ChatMessageWithTransaction, Transaction } from '../../types/chat';
import { TransactionCard } from './TransactionCard';
import { ClarificationCard } from './ClarificationCard';

interface MessageListProps {
  messages: ChatMessageWithTransaction[];
  isTyping: boolean;
  onUpdateTransaction: (updated: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onClarificationSelect: (answer: string) => void;
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
  const prevMessagesLength = useRef(messages.length);

  useEffect(() => {
    // Só desce a tela se for uma mensagem nova sendo adicionada (ou inicial)
    // Se paginou para trás, não empurra pra baixo
    if (messages.length > prevMessagesLength.current && messages[messages.length - 1]?.papel === 'user') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (prevMessagesLength.current === 0 && messages.length > 0) {
       bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
    prevMessagesLength.current = messages.length;
  }, [messages, isTyping]);

  return (
    <div ref={containerRef} className="flex-1 w-full overflow-y-auto px-4 py-6 space-y-6">
      {hasMore && (
        <div className="flex justify-center pb-4">
          <button 
            onClick={onLoadMore} 
            disabled={loadingMore}
            className="px-4 py-2 bg-muted text-muted-foreground hover:bg-border text-sm rounded-full transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Carregando...' : 'Carregar anteriores'}
          </button>
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <p>Nenhuma mensagem ainda. Como posso ajudar com suas finanças?</p>
        </div>
      )}

      {messages.map((msg, index) => {
        const isUser = msg.papel === 'user';
        
        // If it's the last message, from assistant, and has no transaction, but asks a question (or starts with a question mark?), we might show a clarification card
        // Actually, the PRD says: "Confiança abaixo de 0,80 exibe a pergunta com chips de resposta clicáveis". 
        // Render ClarificationCard only if the assistant explicitly asks about category
        const isLastAssistantMessage = index === messages.length - 1 && !isUser;
        const lowerContent = msg.conteudo ? msg.conteudo.toLowerCase() : '';
        const isCategoryQuestion = lowerContent.includes('categoria') || lowerContent.includes('tipo de gasto') || lowerContent.includes('com o que');
        const needsClarification = isLastAssistantMessage && !msg.transaction_id && isCategoryQuestion;

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

            {needsClarification && (
              <ClarificationCard 
                question={msg.conteudo}
                onSelect={onClarificationSelect}
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
