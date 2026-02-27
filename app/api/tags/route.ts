import { Prisma } from "@prisma/client";
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

function serializeTag(tag: { id: string; name: string; order: number; createdAt: Date; updatedAt: Date }) {
  return {
    id: tag.id,
    name: tag.name,
    order: tag.order,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
}

export async function GET() {
  const auth = await requireApiAuth();
  if ("response" in auth) {
    return auth.response;
  }

  const tags = await prisma.tag.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      order: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      tags: tags.map(serializeTag),
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
  if (typeof input.name !== "string" || input.name.trim() === "") {
    return badRequest("name is required.");
  }

  const name = input.name.trim();

  const maxOrder = await prisma.tag.aggregate({
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  try {
    const created = await prisma.tag.create({
      data: {
        name,
        order: nextOrder,
      },
      select: {
        id: true,
        name: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          tag: serializeTag(created),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      ((Array.isArray(error.meta?.target) && error.meta.target.includes("name")) || error.meta?.target === "name")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DUPLICATE_TAG",
            message: "Tag name already exists.",
          },
        },
        { status: 409 },
      );
    }

    throw error;
  }
}
