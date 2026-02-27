import { redirect } from "next/navigation";

import { clearSession, getAuthState } from "@/lib/auth";
import VaultApp from "@/components/vault/VaultApp";

export default async function Home() {
  const auth = await getAuthState();

  if (!auth.initialized) {
    redirect("/setup");
  }

  if (!auth.loggedIn) {
    redirect("/login");
  }

  async function logoutAction() {
    "use server";

    await clearSession();
    redirect("/login");
  }

  return (
    <main>
      <div className="top-bar">
        <form action={logoutAction}>
          <button type="submit" className="link-button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'text-bottom'}}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            退出系统
          </button>
        </form>
      </div>
      <VaultApp />
    </main>
  );
}
