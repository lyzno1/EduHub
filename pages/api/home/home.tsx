import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';

import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import useErrorService from '@/services/errorService';
import useApiService from '@/services/useApiService';

import {
  cleanConversationHistory,
  cleanSelectedConversation,
} from '@/utils/app/clean';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { saveFolders } from '@/utils/app/folders';
import { savePrompts } from '@/utils/app/prompts';
import { getSettings } from '@/utils/app/settings';

import { Conversation, Message } from '@/types/chat';
import { FolderInterface, FolderType } from '@/types/folder';
import { Prompt } from '@/types/prompt';

import { Chat } from '@/components/Chat/Chat';
import { Navbar } from '@/components/Mobile/Navbar';
import LoginNotice from '@/components/Settings/loginNotice';
import { SidebarSlim } from '@/components/Sidebar/SidebarSlim';
import { SidebarNav } from '@/components/Chatbar/SidebarNav';

import HomeContext from './home.context';
import { HomeInitialState, initialState } from './home.state';

import defaultPrompt from '@/prompt.json';
import studentChat from '@/studentChat.json';
import teacherChat from '@/teacherChat.json';
import whitelist from '@/whitelist.json';
import Cookie from 'js-cookie';
import { v4 as uuidv4 } from 'uuid';
import { IconMenu2 } from '@tabler/icons-react';
import { DifyClient } from '@/services/dify/client';
import { getDifyConfig } from '@/config/dify';
import { toast } from 'react-hot-toast';
import difyKeysData from '@/dify_keys.json';

// Define and export AppConfig interface here
export interface AppConfig {
  id: number;
  name: string;
  apiKey: string;
  apiUrl?: string; // Optional app-specific API URL
  icon: JSX.Element;
}

// Define Dify related types
interface DifyConfig {
  apiUrl: string;
  apiKey: string;
}

interface Props {
  serverSideApiKeyIsSet: boolean;
  serverSidePluginKeysSet: boolean;
}

// 定义更新对话的类型
interface UpdateConversationData {
  key: string;
  value: any;
}

// 定义应用配置数据 (Use string keys to access difyKeysData)
const appConfigs: Record<number, AppConfig> = {
  // ID 1: DeepSeek 
  1: {
    id: 1,
    name: 'DeepSeek',
    apiKey: process.env.NEXT_PUBLIC_DIFY_APP_DEEPSEEK_API_KEY || difyKeysData['deepseek']?.apiKey || '', // Use 'deepseek'
    apiUrl: process.env.NEXT_PUBLIC_DIFY_APP_DEEPSEEK_API_URL || difyKeysData['deepseek']?.apiUrl, // Use 'deepseek'
    icon: <IconMenu2 size={24} />, // Assuming IconMenu2 is defined/imported
  },
  // ID 2: Course Helper
  2: {
    id: 2,
    name: '课程助手',
    apiKey: process.env.NEXT_PUBLIC_DIFY_APP_COURSE_API_KEY || difyKeysData['courseHelper']?.apiKey || '', // Use 'courseHelper'
    apiUrl: process.env.NEXT_PUBLIC_DIFY_APP_COURSE_API_URL || difyKeysData['courseHelper']?.apiUrl, // Use 'courseHelper'
    icon: <IconMenu2 size={24} />,
  },
  // ID 3: Campus Assistant
  3: {
    id: 3,
    name: '校园助理',
    apiKey: process.env.NEXT_PUBLIC_DIFY_APP_CAMPUS_API_KEY || difyKeysData['campusAssistant']?.apiKey || '', // Use 'campusAssistant'
    apiUrl: process.env.NEXT_PUBLIC_DIFY_APP_CAMPUS_API_URL || difyKeysData['campusAssistant']?.apiUrl, // Use 'campusAssistant'
    icon: <IconMenu2 size={24} />,
  },
  // ID 4: Teacher Assistant
  4: {
    id: 4,
    name: '教师助手',
    apiKey: process.env.NEXT_PUBLIC_DIFY_APP_TEACHER_API_KEY || difyKeysData['teacherAssistant']?.apiKey || '', // Use 'teacherAssistant'
    apiUrl: process.env.NEXT_PUBLIC_DIFY_APP_TEACHER_API_URL || difyKeysData['teacherAssistant']?.apiUrl, // Use 'teacherAssistant'
    icon: <IconMenu2 size={24} />,
  },
};

