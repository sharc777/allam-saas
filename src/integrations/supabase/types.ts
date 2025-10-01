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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          description: string | null
          description_ar: string | null
          icon: string
          id: string
          name: string
          name_ar: string
          points: number | null
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          icon: string
          id?: string
          name: string
          name_ar: string
          points?: number | null
          requirement_type: string
          requirement_value: number
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          icon?: string
          id?: string
          name?: string
          name_ar?: string
          points?: number | null
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          context_type:
            | Database["public"]["Enums"]["conversation_context"]
            | null
          created_at: string
          id: string
          messages: Json
          related_topic: string | null
          title: string | null
          tokens_used: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_type?:
            | Database["public"]["Enums"]["conversation_context"]
            | null
          created_at?: string
          id?: string
          messages?: Json
          related_topic?: string | null
          title?: string | null
          tokens_used?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_type?:
            | Database["public"]["Enums"]["conversation_context"]
            | null
          created_at?: string
          id?: string
          messages?: Json
          related_topic?: string | null
          title?: string | null
          tokens_used?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_content: {
        Row: {
          content_text: string | null
          created_at: string
          day_number: number
          description: string | null
          duration_minutes: number
          id: string
          is_published: boolean | null
          learning_objectives: string[] | null
          test_type: Database["public"]["Enums"]["test_type"] | null
          title: string
          topics: Json | null
          track: Database["public"]["Enums"]["academic_track"] | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content_text?: string | null
          created_at?: string
          day_number: number
          description?: string | null
          duration_minutes: number
          id?: string
          is_published?: boolean | null
          learning_objectives?: string[] | null
          test_type?: Database["public"]["Enums"]["test_type"] | null
          title: string
          topics?: Json | null
          track?: Database["public"]["Enums"]["academic_track"] | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content_text?: string | null
          created_at?: string
          day_number?: number
          description?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean | null
          learning_objectives?: string[] | null
          test_type?: Database["public"]["Enums"]["test_type"] | null
          title?: string
          topics?: Json | null
          track?: Database["public"]["Enums"]["academic_track"] | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      generated_questions_log: {
        Row: {
          created_at: string | null
          day_number: number
          id: string
          question_data: Json | null
          question_hash: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          day_number: number
          id?: string
          question_data?: Json | null
          question_hash: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          day_number?: number
          id?: string
          question_data?: Json | null
          question_hash?: string
          user_id?: string | null
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          content: string | null
          content_type: string
          created_at: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          related_topics: string[] | null
          test_type: Database["public"]["Enums"]["test_type"] | null
          title: string
          track: Database["public"]["Enums"]["academic_track"] | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          content_type: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          related_topics?: string[] | null
          test_type?: Database["public"]["Enums"]["test_type"] | null
          title: string
          track?: Database["public"]["Enums"]["academic_track"] | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          content_type?: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          related_topics?: string[] | null
          test_type?: Database["public"]["Enums"]["test_type"] | null
          title?: string
          track?: Database["public"]["Enums"]["academic_track"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_day: number | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          streak_days: number | null
          test_type_preference: Database["public"]["Enums"]["test_type"] | null
          total_points: number | null
          track_preference: Database["public"]["Enums"]["academic_track"] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_day?: number | null
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          streak_days?: number | null
          test_type_preference?: Database["public"]["Enums"]["test_type"] | null
          total_points?: number | null
          track_preference?:
            | Database["public"]["Enums"]["academic_track"]
            | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_day?: number | null
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          streak_days?: number | null
          test_type_preference?: Database["public"]["Enums"]["test_type"] | null
          total_points?: number | null
          track_preference?:
            | Database["public"]["Enums"]["academic_track"]
            | null
          updated_at?: string
        }
        Relationships: []
      }
      questions_bank: {
        Row: {
          correct_answer: string
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string | null
          id: string
          options: Json | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          subject: Database["public"]["Enums"]["question_subject"]
          success_rate: number | null
          tags: string[] | null
          topic: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          correct_answer: string
          created_at?: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          options?: Json | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          subject: Database["public"]["Enums"]["question_subject"]
          success_rate?: number | null
          tags?: string[] | null
          topic: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          correct_answer?: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          options?: Json | null
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          subject?: Database["public"]["Enums"]["question_subject"]
          success_rate?: number | null
          tags?: string[] | null
          topic?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          completed_at: string
          created_at: string
          day_number: number | null
          id: string
          percentage: number | null
          questions: Json
          quiz_type: string | null
          score: number
          strengths: string[] | null
          test_type: Database["public"]["Enums"]["test_type"] | null
          time_taken_minutes: number | null
          total_questions: number
          track: Database["public"]["Enums"]["academic_track"] | null
          user_id: string
          weaknesses: string[] | null
        }
        Insert: {
          completed_at?: string
          created_at?: string
          day_number?: number | null
          id?: string
          percentage?: number | null
          questions: Json
          quiz_type?: string | null
          score: number
          strengths?: string[] | null
          test_type?: Database["public"]["Enums"]["test_type"] | null
          time_taken_minutes?: number | null
          total_questions: number
          track?: Database["public"]["Enums"]["academic_track"] | null
          user_id: string
          weaknesses?: string[] | null
        }
        Update: {
          completed_at?: string
          created_at?: string
          day_number?: number | null
          id?: string
          percentage?: number | null
          questions?: Json
          quiz_type?: string | null
          score?: number
          strengths?: string[] | null
          test_type?: Database["public"]["Enums"]["test_type"] | null
          time_taken_minutes?: number | null
          total_questions?: number
          track?: Database["public"]["Enums"]["academic_track"] | null
          user_id?: string
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_progress: {
        Row: {
          completed_at: string | null
          content_completed: boolean | null
          created_at: string
          day_number: number
          exercises_completed: boolean | null
          id: string
          notes: string | null
          quiz_completed: boolean | null
          time_spent_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content_completed?: boolean | null
          created_at?: string
          day_number: number
          exercises_completed?: boolean | null
          id?: string
          notes?: string | null
          quiz_completed?: boolean | null
          time_spent_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content_completed?: boolean | null
          created_at?: string
          day_number?: number
          exercises_completed?: boolean | null
          id?: string
          notes?: string | null
          quiz_completed?: boolean | null
          time_spent_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      academic_track: "عام" | "علمي" | "نظري"
      conversation_context:
        | "general"
        | "quiz_help"
        | "topic_explanation"
        | "study_plan"
      difficulty_level: "easy" | "medium" | "hard"
      question_subject:
        | "math"
        | "arabic"
        | "science"
        | "english"
        | "logical_reasoning"
        | "رياضيات"
        | "فيزياء"
        | "كيمياء"
        | "أحياء"
        | "توحيد"
        | "فقه"
        | "حديث"
        | "نحو"
        | "بلاغة"
        | "أدب"
        | "تاريخ"
        | "جغرافيا"
      question_type: "multiple_choice" | "true_false" | "short_answer"
      test_type: "قدرات" | "تحصيلي"
      user_role: "student" | "admin"
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
      academic_track: ["عام", "علمي", "نظري"],
      conversation_context: [
        "general",
        "quiz_help",
        "topic_explanation",
        "study_plan",
      ],
      difficulty_level: ["easy", "medium", "hard"],
      question_subject: [
        "math",
        "arabic",
        "science",
        "english",
        "logical_reasoning",
        "رياضيات",
        "فيزياء",
        "كيمياء",
        "أحياء",
        "توحيد",
        "فقه",
        "حديث",
        "نحو",
        "بلاغة",
        "أدب",
        "تاريخ",
        "جغرافيا",
      ],
      question_type: ["multiple_choice", "true_false", "short_answer"],
      test_type: ["قدرات", "تحصيلي"],
      user_role: ["student", "admin"],
    },
  },
} as const
