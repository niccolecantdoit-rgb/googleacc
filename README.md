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
- `ENCRYPTION_KEY`：业务数据加密密钥（必须是 32 bytes 的 Base64 编码）

## 最小手动验收流程（Manual Acceptance）

### 运行前置

必需环境变量：

- `DATABASE_URL`
- `APP_SECRET`
- `ENCRYPTION_KEY`（必须是 32 bytes 的 Base64 编码）

运行数据库迁移：

```bash
npx prisma migrate deploy
```

启动开发服务：

```bash
npm run dev
```

### 验收检查清单

1) 首次访问会重定向到 `/setup`，并设置密码
2) 完成 setup 后回到首页，看到 Vault UI
3) 创建 tag
4) 创建 account，包含 password 和 recovery 字段
5) 编辑 account（通过 includeSensitive 加载敏感字段）并保存
6) 通过 checkbox 分配 tag，并通过 drag-to-tag 分配 tag
7) 拖拽重排 accounts，刷新页面确认顺序持久化
8) 使用过滤器：keyword、f2aType、tags、onlyMissing
9) Logout 后重定向到 `/login`
