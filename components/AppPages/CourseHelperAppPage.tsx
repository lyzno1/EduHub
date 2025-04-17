import React from 'react';
import { IconBook2, IconQuestionMark, IconClipboardText, IconFileText } from '@tabler/icons-react';

interface Props {
  inputBoxHeight: number;
  isInputExpanded: boolean;
}

export const CourseHelperAppPage: React.FC<Props> = ({ inputBoxHeight, isInputExpanded }) => {

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      {/* App Icon and Title - Same structure as DeepSeek */}
      <div className="mb-6 flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
        <IconBook2 size={32} className="text-yellow-600 dark:text-yellow-400" />
      </div>
      <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-100">课程学习助手</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">解答课程疑问，辅助学习与复习</p>

      {/* App Specific Cards Area - Same grid structure as DeepSeek */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
        {/* Card 1 */}
        <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center">
          <IconQuestionMark size={24} className="mb-2 text-cyan-500" />
          <h3 className="font-semibold mb-1 text-gray-700 dark:text-gray-200">知识点问答</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">提出你不懂的课程知识点，获取详细解答。</p>
        </div>
        {/* Card 2 */}
        <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center">
          <IconClipboardText size={24} className="mb-2 text-lime-500" />
          <h3 className="font-semibold mb-1 text-gray-700 dark:text-gray-200">学习资料总结</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">上传或粘贴学习材料，快速生成内容概要或重点。</p>
        </div>
        {/* Card 3 */}
        <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center">
          <IconFileText size={24} className="mb-2 text-orange-500" />
          <h3 className="font-semibold mb-1 text-gray-700 dark:text-gray-200">练习与测验</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">根据课程内容生成练习题或进行知识点测验。</p>
        </div>
      </div>
    </div>
  );
}; 