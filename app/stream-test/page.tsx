'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StreamTestPage() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  
  // 使用refs避免频繁状态更新
  const streamedResponseRef = useRef('');
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chunkBufferRef = useRef<string[]>([]);
  const lastUpdateTimeRef = useRef(0);
  
  // 检测是否为移动端
  const isMobileRef = useRef(typeof window !== 'undefined' && window.innerWidth < 768);
  
  // 使用节流更新UI，减少DOM渲染频率
  const throttledUpdateResponse = useCallback(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    // 确保更新频率不超过每50ms一次（桌面端）或100ms一次（移动端）
    const minUpdateInterval = isMobileRef.current ? 100 : 50;
    
    // 当累积的字符超过一定数量，或者距离上次更新已经过了足够时间，才更新UI
    const shouldUpdate = 
      chunkBufferRef.current.length > 0 && 
      (timeSinceLastUpdate > minUpdateInterval || chunkBufferRef.current.join('').length > 100);
    
    if (shouldUpdate) {
      // 合并缓冲区内容到主响应
      if (chunkBufferRef.current.length > 0) {
        streamedResponseRef.current += chunkBufferRef.current.join('');
        chunkBufferRef.current = [];
      }
      
      // 更新React状态
      setResponse(streamedResponseRef.current);
      lastUpdateTimeRef.current = now;
    }
    
    // 继续定时更新，直到没有新数据
    if (loading && chunkBufferRef.current.length > 0) {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(throttledUpdateResponse, minUpdateInterval);
    }
  }, [loading]);
  
  // 添加新数据到缓冲区
  const addToResponseBuffer = useCallback((text: string) => {
    chunkBufferRef.current.push(text);
    
    // 使用requestAnimationFrame确保在下一帧渲染前处理
    if (!updateTimeoutRef.current) {
      updateTimeoutRef.current = setTimeout(throttledUpdateResponse, 0);
    }
  }, [throttledUpdateResponse]);
  
  // 清理函数
  const cleanupStreamResources = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    
    // 确保最后一次更新包含所有内容
    if (chunkBufferRef.current.length > 0) {
      streamedResponseRef.current += chunkBufferRef.current.join('');
      setResponse(streamedResponseRef.current);
      chunkBufferRef.current = [];
    }
  }, []);

  const testStream = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setResponse('');
    streamedResponseRef.current = '';
    chunkBufferRef.current = [];
    lastUpdateTimeRef.current = Date.now();
    
    try {
      const res = await fetch('/api/stream-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          conversationId
        }),
      });

      if (!res.ok) {
        throw new Error(`请求失败: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('无法获取响应流');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 解码并处理流式响应
        const chunk = decoder.decode(value, { stream: true });
        try {
          // 处理可能的多行JSON
          const lines = chunk
            .split('\n')
            .filter(line => line.trim() !== '');
          
          for (const line of lines) {
            const data = JSON.parse(line);
            
            if (data.conversation_id && !conversationId) {
              setConversationId(data.conversation_id);
            }
            
            if (data.answer !== undefined) {
              // 使用缓冲区收集数据，而不是直接更新状态
              addToResponseBuffer(data.answer);
            }
            
            if (data.event === 'message_end') {
              console.log('流式响应完成');
            }
          }
        } catch (e) {
          console.error('解析响应数据失败:', e, chunk);
        }
      }
    } catch (error) {
      console.error('测试流式响应失败:', error);
      addToResponseBuffer('测试失败: ' + (error as Error).message);
    } finally {
      cleanupStreamResources();
      setLoading(false);
    }
  };

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      cleanupStreamResources();
    };
  }, [cleanupStreamResources]);

  // 窗口大小变化时更新移动端状态
  useEffect(() => {
    const handleResize = () => {
      isMobileRef.current = window.innerWidth < 768;
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      testStream();
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>流式响应测试</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="输入测试问题..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="flex-1"
              />
              <Button 
                onClick={testStream} 
                disabled={loading || !query.trim()}
              >
                {loading ? '请求中...' : '发送'}
              </Button>
            </div>
            
            {conversationId && (
              <div className="text-sm text-muted-foreground">
                对话ID: {conversationId}
              </div>
            )}

            <Card className="bg-muted/50 min-h-[200px] p-4 overflow-auto max-h-[500px]">
              <pre className="whitespace-pre-wrap break-words">
                {response || (loading ? '等待响应...' : '响应将在这里显示')}
              </pre>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 