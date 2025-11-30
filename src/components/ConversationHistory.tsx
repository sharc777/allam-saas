import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trash2, MessageSquare, BookOpen, Target, AlertCircle, Loader2 } from "lucide-react";
import { useConversationHistory, type Conversation } from "@/hooks/useConversationHistory";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConversationHistoryProps {
  onLoadConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
  onClose: () => void;
}

const ConversationHistory = ({
  onLoadConversation,
  onNewConversation,
  onClose,
}: ConversationHistoryProps) => {
  const { conversations, isLoading, deleteConversation, isDeletingConversation } =
    useConversationHistory();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  const handleDeleteClick = (conversationId: string) => {
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      deleteConversation(conversationToDelete);
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  const getContextIcon = (contextType: string | null) => {
    switch (contextType) {
      case "quiz_help":
        return <AlertCircle className="w-4 h-4" />;
      case "topic_explanation":
        return <BookOpen className="w-4 h-4" />;
      case "study_plan":
        return <Target className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getContextLabel = (contextType: string | null) => {
    switch (contextType) {
      case "quiz_help":
        return "مساعدة في اختبار";
      case "topic_explanation":
        return "شرح موضوع";
      case "study_plan":
        return "خطة دراسية";
      default:
        return "محادثة عامة";
    }
  };

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold mb-3">📜 سجل المحادثات</h3>
        <Button
          onClick={onNewConversation}
          className="w-full gradient-primary text-primary-foreground"
          size="sm"
        >
          + محادثة جديدة
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">لا توجد محادثات سابقة</p>
            <p className="text-sm text-muted-foreground mt-1">
              ابدأ محادثة جديدة لتظهر هنا
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => {
              const messageCount = Array.isArray(conversation.messages)
                ? conversation.messages.length
                : 0;
              const timeAgo = formatDistanceToNow(new Date(conversation.updated_at), {
                addSuffix: true,
                locale: ar,
              });

              return (
                <div
                  key={conversation.id}
                  className="p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                  onClick={() => {
                    onLoadConversation(conversation);
                    onClose();
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getContextIcon(conversation.context_type)}
                      <h4 className="font-medium text-sm truncate flex-1">
                        {conversation.title || "محادثة بدون عنوان"}
                      </h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(conversation.id);
                      }}
                      disabled={isDeletingConversation}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">
                      {getContextLabel(conversation.context_type)}
                    </Badge>
                    <span>•</span>
                    <span>{timeAgo}</span>
                    <span>•</span>
                    <span>{messageCount} رسالة</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه المحادثة؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ConversationHistory;
