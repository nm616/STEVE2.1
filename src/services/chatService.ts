import { supabase } from "@/integrations/supabase/client";
import { flowiseService } from "./flowiseService";
import { v4 as uuidv4 } from 'uuid';

export interface Chat {
  id: string;
  title: string;
  created_at: Date;
  user_id: string;
  session_id?: string;
}

export interface Message {
  id: string;
  chatId: string;
  content: string;
  createdAt: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  file_metadata?: any;
  userId?: string;
}

export const chatService = {
  async createChat(userId: string): Promise<Chat> {
    // Generate a unique session ID for this chat
    const sessionId = uuidv4();

    const { data, error } = await supabase
      .from('chats')
      .insert({
        title: 'New Chat',
        user_id: userId,
        session_id: sessionId,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      created_at: new Date(data.created_at),
      user_id: data.user_id,
      session_id: data.session_id || undefined
    };
  },

  async updateChatSessionId(chatId: string, sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('chats')
      .update({ session_id: sessionId })
      .eq('id', chatId);

    if (error) throw error;
  },

  async getUserChats(userId: string): Promise<Chat[]> {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(chat => ({
      id: chat.id,
      title: chat.title,
      created_at: new Date(chat.created_at),
      user_id: chat.user_id,
      session_id: chat.session_id || undefined
    }));
  },

  async deleteChat(userId: string, chatId: string): Promise<void> {
    // First get the chat to check if it has a session_id
    const { data: chatData, error: fetchError } = await supabase
      .from('chats')
      .select('session_id')
      .eq('id', chatId)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from Flowise if session_id exists
    if (chatData?.session_id) {
      const result = await flowiseService.deleteChatSession(chatData.session_id);
      if (result.warning) {
        console.warn("Flowise deletion warning:", result.warning);
      }
    }

    // Delete the chat from Supabase
    // Note: Messages are now stored in Flowise, not in chat_messages table
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async deleteAllChats(userId: string): Promise<void> {
    // Get all chats with their session IDs
    const { data: chats, error: fetchError } = await supabase
      .from('chats')
      .select('id, session_id')
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    if (chats && chats.length > 0) {
      // Delete from Flowise for chats that have session_ids
      const chatsWithSessions = chats.filter(chat => chat.session_id);
      for (const chat of chatsWithSessions) {
        const result = await flowiseService.deleteChatSession(chat.session_id);
        if (result.warning) {
          console.warn(`Flowise deletion warning for chat ${chat.id}:`, result.warning);
        }
      }
    }

    // Delete all chats for the user from Supabase
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  },

  async updateChatTitle(userId: string, chatId: string, title: string): Promise<void> {
    const { error } = await supabase
      .from('chats')
      .update({ title })
      .eq('id', chatId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async getChatWithSessionId(chatId: string): Promise<Chat | null> {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single();

    if (error) return null;

    return {
      id: data.id,
      title: data.title,
      created_at: new Date(data.created_at),
      user_id: data.user_id,
      session_id: data.session_id || undefined
    };
  },

  async saveChatMessages(userId: string, chatId: string, messages: Message[]): Promise<void> {
    const messagesToInsert = messages.map(msg => ({
      id: msg.id,
      chat_id: chatId,
      user_id: userId,
      content: msg.content,
      role: msg.role,
      created_at: msg.createdAt,
      file_metadata: msg.file_metadata
    }));

    const { error } = await supabase
      .from('chat_messages')
      .insert(messagesToInsert);

    if (error) throw error;
  },

  async getChatMessages(userId: string, chatId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(msg => ({
      id: msg.id,
      chatId: msg.chat_id,
      content: msg.content,
      role: msg.role as 'user' | 'assistant',
      createdAt: msg.created_at,
      timestamp: new Date(msg.created_at),
      file_metadata: msg.file_metadata,
      userId: msg.user_id
    }));
  }
};
