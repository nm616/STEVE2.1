
import React, { useState, useRef, useCallback } from "react";
import ChatSidebar from "@/components/ChatSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import MessageList from "@/components/MessageList";
import ChatInput from "@/components/ChatInput";
import { useChatState } from "@/hooks/useChatState";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";

const Chat: React.FC = () => {
  const [sidebarWidth, setSidebarWidth] = useState(320); // Default 320px
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    chats,
    currentChatId,
    currentChat,
    messages,
    isLoading,
    currentThinking,
    isDeletingChat,
    isDeletingAllChats,
    isActMode,
    handleNewChat,
    handleSelectChat,
    handleDeleteChat,
    handleDeleteAllChats,
    handleRenameChat,
    handleSendMessage,
    handleModeToggle,
    handleLogout
  } = useChatState();

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;
    
    // Constrain width between 200px and 600px
    const constrainedWidth = Math.min(Math.max(newWidth, 200), 600);
    setSidebarWidth(constrainedWidth);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div ref={containerRef} className="flex h-screen w-full bg-background">
      {/* Collapsible Sidebar */}
      <div 
        className={`bg-sidebar border-r border-border transition-all duration-300 ${
          sidebarCollapsed ? 'w-0 overflow-hidden' : ''
        }`}
        style={{ width: sidebarCollapsed ? 0 : `${sidebarWidth}px` }}
      >
        <ChatSidebar 
          chats={chats || []}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onDeleteAllChats={handleDeleteAllChats}
          onRenameChat={handleRenameChat}
          currentChatId={currentChatId}
          isDeletingChat={isDeletingChat}
          isDeletingAllChats={isDeletingAllChats}
        />
      </div>
      
      {/* Resize Handle */}
      {!sidebarCollapsed && (
        <div
          className="w-1 bg-border hover:bg-accent cursor-col-resize transition-colors"
          onMouseDown={handleMouseDown}
        />
      )}
      
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header with toggle button */}
        <div className="px-4 py-3 bg-background border-b border-border shadow-sm">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSidebar}
                className="mr-2"
                title="Toggle Sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              <div className="h-8 w-8 rounded-full bg-elevate-primary flex items-center justify-center">
                <span className="text-white font-bold">E</span>
              </div>
              <h1 className="font-semibold text-lg">Elevate Chat</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                title="Logout"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Chat Messages and Input */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentChatId ? (
            <>
              <MessageList
                messages={messages.map(msg => ({
                  id: msg.id,
                  content: msg.content,
                  role: msg.role,
                  timestamp: msg.timestamp,
                  thinking: msg.thinking
                }))}
                isLoading={isLoading}
                currentThinking={currentThinking}
                isActMode={isActMode}
              />
              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                currentChatId={currentChatId}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-4">Welcome to Elevate Chat</h2>
                <p className="text-muted-foreground mb-6">
                  Create a new chat to get started
                </p>
                <Button onClick={handleNewChat}>
                  Create New Chat
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
