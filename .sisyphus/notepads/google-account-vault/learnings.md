# learnings.md

（累计记录：约定、代码风格、坑点。只追加，不覆盖。）

## 2026-02-27

- 使用 `create-next-app@latest` 官方脚手架初始化，选项：`TypeScript + ESLint + App Router + npm + no Tailwind + no src dir`。
- 由于仓库根目录已有 `.sisyphus/`，直接在目标目录初始化会冲突；采用“临时目录脚手架 -> 拷贝到目标目录（排除 node_modules）”方案。
- 包管理器固定为 `npm`，并以 `npm install`、`npm run lint`、`npm run build` 作为验证链路。
- 针对 Next.js 提示的 `inferred your workspace root / multiple lockfiles` 警告，已在 `next.config.ts` 设置 `outputFileTracingRoot: path.join(__dirname)`，显式固定到当前项目根目录。
