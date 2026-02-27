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
    <main style={{ padding: "3rem 1.5rem", maxWidth: 420, margin: "0 auto" }}>
      <h1>登录</h1>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      <form action={loginAction} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label htmlFor="password">密码</label>
        <input id="password" name="password" type="password" required />
        <button type="submit">登录</button>
      </form>
    </main>
  );
}
