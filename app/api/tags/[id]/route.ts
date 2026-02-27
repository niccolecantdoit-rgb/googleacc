import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const TAG_SELECT = {
  id: true,
  name: true,
  order: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TagSelect;

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

function notFound(message = "Tag not found.") {
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

function duplicateTag(message = "Tag name already exists.") {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "DUPLICATE_TAG",
        message,
      },
    },
    { status: 409 },
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

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireApiAuth();
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const tag = await prisma.tag.findUnique({
    where: { id },
    select: TAG_SELECT,
  });

  if (!tag) {
    return notFound();
  }

  return NextResponse.json({
    ok: true,
    data: {
      tag: serializeTag(tag),
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
  const data: Prisma.TagUpdateInput = {};

  if (Object.prototype.hasOwnProperty.call(input, "name")) {
    if (typeof input.name !== "string" || input.name.trim() === "") {
      return badRequest("name must be a non-empty string.");
    }

    data.name = input.name.trim();
  }

  try {
    const updated = await prisma.tag.update({
      where: { id },
      data,
      select: TAG_SELECT,
    });

    return NextResponse.json({
      ok: true,
      data: {
        tag: serializeTag(updated),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return notFound();
      }

      if (
        error.code === "P2002" &&
        ((Array.isArray(error.meta?.target) && error.meta.target.includes("name")) || error.meta?.target === "name")
      ) {
        return duplicateTag();
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
    await prisma.tag.delete({
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
