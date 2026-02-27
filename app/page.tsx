import { redirect } from "next/navigation";

import { getAuthState } from "@/lib/auth";
import VaultApp from "@/components/vault/VaultApp";

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
      <p style={{ marginBottom: "1rem" }}>
        <a href="/logout">退出登录</a>
      </p>
      <VaultApp />
    </main>
  );
}
