import { Conversation, Message } from '@/types/chat';
import { ErrorMessage } from '@/types/error';
import { FolderInterface } from '@/types/folder';
import { OpenAIModel, OpenAIModelID } from '@/types/openai';
import { OpenAIModels, fallbackModelID } from '@/types/openai';
import { PluginKey } from '@/types/plugin';
import { Prompt } from '@/types/prompt';
import { DifyModelConfig } from '@/types/dify';

// HomeInitialState接口包含的属性
export interface HomeInitialState {
  apiKey: string;
  pluginKeys: PluginKey[];
  loading: boolean;
  lightMode: 'light' | 'dark' | 'red' | 'blue' | 'green' | 'purple' | 'brown' ;
  messageIsStreaming: boolean;
  modelError: ErrorMessage | null;
  models: OpenAIModel[];
  folders: FolderInterface[];
  conversations: Conversation[];
  selectedConversation: Conversation | undefined;
  currentMessage: Message | undefined;
  prompts: Prompt[];
  activePromptID: string;
  temperature: number;
  showChatbar: boolean;
  showPromptbar: boolean;
  currentFolder: FolderInterface | undefined;
  messageError: boolean;
  searchTerm: string;
  defaultModelId: OpenAIModelID | undefined;
  serverSideApiKeyIsSet: boolean;
  serverSidePluginKeysSet: boolean;
  user: string;
  version: string;
  activeAppId: number | null;
  selectedCardId: string | null;
  cardInputPrompt: string;
  availableGlobalModels: DifyModelConfig[];
  selectedGlobalModelName: string | null;
}

// 首页的初始状态
export const initialState: HomeInitialState = {
  apiKey: '',
  loading: false,
  pluginKeys: [],
  lightMode: 'light',
  messageIsStreaming: false,
  modelError: null,
  models: [],
  folders: [],
  conversations: [],
  selectedConversation: undefined,
  currentMessage: undefined,
  prompts: [],
  activePromptID: "",
  temperature: 1,
  showPromptbar: true,
  showChatbar: true,
  currentFolder: undefined,
  messageError: false,
  searchTerm: '',
  defaultModelId: OpenAIModelID.智能助手,
  serverSideApiKeyIsSet: true,
  serverSidePluginKeysSet: false,
  user: 'unknown',
  version:"2024032701",
  activeAppId: null,
  selectedCardId: null,
  cardInputPrompt: '',
  availableGlobalModels: [],
  selectedGlobalModelName: null,
};
