# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Elevate Chat" (SteveV2.1) - a React-based AI chat application with authentication, streaming responses, and conversation management. Built with Vite, TypeScript, React, Tailwind CSS, and shadcn-ui components.

## Development Commands

```bash
# Start development server (Vite on port 8080)
npm run dev

# Build for production
npm run build

# Build for development (with sourcemaps)
npm run build:dev

# Run linter
npm run lint

# Preview production build
npm run preview

# Start production server (Express)
npm start
```

## Architecture Overview

### Core Application Structure

**Main Entry Point**: [src/main.tsx](src/main.tsx) → [src/App.tsx](src/App.tsx)

The app uses React Router with these routes:
- `/` - Landing page ([src/pages/Index.tsx](src/pages/Index.tsx))
- `/login` - Authentication ([src/pages/Login.tsx](src/pages/Login.tsx))
- `/signup` - Registration ([src/pages/Signup.tsx](src/pages/Signup.tsx))
- `/reset-password` - Password reset ([src/pages/ResetPassword.tsx](src/pages/ResetPassword.tsx))
- `/chat` - Main chat interface ([src/pages/Chat.tsx](src/pages/Chat.tsx), protected route)

### State Management & Context

**AuthContext** ([src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx))
- Wraps entire app to provide authentication state
- Uses Supabase Auth for user management
- Exposes: `user`, `session`, `login()`, `signup()`, `logout()`, `resetPassword()`

**ThemeContext** ([src/contexts/ThemeContext.tsx](src/contexts/ThemeContext.tsx))
- Manages light/dark theme switching using next-themes

**useChatState Hook** ([src/hooks/useChatState.ts](src/hooks/useChatState.ts))
- Central chat state management - this is the heart of the chat functionality
- Manages: messages, chats list, current chat selection, loading states
- Handles: chat CRUD operations, message sending, Act/Chat mode toggle
- Uses React Query for server state management
- Persists current chat ID and Act mode preference to localStorage

### Data Flow for Messages (Streaming)

1. User sends message via [ChatInput](src/components/ChatInput.tsx)
2. `useChatState.handleSendMessage()` is called
3. User message added to UI immediately and saved to Supabase via [chatService](src/services/chatService.ts)
4. Empty assistant message created in UI for streaming updates
5. AI request sent via [elevateAIService.sendMessageStreaming()](src/services/elevateAIService.ts)
6. Edge function invoked based on mode:
   - Chat mode → [supabase/functions/claude-chat-streaming](supabase/functions/claude-chat-streaming/index.ts) (5min timeout)
   - Act mode → [supabase/functions/act-chat](supabase/functions/act-chat/index.ts) (5min timeout)
7. Edge function calls Flowise API with session management and streaming enabled
8. Response streams back via Server-Sent Events (SSE):
   - `onToken` callback updates assistant message in UI token-by-token
   - `onThinking` callback updates thinking state for Claude Sonnet 4 extended thinking
   - `onComplete` callback saves final message to Supabase
9. If first message in chat, title auto-generated via [titleGenerationService](src/services/titleGenerationService.ts) using Gemini
10. UI updated via React Query cache invalidation

### AI Integration Architecture

**Two Operating Modes:**
- **Chat Mode**: Standard conversational AI with streaming (5min timeout) via [claude-chat-streaming](supabase/functions/claude-chat-streaming/index.ts)
- **Act Mode**: Extended AI agent operations (5min timeout) for complex tasks via [act-chat](supabase/functions/act-chat/index.ts)

**Streaming Implementation:**
- Uses Server-Sent Events (SSE) for real-time token streaming
- Parses multiple SSE formats:
  - Flowise format: `{"event":"token","data":"<content>"}`
  - Extended thinking: `{"event":"thinking","data":"<thinking>"}`
  - Metadata: `{"event":"metadata","data":{"sessionId":"..."}}`
