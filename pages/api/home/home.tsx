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

// 定义 Dify 相关的类型
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

// 定义应用配置接口
interface AppConfig {
  id: number;
  name: string;
  apiKey: string;
  apiUrl?: string; // 可选的应用特定 API URL
}

// 定义应用配置数据
const appConfigs: Record<number, AppConfig> = {
  // ID 1: DeepSeek (假设)
  1: {
    id: 1,
    name: 'DeepSeek',
    // Fallback: env -> json -> empty string
    apiKey: process.env.NEXT_PUBLIC_DIFY_APP_DEEPSEEK_API_KEY || difyKeysData['1']?.apiKey || '',
    // Fallback: env -> json -> undefined (will use global later)
    apiUrl: process.env.NEXT_PUBLIC_DIFY_APP_DEEPSEEK_API_URL || difyKeysData['1']?.apiUrl
  },
  // ID 2: Course Helper
  2: {
    id: 2,
    name: '课程助手',
    apiKey: process.env.NEXT_PUBLIC_DIFY_APP_COURSE_API_KEY || difyKeysData['2']?.apiKey || '',
    apiUrl: process.env.NEXT_PUBLIC_DIFY_APP_COURSE_API_URL || difyKeysData['2']?.apiUrl
  },
  // ID 3: Campus Assistant
  3: {
    id: 3,
    name: '校园助理',
    apiKey: process.env.NEXT_PUBLIC_DIFY_APP_CAMPUS_API_KEY || difyKeysData['3']?.apiKey || '',
    apiUrl: process.env.NEXT_PUBLIC_DIFY_APP_CAMPUS_API_URL || difyKeysData['3']?.apiUrl
  },
  // ID 4: Teacher Assistant
  4: {
    id: 4,
    name: '教师助手',
    apiKey: process.env.NEXT_PUBLIC_DIFY_APP_TEACHER_API_KEY || difyKeysData['4']?.apiKey || '',
    apiUrl: process.env.NEXT_PUBLIC_DIFY_APP_TEACHER_API_URL || difyKeysData['4']?.apiUrl
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

  // --- New Async function to handle the actual Dify call --- 
  const handleDifyApiCall = async (
    apiKey: string, 
    originalMessage: Message, 
    temporaryId: string, 
    appConfig: AppConfig, 
    user: string | null,
    // Pass a mutable object to accumulate results
    accumulation: { response: string; convId: string | undefined; msgId: string | undefined }
  ) => {
    console.log(`[handleDifyApiCall] Starting API call for temporary ID: ${temporaryId}`);
    
    // We no longer need local variables here for accumulation
    // let streamedResponse = '';
    // let finalDifyConversationId: string | undefined = undefined;
    // let finalAssistantMessageId: string | undefined = undefined; 

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
        conversationId: '',
        inputs: {},
      });

      stream.onMessage((chunk: any) => {
          if (stopConversationRef.current === true) return;
          if (chunk.event === 'agent_message' || chunk.event === 'message') {
              // Update the properties of the MUTABLE accumulation object
              accumulation.response += chunk.answer || '';
              if (chunk.conversation_id) {
                  accumulation.convId = chunk.conversation_id;
                  // Log only once when ID is first received
                  if (accumulation.convId === chunk.conversation_id && chunk.conversation_id !== undefined) { 
                     console.log(`[handleDifyApiCall onMessage] Received Dify Conversation ID: ${accumulation.convId}`);
                  }
              }
              if (chunk.id) {
                  accumulation.msgId = chunk.id; 
              }
          } else if (chunk.event === 'agent_thought') { /* ... */ }
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
          
          const currentState = contextValue.state;
          const currentConversationsList = currentState.conversations;

          console.log("[handleDifyApiCall onComplete] Values from accumulation object:", JSON.stringify(accumulation));

          // --- Attempt to get conversationId directly from the stream object --- 
          // This is a guess based on potential client implementation
          let finalDifyConversationIdFromStream: string | undefined = undefined;
          try {
              // @ts-ignore - Attempting to access a potential property
              if (stream && typeof stream === 'object' && 'conversationId' in stream && stream.conversationId) {
                 // @ts-ignore
                 finalDifyConversationIdFromStream = stream.conversationId;
                 console.log("[handleDifyApiCall onComplete] Got conversationId directly from stream object:", finalDifyConversationIdFromStream);
              } else {
                 console.log("[handleDifyApiCall onComplete] Could not find conversationId directly on stream object. Falling back to accumulation (likely undefined).");
                 finalDifyConversationIdFromStream = accumulation.convId; // Fallback
              }
          } catch (e) {
              console.warn("[handleDifyApiCall onComplete] Error accessing stream.conversationId:", e);
              finalDifyConversationIdFromStream = accumulation.convId; // Fallback on error
          }
          // --- End attempt ---

          const finalAssistantMessage: Message = {
              role: 'assistant',
              content: accumulation.response, // Use accumulated response
              id: accumulation.msgId || uuidv4() // Use accumulated msgId or fallback
          };

          const finalConversation: Conversation = {
            id: temporaryId, 
            name: `${appConfig.name} - ${originalMessage.content.substring(0, 20)}...`, 
            originalName: appConfig.name,
            messages: [originalMessage, finalAssistantMessage], 
            prompt: DEFAULT_SYSTEM_PROMPT,
            temperature: DEFAULT_TEMPERATURE,
            folderId: null,
            // Use the ID obtained directly from the stream if available
            conversationID: finalDifyConversationIdFromStream || '', // Use accumulated convId
            deletable: true,
            appId: appConfig.id,
          };

          console.log("[handleDifyApiCall onComplete] Final conversation object built:", JSON.stringify(finalConversation, null, 2));

          const finalConversationsList = [finalConversation, ...currentConversationsList];

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
    }
  };

  const startConversationFromActiveApp = async (message: Message) => {
    if (!activeAppId) {
      return;
    }
    const appConfig = appConfigs[activeAppId];
    if (!appConfig || !appConfig.apiKey) {
      return;
    }

    console.log(`[startConversationFromActiveApp] Initiating for App: ${appConfig.name} (ID: ${activeAppId})`);

    const assistantPlaceholderId = uuidv4();
    const newConversationId_temporary = uuidv4();

    const tempDisplayConversation: Conversation = {
      id: newConversationId_temporary,
      name: `${appConfig.name} - ${message.content.substring(0, 20)}...`,
      originalName: appConfig.name,
      messages: [
        message,
        { role: 'assistant', content: '', id: assistantPlaceholderId }
      ],
      prompt: DEFAULT_SYSTEM_PROMPT,
      temperature: DEFAULT_TEMPERATURE,
      folderId: null,
      conversationID: '', 
      deletable: true,
      appId: activeAppId,
    };

    console.log('[startConversationFromActiveApp] Dispatching initial UI updates (selectedConv only).');
    dispatch({ field: 'selectedConversation', value: tempDisplayConversation });
    dispatch({ field: 'activeAppId', value: null });
    dispatch({ field: 'messageIsStreaming', value: true });
    dispatch({ field: 'loading', value: true });

    // --- Create the mutable accumulation object --- 
    const accumulation = {
      response: '',
      convId: undefined as string | undefined,
      // Initialize msgId with the placeholder ID, it might be updated by Dify
      msgId: assistantPlaceholderId 
    };

    // --- Pass the accumulation object to the delayed call --- 
    setTimeout(() => {
      handleDifyApiCall(appConfig.apiKey, message, newConversationId_temporary, appConfig, user, accumulation);
    }, 10); 

  };

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
        selectedConversation && whitelist.includes(user) ? (
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
