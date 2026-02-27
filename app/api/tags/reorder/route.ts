import { NextRequest, NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

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

function parseIds(input: unknown): string[] | null {
  if (!Array.isArray(input)) {
    return null;
  }

  if (!input.every((item) => typeof item === "string" && item.trim() !== "")) {
    return null;
  }

  return input;
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

  const ids = parseIds((body as Record<string, unknown>).ids);
  if (!ids) {
    return badRequest("ids must be an array of non-empty strings.");
  }

  if (ids.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    return badRequest("ids must not contain duplicates.");
  }

  const existing = await prisma.tag.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });

  if (existing.length !== ids.length) {
    return badRequest("Some ids do not exist.");
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.tag.update({
        where: { id },
        data: { order: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
