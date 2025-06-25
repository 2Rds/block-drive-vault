export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      auth_tokens: {
        Row: {
          blockchain_type: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          is_used: boolean
          organization: string | null
          token: string
          wallet_address: string | null
        }
        Insert: {
          blockchain_type?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name: string
          id?: string
          is_used?: boolean
          organization?: string | null
          token: string
          wallet_address?: string | null
        }
        Update: {
          blockchain_type?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          is_used?: boolean
          organization?: string | null
          token?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      blockchain_tokens: {
        Row: {
          blockchain_type: string
          created_at: string
          id: string
          is_active: boolean
          token_id: string
          token_metadata: Json | null
          wallet_id: string
        }
        Insert: {
          blockchain_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          token_id: string
          token_metadata?: Json | null
          wallet_id: string
        }
        Update: {
          blockchain_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          token_id?: string
          token_metadata?: Json | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blockchain_tokens_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      "BlockDrive-Slack": {
        Row: {
          created: string
          created_at: string
          id: string
          mimetype: string | null
          name: string
          size: number | null
          title: string | null
          updated_at: string
          url_private: string
          user_id: string
        }
        Insert: {
          created: string
          created_at?: string
          id: string
          mimetype?: string | null
          name: string
          size?: number | null
          title?: string | null
          updated_at?: string
          url_private: string
          user_id: string
        }
        Update: {
          created?: string
          created_at?: string
          id?: string
          mimetype?: string | null
          name?: string
          size?: number | null
          title?: string | null
          updated_at?: string
          url_private?: string
          user_id?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          content_type: string | null
          created_at: string
          file_path: string
          file_size: number | null
          filename: string
          id: string
          is_encrypted: boolean
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_path: string
          file_size?: number | null
          filename: string
          id?: string
          is_encrypted?: boolean
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_path?: string
          file_size?: number | null
          filename?: string
          id?: string
          is_encrypted?: boolean
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      wallet_auth_tokens: {
        Row: {
          auth_token: string
          blockchain_type: string
          created_at: string
          first_login_at: string
          id: string
          is_active: boolean
          last_login_at: string
          user_id: string | null
          wallet_address: string
        }
        Insert: {
          auth_token: string
          blockchain_type?: string
          created_at?: string
          first_login_at?: string
          id?: string
          is_active?: boolean
          last_login_at?: string
          user_id?: string | null
          wallet_address: string
        }
        Update: {
          auth_token?: string
          blockchain_type?: string
          created_at?: string
          first_login_at?: string
          id?: string
          is_active?: boolean
          last_login_at?: string
          user_id?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          blockchain_type: string
          created_at: string
          id: string
          private_key_encrypted: string
          public_key: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          blockchain_type?: string
          created_at?: string
          id?: string
          private_key_encrypted: string
          public_key: string
          user_id: string
          wallet_address: string
        }
        Update: {
          blockchain_type?: string
          created_at?: string
          id?: string
          private_key_encrypted?: string
          public_key?: string
          user_id?: string
          wallet_address?: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
