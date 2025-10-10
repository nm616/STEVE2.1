
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { FileInfo, FlowiseUpload } from "@/components/FileUploader";

export interface FileMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  url?: string;
  path: string;
}

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  file_metadata?: FileMetadata[];
  userId?: string;
  thinking?: string; // AI reasoning/thinking process
}

export const elevateAIService = {
  // Keep this method for future re-implementation
  async uploadFile(file: File, chatId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${chatId}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;
    
    const { error } = await supabase.storage
      .from('chat_attachments')
      .upload(filePath, file);

    if (error) {
      console.error("Error uploading file:", error);
      throw new Error(`Error uploading file: ${error.message}`);
    }

    return filePath;
  },
  
  // Keep this method for future re-implementation
  async getFileUrl(filePath: string): Promise<string> {
    const { data } = await supabase.storage
      .from('chat_attachments')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  },

  // Convert FileInfo to Flowise upload format
  convertToFlowiseUploads(files: FileInfo[]): FlowiseUpload[] {
    return files.map(fileInfo => {
      // Use "file" type for images (so AI can see them), "file:full" for documents
      const isImage = fileInfo.file.type.startsWith('image/');
      const upload = {
        data: fileInfo.base64Data || '', // base64 data URI already in correct format
        type: isImage ? "file" : "file:full",
        name: fileInfo.file.name,
        mime: fileInfo.file.type
      };

      console.log(`Converting file "${fileInfo.file.name}":`, {
        type: upload.type,
        mime: upload.mime,
        dataPreview: upload.data.substring(0, 50) + '...'
      });

      return upload;
    });
  },

  // Updated to handle streaming responses with SSE
  async sendMessageStreaming(
    message: string,
    files: FileInfo[] = [],
    chatId: string,
    sessionId?: string,
    isActMode: boolean = false,
    onToken: (token: string) => void,
    onComplete: (sessionId?: string) => void,
    onError: (error: string) => void,
    onThinking?: (thinkingText: string) => void
  ): Promise<void> {
    try {
      console.log(`Sending streaming message to ${isActMode ? 'Act' : 'Chat'} mode:`, message.substring(0, 50) + "...");

      // Determine which function to call based on mode - use streaming
      const functionName = isActMode ? "act-chat" : "claude-chat-streaming";

      // Convert files to Flowise format if provided
      const uploads = files.length > 0 ? this.convertToFlowiseUploads(files) : undefined;

      console.log("Sending to Flowise with streaming:", {
        hasMessage: !!message,
        hasSession: !!sessionId,
        fileCount: files.length,
        uploads: uploads ? uploads.map(u => ({
          type: u.type,
          name: u.name,
          mime: u.mime,
          dataLength: u.data.length
        })) : null
      });

      // Get Supabase session for auth
      const { data: { session } } = await supabase.auth.getSession();

      // Construct edge function URL
      const supabaseUrl = "https://yscpcikasejxqjyadszh.supabase.co";
      const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzY3BjaWthc2VqeHFqeWFkc3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NTQ1NzIsImV4cCI6MjA2MjEzMDU3Mn0.2G_IOPjAxTF3OrO1sHGYm-HyFCMX0CU__3nn8-ar7cs";
      const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

      // Make direct fetch call to get SSE stream
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          message: message,
          sessionId: sessionId,
          uploads: uploads
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge function error response:', errorText);
        throw new Error(`Edge function error: ${response.status} - ${errorText}`);
      }

      // Check if response is SSE
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);

      if (!contentType?.includes('text/event-stream') && !contentType?.includes('application/json')) {
        throw new Error(`Unexpected content-type: ${contentType}`);
      }

      // If it's JSON, it's likely an error from old non-streaming version
      if (contentType?.includes('application/json')) {
        const jsonResponse = await response.json();
        console.log('JSON response:', jsonResponse);
        if (jsonResponse.response) {
          // Non-streaming response - call onToken with full response then complete
          onToken(jsonResponse.response);
          onComplete(jsonResponse.sessionId);
          return;
        }
        throw new Error('Unexpected JSON response format');
      }

      // Process SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let capturedSessionId: string | undefined;
      let currentEvent: string | null = null;

      console.log('Starting to read SSE stream...');

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('Stream completed, captured sessionId:', capturedSessionId);
            onComplete(capturedSessionId);
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            console.log('SSE line:', JSON.stringify(line));

            // Skip "message:" lines - they're just prefixes in Flowise format
            if (line === 'message:' || line === 'message') {
              continue;
            }

            // Track event type (format: "event: <type>")
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
              console.log('Event type:', currentEvent);
              continue;
            }

            // Process data lines
            if (line.startsWith('data:')) {
              const data = line.slice(5).trim(); // Remove "data:" prefix and trim

              // Try to parse as JSON first (Flowise format)
              try {
                const parsed = JSON.parse(data);
                console.log('Parsed JSON data:', parsed);

                // Handle Flowise format: {"event":"token","data":"<content>"}
                if (parsed.event === 'token' && parsed.data) {
                  console.log('Token received from Flowise format:', parsed.data);
                  onToken(parsed.data);
                  continue;
                }

                // Handle thinking event (Claude Sonnet 4 extended thinking)
                if (parsed.event === 'thinking' && parsed.data && onThinking) {
                  console.log('Thinking received:', parsed.data);
                  onThinking(parsed.data);
                  continue;
                }

                // Handle metadata event for sessionId
                if (parsed.event === 'metadata' && parsed.data?.sessionId) {
                  capturedSessionId = parsed.data.sessionId;
                  console.log('Captured sessionId from metadata:', capturedSessionId);
                  continue;
                }

                // Handle end event
                if (parsed.event === 'end') {
                  console.log('End event received');
                  continue;
                }

                // Legacy format: {"token":"...","sessionId":"..."}
                if (parsed.token) {
                  console.log('Token received from legacy format:', parsed.token);
                  onToken(parsed.token);
                }

                if (parsed.sessionId) {
                  capturedSessionId = parsed.sessionId;
                  console.log('Captured sessionId from legacy format:', capturedSessionId);
                }

              } catch (e) {
                // Not JSON - might be plain text token
                console.log('Plain text data (not JSON):', JSON.stringify(data));
                if (data && data !== '[DONE]') {
                  onToken(data);
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error(`Error in streaming ${isActMode ? 'Act' : 'Chat'} call:`, error);
      onError(error.message || "Sorry, there was an error processing your request. Please try again later.");
    }
  },

  // Legacy non-streaming method (kept for backwards compatibility if needed)
  async sendMessage(message: string, files: FileInfo[] = [], chatId: string, sessionId?: string, isActMode: boolean = false): Promise<{ message: Message; sessionId?: string }> {
    // This method now uses streaming internally but returns complete message
    return new Promise((resolve) => {
      let accumulatedContent = '';
      let finalSessionId: string | undefined;

      this.sendMessageStreaming(
        message,
        files,
        chatId,
        sessionId,
        isActMode,
        (token) => {
          accumulatedContent += token;
        },
        (sessionId) => {
          finalSessionId = sessionId;
          resolve({
            message: {
              id: uuidv4(),
              content: accumulatedContent || "Sorry, I couldn't process that request.",
              role: "assistant",
              timestamp: new Date(),
            },
            sessionId: finalSessionId
          });
        },
        (error) => {
          resolve({
            message: {
              id: uuidv4(),
              content: error,
              role: "assistant",
              timestamp: new Date()
            }
          });
        }
      );
    });
  }
};
