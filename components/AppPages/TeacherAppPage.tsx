import React from 'react';
import { AppPageTemplate } from './common/AppPageTemplate';
import { IconPencil, IconMessageCircleQuestion, IconBulb, IconPresentation, IconListDetails, IconCheckbox, IconMessageReport } from '@tabler/icons-react';
import { DifyFolderConfig } from '@/types/dify';

// 定义当前页面特定的 Icon Map
const teacherIconMap: { [key: string]: React.ComponentType<any> } = {
  IconPencil: IconPencil,
  IconMessageCircleQuestion: IconMessageCircleQuestion,
  IconBulb: IconBulb,
  IconPresentation: IconPresentation,
  IconListDetails: IconListDetails,
  IconCheckbox: IconCheckbox,
  IconMessageReport: IconMessageReport,
};

// Props expected by the component
interface Props {
  config: DifyFolderConfig;
}

// 使用模板组件重构页面
export const TeacherAppPage: React.FC<Props> = ({ config }) => {
  return (
    <AppPageTemplate
      config={config}
      themeColor="purple" // 指定主题色为 purple
      iconMap={teacherIconMap}
    />
  );
}; 