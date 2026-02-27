# Google Account Vault

基于 Next.js（App Router）+ TypeScript 的项目初始脚手架。

## 本地开发

1. 安装依赖：

   ```bash
   npm install
   ```

2. 启动开发服务：

   ```bash
   npm run dev
   ```

3. 打开浏览器访问：<http://localhost:3000>

## 生产运行

1. 构建产物：

   ```bash
   npm run build
   ```

2. 启动生产服务：

   ```bash
   npm run start
   ```

## 部署说明（最小可用）

- 可部署到支持 Node.js 的平台（如 Vercel、云服务器、容器环境）。
- 部署前需注入环境变量（见下文），并执行 `npm run build` 确认可构建通过。

## 环境变量配置

请复制 `.env.example` 为 `.env` 并填入真实值：

- `DATABASE_URL`：数据库连接字符串
- `APP_SECRET`：应用级密钥（用于签名/会话等）
- `ENCRYPTION_KEY`：业务数据加密密钥
