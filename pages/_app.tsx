import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';

import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { useEffect, useState } from 'react';

import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

function App({ Component, pageProps }: AppProps<{}>) {
  const queryClient = new QueryClient();
  const [theme, setTheme] = useState<string>('light');

  // 页面加载时应用保存的主题
  useEffect(() => {
    // 从localStorage获取主题设置
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    // 如果没有保存的主题，设置默认为light
    if (!localStorage.getItem('theme')) {
      localStorage.setItem('theme', 'light');
    }
    
    // 监听主题变化
    const handleStorageChange = () => {
      const currentTheme = localStorage.getItem('theme') || 'light';
      setTheme(currentTheme);
      
      // 应用主题到HTML元素
      if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    };

    // 初始化应用主题
    handleStorageChange();
    
    // 监听storage事件，当localStorage变化时更新主题
    window.addEventListener('storage', handleStorageChange);
    
    // 在组件卸载时取消事件监听
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 创建自定义事件监听以便直接响应主题变化
  useEffect(() => {
    const handleThemeChange = (e: CustomEvent) => {
      const newTheme = e.detail;
      setTheme(newTheme);
    };
    
    // 添加自定义事件监听
    window.addEventListener('themeChange' as any, handleThemeChange as any);
    
    return () => {
      window.removeEventListener('themeChange' as any, handleThemeChange as any);
    };
  }, []);

  return (
    <div className={`${inter.className} ${theme}`}>
      <Toaster />
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
      </QueryClientProvider>
    </div>
  );
}

export default appWithTranslation(App);
