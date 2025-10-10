
import { supabase } from "@/integrations/supabase/client";

export const flowiseService = {
  async deleteChatSession(sessionId: string): Promise<{ success: boolean; warning?: string }> {
    try {
      console.log(`Attempting to delete Flowise session: ${sessionId}`);
      
      const { data, error } = await supabase.functions.invoke("delete-flowise-chat", {
        body: { sessionId }
      });
      
      if (error) {
        console.error("Error calling delete-flowise-chat function:", error);
        return { success: true, warning: `Flowise deletion failed: ${error.message}` };
      }
      
      if (data?.warning) {
        console.warn("Flowise deletion warning:", data.warning);
        return { success: true, warning: data.warning };
      }
      
      console.log("Successfully deleted Flowise chat session");
      return { success: true };
    } catch (error) {
      console.error("Error in flowiseService.deleteChatSession:", error);
      return { success: true, warning: `Flowise deletion error: ${error.message}` };
    }
  }
};
