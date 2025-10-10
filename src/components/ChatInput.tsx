
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import FileUploader, { FileInfo } from "@/components/FileUploader";

interface ChatInputProps {
  onSendMessage: (message: string, files?: FileInfo[]) => Promise<void>;
  isLoading: boolean;
  inputValue?: string;
  currentChatId: string | null;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  inputValue = "",
  currentChatId
}) => {
  const [input, setInput] = useState(inputValue);
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if there's text to send or files to upload
    if (!input.trim() && selectedFiles.length === 0) return;

    // Check if there's an active chat
    if (!currentChatId) {
      toast.error("Please create a new chat first.");
      return;
    }

    try {
      await onSendMessage(input, selectedFiles.length > 0 ? selectedFiles : undefined);
      setInput("");
      setSelectedFiles([]); // Clear files after sending
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  return (
    <div className="border-t border-border bg-background p-2 sm:p-4 w-full">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex flex-col gap-2 w-full"
      >
        {/* File uploader */}
        <FileUploader
          onFileSelect={setSelectedFiles}
          selectedFiles={selectedFiles}
          isLoading={isLoading}
        />

        {/* Message input row */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 flex">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentChatId ? "Message Claude... (Shift+Enter for new line)" : "Create a new chat to start messaging..."}
              className="w-full min-h-[40px] max-h-[120px] resize-none"
              disabled={isLoading || !currentChatId}
              rows={1}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || (!input.trim() && selectedFiles.length === 0) || !currentChatId}
            className="bg-elevate-primary hover:bg-elevate-dark shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;
