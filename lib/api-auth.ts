import { NextResponse } from "next/server";

import { getAuthState, getSessionUser } from "@/lib/auth";

type ApiAuthResult =
  | { user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>> }
  | { response: NextResponse };

export async function requireApiAuth(): Promise<ApiAuthResult> {
  const authState = await getAuthState();

  if (!authState.initialized) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: {
            code: "AUTH_NOT_INITIALIZED",
            message: "Authentication is not initialized.",
          },
        },
        { status: 401 },
      ),
    };
  }

  if (!authState.loggedIn) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized.",
          },
        },
        { status: 401 },
      ),
    };
  }

  const user = await getSessionUser();

  if (!user) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized.",
          },
        },
        { status: 401 },
      ),
    };
  }

  return { user };
}
