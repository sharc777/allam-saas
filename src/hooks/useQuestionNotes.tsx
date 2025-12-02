import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QuestionNote {
  id: string;
  user_id: string;
  question_hash: string;
  exercise_id: string | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export const useQuestionNotes = (exerciseId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all notes for an exercise
  const { data: notes, isLoading } = useQuery({
    queryKey: ["question-notes", exerciseId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from("question_notes")
        .select("*")
        .eq("user_id", user.id);

      if (exerciseId) {
        query = query.eq("exercise_id", exerciseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as QuestionNote[];
    },
    enabled: true,
  });

  // Get note for a specific question
  const getNoteForQuestion = (questionHash: string): string | undefined => {
    return notes?.find(n => n.question_hash === questionHash)?.note;
  };

  // Save note mutation
  const saveNoteMutation = useMutation({
    mutationFn: async ({ 
      questionHash, 
      note, 
      exerciseId: exId 
    }: { 
      questionHash: string; 
      note: string; 
      exerciseId?: string 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if note exists
      const existingNote = notes?.find(n => 
        n.question_hash === questionHash && 
        (exId ? n.exercise_id === exId : true)
      );

      if (existingNote) {
        // Update existing note
        const { error } = await supabase
          .from("question_notes")
          .update({ note, updated_at: new Date().toISOString() })
          .eq("id", existingNote.id);
        if (error) throw error;
      } else {
        // Insert new note
        const { error } = await supabase
          .from("question_notes")
          .insert({
            user_id: user.id,
            question_hash: questionHash,
            exercise_id: exId || null,
            note
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-notes"] });
      toast({
        title: "تم حفظ الملاحظة",
        description: "تم حفظ ملاحظتك بنجاح",
      });
    },
    onError: (error) => {
      console.error("Error saving note:", error);
      toast({
        title: "خطأ في حفظ الملاحظة",
        description: "حدث خطأ أثناء حفظ الملاحظة",
        variant: "destructive",
      });
    }
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (questionHash: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const noteToDelete = notes?.find(n => n.question_hash === questionHash);
      if (!noteToDelete) return;

      const { error } = await supabase
        .from("question_notes")
        .delete()
        .eq("id", noteToDelete.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-notes"] });
      toast({
        title: "تم حذف الملاحظة",
      });
    },
    onError: (error) => {
      console.error("Error deleting note:", error);
      toast({
        title: "خطأ في حذف الملاحظة",
        variant: "destructive",
      });
    }
  });

  return {
    notes,
    isLoading,
    getNoteForQuestion,
    saveNote: saveNoteMutation.mutateAsync,
    deleteNote: deleteNoteMutation.mutateAsync,
    isSaving: saveNoteMutation.isPending,
    isDeleting: deleteNoteMutation.isPending,
  };
};
