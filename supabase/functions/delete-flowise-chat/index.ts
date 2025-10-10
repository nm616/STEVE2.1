
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use the new Heroku-hosted Flowise base URL and API key
    const flowiseBaseUrl = 'http://54.147.188.114:3000/api/v1/';
    const flowiseApiKey = '7s1bHN5j80EbVnSIh6wxwlz74lY6iFbwBmx3tw1VTEM';
    
    console.log(`Attempting to delete Flowise chatflow: ${sessionId}`);
    
    // Delete the chatflow using the correct endpoint
    const response = await fetch(`${flowiseBaseUrl}/chatflows/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${flowiseApiKey}`,
        'Accept': '*/*'
      },
    });

    if (response.ok) {
      console.log(`Successfully deleted Flowise chatflow: ${sessionId}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Chatflow deleted from Flowise' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      const errorText = await response.text();
      console.error(`Failed to delete Flowise chatflow ${sessionId}:`, response.status, errorText);
      
      // Return success even if Flowise deletion fails to avoid blocking Supabase deletion
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: `Flowise deletion failed: ${response.status} - ${errorText}` 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Error in delete-flowise-chat function:', error);
    
    // Return success even if there's an error to avoid blocking Supabase deletion
    return new Response(
      JSON.stringify({ 
        success: true, 
        warning: `Flowise deletion error: ${error.message}` 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
