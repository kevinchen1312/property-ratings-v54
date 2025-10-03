/**
 * Database type definitions
 * Generate with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID
 * For now, we'll use a minimal type definition
 */

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
      profiles: {
        Row: {
          id: string
          credits: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          credits?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          credits?: number
          created_at?: string
          updated_at?: string
        }
      }
      credit_ledger: {
        Row: {
          id: string
          user_id: string
          delta: number
          source: string
          stripe_session_id: string | null
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          delta: number
          source: string
          stripe_session_id?: string | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          delta?: number
          source?: string
          stripe_session_id?: string | null
          reason?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_user_credits: {
        Args: {
          p_user_id: string
          p_amount: number
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

