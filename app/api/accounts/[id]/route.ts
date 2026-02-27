import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/api-auth";
import { decryptString, encryptString, normalizeSearchEmail, normalizeSearchPhone } from "@/lib/crypto";
import prisma from "@/lib/prisma";

type AccountWithTags = {
  id: string;
  email: string;
  username: string | null;
  passwordEnc?: string;
  f2aType: F2AType;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  recoveryEmailEnc: string | null;
  recoveryPhoneEnc: string | null;
  verificationPhoneEnc: string | null;
  accountTags: Array<{ tagId: string }>;
};

type F2AType = "LINK" | "PHONE" | "UNKNOWN";

type AccountWithSensitive = AccountWithTags & {
  passwordEnc: string;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ACCOUNT_SELECT = {
  id: true,
  email: true,
  username: true,
  f2aType: true,
  order: true,
  createdAt: true,
  updatedAt: true,
  recoveryEmailEnc: true,
  recoveryPhoneEnc: true,
  verificationPhoneEnc: true,
  accountTags: {
    select: { tagId: true },
  },
} satisfies Prisma.AccountSelect;

function badRequest(message: string) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "BAD_REQUEST",
        message,
      },
    },
    { status: 400 },
  );
}

function notFound(message = "Account not found.") {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message,
      },
    },
    { status: 404 },
  );
}

function serializeAccount(account: AccountWithTags) {
  return {
    id: account.id,
    email: account.email,
    username: account.username,
    f2aType: account.f2aType,
    order: account.order,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    hasRecoveryEmail: Boolean(account.recoveryEmailEnc),
    hasRecoveryPhone: Boolean(account.recoveryPhoneEnc),
    hasVerificationPhone: Boolean(account.verificationPhoneEnc),
    tagIds: account.accountTags.map((item) => item.tagId),
  };
}

function toNullableTrimmed(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Expected string input.");
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

async function getAccountOrNull(id: string) {
  return prisma.account.findUnique({
    where: { id },
    select: ACCOUNT_SELECT,
  });
}

async function getAccountWithSensitiveOrNull(id: string) {
  return prisma.account.findUnique({
    where: { id },
    select: {
      ...ACCOUNT_SELECT,
      passwordEnc: true,
    },
  }) as Promise<AccountWithSensitive | null>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireApiAuth();
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const includeSensitive = request.nextUrl.searchParams.get("includeSensitive") === "1";

  if (includeSensitive) {
    const account = await getAccountWithSensitiveOrNull(id);
    if (!account) {
      return notFound();
    }

    try {
      const sensitive = {
        password: decryptString(account.passwordEnc),
        recoveryEmail: account.recoveryEmailEnc ? decryptString(account.recoveryEmailEnc) : null,
        recoveryPhone: account.recoveryPhoneEnc ? decryptString(account.recoveryPhoneEnc) : null,
        verificationPhone: account.verificationPhoneEnc ? decryptString(account.verificationPhoneEnc) : null,
      };

      return NextResponse.json({
        ok: true,
        data: {
          account: serializeAccount(account),
          sensitive,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to decrypt sensitive fields.";
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DECRYPT_FAILED",
            message,
          },
        },
        { status: 500 },
      );
    }
  }

  const account = await getAccountOrNull(id);
  if (!account) {
    return notFound();
  }

  return NextResponse.json({
    ok: true,
    data: {
      account: serializeAccount(account),
    },
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireApiAuth();
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  if (!body || typeof body !== "object") {
    return badRequest("Request body must be an object.");
  }

  const input = body as Record<string, unknown>;
  const data: Prisma.AccountUpdateInput = {};

  if (Object.prototype.hasOwnProperty.call(input, "email")) {
    if (typeof input.email !== "string" || input.email.trim() === "") {
      return badRequest("email must be a non-empty string.");
    }
    data.email = input.email.trim().toLowerCase();
  }

  if (Object.prototype.hasOwnProperty.call(input, "username")) {
    if (typeof input.username !== "string") {
      return badRequest("username must be a string.");
    }
    data.username = input.username.trim() === "" ? null : input.username.trim();
  }

  if (Object.prototype.hasOwnProperty.call(input, "password")) {
    if (typeof input.password !== "string" || input.password.trim() === "") {
      return badRequest("password must be a non-empty string.");
    }
    data.passwordEnc = encryptString(input.password);
  }

  if (Object.prototype.hasOwnProperty.call(input, "f2aType")) {
    if (input.f2aType !== "LINK" && input.f2aType !== "PHONE" && input.f2aType !== "UNKNOWN") {
      return badRequest("f2aType must be LINK, PHONE, or UNKNOWN.");
    }
    data.f2aType = input.f2aType;
  }

  if (Object.prototype.hasOwnProperty.call(input, "recoveryEmail")) {
    let recoveryEmail: string | null;
    try {
      recoveryEmail = toNullableTrimmed(input.recoveryEmail);
    } catch {
      return badRequest("recoveryEmail must be a string.");
    }
    data.recoveryEmailEnc = recoveryEmail ? encryptString(recoveryEmail) : null;
    data.recoveryEmailSearch = recoveryEmail ? normalizeSearchEmail(recoveryEmail) : null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "recoveryPhone")) {
    let recoveryPhone: string | null;
    try {
      recoveryPhone = toNullableTrimmed(input.recoveryPhone);
    } catch {
      return badRequest("recoveryPhone must be a string.");
    }
    data.recoveryPhoneEnc = recoveryPhone ? encryptString(recoveryPhone) : null;
    data.recoveryPhoneSearch = recoveryPhone ? normalizeSearchPhone(recoveryPhone) : null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "verificationPhone")) {
    let verificationPhone: string | null;
    try {
      verificationPhone = toNullableTrimmed(input.verificationPhone);
    } catch {
      return badRequest("verificationPhone must be a string.");
    }
    data.verificationPhoneEnc = verificationPhone ? encryptString(verificationPhone) : null;
    data.verificationPhoneSearch = verificationPhone ? normalizeSearchPhone(verificationPhone) : null;
  }

  try {
    const updated = await prisma.account.update({
      where: { id },
      data,
      select: ACCOUNT_SELECT,
    });

    return NextResponse.json({
      ok: true,
      data: {
        account: serializeAccount(updated),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return notFound();
      }

      if (error.code === "P2002" && Array.isArray(error.meta?.target) && error.meta.target.includes("email")) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "DUPLICATE_EMAIL",
              message: "Email already exists.",
            },
          },
          { status: 409 },
        );
      }
    }

    throw error;
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireApiAuth();
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;

  try {
    await prisma.account.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      data: { id },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return notFound();
    }

    throw error;
  }
}
