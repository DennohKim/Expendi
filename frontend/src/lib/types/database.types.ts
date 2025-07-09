// Database types - run `npm run db:generate` to regenerate
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          wallet_address: string
          wallet_contract_address: string | null
          email: string | null
          username: string | null
          avatar_url: string | null
          timezone: string
          notification_preferences: Json
          onboarding_completed: boolean
          last_active_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wallet_address: string
          wallet_contract_address?: string | null
          email?: string | null
          username?: string | null
          avatar_url?: string | null
          timezone?: string
          notification_preferences?: Json
          onboarding_completed?: boolean
          last_active_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wallet_address?: string
          wallet_contract_address?: string | null
          email?: string | null
          username?: string | null
          avatar_url?: string | null
          timezone?: string
          notification_preferences?: Json
          onboarding_completed?: boolean
          last_active_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_analytics: {
        Row: {
          id: string
          user_id: string
          period_type: string
          period_start: string
          period_end: string
          total_spent: string
          total_deposited: string
          net_flow: string
          buckets_count: number
          active_buckets_count: number
          transactions_count: number
          deposits_count: number
          withdrawals_count: number
          most_used_bucket: string | null
          largest_expense_amount: string | null
          largest_expense_bucket: string | null
          spending_categories: Json
          budget_utilization: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          period_type: string
          period_start: string
          period_end: string
          total_spent?: string
          total_deposited?: string
          net_flow?: string
          buckets_count?: number
          active_buckets_count?: number
          transactions_count?: number
          deposits_count?: number
          withdrawals_count?: number
          most_used_bucket?: string | null
          largest_expense_amount?: string | null
          largest_expense_bucket?: string | null
          spending_categories?: Json
          budget_utilization?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          period_type?: string
          period_start?: string
          period_end?: string
          total_spent?: string
          total_deposited?: string
          net_flow?: string
          buckets_count?: number
          active_buckets_count?: number
          transactions_count?: number
          deposits_count?: number
          withdrawals_count?: number
          most_used_bucket?: string | null
          largest_expense_amount?: string | null
          largest_expense_bucket?: string | null
          spending_categories?: Json
          budget_utilization?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          priority: string
          title: string
          message: string
          action_url: string | null
          data: Json
          read: boolean
          sent_at: string | null
          read_at: string | null
          delivery_method: string[] | null
          delivery_status: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          priority?: string
          title: string
          message: string
          action_url?: string | null
          data?: Json
          read?: boolean
          sent_at?: string | null
          read_at?: string | null
          delivery_method?: string[] | null
          delivery_status?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          priority?: string
          title?: string
          message?: string
          action_url?: string | null
          data?: Json
          read?: boolean
          sent_at?: string | null
          read_at?: string | null
          delivery_method?: string[] | null
          delivery_status?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      bucket_insights: {
        Row: {
          id: string
          user_id: string
          bucket_name: string
          month_year: string
          budgeted_amount: string
          spent_amount: string
          remaining_amount: string | null
          utilization_percentage: number | null
          trend_vs_previous_month: number | null
          days_to_budget_exhaustion: number | null
          transaction_count: number
          avg_transaction_amount: string | null
          largest_transaction_amount: string | null
          spending_pattern: Json
          recommendations: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bucket_name: string
          month_year: string
          budgeted_amount?: string
          spent_amount?: string
          trend_vs_previous_month?: number | null
          days_to_budget_exhaustion?: number | null
          transaction_count?: number
          avg_transaction_amount?: string | null
          largest_transaction_amount?: string | null
          spending_pattern?: Json
          recommendations?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bucket_name?: string
          month_year?: string
          budgeted_amount?: string
          spent_amount?: string
          trend_vs_previous_month?: number | null
          days_to_budget_exhaustion?: number | null
          transaction_count?: number
          avg_transaction_amount?: string | null
          largest_transaction_amount?: string | null
          spending_pattern?: Json
          recommendations?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bucket_insights_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      event_logs: {
        Row: {
          id: string
          user_id: string
          event_type: string
          event_name: string
          blockchain_tx_hash: string | null
          subgraph_entity_id: string | null
          properties: Json
          metadata: Json
          session_id: string | null
          user_agent: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          event_name: string
          blockchain_tx_hash?: string | null
          subgraph_entity_id?: string | null
          properties?: Json
          metadata?: Json
          session_id?: string | null
          user_agent?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          event_name?: string
          blockchain_tx_hash?: string | null
          subgraph_entity_id?: string | null
          properties?: Json
          metadata?: Json
          session_id?: string | null
          user_agent?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh_key: string
          auth_key: string
          user_agent: string | null
          device_type: string | null
          browser: string | null
          active: boolean
          last_used_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh_key: string
          auth_key: string
          user_agent?: string | null
          device_type?: string | null
          browser?: string | null
          active?: boolean
          last_used_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh_key?: string
          auth_key?: string
          user_agent?: string | null
          device_type?: string | null
          browser?: string | null
          active?: boolean
          last_used_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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