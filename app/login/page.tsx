import { redirect } from "next/navigation";

import { authenticateWithPassword, getAuthState, setSession } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const auth = await getAuthState();

  if (!auth.initialized) {
    redirect("/setup");
  }

  if (auth.loggedIn) {
    redirect("/");
  }

  async function loginAction(formData: FormData) {
    "use server";

    if (!process.env.APP_SECRET) {
      redirect(`/login?error=${encodeURIComponent("APP_SECRET 未配置，请先在 .env 中配置后重试")}`);
    }

    const password = String(formData.get("password") ?? "");

    const user = await authenticateWithPassword(password);
    if (!user) {
      redirect("/login?error=Invalid%20password");
    }

    await setSession(user.id);
    redirect("/");
  }

  const params = await searchParams;
  const errorRaw = params.error;
  const error = Array.isArray(errorRaw) ? errorRaw[0] : errorRaw;

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <h1>验证身份</h1>
        <p className="auth-subtitle">输入管理员密码进入 Vault</p>
        {error ? <p className="text-error">{error}</p> : null}
        <form action={loginAction} className="auth-form">
          <div>
            <label htmlFor="password">密码</label>
            <input id="password" name="password" type="password" required placeholder="••••••••" />
          </div>
          <button type="submit">
            <span>登录系统</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
          </button>
        </form>
      </section>
    </main>
  );
}
