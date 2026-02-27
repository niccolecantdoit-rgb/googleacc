# learnings.md

（累计记录：约定、代码风格、坑点。只追加，不覆盖。）

## 2026-02-27

- 使用 `create-next-app@latest` 官方脚手架初始化，选项：`TypeScript + ESLint + App Router + npm + no Tailwind + no src dir`。
- 由于仓库根目录已有 `.sisyphus/`，直接在目标目录初始化会冲突；采用“临时目录脚手架 -> 拷贝到目标目录（排除 node_modules）”方案。
- 包管理器固定为 `npm`，并以 `npm install`、`npm run lint`、`npm run build` 作为验证链路。
- 针对 Next.js 提示的 `inferred your workspace root / multiple lockfiles` 警告，已在 `next.config.ts` 设置 `outputFileTracingRoot: path.join(__dirname)`，显式固定到当前项目根目录。
- Prisma 在当前项目中使用 6.x 更贴合经典 `schema.prisma + .env` 工作流；7.x 会引入 datasource 配置变更，若沿用旧写法会触发 `P1012`。
- Windows 中文路径场景下可直接使用 `npx prisma validate`、`npx prisma migrate dev --name init`，迁移目录会正常生成到 `prisma/migrations/*`。
- `npx prisma migrate dev` 会自动生成本地 SQLite `dev.db`，需通过 `.gitignore` 忽略 `*.db` / `*.db-*` / `prisma/*.db*`，避免误提交数据库文件。
- 单用户首次初始化流程可稳定落地为：访问受保护页 -> 重定向 `/setup` -> 写入用户哈希密码 -> 立即签发 cookie -> 跳回受保护页。
- 使用 Next.js App Router 的 server action + `redirect()` 时，错误提示更适合通过 query string 回传（如 `/login?error=...`），避免引入额外状态管理。
- `cookies()` 在服务端路径下统一管理更稳妥：登录写入、退出置空、受保护页读取；本项目用签名 cookie 即可满足最小会话能力。
- Prisma `.prisma` 文件当前 LSP 未安装时，可用 `npx prisma validate` 补足 schema 级校验，避免仅靠构建链路漏掉模型错误。
- `ENCRYPTION_KEY` 在本项目约定为 **base64 编码后的 32 字节密钥**（解码后必须严格等于 32 bytes），否则应在启动/调用加密时立即抛错。
- 推荐密钥生成方式：`node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`；生成后写入 `.env`，禁止将明文敏感数据或真实密钥提交到仓库。
- AES-256-GCM 落地时需同时保存 `iv` 与 `authTag`；解密失败必须显式报错，避免静默吞错导致数据损坏难以定位。
