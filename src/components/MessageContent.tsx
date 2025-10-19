import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface MessageContentProps {
  content: string;
  role: 'user' | 'assistant';
}

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
        remarkPlugins={[remarkGfm]}
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
        blockquote: ({ children }) => (
          <blockquote className="border-r-4 border-primary pr-4 my-3 italic text-muted-foreground">
            {children}
          </blockquote>
        ),
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
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MessageContent;
