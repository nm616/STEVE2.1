
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { chatService } from "@/services/chatService";
import { elevateAIService } from "@/services/elevateAIService";
import { titleGenerationService } from "@/services/titleGenerationService";
import { FileInfo } from "@/components/FileUploader";

// Define a common Message interface
export interface Message {
  id: string;
  chatId: string;
  content: string;
  createdAt: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  file_metadata?: any;
  userId?: string;
  thinking?: string; // AI reasoning/thinking process
}

export interface Chat {
  id: string;
  title: string;
  created_at: Date;
  user_id: string;
  session_id?: string; // Session ID for Flowise
}

// Local storage keys
const CURRENT_CHAT_KEY = 'elevate_current_chat_id';
const ACT_MODE_KEY = 'elevate_act_mode';

export const useChatState = () => {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentThinking, setCurrentThinking] = useState<string>(''); // Track thinking in real-time
  const [isDeletingChat, setIsDeletingChat] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isDeletingAllChats, setIsDeletingAllChats] = useState(false);
  const [isActMode, setIsActMode] = useState(() => {
    const saved = localStorage.getItem(ACT_MODE_KEY);
    return saved === 'true';
  });

  // Get current user
  const getCurrentUser = async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  };

  // Fetch chats
  const { data: chats = [], refetch: refetchChats } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const user = await getCurrentUser();
      if (!user) return [];
      try {
        return chatService.getUserChats(user.id);
      } catch (error) {
        console.error("Error fetching chats:", error);
        return [];
      }
    },
    retry: 1,
  });

  // Create chat mutation
  const createChatMutation = useMutation({
    mutationFn: async () => {
      setIsCreatingChat(true);
      try {
        const user = await getCurrentUser();
        if (!user) throw new Error("User not authenticated");
        return chatService.createChat(user.id);
      } catch (error) {
        console.error("Error in createChatMutation:", error);
        throw error;
      } finally {
        setIsCreatingChat(false);
      }
    },
    onSuccess: async (newChat) => {
      await queryClient.invalidateQueries({ queryKey: ['chats'] });
      if (newChat && newChat.id) {
        setCurrentChatId(newChat.id);
        localStorage.setItem(CURRENT_CHAT_KEY, newChat.id);
      }
      toast.success("New chat created!");
    },
    onError: (error) => {
      console.error("Failed to create chat:", error);
      toast.error(`Failed to create chat: ${error.message}`);
    },
  });

  // Delete chat mutation
  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("User not authenticated");
      return chatService.deleteChat(user.id, chatId);
    },
    onSuccess: async (_, deletedChatId) => {
      await queryClient.invalidateQueries({ queryKey: ['chats'] });

      // If deleting current chat, clear selection and messages
      if (currentChatId === deletedChatId) {
        setCurrentChatId(null);
        localStorage.removeItem(CURRENT_CHAT_KEY);
        setMessages([]);
      }

      toast.success("Chat deleted!");
    },
    onError: (error) => {
      toast.error(`Failed to delete chat: ${error.message}`);
    },
    onMutate: (chatId) => {
      setIsDeletingChat(chatId);
    },
    onSettled: () => {
      setIsDeletingChat(null);
    },
  });

  // Delete all chats mutation
  const deleteAllChatsMutation = useMutation({
    mutationFn: async () => {
      setIsDeletingAllChats(true);
      try {
        const user = await getCurrentUser();
        if (!user) throw new Error("User not authenticated");
        return chatService.deleteAllChats(user.id);
      } catch (error) {
        console.error("Error in deleteAllChatsMutation:", error);
        throw error;
      } finally {
        setIsDeletingAllChats(false);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chats'] });
      setCurrentChatId(null);
      localStorage.removeItem(CURRENT_CHAT_KEY);
      setMessages([]);
      toast.success("All chats deleted!");
    },
    onError: (error) => {
      console.error("Error deleting all chats:", error);
      toast.error(`Failed to delete all chats: ${error.message}`);
    },
  });

  // Rename chat mutation
  const renameChatMutation = useMutation({
    mutationFn: async ({ chatId, newTitle }: { chatId: string; newTitle: string }) => {
      console.log("Renaming chat:", { chatId, newTitle });
      const user = await getCurrentUser();
      if (!user) throw new Error("User not authenticated");
      await chatService.updateChatTitle(user.id, chatId, newTitle);
      console.log("Chat renamed successfully");
    },
    onSuccess: async () => {
      console.log("Invalidating chats query");
      await queryClient.invalidateQueries({ queryKey: ['chats'] });
      toast.success("Chat renamed!");
    },
    onError: (error: any) => {
      console.error("Error renaming chat:", error);
      toast.error(`Failed to rename chat: ${error.message}`);
    },
  });

  // Initialize chat - select saved or first chat
  useEffect(() => {
    if (!isInitialLoading) return;

    const initializeChat = async () => {
      try {
        // Try to get saved chat ID
        const savedChatId = localStorage.getItem(CURRENT_CHAT_KEY);

        if (savedChatId) {
          const chatExists = chats.some(chat => chat.id === savedChatId);
          if (chatExists) {
            setCurrentChatId(savedChatId);
            setIsInitialLoading(false);
            return;
          } else {
            localStorage.removeItem(CURRENT_CHAT_KEY);
          }
        }

        // Select first chat if available
        if (chats.length > 0 && !currentChatId) {
          setCurrentChatId(chats[0].id);
          localStorage.setItem(CURRENT_CHAT_KEY, chats[0].id);
        }

        setIsInitialLoading(false);
      } catch (error) {
        console.error("Error initializing chat:", error);
        setIsInitialLoading(false);
      }
    };

    if (chats !== undefined) {
      initializeChat();
    }
  }, [chats, currentChatId, isInitialLoading, isCreatingChat]);

  // Get current chat object (for accessing session_id)
  const currentChat = chats?.find(chat => chat.id === currentChatId);

  // Fetch messages when chat changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentChatId) {
        setMessages([]);
        return;
      }

      try {
        const user = await getCurrentUser();
        if (!user) return;

        const fetchedMessages = await chatService.getChatMessages(user.id, currentChatId);
        setMessages(fetchedMessages);
      } catch (error) {
        console.error("Error loading messages:", error);
        toast.error("Failed to load messages");
      }
    };

    loadMessages();
  }, [currentChatId]);

  // Send message with streaming
  const sendMessageWithChatId = useCallback(async (
    content: string,
    files: FileInfo[] = []
  ) => {
    if (!currentChatId || !currentChat?.session_id) {
      toast.error("No chat selected");
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    const tempMessageId = uuidv4();
    const userMessage: Message = {
      id: tempMessageId,
      chatId: currentChatId,
      content,
      role: 'user',
      createdAt: new Date().toISOString(),
      timestamp: new Date(),
      file_metadata: files.length > 0 ? { files } : undefined,
      userId: user.id
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Save user message to DB
      await chatService.saveChatMessages(user.id, currentChatId, [userMessage]);

      // Start streaming response
      let fullResponse = '';
      let fullThinking = '';
      const assistantTempId = uuidv4();
      const assistantMessage: Message = {
        id: assistantTempId,
        chatId: currentChatId,
        content: '',
        role: 'assistant',
        createdAt: new Date().toISOString(),
        timestamp: new Date(),
        userId: user.id
      };

      // Add empty assistant message that will be updated
      setMessages(prev => [...prev, assistantMessage]);
      setCurrentThinking(''); // Reset thinking for new message

      await elevateAIService.sendMessageStreaming(
        content,
        files,
        currentChatId,
        currentChat.session_id,
        isActMode,
        (token: string) => {
          // Update assistant message with new token
          fullResponse += token;
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantTempId
                ? { ...msg, content: fullResponse, thinking: fullThinking }
                : msg
            )
          );
        },
        async (returnedSessionId?: string) => {
          // Complete - save assistant message to DB
          const finalAssistantMessage = {
            ...assistantMessage,
            content: fullResponse,
            thinking: fullThinking || undefined
          };

          await chatService.saveChatMessages(user.id, currentChatId, [finalAssistantMessage]);

          // Generate title if first message
          const isFirstMessage = messages.length === 0;
          if (isFirstMessage) {
            try {
              const generatedTitle = await titleGenerationService.generateChatTitle(content);
              await chatService.updateChatTitle(user.id, currentChatId, generatedTitle);
              await queryClient.invalidateQueries({ queryKey: ['chats'] });
            } catch (error) {
              console.error("Failed to generate title:", error);
            }
          }

          setIsLoading(false);
          setCurrentThinking(''); // Clear thinking when complete
        },
        (error: string) => {
          console.error("Streaming error:", error);
          toast.error(`Failed to send message: ${error}`);

          // Remove the empty assistant message on error
          setMessages(prev => prev.filter(msg => msg.id !== assistantTempId));
          setIsLoading(false);
          setCurrentThinking(''); // Clear thinking on error
        },
        (thinkingText: string) => {
          // Handle thinking updates
          fullThinking += thinkingText;
          setCurrentThinking(fullThinking);
          // Also update the message with thinking
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantTempId
                ? { ...msg, thinking: fullThinking }
                : msg
            )
          );
        }
      );
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(`Failed to send message: ${error.message}`);

      // Remove user message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      setIsLoading(false);
    }
  }, [currentChatId, currentChat, isActMode, messages.length, queryClient]);

  const handleSendMessage = useCallback(async (content: string, files: FileInfo[] = []) => {
    await sendMessageWithChatId(content, files);
  }, [sendMessageWithChatId]);

  // Handlers
  const handleNewChat = useCallback(async () => {
    if (isCreatingChat) return;

    try {
      await createChatMutation.mutateAsync();
    } catch (error) {
      console.error("Error creating new chat:", error);
      toast.error("Failed to create a new chat. Please try again.");
    }
  }, [createChatMutation, isCreatingChat]);

  const handleSelectChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
    localStorage.setItem(CURRENT_CHAT_KEY, chatId);
  }, []);

  const handleDeleteChat = useCallback((chatId: string) => {
    deleteChatMutation.mutate(chatId);
  }, [deleteChatMutation]);

  const handleDeleteAllChats = useCallback(() => {
    if (isDeletingAllChats) return;
    deleteAllChatsMutation.mutate();
  }, [deleteAllChatsMutation, isDeletingAllChats]);

  const handleRenameChat = useCallback((chatId: string, newTitle: string) => {
    renameChatMutation.mutate({ chatId, newTitle });
  }, [renameChatMutation]);

  const handleModeToggle = useCallback((newIsActMode: boolean) => {
    setIsActMode(newIsActMode);
    localStorage.setItem(ACT_MODE_KEY, newIsActMode.toString());
    toast.success(`Switched to ${newIsActMode ? 'Act' : 'Chat'} mode`);
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.removeItem(CURRENT_CHAT_KEY);
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
    } catch (error: any) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out. Please try again.");
    }
  };

  return {
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
    handleLogout,
  };
};
