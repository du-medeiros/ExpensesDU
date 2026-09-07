export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          conteudo: string
          created_at: string | null
          id: string
          papel: Database["public"]["Enums"]["papel_mensagem"]
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          conteudo: string
          created_at?: string | null
          id?: string
          papel: Database["public"]["Enums"]["papel_mensagem"]
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          conteudo?: string
          created_at?: string | null
          id?: string
          papel?: Database["public"]["Enums"]["papel_mensagem"]
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          tipo_evento: Database["public"]["Enums"]["event_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          tipo_evento: Database["public"]["Enums"]["event_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          tipo_evento?: Database["public"]["Enums"]["event_type"]
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria"]
          id: string
          mes_referencia: string
          user_id: string
          valor_teto: number
        }
        Insert: {
          categoria: Database["public"]["Enums"]["categoria"]
          id?: string
          mes_referencia: string
          user_id: string
          valor_teto: number
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria"]
          id?: string
          mes_referencia?: string
          user_id?: string
          valor_teto?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          nome: string | null
          timezone: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          nome?: string | null
          timezone?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string | null
          timezone?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria"]
          client_message_id: string
          confianca: number | null
          created_at: string | null
          data: string
          descricao: string
          foi_corrigida: boolean
          id: string
          origem: Database["public"]["Enums"]["origem_transacao"]
          tipo: Database["public"]["Enums"]["tipo_transacao"]
          user_id: string
          valor: number
        }
        Insert: {
          categoria: Database["public"]["Enums"]["categoria"]
          client_message_id: string
          confianca?: number | null
          created_at?: string | null
          data: string
          descricao: string
          foi_corrigida?: boolean
          id?: string
          origem: Database["public"]["Enums"]["origem_transacao"]
          tipo: Database["public"]["Enums"]["tipo_transacao"]
          user_id: string
          valor: number
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria"]
          client_message_id?: string
          confianca?: number | null
          created_at?: string | null
          data?: string
          descricao?: string
          foi_corrigida?: boolean
          id?: string
          origem?: Database["public"]["Enums"]["origem_transacao"]
          tipo?: Database["public"]["Enums"]["tipo_transacao"]
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
    }
    Views: {
      model_calibration_metrics: {
        Row: {
          faixa_confianca: string | null
          taxa_erro_percentual: number | null
          total_corrigidas: number | null
          total_transacoes: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_financial_agent_triggers: {
        Args: { p_date: string }
        Returns: Json
      }
      delete_user_account: { Args: never; Returns: undefined }
      get_monthly_summary: { Args: { p_date: string }; Returns: Json }
      get_or_create_monthly_goals: { Args: { p_date: string }; Returns: Json }
    }
    Enums: {
      categoria:
        | "alimentacao"
        | "transporte"
        | "moradia"
        | "saude"
        | "lazer"
        | "compras"
        | "contas"
        | "outros"
      event_type:
        | "mensagem_enviada"
        | "transacao_criada"
        | "transacao_corrigida"
        | "esclarecimento_solicitado"
        | "esclarecimento_respondido"
        | "parser_falhou"
        | "meta_criada"
        | "dica_exibida"
        | "resumo_aberto"
      origem_transacao: "chat" | "manual" | "whatsapp"
      papel_mensagem: "user" | "assistant"
      tipo_transacao: "despesa" | "receita"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      categoria: [
        "alimentacao",
        "transporte",
        "moradia",
        "saude",
        "lazer",
        "compras",
        "contas",
        "outros",
      ],
      event_type: [
        "mensagem_enviada",
        "transacao_criada",
        "transacao_corrigida",
        "esclarecimento_solicitado",
        "esclarecimento_respondido",
        "parser_falhou",
        "meta_criada",
        "dica_exibida",
        "resumo_aberto",
      ],
      origem_transacao: ["chat", "manual", "whatsapp"],
      papel_mensagem: ["user", "assistant"],
      tipo_transacao: ["despesa", "receita"],
    },
  },
} as const

