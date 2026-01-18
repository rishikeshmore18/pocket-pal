export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          bank_name: string
          created_at: string | null
          current_balance: number
          id: string
          user_id: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          bank_name: string
          created_at?: string | null
          current_balance?: number
          id?: string
          user_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          bank_name?: string
          created_at?: string | null
          current_balance?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      cash_account: {
        Row: {
          current_balance: number
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_balance?: number
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_balance?: number
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      custom_categories: {
        Row: {
          category_name: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          category_name: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          category_name?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_payment_methods: {
        Row: {
          created_at: string | null
          id: string
          method_name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          method_name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          method_name?: string
          user_id?: string
        }
        Relationships: []
      }
      debts: {
        Row: {
          current_amount: number
          debt_name: string
          debt_type: Database["public"]["Enums"]["debt_type"]
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_amount?: number
          debt_name: string
          debt_type?: Database["public"]["Enums"]["debt_type"]
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_amount?: number
          debt_name?: string
          debt_type?: Database["public"]["Enums"]["debt_type"]
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string | null
          date_time: string | null
          expense_name: string
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method_type"]
          user_id: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          date_time?: string | null
          expense_name: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method_type"]
          user_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          date_time?: string | null
          expense_name?: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method_type"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          currency_symbol: string | null
          id: string
          name: string
          theme_preference: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency_symbol?: string | null
          id?: string
          name: string
          theme_preference?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency_symbol?: string | null
          id?: string
          name?: string
          theme_preference?: string | null
          user_id?: string
        }
        Relationships: []
      }
      timesheets: {
        Row: {
          created_at: string | null
          day_of_week: string
          hourly_pay: number
          hours_worked: number
          id: string
          job_name: string
          payment_frequency:
            | Database["public"]["Enums"]["payment_frequency"]
            | null
          time_from: string | null
          time_to: string | null
          user_id: string
          work_date: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: string
          hourly_pay: number
          hours_worked: number
          id?: string
          job_name: string
          payment_frequency?:
            | Database["public"]["Enums"]["payment_frequency"]
            | null
          time_from?: string | null
          time_to?: string | null
          user_id: string
          work_date?: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: string
          hourly_pay?: number
          hours_worked?: number
          id?: string
          job_name?: string
          payment_frequency?:
            | Database["public"]["Enums"]["payment_frequency"]
            | null
          time_from?: string | null
          time_to?: string | null
          user_id?: string
          work_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type: "checking" | "savings" | "both"
      debt_type:
        | "credit_card"
        | "student_loan"
        | "personal_loan"
        | "mortgage"
        | "other"
      expense_category:
        | "rent"
        | "utilities"
        | "grocery"
        | "fast_food"
        | "transport"
        | "credit_card"
        | "entertainment"
        | "healthcare"
        | "shopping"
        | "other"
      payment_frequency: "weekly" | "bi_weekly" | "monthly"
      payment_method_type:
        | "credit"
        | "debit"
        | "cash"
        | "bank_transfer"
        | "other"
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
  public: {
    Enums: {
      account_type: ["checking", "savings", "both"],
      debt_type: [
        "credit_card",
        "student_loan",
        "personal_loan",
        "mortgage",
        "other",
      ],
      expense_category: [
        "rent",
        "utilities",
        "grocery",
        "fast_food",
        "transport",
        "credit_card",
        "entertainment",
        "healthcare",
        "shopping",
        "other",
      ],
      payment_frequency: ["weekly", "bi_weekly", "monthly"],
      payment_method_type: [
        "credit",
        "debit",
        "cash",
        "bank_transfer",
        "other",
      ],
    },
  },
} as const
