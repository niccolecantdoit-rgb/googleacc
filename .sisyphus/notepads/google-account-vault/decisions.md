# decisions.md

（累计记录：关键决策与理由。只追加，不覆盖。）

## 2026-02-27

- 采用 **App Router**（默认结构）作为后续 Prisma/鉴权/API 的承载层，减少后续迁移成本。
- 不使用 `src/` 目录，保持默认根级结构，便于首阶段快速交付与后续任务直接定位。
- 首页仅保留最小占位内容（"Google Account Vault"），不引入任何 UI 框架，避免超出当前任务范围。
- 将 `dev/build` 脚本切换为 `--webpack`，规避 Windows 中文路径在 Turbopack 下触发的构建崩溃问题，保证 `npm run build` 可通过。
- 增加 `outputFileTracingRoot` 显式指向项目根目录，避免受上级目录其他 `package-lock.json` 干扰，消除 workspace root 推断警告。
