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
      challenge_runs: {
        Row: {
          choices: Json
          completed_at: string
          id: string
          result: Json
          scenario_id: string
          score: number
          user_id: string
        }
        Insert: {
          choices: Json
          completed_at?: string
          id?: string
          result: Json
          scenario_id: string
          score: number
          user_id: string
        }
        Update: {
          choices?: Json
          completed_at?: string
          id?: string
          result?: Json
          scenario_id?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      cron_tokens: {
        Row: {
          name: string
          token: string
        }
        Insert: {
          name: string
          token: string
        }
        Update: {
          name?: string
          token?: string
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          enabled: boolean
          id: number
          max_sequences_per_day: number
          min_score: number
          stage_gap_minutes: number
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id?: number
          max_sequences_per_day?: number
          min_score?: number
          stage_gap_minutes?: number
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: number
          max_sequences_per_day?: number
          min_score?: number
          stage_gap_minutes?: number
          updated_at?: string
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
      league_members: {
        Row: {
          display_name: string
          joined_at: string
          league_id: string
          user_id: string
        }
        Insert: {
          display_name: string
          joined_at?: string
          league_id: string
          user_id: string
        }
        Update: {
          display_name?: string
          joined_at?: string
          league_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          action: string
          code: string
          created_at: string
          id: string
          log: Json
          next_at: string | null
          price_at_detect: number
          score_at_detect: number
          stage: number
          status: string
          symbol: string
        }
        Insert: {
          action: string
          code: string
          created_at?: string
          id?: string
          log?: Json
          next_at?: string | null
          price_at_detect: number
          score_at_detect: number
          stage?: number
          status?: string
          symbol: string
        }
        Update: {
          action?: string
          code?: string
          created_at?: string
          id?: string
          log?: Json
          next_at?: string | null
          price_at_detect?: number
          score_at_detect?: number
          stage?: number
          status?: string
          symbol?: string
        }
        Relationships: []
      }
      order_keys: {
        Row: {
          created_at: string
          key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          key: string
          user_id: string
        }
        Update: {
          created_at?: string
          key?: string
          user_id?: string
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
      player_achievements: {
        Row: {
          code: string
          earned_at: string
          user_id: string
          xp: number
        }
        Insert: {
          code: string
          earned_at?: string
          user_id: string
          xp: number
        }
        Update: {
          code?: string
          earned_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      player_missions: {
        Row: {
          code: string
          completed_at: string
          user_id: string
          xp: number
        }
        Insert: {
          code: string
          completed_at?: string
          user_id: string
          xp: number
        }
        Update: {
          code?: string
          completed_at?: string
          user_id?: string
          xp?: number
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
      push_sent: {
        Row: {
          key: string
          sent_at: string
          user_id: string
        }
        Insert: {
          key: string
          sent_at?: string
          user_id: string
        }
        Update: {
          key?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_hits: {
        Row: {
          action: string
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          user_id?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          detail: Json
          id: string
          kind: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: string
          kind: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: string
          kind?: string
          user_id?: string | null
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
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      last_scan_time: { Args: never; Returns: string }
      purge_old_data: { Args: never; Returns: undefined }
      security_table_report: {
        Args: never
        Returns: {
          anon_select: boolean
          policy_count: number
          rls_enabled: boolean
          table_name: string
        }[]
      }
      take_rate_slot: {
        Args: {
          _action: string
          _max: number
          _user: string
          _window_sec: number
        }
        Returns: boolean
      }
      verify_cron_token: { Args: { _token: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "user"
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
    Enums: {
      app_role: ["owner", "user"],
    },
  },
} as const
