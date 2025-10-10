
import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Brain } from "lucide-react";

interface TypingIndicatorProps {
  isActMode?: boolean;
  thinkingText?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isActMode = false, thinkingText }) => {
  const hasThinking = thinkingText && thinkingText.trim().length > 0;

  return (
    <div className="flex w-full gap-3 md:gap-4 p-4">
      <Avatar className="h-8 w-8 shrink-0 bg-elevate-primary">
        <AvatarFallback className="bg-elevate-primary">
          <Bot className="h-5 w-5 text-white" />
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-2 max-w-[85%]">
        {hasThinking ? (
          <div className="rounded-lg px-4 py-3 bg-card text-card-foreground border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
              <Brain className="h-4 w-4 animate-pulse" />
              <span>Thinking...</span>
            </div>
            <div className="text-sm text-muted-foreground italic whitespace-pre-wrap">
              {thinkingText}
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-1 bg-elevate-bubble text-elevate-primary px-4 py-3 rounded-lg">
            <div className="h-2 w-2 rounded-full bg-elevate-primary animate-pulse-dot-1" />
            <div className="h-2 w-2 rounded-full bg-elevate-primary animate-pulse-dot-2" />
            <div className="h-2 w-2 rounded-full bg-elevate-primary animate-pulse-dot-3" />
          </div>
        )}

        {isActMode && (
          <div className="text-xs text-muted-foreground px-4">
            Act mode: AI agent is performing actions, this may take up to 5 minutes...
          </div>
        )}
      </div>
    </div>
  );
};

export default TypingIndicator;
