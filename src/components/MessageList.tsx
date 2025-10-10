
import React from "react";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";
import WelcomeScreen from "./WelcomeScreen";
import { Message } from "@/services/elevateAIService";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  currentThinking?: string;
  onSuggestionClick?: (message: string) => void;
  isActMode?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
  currentThinking,
  onSuggestionClick,
  isActMode = false
}) => {
  if (messages.length === 0 && !isLoading) {
    return <WelcomeScreen onSuggestionClick={onSuggestionClick} />;
  }

  // Check if the last message is an assistant message that's currently being streamed
  const lastMessage = messages[messages.length - 1];
  const isLastMessageStreaming = isLoading && lastMessage?.role === 'assistant' && lastMessage?.content !== '';

  return (
    <div className="flex-1 overflow-y-auto px-4">
      <div className="flex flex-col gap-2 py-4">
        {messages.map((message, index) => {
        const isStreaming = isLastMessageStreaming && index === messages.length - 1;
        return (
          <ChatMessage
            key={message.id}
            message={message}
            isStreaming={isStreaming}
          />
        );
        })}
        {isLoading && !isLastMessageStreaming && (
          <TypingIndicator
            isActMode={isActMode}
            thinkingText={currentThinking}
          />
        )}
      </div>
    </div>
  );
};

export default MessageList;
