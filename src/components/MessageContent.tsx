import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import 'katex/dist/katex.min.css';

interface MessageContentProps {
  content: string;
  role: 'user' | 'assistant';
}

// دالة لاستخراج النص من React children
const extractTextFromChildren = (children: React.ReactNode): string => {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }
  if (children && typeof children === 'object' && 'props' in children) {
    return extractTextFromChildren((children as any).props.children);
  }
  return '';
};

// دالة للتعرف على نوع الصندوق من محتوى blockquote
const getAlertType = (text: string): { type: string; icon: string; colors: string } | null => {
  const patterns = [
    { keywords: ['مثال:', 'مثال :', '📝'], type: 'example', icon: '📝', colors: 'bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-800' },
    { keywords: ['ملاحظة:', 'ملاحظة :', '💡'], type: 'note', icon: '💡', colors: 'bg-yellow-50 border-yellow-300 dark:bg-yellow-950/30 dark:border-yellow-800' },
    { keywords: ['تنبيه:', 'تنبيه :', '⚠️', 'انتباه:'], type: 'warning', icon: '⚠️', colors: 'bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-800' },
    { keywords: ['الحل:', 'الحل :', '✅', 'الجواب:'], type: 'solution', icon: '✅', colors: 'bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-800' },
    { keywords: ['قاعدة:', 'قاعدة :', '📌', 'تذكر:'], type: 'rule', icon: '📌', colors: 'bg-purple-50 border-purple-300 dark:bg-purple-950/30 dark:border-purple-800' },
  ];
  
  for (const pattern of patterns) {
    if (pattern.keywords.some(keyword => text.includes(keyword))) {
      return { type: pattern.type, icon: pattern.icon, colors: pattern.colors };
    }
  }
  return null;
};

const MessageContent = ({ content, role }: MessageContentProps) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    toast.success('تم النسخ');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (role === 'user') {
    return <p className="whitespace-pre-wrap break-words">{content}</p>;
  }

  return (
    <div className="max-w-full overflow-x-auto break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');
          const codeId = `code-${Math.random()}`;
          const isInline = !className && !codeString.includes('\n');
          
          return !isInline && match ? (
            <div className="relative my-4 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
                <span className="text-xs text-gray-300">{match[1]}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-gray-300 hover:text-white"
                  onClick={() => copyToClipboard(codeString, codeId)}
                >
                  {copiedCode === codeId ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                customStyle={{ margin: 0, borderRadius: 0 }}
                {...props}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code
              className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          );
        },
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-bold mt-5 mb-3 text-foreground">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="mb-3 leading-relaxed">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-3 space-y-1 mr-4">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-3 space-y-1 mr-4">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="mb-1">{children}</li>
        ),
        blockquote: ({ children }) => {
          const textContent = extractTextFromChildren(children);
          const alertType = getAlertType(textContent);
          
          if (alertType) {
            return (
              <div className={`my-4 p-4 rounded-lg border-r-4 ${alertType.colors}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{alertType.icon}</span>
                  <div className="flex-1 [&>p]:mb-0 [&>p:first-child]:mt-0">
                    {children}
                  </div>
                </div>
              </div>
            );
          }
          
          return (
            <blockquote className="border-r-4 border-primary pr-4 my-3 italic text-muted-foreground">
              {children}
            </blockquote>
          );
        },
        strong: ({ children }) => (
          <strong className="font-bold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic">{children}</em>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="my-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/70 border-b border-border">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-border">
            {children}
          </tbody>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-muted/30 transition-colors even:bg-muted/10">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-3 text-right font-bold text-foreground border-l border-border first:border-l-0">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-3 text-right border-l border-border first:border-l-0">
            {children}
          </td>
        ),
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MessageContent;
