# Elevate Chat (SteveV2.1) - Gemini Context

## Project Overview
**Elevate Chat** (internal name: SteveV2.1) is a modern, production-grade AI chat application built with React, TypeScript, and Supabase. It integrates with Flowise to orchestrate AI models (specifically Claude 3.5 Sonnet) and supports advanced features like real-time streaming, extended thinking visualization, and multi-modal input (text, images, files).

**Key Capabilities:**
*   **Dual Modes:** 'Chat Mode' (standard) and 'Act Mode' (extended timeout for complex agentic tasks).
*   **Streaming & Thinking:** Real-time token streaming via Server-Sent Events (SSE), with a dedicated UI for visualizing the AI's "thinking" process (Claude 3.5 Sonnet).
*   **Multi-Modal:** Supports file uploads (documents) and image analysis (vision).
*   **Session Management:** Persistent chat history and context management via Flowise and Supabase.

## Architecture

### Frontend
*   **Framework:** React 18 with TypeScript.
*   **Build Tool:** Vite (Server port: 8080).
*   **Styling:** Tailwind CSS + shadcn-ui component library.
*   **Routing:** React Router (`/`, `/chat`, `/login`, etc.).
*   **State Management:**
    *   `React Query`: For server state (chat lists, session persistence).
    *   `Context API`: For global app state (`AuthContext`, `ThemeContext`).
    *   `useChatState` hook: Central logic for message handling and UI state.

### Backend & Infrastructure
*   **Database:** Supabase (PostgreSQL).
*   **Auth:** Supabase Auth (RLS enabled).
*   **Edge Functions (Deno):**
    *   `claude-chat-streaming`: Main chat endpoint (handles SSE).
    *   `act-chat`: Endpoint for long-running tasks.
    *   `generate-chat-title`: Uses Gemini to auto-title chats.
*   **AI Orchestration:** Flowise (External service).

## Development Setup

### Prerequisites
*   Node.js 18+
*   Supabase Project
*   Flowise Instance

### Build & Run
```bash
# Install dependencies
npm install

# Start Development Server (http://localhost:8080)
npm run dev

# Build for Production
npm run build

# Preview Production Build
npm run preview
```

## Critical Implementation Details

### 1. Streaming & SSE
The application uses a custom SSE parser located in `src/services/elevateAIService.ts`.
*   **Event Types:**
    *   `token`: Standard text response chunks.
    *   `thinking`: Extended reasoning blocks from Claude.
    *   `metadata`: Contains session IDs.
*   **Flow:** Messages are sent to Supabase Edge Functions -> Flowise -> Claude. Responses stream back through the same chain.

### 2. Hardcoded Configuration (Security Warning)
**Note:** The current codebase contains hardcoded Supabase credentials (`supabaseUrl`, `anonKey`) directly in `src/services/elevateAIService.ts`.
*   *Action Item:* When refactoring or deploying, these **MUST** be moved to environment variables (`.env`) and accessed via `import.meta.env`.

### 3. File Uploads
*   Files are **not** stored in Supabase Storage.
*   They are converted to Base64 strings in the client (`FileUploader.tsx`) and sent directly to the Flowise API payload.
*   **Types:**
    *   Images: Sent as `type: "file"` (triggers vision capabilities).
    *   Docs: Sent as `type: "file:full"`.

## Project Structure
```text
src/
├── components/       # UI Components (ChatInput, MessageList, etc.)
│   └── ui/           # shadcn-ui primitives
├── contexts/         # Global providers (Auth, Theme)
├── hooks/            # Logic encapsulation (useChatState)
├── pages/            # Route views (Chat, Login, Index)
├── services/         # API integrations (elevateAIService, chatService)
└── integrations/     # Generated Supabase types
```

## Conventions
*   **Styling:** Use Tailwind utility classes. Avoid custom CSS files unless necessary.
*   **Components:** Functional components with TypeScript interfaces.
*   **Imports:** Use the `@/` alias for imports (e.g., `import { Button } from "@/components/ui/button"`).
*   **Async Logic:** Wrap async operations in `try/catch` blocks and use `sonner` for user notifications (toasts).
