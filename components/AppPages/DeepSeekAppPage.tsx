import React from 'react';
import { IconCode, IconSearch, IconBulb } from '@tabler/icons-react';

export const DeepSeekAppPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      {/* 应用图标和标题 */}
      <div className="mb-6 flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30">
        <IconCode size={32} className="text-blue-600 dark:text-blue-400" />
      </div>
      <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-100">DeepSeek 代码助手</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">专注代码生成、理解与优化</p>

      {/* 应用特定卡片或功能提示 (替代通用卡片) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
        {/* 示例卡片 1 */}
        <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center">
          <IconSearch size={24} className="mb-2 text-blue-500" />
          <h3 className="font-semibold mb-1 text-gray-700 dark:text-gray-200">代码搜索与理解</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">粘贴代码片段，快速理解其功能或查找相似实现。</p>
        </div>
        {/* 示例卡片 2 */}
        <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center">
          <IconCode size={24} className="mb-2 text-green-500" />
          <h3 className="font-semibold mb-1 text-gray-700 dark:text-gray-200">代码生成</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">根据你的需求描述，生成不同语言的代码框架或函数。</p>
        </div>
        {/* 示例卡片 3 */}
        <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center">
          <IconBulb size={24} className="mb-2 text-yellow-500" />
          <h3 className="font-semibold mb-1 text-gray-700 dark:text-gray-200">代码优化建议</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">分析现有代码，提供性能改进、风格规范等建议。</p>
        </div>
      </div>
    </div>
  );
};
