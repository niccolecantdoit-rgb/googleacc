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

### API smoke test（鉴权 API，最小可跑）

- 本地启动需要环境变量：`DATABASE_URL`、`APP_SECRET`、`ENCRYPTION_KEY`。
- 用一个临时 SQLite DB 跑迁移（避免污染默认 `dev.db`）：

```bash
# macOS/Linux/Git Bash
export DATABASE_URL="file:./prisma/smoke.db"
export APP_SECRET="dev-secret"
export ENCRYPTION_KEY="<base64-32-bytes>"
npm run prisma:generate
npm run prisma:migrate -- --name smoke --skip-generate
npm run dev
```

```powershell
# PowerShell
$env:DATABASE_URL="file:./prisma/smoke.db"
$env:APP_SECRET="dev-secret"
$env:ENCRYPTION_KEY="<base64-32-bytes>"
npm run prisma:generate
npm run prisma:migrate -- --name smoke --skip-generate
npm run dev
```

- 鉴权机制：受保护 API 通过 `gav_session`（HMAC SHA256 签名 token）识别登录态。该 cookie 设置为 `httpOnly`，浏览器 JS 读不到；做 headless QA 时直接生成 `Cookie` header 传给接口。

```bash
# 一次性脚本：
# 1) 写入/覆盖 singleton user（id=1）
# 2) 生成 gav_session
# 3) 调用 API：创建 tag -> 创建 account -> 绑定 tag
node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { createHmac, randomBytes } = require('node:crypto');

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const APP_SECRET = process.env.APP_SECRET;
if (!APP_SECRET) throw new Error('APP_SECRET is required');

function sign(value) {
  return createHmac('sha256', APP_SECRET).update(value).digest('base64url');
}

function makeSessionCookie(userId) {
  const issuedAt = Date.now();
  const nonce = randomBytes(16).toString('base64url');
  const raw = `${userId}.${issuedAt}.${nonce}`;
  const encoded = Buffer.from(raw).toString('base64url');
  const token = `${encoded}.${sign(encoded)}`;
  return `gav_session=${token}`;
}

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      cookie: makeSessionCookie(1),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${path}: ${JSON.stringify(json)}`);
  }
  return json;
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash('dev-password', 12);
    await prisma.user.upsert({
      where: { id: 1 },
      update: { passwordHash },
      create: { passwordHash },
    });

    const tagResp = await api('/api/tags', { method: 'POST', body: { name: `smoke-${Date.now()}` } });
    const tagId = tagResp.data.tag.id;
    console.log('tagId:', tagId);

    const accountResp = await api('/api/accounts', {
      method: 'POST',
      body: { email: `smoke+${Date.now()}@example.com`, password: 'p@ssw0rd' },
    });
    const accountId = accountResp.data.account.id;
    console.log('accountId:', accountId);

    await api(`/api/accounts/${accountId}/tags`, { method: 'POST', body: { tagId } });
    console.log('assigned tag -> ok');
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
NODE
```
