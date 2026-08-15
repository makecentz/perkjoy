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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      approval_policies: {
        Row: {
          active: boolean
          approval_level: string
          created_at: string
          id: string
          maximum_amount: number | null
          minimum_amount: number
          name: string
          organization_id: string
          reward_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          approval_level: string
          created_at?: string
          id?: string
          maximum_amount?: number | null
          minimum_amount?: number
          name: string
          organization_id: string
          reward_type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          approval_level?: string
          created_at?: string
          id?: string
          maximum_amount?: number | null
          minimum_amount?: number
          name?: string
          organization_id?: string
          reward_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          amount: number
          approval_level: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          entity_id: string
          entity_type: string
          id: string
          organization_id: string
          requested_by: string | null
          status: string
        }
        Insert: {
          amount?: number
          approval_level: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          organization_id: string
          requested_by?: string | null
          status?: string
        }
        Update: {
          amount?: number
          approval_level?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          active: boolean
          anniversary_years: number[] | null
          applicable_department_id: string | null
          approval_required: boolean
          created_at: string
          event_type: string
          id: string
          message_template: string | null
          minimum_tenure: number | null
          name: string
          organization_id: string
          reward_amount: number
          reward_type: string
          send_offset_days: number
          updated_at: string
          vendor_product_id: string | null
        }
        Insert: {
          active?: boolean
          anniversary_years?: number[] | null
          applicable_department_id?: string | null
          approval_required?: boolean
          created_at?: string
          event_type: string
          id?: string
          message_template?: string | null
          minimum_tenure?: number | null
          name: string
          organization_id: string
          reward_amount?: number
          reward_type: string
          send_offset_days?: number
          updated_at?: string
          vendor_product_id?: string | null
        }
        Update: {
          active?: boolean
          anniversary_years?: number[] | null
          applicable_department_id?: string | null
          approval_required?: boolean
          created_at?: string
          event_type?: string
          id?: string
          message_template?: string | null
          minimum_tenure?: number | null
          name?: string
          organization_id?: string
          reward_amount?: number
          reward_type?: string
          send_offset_days?: number
          updated_at?: string
          vendor_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_applicable_department_id_fkey"
            columns: ["applicable_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_vendor_product_fk"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          approval_count: number
          created_at: string
          duplicate_count: number
          id: string
          moments_evaluated: number
          organization_id: string
          rules_evaluated: number
          run_key: string
          scheduled_count: number
          status: string
        }
        Insert: {
          approval_count?: number
          created_at?: string
          duplicate_count?: number
          id?: string
          moments_evaluated?: number
          organization_id: string
          rules_evaluated?: number
          run_key: string
          scheduled_count?: number
          status?: string
        }
        Update: {
          approval_count?: number
          created_at?: string
          duplicate_count?: number
          id?: string
          moments_evaluated?: number
          organization_id?: string
          rules_evaluated?: number
          run_key?: string
          scheduled_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_items: {
        Row: {
          bundle_id: string
          created_at: string
          id: string
          item_name: string
          product_id: string | null
          quantity: number
        }
        Insert: {
          bundle_id: string
          created_at?: string
          id?: string
          item_name: string
          product_id?: string | null
          quantity?: number
        }
        Update: {
          bundle_id?: string
          created_at?: string
          id?: string
          item_name?: string
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          active: boolean
          category: string
          created_at: string
          customer_price: number
          description: string | null
          id: string
          manually_fulfilled_by_perkjoy: boolean
          market_id: string
          name: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          customer_price: number
          description?: string | null
          id?: string
          manually_fulfilled_by_perkjoy?: boolean
          market_id: string
          name: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          customer_price?: number
          description?: string | null
          id?: string
          manually_fulfilled_by_perkjoy?: boolean
          market_id?: string
          name?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bundles_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundles_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      celebration_preferences: {
        Row: {
          created_at: string
          dietary_preferences: string[]
          employee_id: string
          food: Json
          id: string
          interests: string[]
          organization_id: string
          rewards: Json
          share_with_hr: boolean
          shirt_size: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dietary_preferences?: string[]
          employee_id: string
          food?: Json
          id?: string
          interests?: string[]
          organization_id: string
          rewards?: Json
          share_with_hr?: boolean
          shirt_size?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dietary_preferences?: string[]
          employee_id?: string
          food?: Json
          id?: string
          interests?: string[]
          organization_id?: string
          rewards?: Json
          share_with_hr?: boolean
          shirt_size?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "celebration_preferences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebration_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      celebration_profile_invitations: {
        Row: {
          created_at: string
          employee_id: string
          expires_at: string
          id: string
          organization_id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          expires_at: string
          id?: string
          organization_id: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          expires_at?: string
          id?: string
          organization_id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "celebration_profile_invitations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebration_profile_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      celebration_profiles: {
        Row: {
          completeness: number
          created_at: string
          employee_id: string
          id: string
          organization_id: string
          preferred_delivery: string
          privacy_mode: string
          updated_at: string
        }
        Insert: {
          completeness?: number
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          preferred_delivery?: string
          privacy_mode?: string
          updated_at?: string
        }
        Update: {
          completeness?: number
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
          preferred_delivery?: string
          privacy_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "celebration_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebration_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      celebration_types: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          manual_only: boolean
          name: string
          organization_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          id?: string
          manual_only?: boolean
          name: string
          organization_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          manual_only?: boolean
          name?: string
          organization_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "celebration_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_requests: {
        Row: {
          budget: number
          created_at: string
          delivery_date: string
          employee_event_id: string | null
          employee_id: string
          id: string
          occasion: string
          organization_id: string
          recommendation: Json | null
          service_fee: number
          status: string
          updated_at: string
        }
        Insert: {
          budget: number
          created_at?: string
          delivery_date: string
          employee_event_id?: string | null
          employee_id: string
          id?: string
          occasion: string
          organization_id: string
          recommendation?: Json | null
          service_fee?: number
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number
          created_at?: string
          delivery_date?: string
          employee_event_id?: string | null
          employee_id?: string
          id?: string
          occasion?: string
          organization_id?: string
          recommendation?: Json | null
          service_fee?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_requests_employee_event_id_fkey"
            columns: ["employee_event_id"]
            isOneToOne: false
            referencedRelation: "employee_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_events: {
        Row: {
          category: string
          celebration_type_id: string | null
          created_at: string
          employee_id: string
          event_date: string
          handled_steps: Json
          id: string
          metadata: Json
          organization_id: string
          reward_summary: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          celebration_type_id?: string | null
          created_at?: string
          employee_id: string
          event_date: string
          handled_steps?: Json
          id?: string
          metadata?: Json
          organization_id: string
          reward_summary?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          celebration_type_id?: string | null
          created_at?: string
          employee_id?: string
          event_date?: string
          handled_steps?: Json
          id?: string
          metadata?: Json
          organization_id?: string
          reward_summary?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_events_celebration_type_id_fkey"
            columns: ["celebration_type_id"]
            isOneToOne: false
            referencedRelation: "celebration_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          avatar_path: string | null
          birthday_day: number | null
          birthday_month: number | null
          city: string | null
          created_at: string
          department_id: string | null
          delivery_address_line_1: string | null
          delivery_address_line_2: string | null
          delivery_city: string | null
          delivery_postal_code: string | null
          delivery_same_as_work: boolean
          delivery_state: string | null
          email: string
          employee_number: string | null
          first_name: string
          hire_date: string | null
          id: string
          job_title: string | null
          last_name: string
          manager_employee_id: string | null
          organization_id: string
          organization_location_id: string | null
          phone: string | null
          postal_code: string | null
          preferred_celebration_delivery: string
          recognition_preferences: Json
          state: string | null
          status: string
          updated_at: string
          work_location: string | null
          work_mode: string
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          avatar_path?: string | null
          birthday_day?: number | null
          birthday_month?: number | null
          city?: string | null
          created_at?: string
          department_id?: string | null
          delivery_address_line_1?: string | null
          delivery_address_line_2?: string | null
          delivery_city?: string | null
          delivery_postal_code?: string | null
          delivery_same_as_work?: boolean
          delivery_state?: string | null
          email: string
          employee_number?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          job_title?: string | null
          last_name: string
          manager_employee_id?: string | null
          organization_id: string
          organization_location_id?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_celebration_delivery?: string
          recognition_preferences?: Json
          state?: string | null
          status?: string
          updated_at?: string
          work_location?: string | null
          work_mode?: string
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          avatar_path?: string | null
          birthday_day?: number | null
          birthday_month?: number | null
          city?: string | null
          created_at?: string
          department_id?: string | null
          delivery_address_line_1?: string | null
          delivery_address_line_2?: string | null
          delivery_city?: string | null
          delivery_postal_code?: string | null
          delivery_same_as_work?: boolean
          delivery_state?: string | null
          email?: string
          employee_number?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          job_title?: string | null
          last_name?: string
          manager_employee_id?: string | null
          organization_id?: string
          organization_location_id?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_celebration_delivery?: string
          recognition_preferences?: Json
          state?: string | null
          status?: string
          updated_at?: string
          work_location?: string | null
          work_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_organization_location_id_fkey"
            columns: ["organization_location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_history: {
        Row: {
          amount: number
          created_at: string
          employee_id: string
          id: string
          occasion: string
          organization_id: string
          recommendation_id: string | null
          reward_type: string
          status: string
          title: string
        }
        Insert: {
          amount?: number
          created_at?: string
          employee_id: string
          id?: string
          occasion: string
          organization_id: string
          recommendation_id?: string | null
          reward_type: string
          status?: string
          title: string
        }
        Update: {
          amount?: number
          created_at?: string
          employee_id?: string
          id?: string
          occasion?: string
          organization_id?: string
          recommendation_id?: string | null
          reward_type?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_history_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      local_gift_orders: {
        Row: {
          created_at: string
          customer_amount: number
          delivery_address: Json
          delivery_date: string
          delivery_fee: number
          employee_id: string
          gift_message: string | null
          id: string
          internal_notes: string | null
          paid_at: string | null
          options: Json
          organization_id: string
          platform_fee_amount: number
          platform_fee_rate_bps: number
          product_id: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          updated_at: string
          vendor_cost: number
        }
        Insert: {
          created_at?: string
          customer_amount: number
          delivery_address: Json
          delivery_date: string
          delivery_fee?: number
          employee_id: string
          gift_message?: string | null
          id?: string
          internal_notes?: string | null
          paid_at?: string | null
          options?: Json
          organization_id: string
          platform_fee_amount?: number
          platform_fee_rate_bps?: number
          product_id: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
          vendor_cost: number
        }
        Update: {
          created_at?: string
          customer_amount?: number
          delivery_address?: Json
          delivery_date?: string
          delivery_fee?: number
          employee_id?: string
          gift_message?: string | null
          id?: string
          internal_notes?: string | null
          paid_at?: string | null
          options?: Json
          organization_id?: string
          platform_fee_amount?: number
          platform_fee_rate_bps?: number
          product_id?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
          vendor_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "local_gift_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_gift_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_gift_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          active: boolean
          created_at: string
          id: string
          market_id: string
          preference_tags: string[]
          product_id: string
          rating: number | null
          updated_at: string
          vendor_availability_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          market_id: string
          preference_tags?: string[]
          product_id: string
          rating?: number | null
          updated_at?: string
          vendor_availability_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          market_id?: string
          preference_tags?: string[]
          product_id?: string
          rating?: number | null
          updated_at?: string
          vendor_availability_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_vendor_availability_id_fkey"
            columns: ["vendor_availability_id"]
            isOneToOne: false
            referencedRelation: "vendor_availability"
            referencedColumns: ["id"]
          },
        ]
      }
      markets: {
        Row: {
          active: boolean
          city: string
          country: string
          created_at: string
          id: string
          launch_status: string
          name: string
          slug: string
          state: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          city: string
          country?: string
          created_at?: string
          id?: string
          launch_status?: string
          name: string
          slug: string
          state: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          city?: string
          country?: string
          created_at?: string
          id?: string
          launch_status?: string
          name?: string
          slug?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_href: string | null
          action_label: string | null
          body: string
          channel: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          organization_id: string
          read_at: string | null
          sent_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_href?: string | null
          action_label?: string | null
          body: string
          channel: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id: string
          read_at?: string | null
          sent_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_href?: string | null
          action_label?: string | null
          body?: string
          channel?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id?: string
          read_at?: string | null
          sent_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_locations: {
        Row: {
          active: boolean
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          created_at: string
          id: string
          location_type: string
          market_id: string | null
          name: string
          organization_id: string
          postal_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          created_at?: string
          id?: string
          location_type?: string
          market_id?: string | null
          name: string
          organization_id: string
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          created_at?: string
          id?: string
          location_type?: string
          market_id?: string | null
          name?: string
          organization_id?: string
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_locations_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          manager_scope_enabled: boolean
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_scope_enabled?: boolean
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_scope_enabled?: boolean
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          approval_mode: Database["public"]["Enums"]["approval_mode"]
          approval_thresholds: Json
          celebration_style: string
          created_at: string
          default_anniversary_message: string | null
          default_birthday_message: string | null
          default_reward_amount: number
          department_budgets: Json
          leap_day_preference: string
          manager_reward_limit: number
          monthly_budget: number
          notification_preferences: Json
          onboarding_completed: boolean
          organization_id: string
          per_event_maximums: Json
          prevent_above_budget: boolean
          reminder_days: number[]
          selected_template: string | null
          updated_at: string
        }
        Insert: {
          approval_mode?: Database["public"]["Enums"]["approval_mode"]
          approval_thresholds?: Json
          celebration_style?: string
          created_at?: string
          default_anniversary_message?: string | null
          default_birthday_message?: string | null
          default_reward_amount?: number
          department_budgets?: Json
          leap_day_preference?: string
          manager_reward_limit?: number
          monthly_budget?: number
          notification_preferences?: Json
          onboarding_completed?: boolean
          organization_id: string
          per_event_maximums?: Json
          prevent_above_budget?: boolean
          reminder_days?: number[]
          selected_template?: string | null
          updated_at?: string
        }
        Update: {
          approval_mode?: Database["public"]["Enums"]["approval_mode"]
          approval_thresholds?: Json
          celebration_style?: string
          created_at?: string
          default_anniversary_message?: string | null
          default_birthday_message?: string | null
          default_reward_amount?: number
          department_budgets?: Json
          leap_day_preference?: string
          manager_reward_limit?: number
          monthly_budget?: number
          notification_preferences?: Json
          onboarding_completed?: boolean
          organization_id?: string
          per_event_maximums?: Json
          prevent_above_budget?: boolean
          reminder_days?: number[]
          selected_template?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          postal_code: string | null
          state: string | null
          stripe_customer_id: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          postal_code?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          postal_code?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_provider_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          provider_event_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider: string
          provider_event_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
        }
        Relationships: []
      }
      platform_financial_settings: {
        Row: {
          created_at: string
          id: boolean
          local_transaction_fee_bps: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: boolean
          local_transaction_fee_bps?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: boolean
          local_transaction_fee_bps?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string
          id: string
          is_super_admin: boolean
          last_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name?: string
          id: string
          is_super_admin?: boolean
          last_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          is_super_admin?: boolean
          last_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      recognition_events: {
        Row: {
          created_at: string
          employee_id: string
          event_date: string
          event_key: string
          event_type: string
          event_year: number
          id: string
          metadata: Json
          organization_id: string
          rule_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          event_date: string
          event_key: string
          event_type: string
          event_year: number
          id?: string
          metadata?: Json
          organization_id: string
          rule_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          event_date?: string
          event_key?: string
          event_type?: string
          event_year?: number
          id?: string
          metadata?: Json
          organization_id?: string
          rule_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognition_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          amount: number
          created_at: string
          employee_event_id: string | null
          employee_id: string
          id: string
          organization_id: string
          recommendation_reason: string
          recommendation_score: number
          reward_type: string
          something_different: boolean
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          employee_event_id?: string | null
          employee_id: string
          id?: string
          organization_id: string
          recommendation_reason: string
          recommendation_score: number
          reward_type: string
          something_different?: boolean
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          employee_event_id?: string | null
          employee_id?: string
          id?: string
          organization_id?: string
          recommendation_reason?: string
          recommendation_score?: number
          reward_type?: string
          something_different?: boolean
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_employee_event_id_fkey"
            columns: ["employee_event_id"]
            isOneToOne: false
            referencedRelation: "employee_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_provider_events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          provider_event_id: string
          reward_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider: string
          provider_event_id: string
          reward_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          reward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_provider_events_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          amount: number
          created_at: string
          currency: string
          delivered_at: string | null
          delivery_method: string
          employee_id: string
          failure_reason: string | null
          id: string
          idempotency_key: string
          organization_id: string
          provider: string
          provider_order_id: string | null
          provider_reward_id: string | null
          recipient_email: string
          recipient_name: string
          recognition_event_id: string | null
          redeemed_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["reward_status"]
          test_mode: boolean
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          delivered_at?: string | null
          delivery_method?: string
          employee_id: string
          failure_reason?: string | null
          id?: string
          idempotency_key: string
          organization_id: string
          provider: string
          provider_order_id?: string | null
          provider_reward_id?: string | null
          recipient_email: string
          recipient_name: string
          recognition_event_id?: string | null
          redeemed_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reward_status"]
          test_mode?: boolean
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          delivered_at?: string | null
          delivery_method?: string
          employee_id?: string
          failure_reason?: string | null
          id?: string
          idempotency_key?: string
          organization_id?: string
          provider?: string
          provider_order_id?: string | null
          provider_reward_id?: string | null
          recipient_email?: string
          recipient_name?: string
          recognition_event_id?: string | null
          redeemed_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reward_status"]
          test_mode?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_recognition_event_id_fkey"
            columns: ["recognition_event_id"]
            isOneToOne: false
            referencedRelation: "recognition_events"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          monthly_recurring_revenue: number
          organization_id: string
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          subscription_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          monthly_recurring_revenue?: number
          organization_id: string
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          subscription_status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          monthly_recurring_revenue?: number
          organization_id?: string
          stripe_customer_id?: string
          stripe_price_id?: string
          stripe_subscription_id?: string
          subscription_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_celebration_participants: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          organization_id: string
          team_celebration_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          team_celebration_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
          team_celebration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_celebration_participants_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_celebration_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_celebration_participants_team_celebration_id_fkey"
            columns: ["team_celebration_id"]
            isOneToOne: false
            referencedRelation: "team_celebrations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_celebrations: {
        Row: {
          budget: number
          created_at: string
          department_id: string | null
          event_date: string
          event_type: string
          id: string
          organization_id: string
          participant_employee_ids: string[]
          reward_mode: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          budget?: number
          created_at?: string
          department_id?: string | null
          event_date: string
          event_type: string
          id?: string
          organization_id: string
          participant_employee_ids?: string[]
          reward_mode: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          budget?: number
          created_at?: string
          department_id?: string | null
          event_date?: string
          event_type?: string
          id?: string
          organization_id?: string
          participant_employee_ids?: string[]
          reward_mode?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_celebrations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_celebrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_availability: {
        Row: {
          available_days: number[]
          blackout_dates: string[]
          created_at: string
          delivery_hours: Json
          fulfillment_method: string
          id: string
          market_id: string
          minimum_notice_hours: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          available_days?: number[]
          blackout_dates?: string[]
          created_at?: string
          delivery_hours?: Json
          fulfillment_method?: string
          id?: string
          market_id: string
          minimum_notice_hours?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          available_days?: number[]
          blackout_dates?: string[]
          created_at?: string
          delivery_hours?: Json
          fulfillment_method?: string
          id?: string
          market_id?: string
          minimum_notice_hours?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_availability_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_availability_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_members: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_members_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_products: {
        Row: {
          active: boolean
          category: string
          created_at: string
          customer_price: number
          delivery_available: boolean
          delivery_cost: number
          delivery_fee: number
          description: string | null
          gross_margin: number
          id: string
          image_url: string | null
          lead_time_text: string | null
          minimum_notice_hours: number
          name: string
          options: Json
          perkjoy_cost: number
          platform_fee: number
          rating: number | null
          retail_price: number
          serves_people: number | null
          service_area: Json
          updated_at: string
          vendor_cost: number
          vendor_id: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          customer_price?: number
          delivery_available?: boolean
          delivery_cost?: number
          delivery_fee?: number
          description?: string | null
          gross_margin?: number
          id?: string
          image_url?: string | null
          lead_time_text?: string | null
          minimum_notice_hours?: number
          name: string
          options?: Json
          perkjoy_cost: number
          platform_fee?: number
          rating?: number | null
          retail_price: number
          serves_people?: number | null
          service_area?: Json
          updated_at?: string
          vendor_cost?: number
          vendor_id: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          customer_price?: number
          delivery_available?: boolean
          delivery_cost?: number
          delivery_fee?: number
          description?: string | null
          gross_margin?: number
          id?: string
          image_url?: string | null
          lead_time_text?: string | null
          minimum_notice_hours?: number
          name?: string
          options?: Json
          perkjoy_cost?: number
          platform_fee?: number
          rating?: number | null
          retail_price?: number
          serves_people?: number | null
          service_area?: Json
          updated_at?: string
          vendor_cost?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          active: boolean
          address: string | null
          business_name: string
          city: string
          created_at: string
          demo: boolean
          description: string | null
          email: string | null
          featured: boolean
          id: string
          internal_notes: string | null
          logo_url: string | null
          market_id: string | null
          minimum_notice_hours: number
          phone: string | null
          postal_code: string | null
          service_area: Json
          slug: string
          state: string
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_connected_at: string | null
          stripe_details_submitted: boolean
          stripe_payouts_enabled: boolean
          updated_at: string
          website_url: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          business_name: string
          city: string
          created_at?: string
          demo?: boolean
          description?: string | null
          email?: string | null
          featured?: boolean
          id?: string
          internal_notes?: string | null
          logo_url?: string | null
          market_id?: string | null
          minimum_notice_hours?: number
          phone?: string | null
          postal_code?: string | null
          service_area?: Json
          slug: string
          state: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_connected_at?: string | null
          stripe_details_submitted?: boolean
          stripe_payouts_enabled?: boolean
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          business_name?: string
          city?: string
          created_at?: string
          demo?: boolean
          description?: string | null
          email?: string | null
          featured?: boolean
          id?: string
          internal_notes?: string | null
          logo_url?: string | null
          market_id?: string | null
          minimum_notice_hours?: number
          phone?: string | null
          postal_code?: string | null
          service_area?: Json
          slug?: string
          state?: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_connected_at?: string | null
          stripe_details_submitted?: boolean
          stripe_payouts_enabled?: boolean
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_perkjoy_workspace: {
        Args: {
          p_city?: string
          p_company_name?: string
          p_first_name?: string
          p_last_name?: string
          p_postal_code?: string
          p_state?: string
          p_timezone?: string
        }
        Returns: string
      }
      complete_celebration_profile_invite_internal: {
        Args: { p_payload: Json; p_token: string }
        Returns: number
      }
      create_perkjoy_local_order: {
        Args: {
          p_delivery_date: string
          p_employee_id: string
          p_gift_message?: string
          p_product_id: string
        }
        Returns: string
      }
      read_celebration_profile_invite_internal: {
        Args: { p_token: string }
        Returns: Json
      }
    }
    Enums: {
      approval_mode: "automatic" | "approval_required" | "reminder_only"
      organization_role: "OWNER" | "ADMIN" | "MANAGER" | "VIEWER"
      reward_status:
        | "draft"
        | "pending_approval"
        | "scheduled"
        | "processing"
        | "sent"
        | "delivered"
        | "redeemed"
        | "failed"
        | "cancelled"
        | "refunded"
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
      approval_mode: ["automatic", "approval_required", "reminder_only"],
      organization_role: ["OWNER", "ADMIN", "MANAGER", "VIEWER"],
      reward_status: [
        "draft",
        "pending_approval",
        "scheduled",
        "processing",
        "sent",
        "delivered",
        "redeemed",
        "failed",
        "cancelled",
        "refunded",
      ],
    },
  },
} as const
