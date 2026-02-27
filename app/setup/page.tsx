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
    <main style={{ padding: "3rem 1.5rem", maxWidth: 420, margin: "0 auto" }}>
      <h1>初始化管理员密码</h1>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      <form action={setupAction} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label htmlFor="password">密码（至少 8 位）</label>
        <input id="password" name="password" type="password" required minLength={8} />
        <button type="submit">完成初始化</button>
      </form>
    </main>
  );
}
