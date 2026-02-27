# decisions.md

（累计记录：关键决策与理由。只追加，不覆盖。）

## 2026-02-27

- 采用 **App Router**（默认结构）作为后续 Prisma/鉴权/API 的承载层，减少后续迁移成本。
- 不使用 `src/` 目录，保持默认根级结构，便于首阶段快速交付与后续任务直接定位。
- 首页仅保留最小占位内容（"Google Account Vault"），不引入任何 UI 框架，避免超出当前任务范围。
- 将 `dev/build` 脚本切换为 `--webpack`，规避 Windows 中文路径在 Turbopack 下触发的构建崩溃问题，保证 `npm run build` 可通过。
- 增加 `outputFileTracingRoot` 显式指向项目根目录，避免受上级目录其他 `package-lock.json` 干扰，消除 workspace root 推断警告。
- 数据层采用 **SQLite + Prisma**，`DATABASE_URL="file:./dev.db"`，以最小运维成本支撑本地开发与任务阶段验证。
- `Account.f2aType` 采用 `enum(F2AType: LINK/PHONE/UNKNOWN)`，将后续二次验证来源收敛为受控值，避免字符串魔法值扩散。
- `Account.email`、`Tag.name` 添加唯一约束；`AccountTag` 使用 `@@unique([accountId, tagId])` 防止重复关联记录。
- `Account.order`、`Tag.order` 设为 `Int @default(0)` 并建索引，提前支持拖拽排序持久化与后续按序查询。
- 新增 `lib/prisma.ts` 全局单例封装，避免 Next.js 开发热重载下 PrismaClient 重复实例化导致连接膨胀。