- Handles both JSON and plain text SSE data
- Accumulates thinking separately from response content
- See [elevateAIService.ts:74-272](src/services/elevateAIService.ts#L74) for full SSE parsing logic

**Session Management:**
- Each chat has a `session_id` (UUID) generated on creation and stored in Supabase `chats` table
- Session ID passed to Flowise API for conversation continuity across messages
- When chat deleted, corresponding Flowise session deleted via [delete-flowise-chat](supabase/functions/delete-flowise-chat/index.ts) function
- Session isolation ensures separate conversation contexts per chat

**Response Handling:**
- Supports Claude Sonnet 4 extended thinking format
- Thinking content displayed in real-time via `currentThinking` state
- Thinking saved with message in `thinking` field for collapsible display
- Handles multiple response formats (token, text, answer, response fields)

### Database Schema (Supabase)

**Tables:**
- `chats`: Stores chat metadata
  - `id`, `user_id`, `title`, `session_id`, `created_at`, `deleted_at`, `expire_at`
- `chat_messages`: Stores individual messages
  - `id`, `chat_id`, `user_id`, `content`, `role`, `created_at`, `file_metadata`

**Services:**
- [chatService.ts](src/services/chatService.ts) - All database operations for chats and messages
- [elevateAIService.ts](src/services/elevateAIService.ts) - SSE streaming, AI message handling, mode switching
- [flowiseService.ts](src/services/flowiseService.ts) - Flowise session deletion
- [titleGenerationService.ts](src/services/titleGenerationService.ts) - Auto-title generation using Gemini

### Edge Functions (Supabase Functions in Deno)

Located in `supabase/functions/`:
- `claude-chat-streaming` - Main chat mode with SSE streaming (5min timeout)
- `act-chat` - Act mode Flowise integration (5min timeout)
- `delete-flowise-chat` - Flowise session cleanup
- `gemini-chat` - Gemini API integration (used for title generation)
- `generate-chat-title` - Wrapper for title generation
- `claude-chat` - Legacy non-streaming endpoint (deprecated, use claude-chat-streaming)

**Environment Variables Required:**
- `GEMINI_API_KEY` - For Gemini chat and title generation
- Flowise endpoints are hardcoded in edge functions (see line 56 in claude-chat-streaming)
- Supabase URL and anon key are hardcoded in [elevateAIService.ts:111-112](src/services/elevateAIService.ts#L111)

### Component Hierarchy

```
Chat (main page)
├── ChatSidebar (resizable, collapsible)
│   └── Chat list with CRUD operations
├── ChatHeader
│   ├── ThemeToggle
│   └── Logout button
├── MessageList
│   ├── WelcomeScreen (when no messages)
│   ├── ChatMessage (for each message, with collapsible thinking)
│   └── TypingIndicator (when loading, shows current thinking)
└── ChatInput
    └── FileUploader (converts files to base64 for Flowise)
```

### Key Implementation Details

**Chat Initialization** ([useChatState.ts:188-223](src/hooks/useChatState.ts#L188)):
- On mount, checks localStorage for saved chat ID
- If found and exists, selects it
- Otherwise selects first available chat
- Does NOT auto-create chat on mount (user must click "New Chat")

**Message Streaming Flow** ([useChatState.ts:252-378](src/hooks/useChatState.ts#L252)):
- User message added to state immediately before API call
- Empty assistant message created with temp ID
- Streaming callbacks update assistant message in-place:
  - `onToken`: Accumulates response content, updates message state
  - `onThinking`: Accumulates thinking content, updates both `currentThinking` and message state
  - `onComplete`: Saves final message to DB, generates title if first message
  - `onError`: Removes assistant message from state
- Both user and assistant messages saved to Supabase separately

**File Upload Implementation:**
- Files converted to base64 data URIs in [FileUploader](src/components/FileUploader.tsx)
- Passed as `FlowiseUpload[]` format with `data`, `type`, `name`, `mime` fields
- Image files use `type: "file"` (enables vision), documents use `type: "file:full"`
- Base64 data sent directly to Flowise via edge function (no Supabase storage)
- See [elevateAIService.ts:53-72](src/services/elevateAIService.ts#L53) for conversion logic

**Sidebar Resizing** ([Chat.tsx:37-71](src/pages/Chat.tsx#L37)):
- Custom mouse-drag implementation (not using library)
- Width constrained between 200px-600px
- State persisted during session (not localStorage)

**Message Format:**
- Internal `Message` type defined in [useChatState.ts:13-23](src/hooks/useChatState.ts#L13)
- Includes `thinking` field for extended thinking content
- `file_metadata` stores uploaded file information
- `timestamp` and `createdAt` used interchangeably (converted between Date and ISO string)

### Styling

- Tailwind CSS with custom theme configuration
- shadcn-ui components with custom color schemes
- CSS variables for theme colors defined in [src/index.css](src/index.css)
- Dark/light mode support via `next-themes`

## Important Patterns

### Error Handling
- All service calls wrapped in try-catch
- User-facing errors shown via sonner toast notifications
- Console logging for debugging throughout
- Streaming errors handled via `onError` callback

### React Query Usage
- Used for chats list fetching and caching
- Mutations for create/delete/rename operations
- Manual cache invalidation after mutations (`queryClient.invalidateQueries`)
- Does NOT use React Query for messages (managed in component state)

### TypeScript Interfaces
- Database types auto-generated in [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts)
- Service-specific types in each service file
- Multiple `Message` interfaces exist (useChatState, elevateAIService, chatService) - ensure compatibility when passing between services

### SSE Stream Parsing
- Custom SSE parser in [elevateAIService.ts:160-266](src/services/elevateAIService.ts#L160)
- Handles line buffering, event type tracking, JSON vs plain text data
- Skips SSE comments (lines starting with `:`)
- Accumulates `sessionId` from metadata events for return value

## Known Limitations

- Messages stored in Supabase `chat_messages` table (comment at line 97 of chatService.ts is outdated)
- Flowise API endpoints and Supabase credentials hardcoded in edge functions and services
- No pagination for chat messages or chat list
- No real-time subscriptions (relies on manual refetch)
- Chat expiration logic defined in DB schema but cleanup not implemented
- File uploads work but no Supabase storage integration (files sent as base64 only)
