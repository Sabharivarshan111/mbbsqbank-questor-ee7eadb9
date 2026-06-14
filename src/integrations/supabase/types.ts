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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_activity: {
        Row: {
          date: string
          opens: number
          questions_done: number
          user_id: string
          year: Database["public"]["Enums"]["app_year"] | null
        }
        Insert: {
          date?: string
          opens?: number
          questions_done?: number
          user_id: string
          year?: Database["public"]["Enums"]["app_year"] | null
        }
        Update: {
          date?: string
          opens?: number
          questions_done?: number
          user_id?: string
          year?: Database["public"]["Enums"]["app_year"] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          device_id: string | null
          display_name: string
          id: string
          last_active_date: string | null
          streak: number
          updated_at: string
          xp: number
          year: Database["public"]["Enums"]["app_year"]
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          display_name: string
          id: string
          last_active_date?: string | null
          streak?: number
          updated_at?: string
          xp?: number
          year: Database["public"]["Enums"]["app_year"]
        }
        Update: {
          created_at?: string
          device_id?: string | null
          display_name?: string
          id?: string
          last_active_date?: string | null
          streak?: number
          updated_at?: string
          xp?: number
          year?: Database["public"]["Enums"]["app_year"]
        }
        Relationships: []
      }
      question_progress: {
        Row: {
          completed_at: string
          question_id: string
          user_id: string
          year: Database["public"]["Enums"]["app_year"] | null
        }
        Insert: {
          completed_at?: string
          question_id: string
          user_id: string
          year?: Database["public"]["Enums"]["app_year"] | null
        }
        Update: {
          completed_at?: string
          question_id?: string
          user_id?: string
          year?: Database["public"]["Enums"]["app_year"] | null
        }
        Relationships: []
      }
      screen_time: {
        Row: {
          seconds: number
          updated_at: string
          user_id: string
          week_start: string
          weekly_seconds: number
          year: Database["public"]["Enums"]["app_year"]
        }
        Insert: {
          seconds?: number
          updated_at?: string
          user_id: string
          week_start?: string
          weekly_seconds?: number
          year: Database["public"]["Enums"]["app_year"]
        }
        Update: {
          seconds?: number
          updated_at?: string
          user_id?: string
          week_start?: string
          weekly_seconds?: number
          year?: Database["public"]["Enums"]["app_year"]
        }
        Relationships: []
      }
      study_presence: {
        Row: {
          device_id: string
          last_seen: string
        }
        Insert: {
          device_id: string
          last_seen?: string
        }
        Update: {
          device_id?: string
          last_seen?: string
        }
        Relationships: []
      }
      weekly_xp: {
        Row: {
          updated_at: string
          user_id: string
          week_start: string
          xp: number
          year: Database["public"]["Enums"]["app_year"]
        }
        Insert: {
          updated_at?: string
          user_id: string
          week_start: string
          xp?: number
          year: Database["public"]["Enums"]["app_year"]
        }
        Update: {
          updated_at?: string
          user_id?: string
          week_start?: string
          xp?: number
          year?: Database["public"]["Enums"]["app_year"]
        }
        Relationships: []
      }
    }
    Views: {
      weekly_leaders: {
        Row: {
          display_name: string | null
          id: string | null
          streak: number | null
          week_done: number | null
          week_opens: number | null
          xp: number | null
          year: Database["public"]["Enums"]["app_year"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_or_merge_profile: {
        Args: {
          _device_id: string
          _display_name: string
          _year: Database["public"]["Enums"]["app_year"]
        }
        Returns: {
          created_at: string
          device_id: string | null
          display_name: string
          id: string
          last_active_date: string | null
          streak: number
          updated_at: string
          xp: number
          year: Database["public"]["Enums"]["app_year"]
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_weekly_leaderboard: {
        Args: { _limit?: number; _year?: string }
        Returns: {
          display_name: string
          id: string
          streak: number
          weekly_seconds: number
          weekly_xp: number
          xp: number
          year: string
          year_seconds: number
          year_xp: number
        }[]
      }
      get_year_leaderboard: {
        Args: { _limit?: number; _year: string }
        Returns: {
          display_name: string
          id: string
          streak: number
          xp: number
          year: string
          year_seconds: number
          year_xp: number
        }[]
      }
      get_year_lifetime_xp: {
        Args: { _user_id: string; _year: string }
        Returns: number
      }
      reconcile_question_progress: {
        Args: { _question_ids: string[] }
        Returns: undefined
      }
      record_question_done: {
        Args: { _question_id: string }
        Returns: undefined
      }
      record_question_undone: {
        Args: { _question_id: string }
        Returns: undefined
      }
      record_questions_done: {
        Args: { _question_ids: string[] }
        Returns: number
      }
      record_screen_time: { Args: { _seconds: number }; Returns: undefined }
      register_open: {
        Args: never
        Returns: {
          last_active_date: string
          streak: number
        }[]
      }
    }
    Enums: {
      app_year: "first" | "second" | "third" | "final"
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
      app_year: ["first", "second", "third", "final"],
    },
  },
} as const
