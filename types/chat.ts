import { OpenAIModel } from './openai';
import { Plugin } from './plugin';

export interface Message {
  id?: string;
  role: Role;
  content: string;
}

export type Role = 'assistant' | 'user' | 'system' | 'tool' | 'function';

export interface ChatBody {
  query: string;
  inputs: Record<string, any>;
  response_mode: 'streaming';
  user: string;
  conversation_id?: string;
  auto_generate_name?: boolean;
  model: string;
  messages: Message[];
  key: string;
  prompt: string;
  temperature: number;
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
  originalName?: string;
  messages: Message[];
  model: string;
  prompt: string;
  temperature: number;
  folderId: string | null;
  conversationID?: string;
  deletable?: boolean;
  appId?: number | null;
  cardId?: string | null;
  modelName?: string | null;
  pinned?: boolean;
}

