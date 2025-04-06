import { IconCheck, IconCopy } from '@tabler/icons-react';
import { FC, memo, useContext, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

import { useTranslation } from 'next-i18next';

import {
  generateRandomString,
  programmingLanguages,
} from '@/utils/app/codeblock';

import HomeContext from '@/pages/api/home/home.context';

// 自定义浅色语法高亮主题
const lightTheme = {
  ...oneLight,
  'pre[class*="language-"]': {
    ...oneLight['pre[class*="language-"]'],
    background: 'inherit',
    margin: 0,
    padding: 0,
  },
  'code[class*="language-"]': {
    ...oneLight['code[class*="language-"]'],
    background: 'inherit',
  }
};

// 自定义深色语法高亮主题
const darkTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: 'inherit',
    margin: 0,
    padding: 0,
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'inherit',
  }
};

interface Props {
  language: string;
  value: string;
}

export const CodeBlock: FC<Props> = memo(({ language, value }) => {
  const { t } = useTranslation('markdown');
  const [isCopied, setIsCopied] = useState<Boolean>(false);
  
  const {
    state: { lightMode },
  } = useContext(HomeContext);

  // 根据当前模式选择主题
  const codeTheme = lightMode ? lightTheme : darkTheme;

  const copyToClipboard = () => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      return;
    }

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    });
  };

  return (
    <div className="codeblock relative font-sans text-[16px]">
      <div className="flex items-center justify-between py-1.5 px-4">
        <span className="text-xs lowercase">{language}</span>

        <div>
          <button
            className="flex gap-1.5 items-center rounded transition-all duration-200 py-1 px-2 text-xs hover:bg-opacity-80"
            onClick={copyToClipboard}
            data-tooltip={isCopied ? "已复制！" : "复制代码"}
            data-placement="bottom"
          >
            {isCopied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            <span>{isCopied ? '已复制' : '复制'}</span>
          </button>
        </div>
      </div>

      <div className="p-4 pt-3">
        <SyntaxHighlighter
          language={language}
          style={codeTheme}
          customStyle={{ 
            margin: 0,
            padding: 0,
            backgroundColor: 'inherit',
            fontSize: '0.875em',
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
});
CodeBlock.displayName = 'CodeBlock';
