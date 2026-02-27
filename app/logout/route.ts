import { NextResponse } from "next/server";

import { clearSession, isUserInitialized } from "@/lib/auth";

export async function GET(request: Request) {
  await clearSession();

  const initialized = await isUserInitialized();
  const url = new URL(initialized ? "/login" : "/setup", request.url);

  return NextResponse.redirect(url);
}
