import { Conversation } from '@/types/chat';
import { FolderInterface } from '@/types/folder';
import { Prompt } from '@/types/prompt';

export interface HomeInitialState {
  apiKey: string;
  loading: boolean;
  lightMode: 'light' | 'dark';
  messageIsStreaming: boolean;
  modelError: boolean;
  showChatbar: boolean;
  showPromptbar: boolean;
  currentFolder: FolderInterface | null;
  selectedConversation: Conversation | null;
  conversations: Conversation[];
  prompts: Prompt[];
  folders: FolderInterface[];
  pluginKeys: PluginKey[];
  serverSideApiKeyIsSet: boolean;
  serverSidePluginKeysSet: boolean;
  user: string;
}

export const initialState: HomeInitialState = {
  apiKey: '',
  loading: false,
  lightMode: 'light',
  messageIsStreaming: false,
  modelError: false,
  showChatbar: true,
  showPromptbar: false,
  currentFolder: null,
  selectedConversation: null,
  conversations: [],
  prompts: [],
  folders: [],
  pluginKeys: [],
  serverSideApiKeyIsSet: false,
  serverSidePluginKeysSet: false,
  user: '',
};

interface PluginKey {
  pluginId: string;
  requiredKeys: RequiredKeys[];
}

interface RequiredKeys {
  key: string;
  value: string;
} 