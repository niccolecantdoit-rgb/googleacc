import { Prisma, type F2AType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/api-auth";
import { encryptString, normalizeSearchEmail, normalizeSearchPhone } from "@/lib/crypto";
import prisma from "@/lib/prisma";

type AccountWithTags = {
  id: string;
  email: string;
  username: string | null;
  f2aType: F2AType;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  recoveryEmailEnc: string | null;
  recoveryPhoneEnc: string | null;
  verificationPhoneEnc: string | null;
  accountTags: Array<{ tagId: string }>;
};

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

export async function GET() {
  const auth = await requireApiAuth();
  if ("response" in auth) {
    return auth.response;
  }

  const accounts = await prisma.account.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
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
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      accounts: accounts.map(serializeAccount),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if ("response" in auth) {
    return auth.response;
  }

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

  const emailRaw = input.email;
  if (typeof emailRaw !== "string" || emailRaw.trim() === "") {
    return badRequest("email is required.");
  }
  const email = emailRaw.trim().toLowerCase();

  const passwordRaw = input.password;
  if (typeof passwordRaw !== "string" || passwordRaw.trim() === "") {
    return badRequest("password is required.");
  }
  const password = passwordRaw;

  let username: string | null;
  let recoveryEmail: string | null;
  let recoveryPhone: string | null;
  let verificationPhone: string | null;

  try {
    username = toNullableTrimmed(input.username);
    recoveryEmail = toNullableTrimmed(input.recoveryEmail);
    recoveryPhone = toNullableTrimmed(input.recoveryPhone);
    verificationPhone = toNullableTrimmed(input.verificationPhone);
  } catch {
    return badRequest("Optional fields must be strings when provided.");
  }

  let f2aType: F2AType = "UNKNOWN";
  if (input.f2aType !== undefined) {
    if (input.f2aType !== "LINK" && input.f2aType !== "PHONE" && input.f2aType !== "UNKNOWN") {
      return badRequest("f2aType must be LINK, PHONE, or UNKNOWN.");
    }
    f2aType = input.f2aType;
  }

  const maxOrder = await prisma.account.aggregate({
    _max: { order: true },
  });

  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  try {
    const created = await prisma.account.create({
      data: {
        email,
        username,
        passwordEnc: encryptString(password),
        f2aType,
        recoveryEmailEnc: recoveryEmail ? encryptString(recoveryEmail) : null,
        recoveryEmailSearch: recoveryEmail ? normalizeSearchEmail(recoveryEmail) : null,
        recoveryPhoneEnc: recoveryPhone ? encryptString(recoveryPhone) : null,
        recoveryPhoneSearch: recoveryPhone ? normalizeSearchPhone(recoveryPhone) : null,
        verificationPhoneEnc: verificationPhone ? encryptString(verificationPhone) : null,
        verificationPhoneSearch: verificationPhone ? normalizeSearchPhone(verificationPhone) : null,
        order: nextOrder,
      },
      select: {
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
      },
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          account: serializeAccount(created),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("email")
    ) {
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

    throw error;
  }
}
