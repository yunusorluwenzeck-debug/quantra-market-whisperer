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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_reports: {
        Row: {
          content: string
          created_at: string
          id: string
          score: number | null
          signal: string | null
          symbol: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          score?: number | null
          signal?: string | null
          symbol: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          score?: number | null
          signal?: string | null
          symbol?: string
        }
        Relationships: []
      }
      bot_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_settings: {
        Row: {
          blocked_symbols: string[]
          daily_loss_limit_pct: number
          day_start_date: string | null
          day_start_equity: number | null
          emergency_stop: boolean
          enabled: boolean
          last_run: string | null
          market_hours_only: boolean
          max_drawdown_pct: number
          max_exposure_pct: number
          max_positions: number
          max_trade_usd: number
          min_score: number
          paused_reason: string | null
          peak_equity: number | null
          regions: string[]
          stop_loss_pct: number
          take_profit_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_symbols?: string[]
          daily_loss_limit_pct?: number
          day_start_date?: string | null
          day_start_equity?: number | null
          emergency_stop?: boolean
          enabled?: boolean
          last_run?: string | null
          market_hours_only?: boolean
          max_drawdown_pct?: number
          max_exposure_pct?: number
          max_positions?: number
          max_trade_usd?: number
          min_score?: number
          paused_reason?: string | null
          peak_equity?: number | null
          regions?: string[]
          stop_loss_pct?: number
          take_profit_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_symbols?: string[]
          daily_loss_limit_pct?: number
          day_start_date?: string | null
          day_start_equity?: number | null
          emergency_stop?: boolean
          enabled?: boolean
          last_run?: string | null
          market_hours_only?: boolean
          max_drawdown_pct?: number
          max_exposure_pct?: number
          max_positions?: number
          max_trade_usd?: number
          min_score?: number
          paused_reason?: string | null
          peak_equity?: number | null
          regions?: string[]
          stop_loss_pct?: number
          take_profit_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_runs: {
        Row: {
          info: string | null
          job: string
          last_run: string
        }
        Insert: {
          info?: string | null
          job: string
          last_run?: string
        }
        Update: {
          info?: string | null
          job?: string
          last_run?: string
        }
        Relationships: []
      }
      paper_accounts: {
        Row: {
          cash: number
          created_at: string
          starting_cash: number
          user_id: string
        }
        Insert: {
          cash?: number
          created_at?: string
          starting_cash?: number
          user_id: string
        }
        Update: {
          cash?: number
          created_at?: string
          starting_cash?: number
          user_id?: string
        }
        Relationships: []
      }
      paper_positions: {
        Row: {
          avg_cost: number
          opened_at: string
          qty: number
          symbol: string
          user_id: string
        }
        Insert: {
          avg_cost: number
          opened_at?: string
          qty: number
          symbol: string
          user_id: string
        }
        Update: {
          avg_cost?: number
          opened_at?: string
          qty?: number
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      paper_trades: {
        Row: {
          created_at: string
          id: string
          price: number
          qty: number
          realized_pnl: number | null
          reason: string | null
          side: string
          source: string
          symbol: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          price: number
          qty: number
          realized_pnl?: number | null
          reason?: string | null
          side: string
          source: string
          symbol: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          qty?: number
          realized_pnl?: number | null
          reason?: string | null
          side?: string
          source?: string
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          created_at: string
          direction: string
          id: string
          seen: boolean
          symbol: string
          target: number
          triggered_at: string | null
          triggered_price: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          direction?: string
          id?: string
          seen?: boolean
          symbol: string
          target: number
          triggered_at?: string | null
          triggered_price?: number | null
          user_id?: string
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          seen?: boolean
          symbol?: string
          target?: number
          triggered_at?: string | null
          triggered_price?: number | null
          user_id?: string
        }
        Relationships: []
      }
      stock_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          symbols: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          symbols?: string[]
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          symbols?: string[]
          user_id?: string
        }
        Relationships: []
      }
      stocks: {
        Row: {
          change_pct: number | null
          country: string
          currency: string
          market_cap: number | null
          mom_1m: number | null
          mom_3m: number | null
          name: string
          price: number | null
          price_usd: number | null
          region: string
          rsi14: number | null
          score: number | null
          sector: string | null
          signal: string | null
          sma20: number | null
          sma50: number | null
          spark: Json | null
          symbol: string
          updated_at: string | null
          volatility: number | null
        }
        Insert: {
          change_pct?: number | null
          country: string
          currency?: string
          market_cap?: number | null
          mom_1m?: number | null
          mom_3m?: number | null
          name: string
          price?: number | null
          price_usd?: number | null
          region: string
          rsi14?: number | null
          score?: number | null
          sector?: string | null
          signal?: string | null
          sma20?: number | null
          sma50?: number | null
          spark?: Json | null
          symbol: string
          updated_at?: string | null
          volatility?: number | null
        }
        Update: {
          change_pct?: number | null
          country?: string
          currency?: string
          market_cap?: number | null
          mom_1m?: number | null
          mom_3m?: number | null
          name?: string
          price?: number | null
          price_usd?: number | null
          region?: string
          rsi14?: number | null
          score?: number | null
          sector?: string | null
          signal?: string | null
          sma20?: number | null
          sma50?: number | null
          spark?: Json | null
          symbol?: string
          updated_at?: string | null
          volatility?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      execute_paper_trade: {
        Args: {
          _price: number
          _qty: number
          _reason: string
          _side: string
          _source: string
          _symbol: string
          _user: string
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
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
