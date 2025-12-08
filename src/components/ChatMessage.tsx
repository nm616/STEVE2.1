
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Bot, User, Brain, ChevronDown, ChevronRight, Download, Maximize2, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatAIContent } from "@/utils/contentFormatter";
import { Dialog, DialogContent, DialogTrigger, DialogClose, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FileMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  url?: string;
  path: string;
}

interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    role: "user" | "assistant";
    timestamp: Date;
    file_metadata?: FileMetadata[];
    thinking?: string;
  };
  isStreaming?: boolean;
}

const CodeBlock = ({ children, className, ...props }: any) => {
  const [copied, setCopied] = React.useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // If it's a code block (has language), render with syntax highlighting and copy button
  if (match) {
    return (
      <div className="relative group">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          {...props}
        >
          {code}
        </SyntaxHighlighter>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 bg-gray-600 hover:bg-gray-500 text-white text-xs font-bold py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
    );
  }

  // For inline code, just render normally
  return (
    <code className={cn("bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded text-sm", className)} {...props}>
      {children}
    </code>
  );
};

const ImageRenderer = ({ src, alt }: React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>) => {
  if (!src) return null;

  // Convert direct Flowise URLs to use the proxy (for backward compatibility with old messages)
  const getProxiedUrl = (url: string): string => {
    // Check if it's a direct Flowise image URL
    const flowiseImagePattern = /https:\/\/flowise\.elevate-hub\.app\/api\/v1\/chatflows\/[^/]+\/images\/(.+)/;
    const match = url.match(flowiseImagePattern);

    if (match && match[1]) {
      const fileName = match[1];
      return `https://yscpcikasejxqjyadszh.supabase.co/functions/v1/proxy-image?fileName=${fileName}`;
    }

    // Already a proxy URL or external URL, return as-is
    return url;
  };

  const proxiedSrc = getProxiedUrl(src);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(proxiedSrc);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = alt || 'generated-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <span className="relative group cursor-pointer inline-block max-w-full my-4 rounded-lg overflow-hidden border border-border shadow-sm hover:shadow-md transition-all align-middle">
          <img
            src={proxiedSrc}
            alt={alt || "AI Generated Image"}
            className="max-w-full h-auto max-h-[400px] object-contain bg-muted"
            loading="lazy"
          />
          <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" className="h-8 gap-2 pointer-events-none">
              <Maximize2 className="w-4 h-4" />
              View
            </Button>
            <Button variant="secondary" size="sm" className="h-8 gap-2 pointer-events-auto" onClick={handleDownload}>
              <Download className="w-4 h-4" />
              Download
            </Button>
          </span>
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-transparent border-none shadow-none flex items-center justify-center [&>button]:hidden" aria-describedby="image-preview-description">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <div id="image-preview-description" className="sr-only">Full screen view of the generated image</div>
        <div className="relative w-full h-full flex items-center justify-center">
           <img
            src={proxiedSrc}
            alt={alt || "Full view"}
            className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl"
          />
          <div className="absolute -top-4 -right-4 flex gap-2">
             <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full bg-background/80 backdrop-blur-sm"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
              </Button>
              <DialogClose asChild>
                <Button variant="outline" size="icon" className="rounded-full bg-background/80 backdrop-blur-sm">
                  <X className="w-4 h-4" />
                </Button>
              </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isStreaming = false }) => {
  const isUser = message.role === "user";
  const [showThinking, setShowThinking] = useState(false);

  // Format AI responses for better readability
  const formattedContent = isUser ? message.content : formatAIContent(message.content);
  const hasThinking = !isUser && message.thinking && message.thinking.trim().length > 0;

  // Auto-expand thinking when streaming starts or updates
  useEffect(() => {
    if (isStreaming && hasThinking) {
      setShowThinking(true);
    }
  }, [isStreaming, hasThinking]);

  return (
    <div
      className={cn(
        "flex w-full gap-3 md:gap-4 p-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar for AI messages (on left) */}
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0 bg-elevate-primary">
          <AvatarFallback className="bg-elevate-primary">
            <Bot className="h-5 w-5 text-white" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "flex flex-col space-y-2 text-sm md:text-base",
          isUser ? "items-end" : "items-start",
          isUser
            ? "max-w-[85%] sm:max-w-[80%] md:max-w-[75%]"
            : "max-w-[92%] sm:max-w-[90%] md:max-w-[85%]"
        )}
      >
        {/* Thinking section for AI messages */}
        {hasThinking && (
          <div className="w-full">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2 select-none"
            >
              {showThinking ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Brain className={cn("h-3 w-3", isStreaming && "animate-pulse text-elevate-primary")} />
              <span className={cn(isStreaming && "text-elevate-primary font-medium")}>
                {isStreaming ? "Thinking process..." : "View thinking process"}
              </span>
            </button>
            {showThinking && (
              <div className={cn(
                "rounded-lg px-4 py-3 mb-3 text-xs md:text-sm whitespace-pre-wrap border",
                "bg-muted/30 border-border/50 text-muted-foreground/90",
                "shadow-inner max-h-[300px] overflow-y-auto custom-scrollbar"
              )}>
                {message.thinking}
                {isStreaming && (
                   <span className="inline-block w-1.5 h-3 ml-1 bg-current animate-pulse align-middle" />
                )}
              </div>
            )}
          </div>
        )}

        <div
          className={cn(
            "rounded-lg px-4 py-3 w-full space-y-3 prose prose-slate dark:prose-invert max-w-none",
            isUser
              ? "bg-elevate-userBubble text-white prose-invert"
              : "bg-card text-card-foreground dark:text-card-foreground border border-border shadow-sm"
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: CodeBlock,
              img: ImageRenderer,
              table: ({ children, ...props }) => (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full border-collapse border border-border" {...props}>
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children, ...props }) => (
                <thead className="bg-muted" {...props}>
                  {children}
                </thead>
              ),
              tbody: ({ children, ...props }) => (
                <tbody {...props}>
                  {children}
                </tbody>
              ),
              tr: ({ children, ...props }) => (
                <tr className="border-b border-border hover:bg-muted/50" {...props}>
                  {children}
                </tr>
              ),
              th: ({ children, ...props }) => (
                <th className="border border-border px-4 py-2 text-left font-semibold bg-muted" {...props}>
                  {children}
                </th>
              ),
              td: ({ children, ...props }) => (
                <td className="border border-border px-4 py-2" {...props}>
                  {children}
                </td>
              ),
            }}
          >
            {formattedContent}
          </ReactMarkdown>
          {isStreaming && !isUser && (
            <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>

      {/* Avatar for user messages (on right) */}
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0 bg-elevate-userBubble">
          <AvatarFallback className="bg-elevate-userBubble">
            <User className="h-5 w-5 text-white" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default ChatMessage;
