# Windows本地部署指南

## 简易部署步骤

部署过程只需要以下三个简单步骤：

1. 确保Docker Desktop已启动并正常运行

2. 启动Dify服务
```powershell
cd dify/docker
# 如果存在端口冲突，请修改.env文件中的EXPOSE_NGINX_PORT=8080
docker-compose up -d
```

3. 启动eduhub前端
```powershell
cd ../../eduhub
npm run dev
```

## 访问服务

- Dify管理界面: http://localhost:8080
- Eduhub界面: http://localhost:3000

## 重启服务（如需）

如果需要重启服务：

```powershell
# 重启Dify服务
cd dify/docker
docker-compose restart

# 重启eduhub
# 如果是使用npm run dev启动的，按Ctrl+C终止后重新运行：
cd ../../eduhub
npm run dev
```

## 注意事项

- 确保Docker Desktop已启动并正常运行
- 确保端口8080和3000未被其他应用占用
- 初次登录Dify需要创建管理员账户
- 如果无法连接到Dify API，请检查端口是否被占用，需要时可修改.env文件中的端口设置
