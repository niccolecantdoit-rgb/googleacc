import { redirect } from "next/navigation";

import { createInitialUser, getAuthState, setSession } from "@/lib/auth";

type SetupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const auth = await getAuthState();

  if (auth.initialized) {
    if (auth.loggedIn) {
      redirect("/");
    }

    redirect("/login");
  }

  async function setupAction(formData: FormData) {
    "use server";

    if (!process.env.APP_SECRET) {
      redirect(`/setup?error=${encodeURIComponent("APP_SECRET 未配置，请先在 .env 中配置后再初始化")}`);
    }

    const password = String(formData.get("password") ?? "").trim();

    if (password.length < 8) {
      redirect("/setup?error=Password%20must%20be%20at%20least%208%20characters");
    }

    const created = await createInitialUser(password);

    if (!created) {
      redirect("/login");
    }

    await setSession(created.id);
    redirect("/");
  }

  const params = await searchParams;
  const errorRaw = params.error;
  const error = Array.isArray(errorRaw) ? errorRaw[0] : errorRaw;

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <h1>初始化系统</h1>
        <p className="auth-subtitle">首次使用请设置管理员高强度密码，后续仅凭此密码登录。</p>
        {error ? <p className="text-error">{error}</p> : null}
        <form action={setupAction} className="auth-form">
          <div>
            <label htmlFor="password">设置密码（至少 8 位）</label>
            <input id="password" name="password" type="password" required minLength={8} placeholder="••••••••" />
          </div>
          <button type="submit">
            <span>完成初始化</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </form>
      </section>
    </main>
  );
}
