# Elevate Chat (SteveV2.1)

A modern, AI-powered chat application built with React, TypeScript, and Supabase. Features real-time streaming responses, multi-chat management, file uploads with vision support, and extended thinking visualization.

![Elevate Chat](https://img.shields.io/badge/React-18.3.1-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue) ![Vite](https://img.shields.io/badge/Vite-5.3.1-646CFF)

## Features

### 🤖 AI Chat Capabilities
- **Streaming Responses**: Real-time token-by-token responses for instant feedback
- **Extended Thinking**: View AI reasoning process with collapsible thinking sections
- **Multi-Mode Support**:
  - Chat Mode: Standard conversational AI (90s timeout)
  - Act Mode: Extended AI agent operations (5min timeout) for complex tasks
- **Vision Support**: Upload and analyze images (PNG, JPG, GIF, WebP)
- **File Uploads**: Support for documents (PDF, TXT, CSV, Excel, Word)

### 💬 Chat Management
- **Multi-Chat Interface**: Create and manage multiple separate conversations
- **Persistent Sessions**: Each chat maintains its own conversation history via Flowise sessions
- **Auto-Title Generation**: Automatically generates descriptive titles for new chats
- **Chat Organization**: Rename, delete individual chats, or clear all chats
- **Session Isolation**: Each chat has a unique session ID ensuring conversation separation

### 🎨 Modern UI/UX
- **Message Avatars**: Bot icon for AI responses, User icon for your messages
- **Visual Distinction**: Bordered AI message boxes, colored user message bubbles
- **Thinking Visualization**: See what the AI is thinking in real-time during response generation
- **Dark/Light Mode**: Theme support using next-themes
- **Responsive Design**: Works on desktop and mobile devices
- **Resizable Sidebar**: Drag to adjust sidebar width (200px-600px)

### 🔐 Authentication & Security
- **Supabase Auth**: Secure user authentication and session management
- **User Isolation**: Each user only sees their own chats and messages
- **Protected Routes**: Authentication required for chat interface
- **Password Reset**: Email-based password recovery

## Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for styling
- **shadcn-ui** component library
- **React Router** for navigation
- **React Query** for server state management
- **React Markdown** with syntax highlighting for formatted responses

### Backend Infrastructure
- **Supabase**: PostgreSQL database, authentication, and edge functions
- **Flowise AI**: AI orchestration platform for Claude integration
- **Edge Functions** (Deno):
  - `claude-chat-streaming`: Main chat endpoint with SSE streaming
  - `act-chat`: Extended timeout endpoint for complex operations
  - `generate-chat-title`: Auto-generates chat titles using Gemini
  - `delete-flowise-chat`: Cleanup Flowise sessions
  - `gemini-chat`: Gemini API integration

### Data Flow
1. User sends message via ChatInput
2. Message saved to Supabase `chat_messages` table
3. Request sent to Supabase edge function with session ID
4. Edge function calls Flowise API with proper session management
5. Flowise routes to Claude AI with extended thinking enabled
6. Response streams back via Server-Sent Events (SSE)
7. Frontend parses SSE stream for tokens and thinking blocks
8. UI updates in real-time with thinking and response content
9. Complete message saved to database with thinking data

## Getting Started

### Prerequisites
- Node.js 18+ and npm/pnpm
- Supabase account and project
- Flowise instance with Claude AI chatflow configured

### Installation

1. **Clone the repository**
```bash
git clone <YOUR_GIT_URL>
cd SteveV2.1
```

2. **Install dependencies**
```bash
npm install
# or
pnpm install
```

3. **Configure environment variables**

Create a `.env` file with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Configure Supabase edge function secrets:
```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
```

4. **Set up database**

Run the Supabase migrations to create necessary tables:
```bash
supabase db push
```

Tables created:
- `chats`: Stores chat metadata with session IDs
- `chat_messages`: Stores all messages with thinking data

5. **Configure Flowise**

Update the Flowise endpoint URLs in the edge functions:
- [supabase/functions/claude-chat-streaming/index.ts](supabase/functions/claude-chat-streaming/index.ts)
- [supabase/functions/act-chat/index.ts](supabase/functions/act-chat/index.ts)

Ensure your Flowise chatflow:
- Has "Allow Image Upload" enabled
- Uses a vision-capable model (Claude 3.5 Sonnet recommended)
- Supports extended thinking mode

### Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:8080`

### Build for Production

```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

Start production server:
```bash
npm start
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ChatMessage.tsx     # Individual message with thinking display
│   ├── ChatInput.tsx       # Message input with file upload
│   ├── ChatSidebar.tsx     # Chat list sidebar
│   ├── MessageList.tsx     # Message feed
│   ├── TypingIndicator.tsx # Loading state with thinking preview
│   └── ui/                 # shadcn-ui components
├── contexts/           # React contexts
│   ├── AuthContext.tsx     # Authentication state
│   └── ThemeContext.tsx    # Theme management
├── hooks/              # Custom React hooks
│   └── useChatState.ts     # Main chat state management
├── pages/              # Route pages
│   ├── Chat.tsx            # Main chat interface
│   ├── Login.tsx           # Login page
│   └── Index.tsx           # Landing page
├── services/           # API services
│   ├── chatService.ts           # Database operations
│   ├── elevateAIService.ts      # Flowise API + SSE streaming
│   ├── titleGenerationService.ts # Auto-title generation
│   └── flowiseService.ts        # Flowise session cleanup
└── utils/              # Utility functions
    └── contentFormatter.ts      # AI response formatting

supabase/
└── functions/          # Edge functions
    ├── claude-chat-streaming/   # Main chat endpoint
    ├── act-chat/                # Extended timeout endpoint
    ├── generate-chat-title/     # Title generation
    └── delete-flowise-chat/     # Session cleanup
```

## Key Features Implementation

### Real-Time Streaming
Messages stream token-by-token using Server-Sent Events (SSE). The `elevateAIService` parses the SSE stream and calls `onToken` callback for each token, `onThinking` for thinking blocks, and `onComplete` when done.

### Thinking Visualization
Claude Sonnet 4's extended thinking is captured via SSE events with `{"event":"thinking","data":"..."}` format. Thinking text is displayed in real-time in the TypingIndicator and saved with the message for later review via a collapsible section.

### Session Management
Each chat has a unique `session_id` (UUID) stored in the database. This session ID is passed to Flowise API to maintain conversation context across multiple messages within the same chat.

### File Upload with Vision
Files are converted to base64 and sent to Flowise API with proper type classification:
- `type: "file"` for images (enables vision)
- `type: "file:full"` for documents (enables text extraction)

## Technologies

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **UI Components**: shadcn-ui, Radix UI primitives
- **State Management**: React Query, React Context
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **AI Integration**: Flowise + Claude AI (Anthropic)
- **Edge Functions**: Deno (Supabase Functions)
- **Markdown**: react-markdown with syntax highlighting

## Configuration

### Content Security Policy
The app uses a strict CSP defined in [index.html](index.html). Update the `connect-src` directive to include your Flowise domain:

```html
connect-src 'self' https://yscpcikasejxqjyadszh.supabase.co https://flowise.elevate-hub.app
```

### Flowise Configuration
Edit the chatflow ID in:
- [supabase/functions/claude-chat-streaming/index.ts](supabase/functions/claude-chat-streaming/index.ts#L50)
- [supabase/functions/act-chat/index.ts](supabase/functions/act-chat/index.ts)

## Troubleshooting

### Thinking not showing
Ensure your Flowise chatflow:
1. Uses Claude 3.5 Sonnet or newer
2. Has extended thinking enabled
3. Returns thinking blocks in SSE format

### Images not visible to AI
Check that:
1. File is sent with `type: "file"` (not `type: "file:full"`)
2. Flowise chatflow has "Allow Image Upload" enabled
3. Using a vision-capable model (Claude 3 Opus/Sonnet)

### Session isolation issues
Each chat should have a unique `session_id` in the database. Check:
```sql
SELECT id, title, session_id FROM chats WHERE user_id = 'your-user-id';
```

## Contributing

This is a private project, but contributions are welcome. Please ensure:
- TypeScript types are properly defined
- Components follow existing patterns
- Edge functions include proper error handling
- Database queries use RLS policies

## License

Private/Proprietary - All rights reserved

## Support

For issues or questions, please check the [CLAUDE.md](CLAUDE.md) file for detailed technical documentation.
