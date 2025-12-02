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
      ad_settings: {
        Row: {
          ad_slots: Json | null
          adsense_client_id: string | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          placement_settings: Json | null
          updated_at: string | null
        }
        Insert: {
          ad_slots?: Json | null
          adsense_client_id?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          placement_settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          ad_slots?: Json | null
          adsense_client_id?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          placement_settings?: Json | null
          updated_at?: string | null
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
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "student_comprehensive_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ai_generation_analytics: {
        Row: {
          created_at: string | null
          diversity_score: number | null
          generation_time_ms: number | null
          id: string
          model_used: string | null
          quality_score: number | null
          questions_generated: number | null
          questions_unique: number | null
          skill_id: string | null
          temperature: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          diversity_score?: number | null
          generation_time_ms?: number | null
          id?: string
          model_used?: string | null
          quality_score?: number | null
          questions_generated?: number | null
          questions_unique?: number | null
          skill_id?: string | null
          temperature?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          diversity_score?: number | null
          generation_time_ms?: number | null
          id?: string
          model_used?: string | null
          quality_score?: number | null
          questions_generated?: number | null
          questions_unique?: number | null
          skill_id?: string | null
          temperature?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_analytics_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generation_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generation_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "student_comprehensive_stats"
            referencedColumns: ["user_id"]
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
      ai_training_examples: {
        Row: {
          correct_answer: string
          created_at: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          explanation: string | null
          id: string
          options: Json
          quality_score: number | null
          question_text: string
          section: string
          subject: string | null
          test_type: Database["public"]["Enums"]["test_type"]
          updated_at: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          explanation?: string | null
          id?: string
          options: Json
          quality_score?: number | null
          question_text: string
          section: string
          subject?: string | null
          test_type: Database["public"]["Enums"]["test_type"]
          updated_at?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          explanation?: string | null
          id?: string
          options?: Json
          quality_score?: number | null
          question_text?: string
          section?: string
          subject?: string | null
          test_type?: Database["public"]["Enums"]["test_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          discount_amount: number
          id: string
          package_id: string | null
          stripe_session_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          discount_amount: number
          id?: string
          package_id?: string | null
          stripe_session_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          discount_amount?: number
          id?: string
          package_id?: string | null
          stripe_session_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "subscription_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_packages: string[] | null
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          metadata: Json | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_packages?: string[] | null
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          metadata?: Json | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_packages?: string[] | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          metadata?: Json | null
          valid_from?: string | null
          valid_until?: string | null
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
          examples: Json | null
          id: string
          is_published: boolean | null
          key_points: string[] | null
          last_parse_attempt: string | null
          learning_objectives: string[] | null
          parse_error: string | null
          parse_status: string | null
          quick_tips: string[] | null
          requires_previous_completion: boolean | null
          sections: Json | null
          test_type: Database["public"]["Enums"]["test_type"] | null
          title: string
          topics: Json | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content_text?: string | null
          created_at?: string
          day_number: number
          description?: string | null
          duration_minutes: number
          examples?: Json | null
          id?: string
          is_published?: boolean | null
          key_points?: string[] | null
          last_parse_attempt?: string | null
          learning_objectives?: string[] | null
          parse_error?: string | null
          parse_status?: string | null
          quick_tips?: string[] | null
          requires_previous_completion?: boolean | null
          sections?: Json | null
          test_type?: Database["public"]["Enums"]["test_type"] | null
          title: string
          topics?: Json | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content_text?: string | null
          created_at?: string
          day_number?: number
          description?: string | null
          duration_minutes?: number
          examples?: Json | null
          id?: string
          is_published?: boolean | null
          key_points?: string[] | null
          last_parse_attempt?: string | null
          learning_objectives?: string[] | null
          parse_error?: string | null
          parse_status?: string | null
          quick_tips?: string[] | null
          requires_previous_completion?: boolean | null
          sections?: Json | null
          test_type?: Database["public"]["Enums"]["test_type"] | null
          title?: string
          topics?: Json | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      daily_exercises: {
        Row: {
          completed_at: string | null
          created_at: string
          custom_topic: string | null
          day_number: number | null
          exercise_type: string | null
          id: string
          questions: Json
          score: number
          section_type: string
          test_type: Database["public"]["Enums"]["test_type"]
          time_taken_minutes: number | null
          total_questions: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          custom_topic?: string | null
          day_number?: number | null
          exercise_type?: string | null
          id?: string
          questions?: Json
          score?: number
          section_type: string
          test_type: Database["public"]["Enums"]["test_type"]
          time_taken_minutes?: number | null
          total_questions?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          custom_topic?: string | null
          day_number?: number | null
          exercise_type?: string | null
          id?: string
          questions?: Json
          score?: number
          section_type?: string
          test_type?: Database["public"]["Enums"]["test_type"]
          time_taken_minutes?: number | null
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          achievement_notifications: boolean | null
          daily_reminder: boolean | null
          marketing_emails: boolean | null
          subscription_updates: boolean | null
          support_updates: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievement_notifications?: boolean | null
          daily_reminder?: boolean | null
          marketing_emails?: boolean | null
          subscription_updates?: boolean | null
          support_updates?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievement_notifications?: boolean | null
          daily_reminder?: boolean | null
          marketing_emails?: boolean | null
          subscription_updates?: boolean | null
          support_updates?: boolean | null
          updated_at?: string | null
          user_id?: string
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
      initial_assessments: {
        Row: {
          created_at: string | null
          id: string
          level: string
          percentage: number
          questions: Json
          recommended_topics: string[] | null
          strengths: string[] | null
          test_type: Database["public"]["Enums"]["test_type"]
          total_score: number
          user_id: string
          weaknesses: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          level: string
          percentage: number
          questions?: Json
          recommended_topics?: string[] | null
          strengths?: string[] | null
          test_type: Database["public"]["Enums"]["test_type"]
          total_score: number
          user_id: string
          weaknesses?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: string
          percentage?: number
          questions?: Json
          recommended_topics?: string[] | null
          strengths?: string[] | null
          test_type?: Database["public"]["Enums"]["test_type"]
          total_score?: number
          user_id?: string
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "initial_assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "initial_assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "student_comprehensive_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          content: string | null
          content_type: string
          created_at: string | null
          difficulty: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          learning_objectives: string[] | null
          metadata: Json | null
          related_topics: string[] | null
          section: string | null
          source_file: string | null
          test_type: Database["public"]["Enums"]["test_type"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          content_type: string
          created_at?: string | null
          difficulty?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          learning_objectives?: string[] | null
          metadata?: Json | null
          related_topics?: string[] | null
          section?: string | null
          source_file?: string | null
          test_type?: Database["public"]["Enums"]["test_type"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          content_type?: string
          created_at?: string | null
          difficulty?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          learning_objectives?: string[] | null
          metadata?: Json | null
          related_topics?: string[] | null
          section?: string | null
          source_file?: string | null
          test_type?: Database["public"]["Enums"]["test_type"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          expires_at: string | null
          icon: string | null
          id: string
          message: string
          metadata: Json | null
          priority: string | null
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          message: string
          metadata?: Json | null
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_day: number | null
          daily_custom_tests_count: Json | null
          daily_exercises_count: Json | null
          daily_quiz_count: number | null
          full_name: string
          id: string
          initial_assessment_completed: boolean | null
          last_quiz_date: string | null
          package_end_date: string | null
          package_id: string | null
          package_start_date: string | null
          preferred_sections: Json | null
          streak_days: number | null
          subscription_active: boolean | null
          subscription_end_date: string | null
          test_type_preference: Database["public"]["Enums"]["test_type"] | null
          total_points: number | null
          trial_days: number | null
          updated_at: string
          user_level: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_day?: number | null
          daily_custom_tests_count?: Json | null
          daily_exercises_count?: Json | null
          daily_quiz_count?: number | null
          full_name: string
          id: string
          initial_assessment_completed?: boolean | null
          last_quiz_date?: string | null
          package_end_date?: string | null
          package_id?: string | null
          package_start_date?: string | null
          preferred_sections?: Json | null
          streak_days?: number | null
          subscription_active?: boolean | null
          subscription_end_date?: string | null
          test_type_preference?: Database["public"]["Enums"]["test_type"] | null
          total_points?: number | null
          trial_days?: number | null
          updated_at?: string
          user_level?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_day?: number | null
          daily_custom_tests_count?: Json | null
          daily_exercises_count?: Json | null
          daily_quiz_count?: number | null
          full_name?: string
          id?: string
          initial_assessment_completed?: boolean | null
          last_quiz_date?: string | null
          package_end_date?: string | null
          package_id?: string | null
          package_start_date?: string | null
          preferred_sections?: Json | null
          streak_days?: number | null
          subscription_active?: boolean | null
          subscription_end_date?: string | null
          test_type_preference?: Database["public"]["Enums"]["test_type"] | null
          total_points?: number | null
          trial_days?: number | null
          updated_at?: string
          user_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "subscription_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          keys: Json
          last_used_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          keys: Json
          last_used_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          keys?: Json
          last_used_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      question_notes: {
        Row: {
          created_at: string | null
          exercise_id: string | null
          id: string
          note: string
          question_hash: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          note: string
          question_hash: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          note?: string
          question_hash?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_notes_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "daily_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      questions_bank: {
        Row: {
          correct_answer: string
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string | null
          id: string
          last_reviewed_at: string | null
          options: Json | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          review_notes: string | null
          subject: Database["public"]["Enums"]["question_subject"]
          success_rate: number | null
          tags: string[] | null
          topic: string
          updated_at: string
          usage_count: number | null
          validation_status: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string
          created_by?: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          last_reviewed_at?: string | null
          options?: Json | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          review_notes?: string | null
          subject: Database["public"]["Enums"]["question_subject"]
          success_rate?: number | null
          tags?: string[] | null
          topic: string
          updated_at?: string
          usage_count?: number | null
          validation_status?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          last_reviewed_at?: string | null
          options?: Json | null
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          review_notes?: string | null
          subject?: Database["public"]["Enums"]["question_subject"]
          success_rate?: number | null
          tags?: string[] | null
          topic?: string
          updated_at?: string
          usage_count?: number | null
          validation_status?: string | null
        }
        Relationships: []
      }
      questions_cache: {
        Row: {
          created_at: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          expires_at: string | null
          generation_source: string | null
          id: string
          is_used: boolean | null
          question_data: Json
          question_hash: string
          reserved_at: string | null
          reserved_by: string | null
          section: string
          test_type: Database["public"]["Enums"]["test_type"]
          topic: string | null
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          expires_at?: string | null
          generation_source?: string | null
          id?: string
          is_used?: boolean | null
          question_data: Json
          question_hash: string
          reserved_at?: string | null
          reserved_by?: string | null
          section: string
          test_type: Database["public"]["Enums"]["test_type"]
          topic?: string | null
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          expires_at?: string | null
          generation_source?: string | null
          id?: string
          is_used?: boolean | null
          question_data?: Json
          question_hash?: string
          reserved_at?: string | null
          reserved_by?: string | null
          section?: string
          test_type?: Database["public"]["Enums"]["test_type"]
          topic?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          completed_at: string
          created_at: string
          daily_content_id: string | null
          day_number: number | null
          id: string
          percentage: number | null
          questions: Json
          quiz_mode: string | null
          quiz_type: string | null
          score: number
          strengths: string[] | null
          test_type: Database["public"]["Enums"]["test_type"] | null
          time_taken_minutes: number | null
          total_questions: number
          user_id: string
          weaknesses: string[] | null
        }
        Insert: {
          completed_at?: string
          created_at?: string
          daily_content_id?: string | null
          day_number?: number | null
          id?: string
          percentage?: number | null
          questions: Json
          quiz_mode?: string | null
          quiz_type?: string | null
          score: number
          strengths?: string[] | null
          test_type?: Database["public"]["Enums"]["test_type"] | null
          time_taken_minutes?: number | null
          total_questions: number
          user_id: string
          weaknesses?: string[] | null
        }
        Update: {
          completed_at?: string
          created_at?: string
          daily_content_id?: string | null
          day_number?: number | null
          id?: string
          percentage?: number | null
          questions?: Json
          quiz_mode?: string | null
          quiz_type?: string | null
          score?: number
          strengths?: string[] | null
          test_type?: Database["public"]["Enums"]["test_type"] | null
          time_taken_minutes?: number | null
          total_questions?: number
          user_id?: string
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_daily_content_id_fkey"
            columns: ["daily_content_id"]
            isOneToOne: false
            referencedRelation: "daily_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "student_comprehensive_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      skills_taxonomy: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          learning_order: number | null
          parent_skill_id: string | null
          skill_name: string
          skill_name_en: string | null
          sub_skills: Json | null
          test_type: Database["public"]["Enums"]["test_type"]
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          learning_order?: number | null
          parent_skill_id?: string | null
          skill_name: string
          skill_name_en?: string | null
          sub_skills?: Json | null
          test_type: Database["public"]["Enums"]["test_type"]
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          learning_order?: number | null
          parent_skill_id?: string | null
          skill_name?: string
          skill_name_en?: string | null
          sub_skills?: Json | null
          test_type?: Database["public"]["Enums"]["test_type"]
        }
        Relationships: [
          {
            foreignKeyName: "skills_taxonomy_parent_skill_id_fkey"
            columns: ["parent_skill_id"]
            isOneToOne: false
            referencedRelation: "skills_taxonomy"
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
          {
            foreignKeyName: "student_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "student_comprehensive_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      student_activities: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string
          id: string
          metadata: Json
          score: number | null
          strengths_identified: string[] | null
          time_spent_minutes: number | null
          topics_covered: string[] | null
          user_id: string
          weaknesses_identified: string[] | null
        }
        Insert: {
          activity_date?: string
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json
          score?: number | null
          strengths_identified?: string[] | null
          time_spent_minutes?: number | null
          topics_covered?: string[] | null
          user_id: string
          weaknesses_identified?: string[] | null
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          score?: number | null
          strengths_identified?: string[] | null
          time_spent_minutes?: number | null
          topics_covered?: string[] | null
          user_id?: string
          weaknesses_identified?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "student_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "student_comprehensive_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      student_performance: {
        Row: {
          average_score: number
          badges: Json | null
          created_at: string
          current_level: string
          id: string
          improvement_rate: number | null
          last_updated: string | null
          strengths: Json | null
          test_type: Database["public"]["Enums"]["test_type"]
          total_exercises: number
          total_score: number
          user_id: string
          weaknesses: Json | null
        }
        Insert: {
          average_score?: number
          badges?: Json | null
          created_at?: string
          current_level?: string
          id?: string
          improvement_rate?: number | null
          last_updated?: string | null
          strengths?: Json | null
          test_type: Database["public"]["Enums"]["test_type"]
          total_exercises?: number
          total_score?: number
          user_id: string
          weaknesses?: Json | null
        }
        Update: {
          average_score?: number
          badges?: Json | null
          created_at?: string
          current_level?: string
          id?: string
          improvement_rate?: number | null
          last_updated?: string | null
          strengths?: Json | null
          test_type?: Database["public"]["Enums"]["test_type"]
          total_exercises?: number
          total_score?: number
          user_id?: string
          weaknesses?: Json | null
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          can_proceed_to_next: boolean | null
          completed_at: string | null
          content_completed: boolean | null
          created_at: string
          day_number: number
          exercises_completed: boolean | null
          id: string
          last_section_completed: string | null
          notes: string | null
          quiz_completed: boolean | null
          section_progress: Json | null
          time_spent_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_proceed_to_next?: boolean | null
          completed_at?: string | null
          content_completed?: boolean | null
          created_at?: string
          day_number: number
          exercises_completed?: boolean | null
          id?: string
          last_section_completed?: string | null
          notes?: string | null
          quiz_completed?: boolean | null
          section_progress?: Json | null
          time_spent_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_proceed_to_next?: boolean | null
          completed_at?: string | null
          content_completed?: boolean | null
          created_at?: string
          day_number?: number
          exercises_completed?: boolean | null
          id?: string
          last_section_completed?: string | null
          notes?: string | null
          quiz_completed?: boolean | null
          section_progress?: Json | null
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
          {
            foreignKeyName: "student_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "student_comprehensive_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscription_packages: {
        Row: {
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          display_order: number | null
          features: Json
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          limits: Json
          name_ar: string
          name_en: string | null
          price_monthly: number | null
          price_yearly: number | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          features?: Json
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          limits?: Json
          name_ar: string
          name_en?: string | null
          price_monthly?: number | null
          price_yearly?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          features?: Json
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          limits?: Json
          name_ar?: string
          name_en?: string | null
          price_monthly?: number | null
          price_yearly?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_packages_private: {
        Row: {
          created_at: string | null
          id: string
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          stripe_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_packages_private_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "subscription_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          ticket_number: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          ticket_number: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          ticket_number?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          is_staff_reply: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_staff_reply?: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_staff_reply?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_performance_history: {
        Row: {
          attempted_at: string
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id: string
          is_correct: boolean
          metadata: Json | null
          question_hash: string
          section: string
          time_spent_seconds: number | null
          topic: string
          user_id: string
        }
        Insert: {
          attempted_at?: string
          created_at?: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          is_correct: boolean
          metadata?: Json | null
          question_hash: string
          section: string
          time_spent_seconds?: number | null
          topic: string
          user_id: string
        }
        Update: {
          attempted_at?: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          is_correct?: boolean
          metadata?: Json | null
          question_hash?: string
          section?: string
          time_spent_seconds?: number | null
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_weakness_profile: {
        Row: {
          avg_time_seconds: number | null
          correct_attempts: number
          created_at: string
          id: string
          last_attempt: string | null
          priority: string
          section: string
          topic: string
          total_attempts: number
          trend: string
          updated_at: string
          user_id: string
          weakness_score: number
        }
        Insert: {
          avg_time_seconds?: number | null
          correct_attempts?: number
          created_at?: string
          id?: string
          last_attempt?: string | null
          priority?: string
          section: string
          topic: string
          total_attempts?: number
          trend?: string
          updated_at?: string
          user_id: string
          weakness_score?: number
        }
        Update: {
          avg_time_seconds?: number | null
          correct_attempts?: number
          created_at?: string
          id?: string
          last_attempt?: string | null
          priority?: string
          section?: string
          topic?: string
          total_attempts?: number
          trend?: string
          updated_at?: string
          user_id?: string
          weakness_score?: number
        }
        Relationships: []
      }
    }
    Views: {
      student_comprehensive_stats: {
        Row: {
          achievements_unlocked: number | null
          average_score: number | null
          current_day: number | null
          current_level: string | null
          custom_tests_completed: number | null
          daily_exercises_completed: number | null
          full_name: string | null
          improvement_rate: number | null
          last_activity_date: string | null
          streak_days: number | null
          strengths: Json | null
          subscription_active: boolean | null
          total_points: number | null
          total_time_spent: number | null
          trial_days: number | null
          user_id: string | null
          weakness_practices_completed: number | null
          weaknesses: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_custom_test_limit: { Args: { p_user_id: string }; Returns: Json }
      clean_expired_cache_reservations: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          p_action_url?: string
          p_icon?: string
          p_message: string
          p_priority?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      fetch_and_reserve_questions: {
        Args: {
          p_count: number
          p_difficulty: string
          p_section: string
          p_test_type: string
          p_user_id: string
        }
        Returns: {
          id: string
          question_data: Json
          question_hash: string
        }[]
      }
      has_active_access: { Args: { p_user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_custom_test_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      increment_daily_count: {
        Args: { p_section: string; p_user_id: string }
        Returns: undefined
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      validate_coupon: {
        Args: { p_code: string; p_package_id?: string }
        Returns: Json
      }
    }
    Enums: {
      academic_track: "عام" | "علمي" | "نظري"
      app_role: "admin" | "moderator" | "student"
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
        | "كمي"
        | "لفظي"
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
      app_role: ["admin", "moderator", "student"],
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
        "كمي",
        "لفظي",
      ],
      question_type: ["multiple_choice", "true_false", "short_answer"],
      test_type: ["قدرات", "تحصيلي"],
      user_role: ["student", "admin"],
    },
  },
} as const
