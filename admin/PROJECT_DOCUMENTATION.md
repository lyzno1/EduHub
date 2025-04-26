# 项目文档 (react-basic)

## 1. 项目概览

该项目 (`react-basic`) 是一个 Web 应用程序，包含一个使用 React 构建的前端和一个基础的 Node.js/Express 后端。前端负责用户界面和交互，使用了 React Router 进行页面导航，Ant Design 作为 UI 组件库，并通过 React Context API 实现用户认证状态管理。后端目前主要负责提供构建后的前端静态文件，并处理单页面应用 (SPA) 的路由回退，确保用户直接访问前端路由时能正确加载应用。`package.json` 中的依赖（如 `bcryptjs`）暗示可能计划或存在更复杂的后端 API 逻辑（如用户注册/登录处理），但这部分逻辑在当前分析的 `server.js` 中并未体现。

## 2. 项目结构

项目的目录和文件组织结构如下：

```
.
├── .cursor/            # Cursor 编辑器配置
├── .git/               # Git 版本控制元数据
├── .idea/              # IDE (JetBrains) 配置
├── node_modules/       # Node.js 依赖库
├── public/             # 存放静态资源 (如 index.html, favicon)
│   └── index.html      # HTML 入口文件，React 应用挂载点
├── src/                # 前端 React 应用源代码
│   ├── apis/           # (推测) 存放 API 调用相关函数
│   ├── components/     # 存放可复用的 UI 组件
│   │   └── RequireAuth.js # 用于保护路由，检查认证状态
│   ├── config/         # (推测) 存放应用配置
│   ├── context/        # 存放 React Context API 相关代码
│   │   └── AuthContext.js # 提供认证状态和方法的 Context
│   ├── data/           # (推测) 存放静态或模拟数据
│   ├── pages/          # 存放页面级组件
│   │   ├── AdminPage.js  # 管理页面组件
│   │   └── Login.js      # 登录页面组件
│   ├── router/         # 存放路由配置
│   │   └── index.js    # 使用 react-router-dom 定义前端路由
│   ├── App.js          # React 应用根组件 (目前内容简单)
│   ├── index.css       # 全局 CSS 样式
│   ├── index.js        # React 应用入口文件，渲染根组件并设置 Provider
│   └── jsconfig.json   # JavaScript 项目配置 (如路径别名 '@/')
├── .gitignore          # Git 忽略文件配置
├── craco.config.js     # Craco 配置文件，用于覆盖 create-react-app 的默认配置
├── package-lock.json   # 锁定 Node.js 依赖版本
├── package.json        # Node.js 项目配置文件 (依赖、脚本等)
├── README.md           # 项目说明文件
└── server.js           # Node.js/Express 后端服务器入口文件
```

*   **核心目录**:
    *   `src/`: 前端应用的核心代码。
    *   `public/`: 静态文件服务的根目录，包含 `index.html`。
    *   `build/`: (由 `npm run build` 生成，`server.js` 使用) 存放构建后的前端静态文件。
*   **配置文件**:
    *   `package.json`: 定义项目依赖和运行脚本。
    *   `craco.config.js`: 自定义 React 应用的构建配置。
    *   `server.js`: 配置 Express 服务器。
*   **关键文件**:
    *   `server.js`: 启动后端服务，提供静态文件。
    *   `src/index.js`: 前端应用启动点。
    *   `src/router/index.js`: 定义前端页面路由。
    *   `src/context/AuthContext.js`: 管理用户认证状态。
    *   `src/components/RequireAuth.js`: 实现路由访问控制。

## 3. 主要功能描述

根据现有代码分析，项目包含以下主要功能：

*   **前端单页面应用 (SPA)**:
    *   使用 React 构建用户界面。
    *   UI 基于 Ant Design 组件库。
    *   使用 Sass 进行 CSS 样式编写 (通过 `craco.config.js` 和 `devDependencies` 推断)。
*   **客户端路由**:
    *   使用 `react-router-dom` 实现前端页面导航。
    *   定义了两个主要路由：
        *   `/`: 指向登录页面 (`Login` 组件)。
        *   `/AdminPage`: 指向管理页面 (`AdminPage` 组件)。
*   **用户认证**:
    *   通过 `AuthContext` (`src/context/AuthContext.js`) 管理用户的登录状态。
    *   使用 `RequireAuth` 组件 (`src/components/RequireAuth.js`) 对 `/AdminPage` 路由进行保护，未登录用户访问时可能会被重定向到登录页。
    *   登录逻辑由 `Login` 组件 (`src/pages/Login.js`) 处理 (具体实现需查看该文件)。
