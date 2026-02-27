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
