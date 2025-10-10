
// This service handles the AI chat functionality
// It connects to the Anthropic Claude API through a Supabase Edge Function

import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

class ClaudeAIService {
  async sendMessage(message: string): Promise<Message> {
    try {
      // Call the Supabase Edge Function to communicate with Anthropic Claude API
      const { data, error } = await supabase.functions.invoke("claude-chat", {
        body: { message }
      });
      
      if (error) throw new Error(error.message);
      
      return {
        id: `claude-${Date.now()}`,
        content: data.response || "Sorry, I couldn't process that request.",
        role: "assistant",
        timestamp: new Date()
      };
    } catch (error) {
      console.error("Error calling Claude API:", error);
      return {
        id: `claude-${Date.now()}`,
        content: "Sorry, there was an error processing your request. Please try again later.",
        role: "assistant",
        timestamp: new Date()
      };
    }
  }

  // Method to load conversation history for a specific chat
  loadChatHistory(chatId: string): Message[] {
    try {
      const messages = localStorage.getItem(`claude-chat-messages-${chatId}`);
      return messages ? JSON.parse(messages) : [];
    } catch (error) {
      console.error("Failed to load chat history:", error);
      return [];
    }
  }

  // Method to save conversation history for a specific chat
  saveChatHistory(chatId: string, messages: Message[]): void {
    try {
      localStorage.setItem(`claude-chat-messages-${chatId}`, JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  }
}

// Export as singleton
export const claudeAIService = new ClaudeAIService();