const Home = ({
  serverSideApiKeyIsSet,
  serverSidePluginKeysSet,
}: Props) => {
  function CheckLogin() {
    const user = Cookie.get('user');
    console.log(user);
    return user ?? '';
  }

  const { t } = useTranslation('chat');
  const [initialRender, setInitialRender] = useState<boolean>(true);
  const [user, setUser] = useState<string>('');
  const [ready, setReady] = useState<boolean>(false);
  const contextValue = useCreateReducer<HomeInitialState>({
    initialState,
  });

  const {
    state: {
      apiKey,
      lightMode,
      folders,
      conversations,
      selectedConversation,
      prompts,
      activeAppId,
    },
    dispatch,
  } = contextValue;

  const stopConversationRef = useRef<boolean>(false);

  const handleSelectConversation = (conversation: Conversation) => {
    dispatch({
      field: 'selectedConversation',
      value: conversation,
    });
    dispatch({ field: 'activeAppId', value: null });
    saveConversation(conversation);
  };

  // FOLDER OPERATIONS  --------------------------------------------

  const handleCreateFolder = (name: string, type: FolderType) => {
    const newFolder: FolderInterface = {
      id: uuidv4(),
      name,
      type,
      deletable: true,
    };

    const updatedFolders = [...folders, newFolder];

    dispatch({ field: 'folders', value: updatedFolders });
    saveFolders(updatedFolders);
  };

  const handleDeleteFolder = (folderId: string) => {
    const updatedFolders = folders.filter((f) => f.id !== folderId);
    dispatch({ field: 'folders', value: updatedFolders });
    saveFolders(updatedFolders);

    const updatedConversations: Conversation[] = conversations.map((c) => {
      if (c.folderId === folderId) {
        return {
          ...c,
          folderId: null,
        };
      }

      return c;
    });

    dispatch({ field: 'conversations', value: updatedConversations });
    saveConversations(updatedConversations);

    const updatedPrompts: Prompt[] = prompts.map((p) => {
      if (p.folderId === folderId) {
        return {
          ...p,
          folderId: null,
        };
      }

      return p;
    });

    dispatch({ field: 'prompts', value: updatedPrompts });
    savePrompts(updatedPrompts);
  };

  const handleUpdateFolder = (folderId: string, name: string) => {
    const updatedFolders = folders.map((f) => {
      if (f.id === folderId) {
        return {
          ...f,
          name,
        };
      }

      return f;
    });

    dispatch({ field: 'folders', value: updatedFolders });

    saveFolders(updatedFolders);
  };

  // CONVERSATION OPERATIONS  --------------------------------------------

  // --- New Function to handle selecting or starting an app conversation ---
  const handleSelectOrStartAppConversation = (appId: number) => {
    const appConfig = appConfigs[appId];
    if (!appConfig) {
      console.error(`[App Click] Invalid appId: ${appId}`);
      return;
    }


    // 先保存当前对话的状态 (如果存在且有消息)
    if (selectedConversation && selectedConversation.messages.length > 0) {
      saveConversation(selectedConversation);
    }

    // 修改: 无论是否存在该应用的对话，都只设置 activeAppId 并清除 selectedConversation
    // 这样就会显示应用初始界面，而不是直接显示对话
    dispatch({ field: 'selectedConversation', value: undefined }); // 清除选中的对话
    dispatch({ field: 'activeAppId', value: appId }); // 设置激活的应用ID

    /* 移除原有逻辑
    // 查找是否已存在该应用的对话 (可以允许多个同 appId 对话，这里只找第一个)
    const existingAppConversation = conversations.find(conv => conv.appId === appId);

    if (existingAppConversation) {
      console.log(`[App Click] Found existing conversation for appId ${appId}. Selecting it.`);
      // 如果已存在，直接选中它
      dispatch({ field: 'selectedConversation', value: existingAppConversation });
      // 可选: 更新 activeAppId 用于高亮，但主要依赖 selectedConversation.appId
      dispatch({ field: 'activeAppId', value: appId }); 
    } else {
      console.log(`[App Click] No existing conversation found for appId ${appId}. Setting activeAppId.`);
      // 如果不存在，只设置 activeAppId 并清除 selectedConversation
      dispatch({ field: 'selectedConversation', value: undefined }); // 清除选中的对话
      dispatch({ field: 'activeAppId', value: appId }); // 设置激活的应用ID
      // 移除创建新对话的逻辑
      // const newAppConversation: Conversation = { ... };
      // const updatedConversations = [newAppConversation, ...conversations];
      // saveConversations(updatedConversations);
      // dispatch({ field: 'conversations', value: updatedConversations });
      // dispatch({ field: 'selectedConversation', value: newAppConversation });
      // saveConversation(newAppConversation);
      // console.log('[App Click] New app conversation creation skipped. Active app set.');
    }
    */
  };
  // --- End New Function ---

  // --- Re-insert handleDifyApiCall --- 
  const handleDifyApiCall = async (
    apiKey: string, 
    originalMessage: Message, 
    temporaryId: string, 
    appConfig: AppConfig, 
    user: string | null,
    accumulation: { response: string; convId: string | undefined; msgId: string | undefined }
  ) => {
    console.log(`[handleDifyApiCall] Starting API call for temporary ID: ${temporaryId}`);
    // ... implementation of handleDifyApiCall ...
    // (This function seems complex and might need review later, but restoring it first)
    try {
      const apiUrlToUse = appConfig.apiUrl || process.env.NEXT_PUBLIC_DIFY_API_URL || difyKeysData.global?.apiUrl || getDifyConfig().apiUrl;
      const client = new DifyClient({
        apiUrl: apiUrlToUse,
        timeout: getDifyConfig().timeout,
        debug: true,
      });

      const stream = await client.createChatStream({
        query: originalMessage.content,
        key: apiKey,
        user: user || 'unknown',
        conversationId: '', // Always starts a new Dify conversation?
        inputs: {},
      });

      stream.onMessage((chunk: any) => {
        if (stopConversationRef.current === true) return;
        if (chunk.event === 'agent_message' || chunk.event === 'message') {
          accumulation.response += chunk.answer || '';
          if (chunk.conversation_id) {
            if (accumulation.convId !== chunk.conversation_id) {
                 accumulation.convId = chunk.conversation_id;
                 console.log(`[handleDifyApiCall onMessage] Received Dify Conversation ID: ${accumulation.convId}`);
            }
          }
          if (chunk.id) {
            accumulation.msgId = chunk.id;
          }
        } else if (chunk.event === 'agent_thought') { /* Handle thoughts if necessary */ }
      });

      stream.onError((error: Error) => {
        if (stopConversationRef.current === true) return;
        console.error("[handleDifyApiCall] Dify stream error:", error);
        toast.error(`应用消息错误: ${error.message || '请求失败'}`);
        dispatch({ field: 'messageIsStreaming', value: false });
        dispatch({ field: 'loading', value: false });
      });

      stream.onComplete(() => {
        if (stopConversationRef.current === true) return;
        console.log("[handleDifyApiCall] Dify stream complete for temp ID:", temporaryId);
        
        const currentState = contextValue.state; // Get current state
        const currentConversationsList = currentState.conversations;

        console.log("[handleDifyApiCall onComplete] Values from accumulation object:", JSON.stringify(accumulation));

        let finalDifyConversationIdFromStream: string | undefined = accumulation.convId; // Use accumulated first
         try {
             // @ts-ignore
             if (stream && typeof stream === 'object' && 'conversationId' in stream && stream.conversationId) {
                // @ts-ignore
                finalDifyConversationIdFromStream = stream.conversationId;
                console.log("[handleDifyApiCall onComplete] Overriding with conversationId directly from stream object:", finalDifyConversationIdFromStream);
             }
         } catch (e) {
             console.warn("[handleDifyApiCall onComplete] Error accessing stream.conversationId:", e);
         }

        const finalAssistantMessage: Message = {
          role: 'assistant',
          content: accumulation.response,
          id: accumulation.msgId || uuidv4()
        };

        const finalConversation: Conversation = {
          id: temporaryId, 
          name: `${appConfig.name} - ${originalMessage.content.substring(0, 20)}...`, 
          originalName: appConfig.name,
          messages: [originalMessage, finalAssistantMessage], 
          prompt: DEFAULT_SYSTEM_PROMPT,
          temperature: DEFAULT_TEMPERATURE,
          folderId: null,
          conversationID: finalDifyConversationIdFromStream || '', 
          deletable: true,
          appId: appConfig.id,
        };

        console.log("[handleDifyApiCall onComplete] Final conversation object built:", JSON.stringify(finalConversation, null, 2));

        // Find the placeholder and replace it, or add if not found (shouldn't happen)
        const finalConversationsList = currentConversationsList.map(conv => 
           conv.id === temporaryId ? finalConversation : conv
        );
        // Check if placeholder was found and replaced
        if (!finalConversationsList.some(conv => conv.id === temporaryId)) {
            console.warn("[handleDifyApiCall onComplete] Placeholder conversation not found, adding to start.");
            finalConversationsList.unshift(finalConversation);
        }

        console.log("[handleDifyApiCall onComplete] Dispatching final state updates.");
        dispatch({ field: 'conversations', value: finalConversationsList });
        dispatch({ field: 'selectedConversation', value: finalConversation }); 

        saveConversations(finalConversationsList);
        saveConversation(finalConversation);
        
        dispatch({ field: 'messageIsStreaming', value: false });
        dispatch({ field: 'loading', value: false });
      });

    } catch (error: any) {
      console.error("[handleDifyApiCall] Error setting up or executing Dify stream:", error);
      toast.error(`启动应用对话失败: ${error.message || '未知错误'}`);
      dispatch({ field: 'messageIsStreaming', value: false });
      dispatch({ field: 'loading', value: false });
      // Remove the temporary conversation on error
      const currentConversations = contextValue.state.conversations;
      const conversationsWithoutTemp = currentConversations.filter(conv => conv.id !== temporaryId);
      dispatch({ field: 'conversations', value: conversationsWithoutTemp });
      // Optionally select the previous conversation or a new one
      if (conversationsWithoutTemp.length > 0) {
          dispatch({ field: 'selectedConversation', value: conversationsWithoutTemp[0] });
      } else {
          handleNewConversation();
      }
    }
  };
  // --- End Re-insert handleDifyApiCall ---

  // --- Re-insert startConversationFromActiveApp --- 
  const startConversationFromActiveApp = async (message: Message) => {
    // This function seems to create a temporary conversation UI first,
    // then calls handleDifyApiCall to get the actual response.
    // It uses the *global* activeAppId state, which might be out of sync
    // if the user clicks quickly. Consider passing appId directly if possible.
    const currentActiveAppId = contextValue.state.activeAppId; // Read current activeAppId

    if (!currentActiveAppId) {
      console.warn("[startConversationFromActiveApp] No activeAppId set.");
      return;
    }
    const appConfig = appConfigs[currentActiveAppId];
    if (!appConfig || !appConfig.apiKey) {
       console.error(`[startConversationFromActiveApp] Invalid or missing config/apiKey for activeAppId: ${currentActiveAppId}`);
      return;
    }

    console.log(`[startConversationFromActiveApp] Initiating for App: ${appConfig.name} (ID: ${currentActiveAppId})`);

    const assistantPlaceholderId = uuidv4();
    const newConversationId_temporary = uuidv4(); // Use temporary ID for UI

    // Create a temporary conversation object for immediate UI display
    const tempDisplayConversation: Conversation = {
      id: newConversationId_temporary, 
      name: `${appConfig.name} - Loading...`, // Indicate loading state
      originalName: appConfig.name,
      messages: [
        message,
        { role: 'assistant', content: '', id: assistantPlaceholderId } // Placeholder for response
      ],
      prompt: DEFAULT_SYSTEM_PROMPT,
      temperature: DEFAULT_TEMPERATURE,
      folderId: null,
      conversationID: '', 
      deletable: true, // Initially deletable, might change after completion
      appId: currentActiveAppId,
    };

    // Add temporary conversation to the list for UI update first
    const conversationsWithTemp = [tempDisplayConversation, ...contextValue.state.conversations];
    dispatch({ field: 'conversations', value: conversationsWithTemp });

    console.log('[startConversationFromActiveApp] Dispatching initial UI updates.');
    dispatch({ field: 'selectedConversation', value: tempDisplayConversation });
    dispatch({ field: 'activeAppId', value: null }); // Clear activeAppId after starting
    dispatch({ field: 'messageIsStreaming', value: true });
    dispatch({ field: 'loading', value: true });

    const accumulation = {
      response: '',
      convId: undefined as string | undefined,
      msgId: assistantPlaceholderId
    };

    // Call the API handling function (might run slightly delayed)
    // Pass the temporary UI ID so it can be replaced later
    handleDifyApiCall(appConfig.apiKey, message, newConversationId_temporary, appConfig, user, accumulation);
      
  };
  // --- End Re-insert startConversationFromActiveApp ---

  const handleNewConversation = () => {
    if (selectedConversation && selectedConversation.messages.length > 0) {
      saveConversation(selectedConversation);
    }
    const existingNewChat = conversations.find(
      (chat) => chat.messages.length === 0 && chat.name === t('New Conversation')
    );
    if (existingNewChat) {
      dispatch({ field: 'selectedConversation', value: existingNewChat });
      dispatch({ field: 'activeAppId', value: null });
      return;
    }
    const newConversation: Conversation = {
      id: uuidv4(),
      name: t('New Conversation'),
      originalName: '',
      messages: [],
      prompt: DEFAULT_SYSTEM_PROMPT,
      temperature: DEFAULT_TEMPERATURE,
      folderId: null,
      conversationID: '',
      deletable: true,
      appId: null,
    };
    const updatedConversations = [newConversation, ...conversations];
    saveConversations(updatedConversations);
    dispatch({ field: 'conversations', value: updatedConversations });
    dispatch({ field: 'selectedConversation', value: newConversation });
    dispatch({ field: 'activeAppId', value: null });
    console.log('创建新会话 (并取消激活应用)');
  };

  const handleUpdateConversation = (
    conversation: Conversation,
    data: UpdateConversationData,
  ) => {
    const updatedConversation = {
      ...conversation,
      [data.key]: data.value,
    };

    const { single, all } = updateConversation(
      updatedConversation,
      conversations,
    );

    dispatch({ field: 'selectedConversation', value: single });
    dispatch({ field: 'conversations', value: all });
  };

  const handleDeleteConversation = (conversationId: string) => {
    const updatedConversations = conversations.filter(
      (conversation) => conversation.id !== conversationId
    );

    if (selectedConversation?.id === conversationId) {
      if (updatedConversations.length > 0) {
        dispatch({
          field: 'selectedConversation',
          value: updatedConversations[0],
        });
      } else {
        handleNewConversation();
      }
    }

    dispatch({ field: 'conversations', value: updatedConversations });
    saveConversations(updatedConversations);
  };

  // EFFECTS  --------------------------------------------

  useEffect(() => {
    if (window.innerWidth < 640) {
      dispatch({ field: 'showChatbar', value: false });
    }
  }, [selectedConversation]);

  useEffect(() => {
    setUser(CheckLogin());
    setReady(true);

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      dispatch({
        field: 'lightMode',
        value: savedTheme,
      });
      
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    } else {
      dispatch({
        field: 'lightMode',
        value: 'light',
      });
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }

    if (serverSideApiKeyIsSet) {
      dispatch({ field: 'apiKey', value: '' });
      localStorage.removeItem('apiKey');
    } else if (apiKey) {
      dispatch({ field: 'apiKey', value: apiKey });
    }

    const pluginKeys = localStorage.getItem('pluginKeys');
    if (serverSidePluginKeysSet) {
      dispatch({ field: 'pluginKeys', value: [] });
      localStorage.removeItem('pluginKeys');
    } else if (pluginKeys) {
      dispatch({ field: 'pluginKeys', value: pluginKeys });
    }

    if (window.innerWidth < 640) {
      dispatch({ field: 'showChatbar', value: false });
      dispatch({ field: 'showPromptbar', value: false });
    }

    const showChatbar = localStorage.getItem('showChatbar');
    if (showChatbar) {
      dispatch({ field: 'showChatbar', value: showChatbar === 'true' });
    }

    const showPromptbar = localStorage.getItem('showPromptbar');
    if (showPromptbar) {
      dispatch({ field: 'showPromptbar', value: showPromptbar === 'true' });
    }

    const folders = localStorage.getItem('folders');
    if (folders) {
      dispatch({ field: 'folders', value: JSON.parse(folders) });
    }

    const prompts = localStorage.getItem('prompts');
    if (prompts) {
      dispatch({ field: 'prompts', value: JSON.parse(prompts) });
    }

    let savedConversations: Conversation[] = [];
    const conversationHistory = localStorage.getItem('conversationHistory');
    
    if (conversationHistory) {
      const parsedConversationHistory: Conversation[] = JSON.parse(conversationHistory);
      savedConversations = cleanConversationHistory(parsedConversationHistory);
      dispatch({ field: 'conversations', value: savedConversations });
    }

    const selectedConversation = localStorage.getItem('selectedConversation');
    
    if (selectedConversation) {
      const parsedSelectedConversation: Conversation = JSON.parse(selectedConversation);
      const cleanedSelectedConversation = cleanSelectedConversation(parsedSelectedConversation);
      
      if (!savedConversations.find(conv => conv.id === cleanedSelectedConversation.id)) {
        savedConversations = [cleanedSelectedConversation, ...savedConversations]; 
        dispatch({ field: 'conversations', value: savedConversations });
        saveConversations(savedConversations);
      }
      dispatch({ field: 'selectedConversation', value: cleanedSelectedConversation });
    } else if (savedConversations.length > 0) {
       console.log('[Debug useEffect] No selected conversation loaded, selecting first from loaded history.');
       dispatch({ field: 'selectedConversation', value: savedConversations[0] });
       saveConversation(savedConversations[0]);
    } else {
       console.log('[Debug useEffect] No conversations found, creating default new conversation.');
       const newConversation: Conversation = {
         id: uuidv4(),
         name: t('New Conversation'),
         originalName: '',
         messages: [],
         prompt: DEFAULT_SYSTEM_PROMPT,
         temperature: DEFAULT_TEMPERATURE,
         folderId: null,
         conversationID: '',
         deletable: true,
         appId: null,
       };

       const updatedConversations = [newConversation];
       
       dispatch({ field: 'selectedConversation', value: newConversation });
       dispatch({ field: 'conversations', value: updatedConversations });
       
       saveConversation(newConversation);
       saveConversations(updatedConversations);
    }
  }, [dispatch, serverSideApiKeyIsSet, serverSidePluginKeysSet]);

  useEffect(() => {
    if (user) {
      dispatch({ field: 'user', value: user });

      const defaultData = user.length === 8 ? teacherChat : studentChat;
      console.log(user, user.length);
      
      const chatFolders: FolderInterface[] = defaultData.Folders.map(
        (folder) => ({
          ...folder,
          type: 'chat',
        }),
      );

      const PromptFolders: FolderInterface[] = defaultPrompt.Folders.map(
        (folder) => ({
          ...folder,
          type: 'prompt',
        }),
      );

      const defaultFolders = [...chatFolders, ...PromptFolders];
      dispatch({ field: 'folders', value: defaultFolders });

      const defaultConversations: Conversation[] = defaultData.Chats.map(
        (chat) => ({
          ...chat,
          conversationID: '',
          originalName: chat.name,
          messages: [],
          prompt: DEFAULT_SYSTEM_PROMPT,
          temperature: DEFAULT_TEMPERATURE,
          deletable: false,
          appId: null,
        }),
      );

      const savedConversations = localStorage.getItem('conversationHistory');
      if (!savedConversations) {
        const newConversation: Conversation = {
          id: uuidv4(),
          name: t('New Conversation'),
          originalName: '',
          messages: [],
          prompt: DEFAULT_SYSTEM_PROMPT,
          temperature: DEFAULT_TEMPERATURE,
          folderId: null,
          conversationID: '',
          deletable: true,
          appId: null,
        };
        
        const initialConversations = [newConversation, ...defaultConversations];
        dispatch({ field: 'conversations', value: initialConversations });
        dispatch({ field: 'selectedConversation', value: newConversation });
        
        saveConversations(initialConversations);
        saveConversation(newConversation);
      } else {
        const parsedConversations = JSON.parse(savedConversations);
        dispatch({ field: 'conversations', value: parsedConversations });
      }

      const loadedPrompt: Prompt[] = defaultPrompt.Prompts.map((prompt) => ({
        ...prompt,
        deletable: false,
      }));
      dispatch({ field: 'prompts', value: loadedPrompt });
    }
  }, [user]);

  const [showSidebar, setShowSidebar] = useState<boolean>(false);

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
    localStorage.setItem('showSidebar', (!showSidebar).toString());
  };

  useEffect(() => {
    const savedShowSidebar = localStorage.getItem('showSidebar');
    if (savedShowSidebar !== null) {
      setShowSidebar(savedShowSidebar === 'true');
    } else {
      setShowSidebar(false);
      localStorage.setItem('showSidebar', 'false');
    }
  }, []);

  return (
    <HomeContext.Provider
      value={{
        ...contextValue,
        appConfigs,
        handleNewConversation,
        handleSelectConversation,
        handleUpdateConversation,
        handleDeleteConversation,
        handleCreateFolder,
        handleDeleteFolder,
        handleUpdateFolder,
        handleSelectOrStartAppConversation,
        startConversationFromActiveApp,
      }}
    >
      <Head>
        <title>eduhub</title>
        <meta name="description" content="ChatGPT but better." />
        <meta
          name="viewport"
          content="height=device-height, width=device-width, initial-scale=1, user-scalable=no"
        />
      </Head>
      {ready ? (
        /* 移除selectedConversation检查:
           原条件: selectedConversation && whitelist.includes(user)
           问题: 当切换对话时，selectedConversation可能暂时为null，导致触发登录提示
           即使用户在白名单中也会被重定向到登录页面
           修改为只检查白名单，解决过渡状态的登录跳转问题 */
        whitelist.includes(user) ? (
          <main className="flex h-screen w-screen flex-col text-sm text-black bg-white dark:text-white dark:bg-[#343541]">
            <div className="fixed top-0 w-full sm:hidden z-40">
              <div className="flex items-center h-12 px-4 bg-white dark:bg-[#202123] border-b border-neutral-200 dark:border-neutral-600">
                <button
                  className="h-9 w-9 flex items-center justify-center rounded-md text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  onClick={toggleSidebar}
                  aria-label="打开菜单"
                >
                  <IconMenu2 size={24} />
                </button>
                <div className="ml-auto"></div>
              </div>
            </div>

            <div className="flex h-full w-full pt-[48px] sm:pt-0">
              <div className="relative z-30 hidden sm:block">
                <SidebarSlim onToggle={toggleSidebar} isSidebarOpen={showSidebar} />
              </div>
              
              <div 
                className={`fixed sm:relative inset-0 bg-black/50 transition-opacity duration-300 ${
                  showSidebar ? 'opacity-100' : 'opacity-0 pointer-events-none'
                } sm:opacity-100 sm:pointer-events-auto`} 
                onClick={toggleSidebar}
                style={{
                  zIndex: typeof window !== 'undefined' && window.innerWidth < 640 ? 9998 : 20
                }}
              >
                <div 
                  onClick={e => e.stopPropagation()} 
                  className="h-full"
                >
                  <SidebarNav onToggle={toggleSidebar} isOpen={showSidebar} />
                </div>
              </div>

              <div className={`flex flex-1 transition-all duration-300 ${showSidebar ? 'sm:ml-[320px]' : 'sm:ml-[60px]'} ml-0`}>
                <Chat stopConversationRef={stopConversationRef} showSidebar={showSidebar} />
              </div>
            </div>
          </main>
        ) : !user ? (
          <LoginNotice content="您还没有登录，请登录！" showButton={true} />
        ) : !whitelist.includes(user) ? (
          <LoginNotice content="您没有权限访问该页面！" showButton={false} />
        ) : null
      ) : null}
    </HomeContext.Provider>
  );
};

export default Home;

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  let serverSidePluginKeysSet = false;

  const googleApiKey = process.env.GOOGLE_API_KEY;
  const googleCSEId = process.env.GOOGLE_CSE_ID;

  if (googleApiKey && googleCSEId) {
    serverSidePluginKeysSet = true;
  }

  return {
    props: {
      serverSideApiKeyIsSet: !!process.env.DIFY_API_KEY,
      serverSidePluginKeysSet,
      ...(await serverSideTranslations(locale ?? 'en', [
        'common',
        'chat',
        'sidebar',
        'markdown',
        'promptbar',
        'settings',
      ])),
    },
  };
};
