
// This file needs to exist for compatibility with existing components
// It now redirects to claudeAIService

import { supabase } from "@/integrations/supabase/client";
import { claudeAIService } from './claudeService';
import type { Message } from './claudeService';

// Reexport the claudeAIService as geminiService to maintain compatibility
export const geminiService = {
  sendMessage: claudeAIService.sendMessage.bind(claudeAIService),
  loadChatHistory: claudeAIService.loadChatHistory.bind(claudeAIService),
  saveChatHistory: claudeAIService.saveChatHistory.bind(claudeAIService),
  setApiKey: (apiKey: string) => {
    // Do nothing as we don't want users to change the API key
    console.log("API key settings have been disabled for this application");
  }
};

// Re-export Message interface for compatibility
export type { Message };
export { claudeAIService };
