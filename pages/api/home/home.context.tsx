import { Dispatch, createContext } from 'react';

import { ActionType } from '@/hooks/useCreateReducer';

import { Conversation, Message } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { FolderType } from '@/types/folder';
import { AppConfig } from './home'; // Import AppConfig now that it's exported
import { HomeInitialState } from './home.state';

// HomeContextProps是一个接口，定义了上下文中的属性和方法。
export interface HomeContextProps {
  state: HomeInitialState;
  dispatch: Dispatch<ActionType<HomeInitialState>>;
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
  handleSelectOrStartAppConversation: (appId: number) => void;
  startConversationFromActiveApp: (message: Message) => Promise<void>;
  handleTogglePinConversation: (conversationId: string) => void;
  appConfigs: Record<number, AppConfig>;
}

const HomeContext = createContext<HomeContextProps>(undefined!);

export default HomeContext;
