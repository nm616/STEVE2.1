import { supabase } from "@/integrations/supabase/client";

export const titleGenerationService = {
  async generateChatTitle(prompt: string): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-chat-title', {
        body: { prompt }
      });

      if (error) {
        console.error('Error calling title generation function:', error);
        return 'New Chat'; // Fallback
      }

      return data?.title || 'New Chat';
    } catch (error) {
      console.error('Error generating chat title:', error);
      return 'New Chat'; // Fallback
    }
  }
};