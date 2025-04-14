import { NextRequest, NextResponse } from 'next/server';
import { DifyStream } from '@/utils/server';

export async function POST(req: NextRequest) {
  try {
    const { query, conversationId } = await req.json();

    if (!query) {
      return NextResponse.json({ error: '问题不能为空' }, { status: 400 });
    }
    
    // 检测客户端设备类型
    const userAgent = req.headers.get('user-agent') || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);

    // 测试DifyStream函数，直接传递对象参数
    const result = await DifyStream({
      query,
      user_id: 'test-user-id',
      conversation_id: conversationId || undefined,
      inputs: {},
      response_mode: 'streaming',
      user: {
        first_name: 'Test',
        last_name: 'User',
      },
    });
    
    return result;
  } catch (error) {
    console.error('流式响应API错误:', error);
    return NextResponse.json(
      { error: '处理请求时出错', details: (error as Error).message },
      { status: 500 }
    );
  }
} 