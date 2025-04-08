# EduHub 开发工作流程文档

## 目录
1. [环境设置](#环境设置)
2. [分支管理](#分支管理)
3. [开发流程](#开发流程)
4. [代码同步](#代码同步)
5. [常见问题处理](#常见问题处理)

## 环境设置

### 服务器端设置
```bash
# 1. 克隆项目
git clone [项目地址] eduhub
cd eduhub

# 2. 创建开发分支
git checkout -b develop-server

# 3. 安装依赖
npm install  # 或 yarn install

# 4. 配置git信息
git config user.name "你的名字"
git config user.email "你的邮箱"
```

### Windows本地设置
1. 使用 Cursor IDE 连接服务器
   - 打开 Cursor
   - 点击左下角 "Remote SSH"
   - 输入服务器信息：`ssh username@your-server-ip`
   - 选择工作目录：`/path/to/your/eduhub`

## 分支管理

### 分支说明
- `main`: 主分支，用于生产环境
- `develop-server`: 开发分支，用于日常开发
- `feature/*`: 特性分支，用于开发新功能

### 分支使用规范
1. 所有开发工作在 `develop-server` 或特性分支进行
2. 重要更新才合并到 `main` 分支
3. 每个新功能建议创建独立的特性分支

## 开发流程

### 日常开发步骤
1. 开始新工作前：
```bash
# Windows本地
git pull origin develop-server  # 获取最新代码
```

2. 开发完成后：
```bash
# Windows本地
git add .
git commit -m "feat: 添加新功能xxx"
git push origin develop-server
```

3. 服务器同步：
```bash
# 服务器端
git pull origin develop-server
```

### 多人协作建议
- 创建个人特性分支：`feature/user-auth`
- 完成后合并到 `develop-server`
- 定期同步主分支的更新

## 代码同步

### 方式一：Git同步（推荐）
```bash
# Windows本地
git add .
git commit -m "更新说明"
git push origin develop-server

# 服务器端
git pull origin develop-server
```

### 方式二：直接文件传输
```bash
# Windows PowerShell
scp your_file.txt username@server_ip:/path/to/eduhub/
```

### 方式三：自动同步（Git Hooks）
```bash
# 在服务器端设置
vim .git/hooks/post-receive

# 添加以下内容：
#!/bin/bash
git checkout develop-server
git pull origin develop-server
npm install  # 如果有新依赖
```

## 常见问题处理

### 1. 代码冲突
```bash
# 服务器端
git stash  # 暂存当前修改
git pull origin develop-server  # 拉取最新代码
git stash pop  # 恢复暂存的修改
# 手动解决冲突
```

### 2. 依赖更新
- 修改依赖后，在服务器端运行：
```bash
npm install
```

### 3. 安全注意事项
- 敏感配置文件加入 `.gitignore`
- 使用环境变量区分开发和生产环境
- 定期备份重要数据

## 最佳实践
1. 经常进行代码同步
2. 编写清晰的commit信息
3. 保持代码风格一致
4. 重要更改先在开发环境测试
5. 定期检查和更新依赖

## 有用的命令速查

### 分支操作
```bash
git branch  # 查看分支
git checkout -b new-branch  # 创建并切换到新分支
git merge branch-name  # 合并分支
```

### 代码同步
```bash
git status  # 查看状态
git pull origin branch-name  # 拉取代码
git push origin branch-name  # 推送代码
```

### 撤销操作
```bash
git reset --hard HEAD  # 撤销所有改动
git checkout -- file  # 撤销单个文件的改动
``` 