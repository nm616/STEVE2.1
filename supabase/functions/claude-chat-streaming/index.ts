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

    // Create AbortController with 5-minute timeout for long operations (images, thinking, etc.)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

    let flowiseResponse;
    try {
      flowiseResponse = await fetch(
        "https://flowise.elevate-hub.app/api/v1/prediction/13f3b740-1417-4be4-b6e6-219735d9061d",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(flowiseData),
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 5 minutes. The AI operation is taking longer than expected.');
      }
      throw error;
    }

    if (!flowiseResponse.ok) {
      throw new Error(`Flowise error: ${flowiseResponse.status}`);
    }

    // Create a custom stream with heartbeat to prevent timeout
    const stream = new ReadableStream({
      async start(controller) {
        const reader = flowiseResponse.body!.getReader();
        const encoder = new TextEncoder();
        let heartbeatInterval: number | undefined;

        // Send heartbeat every 15 seconds to keep connection alive
        heartbeatInterval = setInterval(() => {
          try {
            // SSE comment format - ignored by clients, keeps connection alive
            controller.enqueue(encoder.encode(':keepalive\n\n'));
            console.log('Sent heartbeat');
          } catch (e) {
            console.error('Error sending heartbeat:', e);
          }
        }, 15000);

        try {
          const decoder = new TextDecoder();
          let chunkCount = 0;
          let totalBytes = 0;
          let lastChunkTime = Date.now();

          console.log('Starting to read from Flowise stream...');

          while (true) {
            const { done, value } = await reader.read();
            const currentTime = Date.now();
            const timeSinceLastChunk = currentTime - lastChunkTime;
            lastChunkTime = currentTime;

            if (done) {
              console.log(`Flowise stream DONE after ${chunkCount} chunks, ${totalBytes} total bytes`);
              console.log(`Last chunk was ${timeSinceLastChunk}ms ago`);
              break;
            }

            chunkCount++;
            totalBytes += value.length;

            // Log what we're receiving from Flowise
            const chunkText = decoder.decode(value, { stream: true });
            console.log(`Chunk ${chunkCount} (${value.length} bytes, +${timeSinceLastChunk}ms):`, chunkText.substring(0, 300));

            // Log if this looks like an end marker
            if (chunkText.includes('"event":"end"') || chunkText.includes('[DONE]')) {
              console.log('⚠️ Detected END marker in chunk');
            }

            // Forward all data from Flowise to client
            controller.enqueue(value);
          }
        } catch (error) {
          console.error('Error reading Flowise stream:', error);
          controller.error(error);
        } finally {
          // Clean up heartbeat interval
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            console.log('Cleared heartbeat interval');
          }
          controller.close();
        }
      }
    });

    return new Response(stream, {
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
