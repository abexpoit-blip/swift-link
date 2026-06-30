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
      ab_variants: {
        Row: {
          clicks_count: number
          conversions_count: number
          created_at: string
          id: string
          is_active: boolean
          link_id: string
          offer_url: string
          updated_at: string
          variant_label: string
          weight_pct: number
        }
        Insert: {
          clicks_count?: number
          conversions_count?: number
          created_at?: string
          id?: string
          is_active?: boolean
          link_id: string
          offer_url: string
          updated_at?: string
          variant_label: string
          weight_pct?: number
        }
        Update: {
          clicks_count?: number
          conversions_count?: number
          created_at?: string
          id?: string
          is_active?: boolean
          link_id?: string
          offer_url?: string
          updated_at?: string
          variant_label?: string
          weight_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "ab_variants_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          daily_redirect_enabled: boolean
          fallback_url: string
          id: boolean
          injection_count: number
          injection_threshold: number
          our_adsterra_url: string
          updated_at: string
        }
        Insert: {
          daily_redirect_enabled?: boolean
          fallback_url?: string
          id?: boolean
          injection_count?: number
          injection_threshold?: number
          our_adsterra_url?: string
          updated_at?: string
        }
        Update: {
          daily_redirect_enabled?: boolean
          fallback_url?: string
          id?: boolean
          injection_count?: number
          injection_threshold?: number
          our_adsterra_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      bot_fingerprints: {
        Row: {
          auto_blocked: boolean
          bot_hits: number
          fingerprint_hash: string
          first_seen: string
          hit_count: number
          last_seen: string
          sample_country: string | null
          sample_ip: string | null
          sample_ua: string | null
        }
        Insert: {
          auto_blocked?: boolean
          bot_hits?: number
          fingerprint_hash: string
          first_seen?: string
          hit_count?: number
          last_seen?: string
          sample_country?: string | null
          sample_ip?: string | null
          sample_ua?: string | null
        }
        Update: {
          auto_blocked?: boolean
          bot_hits?: number
          fingerprint_hash?: string
          first_seen?: string
          hit_count?: number
          last_seen?: string
          sample_country?: string | null
          sample_ip?: string | null
          sample_ua?: string | null
        }
        Relationships: []
      }
      bot_rules: {
        Row: {
          action: string
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          pattern: string
          rule_type: string
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          pattern: string
          rule_type: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          pattern?: string
          rule_type?: string
        }
        Relationships: []
      }
      clicks: {
        Row: {
          ab_variant: string | null
          bot_reason: string | null
          bot_score: number | null
          challenge_passed: boolean
          country: string | null
          country_tier: number | null
          created_at: string
          fingerprint_hash: string | null
          id: string
          ip: string | null
          is_bot: boolean
          ja3_hash: string | null
          link_id: string
          prelanding_shown: boolean
          referer_host: string | null
          referrer_source: string | null
          routed_to: string
          signals: Json | null
          ua: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          ab_variant?: string | null
          bot_reason?: string | null
          bot_score?: number | null
          challenge_passed?: boolean
          country?: string | null
          country_tier?: number | null
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip?: string | null
          is_bot?: boolean
          ja3_hash?: string | null
          link_id: string
          prelanding_shown?: boolean
          referer_host?: string | null
          referrer_source?: string | null
          routed_to?: string
          signals?: Json | null
          ua?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          ab_variant?: string | null
          bot_reason?: string | null
          bot_score?: number | null
          challenge_passed?: boolean
          country?: string | null
          country_tier?: number | null
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip?: string | null
          is_bot?: boolean
          ja3_hash?: string | null
          link_id?: string
          prelanding_shown?: boolean
          referer_host?: string | null
          referrer_source?: string | null
          routed_to?: string
          signals?: Json | null
          ua?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      cloaking_rules: {
        Row: {
          action: string
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          pattern: string
          priority: number
          rule_type: string
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          pattern: string
          priority?: number
          rule_type: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          pattern?: string
          priority?: number
          rule_type?: string
        }
        Relationships: []
      }
      cloaking_settings: {
        Row: {
          allowed_countries: string[]
          block_desktop: boolean
          campaign_launch_mode: boolean
          coherence_threshold: number
          created_at: string
          fbclid_max_hits: number
          launch_window_hours: number
          launched_at: string | null
          link_id: string
          safe_page_pool: string[]
          updated_at: string
        }
        Insert: {
          allowed_countries?: string[]
          block_desktop?: boolean
          campaign_launch_mode?: boolean
          coherence_threshold?: number
          created_at?: string
          fbclid_max_hits?: number
          launch_window_hours?: number
          launched_at?: string | null
          link_id: string
          safe_page_pool?: string[]
          updated_at?: string
        }
        Update: {
          allowed_countries?: string[]
          block_desktop?: boolean
          campaign_launch_mode?: boolean
          coherence_threshold?: number
          created_at?: string
          fbclid_max_hits?: number
          launch_window_hours?: number
          launched_at?: string | null
          link_id?: string
          safe_page_pool?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloaking_settings_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: true
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      country_tiers: {
        Row: {
          country_code: string
          country_name: string | null
          tier: number
          updated_at: string
        }
        Insert: {
          country_code: string
          country_name?: string | null
          tier: number
          updated_at?: string
        }
        Update: {
          country_code?: string
          country_name?: string | null
          tier?: number
          updated_at?: string
        }
        Relationships: []
      }
      custom_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          updated_at: string
          user_id: string
          verification_token: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          updated_at?: string
          user_id: string
          verification_token?: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          updated_at?: string
          user_id?: string
          verification_token?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: []
      }
      earnings_ledger: {
        Row: {
          adsterra_clicks: number
          created_at: string
          day: string
          earnings_usd: number
          id: string
          link_id: string | null
          total_clicks: number
          updated_at: string
          user_clicks: number
          user_id: string
        }
        Insert: {
          adsterra_clicks?: number
          created_at?: string
          day?: string
          earnings_usd?: number
          id?: string
          link_id?: string | null
          total_clicks?: number
          updated_at?: string
          user_clicks?: number
          user_id: string
        }
        Update: {
          adsterra_clicks?: number
          created_at?: string
          day?: string
          earnings_usd?: number
          id?: string
          link_id?: string | null
          total_clicks?: number
          updated_at?: string
          user_clicks?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earnings_ledger_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      fbclid_tracking: {
        Row: {
          fbclid: string
          first_seen: string
          flagged_bot: boolean
          hit_count: number
          human_confirmed: boolean
          id: string
          last_seen: string
          link_id: string
        }
        Insert: {
          fbclid: string
          first_seen?: string
          flagged_bot?: boolean
          hit_count?: number
          human_confirmed?: boolean
          id?: string
          last_seen?: string
          link_id: string
        }
        Update: {
          fbclid?: string
          first_seen?: string
          flagged_bot?: boolean
          hit_count?: number
          human_confirmed?: boolean
          id?: string
          last_seen?: string
          link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fbclid_tracking_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_offers: {
        Row: {
          country_codes: string[] | null
          created_at: string
          id: string
          is_active: boolean
          link_id: string
          offer_url: string
          tier: number | null
          updated_at: string
          weight: number
        }
        Insert: {
          country_codes?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          link_id: string
          offer_url: string
          tier?: number | null
          updated_at?: string
          weight?: number
        }
        Update: {
          country_codes?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          link_id?: string
          offer_url?: string
          tier?: number | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "geo_offers_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_blacklist: {
        Row: {
          auto_added: boolean
          created_at: string
          fingerprint_hash: string | null
          id: string
          ip: string | null
          reason: string | null
          user_id: string | null
        }
        Insert: {
          auto_added?: boolean
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip?: string | null
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          auto_added?: boolean
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip?: string | null
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ip_whitelist: {
        Row: {
          created_at: string
          fingerprint_hash: string | null
          id: string
          ip: string | null
          note: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip?: string | null
          note?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip?: string | null
          note?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      links: {
        Row: {
          adsterra_url: string
          bot_clicks_count: number
          clicks_count: number
          created_at: string
          id: string
          is_active: boolean
          prelanding_template: string
          safe_url: string
          short_code: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          adsterra_url: string
          bot_clicks_count?: number
          clicks_count?: number
          created_at?: string
          id?: string
          is_active?: boolean
          prelanding_template?: string
          safe_url?: string
          short_code: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          adsterra_url?: string
          bot_clicks_count?: number
          clicks_count?: number
          created_at?: string
          id?: string
          is_active?: boolean
          prelanding_template?: string
          safe_url?: string
          short_code?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_broadcast: boolean
          recipient_id: string | null
          sender_id: string | null
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_broadcast?: boolean
          recipient_id?: string | null
          sender_id?: string | null
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_broadcast?: boolean
          recipient_id?: string | null
          sender_id?: string | null
          subject?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          click_quota: number | null
          created_at: string
          id: string
          is_active: boolean
          link_limit: number | null
          name: string
          price_usd: number
          slug: string
          sort_order: number
        }
        Insert: {
          click_quota?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          link_limit?: number | null
          name: string
          price_usd?: number
          slug: string
          sort_order?: number
        }
        Update: {
          click_quota?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          link_limit?: number | null
          name?: string
          price_usd?: number
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance_available: number
          balance_withdrawn: number
          click_quota: number | null
          clicks_period_start: string
          clicks_used: number
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_banned: boolean
          last_daily_redirect_at: string | null
          link_limit: number | null
          links_used: number
          plan_slug: string
          telegram: string | null
          updated_at: string
        }
        Insert: {
          balance_available?: number
          balance_withdrawn?: number
          click_quota?: number | null
          clicks_period_start?: string
          clicks_used?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_banned?: boolean
          last_daily_redirect_at?: string | null
          link_limit?: number | null
          links_used?: number
          plan_slug?: string
          telegram?: string | null
          updated_at?: string
        }
        Update: {
          balance_available?: number
          balance_withdrawn?: number
          click_quota?: number | null
          clicks_period_start?: string
          clicks_used?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_banned?: boolean
          last_daily_redirect_at?: string | null
          link_limit?: number | null
          links_used?: number
          plan_slug?: string
          telegram?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_slug_fkey"
            columns: ["plan_slug"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["slug"]
          },
        ]
      }
      referrer_rules: {
        Row: {
          action: string
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          pattern: string
          trust_score: number
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          pattern: string
          trust_score?: number
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          pattern?: string
          trust_score?: number
        }
        Relationships: []
      }
      safe_page_snippets: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      shortener_domains: {
        Row: {
          created_at: string
          dns_target: string
          domain: string
          id: string
          is_active: boolean
          is_primary: boolean
          note: string | null
          updated_at: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          dns_target?: string
          domain: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          note?: string | null
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          dns_target?: string
          domain?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          note?: string | null
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: []
      }
      traffic_logs: {
        Row: {
          asn: string | null
          bot_score: number | null
          coherence_score: number | null
          country: string | null
          created_at: string
          decision: string
          fbclid: string | null
          fingerprint_hash: string | null
          id: string
          ip: string | null
          is_mobile: boolean | null
          link_id: string | null
          reasons: string[]
          referer: string | null
          ua: string | null
          user_id: string | null
        }
        Insert: {
          asn?: string | null
          bot_score?: number | null
          coherence_score?: number | null
          country?: string | null
          created_at?: string
          decision: string
          fbclid?: string | null
          fingerprint_hash?: string | null
          id?: string
          ip?: string | null
          is_mobile?: boolean | null
          link_id?: string | null
          reasons?: string[]
          referer?: string | null
          ua?: string | null
          user_id?: string | null
        }
        Update: {
          asn?: string | null
          bot_score?: number | null
          coherence_score?: number | null
          country?: string | null
          created_at?: string
          decision?: string
          fbclid?: string | null
          fingerprint_hash?: string | null
          id?: string
          ip?: string | null
          is_mobile?: boolean | null
          link_id?: string | null
          reasons?: string[]
          referer?: string | null
          ua?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "traffic_logs_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      upgrade_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          package_slug: string
          plisio_invoice_id: string | null
          plisio_invoice_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          package_slug: string
          plisio_invoice_id?: string | null
          plisio_invoice_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          package_slug?: string
          plisio_invoice_id?: string | null
          plisio_invoice_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upgrade_requests_package_slug_fkey"
            columns: ["package_slug"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["slug"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          address: string
          created_at: string
          id: string
          label: string | null
          network: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          label?: string | null
          network: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          label?: string | null
          network?: string
          user_id?: string
        }
        Relationships: []
      }
      velocity_tracking: {
        Row: {
          blocked: boolean
          fingerprint_hash: string
          last_seen: string
          short_codes: string[]
          window_start: string
        }
        Insert: {
          blocked?: boolean
          fingerprint_hash: string
          last_seen?: string
          short_codes?: string[]
          window_start?: string
        }
        Update: {
          blocked?: boolean
          fingerprint_hash?: string
          last_seen?: string
          short_codes?: string[]
          window_start?: string
        }
        Relationships: []
      }
      withdrawal_audit: {
        Row: {
          action: string
          admin_email: string | null
          admin_id: string | null
          comment: string | null
          created_at: string
          id: string
          new_status: string
          previous_status: string | null
          withdrawal_id: string
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          new_status: string
          previous_status?: string | null
          withdrawal_id: string
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          new_status?: string
          previous_status?: string | null
          withdrawal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_audit_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawals"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          admin_comment: string | null
          admin_note: string | null
          amount_usd: number
          created_at: string
          id: string
          network: string
          processed_at: string | null
          processed_by: string | null
          status: string
          tx_hash: string | null
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          admin_comment?: string | null
          admin_note?: string | null
          amount_usd: number
          created_at?: string
          id?: string
          network: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          admin_comment?: string | null
          admin_note?: string | null
          amount_usd?: number
          created_at?: string
          id?: string
          network?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      cohort_stats: {
        Row: {
          bot_clicks: number | null
          bot_pct: number | null
          countries: number | null
          first_click: string | null
          human_clicks: number | null
          last_click: string | null
          source: string | null
          total_clicks: number | null
          unique_fps: number | null
        }
        Relationships: []
      }
      country_stats_24h: {
        Row: {
          bots: number | null
          clicks: number | null
          country: string | null
          humans: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      confirm_human_fbclid: {
        Args: { _fbclid: string; _link_id: string }
        Returns: undefined
      }
      evaluate_redirect: {
        Args: {
          _asn: string
          _coherence_score: number
          _country: string
          _fbclid: string
          _fingerprint: string
          _ip: string
          _is_datacenter: boolean
          _is_hard_bot: boolean
          _is_mobile: boolean
          _link_id: string
          _referer: string
          _short_code: string
          _ua: string
          _user_id: string
        }
        Returns: Json
      }
      handle_redirect_click: {
        Args: {
          _is_bot: boolean
          _link_id: string
          _routed_to: string
          _ua: string
          _user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_messages_read: { Args: { _ids: string[] }; Returns: number }
      record_bot_fingerprint: {
        Args: {
          _block_threshold?: number
          _country: string
          _hash: string
          _ip: string
          _is_bot: boolean
          _ua: string
        }
        Returns: boolean
      }
      record_earning_click: {
        Args: { _link_id: string; _user_id: string }
        Returns: undefined
      }
      record_redirect_click: {
        Args: {
          _bot_reason: string
          _bot_score: number
          _challenge_passed: boolean
          _country: string
          _ip: string
          _is_bot: boolean
          _link_id: string
          _referer_host: string
          _routed_to: string
          _signals: Json
          _ua: string
          _user_id: string
          _utm_campaign: string
          _utm_content: string
          _utm_medium: string
          _utm_source: string
          _utm_term: string
        }
        Returns: undefined
      }
      unread_message_count: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      app_role: "user" | "admin"
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
      app_role: ["user", "admin"],
    },
  },
} as const
