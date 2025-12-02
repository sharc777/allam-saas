import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Save, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface QuestionNoteProps {
  questionHash: string;
  exerciseId?: string;
  existingNote?: string;
  onSave: (note: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  isLoading?: boolean;
  compact?: boolean;
}

export const QuestionNote = ({
  questionHash,
  existingNote,
  onSave,
  onDelete,
  isLoading = false,
  compact = false
}: QuestionNoteProps) => {
  const [note, setNote] = useState(existingNote || "");
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNote(existingNote || "");
  }, [existingNote]);

  const handleSave = async () => {
    if (!note.trim()) return;
    setIsSaving(true);
    try {
      await onSave(note.trim());
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsSaving(true);
    try {
      await onDelete();
      setNote("");
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const hasNote = !!existingNote;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasNote ? "secondary" : "ghost"}
          size={compact ? "sm" : "default"}
          className={cn(
            "gap-2",
            hasNote && "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
          )}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <StickyNote className={cn("w-4 h-4", hasNote && "fill-current")} />
          )}
          {!compact && (hasNote ? "عرض الملاحظة" : "إضافة ملاحظة")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">ملاحظاتي على السؤال</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <Textarea
            placeholder="اكتب ملاحظتك هنا... مثل: تذكر قاعدة معينة، نقطة مهمة، خطأ شائع..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[100px] resize-none text-right"
            dir="rtl"
          />
          
          <div className="flex gap-2 justify-end">
            {hasNote && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isSaving}
              >
                حذف
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!note.trim() || isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              حفظ
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Display-only note component for results pages
export const QuestionNoteDisplay = ({ note }: { note: string }) => {
  if (!note) return null;
  
  return (
    <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
      <div className="flex items-start gap-2">
        <StickyNote className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-yellow-700 dark:text-yellow-300">{note}</p>
      </div>
    </div>
  );
};
