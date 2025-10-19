import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Send, Loader2, X, Sparkles, BookOpen, Target, HelpCircle, AlertCircle, Maximize2, Minimize2, StopCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import QuickActions from "./QuickActions";
import MessageContent from "./MessageContent";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Question {
  question_text: string;
  options?: string[];
  correct_answer?: string;
  explanation?: string;
  section?: string;
  subject?: string;
  user_answer?: string;
}

interface AITutorProps {
  onClose: () => void;
  mode?: "general" | "review_mistakes" | "focused_practice" | "instant_help";
  initialQuestion?: Question;
}

const AITutor = ({ onClose, mode: initialMode = "general", initialQuestion }: AITutorProps) => {
  const [mode, setMode] = useState<"general" | "review_mistakes" | "focused_practice" | "instant_help">(initialMode);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRequestSent, setAutoRequestSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("🤔 أفكر في أفضل طريقة للشرح...");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch user profile for test type
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("profiles")
        .select("test_type_preference")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch weakness data using supabase.functions.invoke
  const { data: weaknessData, isLoading: isLoadingWeakness } = useQuery({
    queryKey: ["weakness-data", profile?.test_type_preference],
    enabled: !!profile?.test_type_preference,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase.functions.invoke("analyze-weaknesses", {
        body: {
          userId: user.id,
          testType: profile?.test_type_preference || "قدرات",
        },
      });

      if (error) {
        console.error("Failed to fetch weakness data:", error);
        return null;
      }

      return data;
    },
  });

  // Initialize welcome message based on mode
  useEffect(() => {
    if (messages.length === 0) {
      let welcomeMessage = "";
      
      if (mode === "general") {
        welcomeMessage = "مرحباً! أنا مدرسك الذكي الشخصي. ";
        if (weaknessData?.weaknesses?.critical?.length > 0) {
          welcomeMessage += `\n\nلاحظت أن لديك ${weaknessData.weaknesses.critical.length} نقطة ضعف تحتاج اهتماماً:\n`;
          weaknessData.weaknesses.critical.slice(0, 3).forEach((w: any) => {
            welcomeMessage += `• ${w.topic}\n`;
          });
          welcomeMessage += "\nيمكنني مساعدتك في أي منها. ماذا تريد أن نراجع؟";
        } else {
          welcomeMessage += "كيف يمكنني مساعدتك اليوم؟";
        }
      } else if (mode === "instant_help" && initialQuestion) {
        welcomeMessage = `جاري تحليل السؤال وإعداد شرح شامل له... 🎯\n\nسأقدم لك:\n✅ شرح مفصل خطوة بخطوة\n✅ 2-3 أمثلة مشابهة\n✅ شرح للأخطاء الشائعة\n✅ تمرين تطبيقي\n\nيرجى الانتظار قليلاً...`;
      } else {
        welcomeMessage = "مرحباً! جاهز لمساعدتك. كيف يمكنني مساعدتك؟";
      }
      
      setMessages([{ role: "assistant", content: welcomeMessage }]);
    }
  }, [mode, weaknessData, initialQuestion, messages.length]);

  // Auto-send request in instant_help mode
  useEffect(() => {
    if (mode === "instant_help" && initialQuestion && !autoRequestSent && messages.length > 0 && !isLoading) {
      setAutoRequestSent(true);
      // Automatically request full explanation
      setTimeout(() => {
        streamChat("اشرح لي هذا السؤال بالتفصيل مع الأمثلة والأخطاء الشائعة");
      }, 500);
    }
  }, [mode, initialQuestion, autoRequestSent, messages.length, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const streamChat = async (userMessage: string, retryCount = 0) => {
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    // Cycle through loading messages
    const loadingMessages = [
      "🤔 أفكر في أفضل طريقة للشرح...",
      "📝 أقوم بإعداد أمثلة مشابهة...",
      "✍️ أكتب الشرح بعناية...",
    ];
    let msgIndex = 0;
    const loadingInterval = setInterval(() => {
      setLoadingMessage(loadingMessages[msgIndex % loadingMessages.length]);
      msgIndex++;
    }, 3000);

    let assistantMessage = "";
    abortControllerRef.current = new AbortController();

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;
      
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: newMessages,
          mode,
          weaknessData,
          currentQuestion: initialQuestion
        }),
        signal: abortControllerRef.current.signal,
      });

      clearInterval(loadingInterval);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("عدد الطلبات كثير جداً. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.");
        } else if (response.status === 402) {
          throw new Error("انتهى رصيد الخدمة. يرجى التواصل مع الإدارة لإضافة رصيد.");
        } else {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || "فشل الاتصال بالمدرس الذكي");
        }
      }

      if (!response.body) {
        throw new Error("لا يوجد استجابة من المدرس الذكي");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            
            if (content) {
              assistantMessage += content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantMessage,
                };
                return updated;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save conversation to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("ai_conversations").insert({
          user_id: user.id,
          messages: [...newMessages, { role: "assistant", content: assistantMessage }],
          context_type: "general",
          title: userMessage.slice(0, 50),
        });
      }

    } catch (error: any) {
      clearInterval(loadingInterval);
      console.error("Error:", error);
      
      if (error.name === 'AbortError') {
        toast.info("تم إيقاف الرد");
        setMessages((prev) => prev.slice(0, -1));
      } else if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        setError("تحقق من اتصالك بالإنترنت وحاول مرة أخرى.");
        toast.error("مشكلة في الاتصال بالإنترنت");
        setMessages((prev) => prev.slice(0, -1));
      } else if (retryCount < 2 && !error.message.includes("402")) {
        // Retry with exponential backoff (except for payment errors)
        const delay = Math.pow(2, retryCount) * 1000;
        toast.info(`جاري إعادة المحاولة بعد ${delay / 1000} ثانية...`);
        setTimeout(() => {
          setMessages((prev) => prev.slice(0, -2)); // Remove user and assistant message
          streamChat(userMessage, retryCount + 1);
        }, delay);
      } else {
        setError(error instanceof Error ? error.message : "حدث خطأ أثناء التواصل مع المدرس الذكي");
        toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء التواصل مع المدرس الذكي");
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      clearInterval(loadingInterval);
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const retryLastMessage = () => {
    if (messages.length > 0) {
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMessage) {
        setError(null);
        streamChat(lastUserMessage.content);
      }
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    streamChat(input);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (message: string) => {
    if (!isLoading) {
      streamChat(message);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className={`w-full ${isFullscreen ? 'max-w-7xl h-[95vh]' : 'max-w-4xl h-[80vh]'} border-2 shadow-elegant flex flex-col transition-all duration-300`}>
        <CardHeader className="gradient-primary text-primary-foreground flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-6 h-6" />
              المدرس الذكي الشخصي
              <Sparkles className="w-5 h-5 animate-pulse" />
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-white/20"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "تصغير" : "تكبير"}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-white/20"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Mode Selector */}
          <div className="flex gap-2 mt-4 flex-wrap" dir="rtl">
            <Button
              size="sm"
              variant={mode === "general" ? "secondary" : "ghost"}
              className={mode === "general" ? "bg-white/20 text-primary-foreground" : "text-primary-foreground/80 hover:bg-white/10"}
              onClick={() => setMode("general")}
            >
              <BookOpen className="w-4 h-4 ml-2" />
              محادثة عامة
            </Button>
            <Button
              size="sm"
              variant={mode === "review_mistakes" ? "secondary" : "ghost"}
              className={mode === "review_mistakes" ? "bg-white/20 text-primary-foreground" : "text-primary-foreground/80 hover:bg-white/10"}
              onClick={() => setMode("review_mistakes")}
              disabled={!weaknessData?.repeatedMistakes?.length}
            >
              <AlertCircle className="w-4 h-4 ml-2" />
              راجع أخطائي
              {weaknessData?.repeatedMistakes?.length > 0 && (
                <Badge variant="destructive" className="mr-1 bg-red-500">
                  {weaknessData.repeatedMistakes.length}
                </Badge>
              )}
            </Button>
            <Button
              size="sm"
              variant={mode === "focused_practice" ? "secondary" : "ghost"}
              className={mode === "focused_practice" ? "bg-white/20 text-primary-foreground" : "text-primary-foreground/80 hover:bg-white/10"}
              onClick={() => setMode("focused_practice")}
            >
              <Target className="w-4 h-4 ml-2" />
              تدريب مركز
            </Button>
            {initialQuestion && (
              <Button
                size="sm"
                variant={mode === "instant_help" ? "secondary" : "ghost"}
                className={mode === "instant_help" ? "bg-white/20 text-primary-foreground" : "text-primary-foreground/80 hover:bg-white/10"}
                onClick={() => setMode("instant_help")}
              >
                <HelpCircle className="w-4 h-4 ml-2" />
                مساعدة فورية
              </Button>
            )}
          </div>

          {/* Weakness Summary */}
          {weaknessData && !isLoadingWeakness && mode === "general" && weaknessData.weaknesses?.critical?.length > 0 && (
            <div className="mt-3 p-3 bg-white/10 rounded-lg" dir="rtl">
              <p className="text-sm text-primary-foreground/90 font-semibold mb-2">
                📊 نقاط تحتاج تركيزاً:
              </p>
              <div className="flex gap-2 flex-wrap">
                {weaknessData.weaknesses.critical.slice(0, 3).map((w: any, i: number) => (
                  <Badge key={i} variant="destructive" className="bg-red-500/80">
                    {w.topic} ({w.errorCount})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4" dir="rtl">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <MessageContent content={message.content} role={message.role} />
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-secondary-foreground font-bold">أ</span>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start items-start">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                  <Brain className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-lg p-4 flex-1 max-w-[80%]">
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">{loadingMessage}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={stopGeneration}
                    className="mt-2"
                  >
                    <StopCircle className="w-4 h-4 ml-2" />
                    إيقاف
                  </Button>
                </div>
              </div>
            )}
            {error && (
              <div className="flex gap-3 justify-start items-start">
                <div className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-destructive-foreground" />
                </div>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex-1 max-w-[80%]">
                  <p className="text-sm text-destructive mb-3">{error}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={retryLastMessage}
                    className="border-destructive/30 hover:bg-destructive/10"
                  >
                    <RotateCcw className="w-4 h-4 ml-2" />
                    إعادة المحاولة
                  </Button>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <QuickActions
            mode={mode}
            onActionClick={handleQuickAction}
            weaknessData={weaknessData}
            disabled={isLoading}
          />

          {/* Input Area */}
          <div className="border-t p-4 flex-shrink-0" dir="rtl">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="اكتب سؤالك هنا..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1 px-4 py-3 rounded-lg border-2 border-border focus:border-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="gradient-primary text-primary-foreground px-6"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AITutor;
