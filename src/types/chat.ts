import type { Database } from './database';

export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];

export interface ChatMessageWithTransaction extends ChatMessage {
  transaction?: Transaction | null;
  pergunta?: { id?: string; texto: string; campo_faltante?: 'valor' | 'categoria'; opcoes?: string[] } | null;
}
