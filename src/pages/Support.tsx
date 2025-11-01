import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { Loader2, MessageSquare, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type SupportTicket = Database['public']['Tables']['support_tickets']['Row'];

const Support = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("technical");

  const { data: tickets, isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SupportTicket[];
    },
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!subject.trim() || !description.trim()) {
        throw new Error("الرجاء ملء جميع الحقول");
      }

      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          subject: subject.trim(),
          description: description.trim(),
          category,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("تم إرسال التذكرة بنجاح");
      setSubject("");
      setDescription("");
      setCategory("technical");
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "حدث خطأ أثناء إرسال التذكرة");
    },
  });

  const statusConfig = {
    open: { label: "مفتوحة", icon: Clock, color: "default" },
    in_progress: { label: "قيد المعالجة", icon: MessageSquare, color: "secondary" },
    waiting_user: { label: "بانتظار الرد", icon: Clock, color: "default" },
    resolved: { label: "محلولة", icon: CheckCircle2, color: "default" },
    closed: { label: "مغلقة", icon: XCircle, color: "secondary" },
  } as const;

  const categoryLabels = {
    technical: "مشكلة تقنية",
    billing: "الفوترة والاشتراكات",
    content: "المحتوى التعليمي",
    account: "الحساب",
    other: "أخرى",
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold mb-2">الدعم الفني</h1>
            <p className="text-muted-foreground">
              نحن هنا لمساعدتك. قم بإنشاء تذكرة دعم وسنرد عليك في أقرب وقت ممكن.
            </p>
          </div>

          {/* New Ticket Form */}
          <Card>
            <CardHeader>
              <CardTitle>إنشاء تذكرة دعم جديدة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">الموضوع</label>
                <Input
                  placeholder="اكتب موضوع المشكلة"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">التصنيف</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">الوصف</label>
                <Textarea
                  placeholder="اشرح المشكلة بالتفصيل..."
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <Button 
                onClick={() => createTicket.mutate()}
                disabled={createTicket.isPending || !subject.trim() || !description.trim()}
                className="w-full sm:w-auto"
              >
                {createTicket.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                إرسال التذكرة
              </Button>
            </CardContent>
          </Card>

          {/* Tickets List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">تذاكر الدعم الخاصة بك</h2>
            
            {isLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </CardContent>
              </Card>
            ) : tickets && tickets.length > 0 ? (
              tickets.map((ticket) => {
                const StatusIcon = statusConfig[ticket.status as keyof typeof statusConfig]?.icon || Clock;
                return (
                  <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg">{ticket.subject}</h3>
                            <Badge variant="outline" className="text-xs">
                              {ticket.ticket_number}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {ticket.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={statusConfig[ticket.status as keyof typeof statusConfig]?.color || "default"}>
                            <StatusIcon className="w-3 h-3 ml-1" />
                            {statusConfig[ticket.status as keyof typeof statusConfig]?.label || ticket.status}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {categoryLabels[ticket.category as keyof typeof categoryLabels]}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString('ar-SA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  لا توجد تذاكر دعم سابقة. قم بإنشاء تذكرة جديدة إذا كنت بحاجة للمساعدة.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
