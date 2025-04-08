export interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
}

export interface DifyConfig {
  apiUrl?: string;
  timeout?: number;
  debug?: boolean;
}

export interface ChatParams {
  query: string;
  key: string;
  user?: string;
  conversationId?: string;
  inputs?: Record<string, any>;
  autoGenerateName?: boolean;
  model?: string;
  temperature?: number;
}

export interface ChatResponse {
  event: string;
  conversation_id?: string;
  answer?: string;
  metadata?: {
    usage?: {
      total_tokens?: number;
    };
  };
}

export interface StreamResponse {
  event: string;
  conversation_id: string;
  answer?: string;
  message_id?: string;
  task_id?: string;
  id?: string;
  created_at?: string;
  role?: string;
  content?: string;
  end_turn?: boolean;
  error?: string;
  metadata?: {
    usage?: {
      total_tokens?: number;
      prompt_tokens?: number;
      completion_tokens?: number;
    };
    finish_reason?: string;
  };
} 