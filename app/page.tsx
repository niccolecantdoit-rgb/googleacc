import { redirect } from "next/navigation";

import { getAuthState } from "@/lib/auth";

export default async function Home() {
  const auth = await getAuthState();

  if (!auth.initialized) {
    redirect("/setup");
  }

  if (!auth.loggedIn) {
    redirect("/login");
  }

  return (
    <main style={{ padding: "3rem 1.5rem", maxWidth: 800, margin: "0 auto" }}>
      <h1>Google Account Vault</h1>
      <p>你已登录，当前为受保护页面。</p>
      <p>
        <a href="/logout">退出登录</a>
      </p>
    </main>
  );
}
