import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateReducer } from '@/hooks/useCreateReducer';
import { ChatBody, Conversation, Message } from '@/types/chat';
import { Plugin } from '@/types/plugin';
import { Prompt } from '@/types/prompt';
import { getEndpoint } from '@/utils/app/api';
import {
  cleanConversationHistory,
  cleanSelectedConversation,
} from '@/utils/app/clean';
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
} from '@/utils/app/const';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { saveFolders } from '@/utils/app/folders';
import { IconBook, IconSchool, IconUser } from '@tabler/icons-react';
import { FunctionCards } from '../Chat/Chat';

export const WelcomeScreen = ({ setModel }: { setModel: React.Dispatch<React.SetStateAction<string>> }) => {
  return (
    <div className="welcome-screen-container flex flex-col items-center pt-16">
      <div className="welcome-screen-content text-center max-w-4xl">
        <h1 className="welcome-title text-5xl mb-4">Welcome to BISTU-DIFY</h1>
        <p className="welcome-description text-xl text-gray-600 mb-12">AI驱动的校园助手，为您提供智能问答和校园服务</p>
        
        {/* 功能卡片区域 */}
        <div className="mt-4 mb-16 w-full">
          <FunctionCards />
        </div>
        
        <div className="welcome-models mt-8 border-t pt-8 border-gray-200 dark:border-gray-700">
          <h2 className="welcome-subtitle text-2xl font-medium mb-6">选择对话模型</h2>
          <div className="welcome-model-options">
            {/* ... existing code ... */}
          </div>
        </div>
      </div>
    </div>
  );
}; 