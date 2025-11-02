import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Play, 
  RefreshCw,
  FileText,
  Sparkles
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function ContentParser() {
  const queryClient = useQueryClient();
  const [parsingId, setParsingId] = useState<string | null>(null);
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  // Fetch all content
  const { data: allContent, isLoading } = useQuery({
    queryKey: ["admin-all-content"],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_content")
        .select("*")
        .order("day_number", { ascending: true });
      return data || [];
    },
  });

  // Parse single content mutation
  const parseMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const content = allContent?.find(c => c.id === contentId);
      if (!content) throw new Error("Content not found");

      // Update status
      await supabase
        .from("daily_content")
        .update({ 
          parse_status: "parsing",
          last_parse_attempt: new Date().toISOString()
        })
        .eq("id", contentId);

      const { data, error } = await supabase.functions.invoke("parse-lesson-content", {
        body: {
          contentText: content.content_text,
          title: content.title,
        },
      });

      if (error) throw error;
      if (!data?.sections || data.sections.length === 0) {
        throw new Error("No sections returned");
      }

      // Update with sections
      await supabase
        .from("daily_content")
        .update({
          sections: data.sections,
          parse_status: "completed",
          parse_error: null,
        })
        .eq("id", contentId);

      return data;
    },
    onSuccess: (data, contentId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-content"] });
      toast({
        title: "✅ تم التحليل بنجاح",
        description: `تم إنشاء ${data.sections.length} أقسام`,
      });
      setParsingId(null);
    },
    onError: (error: any, contentId) => {
      supabase
        .from("daily_content")
        .update({
          parse_status: "failed",
          parse_error: error.message,
        })
        .eq("id", contentId);
      
      toast({
        title: "❌ فشل التحليل",
        description: error.message,
        variant: "destructive",
      });
      setParsingId(null);
    },
  });

  // Bulk parse all
  const handleBulkParse = async () => {
    const unparsedContent = allContent?.filter(
      (c) => !c.sections || (c.sections as any).length === 0
    );

    if (!unparsedContent || unparsedContent.length === 0) {
      toast({
        title: "لا يوجد محتوى للتحليل",
        description: "جميع الدروس محللة بالفعل",
      });
      return;
    }

    setBulkParsing(true);
    setBulkProgress({ current: 0, total: unparsedContent.length });

    for (let i = 0; i < unparsedContent.length; i++) {
      const content = unparsedContent[i];
      try {
        await parseMutation.mutateAsync(content.id);
        setBulkProgress({ current: i + 1, total: unparsedContent.length });
        
        // Wait 2 seconds between requests to avoid rate limiting
        if (i < unparsedContent.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`Failed to parse content ${content.id}:`, error);
      }
    }

    setBulkParsing(false);
    toast({
      title: "✅ اكتملت المعالجة الجماعية",
      description: `تم معالجة ${unparsedContent.length} درس`,
    });
  };

  const getStatusBadge = (content: any) => {
    const sections = content.sections as any;
    const hasSections = sections && Array.isArray(sections) && sections.length > 0;

    if (content.parse_status === "parsing" || parsingId === content.id) {
      return (
        <Badge className="bg-blue-500/20 text-blue-700">
          <Loader2 className="w-3 h-3 ml-1 animate-spin" />
          جاري التحليل
        </Badge>
      );
    }

    if (content.parse_status === "failed") {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 ml-1" />
          فشل
        </Badge>
      );
    }

    if (hasSections) {
      return (
        <Badge className="bg-green-500/20 text-green-700">
          <CheckCircle2 className="w-3 h-3 ml-1" />
          {sections.length} أقسام
        </Badge>
      );
    }

    if (!content.content_text) {
      return (
        <Badge variant="outline">
          <FileText className="w-3 h-3 ml-1" />
          لا يوجد محتوى
        </Badge>
      );
    }

    return (
      <Badge variant="outline">
        <Clock className="w-3 h-3 ml-1" />
        بانتظار التحليل
      </Badge>
    );
  };

  const unparsedCount = allContent?.filter(
    (c) => c.content_text && (!c.sections || (c.sections as any).length === 0)
  ).length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            معالج المحتوى بالذكاء الاصطناعي
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="text-left">
              <p className="text-sm text-muted-foreground">
                {allContent?.length || 0} درس • {unparsedCount} بحاجة للتحليل
              </p>
            </div>
            <Button
              onClick={handleBulkParse}
              disabled={bulkParsing || unparsedCount === 0}
              className="gradient-primary text-primary-foreground"
            >
              {bulkParsing ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  معالجة جماعية...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 ml-2" />
                  معالجة الكل ({unparsedCount})
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {bulkParsing && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>المعالجة الجماعية قيد التنفيذ...</span>
                  <span className="font-bold">
                    {bulkProgress.current} / {bulkProgress.total}
                  </span>
                </div>
                <Progress 
                  value={(bulkProgress.current / bulkProgress.total) * 100} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {allContent?.map((content) => (
            <div
              key={content.id}
              className="flex items-center justify-between p-4 border-2 rounded-lg hover:border-primary/30 transition-smooth"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-bold text-lg">
                    اليوم {content.day_number}: {content.title}
                  </h4>
                  {getStatusBadge(content)}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{content.test_type}</span>
                  {content.content_text && (
                    <span>• {content.content_text.length} حرف</span>
                  )}
                  {content.last_parse_attempt && (
                    <span>
                      • آخر محاولة:{" "}
                      {new Date(content.last_parse_attempt).toLocaleDateString("ar")}
                    </span>
                  )}
                </div>

                {content.parse_error && (
                  <p className="text-xs text-destructive mt-2">
                    خطأ: {content.parse_error}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setParsingId(content.id);
                    parseMutation.mutate(content.id);
                  }}
                  disabled={
                    parsingId === content.id || 
                    !content.content_text ||
                    bulkParsing
                  }
                >
                  {parsingId === content.id ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري التحليل
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 ml-2" />
                      تحليل
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
