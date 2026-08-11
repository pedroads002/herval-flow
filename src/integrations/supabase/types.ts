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
      appointments: {
        Row: {
          attended_at: string | null
          clinic_id: string
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          no_show_at: string | null
          notes: string | null
          rescheduled_from: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          attended_at?: string | null
          clinic_id: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          no_show_at?: string | null
          notes?: string | null
          rescheduled_from?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          attended_at?: string | null
          clinic_id?: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          no_show_at?: string | null
          notes?: string | null
          rescheduled_from?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          instagram: string | null
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          responsible_professional: string | null
          specialty: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          responsible_professional?: string | null
          specialty?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          responsible_professional?: string | null
          specialty?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      demand_comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          demand_id: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          demand_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          demand_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_comments_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_events: {
        Row: {
          actor_id: string | null
          created_at: string
          demand_id: string
          description: string | null
          event_type: string
          id: string
          metadata: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          demand_id: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          demand_id?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "demand_events_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_tags: {
        Row: {
          created_at: string
          demand_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          demand_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          demand_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_tags_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      demands: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          assigned_to: string | null
          clinic_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          lead_id: string | null
          priority: Database["public"]["Enums"]["demand_priority"]
          start_date: string | null
          status: Database["public"]["Enums"]["demand_status"]
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string | null
          clinic_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          priority?: Database["public"]["Enums"]["demand_priority"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["demand_status"]
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string | null
          clinic_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          priority?: Database["public"]["Enums"]["demand_priority"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["demand_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demands_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demands_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          assigned_to: string | null
          clinic_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          due_at: string
          id: string
          lead_id: string
          notes: string | null
          status: Database["public"]["Enums"]["followup_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          clinic_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          due_at: string
          id?: string
          lead_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["followup_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          clinic_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["followup_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          clinic_id: string
          created_at: string
          description: string | null
          id: string
          lead_id: string
          reason: Database["public"]["Enums"]["intervention_reason"]
          requested_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["intervention_status"]
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id: string
          reason?: Database["public"]["Enums"]["intervention_reason"]
          requested_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["intervention_status"]
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string
          reason?: Database["public"]["Enums"]["intervention_reason"]
          requested_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["intervention_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_events: {
        Row: {
          actor_id: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          lead_id: string
          metadata: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          lead_id: string
          metadata?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          lead_id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          appointment_at: string | null
          assigned_to: string | null
          attended: boolean | null
          clinic_id: string
          confirmed: boolean
          created_at: string
          created_by: string | null
          id: string
          instagram: string | null
          intervention_pending: boolean
          last_interaction_at: string | null
          loss_reason: string | null
          name: string
          next_follow_up_at: string | null
          notes: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          appointment_at?: string | null
          assigned_to?: string | null
          attended?: boolean | null
          clinic_id: string
          confirmed?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          instagram?: string | null
          intervention_pending?: boolean
          last_interaction_at?: string | null
          loss_reason?: string | null
          name: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          appointment_at?: string | null
          assigned_to?: string | null
          attended?: boolean | null
          clinic_id?: string
          confirmed?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          instagram?: string | null
          intervention_pending?: boolean
          last_interaction_at?: string | null
          loss_reason?: string | null
          name?: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_gestor: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "gestor" | "crc"
      appointment_status:
        | "agendado"
        | "confirmado"
        | "compareceu"
        | "no_show"
        | "reagendado"
        | "cancelado"
      demand_priority: "urgente" | "alta" | "media" | "baixa"
      demand_status: "a_fazer" | "em_andamento" | "concluida" | "bloqueada"
      followup_status: "pendente" | "concluido" | "cancelado"
      intervention_reason:
        | "ligacao"
        | "objecao"
        | "lead_quente"
        | "recuperacao"
        | "no_show_importante"
        | "outro"
      intervention_status:
        | "pendente"
        | "em_andamento"
        | "resolvida"
        | "cancelada"
      lead_status:
        | "novo"
        | "em_contato"
        | "follow_up"
        | "agendado"
        | "confirmado"
        | "compareceu"
        | "no_show"
        | "reagendamento"
        | "perdido"
        | "convertido"
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
      app_role: ["gestor", "crc"],
      appointment_status: [
        "agendado",
        "confirmado",
        "compareceu",
        "no_show",
        "reagendado",
        "cancelado",
      ],
      demand_priority: ["urgente", "alta", "media", "baixa"],
      demand_status: ["a_fazer", "em_andamento", "concluida", "bloqueada"],
      followup_status: ["pendente", "concluido", "cancelado"],
      intervention_reason: [
        "ligacao",
        "objecao",
        "lead_quente",
        "recuperacao",
        "no_show_importante",
        "outro",
      ],
      intervention_status: [
        "pendente",
        "em_andamento",
        "resolvida",
        "cancelada",
      ],
      lead_status: [
        "novo",
        "em_contato",
        "follow_up",
        "agendado",
        "confirmado",
        "compareceu",
        "no_show",
        "reagendamento",
        "perdido",
        "convertido",
      ],
    },
  },
} as const
