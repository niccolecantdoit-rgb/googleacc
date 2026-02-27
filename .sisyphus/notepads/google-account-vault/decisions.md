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
- 单用户鉴权采用 `User` 单表最小模型（`passwordHash` + `singletonKey @unique` + 固定默认 `id=1`），在数据库层硬性限制最多 1 条用户记录。
- 会话 cookie 采用 `base64url(payload).HMAC-SHA256(signature)` 结构，签名密钥使用 `APP_SECRET`，避免服务端存储 session 状态并保证防篡改。
- `cookie` 参数固定 `httpOnly + sameSite=lax`，并按 `NODE_ENV === "production"` 启用 `secure`，兼顾本地开发可用性与生产安全基线。
- 鉴权路由策略：未初始化统一跳转 `/setup`；已初始化未登录只能访问 `/login`/`/logout`；`/setup` 在已初始化后强制禁用并重定向。
- `Account` 敏感字段采用“**Enc 加密存储 + Search 标准化索引**”双字段策略：`passwordEnc` 仅加密；`recoveryEmail/recoveryPhone/verificationPhone` 拆为 `*Enc`（AES-256-GCM）与 `*Search`（可 `contains` 查询）。
- 字段命名统一为 `<field>Enc` 与 `<field>Search`，避免后续迁移时语义歧义；其中 `*Search` 明确承载检索职责，不承担保密职责。
- 加密载荷格式约定为自描述版本前缀（`v1:iv:tag:ciphertext`），便于未来轮换算法/密钥策略时实现向后兼容解密分支。

## API 设计决策

- API 路由结构位于 `app/api/**`
- 认证守卫, 所有 API 端点都要求已登录, 未登录时返回 JSON 401, 不做重定向
- 响应包裹, 成功返回 `{ ok:true, data }`, 失败返回 `{ ok:false, error:{ code, message } }`
- 敏感字段策略, API 永远不返回任何 `*Enc/*Search` 字段或解密后的值, 只返回 `has*` 布尔值与 `tagIds`
- 重新排序约定, 请求体 `{ ids: string[] }`, 按数组顺序将 `order` 从 0 开始连续更新
