import { Dispatch, createContext } from 'react';

import { ActionType } from '@/hooks/useCreateReducer';

import { Conversation, Message } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { FolderType } from '@/types/folder';

import { HomeInitialState } from './home.state';

// --- 定义 AppConfig 接口 (与 home.tsx 一致) ---
interface AppConfig {
  id: number;
  name: string;
  apiKey: string;
  apiUrl?: string;
}
// --- END 定义 ---

// HomeContextProps是一个接口，定义了上下文中的属性和方法。
export interface HomeContextProps {
  state: HomeInitialState;
  dispatch: Dispatch<ActionType<HomeInitialState>>;
  appConfigs: Record<number, AppConfig>;
  handleNewConversation: () => void;
  handleCreateFolder: (name: string, type: FolderType) => void;
  handleDeleteFolder: (folderId: string) => void;
  handleUpdateFolder: (folderId: string, name: string) => void;
  handleSelectConversation: (conversation: Conversation) => void;
  handleUpdateConversation: (
    conversation: Conversation,
    data: KeyValuePair,
  ) => void;
  handleDeleteConversation: (conversationId: string) => void;
  startConversationFromActiveApp: (message: Message) => Promise<void>;
}

const HomeContext = createContext<HomeContextProps>(undefined!);

export default HomeContext;
