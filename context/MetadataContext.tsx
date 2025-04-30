import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 1. 定义元数据的类型接口 (与 metadata.json 结构对应)
interface Metadata {
  title: string;
  subtitle: string;
  pageTitle: string;
  aboutContent: string;
  version: string;
  copyright: string;
  additionalInfo: {
    developer: string;
    website: string;
  };
}

// 2. 创建 Context，初始值可以设为 null 或一个默认结构
//    使用 null 可以帮助我们判断数据是否已加载
const MetadataContext = createContext<Metadata | null>(null);

// 3. 创建一个自定义 Hook，方便在组件中使用 Context
export const useMetadata = () => {
  const context = useContext(MetadataContext);
  if (context === undefined) {
    // 这通常不应该发生，除非你在 Provider 外部使用了这个 Hook
    throw new Error('useMetadata must be used within a MetadataProvider');
  }
  // 返回 context，允许组件处理 null 的情况（加载中）
  return context;
};


// 4. 创建 Provider 组件
interface MetadataProviderProps {
  children: ReactNode; // 明确 children 类型
}

export const MetadataProvider: React.FC<MetadataProviderProps> = ({ children }) => {
  const [metadata, setMetadata] = useState<Metadata | null>(null); // 初始状态为 null
  const [loading, setLoading] = useState(true); // 添加加载状态
  const [error, setError] = useState<string | null>(null); // 添加错误状态

  useEffect(() => {
    const fetchMetadata = async () => {
      setLoading(true); // 开始加载
      setError(null);   // 重置错误
      try {
        // 确保路径正确，通常 / 开头相对于 public 目录
        const response = await fetch('/config/metadata.json'); 
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Metadata = await response.json();
        setMetadata(data);
      } catch (err) {
        console.error("Failed to fetch metadata:", err);
        setError(err instanceof Error ? err.message : 'Failed to load metadata');
        setMetadata(null); // 出错时确保 metadata 为 null
      } finally {
        setLoading(false); // 加载结束
      }
    };

    fetchMetadata();
  }, []); // 空依赖数组，仅在 Provider 组件挂载时运行一次

  // 可以选择在加载或错误时显示特定内容，或者直接传递 null/metadata
  // if (loading) {
  //   return <div>Loading metadata...</div>; // 或者返回 null 或骨架屏
  // }
  // if (error) {
  //   return <div>Error loading metadata: {error}</div>;
  // }

  // 将获取到的 metadata (或 null) 作为 value 传递给 Provider
  return (
    <MetadataContext.Provider value={metadata}>
      {children}
    </MetadataContext.Provider>
  );
}; 