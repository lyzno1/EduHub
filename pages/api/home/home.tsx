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
import { getSettings } from '@/utils/app/settings';

import { Conversation, Message } from '@/types/chat';
import { FolderInterface, FolderType } from '@/types/folder';
import { DifyModelConfig, DifyFolderConfig, DifyAppCardConfig } from '@/types/dify';

import { Chat } from '@/components/Chat/Chat';
import { Navbar } from '@/components/Mobile/Navbar';
import LoginNotice from '@/components/Settings/loginNotice';
import { SidebarSlim } from '@/components/Sidebar/SidebarSlim';
import { SidebarNav } from '@/components/Chatbar/SidebarNav';
import { ChatSettingsModal } from '@/components/Settings/ChatSettingsModal';

import HomeContext from './home.context';
import { HomeInitialState, initialState } from './home.state';

import studentChat from '@/studentChat.json';
import teacherChat from '@/teacherChat.json';
import whitelist from '@/whitelist.json';
import Cookie from 'js-cookie';
import { v4 as uuidv4 } from 'uuid';
import { IconMenu2, IconAppWindow } from '@tabler/icons-react';
import { DifyClient } from '@/services/dify/client';
import { getDifyConfig } from '@/config/dify';
import { toast } from 'react-hot-toast';
import difyConfigService from '@/services/difyConfigService';

// Define and export AppConfig interface here
export interface AppConfig {
  id: number;
  name: string;
  apiKey: string;
  apiUrl?: string;
  icon: JSX.Element;
  folderKey?: string;
  cards?: DifyAppCardConfig[];
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

// Default Icon component to use for all apps from config
const DefaultAppConfigIcon = <IconAppWindow size={24} />;

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

  // ADD state for appConfigs
  const [appConfigsInState, setAppConfigsInState] = useState<Record<number, AppConfig>>({});

  // ADD useEffect to load and process configs on mount
  useEffect(() => {
    try {
      const loadedFolderConfigs: Record<string, DifyFolderConfig> = difyConfigService.getAllFolderConfigs();
      
      const generatedAppConfigs: Record<number, AppConfig> = {};
      
      Object.entries(loadedFolderConfigs).forEach(([appIdStr, folder]) => {
        const appId = parseInt(appIdStr, 10);
        if (isNaN(appId) || appId === 0) return; // Skip global and invalid
        
        const firstCard = folder.cards?.[0]; // Use optional chaining
        
        const icon = DefaultAppConfigIcon;

        generatedAppConfigs[appId] = {
          id: appId,
          name: folder.displayName,
          // Safely access difyConfig properties using optional chaining
          apiKey: process.env.NEXT_PUBLIC_DIFY_APP_GENERIC_API_KEY || 
                  firstCard?.difyConfig?.apiKey || '',
          apiUrl: process.env.NEXT_PUBLIC_DIFY_APP_GENERIC_API_URL || 
                  firstCard?.difyConfig?.apiUrl, // Will be undefined if firstCard or difyConfig is missing
          icon: icon,
          folderKey: folder.folderKey,
          cards: folder.cards || [],
        };
      });
      
      setAppConfigsInState(generatedAppConfigs);

    } catch (error) {
        console.error("[Home Init] Error processing folder configs:", error);
        setAppConfigsInState({});
    }
  }, []);

