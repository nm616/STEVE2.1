import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const { message, sessionId = null, uploads = null } = requestData;

    if (!message && (!uploads || uploads.length === 0)) {
      throw new Error("No message or files provided");
    }

    const questionText = message || "Please analyze the attached file(s).";

    console.log("Streaming request:", {
      hasMessage: !!message,
      hasSessionId: !!sessionId,
      uploadsCount: uploads?.length || 0,
      uploads: uploads ? uploads.map((u: any) => ({
        type: u.type,
        name: u.name,
        mime: u.mime,
        dataLength: u.data?.length || 0
      })) : null
    });

    const flowiseData: any = {
      question: questionText,
      streaming: true,
      overrideConfig: {}
    };

    if (sessionId) {
      flowiseData.overrideConfig.sessionId = sessionId;
    }

    if (uploads && uploads.length > 0) {
      flowiseData.uploads = uploads;
    }

    const flowiseResponse = await fetch(
      "https://flowise.elevate-hub.app/api/v1/prediction/13f3b740-1417-4be4-b6e6-219735d9061d",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(flowiseData)
      }
    );

    if (!flowiseResponse.ok) {
      throw new Error(`Flowise error: ${flowiseResponse.status}`);
    }

    // Pass through the stream
    return new Response(flowiseResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
