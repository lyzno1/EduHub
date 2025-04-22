import React from 'react';
import { AppPageTemplate } from './common/AppPageTemplate';
import { IconWorldWww, IconDatabase, IconBook, IconMessageChatbot, IconUsers } from '@tabler/icons-react';
import { DifyFolderConfig } from '@/types/dify';

// 定义当前页面特定的 Icon Map
const deepSeekIconMap: { [key: string]: React.ComponentType<any> } = {
  IconWorldWww: IconWorldWww,
  IconDatabase: IconDatabase,
  IconBook: IconBook,
  IconMessageChatbot: IconMessageChatbot,
  IconUsers: IconUsers,
};

// Props expected by the component
interface Props {
  config: DifyFolderConfig;
}

// 使用模板组件重构页面
export const DeepSeekAppPage: React.FC<Props> = ({ config }) => {
  return (
    <AppPageTemplate
      config={config}
      themeColor="blue" // 指定主题色为 blue
      iconMap={deepSeekIconMap}
    />
  );
};
