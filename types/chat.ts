import { OpenAIModel } from './openai';

export interface Message {
  id?: string;
  role: Role;
  content: string;
}

export type Role = 'assistant' | 'user';

export interface ChatBody {
  query: string;
  inputs: Record<string, any>;
  response_mode: 'streaming';
  user: string;
  conversation_id?: string;
  auto_generate_name?: boolean;
}

export interface ChatResponse {
  event: 'message' | 'message_end' | 'error' | 'ping';
  answer?: string;
  conversation_id?: string;
  message_id?: string;
  created_at?: number;
  usage?: {
    total_tokens: number;
  };
}

export interface Conversation {
  id: string;
  name: string;
  originalName: string;
  messages: Message[];
  prompt: string;
  temperature: number;
  folderId: string | null;
  conversationID: string;
  deletable: boolean;
  appId: number | null;
}

