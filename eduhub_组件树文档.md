# Eduhub 项目组件树文档

## 项目结构概述
Eduhub是一个基于Next.js的聊天应用，主要包含以下核心部分：
- 聊天界面(Chat)
- 聊天列表侧边栏(Chatbar)
- 提示词管理侧边栏(Promptbar)
- 全局状态管理(HomeContext)

## 核心组件树

### 1. 主页面结构
```
App
└─ HomePage
   ├─ Chatbar (左侧边栏)
   ├─ Chat (主聊天区)
   └─ Promptbar (右侧边栏)
```

### 2. 组件详细说明

#### Chatbar (左侧边栏)
路径: `components/Chatbar/Chatbar.tsx`
功能:
- 显示和管理聊天会话列表
- 提供文件夹分类功能
- 包含搜索、导入/导出、清空会话等功能

主要子组件:
- `ChatFolders`: 聊天文件夹管理
- `Conversations`: 会话列表展示
- `ChatbarSettings`: 侧边栏设置

UI修改位置:
- 修改`Chatbar.tsx`可调整侧边栏整体样式
- 修改子组件可调整具体功能区域样式

#### Chat (主聊天区)
路径: `components/Chat/Chat.tsx`
功能:
- 显示聊天消息
- 处理用户输入
- 提供消息设置和操作

主要子组件:
- `ChatInput`: 消息输入框
- `ChatMessage`: 单条消息显示
- `ModelSelect`: 模型选择
- `SystemPrompt`: 系统提示设置

UI修改位置:
- 修改`Chat.tsx`可调整聊天区整体布局
- 修改`ChatMessage`可调整消息气泡样式
- 修改`ChatInput`可调整输入框样式

#### Promptbar (右侧边栏)
路径: `components/Promptbar/Promptbar.tsx`
功能:
- 管理提示词模板
- 提供提示词分类和搜索功能

主要子组件:
- `PromptFolders`: 提示词文件夹管理
- `Prompts`: 提示词列表展示
- `PromptbarSettings`: 侧边栏设置

UI修改位置:
- 修改`Promptbar.tsx`可调整侧边栏整体样式
- 修改`Prompts`可调整提示词列表样式

### 3. 全局状态管理
路径: `pages/api/home/home.context.tsx`
功能:
- 管理应用全局状态
- 包括会话、文件夹、提示词等数据
- 提供状态更新方法

### 4. 样式修改指南

1. **主题颜色修改**:
   - 修改`Chat.tsx`中的背景色变量
   - 查找`lightMode`相关代码调整不同主题配色

2. **布局调整**:
   - 修改各组件容器div的className
   - 调整Sidebar组件的宽度和位置

3. **响应式设计**:
   - 修改`Mobile`组件中的导航栏
   - 调整各组件在不同屏幕尺寸下的显示

## 最佳实践建议

1. 修改UI时应优先考虑修改子组件样式
2. 全局样式修改应在`styles/globals.css`中进行
3. 新增功能组件应放在对应功能目录下
4. 状态管理应通过HomeContext进行，避免直接操作本地存储