*   **后端服务 (基础)**:
    *   使用 Node.js 和 Express 搭建。
    *   主要功能是托管 `build` 目录下的静态前端文件。
    *   处理所有未匹配 API 的 GET 请求，返回 `index.html`，以支持 SPA 的路由模式。
    *   目前 `server.js` 未包含明确的 API 端点定义。
*   **潜在功能 (基于依赖)**:
    *   **拖放交互**: 依赖 `react-beautiful-dnd` 和 `react-dnd`。
    *   **密码处理**: 依赖 `bcryptjs`，暗示后端有用户密码加密存储的需求。
    *   **跨域处理**: 依赖 `cors`，如果后端提供 API，则需要配置跨域。

## 4. 技术栈

*   **前端**:
    *   **语言**: JavaScript, CSS (Sass), HTML
    *   **框架/库**: React (`react`, `react-dom`), React Router (`react-router-dom`), Ant Design (`antd`), React DnD (`react-beautiful-dnd`, `react-dnd`), Web Vitals (`web-vitals`)
    *   **状态管理**: React Context API (推断自 `AuthContext`)
    *   **构建/工具**: Create React App (基础), Craco (`@craco/craco`), React Scripts (`react-scripts`)
*   **后端**:
    *   **语言**: JavaScript (Node.js)
    *   **框架/库**: Express (`express`)
    *   **库**: CORS (`cors`), BcryptJS (`bcryptjs`)
*   **开发工具**:
    *   **包管理**: npm (推断自 `package.json`, `package-lock.json`)
    *   **版本控制**: Git
*   **其他**:
    *   UUID (`uuidv4`)

## 5. 如何运行/使用

以下是在 Windows PowerShell 或 Command Prompt 中设置和运行此项目的步骤：

1.  **克隆代码仓库**:
    *   从 GitHub:
        ```powershell
        git clone https://github.com/ifLab/eduhub-admin.git
        ```
    *   或使用国内镜像 (Gitee):
        ```powershell
        git clone https://gitee.com/Zyw_1337/copilot_front.git
        ```

2.  **进入项目目录**: (确保 `eduhub-admin` 是你克隆下来的文件夹名称)
    ```powershell
    cd eduhub-admin
    ```

3.  **安装依赖**: (安装前端和后端所需的 Node.js 包)
    ```powershell
    npm install
    ```
    (或者，如果项目使用 Yarn，则运行 `yarn install`)

4.  **启动开发环境 (可选)**:
    *   用于前端开发，通常会启动一个带热重载的开发服务器 (例如 React Scripts):
        ```powershell
        npm start
        ```
    *   **注意**: 这通常只启动前端开发服务器 (可能在 `http://localhost:3000`)，你需要单独启动后端 API 服务器 (`src/apis/server.js`) 进行联调。

5.  **构建生产版本 (部署前)**:
    *   构建优化的前端静态文件到 `build` 目录:
        ```powershell
        npm run build
        ```

6.  **启动生产环境服务 (使用 PM2)**:
    *   **启动前端静态文件服务**: (运行根目录的 `server.js`，负责提供 `build` 目录的内容)
        ```powershell
        # 设置端口环境变量并启动服务 (PowerShell)
        $env:PORT="3002"; pm2 start server.js --name "manage-front"
        # 或者 (Command Prompt)
        # set PORT=3002 && pm2 start server.js --name "manage-front"
        ```
        这将在后台启动服务，监听 3002 端口，进程名为 `manage-front`。
    *   **启动后端 API 服务**: (运行 `src/apis` 目录下的 `server.js`)
        ```powershell
        cd src/apis;
        pm2 start server.js --name "manage-backend";
        cd ../..; # 返回项目根目录
        ```
        这将在后台启动 API 服务，进程名为 `manage-backend`。后端服务的具体监听端口需查看 `src/apis/server.js` 或相关配置文件。

**PM2 常用命令**: (需要全局安装 `npm install pm2 -g`)
*   `pm2 list`: 查看所有由 PM2 管理的进程状态。
*   `pm2 stop <name|id>`: 停止指定名称或 ID 的进程。
*   `pm2 restart <name|id>`: 重启指定进程。
*   `pm2 logs <name|id>`: 查看指定进程的日志。
*   `pm2 delete <name|id>`: 停止并从 PM2 列表中删除进程。

**注意**: 上述生产环境启动命令假设你已经在服务器上安装了 Node.js 和 PM2。

**注意**: 开发环境下，前端应用可能会直接与后端 API (如果存在且运行在其他端口) 交互，或者模拟 API 请求。生产环境下，`server.js` 同时负责提供前端文件和可能的 API 服务 (尽管目前 API 部分未实现)。 