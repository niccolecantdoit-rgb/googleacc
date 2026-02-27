import { NextRequest, NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
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

function notFound(message: string) {
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

function parseTagId(body: unknown): { tagId: string } | { error: NextResponse } {
  if (!body || typeof body !== "object") {
    return { error: badRequest("Request body must be an object.") };
  }

  const input = body as Record<string, unknown>;
  if (typeof input.tagId !== "string" || input.tagId.trim() === "") {
    return { error: badRequest("tagId must be a non-empty string.") };
  }

  return { tagId: input.tagId.trim() };
}

async function parseRequestBody(request: NextRequest): Promise<{ tagId: string } | { error: NextResponse }> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { error: badRequest("Request body must be valid JSON.") };
  }

  return parseTagId(body);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireApiAuth();
  if ("response" in auth) {
    return auth.response;
  }

  const { id: accountId } = await context.params;
  const body = await parseRequestBody(request);
  if ("error" in body) {
    return body.error;
  }

  const { tagId } = body;

  const [account, tag] = await Promise.all([
    prisma.account.findUnique({ where: { id: accountId }, select: { id: true } }),
    prisma.tag.findUnique({ where: { id: tagId }, select: { id: true } }),
  ]);

  if (!account) {
    return notFound("Account not found.");
  }

  if (!tag) {
    return notFound("Tag not found.");
  }

  await prisma.accountTag.upsert({
    where: {
      accountId_tagId: {
        accountId,
        tagId,
      },
    },
    update: {},
    create: {
      accountId,
      tagId,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireApiAuth();
  if ("response" in auth) {
    return auth.response;
  }

  const { id: accountId } = await context.params;
  const body = await parseRequestBody(request);
  if ("error" in body) {
    return body.error;
  }

  await prisma.accountTag.deleteMany({
    where: {
      accountId,
      tagId: body.tagId,
    },
  });

  return NextResponse.json({ ok: true });
}
