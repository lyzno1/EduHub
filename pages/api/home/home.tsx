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

import { Conversation, KeyValuePair } from '@/types/chat';
import { FolderInterface, FolderType } from '@/types/folder';
import { OpenAIModelID, OpenAIModels, fallbackModelID } from '@/types/openai';
import { Prompt } from '@/types/prompt';

import { Chat } from '@/components/Chat/Chat';
import { Chatbar } from '@/components/Chatbar/Chatbar';
import { Navbar } from '@/components/Mobile/Navbar';
import Promptbar from '@/components/Promptbar';
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

interface Props {
  serverSideApiKeyIsSet: boolean;
  serverSidePluginKeysSet: boolean;
  defaultModelId: OpenAIModelID;
}

const Home = ({
  serverSideApiKeyIsSet,
  serverSidePluginKeysSet,
  defaultModelId,
}: Props) => {
  function CheckLogin() {
    const user = Cookie.get('user');
    console.log(user);
    return user ?? '';
  }

  const { t } = useTranslation('chat');
  // const { getModels } = useApiService();
  // const { getModelsError } = useErrorService();
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
      temperature,
    },
    dispatch,
  } = contextValue;

  const stopConversationRef = useRef<boolean>(false);

  // const { data, error, refetch } = useQuery(
  //   ['GetModels', apiKey, serverSideApiKeyIsSet],
  //   ({ signal }) => {
  //     if (!apiKey && !serverSideApiKeyIsSet) return null;

  //     return getModels(
  //       {
  //         key: apiKey,
  //       },
  //       signal,
  //     );
  //   },
  //   { enabled: true, refetchOnMount: false },
  // );

  // useEffect(() => {
  //   if (data) dispatch({ field: 'models', value: data });
  // }, [data, dispatch]);

  // useEffect(() => {
  //   dispatch({ field: 'modelError', value: getModelsError(error) });
  // }, [dispatch, error, getModelsError]);

  // FETCH MODELS ----------------------------------------------

  const handleSelectConversation = (conversation: Conversation) => {
    dispatch({
      field: 'selectedConversation',
      value: conversation,
    });

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

  const handleNewConversation = () => {
    // 先检查是否已经存在空的新聊天
    const existingNewChat = conversations.find(
      (chat) => chat.messages.length === 0 && chat.name === t('New Conversation')
    );

    if (existingNewChat) {
      // 如果存在空的新聊天，重新排序确保它在最前面
      const updatedConversations = conversations.filter(chat => chat.id !== existingNewChat.id);
      updatedConversations.unshift(existingNewChat);
      
      dispatch({ field: 'selectedConversation', value: existingNewChat });
      dispatch({ field: 'conversations', value: updatedConversations });
      
      saveConversation(existingNewChat);
      saveConversations(updatedConversations);
      return;
    }

    const newConversation: Conversation = {
      id: uuidv4(),
      name: t('New Conversation'),
      originalName: '',
      messages: [],
      model: OpenAIModels[OpenAIModelID.DEEPSEEK_CHAT] || OpenAIModels[defaultModelId],
      prompt: DEFAULT_SYSTEM_PROMPT,
      temperature: DEFAULT_TEMPERATURE,
      folderId: null,
      conversationID: '',
      deletable: true,
    };

    // 将新对话添加到数组开头
    const updatedConversations = [newConversation, ...conversations];

    dispatch({ field: 'selectedConversation', value: newConversation });
    dispatch({ field: 'conversations', value: updatedConversations });

    saveConversation(newConversation);
    saveConversations(updatedConversations);
  };

  const handleUpdateConversation = (
    conversation: Conversation,
    data: KeyValuePair,
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
    // 找到要删除的对话
    const updatedConversations = conversations.filter(
      (conversation) => conversation.id !== conversationId
    );

    // 如果删除的是当前选中的对话，选择另一个对话
    if (selectedConversation?.id === conversationId) {
      if (updatedConversations.length > 0) {
        dispatch({
          field: 'selectedConversation',
          value: updatedConversations[0],
        });
      } else {
        // 如果没有对话了，创建一个新的
        handleNewConversation();
      }
    }

    // 更新对话列表
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
    defaultModelId &&
      dispatch({ field: 'defaultModelId', value: defaultModelId });
    serverSideApiKeyIsSet &&
      dispatch({
        field: 'serverSideApiKeyIsSet',
        value: serverSideApiKeyIsSet,
      });
    serverSidePluginKeysSet &&
      dispatch({
        field: 'serverSidePluginKeysSet',
        value: serverSidePluginKeysSet,
      });
  }, [defaultModelId, serverSideApiKeyIsSet, serverSidePluginKeysSet]);

  // ON LOAD --------------------------------------------

  useEffect(() => {
    setUser(CheckLogin());
    setReady(true);

    // 获取并设置用户的主题设置。
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      dispatch({
        field: 'lightMode',
        value: savedTheme,
      });
      
      // 立即应用主题
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    } else {
      // 如果没有保存的主题设置，默认使用白天模式
      dispatch({
        field: 'lightMode',
        value: 'light',
      });
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }

    // 获取并设置存储在本地的API密钥。
    // const apiKey = localStorage.getItem('apiKey');

    if (serverSideApiKeyIsSet) {
      dispatch({ field: 'apiKey', value: '' });

      localStorage.removeItem('apiKey');
    } else if (apiKey) {
      dispatch({ field: 'apiKey', value: apiKey });
    }

    // 获取并设置存储在本地的插件密钥。
    const pluginKeys = localStorage.getItem('pluginKeys');
    if (serverSidePluginKeysSet) {
      dispatch({ field: 'pluginKeys', value: [] });
      localStorage.removeItem('pluginKeys');
    } else if (pluginKeys) {
      dispatch({ field: 'pluginKeys', value: pluginKeys });
    }

    // 根据窗口大小决定是否显示聊天栏和提示栏。
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

    // 获取并设置存储在本地的文件夹数据。
    const folders = localStorage.getItem('folders');
    if (folders) {
      dispatch({ field: 'folders', value: JSON.parse(folders) });
    }

    const prompts = localStorage.getItem('prompts');
    if (prompts) {
      dispatch({ field: 'prompts', value: JSON.parse(prompts) });
    }

    // 获取并设置存储在本地的对话数据
    let savedConversations: Conversation[] = [];
    const conversationHistory = localStorage.getItem('conversationHistory');
    
    if (conversationHistory) {
      const parsedConversationHistory: Conversation[] = JSON.parse(conversationHistory);
      savedConversations = cleanConversationHistory(parsedConversationHistory);
      dispatch({ field: 'conversations', value: savedConversations });
    }

    // 获取上次选中的对话
    const selectedConversation = localStorage.getItem('selectedConversation');
    
    if (selectedConversation) {
      // 如果有选中的对话，恢复它
      const parsedSelectedConversation: Conversation = JSON.parse(selectedConversation);
      const cleanedSelectedConversation = cleanSelectedConversation(parsedSelectedConversation);
      
      // 确保选中的对话在会话列表中
      if (!savedConversations.find(conv => conv.id === cleanedSelectedConversation.id)) {
        savedConversations = [cleanedSelectedConversation, ...savedConversations];
        dispatch({ field: 'conversations', value: savedConversations });
        saveConversations(savedConversations);
      }
      
      dispatch({ field: 'selectedConversation', value: cleanedSelectedConversation });
    } else if (savedConversations.length > 0) {
      // 如果有已保存的对话但没有选中的对话，选择第一个对话
      dispatch({ field: 'selectedConversation', value: savedConversations[0] });
      saveConversation(savedConversations[0]);
    } else {
      // 只有当没有任何对话时，才创建新对话
      const newConversation: Conversation = {
        id: uuidv4(),
        name: t('New Conversation'),
        originalName: '',
        messages: [],
        model: OpenAIModels[OpenAIModelID.DEEPSEEK_CHAT] || OpenAIModels[defaultModelId],
        prompt: DEFAULT_SYSTEM_PROMPT,
        temperature: DEFAULT_TEMPERATURE,
        folderId: null,
        conversationID: '',
        deletable: true,
      };

      const updatedConversations = [newConversation];
      
      dispatch({ field: 'selectedConversation', value: newConversation });
      dispatch({ field: 'conversations', value: updatedConversations });
      
      saveConversation(newConversation);
      saveConversations(updatedConversations);
    }
  }, [defaultModelId, dispatch, serverSideApiKeyIsSet, serverSidePluginKeysSet]);

  useEffect(() => {
    if (user) {
      dispatch({ field: 'user', value: user });

      const defaultData = user.length === 8 ? teacherChat : studentChat;
      console.log(user, user.length);
      
      // 页面初始化时创建默认文件夹
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

      // 创建默认对话
      const defaultConversations: Conversation[] = defaultData.Chats.map(
        (chat) => ({
          ...chat,
          conversationID: '',
          originalName: chat.name,
          messages: [],
          model: OpenAIModels[chat.name as keyof typeof OpenAIModels],
          prompt: DEFAULT_SYSTEM_PROMPT,
          temperature: DEFAULT_TEMPERATURE,
          deletable: false,
        }),
      );

      // 检查是否有已保存的对话
      const savedConversations = localStorage.getItem('conversationHistory');
      if (!savedConversations) {
        // 如果没有已保存的对话，创建一个新的空对话并放在默认对话之前
        const newConversation: Conversation = {
          id: uuidv4(),
          name: t('New Conversation'),
          originalName: '',
          messages: [],
          model: OpenAIModels[OpenAIModelID.DEEPSEEK_CHAT] || OpenAIModels[defaultModelId],
          prompt: DEFAULT_SYSTEM_PROMPT,
          temperature: DEFAULT_TEMPERATURE,
          folderId: null,
          conversationID: '',
          deletable: true,
        };
        
        const initialConversations = [newConversation, ...defaultConversations];
        dispatch({ field: 'conversations', value: initialConversations });
        dispatch({ field: 'selectedConversation', value: newConversation });
        
        saveConversations(initialConversations);
        saveConversation(newConversation);
      } else {
        // 如果有已保存的对话，保持现有的对话
        const parsedConversations = JSON.parse(savedConversations);
        dispatch({ field: 'conversations', value: parsedConversations });
      }

      const loadedPrompt: Prompt[] = defaultPrompt.Prompts.map((prompt) => ({
        ...prompt,
        model: OpenAIModels['gpt-3.5-turbo'],
        deletable: false,
      }));
      dispatch({ field: 'prompts', value: loadedPrompt });
    }
  }, [user]);

  // 在return之前添加状态控制侧边栏显示
  const [showSidebar, setShowSidebar] = useState<boolean>(false);

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
    localStorage.setItem('showSidebar', (!showSidebar).toString());
  };

  // 在useEffect中加载侧边栏状态，默认为收起状态
  useEffect(() => {
    const savedShowSidebar = localStorage.getItem('showSidebar');
    if (savedShowSidebar !== null) {
      setShowSidebar(savedShowSidebar === 'true');
    } else {
      // 默认为收起状态
      setShowSidebar(false);
      localStorage.setItem('showSidebar', 'false');
    }
  }, []);

  return (
    <HomeContext.Provider
      value={{
        ...contextValue,
        handleNewConversation,
        handleCreateFolder,
        handleDeleteFolder,
        handleUpdateFolder,
        handleSelectConversation,
        handleUpdateConversation,
        handleDeleteConversation,
      }}
    >
      <Head>
        <title>eduhub</title>
        <meta name="description" content="ChatGPT but better." />
        <meta
          name="viewport"
          content="height=device-height ,width=device-width, initial-scale=1, user-scalable=no"
        />
      </Head>
      {ready ? (
        selectedConversation && whitelist.includes(user) ? (
          <main className="flex h-screen w-screen flex-col text-sm text-black bg-white dark:text-white dark:bg-[#343541]">
            <div className="fixed top-0 w-full sm:hidden">
              <Navbar
                selectedConversation={selectedConversation}
                onNewConversation={handleNewConversation}
              />
            </div>

            <div className="flex h-full w-full pt-[48px] sm:pt-0">
              {/* 侧边栏和导航栏放在不同的z-index层上，防止事件冒泡影响 */}
              {/* 侧边栏按钮层 */}
              <div className="relative z-30">
                <SidebarSlim onToggle={toggleSidebar} isSidebarOpen={showSidebar} />
              </div>
              
              {/* 导航栏层 */}
              <div className="relative z-20" onClick={e => e.stopPropagation()}>
                <SidebarNav onToggle={toggleSidebar} isOpen={showSidebar} />
              </div>

              <div className={`flex flex-1 transition-all duration-300 ${showSidebar ? 'ml-[320px]' : 'ml-[60px]'}`}>
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

// 获取服务器端的一些配置数据，并将这些数据作为组件的props传递给页面。
export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  const defaultModelId =
    (process.env.DEFAULT_MODEL &&
      Object.values(OpenAIModelID).includes(
        process.env.DEFAULT_MODEL as OpenAIModelID,
      ) &&
      process.env.DEFAULT_MODEL) ||
    fallbackModelID;

  let serverSidePluginKeysSet = false;

  const googleApiKey = process.env.GOOGLE_API_KEY;
  const googleCSEId = process.env.GOOGLE_CSE_ID;

  if (googleApiKey && googleCSEId) {
    serverSidePluginKeysSet = true;
  }

  return {
    props: {
      serverSideApiKeyIsSet: !!process.env.OPENAI_API_KEY,
      defaultModelId,
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
