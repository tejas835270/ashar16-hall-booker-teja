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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_type: string
          created_at: string
          custom_data: Json | null
          custom_end_hour: number | null
          custom_start_hour: number | null
          date: string
          deposit: number
          event_type: string
          flat_number: string
          hall: string
          id: string
          member_count: number
          name: string
          payment_screenshot_url: string | null
          penalty_amount: number | null
          penalty_reason: string | null
          phone: string | null
          rent: number
          status: string
          time_slot: string
          total: number
          user_type: string
        }
        Insert: {
          booking_type?: string
          created_at?: string
          custom_data?: Json | null
          custom_end_hour?: number | null
          custom_start_hour?: number | null
          date: string
          deposit: number
          event_type: string
          flat_number: string
          hall: string
          id: string
          member_count: number
          name: string
          payment_screenshot_url?: string | null
          penalty_amount?: number | null
          penalty_reason?: string | null
          phone?: string | null
          rent: number
          status?: string
          time_slot: string
          total: number
          user_type: string
        }
        Update: {
          booking_type?: string
          created_at?: string
          custom_data?: Json | null
          custom_end_hour?: number | null
          custom_start_hour?: number | null
          date?: string
          deposit?: number
          event_type?: string
          flat_number?: string
          hall?: string
          id?: string
          member_count?: number
          name?: string
          payment_screenshot_url?: string | null
          penalty_amount?: number | null
          penalty_reason?: string | null
          phone?: string | null
          rent?: number
          status?: string
          time_slot?: string
          total?: number
          user_type?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          cheque_payee_name: string | null
          custom_fields: Json | null
          deposit: number
          hall_close_time: number
          hall_open_time: number
          halls: Json
          id: number
          max_custom_hours: number
          payment_mode: string
          payment_qr_url: string | null
          penalty_notice: string | null
          pricing: Json
          rules: Json
          rules_pdf_name: string | null
          rules_pdf_url: string | null
          society_name: string | null
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          cheque_payee_name?: string | null
          custom_fields?: Json | null
          deposit?: number
          hall_close_time?: number
          hall_open_time?: number
          halls?: Json
          id?: number
          max_custom_hours?: number
          payment_mode?: string
          payment_qr_url?: string | null
          penalty_notice?: string | null
          pricing?: Json
          rules?: Json
          rules_pdf_name?: string | null
          rules_pdf_url?: string | null
          society_name?: string | null
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          cheque_payee_name?: string | null
          custom_fields?: Json | null
          deposit?: number
          hall_close_time?: number
          hall_open_time?: number
          halls?: Json
          id?: number
          max_custom_hours?: number
          payment_mode?: string
          payment_qr_url?: string | null
          penalty_notice?: string | null
          pricing?: Json
          rules?: Json
          rules_pdf_name?: string | null
          rules_pdf_url?: string | null
          society_name?: string | null
          updated_at?: string
          upi_id?: string | null
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
    Enums: {},
  },
} as const
