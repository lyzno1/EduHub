import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { headers } = req;
  const targetUrl = 'http://localhost:8080/v1/chat-messages';

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': headers.authorization as string,
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return res.status(response.status).json({
        error: errorData || '请求失败',
        status: response.status
      });
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 处理流式响应
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无响应数据');
    }

    // 发送初始事件
    res.write('event: start\ndata: {}\n\n');

    // 处理数据流
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        res.write('event: done\ndata: {}\n\n');
        break;
      }

      if (value) {
        const text = new TextDecoder().decode(value);
        // 确保每个数据块都是完整的 SSE 消息
        const messages = text.split('\n\n').filter(msg => msg.trim());
        
        for (const msg of messages) {
          if (msg.includes('data:')) {
            res.write(msg + '\n\n');
          }
        }
      }
    }

    res.end();
  } catch (error) {
    console.error('API 请求失败:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : '内部服务器错误',
      status: 500 
    });
  }
} 