import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  messages: Message[];
  created_at: string;
  updated_at: string;
  context_type: string | null;
}

export const useConversationHistory = () => {
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations, isLoading, error } = useQuery({
    queryKey: ["ai-conversations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []).map(conv => ({
        ...conv,
        messages: conv.messages as unknown as Message[]
      })) as Conversation[];
    },
  });

  // Delete conversation
  const deleteConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("ai_conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      toast.success("تم حذف المحادثة بنجاح");
    },
    onError: (error) => {
      console.error("Failed to delete conversation:", error);
      toast.error("فشل حذف المحادثة");
    },
  });

  return {
    conversations: conversations || [],
    isLoading,
    error,
    deleteConversation: deleteConversation.mutate,
    isDeletingConversation: deleteConversation.isPending,
  };
};
