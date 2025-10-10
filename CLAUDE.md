# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Elevate Chat" (SteveV2.1) - a React-based AI chat application with authentication, multiple AI backends, and conversation management. Built with Vite, TypeScript, React, Tailwind CSS, and shadcn-ui components.

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

### Data Flow for Messages

1. User sends message via [ChatInput](src/components/ChatInput.tsx)
2. `useChatState.handleSendMessage()` is called
3. Message saved to Supabase via [chatService](src/services/chatService.ts)
4. AI request sent via [elevateAIService](src/services/elevateAIService.ts)
5. Edge function invoked based on mode:
   - Chat mode → [supabase/functions/claude-chat](supabase/functions/claude-chat/index.ts)
   - Act mode → [supabase/functions/act-chat](supabase/functions/act-chat/index.ts)
6. Edge function calls Flowise API with session management
7. Response processed and saved back to Supabase
8. If first message in chat, title auto-generated via [titleGenerationService](src/services/titleGenerationService.ts)
9. UI updated via React Query cache invalidation

### AI Integration Architecture

**Two Operating Modes:**
- **Chat Mode**: Standard conversational AI (90s timeout) via Flowise endpoint
- **Act Mode**: Extended AI agent operations (5 min timeout) for complex tasks via separate Flowise endpoint

**Session Management:**
- Each chat has a `session_id` stored in Supabase `chats` table
- Session ID passed to Flowise API for conversation continuity
- When chat deleted, corresponding Flowise session deleted via [delete-flowise-chat](supabase/functions/delete-flowise-chat/index.ts) function

**Response Handling:**
- Supports Sonnet 4 extended thinking format
- Filters out `thinking` parts, returns only `text` parts
- Handles multiple response formats (text, answer, response fields)

### Database Schema (Supabase)

**Tables:**
- `chats`: Stores chat metadata
  - `id`, `user_id`, `title`, `session_id`, `created_at`, `deleted_at`, `expire_at`
- `chat_messages`: Stores individual messages
  - `id`, `chat_id`, `user_id`, `content`, `role`, `created_at`, `file_metadata`

**Services:**
- [chatService.ts](src/services/chatService.ts) - All database operations for chats and messages
- [elevateAIService.ts](src/services/elevateAIService.ts) - AI message handling and mode switching
- [flowiseService.ts](src/services/flowiseService.ts) - Flowise session deletion
- [titleGenerationService.ts](src/services/titleGenerationService.ts) - Auto-title generation using Gemini

### Edge Functions (Supabase Functions in Deno)

Located in `supabase/functions/`:
- `claude-chat` - Chat mode Flowise integration (90s timeout)
- `act-chat` - Act mode Flowise integration (5min timeout)
- `delete-flowise-chat` - Flowise session cleanup
- `gemini-chat` - Gemini API integration (used for title generation)
- `generate-chat-title` - Wrapper for title generation

**Environment Variables Required:**
- `GEMINI_API_KEY` - For Gemini chat and title generation
- Flowise endpoints and auth tokens are hardcoded in edge functions

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
│   ├── ChatMessage (for each message)
│   └── TypingIndicator (when loading)
└── ChatInput
    └── FileUploader (present but file handling not fully implemented)
```

### Key Implementation Details

**Chat Initialization** ([useChatState.ts:187-237](src/hooks/useChatState.ts#L187)):
- On mount, checks localStorage for saved chat ID
- If found and exists, selects it
- Otherwise selects first available chat
- Does NOT auto-create chat on mount (user must click "New Chat")

**Message Format Conversions:**
- Internal `Message` type defined in useChatState.ts
- Converted to `ElevateAIMessage` for MessageList component
- Converted to database format for Supabase storage
- All use timestamp/createdAt fields consistently

**Sidebar Resizing** ([Chat.tsx:46-80](src/pages/Chat.tsx#L46)):
- Custom mouse-drag implementation (not using library)
- Width constrained between 200px-600px
- State persisted during session (not localStorage)

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

### React Query Usage
- Used for chats list fetching and caching
- Mutations for create/delete/rename operations
- Manual cache invalidation after mutations

### TypeScript Interfaces
- Database types auto-generated in [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts)
- Service-specific types in each service file
- Common Message interface shared across services

## Known Limitations

- File upload UI exists but backend handling incomplete
- Flowise API endpoints and tokens hardcoded in edge functions
- No pagination for chat messages or chat list
- No real-time subscriptions (relies on manual refetch)
- Chat expiration logic defined but cleanup function usage unclear
