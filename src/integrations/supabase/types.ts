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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      airdrop_campaigns: {
        Row: {
          collection_id: string
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          nfts_distributed: number | null
          requires_signup: boolean | null
          start_date: string | null
          total_nfts: number
        }
        Insert: {
          collection_id: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          nfts_distributed?: number | null
          requires_signup?: boolean | null
          start_date?: string | null
          total_nfts: number
        }
        Update: {
          collection_id?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          nfts_distributed?: number | null
          requires_signup?: boolean | null
          start_date?: string | null
          total_nfts?: number
        }
        Relationships: [
          {
            foreignKeyName: "airdrop_campaigns_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "nft_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      airdrop_recipients: {
        Row: {
          campaign_id: string
          claimed_at: string | null
          created_at: string | null
          id: string
          nft_mint_address: string | null
          transaction_signature: string | null
          user_id: string | null
          wallet_address: string
        }
        Insert: {
          campaign_id: string
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          nft_mint_address?: string | null
          transaction_signature?: string | null
          user_id?: string | null
          wallet_address: string
        }
        Update: {
          campaign_id?: string
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          nft_mint_address?: string | null
          transaction_signature?: string | null
          user_id?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "airdrop_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "airdrop_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_rate_limits: {
        Row: {
          attempt_count: number
          blocked_until: string | null
          created_at: string
          id: string
          identifier: string
          last_attempt: string
        }
        Insert: {
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          id?: string
          identifier: string
          last_attempt?: string
        }
        Update: {
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          id?: string
          identifier?: string
          last_attempt?: string
        }
        Relationships: []
      }
      auth_sessions: {
        Row: {
          authentication_successful: boolean | null
          blockchain_type: string
          created_at: string | null
          expires_at: string | null
          id: string
          nft_verified: boolean | null
          session_token: string | null
          subdomain_verified: boolean | null
          user_id: string | null
          wallet_address: string
        }
        Insert: {
          authentication_successful?: boolean | null
          blockchain_type: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          nft_verified?: boolean | null
          session_token?: string | null
          subdomain_verified?: boolean | null
          user_id?: string | null
          wallet_address: string
        }
        Update: {
          authentication_successful?: boolean | null
          blockchain_type?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          nft_verified?: boolean | null
          session_token?: string | null
          subdomain_verified?: boolean | null
          user_id?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "auth_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      blockdrive_nfts: {
        Row: {
          blockchain_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          minted_at: string | null
          nft_contract_address: string | null
          nft_token_id: string
          transaction_hash: string | null
          user_id: string | null
          wallet_address: string
        }
        Insert: {
          blockchain_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          minted_at?: string | null
          nft_contract_address?: string | null
          nft_token_id: string
          transaction_hash?: string | null
          user_id?: string | null
          wallet_address: string
        }
        Update: {
          blockchain_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          minted_at?: string | null
          nft_contract_address?: string | null
          nft_token_id?: string
          transaction_hash?: string | null
          user_id?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "blockdrive_nfts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      candy_machines: {
        Row: {
          candy_machine_id: string | null
          collection_id: string
          config_lines: Json | null
          created_at: string | null
          creators: Json | null
          go_live_date: string | null
          id: string
          is_mutable: boolean | null
          items_available: number
          items_redeemed: number | null
          price_sol: number | null
          retain_authority: boolean | null
          treasury_wallet: string
          updated_at: string | null
        }
        Insert: {
          candy_machine_id?: string | null
          collection_id: string
          config_lines?: Json | null
          created_at?: string | null
          creators?: Json | null
          go_live_date?: string | null
          id?: string
          is_mutable?: boolean | null
          items_available: number
          items_redeemed?: number | null
          price_sol?: number | null
          retain_authority?: boolean | null
          treasury_wallet: string
          updated_at?: string | null
        }
        Update: {
          candy_machine_id?: string | null
          collection_id?: string
          config_lines?: Json | null
          created_at?: string | null
          creators?: Json | null
          go_live_date?: string | null
          id?: string
          is_mutable?: boolean | null
          items_available?: number
          items_redeemed?: number | null
          price_sol?: number | null
          retain_authority?: boolean | null
          treasury_wallet?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candy_machines_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "nft_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_assets: {
        Row: {
          asset_number: number
          attributes: Json | null
          collection_id: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          metadata_url: string | null
          name: string
        }
        Insert: {
          asset_number: number
          attributes?: Json | null
          collection_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          metadata_url?: string | null
          name: string
        }
        Update: {
          asset_number?: number
          attributes?: Json | null
          collection_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          metadata_url?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_assets_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "nft_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_traits: {
        Row: {
          collection_id: string
          created_at: string | null
          id: string
          trait_type: string
          trait_values: Json
        }
        Insert: {
          collection_id: string
          created_at?: string | null
          id?: string
          trait_type: string
          trait_values: Json
        }
        Update: {
          collection_id?: string
          created_at?: string | null
          id?: string
          trait_type?: string
          trait_values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "collection_traits_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "nft_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          content_type: string | null
          created_at: string
          file_path: string
          file_size: number | null
          filename: string
          folder_path: string | null
          id: string
          ipfs_cid: string | null
          ipfs_url: string | null
          is_encrypted: boolean
          metadata: Json | null
          storage_provider: string | null
          team_id: string | null
          updated_at: string
          user_id: string
          visibility: string
          wallet_id: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_path: string
          file_size?: number | null
          filename: string
          folder_path?: string | null
          id?: string
          ipfs_cid?: string | null
          ipfs_url?: string | null
          is_encrypted?: boolean
          metadata?: Json | null
          storage_provider?: string | null
          team_id?: string | null
          updated_at?: string
          user_id: string
          visibility?: string
          wallet_id?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_path?: string
          file_size?: number | null
          filename?: string
          folder_path?: string | null
          id?: string
          ipfs_cid?: string | null
          ipfs_url?: string | null
          is_encrypted?: boolean
          metadata?: Json | null
          storage_provider?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      nft_collections: {
        Row: {
          cache_file_path: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          network: Database["public"]["Enums"]["blockchain_network"] | null
          royalty_percentage: number | null
          status: Database["public"]["Enums"]["collection_status"] | null
          sugar_config_path: string | null
          symbol: string
          total_supply: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cache_file_path?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          network?: Database["public"]["Enums"]["blockchain_network"] | null
          royalty_percentage?: number | null
          status?: Database["public"]["Enums"]["collection_status"] | null
          sugar_config_path?: string | null
          symbol: string
          total_supply: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cache_file_path?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          network?: Database["public"]["Enums"]["blockchain_network"] | null
          royalty_percentage?: number | null
          status?: Database["public"]["Enums"]["collection_status"] | null
          sugar_config_path?: string | null
          symbol?: string
          total_supply?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          solana_subdomain: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          solana_subdomain?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          solana_subdomain?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          identifier: string | null
          severity: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          identifier?: string | null
          severity?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          identifier?: string | null
          severity?: string | null
        }
        Relationships: []
      }
      slack_tokens: {
        Row: {
          access_token: string
          authed_user: Json | null
          created_at: string
          id: string
          scope: string | null
          team_id: string | null
          team_name: string | null
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          authed_user?: Json | null
          created_at?: string
          id?: string
          scope?: string | null
          team_id?: string | null
          team_name?: string | null
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          authed_user?: Json | null
          created_at?: string
          id?: string
          scope?: string | null
          team_id?: string | null
          team_name?: string | null
          token_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subdomain_registrations: {
        Row: {
          blockchain_type: string
          created_at: string | null
          full_domain: string
          id: string
          is_active: boolean | null
          registered_at: string | null
          registration_transaction: string | null
          subdomain_name: string
          user_id: string | null
          wallet_address: string
        }
        Insert: {
          blockchain_type: string
          created_at?: string | null
          full_domain: string
          id?: string
          is_active?: boolean | null
          registered_at?: string | null
          registration_transaction?: string | null
          subdomain_name: string
          user_id?: string | null
          wallet_address: string
        }
        Update: {
          blockchain_type?: string
          created_at?: string | null
          full_domain?: string
          id?: string
          is_active?: boolean | null
          registered_at?: string | null
          registration_transaction?: string | null
          subdomain_name?: string
          user_id?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "subdomain_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          bandwidth_limit_gb: number | null
          can_upload_files: boolean | null
          created_at: string
          email: string
          id: string
          seats_limit: number | null
          signup_completed: boolean | null
          storage_limit_gb: number | null
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          team_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bandwidth_limit_gb?: number | null
          can_upload_files?: boolean | null
          created_at?: string
          email: string
          id?: string
          seats_limit?: number | null
          signup_completed?: boolean | null
          storage_limit_gb?: number | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bandwidth_limit_gb?: number | null
          can_upload_files?: boolean | null
          created_at?: string
          email?: string
          id?: string
          seats_limit?: number | null
          signup_completed?: boolean | null
          storage_limit_gb?: number | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          team_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          team_id: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          max_members: number
          name: string
          owner_id: string
          plan_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          max_members?: number
          name: string
          owner_id: string
          plan_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          max_members?: number
          name?: string
          owner_id?: string
          plan_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_signups: {
        Row: {
          blockchain_type: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          organization: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
          wallet_address: string | null
          wallet_connected: boolean | null
        }
        Insert: {
          blockchain_type?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          organization?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
          wallet_connected?: boolean | null
        }
        Update: {
          blockchain_type?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          organization?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
          wallet_connected?: boolean | null
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
      wallet_security_stats: {
        Row: {
          blockchain_type: string
          created_at: string | null
          encrypted_key_length: number
          has_encrypted_key: boolean
          id: string
          last_updated: string | null
          meets_encryption_standards: boolean
          recent_activity_count: number | null
          recent_security_events: number | null
          user_id: string
          wallet_address: string
          wallet_id: string
        }
        Insert: {
          blockchain_type: string
          created_at?: string | null
          encrypted_key_length: number
          has_encrypted_key: boolean
          id?: string
          last_updated?: string | null
          meets_encryption_standards: boolean
          recent_activity_count?: number | null
          recent_security_events?: number | null
          user_id: string
          wallet_address: string
          wallet_id: string
        }
        Update: {
          blockchain_type?: string
          created_at?: string | null
          encrypted_key_length?: number
          has_encrypted_key?: boolean
          id?: string
          last_updated?: string | null
          meets_encryption_standards?: boolean
          recent_activity_count?: number | null
          recent_security_events?: number | null
          user_id?: string
          wallet_address?: string
          wallet_id?: string
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
      check_auth_token_rate_limit: {
        Args: { user_email: string }
        Returns: boolean
      }
      check_subscription_rate_limit: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_token_exists_secure: {
        Args: { blockchain_type_param: string; wallet_address_param: string }
        Returns: Json
      }
      cleanup_expired_auth_tokens: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_tokens: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_security_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_signup_security_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_wallet_with_context: {
        Args: {
          blockchain_type_param: string
          private_key_encrypted_param: string
          public_key_param: string
          target_user_id: string
          wallet_address_param: string
        }
        Returns: string
      }
      detect_auth_token_threats: {
        Args: Record<PropertyKey, never>
        Returns: {
          event_count: number
          latest_incident: string
          recommendation: string
          threat_level: string
          threat_type: string
          user_identifier: string
        }[]
      }
      detect_signup_threats: {
        Args: Record<PropertyKey, never>
        Returns: {
          event_count: number
          latest_incident: string
          recommendation: string
          threat_level: string
          threat_type: string
          user_id: string
        }[]
      }
      detect_signup_threats_ultra: {
        Args: Record<PropertyKey, never>
        Returns: {
          event_count: number
          latest_incident: string
          recommendation: string
          threat_level: string
          threat_type: string
          user_id: string
        }[]
      }
      detect_suspicious_token_activity: {
        Args: Record<PropertyKey, never>
        Returns: {
          event_count: number
          identifier: string
          last_event: string
          suspicious_activity: string
        }[]
      }
      detect_wallet_tampering_attempts: {
        Args: Record<PropertyKey, never>
        Returns: {
          event_count: number
          latest_incident: string
          recommended_action: string
          risk_score: number
          severity_level: string
          threat_type: string
          user_id: string
        }[]
      }
      detect_wallet_threats: {
        Args: Record<PropertyKey, never>
        Returns: {
          event_count: number
          latest_incident: string
          recommendation: string
          threat_level: string
          threat_type: string
          user_id: string
        }[]
      }
      get_secure_wallet_info: {
        Args: { target_user_id?: string }
        Returns: {
          blockchain_type: string
          created_at: string
          has_private_key: boolean
          id: string
          key_integrity_hash: string
          public_key: string
          user_id: string
          wallet_address: string
        }[]
      }
      get_user_auth_token: {
        Args: { user_wallet_address: string }
        Returns: string
      }
      get_user_wallet_safe: {
        Args: { target_user_id: string }
        Returns: {
          blockchain_type: string
          created_at: string
          id: string
          public_key: string
          user_id: string
          wallet_address: string
        }[]
      }
      get_wallet_private_key: {
        Args: { operation_context: string; target_user_id: string }
        Returns: string
      }
      get_wallet_safe_data: {
        Args: { target_user_id: string }
        Returns: {
          blockchain_type: string
          created_at: string
          id: string
          public_key: string
          wallet_address: string
        }[]
      }
      is_team_owner: {
        Args: { team_uuid: string }
        Returns: boolean
      }
      link_legacy_subscription_to_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      link_signup_to_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      secure_private_key_access: {
        Args: {
          operation_context: string
          security_token?: string
          target_user_id: string
        }
        Returns: {
          wallet_data: Json
        }[]
      }
      secure_user_signup: {
        Args: {
          email_param: string
          full_name_param: string
          organization_param?: string
          subscription_tier_param?: string
        }
        Returns: Json
      }
      store_token_secure: {
        Args: {
          blockchain_type_param: string
          email_param: string
          full_name_param: string
          organization_param: string
          token_param: string
          wallet_address_param: string
        }
        Returns: Json
      }
      update_wallet_security_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      validate_airdrop_eligibility: {
        Args: { campaign_uuid: string; user_uuid: string }
        Returns: boolean
      }
      validate_auth_token_access: {
        Args: { token_email: string; token_user_id?: string }
        Returns: boolean
      }
      validate_auth_token_access_enhanced: {
        Args: { token_email: string; token_user_id?: string }
        Returns: boolean
      }
      validate_emergency_wallet_access: {
        Args: { operation_type: string; target_user_id: string }
        Returns: boolean
      }
      validate_private_key_access: {
        Args: { access_context?: string; wallet_user_id: string }
        Returns: boolean
      }
      validate_private_key_encryption: {
        Args: { encrypted_key: string }
        Returns: boolean
      }
      validate_profile_access: {
        Args: { profile_id: string }
        Returns: boolean
      }
      validate_restricted_service_token_operation: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validate_secure_wallet_access: {
        Args: { operation_type?: string; wallet_user_id: string }
        Returns: boolean
      }
      validate_service_operation_enhanced: {
        Args: {
          operation_type: string
          target_resource: string
          target_user_id?: string
        }
        Returns: boolean
      }
      validate_service_role_wallet_operation: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validate_service_token_operation: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validate_service_wallet_operation: {
        Args: { operation_type: string; user_id: string }
        Returns: boolean
      }
      validate_signup_access_enhanced: {
        Args: { signup_email: string; signup_user_id?: string }
        Returns: boolean
      }
      validate_signup_attempt: {
        Args: {
          email_param: string
          full_name_param: string
          organization_param?: string
        }
        Returns: boolean
      }
      validate_signup_ownership: {
        Args: { signup_email: string; signup_user_id?: string }
        Returns: boolean
      }
      validate_simple_auth_token_access: {
        Args: { token_email: string }
        Returns: boolean
      }
      validate_subscription_access: {
        Args: { subscription_email: string; subscription_user_id: string }
        Returns: boolean
      }
      validate_subscription_access_enhanced: {
        Args: { subscription_email: string; subscription_user_id: string }
        Returns: boolean
      }
      validate_subscription_access_strict: {
        Args: { subscription_email: string; subscription_user_id: string }
        Returns: boolean
      }
      validate_wallet_access: {
        Args: { wallet_user_id: string }
        Returns: boolean
      }
      validate_wallet_access_enhanced: {
        Args: { wallet_user_id: string }
        Returns: boolean
      }
      validate_wallet_access_ultra_secure: {
        Args: { request_type?: string; wallet_user_id: string }
        Returns: boolean
      }
      validate_wallet_token_access: {
        Args: { token_user_id: string }
        Returns: boolean
      }
      validate_wallet_token_access_ultra: {
        Args: { token_user_id: string; token_wallet_address: string }
        Returns: boolean
      }
      verify_auth_token_securely: {
        Args: { provided_token: string; user_email: string }
        Returns: Json
      }
    }
    Enums: {
      blockchain_network: "mainnet-beta" | "devnet" | "testnet"
      collection_status:
        | "draft"
        | "uploading"
        | "deployed"
        | "minting"
        | "completed"
        | "failed"
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
      blockchain_network: ["mainnet-beta", "devnet", "testnet"],
      collection_status: [
        "draft",
        "uploading",
        "deployed",
        "minting",
        "completed",
        "failed",
      ],
    },
  },
} as const
