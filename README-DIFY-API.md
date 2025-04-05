# Dify API 使用指南

本项目使用 Dify API 作为后端服务，进行对话生成。以下是使用说明和示例。

## 配置说明

### 环境变量配置

在 `.env.local` 文件中配置:

```
# Dify API配置
DIFY_API_KEY=app-xxxxxxxxxxxx  # 你的应用API密钥
DIFY_API_URL=http://localhost:8088/v1  # 本地Dify服务URL
DIFY_API_TIMEOUT=30000  # API超时时间(ms)
```

### 应用特定密钥配置

在 `dify_keys.json` 文件中配置特定应用的API密钥:

```json
{
  "写作导师": "app-xxxxxxxxxxxx",
  "智能助手": "app-xxxxxxxxxxxx"
}
```

## API 请求示例

### 基本聊天请求

```typescript
// 发送聊天请求的示例代码
const response = await fetch('/api/dify-chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: { id: "智能助手", name: "智能助手" },
    messages: [
      { role: "user", content: "你好，请介绍一下北京信息科技大学" }
    ],
    temperature: 0.7,
    conversationID: "",  // 新对话留空，继续对话填入之前的ID
    user: "user123"      // 用户标识符
  })
});

// 处理流式响应
if (response.body) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    // 处理接收到的多个事件
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;
      
      const jsonStr = line.slice(6); // 移除 "data: " 前缀
      try {
        const eventData = JSON.parse(jsonStr);
        
        // 根据事件类型处理
        switch (eventData.event) {
          case 'message':
            console.log('收到文本块:', eventData.answer);
            // 更新UI显示文本
            break;
            
          case 'message_end':
            console.log('会话完成');
            console.log('会话ID:', eventData.conversation_id);
            // 保存会话ID以便后续使用
            break;
            
          case 'error':
            console.error('错误:', eventData.message);
            break;
        }
      } catch (e) {
        console.error('解析事件数据失败:', e);
      }
    }
  }
}
```

### 带文件的请求

支持发送图片等文件:

```typescript
const response = await fetch('/api/dify-chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: { id: "智能助手", name: "智能助手" },
    messages: [
      { role: "user", content: "这张图片上显示了什么?" }
    ],
    temperature: 0.7,
    files: [
      {
        type: "image",
        transfer_method: "remote_url",
        url: "https://example.com/images/sample.jpg"
      }
    ],
    user: "user123"
  })
});

// 处理响应...
```

### 带变量的请求

支持传递应用中定义的变量:

```typescript
const response = await fetch('/api/dify-chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: { id: "写作导师", name: "写作导师" },
    messages: [
      { role: "user", content: "帮我写一篇文章" }
    ],
    inputs: {
      topic: "人工智能在教育中的应用",
      style: "学术",
      length: "2000字"
    },
    temperature: 0.7,
    user: "user123"
  })
});

// 处理响应...
```

## 注意事项

1. API密钥安全: 不要在客户端暴露API密钥，所有请求应通过服务端转发
2. 响应处理: 流式响应需正确处理多种事件类型
3. 错误处理: 确保添加适当的错误处理机制
4. 会话ID: 保存会话ID以支持多轮对话
5. 变量定义: 确保传递的变量与Dify应用中定义的变量一致 