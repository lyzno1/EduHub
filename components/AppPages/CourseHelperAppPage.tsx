import React from 'react';
import { AppPageTemplate } from './common/AppPageTemplate';
import { IconTestPipe, IconCode } from '@tabler/icons-react';
import { DifyFolderConfig } from '@/types/dify';

// 定义当前页面特定的 Icon Map
const courseHelperIconMap: { [key: string]: React.ComponentType<any> } = {
  IconTestPipe: IconTestPipe,
  IconCode: IconCode,
};

// Props expected by the component
interface Props {
  config: DifyFolderConfig;
}

// 使用模板组件重构页面
export const CourseHelperAppPage: React.FC<Props> = ({ config }) => {
  return (
    <AppPageTemplate
      config={config}
      themeColor="amber" // 指定主题色为 amber (对应之前的 yellow/amber)
      iconMap={courseHelperIconMap}
    />
  );
}; 