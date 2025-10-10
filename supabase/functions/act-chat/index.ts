
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function queryFlowise(data: any) {
  // Create an AbortController with a 5-minute timeout for Act mode operations
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

  try {
    const response = await fetch(
      "https://flowise.elevate-hub.app/api/v1/prediction/21beb3b8-04b9-45ff-9a05-54a4f3aac59a",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data),
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    const result = await response.json();
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out after 5 minutes. The AI agent operation is taking longer than expected.');
    }
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const { message, sessionId = null, uploads = null } = requestData;

    if (!message && (!uploads || uploads.length === 0)) {
      throw new Error("No message or files provided");
    }

    // If no text message but files are present, use a default message
    const questionText = message || "Please analyze the attached file(s).";

    console.log("Starting Act Flowise API call with message:",
      message ? message.substring(0, 50) + "..." : "No text message");
    console.log("Full request data:", JSON.stringify({
      hasMessage: !!message,
      hasSessionId: !!sessionId,
      uploadsCount: uploads?.length || 0
    }));

    if (sessionId) {
      console.log("Using session ID:", sessionId);
    } else {
      console.log("No session ID provided, Flowise will create new session");
    }

    if (uploads && uploads.length > 0) {
      console.log(`Received ${uploads.length} file(s) to upload`);
      uploads.forEach((upload: any, index: number) => {
        console.log(`File ${index + 1}: ${upload.name} (${upload.mime}), type: ${upload.type}, hasData: ${!!upload.data}`);
      });
    }

    // Prepare the data for Flowise API with sessionId in overrideConfig
    const flowiseData: any = {
      question: questionText,
      overrideConfig: {}
    };

    // Add session ID to overrideConfig if available
    if (sessionId) {
      flowiseData.overrideConfig.sessionId = sessionId;
    }

    // Add uploads if available
    if (uploads && uploads.length > 0) {
      flowiseData.uploads = uploads;
    }

    // Make the API request to Flowise with extended timeout
    const response = await queryFlowise(flowiseData);

    console.log("Act Flowise API response received successfully");
    console.log("Raw response structure:", JSON.stringify(response, null, 2));
    
    // Extract the response text and session ID from Flowise response
    let responseText = "";
    let returnedSessionId = null;
    
    // Handle Sonnet 4 extended thinking format - the response.text contains a JSON string
    if (response.text && typeof response.text === 'string') {
      try {
        // Try to parse the JSON string
        const parsedText = JSON.parse(response.text);
        console.log("Parsed response.text as JSON:", parsedText);
        
        if (Array.isArray(parsedText)) {
          console.log("Detected Sonnet 4 extended thinking format in parsed JSON");
          const textParts = parsedText
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          responseText = textParts.join("");
          console.log("Filtered out thinking parts, extracted text response:", responseText.substring(0, 100) + "...");
        } else {
          // If it's not an array, treat it as regular text
          responseText = response.text;
          console.log("Using string response.text as-is");
        }
      } catch (parseError) {
        // If JSON parsing fails, treat it as regular text
        console.log("Failed to parse response.text as JSON, using as string:", parseError);
        responseText = response.text;
      }
    } else if (response.answer) {
      responseText = response.answer;
      console.log("Using response.answer");
    } else if (response.response) {
      responseText = response.response;
      console.log("Using response.response");
    } else if (typeof response === 'string') {
      responseText = response;
      console.log("Using direct string response");
    } else {
      // Fallback: try to find any text content in the response
      console.log("No standard text field found, using JSON stringify as fallback");
      responseText = JSON.stringify(response);
    }

    // Extract session ID from response
    if (response.sessionId) {
      returnedSessionId = response.sessionId;
      console.log("Received session ID from Act Flowise:", returnedSessionId);
    }

    console.log("Final Act response text extracted:", responseText.substring(0, 50) + "...");

    return new Response(
      JSON.stringify({ 
        response: responseText,
        sessionId: returnedSessionId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Error in Act Flowise chat function:", error);
    
    // Provide more specific error messages for timeouts
    let errorMessage = error.message;
    if (error.message.includes('timed out after 5 minutes')) {
      errorMessage = "The AI agent operation is taking longer than expected (over 5 minutes). This can happen with complex tasks. Please try again or break down your request into smaller parts.";
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