  const {
    state: {
      apiKey,
      lightMode,
      folders,
      conversations,
      selectedConversation,
      activeAppId,
      availableGlobalModels,
      selectedGlobalModelName,
      allowedAppsConfig,
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
    // Now use appConfigsInState from component state
    const appConfig = appConfigsInState[appId]; 
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
    // ===== 重新添加：清空卡片和提示词状态 =====
    dispatch({ field: 'selectedCardId', value: null });
    dispatch({ field: 'cardInputPrompt', value: '' });
    // ===== 添加结束 =====
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
    try {
      const apiConfig = accumulation; 
      
      // 修复：获取 API URL，优先使用 appConfig.apiUrl，然后是全局 URL，再是环境变量和静态配置
      const apiUrlToUse = appConfig.apiUrl || difyConfigService.getGlobalApiUrl() || process.env.NEXT_PUBLIC_DIFY_API_URL || getDifyConfig().apiUrl;

      if (!apiUrlToUse) {
        console.error(`[handleDifyApiCall] 无法确定 API URL for app ${appConfig.id}`);
        toast.error(`应用配置错误: 缺少 API URL`);
        dispatch({ field: 'messageIsStreaming', value: false });
        dispatch({ field: 'loading', value: false });
        const currentConversations = contextValue.state.conversations;
        const conversationsWithoutTemp = currentConversations.filter(conv => conv.id !== temporaryId);
        dispatch({ field: 'conversations', value: conversationsWithoutTemp });
        if (conversationsWithoutTemp.length > 0) {
            dispatch({ field: 'selectedConversation', value: conversationsWithoutTemp[0] });
        } else {
            handleNewConversation(); 
        }
        return; // 提前退出
      }

      const difyClient = new DifyClient({
        apiUrl: apiUrlToUse,
        timeout: getDifyConfig().timeout,
        debug: true,
      });

      const stream = await difyClient.createChatStream({
        query: originalMessage.content,
        key: apiKey,
        user: user || 'unknown',
        conversationId: '', 
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
         const currentConversations = contextValue.state.conversations;
         const conversationsWithoutTemp = currentConversations.filter(conv => conv.id !== temporaryId);
         dispatch({ field: 'conversations', value: conversationsWithoutTemp });
         if (conversationsWithoutTemp.length > 0) {
             dispatch({ field: 'selectedConversation', value: conversationsWithoutTemp[0] });
         } else {
             handleNewConversation();
         }
      });

      stream.onComplete(() => {
        if (stopConversationRef.current === true) return;
        console.log("[handleDifyApiCall] Dify stream complete for temp ID:", temporaryId);
        
        const currentState = contextValue.state;
        const currentConversationsList = currentState.conversations;

        console.log("[handleDifyApiCall onComplete] Values from accumulation object:", JSON.stringify(accumulation));

        let finalDifyConversationIdFromStream: string | undefined = accumulation.convId;
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
          model: 'dify'
        };

        console.log("[handleDifyApiCall onComplete] Final conversation object built:", JSON.stringify(finalConversation, null, 2));

        const finalConversationsList = currentConversationsList.map(conv => 
           conv.id === temporaryId ? finalConversation : conv
        );
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
      const currentConversations = contextValue.state.conversations;
      const conversationsWithoutTemp = currentConversations.filter(conv => conv.id !== temporaryId);
      dispatch({ field: 'conversations', value: conversationsWithoutTemp });
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
    const appConfig = appConfigsInState[currentActiveAppId];
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
      model: 'dify'
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

  const handleNewConversation = (modelNameToUse?: string | null) => {
    if (selectedConversation && selectedConversation.messages.length > 0) {
      saveConversation(selectedConversation);
    }
    
    // 检查是否已存在一个完全空的"新对话" (避免重复创建)
    const existingEmptyNewChat = conversations.find(
      (chat) => chat.messages.length === 0 && chat.name === t('New Conversation') && chat.appId === null
    );
    if (existingEmptyNewChat) {
       // 如果存在空的，直接选中它，并确保其 modelName 更新 (如果提供了)
      const modelNameForExisting = modelNameToUse !== undefined ? modelNameToUse : selectedGlobalModelName;
      if (existingEmptyNewChat.modelName !== modelNameForExisting) {
          const updatedExistingChat = { ...existingEmptyNewChat, modelName: modelNameForExisting };
          const updatedConversations = conversations.map(conv => conv.id === updatedExistingChat.id ? updatedExistingChat : conv);
          dispatch({ field: 'conversations', value: updatedConversations });
          dispatch({ field: 'selectedConversation', value: updatedExistingChat });
          saveConversation(updatedExistingChat);
          saveConversations(updatedConversations);
      } else {
          dispatch({ field: 'selectedConversation', value: existingEmptyNewChat });
      }
      dispatch({ field: 'activeAppId', value: null }); 
      return;
    }

    // 如果不存在空的，则创建新的
    // 优先使用传入的 modelNameToUse，否则使用当前的全局状态
    const finalModelName = modelNameToUse !== undefined ? modelNameToUse : selectedGlobalModelName;

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
      model: 'default', 
      modelName: finalModelName, // 使用最终确定的模型名称
    };
    const updatedConversations = [newConversation, ...conversations];
    saveConversations(updatedConversations);
    dispatch({ field: 'conversations', value: updatedConversations });
    dispatch({ field: 'selectedConversation', value: newConversation });
    dispatch({ field: 'activeAppId', value: null });
    saveConversation(newConversation); // 保存新对话
    console.log('创建新会话 (并取消激活应用)', newConversation);
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

  // Add the handleTogglePinConversation function
  const handleTogglePinConversation = (conversationId: string) => {
    const targetConversation = conversations.find(conv => conv.id === conversationId);
    if (!targetConversation) return; // Conversation not found

    const updatedConversation = {
      ...targetConversation,
      pinned: !targetConversation.pinned, // Toggle the pinned status
    };

    const updatedConversations = conversations.map(conv =>
      conv.id === conversationId ? updatedConversation : conv
    );

    // Update state
    dispatch({ field: 'conversations', value: updatedConversations });

    // Update selected conversation if it was the one pinned/unpinned
    if (selectedConversation?.id === conversationId) {
      dispatch({ field: 'selectedConversation', value: updatedConversation });
    }

    // Save to local storage
    saveConversations(updatedConversations);
    // Also save the potentially updated selected conversation
    if (selectedConversation?.id === conversationId) {
      saveConversation(updatedConversation);
    }
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
    const currentTheme = savedTheme || 'light';
    dispatch({ field: 'lightMode', value: currentTheme as HomeInitialState['lightMode'] });
    if (!savedTheme) {
      localStorage.setItem('theme', 'light');
    }
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }

    if (serverSideApiKeyIsSet) {
      dispatch({ field: 'apiKey', value: '' });
      localStorage.removeItem('apiKey');
    } else {
      const savedApiKey = localStorage.getItem('apiKey');
      if (savedApiKey) {
        dispatch({ field: 'apiKey', value: savedApiKey });
      }
    }

    const pluginKeys = localStorage.getItem('pluginKeys');
    if (serverSidePluginKeysSet) {
      dispatch({ field: 'pluginKeys', value: [] });
      localStorage.removeItem('pluginKeys');
    } else if (pluginKeys) {
      try {
        dispatch({ field: 'pluginKeys', value: JSON.parse(pluginKeys) });
      } catch (e) {
        dispatch({ field: 'pluginKeys', value: [] });
      }
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

    const foldersStr = localStorage.getItem('folders');
    if (foldersStr) {
      try {
        dispatch({ field: 'folders', value: JSON.parse(foldersStr) });
      } catch (e) {
        dispatch({ field: 'folders', value: [] });
      }
    }

    let savedConversations: Conversation[] = [];
    const conversationHistoryStr = localStorage.getItem('conversationHistory');
    if (conversationHistoryStr) {
      try {
        const parsedConversationHistory: Conversation[] = JSON.parse(conversationHistoryStr);
        savedConversations = cleanConversationHistory(parsedConversationHistory);
        dispatch({ field: 'conversations', value: savedConversations });
      } catch (e) {
        dispatch({ field: 'conversations', value: [] });
      }
    }

    const selectedConversationStr = localStorage.getItem('selectedConversation');
    if (selectedConversationStr) {
      try {
        const parsedSelectedConversation: Conversation = JSON.parse(selectedConversationStr);
        const cleanedSelectedConversation = cleanSelectedConversation(parsedSelectedConversation);
        if (savedConversations.find(conv => conv.id === cleanedSelectedConversation.id)) {
          dispatch({ field: 'selectedConversation', value: cleanedSelectedConversation });
        } else {
          // 如果选中的对话不在历史记录中 (可能被清理或删除), 则选择第一个或新建
          if (savedConversations.length > 0) {
            dispatch({ field: 'selectedConversation', value: savedConversations[0] });
            saveConversation(savedConversations[0]);
          } else {
            handleNewConversation(); // 需要确保 handleNewConversation 可用
          }
        }
      } catch (e) {
        // 解析失败，选择第一个或新建
        if (savedConversations.length > 0) {
          dispatch({ field: 'selectedConversation', value: savedConversations[0] });
          saveConversation(savedConversations[0]);
        } else {
          handleNewConversation();
        }
      }
    } else if (savedConversations.length > 0) {
       console.log('[Debug useEffect] No selected conversation in storage, selecting first from history.');
      dispatch({ field: 'selectedConversation', value: savedConversations[0] });
      saveConversation(savedConversations[0]);
    } else {
       // 首次加载无历史记录：创建并绑定新对话
      //  console.log('[Debug useEffect] No conversations found, creating default new conversation.');
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
         model: 'default',
         // 使用 state 中的 selectedGlobalModelName 或回退到默认值
         modelName: selectedGlobalModelName || difyConfigService.getDefaultGlobalModel()?.name || null,
       };
       dispatch({ field: 'selectedConversation', value: newConversation });
       dispatch({ field: 'conversations', value: [newConversation] });
       saveConversation(newConversation);
       saveConversations([newConversation]);
    }

    // 新增：加载全局模型配置 (确保 difyConfigService 已初始化)
    if (difyConfigService) { // 确保服务可用
      const globalModels = difyConfigService.getGlobalModels();
      dispatch({ field: 'availableGlobalModels', value: globalModels });
      
      // 仅在 selectedGlobalModelName 尚未被设置时（即第一次加载）设置默认值
      if (!selectedGlobalModelName) {
         const defaultGlobalModel = difyConfigService.getDefaultGlobalModel();
         const initialModelName = defaultGlobalModel?.name || (globalModels.length > 0 ? globalModels[0].name : null);
         if (initialModelName) {
           dispatch({ field: 'selectedGlobalModelName', value: initialModelName });
          //  console.log('[Home Init] 初始化设置默认全局模型:', initialModelName);
         } else {
            console.warn('[Home Init] 未配置任何全局模型！');
            dispatch({ field: 'selectedGlobalModelName', value: null });
         }
      }
    } else {
      console.error("[Home Init] DifyConfigService 未初始化或不可用！");
    }

  }, [dispatch, serverSideApiKeyIsSet, serverSidePluginKeysSet, selectedGlobalModelName]);

  // --- 新增/修改：useEffect for Role-based Config Loading --- 
  useEffect(() => {
    // 确定角色配置：
    // 如果 user 未定义、为空或长度不为 8 (即非教师工号)，则视为学生；否则视为老师。
    const isTeacher = user && user.length === 8;
    const roleConfig = isTeacher ? teacherChat : studentChat;
    // 使用 user || 'undefined' 以便在日志中清晰显示未定义状态
    // console.log(`[Role Init] User: ${user || 'undefined'}, Role: ${isTeacher ? 'Teacher' : 'Student'}, Loading config:`, roleConfig);

    try {
      // 验证并设置 allowedAppsConfig
      if (roleConfig && typeof roleConfig.allowedApps === 'object' && roleConfig.allowedApps !== null) {
        const parsedAllowedApps = roleConfig.allowedApps as Record<string, any>;
        const validConfig: Record<string, string[]> = {};
        let isValidStructure = true; // 保持此变量以备将来需要更严格的验证
        for (const folderKey in parsedAllowedApps) {
           if (Array.isArray(parsedAllowedApps[folderKey]) && parsedAllowedApps[folderKey].every((item: any) => typeof item === 'string')) {
             validConfig[folderKey] = parsedAllowedApps[folderKey];
           } else {
             console.warn(`[Role Init] Invalid card list for folderKey "${folderKey}" in role config for user ${user || 'undefined'}. Skipping key.`);
             // isValidStructure = false; break; // 如果需要，取消注释以进行更严格的验证
           }
        }

        // Dispatch the validated (possibly empty) config
        dispatch({ field: 'allowedAppsConfig', value: validConfig });
        // console.log(`[Role Init] Successfully loaded allowedAppsConfig for user ${user || 'undefined'}:`, validConfig);

      } else {
        // console.warn(`[Role Init] 'allowedApps' key missing or not an object in role config for user ${user || 'undefined'}. Setting to null.`);
        dispatch({ field: 'allowedAppsConfig', value: null }); // 明确设为 null
      }
    } catch (error) {
      console.error(`[Role Init] Error processing role config for user ${user || 'undefined'}:`, error);
      dispatch({ field: 'allowedAppsConfig', value: null }); // 出错时设为 null
    }

    // 如果 user 有实际值 (非 null, undefined, 空字符串)，则更新 context 中的 user 状态
    if (user) {
       dispatch({ field: 'user', value: user });
    } else {
      // 当 user 为 falsy 时，可以考虑保持 HomeContext 中的 user 为 'unknown' (initialState 的默认值)
      // 或者取消注释下一行以显式更新为 'unknown'
      // dispatch({ field: 'user', value: 'unknown' });
    }

    // --- 角色特定 Folders/Chats 加载逻辑已被移除 --- 

  }, [user, dispatch]); // 依赖项 user 和 dispatch

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

  // 新增：控制模态框状态
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);

  // 新增：处理模型选择的回调函数
  const handleSelectGlobalModel = (modelName: string) => {
    const currentModelName = selectedGlobalModelName; // 保存旧名称
    dispatch({ field: 'selectedGlobalModelName', value: modelName });
    
    // 关闭模态框
    setIsModelModalOpen(false);

    // 检查模型是否真的改变了
    if (currentModelName !== modelName) {
      console.log(`全局模型已从 "${currentModelName || '未设置'}" 切换到 "${modelName}"，将创建新对话。`);
      // 模型改变后，强制创建新对话，并传入新的模型名称
      handleNewConversation(modelName); 
    }
  };

  // 新增：打开模态框的回调函数
  const handleOpenModelSettings = () => {
    // 确保有可用模型才打开
    if (availableGlobalModels && availableGlobalModels.length > 0) {
      setIsModelModalOpen(true);
    } else {
      toast.error('没有可配置的全局模型。');
    }
  };

  // 新增：监听选中对话变化，同步全局模型状态
  useEffect(() => {
    if (!selectedConversation) {
      // 如果没有选中对话（例如刚加载或清空后），可能重置为默认？或者保持不变？
      // 暂时保持不变，依赖初始化逻辑设置默认值
      return;
    }

    let targetModelName: string | null = null;
    const defaultModel = difyConfigService.getDefaultGlobalModel();
    const defaultModelName = defaultModel?.name || null;

    // 检查是否为全局对话
    if (selectedConversation.appId === 0 || selectedConversation.appId === null) {
      if (selectedConversation.modelName) {
        // 如果对话记录了模型名称，使用它
        targetModelName = selectedConversation.modelName;
        // console.log(`[Sync Model] 全局对话 ${selectedConversation.id} 选中，使用其记录的模型: ${targetModelName}`);
      } else {
        // 如果是旧的全局对话没有记录模型名称，使用默认模型
        targetModelName = defaultModelName;
        console.log(`[Sync Model] 旧全局对话 ${selectedConversation.id} 选中，无记录，使用默认模型: ${targetModelName}`);
      }
    } else {
      // 如果选中的是应用对话，重置全局模型状态为默认值
      targetModelName = defaultModelName;
      // console.log(`[Sync Model] 应用对话 ${selectedConversation.id} (appId: ${selectedConversation.appId}) 选中，重置全局模型为默认: ${targetModelName}`);
    }
    
    // 仅当计算出的目标模型名称与当前状态不同时才更新，避免不必要的重渲染
    if (targetModelName !== selectedGlobalModelName) {
        dispatch({ field: 'selectedGlobalModelName', value: targetModelName });
    }

  }, [selectedConversation, dispatch, selectedGlobalModelName]); // 添加 selectedGlobalModelName 以便比较

  return (
    <HomeContext.Provider
      value={{
        ...contextValue,
        appConfigs: appConfigsInState,
        handleNewConversation,
        handleSelectConversation,
        handleUpdateConversation,
        handleDeleteConversation,
        handleCreateFolder,
        handleDeleteFolder,
        handleUpdateFolder,
        handleSelectOrStartAppConversation,
        startConversationFromActiveApp,
        handleTogglePinConversation,
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
                <SidebarSlim 
                  onToggle={toggleSidebar} 
                  isSidebarOpen={showSidebar} 
                  onOpenModelSettings={handleOpenModelSettings}
                />
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

            {/* 新增：渲染模态框 */}
            {isModelModalOpen && (
              <ChatSettingsModal
                isOpen={isModelModalOpen}
                onClose={() => setIsModelModalOpen(false)}
                availableModels={availableGlobalModels}
                currentModelName={selectedGlobalModelName}
                onSelectModel={handleSelectGlobalModel}
              />
            )}
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
