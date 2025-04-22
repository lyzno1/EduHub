import React from 'react';
import { AppPageTemplate } from './common/AppPageTemplate';
import { IconInfoCircle, IconUsers, IconHelp, IconMoodBoy } from '@tabler/icons-react';
import { DifyFolderConfig } from '@/types/dify';

// 定义当前页面特定的 Icon Map
const campusAssistantIconMap: { [key: string]: React.ComponentType<any> } = {
  IconInfoCircle: IconInfoCircle,
  IconUsers: IconUsers,
  IconHelp: IconHelp,
  IconMoodBoy: IconMoodBoy,
};

// Props expected by the component
interface Props {
  config: DifyFolderConfig;
}

// 使用模板组件重构页面
export const CampusAssistantAppPage: React.FC<Props> = ({ config }) => {
  return (
    <AppPageTemplate
      config={config}
      themeColor="green"
      iconMap={campusAssistantIconMap}
    />
  );
}; 