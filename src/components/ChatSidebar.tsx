
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, MessageSquare, Trash2, Edit, Save, Trash } from "lucide-react";
import { Chat } from "@/services/chatService";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ChatSidebarProps {
  chats: Chat[];
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onDeleteAllChats?: () => void;
  currentChatId: string | null;
  isDeletingChat?: string | null;
  isDeletingAllChats?: boolean;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onDeleteAllChats,
  currentChatId,
  isDeletingChat,
  isDeletingAllChats
}) => {
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");

  const handleEditClick = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleSaveClick = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      onRenameChat(chatId, editingTitle.trim());
    }
    setEditingChatId(null);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingTitle(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent, chatId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingTitle.trim()) {
        onRenameChat(chatId, editingTitle.trim());
        setEditingChatId(null);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingChatId(null);
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Button 
          onClick={onNewChat} 
          className="w-full bg-elevate-primary hover:bg-elevate-dark flex gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          New Chat
        </Button>
      </div>
      
      {/* Chat list */}
      <div className="flex-1 overflow-auto p-2">
        {chats.length === 0 ? (
          <div className="text-center p-4 text-muted-foreground">
            No chats yet. Start a new conversation!
          </div>
        ) : (
          <>
            <ul className="space-y-1">
              {chats.map((chat) => (
                <li key={chat.id}>
                  <div 
                    className={`
                      flex items-center justify-between p-2 rounded-md cursor-pointer
                      hover:bg-accent group transition-colors
                      ${currentChatId === chat.id ? "bg-accent/50" : ""}
                      ${isDeletingChat === chat.id ? "opacity-50 pointer-events-none" : ""}
                    `}
                    onClick={() => onSelectChat(chat.id)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                      
                      {editingChatId === chat.id ? (
                        <Input
                          value={editingTitle}
                          onChange={handleTitleChange}
                          onKeyDown={(e) => handleKeyDown(e, chat.id)}
                          className="h-6 py-1 text-sm"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="truncate">{chat.title}</span>
                      )}
                    </div>
                    
                    <div className="flex">
                      {editingChatId === chat.id ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => handleSaveClick(e, chat.id)}
                        >
                          <Save className="h-4 w-4" />
                          <span className="sr-only">Save</span>
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          onClick={(e) => handleEditClick(e, chat)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      )}
                    
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            disabled={isDeletingChat === chat.id}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete chat</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this chat? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteChat(chat.id);
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            
            {/* Delete All Chats button - only show if there are chats */}
            {chats.length > 0 && onDeleteAllChats && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 flex gap-2 items-center justify-center"
                    disabled={isDeletingAllChats}
                  >
                    <Trash className="h-4 w-4" />
                    {isDeletingAllChats ? "Deleting..." : "Delete All Chats"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all chats</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete all your chats? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={onDeleteAllChats}
                      className="bg-red-500 hover:bg-red-600"
                      disabled={isDeletingAllChats}
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
