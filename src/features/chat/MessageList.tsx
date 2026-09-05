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
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isTyping, 
  onUpdateTransaction, 
  onDeleteTransaction,
  onClarificationSelect
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 w-full overflow-y-auto px-4 py-6 space-y-6">
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <p>Nenhuma mensagem ainda. Como posso ajudar com suas finanças?</p>
        </div>
      )}

      {messages.map((msg, index) => {
        const isUser = msg.papel === 'user';
        
        // If it's the last message, from assistant, and has no transaction, but asks a question (or starts with a question mark?), we might show a clarification card
        // Actually, the PRD says: "Confiança abaixo de 0,80 exibe a pergunta com chips de resposta clicáveis". 
        // Our Edge function returns text. We can render ClarificationCard if it's the last assistant message, no transaction, and looks like a question.
        const isLastAssistantMessage = index === messages.length - 1 && !isUser;
        const needsClarification = isLastAssistantMessage && !msg.transaction_id && msg.conteudo.includes('?');

        return (
          <div key={msg.id || index} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                isUser 
                  ? 'bg-primary text-primary-foreground rounded-br-none' 
                  : 'bg-muted text-foreground rounded-bl-none'
              }`}
            >
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
                question="Parece que faltou alguma informação. Pode escolher uma opção abaixo?"
                onSelect={onClarificationSelect}
              />
            )}
          </div>
        );
      })}

      {isTyping && (
        <div className="flex flex-col items-start">
          <div className="max-w-[85%] rounded-2xl rounded-bl-none px-4 py-3 bg-muted flex gap-1">
            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
      
      <div ref={bottomRef} />
    </div>
  );
};
