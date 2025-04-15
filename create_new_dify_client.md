# Prompt Template: 添加新的 Dify 应用支持

**目标:** 基于现有的 `eduhub/services/dify/client.ts` 实现，为一个新的 Dify 应用（具有独立的 API URL 和 Key）添加前端支持。

**请提供以下新应用的信息:**

1.  **新应用的唯一标识符 (例如 `documentAnalyzer`, `codeHelper`, `customerSupportBot`):**
    `[请在此填写新应用的英文标识符]`

2.  **新应用的 API URL (例如 `https://api.dify.ai/v1` 或其他实例地址):**
    `[请在此填写新应用的完整 API URL]`

3.  **新应用的 API Key (例如 `app-xyz...`):**
    `[请在此填写新应用的 API Key]`

4.  **(可选) 新应用的主要功能或前端使用场景简述 (例如 "用于在文档页面分析用户上传的文档", "在代码编辑器旁提供代码建议"):**
    `[请在此简述新应用的功能和用途]`

---

**请根据我提供的上述信息，并基于现有的 `eduhub/services/dify/client.ts` 实现，为我提供以下步骤和代码示例：**

1.  **环境变量配置指导:**
    *   告诉我应该在 `.env.local` 文件中添加哪些新的环境变量来存储新应用的 API URL 和 API Key。请使用基于我提供的 **[新应用的唯一标识符]** 的清晰命名规范（例如 `NEXT_PUBLIC_DIFY_[标识符]_API_URL` 和 `NEXT_PUBLIC_DIFY_[标识符]_API_KEY`）。

2.  **实例化 `DifyClient` 的代码示例:**
    *   展示如何在需要使用新应用的前端代码模块（例如一个新的 React Hook 或组件内）中，创建一个**新的** `DifyClient` 实例，并确保它读取的是新应用对应的 API URL 环境变量。

3.  **调用 `DifyClient` 方法的代码示例:**
    *   展示如何调用一个常用的 `DifyClient` 方法（例如 `createChatStream` 或 `streamChat`），确保：
        *   使用的是上一步为新应用创建的 `DifyClient` 实例。
        *   将新应用对应的 API Key 环境变量的值作为 `key` 参数传递给该方法。

4.  **前端集成示例 (模仿现有模式):**
    *   提供一个简化的前端代码片段（例如一个异步函数或 React Hook 的一部分），演示如何结合第 2 步和第 3 步，将新 Dify 应用的调用集成到前端逻辑中，模仿我当前代码（如 `Chat.tsx` 中处理 Dify 调用的模式）处理请求、接收流式响应、处理错误等。

5.  **强调接口复用:**
    *   简单说明 `DifyClient` 的核心接口和方法是如何被复用来支持这个新应用的。

**最终目标:** 让我可以快速理解配置和代码集成步骤，从而高效地将新的 Dify 应用接入到我的 EduHub 项目中。