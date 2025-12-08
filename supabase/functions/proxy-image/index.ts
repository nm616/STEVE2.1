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
    const url = new URL(req.url);
    const fileName = url.searchParams.get('fileName');
    const chatId = url.searchParams.get('chatId');
    const chatflowId = url.searchParams.get('chatflowId') || '13f3b740-1417-4be4-b6e6-219735d9061d';

    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing fileName parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!chatId) {
      return new Response(
        JSON.stringify({ error: 'Missing chatId parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construct the correct Flowise get-upload-file URL
    const targetUrl = `https://flowise.elevate-hub.app/api/v1/get-upload-file?chatflowId=${chatflowId}&chatId=${chatId}&fileName=${fileName}`;

    console.log(`Proxying image request to: ${targetUrl}`);

    const response = await fetch(targetUrl);

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch image from provider: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the content type from the original response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Stream the image data back to the client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
